import { Request, Response } from 'express';
import Homepage from '../models/Homepage.model';
import { getJournalMetrics, queueJournalMetricsRefresh } from '../services/journalMetrics.service';

export async function readJournalMetrics(_req: Request, res: Response): Promise<void> {
  try { res.set('Cache-Control','no-store'); res.json({success:true,metrics:await getJournalMetrics()}); }
  catch { res.status(500).json({success:false,message:'Could not load journal metrics.'}); }
}
export async function readAdminJournalMetrics(_req: Request, res: Response): Promise<void> {
  try { res.set('Cache-Control','no-store'); res.json({success:true,metrics:await getJournalMetrics(true)}); }
  catch { res.status(500).json({success:false,message:'Could not load journal metrics.'}); }
}
export async function setJournalMetricsEnabled(req: Request, res: Response): Promise<void> {
  try {
    if (typeof req.body?.enabled !== 'boolean') { res.status(400).json({success:false,message:'enabled must be a boolean.'}); return; }
    await Homepage.findOneAndUpdate({},{$set:{automaticJournalMetricsEnabled:req.body.enabled}},{upsert:true,setDefaultsOnInsert:true});
    if (req.body.enabled) queueJournalMetricsRefresh();
    res.json({success:true,metrics:await getJournalMetrics(true)});
  } catch { res.status(500).json({success:false,message:'Could not save journal metrics setting.'}); }
}
export async function refreshJournalMetrics(_req: Request, res: Response): Promise<void> {
  try {
    const settings=await Homepage.findOne().select('automaticJournalMetricsEnabled');
    if (settings?.automaticJournalMetricsEnabled === false) {res.status(409).json({success:false,message:'Enable automatic metrics first.'}); return;}
    const started=queueJournalMetricsRefresh();
    res.status(202).json({success:true,started});
  } catch { res.status(500).json({success:false,message:'Could not start refresh.'}); }
}
