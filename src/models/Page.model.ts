import mongoose, { Document, Model, Schema } from "mongoose";

export type PageGroup = "about" | "for-authors" | "issues" | "custom";
export type ContentBlockType =
  | "paragraph"
  | "heading"
  | "list"
  | "card"
  | "image"
  | "pdf"
  | "button";

export interface IContentBlock {
  type: ContentBlockType;
  title?: string;
  content?: string;
  items?: string[];
  imageUrl?: string;
  fileUrl?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  order: number;
  isActive: boolean;
}

export interface IPage extends Document {
  title: string;
  slug: string;
  group: PageGroup;
  subtitle?: string;
  bannerImage?: string;
  shortDescription?: string;
  contentBlocks: IContentBlock[];
  buttonLabel?: string;
  buttonUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  order: number;
  isPublished: boolean;
}

const contentBlockSchema = new Schema<IContentBlock>(
  {
    type: {
      type: String,
      enum: ["paragraph", "heading", "list", "card", "image", "pdf", "button"],
      required: true,
    },

    title: {
      type: String,
      trim: true,
      default: "",
    },

    content: {
      type: String,
      default: "",
    },

    items: {
      type: [String],
      default: [],
    },

    imageUrl: {
      type: String,
      default: "",
    },

    fileUrl: {
      type: String,
      default: "",
    },

    buttonLabel: {
      type: String,
      default: "",
    },

    buttonUrl: {
      type: String,
      default: "",
    },

    order: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    _id: true,
  }
);

const pageSchema = new Schema<IPage>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    group: {
      type: String,
      enum: ["about", "for-authors", "issues", "custom"],
      required: true,
    },

    subtitle: {
      type: String,
      default: "",
    },

    bannerImage: {
      type: String,
      default: "",
    },

    shortDescription: {
      type: String,
      default: "",
    },

    contentBlocks: {
      type: [contentBlockSchema],
      default: [],
    },

    buttonLabel: {
      type: String,
      default: "",
    },

    buttonUrl: {
      type: String,
      default: "",
    },

    metaTitle: {
      type: String,
      default: "",
    },

    metaDescription: {
      type: String,
      default: "",
    },

    order: {
      type: Number,
      default: 0,
    },

    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

pageSchema.index({ group: 1, slug: 1 }, { unique: true });

const Page: Model<IPage> =
  mongoose.models.Page || mongoose.model<IPage>("Page", pageSchema);

export default Page;