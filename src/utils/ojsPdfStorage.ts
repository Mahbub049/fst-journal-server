import fs from "fs/promises";
import path from "path";
import { createHash, randomUUID } from "crypto";
import { getOjsPublicPdfRoot } from "./ojsPublicPdfStorage";

/** Only private staging files. Never store unapproved OJS PDFs in public/pdfs. */
export function getOjsPdfRoot(): string {
  const configured = (process.env.OJS_IMPORT_PDF_DIR || "").trim();
  if (!configured) {
    throw new Error("OJS_IMPORT_PDF_DIR is not configured");
  }
  if (process.env.NODE_ENV === "production" && !path.isAbsolute(configured)) {
    throw new Error("OJS_IMPORT_PDF_DIR must be an absolute persistent path in production");
  }
  const root = path.resolve(configured);
  const projectRoot = path.resolve(process.cwd());
  if (process.env.NODE_ENV === "production" &&
      (root === projectRoot || root.startsWith(projectRoot + path.sep))) {
    throw new Error("OJS_IMPORT_PDF_DIR must be outside the application checkout");
  }
  const publicMediaRoot = path.resolve(getOjsPublicPdfRoot());
  if (root === publicMediaRoot || root.startsWith(publicMediaRoot + path.sep) ||
      publicMediaRoot.startsWith(root + path.sep)) {
    throw new Error("OJS private and public PDF directories must not overlap");
  }
  const publicRoot = path.resolve(process.cwd(), "public");
  if (root === publicRoot || root.startsWith(publicRoot + path.sep)) {
    throw new Error("OJS_IMPORT_PDF_DIR must be outside public storage");
  }
  return root;
}

/** Deterministic, sanitized, content-addressed private key. */
export function ojsPdfStorageKey(sourceId: string, publicationId: number, galleyId: number, sha256: string): string {
  const source = createHash("sha256").update(sourceId).digest("hex").slice(0, 16);
  return path.posix.join(source, String(publicationId), `${galleyId}-${sha256}.pdf`);
}

export async function stageOjsPdf(params: {
  sourceId: string;
  publicationId: number;
  galleyId: number;
  sha256: string;
  buffer: Buffer;
}): Promise<{ storageKey: string }> {
  const root = getOjsPdfRoot();
  const storageKey = ojsPdfStorageKey(params.sourceId, params.publicationId, params.galleyId, params.sha256);
  const destination = path.resolve(root, ...storageKey.split("/"));
  if (!destination.startsWith(root + path.sep)) {
    throw new Error("Invalid private PDF destination");
  }
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const tmp = `${destination}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(tmp, params.buffer, { flag: "wx", mode: 0o600 });
    // Content-addressed destination makes the same upload idempotent.
    let existing: Buffer | null = null;
    try {
      existing = await fs.readFile(destination);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    if (existing) {
      if (createHash("sha256").update(existing).digest("hex") !== params.sha256) {
        throw new Error("Existing staged PDF has unexpected checksum");
      }
    } else {
      await fs.rename(tmp, destination);
    }
  } finally {
    await fs.rm(tmp, { force: true });
  }
  return { storageKey };
}
