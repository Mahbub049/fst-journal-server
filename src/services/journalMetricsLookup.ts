import { AnnualCitation } from './journalMetricsMath';

export const JOURNAL_SOURCE = 'S5407051039';
export const JOURNAL_ISSNS = ['2959-4812', '3134-7339'];
export const cleanTitle = (s: string) => String(s || '').normalize('NFKC').toLowerCase().replace(/&amp;/g,' and ').replace(/&/g,' and ').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export const cleanDoi = (s: string) => {
  let value = String(s || '').trim().replace(/^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)/i,'');
  try { value = decodeURIComponent(value); } catch { /* leave original */ }
  return value.trim().toLowerCase();
};
export const validDoi = (s: string) => /^10\.\d{4,9}\/\S+$/i.test(s);
export const validIssns = (vals: string[]) => [...new Set(vals.flatMap(s => String(s || '').toUpperCase().match(/\b\d{4}-\d{3}[\dX]\b/g) || []))].sort();
const workId = (s: string) => String(s || '').match(/^(?:https:\/\/openalex\.org\/)?(W\d+)$/i)?.[1].toUpperCase() || '';
interface Source { id?: string; issn?: string[]; issn_l?: string }
interface Work { id?: string; doi?: string; title?: string; publication_year?: number; is_retracted?: boolean; cited_by_count?: number; counts_by_year?: {year:number;cited_by_count:number}[]; primary_location?: {source?:Source}; locations?: {source?:Source}[]; authorships?: {author?:{display_name?:string}}[] }
export interface LookupRecord { doi:string; title:string; year:number; authors:string[]; journalIssns:string[]; existingId?:string }
export interface LookupResult { workId:string; resolvedDoi:string; counts:AnnualCitation[]; retracted:boolean; source:'OpenAlex'|'OpenCitations'; method:string }
export class ProviderError extends Error { constructor(public provider:string, public status:number) { super(`${provider} HTTP ${status}`); } }
async function json(url:string, provider:string, headers:Record<string,string> = {}) {
  const response = await fetch(url,{headers:{Accept:'application/json',...headers},signal:AbortSignal.timeout(15000)});
  if (response.status === 404) return null;
  if (!response.ok) throw new ProviderError(provider,response.status);
  return response.json();
}
const fields = 'id,doi,title,publication_year,is_retracted,cited_by_count,counts_by_year,primary_location,locations,authorships';
async function alex(path:string, params:URLSearchParams):Promise<any> {
  const key=process.env.OPENALEX_API_KEY?.trim(); if(key) params.set('api_key',key);
  const mail=process.env.CITATION_SYNC_MAILTO?.trim(); if(mail) params.set('mailto',mail);
  return json(`https://api.openalex.org/works${path}?${params}`,'OpenAlex');
}
const list = (data:any):Work[] => Array.isArray(data?.results)?data.results:[];
const dedup = (works:Work[]) => [...new Map(works.filter(w=>workId(w.id||'')).map(w=>[workId(w.id||''),w])).values()];
export async function loadJournalCatalog(issns:string[], from:number, to:number):Promise<Work[]> {
  const results:Work[]=[]; let successful=0; let failure:unknown;
  for(const source of [`locations.source.id:${JOURNAL_SOURCE}`,`primary_location.source.issn:${validIssns([...JOURNAL_ISSNS,...issns]).join('|')}`]) {
    try {
      let cursor='*';
      for(let page=0;page<10;page++) {
        const data=await alex('',new URLSearchParams({filter:`${source},publication_year:${from-1}-${to+1}`,select:fields,per_page:'100',cursor}));
        results.push(...list(data)); const next=data?.meta?.next_cursor;
        if(!next||next===cursor||!list(data).length) break; cursor=next;
      }
      successful++;
    } catch(error) {failure=error;if(error instanceof ProviderError && [401,403,429].includes(error.status)) throw error;}
  }
  if(!successful && failure) throw failure;
  return dedup(results);
}
function sourceMatches(w:Work,r:LookupRecord) {
  const sources=[w.primary_location?.source,...(w.locations||[]).map(l=>l.source)];
  return sources.some(s=>s && (String(s.id||'').split('/').pop()===JOURNAL_SOURCE || validIssns([...(s.issn||[]),s.issn_l||'']).some(i=>r.journalIssns.includes(i))));
}
function authorMatches(a:string[],b:string[]) {
  const names=(xs:string[])=>xs.map(cleanTitle).filter(Boolean);
  const left=names(a), right=names(b);
  return left.some(x=>right.some(y=>x===y || (x.split(' ').length>1 && y.split(' ').length>1 && x.split(' ').slice(-1)[0]===y.split(' ').slice(-1)[0] && x[0]===y[0])));
}
const compact = (s:string)=>cleanTitle(s).replace(/\s/g,'');
function titleMatches(a:string,b:string) {return !!compact(a)&&compact(a)===compact(b);}
function matches(w:Work,r:LookupRecord,doi=r.doi) {
  const candidate=cleanDoi(w.doi||'');
  if(validDoi(doi)&&candidate===doi) return true;
  // Never silently substitute a conflicting DOI. A DOI-less indexed copy can be matched by metadata.
  if(validDoi(doi)&&validDoi(candidate)) return false;
  if(!titleMatches(w.title||'',r.title)||!sourceMatches(w,r)) return false;
  const authors=(w.authorships||[]).map(a=>a.author?.display_name||'');
  if(w.publication_year===r.year) return !r.authors.length||!authors.length||authorMatches(r.authors,authors);
  return Math.abs(Number(w.publication_year)-r.year)===1&&authorMatches(r.authors,authors);
}
function choose(works:Work[],r:LookupRecord,doi=r.doi) {
  const candidates=dedup(works); const direct=candidates.filter(w=>validDoi(doi)&&cleanDoi(w.doi||'')===doi);
  if(direct.length===1)return direct[0]; if(direct.length>1)return null;
  const matched=candidates.filter(w=>matches(w,r,doi));return matched.length===1?matched[0]:null;
}
export function annualCounts(w:Work):AnnualCitation[] {
  if(!Array.isArray(w.counts_by_year)) throw new Error('Annual citation history missing');
  const seen=new Set<number>(); let total=0;
  const counts=w.counts_by_year.map(c=>{if(!Number.isInteger(c.year)||!Number.isSafeInteger(c.cited_by_count)||c.cited_by_count<0||seen.has(c.year))throw new Error('Invalid annual citation data');seen.add(c.year);total+=c.cited_by_count;return {year:c.year,citedByCount:c.cited_by_count};});
  if(Number(w.cited_by_count)>0&&total===0) throw new Error('Lifetime citations exist but annual history is empty');
  return counts;
}
function resolved(w:Work,method:string):LookupResult {
  return {workId:workId(w.id||''),resolvedDoi:cleanDoi(w.doi||''),counts:annualCounts(w),retracted:w.is_retracted===true,source:'OpenAlex',method};
}
async function doiLookup(doi:string,r:LookupRecord) {
  const data=await alex('',new URLSearchParams({filter:`doi:https://doi.org/${doi}`,select:fields,per_page:'10'}));
  return choose(list(data),r,doi);
}
async function crossrefDoi(r:LookupRecord):Promise<string> {
  const params=new URLSearchParams({'query.bibliographic':r.title,filter:`issn:${r.journalIssns.join(',issn:')}`,rows:'10'});
  // Search one ISSN at a time: Crossref repeated filters can be ANDed by provider.
  const found=new Set<string>();
  for(const issn of r.journalIssns) {
    params.set('filter',`issn:${issn}`);
    const mail=process.env.CITATION_SYNC_MAILTO?.trim();if(mail)params.set('mailto',mail);
    const data=await json(`https://api.crossref.org/works?${params}`,'Crossref');
    for(const w of data?.message?.items||[]) {
      const doi=cleanDoi(w.DOI||'');const y=Number((w.published||w.issued)?.['date-parts']?.[0]?.[0]);
      const names=(w.author||[]).map((a:any)=>`${a.given||''} ${a.family||''}`.trim());
      if(validDoi(doi)&&titleMatches(w.title?.[0]||'',r.title)&&validIssns(w.ISSN||[]).includes(issn)&&(y===r.year||Math.abs(y-r.year)===1&&authorMatches(r.authors,names))&&(!r.authors.length||!names.length||authorMatches(r.authors,names))) found.add(doi);
    }
  }
  return found.size===1?[...found][0]:'';
}
async function openCitations(doi:string):Promise<LookupResult|null> {
  const token=process.env.OPENCITATIONS_ACCESS_TOKEN?.trim();
  const data=await json(`https://api.opencitations.net/index/v2/citations/doi:${doi.split('/').map(encodeURIComponent).join('/')}`,'OpenCitations',token?{authorization:token}:{});
  if(!Array.isArray(data))return null;
  const seen=new Set<string>();const counts=new Map<number,number>();
  for(const row of data) {
    const dates=[...new Set(String(row.creation||'').split(';').map((s:string)=>s.trim().replace(/^\[[^\]]+\]\s*=>\s*/, '').match(/^(?:19|20)\d{2}(?=-|$)/)?.[0]).filter(Boolean))];
    const doiKey=String(row.citing||'').match(/\bdoi:(10\.\d{4,9}\/[^\s;]+)/i)?.[1]?.toLowerCase();
    const oci=String(row.oci||'').match(/(?:oci:)?(\d+-\d+)/)?.[1];
    const keys=[doiKey?`doi:${doiKey}`:'',oci?`oci:${oci}`:''].filter(Boolean);
    if(!keys.length||dates.length!==1)continue;const duplicate=keys.some(k=>seen.has(k));keys.forEach(k=>seen.add(k));if(duplicate)continue;
    const year=Number(dates[0]);counts.set(year,(counts.get(year)||0)+1);
  }
  // Empty reverse-citation results do not establish that the article is indexed or uncited.
  if(!counts.size)return null;
  return {workId:`doi:${doi}`,resolvedDoi:doi,source:'OpenCitations',method:'Dated citing records (fallback)',retracted:false,counts:[...counts].map(([year,citedByCount])=>({year,citedByCount}))};
}
export async function lookupJournalArticle(r:LookupRecord,catalog:Work[]):Promise<LookupResult|null> {
  let lastError:unknown; let accessError:ProviderError|undefined; const attempt=async<T>(fn:()=>Promise<T>,isAlex=true):Promise<T|null>=>{if(isAlex&&accessError)return null;try{return await fn();}catch(e){lastError=e;if(e instanceof ProviderError&&e.provider==='OpenAlex'&&[401,403,429].includes(e.status))accessError=e;return null;}};
  let w=choose(catalog,r); if(w){const result=await attempt(async()=>resolved(w!,'Journal catalogue'));if(result)return result;}
  const id=workId(r.existingId||'');
  if(id){w=await attempt(async()=>alex(`/${id}`,new URLSearchParams({select:fields})));if(w&&matches(w,r)){const result=await attempt(async()=>resolved(w!,'Existing citation ID'));if(result)return result;}}
  if(validDoi(r.doi)){w=await attempt(()=>doiLookup(r.doi,r));if(w){const result=await attempt(async()=>resolved(w!,'DOI filter'));if(result)return result;}}
  w=await attempt(async()=>choose(list(await alex('',new URLSearchParams({search:r.title,filter:`publication_year:${r.year-1}-${r.year+1}`,select:fields,per_page:'50'}))),r));
  if(w){const result=await attempt(async()=>resolved(w!,'Title / journal / author'));if(result)return result;}
  let doi=validDoi(r.doi)?r.doi:'';
  if(!doi){doi=await attempt(()=>crossrefDoi(r),false)||'';if(doi){w=await attempt(()=>doiLookup(doi,r));if(w){const result=await attempt(async()=>resolved(w!,'Crossref DOI → OpenAlex'));if(result)return result;}}}
  if(doi){const fallback=await attempt(()=>openCitations(doi),false);if(fallback)return fallback;}
  if(accessError)throw accessError;
  if(lastError)throw lastError;
  return null;
}
