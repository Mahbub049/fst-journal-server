import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISystemState extends Document {
  key: string;
  completedAt: Date;
}

const systemStateSchema = new Schema<ISystemState>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const SystemState: Model<ISystemState> =
  mongoose.models.SystemState ||
  mongoose.model<ISystemState>("SystemState", systemStateSchema);

export default SystemState;
