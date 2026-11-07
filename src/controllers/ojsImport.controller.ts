import { createHash, timingSafeEqual } from "crypto";
import { NextFunction } from "express";
import { stageOjsPdf } from "../utils/ojsPdfStorage";
import { Request, Response } from "express";
import OjsImport from "../models/OjsImport.model";

const enabled = () => process.env.OJS_IMPORT_ENABLED === "true";

// Constant-time comparison prevents easy token guessing through timing.
const equalSecret = (a: string, b: string): boolean => {
  const aHash = createHash("sha256").update(a).digest();
  const bHash = createHash("sha256").update(b).digest();
  return timingSafeEqual(aHash, bHash);
};

/** Called BEFORE Multer for PDF uploads so unauthorized clients cannot upload 50MB. */
export function requireOjsPdfAuth(req: Request, res: Response, next: NextFunction): void {
  if (!enabled()) {
    res.status(404).json({ success: false, message: "Not found" });
    return;
  }
  const expectedToken = process.env.OJS_IMPORT_TOKEN?.trim() || "";
  const supplied = req.get("authorization") || "";
  const token = supplied.startsWith("Bearer ") ? supplied.slice(7) : "";
  if (expectedToken.length < 32 || !process.env.OJS_IMPORT_SOURCE_ID?.trim() ||
      !token || !equalSecret(token, expectedToken)) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }
  next();
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number): v is string =>
  typeof v === "string" && v.length <= max;
const posInt = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v > 0;
const nonNegInt = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const optPositiveInt = (v: unknown): v is number | null => v === null || posInt(v);

