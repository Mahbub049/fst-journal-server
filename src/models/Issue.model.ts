import mongoose, { Schema, Document } from "mongoose";

export interface IIssue extends Document {
  ojsSourceId?: string;
  ojsIssueId?: number;
  ojsCoverManaged?: boolean;
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
    ojsSourceId: { type: String, trim: true, default: undefined },
    ojsIssueId: { type: Number, default: undefined },
    // When false, edits made in IJFST must not be overwritten by OJS cover sync.
    ojsCoverManaged: { type: Boolean, default: undefined },
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
      default: "Science & Technology",
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

// Manual issues have no OJS identity and are unaffected by this unique index.
IssueSchema.index({ ojsSourceId: 1, ojsIssueId: 1 }, {
  unique: true,
  partialFilterExpression: { ojsIssueId: { $type: "number" } },
});

const Issue = mongoose.model<IIssue>("Issue", IssueSchema);

export default Issue;