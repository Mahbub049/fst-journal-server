import { Response } from "express";
import Media, { MediaType } from "../models/Media.model";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware";
import { detectAllowedUploadMimeType } from "../utils/fileSignature";
import {
  deleteLocalMediaFile,
  saveLocalMedia,
} from "../utils/mediaStorage";

const allowedMediaFolders = new Set([
  "general",
  "homepage",
  "homepage-carousel",
  "homepage-launch-modal",
  "issues",
  "articles",
  "editorial-board",
  "call-for-papers",
  "call-for-papers/images",
  "authors",
  "about",
  "pages",
]);

const getMediaType = (mimeType: string): MediaType => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";

  if (
    mimeType === "application/msword" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "document";
  }

  return "other";
};

export const uploadMedia = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  let storedFileKey = "";

  try {
    const file = req.file;

    if (!file) {
      res.status(400).json({
        success: false,
        message: "No file uploaded.",
      });
      return;
    }

    const detectedMimeType = detectAllowedUploadMimeType(file.buffer);

    if (!detectedMimeType) {
      res.status(400).json({
        success: false,
        message: "The uploaded file content is not a supported file type.",
      });
      return;
    }

    const reportedMimeType =
      file.mimetype === "image/jpg"
        ? "image/jpeg"
        : file.mimetype.toLowerCase();

    if (reportedMimeType !== detectedMimeType) {
      res.status(400).json({
        success: false,
        message:
          "The uploaded file content does not match its reported file type.",
      });
      return;
    }

    const folder = String(req.body.folder || "general").trim();

    if (!allowedMediaFolders.has(folder)) {
      res.status(400).json({
        success: false,
        message: "Invalid media folder.",
      });
      return;
    }

    const title =
      String(req.body.title || file.originalname)
        .trim()
        .slice(0, 150) || "Untitled media";

    const mediaType = getMediaType(detectedMimeType);

    const stored = await saveLocalMedia({
      buffer: file.buffer,
      folder,
      originalName: file.originalname,
      mimeType: detectedMimeType,
    });

    storedFileKey = stored.storageKey;

    const media = await Media.create({
      title,
      fileUrl: stored.publicUrl,
      publicId: stored.storageKey,
      fileType: mediaType,
      mimeType: detectedMimeType,
      size: file.size,
      folder,
      uploadedBy: req.admin?.id,
    });

    res.status(201).json({
      success: true,
      message: "File uploaded successfully to local journal storage.",
      media,
    });
  } catch (error) {
    if (storedFileKey) {
      try {
        await deleteLocalMediaFile(storedFileKey);
      } catch {
        // Preserve the original upload error for the administrator.
      }
    }

    console.error("Media upload error:", error);

    res.status(500).json({
      success: false,
      message: "File upload failed.",
    });
  }
};

export const getAllMedia = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { type, folder } = req.query;
    const filter: Record<string, any> = {};

    if (type) filter.fileType = type;
    if (folder) filter.folder = folder;

    const media = await Media.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      media,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch media.",
    });
  }
};

export const deleteMedia = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const media = await Media.findById(req.params.id);

    if (!media) {
      res.status(404).json({
        success: false,
        message: "Media not found.",
      });
      return;
    }

    const removedFromDisk = await deleteLocalMediaFile(media.fileUrl);

    if (!removedFromDisk) {
      await deleteLocalMediaFile(media.publicId);
    }
    await media.deleteOne();

    res.status(200).json({
      success: true,
      message: "Media deleted successfully.",
    });
  } catch (error) {
    console.error("Delete media error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete media.",
    });
  }
};
