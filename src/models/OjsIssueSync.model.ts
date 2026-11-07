import mongoose, { Schema, Document } from "mongoose";

/** Durable stage/receipt for an issue snapshot. Public release is performed only on finalize. */
export interface IOjsIssueSync extends Document {
  sourceId: string;
  journalId: number;
  ojsIssueId: number;
  snapshotHash: string;
  articlePublicationIds: number[];
  issue: {
    id: number;
    title: string;
    volume: number;
    number: string;
    year: number;
    datePublished: string;
    published: boolean;
  };
  state: "pending" | "complete";
  lastError: string;
  publishedCount: number;
  skippedCount: number;
  lastCompletedHash: string;
}

const OjsIssueSyncSchema = new Schema<IOjsIssueSync>({
  sourceId: { type: String, required: true, trim: true },
  journalId: { type: Number, required: true },
  ojsIssueId: { type: Number, required: true },
  snapshotHash: { type: String, required: true },
  articlePublicationIds: { type: [Number], default: [] },
  issue: {
    type: new Schema({
      id: { type: Number, required: true },
      title: { type: String, required: true },
      volume: { type: Number, required: true },
      number: { type: String, required: true },
      year: { type: Number, required: true },
      datePublished: { type: String, default: "" },
      published: { type: Boolean, required: true },
    }, { _id: false }),
    required: true,
  },
  state: { type: String, enum: ["pending", "complete"], default: "pending" },
  lastError: { type: String, default: "" },
  publishedCount: { type: Number, default: 0 },
  skippedCount: { type: Number, default: 0 },
  lastCompletedHash: { type: String, default: "" },
}, { timestamps: true });
OjsIssueSyncSchema.index({ sourceId: 1, journalId: 1, ojsIssueId: 1 }, { unique: true });
export default mongoose.models.OjsIssueSync || mongoose.model<IOjsIssueSync>("OjsIssueSync", OjsIssueSyncSchema);
