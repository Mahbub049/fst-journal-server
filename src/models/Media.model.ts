import mongoose, { Document, Model, Schema } from "mongoose";

export type MediaType = "image" | "pdf" | "document" | "other";

export interface IMedia extends Document {
  title: string;
  fileUrl: string;
  publicId: string;
  fileType: MediaType;
  mimeType: string;
  size: number;
  folder: string;
  uploadedBy?: mongoose.Types.ObjectId;
}

const mediaSchema = new Schema<IMedia>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    fileUrl: {
      type: String,
      required: true,
    },

    publicId: {
      type: String,
      required: true,
    },

    fileType: {
      type: String,
      enum: ["image", "pdf", "document", "other"],
      required: true,
    },

    mimeType: {
      type: String,
      required: true,
    },

    size: {
      type: Number,
      required: true,
    },

    folder: {
      type: String,
      default: "general",
      trim: true,
    },

    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  {
    timestamps: true,
  }
);

const Media: Model<IMedia> =
  mongoose.models.Media || mongoose.model<IMedia>("Media", mediaSchema);

export default Media;