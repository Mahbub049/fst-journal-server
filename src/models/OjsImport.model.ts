import mongoose, { Document, Schema } from "mongoose";

// Isolated OJS staging: metadata and private final-PDF references. No public Article/Issue writes.
export interface IOjsImport extends Document {
  sourceId: string;
  journalId: number;
  submissionId: number;
  publicationId: number;
  version: number;
  ojsStatus: "scheduled" | "published";
  locale: string;
  title: string;
  subtitle: string;
  abstract: string;
  keywords: string[];
  doi: string;
  pages: string;
  datePublished: string;
  authors: Array<{ name: string; affiliation: string; orcid: string }>;
  issue: {
    id: number;
    volume: number | null;
    number: string;
    year: number | null;
    title: string;
    published: boolean;
  } | null;
  pdfGalleys: Array<{ galleyId: number; label: string }>;
  pdfs: Array<{
    galleyId: number;
    label: string;
    sha256: string;
    fileSize: number;
    storageKey: string;
    receivedAt: Date;
  }>;
  pdfStatus: "missing" | "pending" | "partial" | "received";
  reviewStatus: "pending" | "approved" | "published" | "rejected";
  importedArticleId?: mongoose.Types.ObjectId | null;
  approvedIssueId?: mongoose.Types.ObjectId | null;
  selectedGalleyId?: number | null;
  reviewedAt?: Date | null;
  reviewedBy?: mongoose.Types.ObjectId | null;
  receivedAt: Date;
}

const OjsImportSchema = new Schema<IOjsImport>(
  {
    sourceId: { type: String, required: true, trim: true },
    journalId: { type: Number, required: true },
    submissionId: { type: Number, required: true },
    publicationId: { type: Number, required: true },
    version: { type: Number, required: true },
    ojsStatus: { type: String, required: true, enum: ["scheduled", "published"] },
    locale: { type: String, required: true },
    title: { type: String, required: true },
    subtitle: { type: String, default: "" },
    abstract: { type: String, default: "" },
    keywords: { type: [String], default: [] },
    doi: { type: String, default: "" },
    pages: { type: String, default: "" },
    datePublished: { type: String, default: "" },
    authors: {
      type: [{ name: String, affiliation: String, orcid: String, _id: false }],
      default: [],
    },
    issue: {
      type: new Schema(
        {
          id: { type: Number, required: true },
          volume: { type: Number, default: null },
          number: { type: String, default: "" },
          year: { type: Number, default: null },
          title: { type: String, default: "" },
          published: { type: Boolean, required: true },
        },
        { _id: false }
      ),
      default: null,
    },
    pdfGalleys: {
      type: [{ galleyId: { type: Number, required: true }, label: { type: String, default: "PDF" }, _id: false }],
      default: [],
    },
    pdfs: {
      type: [{
        galleyId: { type: Number, required: true },
        label: { type: String, default: "PDF" },
        sha256: { type: String, required: true },
        fileSize: { type: Number, required: true },
        storageKey: { type: String, required: true },
        receivedAt: { type: Date, required: true },
        _id: false,
      }],
      default: [],
    },
    pdfStatus: { type: String, enum: ["missing", "pending", "partial", "received"], default: "missing" },
    reviewStatus: { type: String, enum: ["pending", "approved", "published", "rejected"], default: "pending" },
    importedArticleId: { type: Schema.Types.ObjectId, ref: "Article", default: null },
    approvedIssueId: { type: Schema.Types.ObjectId, ref: "Issue", default: null },
    selectedGalleyId: { type: Number, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
    receivedAt: { type: Date, required: true },
  },
  { timestamps: true, strict: "throw" }
);

OjsImportSchema.index({ sourceId: 1, publicationId: 1 }, { unique: true });

export default mongoose.models.OjsImport ||
  mongoose.model<IOjsImport>("OjsImport", OjsImportSchema);
