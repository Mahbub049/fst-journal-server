import fs from "fs/promises";
import path from "path";
import { createHash, randomUUID } from "crypto";
import { getOjsPublicPdfRoot } from "../utils/ojsPublicPdfStorage";
import Issue from "../models/Issue.model";
import Article from "../models/Article.model";
import OjsImport from "../models/OjsImport.model";
import OjsIssueSync from "../models/OjsIssueSync.model";
import { formatTwoDigitIssueValue } from "../utils/issueStorage";
import { getOjsPdfRoot } from "../utils/ojsPdfStorage";
import { sanitizeRichHtml } from "../utils/sanitizeRichHtml";

type IssueIdentity = { id: number; title: string; volume: number; number: string; year: number; datePublished: string; published: boolean };
const slugify = (value: string): string => value.toLowerCase().trim().replace(/&/g, "and")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const num = (value: string | number): string => formatTwoDigitIssueValue(String(value));
const yearIn = (label: string, year: number) => new RegExp(`\\b${year}\\b`).test(label);

const formatIssueDate = (issueData: IssueIdentity): string =>
  issueData.datePublished && /^\d{4}-\d{2}-\d{2}/.test(issueData.datePublished)
    ? new Date(`${issueData.datePublished.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
    : "";

async function ensureOjsIssue(sourceId: string, issueData: IssueIdentity) {
  const alreadyLinked = await Issue.findOne({ ojsSourceId: sourceId, ojsIssueId: issueData.id });
  if (alreadyLinked) {
    // OJS controls the publication date; preserve manual cover, title, slug, and order.
    const pubLabel = formatIssueDate(issueData);
    if (!alreadyLinked.isPublished || (pubLabel && pubLabel !== alreadyLinked.publishDateLabel)) {
      alreadyLinked.isPublished = true;
      if (pubLabel) alreadyLinked.publishDateLabel = pubLabel;
      await alreadyLinked.save();
    }
    return alreadyLinked;
  }
  const sameNumber = await Issue.find({ volume: num(issueData.volume), issueNumber: num(issueData.number) });
  if (sameNumber.length > 1) {
    const matchingYear = sameNumber.filter(x => yearIn(x.publishDateLabel, issueData.year));
    if (matchingYear.length !== 1) throw new Error("Ambiguous existing issue volume/number/year; sync not published");
    sameNumber.splice(0, sameNumber.length, matchingYear[0]);
  }
  if (sameNumber.length === 1) {
    const match = sameNumber[0];
    if ((match.ojsIssueId && (match.ojsIssueId !== issueData.id || match.ojsSourceId !== sourceId)) ||
        (match.publishDateLabel && !yearIn(match.publishDateLabel, issueData.year))) {
      throw new Error("Issue identity conflict; refusing to replace another issue");
    }
    match.ojsSourceId = sourceId;
    match.ojsIssueId = issueData.id;
    match.isPublished = true;
    // The original IJFST issue title, cover, URL and position remain untouched.
    await match.save();
    return match;
  }
  const slug = `journal-of-fst-volume-${num(issueData.volume)}-issue-${num(issueData.number)}-${issueData.year}`;
  const collision = await Issue.findOne({ slug });
  if (collision) throw new Error("Issue slug already exists with another source identity");
  const label = formatIssueDate(issueData) || String(issueData.year);
  return Issue.create({
    ojsSourceId: sourceId, ojsIssueId: issueData.id,
    title: issueData.title.trim() || "Journal of FST", slug, category: "Science & Technology",
    issn: process.env.OJS_AUTO_DEFAULT_ISSN || "",
    volume: num(issueData.volume), issueNumber: num(issueData.number), publishDateLabel: label,
    coverImage: process.env.OJS_AUTO_DEFAULT_COVER_URL || "/images/journal-cover.jpg",
    pdfUrl: "", isRecent: true, isPublished: true, order: 0,
  });
}

async function readStagedPdf(doc: any, galleyId: number): Promise<{ bytes: Buffer; hash: string }> {
  const item = (doc.pdfs || []).find((p: any) => p.galleyId === galleyId);
  if (!item || !/^[a-f0-9]{16}\/\d+\/\d+-[a-f0-9]{64}\.pdf$/.test(item.storageKey)) {
    throw new Error("Staged PDF missing or invalid");
  }
  const root = getOjsPdfRoot();
  const filename = path.resolve(root, ...item.storageKey.split("/"));
  if (!filename.startsWith(root + path.sep)) throw new Error("Private path escaped storage root");
  const bytes = await fs.readFile(filename);
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (!bytes.subarray(0, 5).equals(Buffer.from("%PDF-")) || hash !== item.sha256 || bytes.length !== item.fileSize) {
    throw new Error("Final PDF integrity verification failed");
  }
  return { bytes, hash };
}

async function writePublicPdf(
  bytes: Buffer, sourceId: string, publicationId: number, galleyId: number, hash: string
): Promise<string> {
  // A dedicated persistent directory (OJS_PUBLIC_PDF_DIR) keeps these files
  // separate from existing manual article PDFs and CMS media uploads.
  const sourceHash = createHash("sha256").update(sourceId).digest("hex").slice(0, 16);
  const root = path.resolve(getOjsPublicPdfRoot());
  const directory = path.resolve(root, "ojs-articles", sourceHash);
  if (!directory.startsWith(root + path.sep)) throw new Error("Unsafe public PDF destination");
  const filename = `${publicationId}-${galleyId}-${hash}.pdf`;
  const destination = path.join(directory, filename);
  await fs.mkdir(directory, { recursive: true });
  try {
    const current = await fs.readFile(destination);
    if (createHash("sha256").update(current).digest("hex") !== hash) {
      throw new Error("Existing OJS PDF checksum mismatch");
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const temp = `${destination}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temp, bytes, { flag: "wx", mode: 0o600 });
      await fs.rename(temp, destination);
    } finally { await fs.rm(temp, { force: true }); }
  }
  return `/ojs-pdfs/${sourceHash}/${filename}`;
}

