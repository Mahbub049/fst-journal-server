import Article from '../models/Article.model';
import Issue from '../models/Issue.model';
import Homepage from '../models/Homepage.model';
import { normalizeDoi } from './citationSync.service';
import { calculateJournalMetrics, publicationYear, AnnualCitation } from './journalMetricsMath';

const lastCompletedYear = () => Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Dhaka', year: 'numeric' }).format(new Date())) - 1;
const cleanTitle = (s: string) => String(s || '').normalize('NFKC').toLowerCase().replace(new RegExp('[^\\p{L}\\p{N}]+','gu'),' ').trim();
const cleanDoi = (s: string) => normalizeDoi(s || '').toLowerCase();
const validDoi = (s: string) => /^10\.\d{4,9}\/\S+$/i.test(s);
const validIssns = (vals: string[]) => [...new Set(vals.flatMap(s => String(s || '').toUpperCase().match(/\b\d{4}-\d{3}[\dX]\b/g) || []))].sort();
let running = false;
let timer: NodeJS.Timeout | undefined;
let lastRun: { finishedAt: string; matched: number; unmatched: number; errors: number; message: string } | null = null;

async function getSettings() {
  return Homepage.findOne().select('automaticJournalMetricsEnabled issnPrint issnOnline');
}
async function getRecords(year: number, issns: string[]) {
  const issues = await Issue.find({ isPublished: true }).select('publishDateLabel issn').lean();
  const byId = new Map(issues.map(i => [String(i._id), i]));
  const articles = await Article.find({ isPublished: true, status: { $ne: 'inPress' }, issueId: { $in: issues.map(i => i._id) } })
    .select('_id issueId doi title articleType publishDate journalCitationHistory').lean();
  let unknownYear = 0;
  const records = articles.flatMap(a => {
    const issue = byId.get(String(a.issueId));
    const y = publicationYear(issue?.publishDateLabel) ?? publicationYear(a.publishDate);
    if (y === null) { unknownYear++; return []; }
    if (y < year - 3 || y > year) return [];
    const doi = cleanDoi(a.doi);
    const knownIssns = validIssns([...issns, issue?.issn || '']);
    const journalIssns = knownIssns.length ? knownIssns : ['2959-4812', '3134-7339'];
    const identity = validDoi(doi) ? `doi:${doi}` : `title:${cleanTitle(a.title)}:${y}:${journalIssns.join('|')}`;
    const cache = a.journalCitationHistory;
    // Never use a snapshot from before the target year ended or a changed identity.
    const freshIdentity = cache && cache.identity === identity && cache.fetchedAt && new Date(cache.fetchedAt).getTime() >= Date.UTC(year+1,0,1) && Array.isArray(cache.counts);
    return [{ article: a, year: y, doi, journalIssns, identity, cache: freshIdentity ? cache : null }];
  });
  return { records, unknownYear };
}
export async function getJournalMetrics() {
  const settings = await getSettings();
  const enabled = settings?.automaticJournalMetricsEnabled !== false;
  const year = lastCompletedYear();
  const { records, unknownYear } = await getRecords(year, validIssns([settings?.issnPrint || '', settings?.issnOnline || '']));
  const computed = calculateJournalMetrics(records.map(r => ({ year: r.year, articleType: r.article.articleType, doi: validDoi(r.doi) ? r.doi : undefined, history: r.cache?.counts ?? null, workId: r.cache?.workId, retracted: r.cache?.retracted })), year);
  const timestamps = records.flatMap(r => r.cache ? [new Date(r.cache.fetchedAt).getTime()] : []);
  return { enabled, year, ...computed,
    citeScore: { ...computed.citeScore, value: enabled ? computed.citeScore.value : '0.0' },
    impactFactor: { ...computed.impactFactor, value: enabled ? computed.impactFactor.value : '0.0' },
    unknownYear, running, lastRun,
    oldestSyncedAt: timestamps.length ? new Date(Math.min(...timestamps)).toISOString() : null,
    lastSyncedAt: timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null,
  };
}

