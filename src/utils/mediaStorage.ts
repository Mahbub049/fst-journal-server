import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { env } from "../config/env";

const mimeExtensions: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
};

const cleanName = (value: string) => {
  return String(value || "file")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "file";
};

const normalizeRelativePath = (value: string) => {
  return value.replace(/\\/g, "/").replace(/^\/+/, "");
};

export const getStorageRoot = () => {
  const configuredRoot = env.storageRoot || "storage";

  return path.isAbsolute(configuredRoot)
    ? path.resolve(configuredRoot)
    : path.resolve(process.cwd(), configuredRoot);
};

export const getMediaStorageRoot = () => {
  return path.join(getStorageRoot(), "media");
};

const ensureInsideMediaRoot = (targetPath: string) => {
  const root = path.resolve(getMediaStorageRoot());
  const resolved = path.resolve(targetPath);

  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error("Resolved media path is outside the configured storage root.");
  }

  return resolved;
};

const extensionForMimeType = (mimeType: string) => {
  return mimeExtensions[mimeType] || "";
};

export const saveLocalMedia = async (params: {
  buffer: Buffer;
  folder: string;
  originalName: string;
  mimeType: string;
}) => {
  const folderPath = ensureInsideMediaRoot(
    path.join(getMediaStorageRoot(), ...params.folder.split("/"))
  );

  await fs.mkdir(folderPath, { recursive: true });

  const parsedName = path.parse(params.originalName || "file");
  const extension =
    extensionForMimeType(params.mimeType) || parsedName.ext.toLowerCase();
  const baseName = cleanName(parsedName.name || params.originalName);
  const uniqueSuffix = randomUUID().replace(/-/g, "").slice(0, 12);
  const filename = `${baseName}-${uniqueSuffix}${extension}`;
  const absolutePath = ensureInsideMediaRoot(path.join(folderPath, filename));

  await fs.writeFile(absolutePath, params.buffer, { flag: "wx" });

  const relativePath = normalizeRelativePath(
    path.relative(getStorageRoot(), absolutePath)
  );

  return {
    absolutePath,
    storageKey: relativePath,
    publicUrl: `/${relativePath}`,
  };
};

export const resolveLocalMediaPath = (value: string) => {
  const raw = String(value || "").trim();
  if (!raw) return null;

  let relative = "";

  if (raw.startsWith("/media/")) {
    relative = raw.slice(1);
  } else if (raw.startsWith("media/")) {
    relative = raw;
  } else {
    return null;
  }

  const normalized = normalizeRelativePath(relative);

  if (!normalized.startsWith("media/")) {
    return null;
  }

  try {
    return ensureInsideMediaRoot(
      path.join(getStorageRoot(), ...normalized.split("/"))
    );
  } catch {
    return null;
  }
};

const removeEmptyParents = async (startDirectory: string) => {
  const mediaRoot = path.resolve(getMediaStorageRoot());
  let current = path.resolve(startDirectory);

  while (
    current !== mediaRoot &&
    current.startsWith(`${mediaRoot}${path.sep}`)
  ) {
    try {
      const entries = await fs.readdir(current);
      if (entries.length > 0) return;

      await fs.rmdir(current);
      current = path.dirname(current);
    } catch {
      return;
    }
  }
};

export const deleteLocalMediaFile = async (value: string) => {
  const filePath = resolveLocalMediaPath(value);
  if (!filePath) return false;

  await fs.rm(filePath, { force: true });
  await removeEmptyParents(path.dirname(filePath));
  return true;
};
