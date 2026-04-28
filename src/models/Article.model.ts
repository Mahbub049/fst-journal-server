import mongoose, { Schema, Document, Types } from "mongoose";

export interface IArticle extends Document {
  issueId: Types.ObjectId;
  title: string;
  slug: string;
  authors: string[];
  abstract: string;
  keywords: string[];
  pages: string;
  pdfUrl: string;

  articleId: string;
  articleUrl: string;
  doi: string;
  publishDate: string;
  views: number;
  downloads: number;
  citations: number;
  status: "published" | "inPress";
  articleType: string;
  accessType: string;

  order: number;
  isPublished: boolean;
}

const ArticleSchema = new Schema<IArticle>(
  {
    issueId: {
      type: Schema.Types.ObjectId,
      ref: "Issue",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
    },
    authors: {
      type: [String],
      default: [],
    },
    abstract: {
      type: String,
      default: "",
    },
    keywords: {
      type: [String],
      default: [],
    },
    pages: {
      type: String,
      default: "",
    },
    pdfUrl: {
      type: String,
      required: true,
      trim: true,
    },

    articleId: {
      type: String,
      default: "",
      trim: true,
    },
    articleUrl: {
      type: String,
      default: "",
      trim: true,
    },
    doi: {
      type: String,
      default: "",
      trim: true,
    },
    publishDate: {
      type: String,
      default: "",
      trim: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    downloads: {
      type: Number,
      default: 0,
    },
    citations: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["published", "inPress"],
      default: "published",
    },
    articleType: {
      type: String,
      default: "Research Article",
      trim: true,
    },
    accessType: {
      type: String,
      default: "Open Access",
      trim: true,
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
  { timestamps: true }
);

ArticleSchema.index({ issueId: 1, slug: 1 }, { unique: true });

const Article = mongoose.model<IArticle>("Article", ArticleSchema);

export default Article;