interface OpenAlexWork { id?: string; doi?: string; title?: string; publication_year?: number; is_retracted?: boolean; counts_by_year?: {year: number; cited_by_count: number}[]; primary_location?: {source?: {issn?: string[]; issn_l?: string}} }
class LookupError extends Error { constructor(public status: number) { super(`OpenAlex HTTP ${status}`); } }
async function openAlex(path: string, params: URLSearchParams): Promise<any> {
  const key = process.env.OPENALEX_API_KEY?.trim();
  if (key) params.set('api_key',key);
  const response = await fetch(`https://api.openalex.org/works${path}?${params}`, {headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000)});
  if (response.status === 404 && path) return null;
  if (!response.ok) throw new LookupError(response.status);
  return response.json();
}
const fields = 'id,doi,title,publication_year,is_retracted,counts_by_year,primary_location';
async function lookup(doi: string, title: string, year: number, issns: string[]): Promise<OpenAlexWork | null> {
  if (validDoi(doi)) {
    const work: OpenAlexWork | null = await openAlex(`/doi:${doi.split('/').map(encodeURIComponent).join('/')}`,new URLSearchParams({select:fields}));
    if (work && cleanDoi(work.doi || '') === doi) return work;
    // Do not substitute a different DOI for a record with a DOI.
    return null;
  }
  if (!title || !issns.length) return null;
  const data = await openAlex('', new URLSearchParams({search:title,filter:`publication_year:${year},primary_location.source.issn:${issns.join('|')}`,per_page:'50',select:fields}));
  const exact: OpenAlexWork[] = (Array.isArray(data.results) ? data.results : []).filter((w: OpenAlexWork) => {
    const source = w.primary_location?.source;
    return cleanTitle(w.title || '') === cleanTitle(title) && w.publication_year === year && validIssns([...(source?.issn || []),source?.issn_l || '']).some(s => issns.includes(s));
  });
  return exact.length === 1 ? exact[0] : null;
}
function annualCounts(work: OpenAlexWork): AnnualCitation[] {
  if (!Array.isArray(work.counts_by_year)) throw new Error('Annual citation history missing');
  const seen = new Set<number>();
  return work.counts_by_year.map(c => {
    if (!Number.isInteger(c.year) || !Number.isSafeInteger(c.cited_by_count) || c.cited_by_count < 0 || seen.has(c.year)) throw new Error('Invalid annual citation data');
    seen.add(c.year); return {year:c.year,citedByCount:c.cited_by_count};
  });
}
async function refresh() {
  let matched = 0, unmatched = 0, errors = 0;
  let message = 'Refresh completed.';
  try {
    const settings = await getSettings();
    if (settings?.automaticJournalMetricsEnabled === false) return;
    const { records } = await getRecords(lastCompletedYear(),validIssns([settings?.issnPrint || '',settings?.issnOnline || '']));
    for (const r of records) {
      if ((await getSettings())?.automaticJournalMetricsEnabled === false) { message='Refresh stopped: disabled.'; break; }
      try {
        const work = await lookup(r.doi,r.article.title,r.year,r.journalIssns);
        const filter = {_id:r.article._id,doi:r.article.doi ?? {$exists:false},title:r.article.title,issueId:r.article.issueId,isPublished:true,status:{$ne:'inPress'}};
        if (!work?.id) {
          // An unmatched lookup is not a verified zero. Clear an obsolete match.
          await Article.updateOne(filter,{$unset:{journalCitationHistory:1}});
          unmatched++;
        } else {
          await Article.updateOne(filter,{$set:{journalCitationHistory:{identity:r.identity,workId:work.id,fetchedAt:new Date(),counts:annualCounts(work),retracted:work.is_retracted === true}}});
          matched++;
        }
      } catch (error) {
        errors++;
        // Preserve last verified data on provider errors. Stop on auth/quota failure.
        if (error instanceof LookupError && [401,403,429].includes(error.status)) { message = `OpenAlex access or quota error (HTTP ${error.status}). Check API key and limits.`; break; }
      }
      await new Promise(resolve => setTimeout(resolve,250));
    }
    if (errors && message === 'Refresh completed.') message = 'Refresh completed with lookup errors; saved citation history was retained.';
  } catch { errors++; message='Refresh failed. Check database/server logs and retry.'; }
  finally { lastRun={finishedAt:new Date().toISOString(),matched,unmatched,errors,message}; }
}
export function queueJournalMetricsRefresh() {
  if (running) return false;
  running=true;
  void refresh().finally(() => {running=false;});
  return true;
}
export function startJournalMetricsScheduler() {
  if (timer) return;
  // Independent from the existing lifetime citation scheduler.
  const tick = () => { void getSettings().then(s => { if (s?.automaticJournalMetricsEnabled !== false) queueJournalMetricsRefresh(); }).catch(() => console.error('Journal metrics scheduler could not load settings.')); };
  setTimeout(tick,30000).unref();
  timer=setInterval(tick,24*60*60*1000); timer.unref();
}