/** Idempotent and retryable; never requires a JFST admin action. */
export async function publishOjsIssueSnapshot(sourceId: string, journalId: number, issueId: number, snapshotHash: string) {
  const snapshot = await OjsIssueSync.findOne({ sourceId, journalId, ojsIssueId: issueId });
  if (!snapshot || snapshot.snapshotHash !== snapshotHash || !snapshot.issue?.published) {
    throw new Error("Issue snapshot missing or superseded");
  }
  // Even a repeated finalize re-verifies public state; it cannot duplicate publications.
  const ids: number[] = snapshot.articlePublicationIds;
  const docs = await OjsImport.find({ sourceId, journalId, publicationId: { $in: ids } });
  if (docs.length !== ids.length) throw new Error("Missing staged publications; retry transfer");
  const ready: Array<{ doc: any; galleyId: number; bytes: Buffer; hash: string }> = [];
  let skipped = 0;
  for (const doc of docs) {
    if (doc.ojsStatus !== "published" || !doc.issue?.published || doc.issue?.id !== issueId ||
        !doc.title?.trim() || !(doc.authors || []).some((x: any) => x.name?.trim())) {
      skipped++; continue;
    }
    // An article with no valid final PDF remains private and cannot appear publicly.
    const preferred = doc.pdfGalleys.find((g: any) => /^pdf$/i.test(g.label.trim())) || doc.pdfGalleys[0];
    if (!preferred) { skipped++; continue; }
    const received = doc.pdfs.find((p: any) => p.galleyId === preferred.galleyId);
    if (!received) { skipped++; continue; }
    const { bytes, hash } = await readStagedPdf(doc, preferred.galleyId);
    ready.push({ doc, galleyId: preferred.galleyId, bytes, hash });
  }
  // No public issue with zero valid articles on first import. Existing empty issues remain unchanged.
  if (ready.length === 0) {
    snapshot.set({ state: "complete", publishedCount: 0, skippedCount: skipped, lastCompletedHash: snapshotHash, lastError: "No eligible final PDFs" });
    await snapshot.save();
    return { publishedCount: 0, skippedCount: skipped };
  }
  const issue = await ensureOjsIssue(sourceId, snapshot.issue);
  let publishedCount = 0;
  for (const { doc, galleyId, bytes, hash } of ready) {
    const linked = doc.importedArticleId ? await Article.findById(doc.importedArticleId) : null;
    const existing = linked || await Article.findOne({ ojsImportId: doc._id });
    const title = String(doc.title).trim();
    const basicSlug = slugify(title) || `ojs-${doc.submissionId}`;
    let article = existing;
    if (!article) {
      let slug = basicSlug;
      const conflict = await Article.findOne({ issueId: issue._id, slug });
      if (conflict) slug = `${basicSlug}-ojs-${doc.submissionId}`;
      article = new Article({
        ojsImportId: doc._id, issueId: issue._id, slug, title,
        articleId: `OJS-${doc.submissionId}`, pdfUrl: "ojs-private:" + doc._id,
        views: 0, downloads: 0, citations: 0, citationSyncEnabled: false,
        order: 0, articleType: "Research Article", accessType: "Open Access", status: "inPress", isPublished: false,
      });
    } else if (String(article.ojsImportId || "") !== String(doc._id)) {
      throw new Error("Article identity mismatch; refusing to overwrite manually managed article");
    }
    const publicUrl = await writePublicPdf(bytes, sourceId, doc.publicationId, galleyId, hash);
    // Preserve stable slugs, view/download counters and citation values on re-sync.
    const previousPdfUrl = String(article.pdfUrl || "");
    article.set({
      issueId: issue._id, title,
      authors: doc.authors.map((a: any) => String(a.name || "").trim()).filter(Boolean),
      abstract: sanitizeRichHtml(doc.abstract), keywords: doc.keywords,
      doi: doc.doi, pages: doc.pages, publishDate: doc.datePublished,
      pdfUrl: publicUrl, isPublished: true, status: "published",
    });
    await article.save();
    // Clean up an obsolete public OJS PDF only after the DB references the new file.
    if (previousPdfUrl.startsWith("/ojs-pdfs/") && previousPdfUrl !== publicUrl) {
      const root = path.resolve(getOjsPublicPdfRoot(), "ojs-articles");
      const relative = previousPdfUrl.slice("/ojs-pdfs/".length);
      if (/^[a-f0-9]{16}\/\d+-\d+-[a-f0-9]{64}\.pdf$/i.test(relative)) {
        const oldPath = path.resolve(root, relative);
        if (oldPath.startsWith(root + path.sep)) {
          await fs.rm(oldPath, { force: true }).catch((error) =>
            console.warn("Old OJS PDF cleanup failed:", error));
        }
      }
    }
    doc.set({ reviewStatus: "published", importedArticleId: article._id,
      approvedIssueId: issue._id, selectedGalleyId: galleyId });
    await doc.save();
    publishedCount++;
  }
  snapshot.set({ state: "complete", publishedCount, skippedCount: skipped, lastCompletedHash: snapshotHash, lastError: "" });
  await snapshot.save();
  return { publishedCount, skippedCount: skipped };
}
