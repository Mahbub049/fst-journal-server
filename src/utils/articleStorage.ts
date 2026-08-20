import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import {
  buildIssueArticleFolderName,
  ensureIssueArticlePdfDirectory,
} from "./issueStorage";

const TEMP_PREFIX = "temp-pdf:";
const TEMP_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const ARTICLE_PDF_ROOT = path.resolve(
  process.cwd(),
  "public",
  "pdfs",
  "articles"
);
const TEMP_ARTICLE_PDF_ROOT = path.resolve(
  process.cwd(),
  ".tmp",
  "article-pdfs"
);

type IssueStorageIdentity = {
  volume?: string;
  issueNumber?: string;
};

export type ArticlePdfCommit = {
  publicUrl: string;
  targetPath: string;
  backupPath: string | null;
};

export type ArticlePdfMove = {
  publicUrl: string;
  sourcePath: string;
  targetPath: string;
  backupPath: string | null;
  moved: boolean;
};

const pathExists = async (targetPath: string) => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const getTemporaryToken = (tempUrl: string) => {
  const value = String(tempUrl || "").trim();

  if (!value.startsWith(TEMP_PREFIX)) return "";

  const token = value.slice(TEMP_PREFIX.length).trim();
  return /^[a-f0-9-]{20,}$/i.test(token) ? token : "";
};

const getTemporaryPdfPath = (tempUrl: string) => {
  const token = getTemporaryToken(tempUrl);
  return token ? path.join(TEMP_ARTICLE_PDF_ROOT, `${token}.pdf`) : null;
};

export const isTemporaryArticlePdfUrl = (value: string) => {
  return Boolean(getTemporaryToken(value));
};

export const cleanupStaleTemporaryArticlePdfs = async () => {
  await fs.mkdir(TEMP_ARTICLE_PDF_ROOT, { recursive: true });

  const now = Date.now();
  const entries = await fs.readdir(TEMP_ARTICLE_PDF_ROOT, {
    withFileTypes: true,
  });

  await Promise.all(
    entries.map(async (entry) => {
      if (!entry.isFile()) return;

      const filePath = path.join(TEMP_ARTICLE_PDF_ROOT, entry.name);

      try {
        const stats = await fs.stat(filePath);
        if (now - stats.mtimeMs > TEMP_MAX_AGE_MS) {
          await fs.rm(filePath, { force: true });
        }
      } catch {
        // A concurrent request may already have moved/deleted the file.
      }
    })
  );
};

export const createTemporaryArticlePdf = async (buffer: Buffer) => {
  await cleanupStaleTemporaryArticlePdfs();
  await fs.mkdir(TEMP_ARTICLE_PDF_ROOT, { recursive: true });

  const token = randomUUID();
  const filePath = path.join(TEMP_ARTICLE_PDF_ROOT, `${token}.pdf`);

  await fs.writeFile(filePath, buffer);

  return {
    tempUrl: `${TEMP_PREFIX}${token}`,
    token,
  };
};

export const discardTemporaryArticlePdf = async (tempUrl: string) => {
  const filePath = getTemporaryPdfPath(tempUrl);

  if (!filePath) return false;

  await fs.rm(filePath, { force: true });
  return true;
};

const buildCommittedArticlePdfLocation = async (
  issue: IssueStorageIdentity,
  articleId: string
) => {
  const folderName = buildIssueArticleFolderName(issue);
  const directory = await ensureIssueArticlePdfDirectory(issue);
  const safeArticleId = String(articleId || "").replace(/[^a-zA-Z0-9_-]/g, "");

  if (!safeArticleId) {
    throw new Error("Article ID is required to store the PDF.");
  }

  const filename = `${safeArticleId}.pdf`;
  const targetPath = path.join(directory, filename);
  const publicUrl = `/pdfs/articles/${folderName}/${filename}`;

  return { targetPath, publicUrl };
};

export const commitTemporaryArticlePdf = async (params: {
  tempUrl: string;
  issue: IssueStorageIdentity;
  articleId: string;
}): Promise<ArticlePdfCommit> => {
  const sourcePath = getTemporaryPdfPath(params.tempUrl);

  if (!sourcePath || !(await pathExists(sourcePath))) {
    throw new Error(
      "The temporary PDF is no longer available. Please upload the PDF again."
    );
  }

  const { targetPath, publicUrl } = await buildCommittedArticlePdfLocation(
    params.issue,
    params.articleId
  );

  let backupPath: string | null = null;

  if (await pathExists(targetPath)) {
    backupPath = `${targetPath}.bak-${randomUUID()}`;
    await fs.rename(targetPath, backupPath);
  }

  try {
    await fs.rename(sourcePath, targetPath);
  } catch (error) {
    if (backupPath && (await pathExists(backupPath))) {
      await fs.rename(backupPath, targetPath);
    }
    throw error;
  }

  return {
    publicUrl,
    targetPath,
    backupPath,
  };
};

export const finalizeArticlePdfCommit = async (commit: ArticlePdfCommit) => {
  if (commit.backupPath) {
    await fs.rm(commit.backupPath, { force: true });
  }
};

export const rollbackArticlePdfCommit = async (commit: ArticlePdfCommit) => {
  await fs.rm(commit.targetPath, { force: true });

  if (commit.backupPath && (await pathExists(commit.backupPath))) {
    await fs.rename(commit.backupPath, commit.targetPath);
  }
};


