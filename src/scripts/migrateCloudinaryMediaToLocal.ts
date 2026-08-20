import mongoose from "mongoose";
import path from "path";
import Media from "../models/Media.model";
import { env } from "../config/env";
import { saveLocalMedia } from "../utils/mediaStorage";

type ReplacementMap = Map<string, string>;

type PendingMigration = {
  mediaId: mongoose.Types.ObjectId;
  oldUrl: string;
  newUrl: string;
  newStorageKey: string;
};

const isCloudinaryUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.hostname.toLowerCase() === "res.cloudinary.com";
  } catch {
    return false;
  }
};

const filenameFromUrl = (urlValue: string, fallback: string) => {
  try {
    const url = new URL(urlValue);
    const filename = path.basename(decodeURIComponent(url.pathname));
    return filename || fallback;
  } catch {
    return fallback;
  }
};

const downloadBuffer = async (url: string) => {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": "BUP-FST-Journal-Media-Migration/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while downloading ${url}`);
  }

  return Buffer.from(await response.arrayBuffer());
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const replaceStringsDeep = (
  value: unknown,
  replacements: ReplacementMap
): { value: unknown; changed: boolean } => {
  if (typeof value === "string") {
    let nextValue = value;
    let changed = false;

    for (const [oldUrl, newUrl] of replacements.entries()) {
      if (!nextValue.includes(oldUrl)) continue;
      nextValue = nextValue.split(oldUrl).join(newUrl);
      changed = true;
    }

    return { value: nextValue, changed };
  }

  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const result = replaceStringsDeep(item, replacements);
      changed = changed || result.changed;
      return result.value;
    });

    return { value: changed ? next : value, changed };
  }

  if (isPlainObject(value)) {
    let changed = false;
    const next: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(value)) {
      const result = replaceStringsDeep(item, replacements);
      changed = changed || result.changed;
      next[key] = result.value;
    }

    return { value: changed ? next : value, changed };
  }

  return { value, changed: false };
};

const replaceUrlsAcrossDatabase = async (replacements: ReplacementMap) => {
  if (replacements.size === 0) return 0;

  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB connection is not available.");

  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  let changedDocuments = 0;

  for (const collectionInfo of collections) {
    const collection = db.collection(collectionInfo.name);
    const cursor = collection.find({});

    for await (const document of cursor) {
      const result = replaceStringsDeep(document, replacements);
      if (!result.changed) continue;

      await collection.replaceOne(
        { _id: document._id },
        result.value as Record<string, unknown>
      );
      changedDocuments += 1;
    }
  }

  return changedDocuments;
};

const run = async () => {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(env.mongoUri);

  const allMedia = await Media.find({}).lean();
  const candidates = allMedia.filter((item) => isCloudinaryUrl(item.fileUrl));

  if (candidates.length === 0) {
    console.log("No Cloudinary Media Library records were found. Nothing to migrate.");
    return;
  }

  console.log(`Found ${candidates.length} Cloudinary media file(s).`);
  console.log("Copying them to local journal storage...");

  const pending: PendingMigration[] = [];

  for (const [index, item] of candidates.entries()) {
    const oldUrl = item.fileUrl;
    const originalName = filenameFromUrl(oldUrl, item.title || "media-file");
    const buffer = await downloadBuffer(oldUrl);

    const stored = await saveLocalMedia({
      buffer,
      folder: item.folder || "general",
      originalName,
      mimeType: item.mimeType,
    });

    pending.push({
      mediaId: item._id as mongoose.Types.ObjectId,
      oldUrl,
      newUrl: stored.publicUrl,
      newStorageKey: stored.storageKey,
    });

    console.log(
      `[${index + 1}/${candidates.length}] ${item.title}: ${stored.publicUrl}`
    );
  }

  const replacements: ReplacementMap = new Map(
    pending.map((item) => [item.oldUrl, item.newUrl])
  );

  console.log("Updating Cloudinary URLs stored throughout the CMS...");
  const changedDocuments = await replaceUrlsAcrossDatabase(replacements);

  // fileUrl is replaced by the database-wide pass. publicId is a Cloudinary
  // identifier, so update it explicitly to the local storage key.
  for (const item of pending) {
    await Media.updateOne(
      { _id: item.mediaId },
      {
        $set: {
          fileUrl: item.newUrl,
          publicId: item.newStorageKey,
        },
      }
    );
  }

  console.log("");
  console.log("Migration completed successfully.");
  console.log(`Media files migrated: ${pending.length}`);
  console.log(`CMS documents updated: ${changedDocuments}`);
  console.log("");
  console.log(
    "Keep the old Cloudinary assets temporarily as a backup until the live site has been verified."
  );
};

run()
  .catch((error) => {
    console.error("Media migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
