/** Independent citation indicators, using completed calendar years only. */
export interface AnnualCitation { year: number; citedByCount: number }
export interface MetricArticle {
  year: number;
  articleType: string;
  history: AnnualCitation[] | null;
  workId?: string;
  doi?: string;
  retracted?: boolean;
}
export const publicationYear = (label: unknown): number | null => {
  const years = String(label || '').match(/\b(?:19|20)\d{2}\b/g);
  return years && new Set(years).size === 1 ? Number(years[0]) : null;
};
const typeKey = (type: string) => (type || 'Research Article').toLowerCase().replace(/[^a-z]/g, '');
// Local CMS categories are proxies for provider-specific document classifications.
const citeTypes = new Set(['researcharticle','fullresearcharticle','article','review','reviewarticle','shortcommunication','policyanalysis','conferencepaper','proceedingspaper','bookchapter','datapaper']);
const impactTypes = new Set(['researcharticle','fullresearcharticle','article','review','reviewarticle','shortcommunication','policyanalysis','conferencepaper','proceedingspaper']);
export const isCiteEligible = (type: string) => citeTypes.has(typeKey(type));
export const metricYearBounds = (year: number) => ({ from: year - 3, to: year });
const sum = (a: MetricArticle, from: number, to: number) => (a.history || []).reduce((n, c) => n + (c.year >= Math.max(from, a.year) && c.year <= to ? c.citedByCount : 0), 0);
export function calculateJournalMetrics(articles: MetricArticle[], year: number) {
  const unique: MetricArticle[] = [];
  const doiSet = new Set<string>(); const workSet = new Set<string>();
  // Prefer a matched record when duplicates exist.
  for (const a of [...articles].sort((a,b) => Number(b.history !== null) - Number(a.history !== null))) {
    if ((a.doi && doiSet.has(a.doi)) || (a.workId && workSet.has(a.workId))) continue;
    if (a.doi) doiSet.add(a.doi);
    if (a.workId) workSet.add(a.workId);
    unique.push(a);
  }
  const cite = unique.filter(a => !a.retracted && a.year >= year - 3 && a.year <= year && isCiteEligible(a.articleType));
  const impact = unique.filter(a => !a.retracted && a.year >= year - 2 && a.year <= year - 1);
  const indicator = (items: MetricArticle[], denominator: number, from: number, to: number) => {
    const citations = items.reduce((n,a) => n + sum(a,from,to),0);
    const matched = items.filter(a => a.history !== null).length;
    return { value: denominator > 0 && matched > 0 ? (citations / denominator).toFixed(1) : 'N/A', citations, publications: denominator, matched, expected: items.length };
  };
  return {
    citeScore: indicator(cite,cite.length,year-3,year),
    // JIF-like numerator includes every item; denominator includes scholarly items only.
    impactFactor: indicator(impact,impact.filter(a => impactTypes.has(typeKey(a.articleType))).length,year,year),
    duplicateRecords: articles.length - unique.length,
  };
}
