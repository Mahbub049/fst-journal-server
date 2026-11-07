import { Request, Response } from "express";
import OjsImport from "../models/OjsImport.model";
import OjsIssueSync from "../models/OjsIssueSync.model";
import { computePdfStatus } from "./ojsImport.controller";
import { publishOjsIssueSnapshot } from "../services/ojsAutoIssue.service";

const object = (v: unknown): v is Record<string, any> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const pos = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v > 0;
const str = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max;
const sourceId = () => (process.env.OJS_IMPORT_SOURCE_ID || "").trim();

export async function receivePublishedIssue(req: Request, res: Response): Promise<void> {
  const p: unknown = req.body;
  if (!object(p) || p.schemaVersion !== 2 || p.source !== "ojs" ||
      p.sourceId !== sourceId() || !pos(p.journalId) ||
      !str(p.snapshotHash, 64) || !/^[a-f0-9]{64}$/.test(p.snapshotHash) ||
      !object(p.issue) || !pos(p.issue.id) || !pos(p.issue.volume) || !pos(p.issue.year) ||
      p.issue.published !== true || !str(p.issue.number, 100) || !p.issue.number.trim() ||
      !str(p.issue.title, 2000) || !str(p.issue.datePublished, 80) ||
      !Array.isArray(p.articles) || p.articles.length > 150) {
    res.status(400).json({ success: false, message: "Invalid published-issue manifest" }); return;
  }
  const ids = new Set<number>();
  for (const a of p.articles) {
    if (!object(a) || a.schemaVersion !== 1 || a.sourceId !== p.sourceId ||
        a.journalId !== p.journalId || !object(a.issue) || a.issue.id !== p.issue.id || a.issue.published !== true || !pos(a.submissionId) || !pos(a.publicationId) ||
        ids.has(a.publicationId) || !pos(a.version) || a.status !== "published" ||
        !str(a.locale, 30) || !str(a.title, 2000) || !a.title.trim() ||
        !str(a.subtitle, 2000) || !str(a.abstract, 250000) ||
        !str(a.doi, 512) || !str(a.pages, 100) || !str(a.datePublished, 80) ||
        !Array.isArray(a.keywords) || a.keywords.length > 200 || !a.keywords.every((k: unknown) => str(k, 500)) ||
        !Array.isArray(a.authors) || a.authors.length < 1 || a.authors.length > 100 ||
        !a.authors.every((x: unknown) => object(x) && str(x.name, 500) && str(x.affiliation, 2000) && str(x.orcid, 255)) ||
        !Array.isArray(a.pdfGalleys) || a.pdfGalleys.length > 20 ||
        !a.pdfGalleys.every((x: unknown) => object(x) && pos(x.galleyId) && str(x.label, 120))) {
      res.status(400).json({ success: false, message: "Invalid article in published issue" }); return;
    }
    ids.add(a.publicationId);
  }
  try {
    for (const a of p.articles) {
      const issue = { id: p.issue.id, volume: p.issue.volume, number: p.issue.number,
        year: p.issue.year, title: p.issue.title, published: true };
      const doc = await OjsImport.findOneAndUpdate(
        { sourceId: p.sourceId, publicationId: a.publicationId },
        { $set: {
          sourceId: p.sourceId, journalId: p.journalId, submissionId: a.submissionId,
          publicationId: a.publicationId, version: a.version, ojsStatus: "published",
          locale: a.locale, title: a.title.trim(), subtitle: a.subtitle, abstract: a.abstract,
          keywords: a.keywords, doi: a.doi, pages: a.pages, datePublished: a.datePublished,
          authors: a.authors, issue, pdfGalleys: a.pdfGalleys, receivedAt: new Date(),
        }, $setOnInsert: { reviewStatus: "pending" } },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
      );
      const pdfStatus = computePdfStatus(doc.pdfGalleys || [], doc.pdfs || []);
      if (doc.pdfStatus !== pdfStatus) await OjsImport.updateOne({ _id: doc._id }, { $set: { pdfStatus } });
    }
    const normalizedIssue = {
      ...p.issue,
      title: p.issue.title.trim() || `Volume ${p.issue.volume}, Issue ${p.issue.number} (${p.issue.year})`,
    };
    await OjsIssueSync.findOneAndUpdate(
      { sourceId: p.sourceId, journalId: p.journalId, ojsIssueId: p.issue.id },
      { $set: { issue: normalizedIssue, articlePublicationIds: Array.from(ids), snapshotHash: p.snapshotHash, state: "pending", lastError: "" } },
      { upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ success: true, message: "Published issue staged", articles: ids.size });
  } catch (error) {
    console.error("OJS issue staging failed", error);
    res.status(500).json({ success: false, message: "Could not stage published issue; retry later" });
  }
}

export async function finalizePublishedIssue(req: Request, res: Response): Promise<void> {
  const p: unknown = req.body;
  if (!object(p) || p.sourceId !== sourceId() || !pos(p.journalId) || !pos(p.issueId) ||
      !str(p.snapshotHash, 64) || !/^[a-f0-9]{64}$/.test(p.snapshotHash)) {
    res.status(400).json({ success: false, message: "Invalid finalize request" }); return;
  }
  try {
    const result = await publishOjsIssueSnapshot(p.sourceId, p.journalId, p.issueId, p.snapshotHash);
    res.status(200).json({ success: true, message: "Published issue synchronized", ...result });
  } catch (error) {
    console.error("OJS automatic issue publication failed", error);
    await OjsIssueSync.updateOne(
      { sourceId: p.sourceId, journalId: p.journalId, ojsIssueId: p.issueId },
      { $set: { state: "pending", lastError: "Publication failed; retry queued" } }
    ).catch(() => undefined);
    res.status(503).json({ success: false, message: "IJFST publication incomplete; safe to retry" });
  }
}
