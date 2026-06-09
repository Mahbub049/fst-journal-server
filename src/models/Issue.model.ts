import mongoose, { Schema, Document } from "mongoose";

export interface IIssue extends Document {
  title: string;
  slug: string;
  category: string;
  issn: string;
  volume: string;
  issueNumber: string;
  publishDateLabel: string;
  coverImage: string;
  pdfUrl?: string;
  isRecent: boolean;
  isPublished: boolean;
  order: number;
}

const IssueSchema = new Schema<IIssue>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    issn: {
      type: String,
      default: "",
      trim: true,
    },
    volume: {
      type: String,
      required: true,
      trim: true,
    },
    issueNumber: {
      type: String,
      required: true,
      trim: true,
    },
    publishDateLabel: {
      type: String,
      required: true,
      trim: true,
    },
    coverImage: {
      type: String,
      required: true,
      trim: true,
    },
    pdfUrl: {
      type: String,
      default: "",
      trim: true,
    },
    isRecent: {
      type: Boolean,
      default: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Issue = mongoose.model<IIssue>("Issue", IssueSchema);

export default Issue;