import mongoose, { Document, Model, Schema } from "mongoose";

export type PageGroup = "about" | "authors" | "reviewers" | "issues" | "custom";
export type CmsButtonIcon =
  | "none"
  | "download"
  | "pdf"
  | "latex"
  | "document"
  | "submit"
  | "external"
  | "arrow-right"
  | "arrow-up-right";
export type CmsButtonVariant = "primary" | "secondary" | "outline" | "light";
export type CmsButtonLayout = "vertical" | "horizontal";

export interface IPageActionButton {
  label: string;
  url: string;
  icon: CmsButtonIcon;
  variant: CmsButtonVariant;
  openInNewTab: boolean;
  order: number;
  isActive: boolean;
}
export type ContentBlockType =
  | "paragraph"
  | "heading"
  | "list"
  | "card"
  | "section"
  | "columns"
  | "quote"
  | "notice"
  | "image"
  | "pdf"
  | "button"
  | "video"
  | "table"
  | "code"
  | "divider"
  | "spacer";

export interface IContentBlockStyle {
  alignment?: "left" | "center" | "right" | "justify";
  backgroundColor?: string;
  textColor?: string;
  width?: "full" | "wide" | "normal" | "narrow";
  padding?: "none" | "small" | "medium" | "large";
  columns?: number;
  headingLevel?: number;
  variant?: string;
  buttonLayout?: CmsButtonLayout;
}

export interface IContentBlock {
  type: ContentBlockType;
  title?: string;
  content?: string;
  items?: string[];
  imageUrl?: string;
  fileUrl?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  showButton?: boolean;
  buttonIcon?: CmsButtonIcon;
  buttonVariant?: CmsButtonVariant;
  buttonOpenInNewTab?: boolean;
  caption?: string;
  altText?: string;
  codeLanguage?: string;
  style?: IContentBlockStyle;
  children?: IContentBlock[];
  order: number;
  isActive: boolean;
}

export interface IPage extends Document {
  title: string;
  slug: string;
  group: PageGroup;
  showTopLabel: boolean;
  subtitle?: string;
  bannerImage?: string;
  shortDescription?: string;
  contentBlocks: IContentBlock[];
  buttonLabel?: string;
  buttonUrl?: string;
  showButton: boolean;
  buttonIcon: CmsButtonIcon;
  buttonVariant: CmsButtonVariant;
  buttonOpenInNewTab: boolean;
  showHelpCard: boolean;
  helpCardTitle: string;
  helpCardContent: string;
  helpCardButtonLayout: CmsButtonLayout;
  helpCardButtons: IPageActionButton[];
  metaTitle?: string;
  metaDescription?: string;
  order: number;
  isPublished: boolean;
}

const blockStyleSchema = new Schema<IContentBlockStyle>(
  {
    alignment: {
      type: String,
      enum: ["left", "center", "right", "justify"],
      default: "left",
    },
    backgroundColor: { type: String, default: "" },
    textColor: { type: String, default: "" },
    width: {
      type: String,
      enum: ["full", "wide", "normal", "narrow"],
      default: "normal",
    },
    padding: {
      type: String,
      enum: ["none", "small", "medium", "large"],
      default: "medium",
    },
    columns: { type: Number, min: 1, max: 4, default: 2 },
    headingLevel: { type: Number, min: 1, max: 6, default: 2 },
    variant: { type: String, default: "default" },
    buttonLayout: {
      type: String,
      enum: ["vertical", "horizontal"],
      default: "vertical",
    },
  },
  { _id: false }
);

const contentBlockSchema = new Schema<IContentBlock>(
  {
    type: {
      type: String,
      enum: [
        "paragraph",
        "heading",
        "list",
        "card",
        "section",
        "columns",
        "quote",
        "notice",
        "image",
        "pdf",
        "button",
        "video",
        "table",
        "code",
        "divider",
        "spacer",
      ],
      required: true,
    },
    title: { type: String, trim: true, default: "" },
    content: { type: String, default: "" },
    items: { type: [String], default: [] },
    imageUrl: { type: String, default: "" },
    fileUrl: { type: String, default: "" },
    buttonLabel: { type: String, default: "" },
    buttonUrl: { type: String, default: "" },
    showButton: { type: Boolean, default: true },
    buttonIcon: {
      type: String,
      enum: [
        "none",
        "download",
        "pdf",
        "latex",
        "document",
        "submit",
        "external",
        "arrow-right",
        "arrow-up-right",
      ],
      default: "none",
    },
    buttonVariant: {
      type: String,
      enum: ["primary", "secondary", "outline", "light"],
      default: "primary",
    },
    buttonOpenInNewTab: { type: Boolean, default: false },
    caption: { type: String, default: "" },
    altText: { type: String, default: "" },
    codeLanguage: { type: String, default: "" },
    style: { type: blockStyleSchema, default: () => ({}) },
    // Mixed keeps nested blocks recursive without limiting nesting depth.
    // The controller validates and normalizes every nested item before saving.
    children: { type: [Schema.Types.Mixed], default: [] },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);


const pageActionButtonSchema = new Schema<IPageActionButton>(
  {
    label: { type: String, default: "", trim: true },
    url: { type: String, default: "", trim: true },
    icon: {
      type: String,
      enum: [
        "none",
        "download",
        "pdf",
        "latex",
        "document",
        "submit",
        "external",
        "arrow-right",
        "arrow-up-right",
      ],
      default: "none",
    },
    variant: {
      type: String,
      enum: ["primary", "secondary", "outline", "light"],
      default: "primary",
    },
    openInNewTab: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

const pageSchema = new Schema<IPage>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    group: {
      type: String,
      enum: ["about", "authors", "reviewers", "issues", "custom"],
      required: true,
    },
    showTopLabel: { type: Boolean, default: true },
    subtitle: { type: String, default: "" },
    bannerImage: { type: String, default: "" },
    shortDescription: { type: String, default: "" },
    contentBlocks: { type: [contentBlockSchema], default: [] },
    buttonLabel: { type: String, default: "" },
    buttonUrl: { type: String, default: "" },
    showButton: { type: Boolean, default: true },
    buttonIcon: {
      type: String,
      enum: [
        "none",
        "download",
        "pdf",
        "latex",
        "document",
        "submit",
        "external",
        "arrow-right",
        "arrow-up-right",
      ],
      default: "none",
    },
    buttonVariant: {
      type: String,
      enum: ["primary", "secondary", "outline", "light"],
      default: "primary",
    },
    buttonOpenInNewTab: { type: Boolean, default: false },
    showHelpCard: { type: Boolean, default: true },
    helpCardTitle: {
      type: String,
      default: "Need help preparing your manuscript?",
    },
    helpCardContent: {
      type: String,
      default:
        "Please review the author guidelines, submission checklist, and call for papers notice before final submission.",
    },
    helpCardButtonLayout: {
      type: String,
      enum: ["vertical", "horizontal"],
      default: "horizontal",
    },
    helpCardButtons: { type: [pageActionButtonSchema], default: [] },
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

pageSchema.index({ group: 1, slug: 1 }, { unique: true });
pageSchema.index({ group: 1, order: 1 });

const Page: Model<IPage> =
  mongoose.models.Page || mongoose.model<IPage>("Page", pageSchema);

export default Page;
