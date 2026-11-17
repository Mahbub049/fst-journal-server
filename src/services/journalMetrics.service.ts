import Article from '../models/Article.model';
import Issue from '../models/Issue.model';
import Homepage from '../models/Homepage.model';
import { calculateJournalMetrics, publicationYear } from './journalMetricsMath';
import {cleanDoi,cleanTitle,validDoi,validIssns,JOURNAL_ISSNS,loadJournalCatalog,lookupJournalArticle,ProviderError} from './journalMetricsLookup';

const currentYear = () => Number(new Intl.DateTimeFormat('en', {timeZone:'Asia/Dhaka',year:'numeric'}).format(new Date()));
let running=false;
let timer:NodeJS.Timeout|undefined;
let lastRun:{finishedAt:string;matched:number;unmatched:number;errors:number;message:string}|null=null;
const diagnostics=new Map<string,string>();
async function getSettings(){return Homepage.findOne().select('automaticJournalMetricsEnabled issnPrint issnOnline');}
async function getRecords(year:number,issns:string[]){
  const issues=await Issue.find({isPublished:true}).select('publishDateLabel issn').lean();
  const byId=new Map(issues.map(i=>[String(i._id),i]));
  const articles=await Article.find({isPublished:true,status:{$ne:'inPress'},issueId:{$in:issues.map(i=>i._id)}}).select('_id issueId doi title authors articleType publishDate citationSource citationSourceId citations journalCitationHistory').lean();
  let unknownYear=0;
  const records=articles.flatMap(a=>{
    const issue=byId.get(String(a.issueId));const y=publicationYear(issue?.publishDateLabel)??publicationYear(a.publishDate);
    if(y===null){unknownYear++;return [];}
    // Union of the last completed and current-year windows.
    if(y<year-4||y>year)return [];
    const doi=cleanDoi(a.doi);const journalIssns=validIssns([...issns,...JOURNAL_ISSNS,issue?.issn||'']);
    const identity=validDoi(doi)?`doi:${doi}`:`title:${cleanTitle(a.title)}:${y}:${journalIssns.join('|')}`;
    const cache=a.journalCitationHistory;
    const usable=cache&&cache.identity===identity&&cache.fetchedAt&&Array.isArray(cache.counts);
    return [{article:a,year:y,doi,journalIssns,identity,cache:usable?cache:null}];
  });
  return {records,unknownYear};
}
export async function getJournalMetrics(admin=false){
  const settings=await getSettings();const enabled=settings?.automaticJournalMetricsEnabled!==false;
  const liveYear=currentYear();const year=liveYear-1;
  const {records,unknownYear}=await getRecords(liveYear,validIssns([settings?.issnPrint||'',settings?.issnOnline||'']));
  const forYear=(target:number)=>{
    // Completed years require a snapshot taken after that year's close; live tracker accepts snapshots from this year.
    const threshold=Date.UTC(target+(target===liveYear?0:1),0,1)-6*60*60*1000;
    const computed=calculateJournalMetrics(records.filter(r=>r.year>=target-3&&r.year<=target).map(r=>{
      const c=r.cache&&new Date(r.cache.fetchedAt).getTime()>=threshold?r.cache:null;
      return {year:r.year,articleType:r.article.articleType,doi:validDoi(c?.resolvedDoi||r.doi)?c?.resolvedDoi||r.doi:undefined,identity:r.identity,history:c?.counts??null,workId:c?.workId?.replace(/^https:\/\/openalex\.org\//,''),retracted:c?.retracted,partial:c?.source==='OpenCitations'};
    }),target);
    return {year:target,...computed,citeScore:{...computed.citeScore,value:enabled?computed.citeScore.value:'0.0'},impactFactor:{...computed.impactFactor,value:enabled?computed.impactFactor.value:'0.0'}};
  };
  const annual=forYear(year);
  const timestamps=records.flatMap(r=>r.cache?[new Date(r.cache.fetchedAt).getTime()]:[]);
  return {enabled,...annual,unknownYear,running,lastRun,oldestSyncedAt:timestamps.length?new Date(Math.min(...timestamps)).toISOString():null,lastSyncedAt:timestamps.length?new Date(Math.max(...timestamps)).toISOString():null,
    ...(admin?{live:forYear(liveYear),articles:records.map(r=>({id:String(r.article._id),title:r.article.title,year:r.year,doi:r.doi,resolvedDoi:r.cache?.resolvedDoi||'',source:r.cache?(r.cache.source||'OpenAlex'):null,method:r.cache?.method||'',workId:r.cache?.workId||'',counts:r.cache?.counts||[],fetchedAt:r.cache?.fetchedAt||null,lifetimeCitations:r.article.citations||0,lifetimeSource:r.article.citationSource||'manual',note:diagnostics.get(String(r.article._id))||'',retracted:r.cache?.retracted===true})).sort((a,b)=>a.year-b.year||a.title.localeCompare(b.title))}:{}),
  };
}
async function refresh(){
  let matched=0,unmatched=0,errors=0;let message='Refresh completed.';
  try{
    const settings=await getSettings();if(settings?.automaticJournalMetricsEnabled===false)return;
    const year=currentYear();const issns=validIssns([settings?.issnPrint||'',settings?.issnOnline||'']);
    const {records}=await getRecords(year,issns);diagnostics.clear();
    let catalog:Awaited<ReturnType<typeof loadJournalCatalog>>=[];
    try{catalog=await loadJournalCatalog(issns,year-4,year);}catch(error){message='Journal catalogue unavailable; individual lookup attempted.';console.warn('Journal metrics catalogue:',error instanceof Error?error.message:'lookup error');}
    for(const r of records){
      if((await getSettings())?.automaticJournalMetricsEnabled===false){message='Refresh stopped: disabled.';break;}
      const id=String(r.article._id);
      try{
        const found=await lookupJournalArticle({doi:r.doi,title:r.article.title,year:r.year,authors:r.article.authors||[],journalIssns:r.journalIssns,existingId:r.article.citationSource==='OpenAlex'?r.article.citationSourceId:r.cache?.workId},catalog);
        const filter={_id:r.article._id,doi:r.article.doi??{$exists:false},title:r.article.title,issueId:r.article.issueId,isPublished:true,status:{$ne:'inPress' as const}};
        if(!found){unmatched++;diagnostics.set(id,'No verified match returned; previously saved history retained if available.');}
        else if(found.source==='OpenCitations'&&r.cache&&r.cache.source!=='OpenCitations'){
          // Never replace a previously verified OpenAlex history with a narrower fallback.
          matched++;diagnostics.set(id,'OpenAlex history retained; fallback not merged.');
        }else{
          const result=await Article.updateOne(filter,{$set:{journalCitationHistory:{identity:r.identity,workId:found.workId,resolvedDoi:found.resolvedDoi,source:found.source,method:found.method,fetchedAt:new Date(),counts:found.counts,retracted:found.retracted}}});
          if(result.matchedCount){matched++;diagnostics.set(id,found.method);}else{unmatched++;diagnostics.set(id,'Article changed during refresh; retry.');}
        }
      }catch(error){errors++;diagnostics.set(id,error instanceof Error?error.message:'Lookup failed');if(error instanceof ProviderError&&error.provider==='OpenAlex'&&[401,403,429].includes(error.status)){message=`OpenAlex access or quota error (HTTP ${error.status}). Check API key and limits.`;break;}}
      await new Promise(resolve=>setTimeout(resolve,250));
    }
    if(errors&&message==='Refresh completed.')message='Refresh completed with lookup errors; saved citation history retained.';
  }catch{errors++;message='Refresh failed. Check database/server logs and retry.';}
  finally{lastRun={finishedAt:new Date().toISOString(),matched,unmatched,errors,message};}
}
export function queueJournalMetricsRefresh(){if(running)return false;running=true;void refresh().finally(()=>{running=false;});return true;}
export function startJournalMetricsScheduler(){if(timer)return;const tick=()=>{void getSettings().then(s=>{if(s?.automaticJournalMetricsEnabled!==false)queueJournalMetricsRefresh();}).catch(()=>console.error('Journal metrics scheduler could not load settings.'));};setTimeout(tick,30000).unref();timer=setInterval(tick,24*60*60*1000);timer.unref();}
