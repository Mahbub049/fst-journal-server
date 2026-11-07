import fs from "fs/promises";
import path from "path";
import { createHash, randomUUID } from "crypto";
import { getStorageRoot, getMediaStorageRoot } from "./mediaStorage";

export type OjsCoverDescriptor = {
  sha256: string;
  fileSize: number;
  mimeType: string;
};

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const isValidOjsCoverDescriptor = (c: unknown): c is OjsCoverDescriptor => {
  if (!c || typeof c !== "object" || Array.isArray(c)) return false;
  const x = c as Record<string, unknown>;
  return typeof x.sha256 === "string" && /^[a-f0-9]{64}$/.test(x.sha256) &&
    typeof x.fileSize === "number" && Number.isSafeInteger(x.fileSize) && x.fileSize >= 12 &&
    x.fileSize <= MAX_IMAGE_BYTES && typeof x.mimeType === "string" && Boolean(EXTENSIONS[x.mimeType]);
};

const sourcePrefix = (sourceId: string): string =>
  createHash("sha256").update(sourceId).digest("hex").slice(0, 16);

function checkImage(buffer: Buffer, mime: string): boolean {
  if (buffer.length < 12) return false;
  switch (mime) {
    case "image/jpeg": return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "image/png": return buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    case "image/gif": return buffer.subarray(0, 6).toString("ascii") === "GIF87a" ||
      buffer.subarray(0, 6).toString("ascii") === "GIF89a";
    case "image/webp": return buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP";
    default: return false;
  }
}

function stagedFile(sourceId: string, journalId: number, issueId: number, c: OjsCoverDescriptor): string {
  return path.join(getStorageRoot(), "ojs-staged-covers", sourcePrefix(sourceId),
    `${journalId}-${issueId}-${c.sha256}${EXTENSIONS[c.mimeType]}`);
}

export async function stageOjsIssueCover(
  sourceId: string, journalId: number, issueId: number,
  descriptor: OjsCoverDescriptor, bytes: Buffer
): Promise<void> {
  if (!isValidOjsCoverDescriptor(descriptor) || bytes.length !== descriptor.fileSize ||
      !checkImage(bytes, descriptor.mimeType) ||
      createHash("sha256").update(bytes).digest("hex") !== descriptor.sha256) {
    throw new Error("OJS cover integrity validation failed");
  }
  const dest = stagedFile(sourceId, journalId, issueId, descriptor);
  await fs.mkdir(path.dirname(dest), { recursive: true, mode: 0o700 });
  try {
    const current = await fs.readFile(dest);
    if (createHash("sha256").update(current).digest("hex") !== descriptor.sha256) {
      throw new Error("Existing staged cover checksum mismatch");
    }
    return;
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  const temp = `${dest}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temp, bytes, { flag: "wx", mode: 0o600 });
    await fs.rename(temp, dest);
  } finally { await fs.rm(temp, { force: true }); }
}

export async function publishStagedOjsCover(
  sourceId: string, journalId: number, issueId: number, descriptor: OjsCoverDescriptor
): Promise<string> {
  const hashPrefix = sourcePrefix(sourceId);
  const directory = path.join(getMediaStorageRoot(), "ojs-issue-covers", hashPrefix);
  const filename = `${journalId}-${issueId}-${descriptor.sha256}${EXTENSIONS[descriptor.mimeType]}`;
  const dest = path.join(directory, filename);
  let buffer: Buffer;
  try {
    buffer = await fs.readFile(stagedFile(sourceId, journalId, issueId, descriptor));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    // Already-finalized snapshots can be retried without a second upload.
    buffer = await fs.readFile(dest);
  }
  if (buffer.length !== descriptor.fileSize || !checkImage(buffer, descriptor.mimeType) ||
      createHash("sha256").update(buffer).digest("hex") !== descriptor.sha256) {
    throw new Error("Staged issue cover is missing or corrupted; retry transfer");
  }
  await fs.mkdir(directory, { recursive: true });
  try {
    const existing = await fs.readFile(dest);
    if (createHash("sha256").update(existing).digest("hex") !== descriptor.sha256) {
      throw new Error("Published issue cover checksum mismatch");
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const temp = `${dest}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temp, buffer, { flag: "wx", mode: 0o644 });
      await fs.rename(temp, dest);
    } finally { await fs.rm(temp, { force: true }); }
  }
  return `/media/ojs-issue-covers/${hashPrefix}/${filename}`;
}

export async function cleanupOjsIssueCover(coverUrl: string): Promise<void> {
  const match = /^\/media\/ojs-issue-covers\/([a-f0-9]{16})\/(\d+-\d+-[a-f0-9]{64}\.(?:jpg|png|gif|webp))$/.exec(coverUrl);
  if (!match) return;
  await fs.rm(path.join(getMediaStorageRoot(), "ojs-issue-covers", match[1], match[2]), { force: true });
}

/** Keep the final copy only after successful publication; missing staging is harmless. */
export async function cleanupStagedOjsCover(
  sourceId: string, journalId: number, issueId: number, descriptor: OjsCoverDescriptor
): Promise<void> {
  await fs.rm(stagedFile(sourceId, journalId, issueId, descriptor), { force: true });
}