export const moveLocalArticlePdfToIssue = async (params: {
  pdfUrl: string;
  issue: IssueStorageIdentity;
  articleId: string;
}): Promise<ArticlePdfMove | null> => {
  const sourcePath = resolveLocalArticlePdfPath(params.pdfUrl);

  // External PDFs are intentionally left untouched.
  if (!sourcePath) return null;

  if (!(await pathExists(sourcePath))) {
    throw new Error(
      "The article PDF file could not be found on the server. Please upload the PDF again before moving the article or renaming the issue."
    );
  }

  const { targetPath, publicUrl } = await buildCommittedArticlePdfLocation(
    params.issue,
    params.articleId
  );

  if (path.resolve(sourcePath) === path.resolve(targetPath)) {
    return {
      publicUrl,
      sourcePath,
      targetPath,
      backupPath: null,
      moved: false,
    };
  }

  let backupPath: string | null = null;

  if (await pathExists(targetPath)) {
    backupPath = `${targetPath}.bak-${randomUUID()}`;
    await fs.rename(targetPath, backupPath);
  }

  try {
    await fs.rename(sourcePath, targetPath);
  } catch (error) {
    if (backupPath && (await pathExists(backupPath))) {
      await fs.rename(backupPath, targetPath);
    }
    throw error;
  }

  return {
    publicUrl,
    sourcePath,
    targetPath,
    backupPath,
    moved: true,
  };
};

export const finalizeArticlePdfMove = async (move: ArticlePdfMove) => {
  if (move.backupPath) {
    await fs.rm(move.backupPath, { force: true });
  }
};

export const rollbackArticlePdfMove = async (move: ArticlePdfMove) => {
  if (move.moved && (await pathExists(move.targetPath))) {
    await fs.mkdir(path.dirname(move.sourcePath), { recursive: true });
    await fs.rename(move.targetPath, move.sourcePath);
  }

  if (move.backupPath && (await pathExists(move.backupPath))) {
    await fs.rename(move.backupPath, move.targetPath);
  }
};

export const resolveLocalArticlePdfPath = (pdfUrl: string) => {
  let cleanedUrl = String(pdfUrl || "")
    .trim()
    .split("?")[0]
    .split("#")[0];

  if (/^https?:\/\//i.test(cleanedUrl)) {
    try {
      const parsed = new URL(cleanedUrl);
      if (
        !["localhost", "127.0.0.1", "0.0.0.0"].includes(parsed.hostname) ||
        !parsed.pathname.startsWith("/pdfs/articles/")
      ) {
        return null;
      }
      cleanedUrl = parsed.pathname;
    } catch {
      return null;
    }
  }

  if (!cleanedUrl.startsWith("/pdfs/articles/")) {
    return null;
  }

  const relativePath = cleanedUrl.replace(/^\/+/, "");
  const resolvedPath = path.resolve(process.cwd(), "public", relativePath);
  const rootPrefix = `${ARTICLE_PDF_ROOT}${path.sep}`;

  if (resolvedPath !== ARTICLE_PDF_ROOT && !resolvedPath.startsWith(rootPrefix)) {
    return null;
  }

  return resolvedPath;
};

export const deleteLocalArticlePdfByUrl = async (pdfUrl: string) => {
  const filePath = resolveLocalArticlePdfPath(pdfUrl);

  if (!filePath) return false;

  await fs.rm(filePath, { force: true });
  return true;
};

const cleanupDirectory = async (
  directory: string,
  referencedPaths: Set<string>,
  protectedFolderNames: Set<string>
) => {
  let entries;

  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      await cleanupDirectory(entryPath, referencedPaths, protectedFolderNames);
      continue;
    }

    if (!entry.isFile()) continue;

    // Backup files should exist only during a save request. If a previous
    // process crashed and left one behind, it is safe to remove it later.
    if (entry.name.includes(".bak-")) {
      try {
        const stats = await fs.stat(entryPath);
        if (Date.now() - stats.mtimeMs > TEMP_MAX_AGE_MS) {
          await fs.rm(entryPath, { force: true });
        }
      } catch {
        // Ignore concurrent cleanup.
      }
      continue;
    }

    if (!entry.name.toLowerCase().endsWith(".pdf")) continue;

    const resolvedEntryPath = path.resolve(entryPath);
    if (!referencedPaths.has(resolvedEntryPath)) {
      await fs.rm(entryPath, { force: true });
    }
  }

  if (directory === ARTICLE_PDF_ROOT) return;

  try {
    const remainingEntries = await fs.readdir(directory);
    const folderName = path.basename(directory);

    if (remainingEntries.length === 0 && !protectedFolderNames.has(folderName)) {
      await fs.rmdir(directory);
    }
  } catch {
    // Ignore folders that disappeared during concurrent cleanup.
  }
};

export const cleanupUnreferencedLocalArticlePdfs = async (params: {
  referencedPdfUrls: string[];
  activeIssueFolders: string[];
}) => {
  await fs.mkdir(ARTICLE_PDF_ROOT, { recursive: true });

  const referencedPaths = new Set(
    params.referencedPdfUrls
      .map((url) => resolveLocalArticlePdfPath(url))
      .filter((value): value is string => Boolean(value))
      .map((value) => path.resolve(value))
  );

  const protectedFolderNames = new Set(params.activeIssueFolders);

  await cleanupDirectory(
    ARTICLE_PDF_ROOT,
    referencedPaths,
    protectedFolderNames
  );
};