export async function receiveOjsMetadata(req: Request, res: Response): Promise<void> {
  // Returning 404 when disabled minimizes unnecessary exposure of this endpoint.
  if (!enabled()) {
    res.status(404).json({ success: false, message: "Not found" });
    return;
  }

  const expectedToken = process.env.OJS_IMPORT_TOKEN?.trim() || "";
  const expectedSourceId = process.env.OJS_IMPORT_SOURCE_ID?.trim() || "";
  const authorization = req.get("authorization") || "";
  const suppliedToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (
    expectedToken.length < 32 ||
    !expectedSourceId ||
    !suppliedToken ||
    !equalSecret(suppliedToken, expectedToken)
  ) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  const p: unknown = req.body;
  if (!isObject(p) || p.schemaVersion !== 1 || p.source !== "ojs" || p.sourceId !== expectedSourceId ||
      !posInt(p.journalId) || !posInt(p.submissionId) || !posInt(p.publicationId) ||
      !posInt(p.version) || (p.status !== "scheduled" && p.status !== "published") ||
      !str(p.locale, 30) || !p.locale || !str(p.title, 2000) || !p.title.trim() ||
      !str(p.subtitle, 2000) || !str(p.abstract, 250000) ||
      !str(p.doi, 512) || !str(p.pages, 100) || !str(p.datePublished, 80) ||
      !Array.isArray(p.keywords) || p.keywords.length > 200 ||
      !p.keywords.every((k: unknown) => str(k, 500)) ||
      !Array.isArray(p.authors) || p.authors.length > 100 ||
      !p.authors.every((a: unknown) => isObject(a) && str(a.name, 500) &&
        str(a.affiliation, 2000) && str(a.orcid, 255)) ||
      (p.pdfGalleys !== undefined && (!Array.isArray(p.pdfGalleys) || p.pdfGalleys.length > 20 ||
        !p.pdfGalleys.every((g: unknown) => isObject(g) && posInt(g.galleyId) &&
          str(g.label, 120)))) ||
      (p.issue !== null && (!isObject(p.issue) || !posInt(p.issue.id) ||
        !optPositiveInt(p.issue.volume) || !str(p.issue.number, 100) ||
        !optPositiveInt(p.issue.year) || !str(p.issue.title, 2000) ||
        typeof p.issue.published !== "boolean"))) {
    res.status(400).json({ success: false, message: "Invalid OJS metadata payload" });
    return;
  }

  // Narrow payload to known fields; never persist arbitrary OJS fields.
  const data = {
    sourceId: p.sourceId as string,
    journalId: p.journalId as number,
    submissionId: p.submissionId as number,
    publicationId: p.publicationId as number,
    version: p.version as number,
    ojsStatus: p.status as "scheduled" | "published",
    locale: p.locale as string,
    title: (p.title as string).trim(),
    subtitle: p.subtitle as string,
    abstract: p.abstract as string, // Not rendered in Phase 1; sanitize when displaying in Phase 3.
    keywords: p.keywords as string[],
    doi: p.doi as string,
    pages: p.pages as string,
    datePublished: p.datePublished as string,
    authors: p.authors as Array<{name:string;affiliation:string;orcid:string}>,
    issue: p.issue as {id:number;volume:number|null;number:string;year:number|null;title:string;published:boolean}|null,
    pdfGalleys: (p.pdfGalleys ?? []) as Array<{galleyId:number;label:string}>,
    receivedAt: new Date(),
  };

  try {
    // A source-publication pair has exactly one staging record. No public article is created.
    const doc = await OjsImport.findOneAndUpdate(
      { sourceId: data.sourceId, publicationId: data.publicationId },
      { $set: data, $setOnInsert: { reviewStatus: "pending" } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    const pdfStatus = computePdfStatus(doc.pdfGalleys || [], doc.pdfs || []);
    if (doc.pdfStatus !== pdfStatus) {
      await OjsImport.updateOne({ _id: doc._id }, { $set: { pdfStatus } });
    }
    res.status(200).json({ success: true, message: "Metadata staged" });
  } catch (error) {
    // A concurrent first upsert can fail on the unique index: retry as an update.
    if (isObject(error) && error.code === 11000) {
      try {
        const doc = await OjsImport.findOneAndUpdate(
          { sourceId: data.sourceId, publicationId: data.publicationId },
          { $set: data },
          { new: true, runValidators: true }
        );
        if (doc) {
          await OjsImport.updateOne({ _id: doc._id }, { $set: {
            pdfStatus: computePdfStatus(doc.pdfGalleys || [], doc.pdfs || []),
          } });
        }
        res.status(200).json({ success: true, message: "Metadata staged" });
        return;
      } catch (retryError) {
        console.error("OJS import retry failed:", retryError);
      }
    } else {
      console.error("OJS import failed:", error);
    }
    res.status(500).json({ success: false, message: "Metadata staging failed" });
  }
}


export function computePdfStatus(
  expected: Array<{galleyId:number}>,
  received: Array<{galleyId:number}>
): "missing" | "pending" | "partial" | "received" {
  if (!expected.length) return "missing";
  const ids = new Set(received.map((x) => x.galleyId));
  if (expected.every((x) => ids.has(x.galleyId))) return "received";
  return received.length ? "partial" : "pending";
}

/** Store only the final *publication galley* PDF(s) in a non-public directory. */
export async function receiveOjsPdf(req: Request, res: Response): Promise<void> {
  // Authentication is handled by requireOjsPdfAuth BEFORE Multer.
  const body = req.body as Record<string, unknown>;
  const sourceId = body?.sourceId;
  const publicationId = Number(body?.publicationId);
  const submissionId = Number(body?.submissionId);
  const galleyId = Number(body?.galleyId);
  const label = body?.label;
  const claimedHash = body?.sha256;
  const claimedSize = Number(body?.fileSize);
  const file = req.file;

  if (sourceId !== process.env.OJS_IMPORT_SOURCE_ID?.trim() ||
      !posInt(publicationId) || !posInt(submissionId) || !posInt(galleyId) ||
      !str(label, 120) || !str(claimedHash, 64) || !/^[a-f0-9]{64}$/.test(claimedHash) ||
      !file || !posInt(claimedSize) || claimedSize > 50 * 1024 * 1024 ||
      file.buffer.length !== claimedSize || file.buffer.subarray(0, 5).toString("ascii") !== "%PDF-" ||
      file.mimetype !== "application/pdf" ||
      createHash("sha256").update(file.buffer).digest("hex") !== claimedHash) {
    res.status(400).json({ success: false, message: "Invalid OJS final PDF" });
    return;
  }

  try {
    const doc = await OjsImport.findOne({ sourceId, publicationId, submissionId });
    if (!doc) {
      res.status(404).json({ success: false, message: "Stage publication metadata first" });
      return;
    }
    const expected = (doc.pdfGalleys || []).find((g: {galleyId:number}) => g.galleyId === galleyId);
    if (!expected || expected.label !== label) {
      res.status(409).json({ success: false, message: "PDF galley does not match staged publication" });
      return;
    }
    const existing = (doc.pdfs || []).find((p: {galleyId:number}) => p.galleyId === galleyId);
    if (existing && existing.sha256 === claimedHash) {
      res.status(200).json({ success: true, message: "PDF already staged" });
      return;
    }

    const { storageKey } = await stageOjsPdf({
      sourceId: sourceId as string,
      publicationId,
      galleyId,
      sha256: claimedHash,
      buffer: file.buffer,
    });
    const rest = (doc.pdfs || []).filter((p: {galleyId:number}) => p.galleyId !== galleyId);
    const pdfs = [...rest, {
      galleyId,
      label,
      sha256: claimedHash,
      fileSize: claimedSize,
      storageKey,
      receivedAt: new Date(),
    }];
    doc.set("pdfs", pdfs);
    doc.set("pdfStatus", computePdfStatus(doc.pdfGalleys || [], pdfs));
    await doc.save();
    res.status(200).json({ success: true, message: "Final PDF staged privately" });
  } catch (error) {
    console.error("OJS private PDF staging failed:", error);
    res.status(500).json({ success: false, message: "Failed to stage final PDF" });
  }
}
