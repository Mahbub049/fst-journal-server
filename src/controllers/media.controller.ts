import { Response } from "express";
import streamifier from "streamifier";
import cloudinary from "../config/cloudinary";
import Media, { MediaType } from "../models/Media.model";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware";

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

const uploadBufferToCloudinary = (
  fileBuffer: Buffer,
  folder: string,
  resourceType: "image" | "raw"
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `bup-fst-journal/${folder}`,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

export const uploadMedia = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const file = req.file;

    if (!file) {
      res.status(400).json({
        success: false,
        message: "No file uploaded.",
      });
      return;
    }

    const folder = req.body.folder || "general";
    const title = req.body.title || file.originalname;

    const mediaType = getMediaType(file.mimetype);
    const resourceType = mediaType === "image" ? "image" : "raw";

    const uploaded = await uploadBufferToCloudinary(
      file.buffer,
      folder,
      resourceType
    );

    const media = await Media.create({
      title,
      fileUrl: uploaded.secure_url,
      publicId: uploaded.public_id,
      fileType: mediaType,
      mimeType: file.mimetype,
      size: file.size,
      folder,
      uploadedBy: req.admin?.id,
    });

    res.status(201).json({
      success: true,
      message: "File uploaded successfully.",
      media,
    });
  } catch (error) {
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

    await cloudinary.uploader.destroy(media.publicId, {
      resource_type: media.fileType === "image" ? "image" : "raw",
    });

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