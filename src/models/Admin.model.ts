import mongoose, { Document, Model, Schema } from "mongoose";
import * as bcrypt from "bcryptjs";

export interface IAdmin extends Document {
  name: string;
  email: string;
  password: string;
  role: "super_admin" | "admin";
  isActive: boolean;
  loginOtpHash?: string;
  loginOtpExpiresAt?: Date;
  loginOtpAttempts: number;
  loginOtpLastSentAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const adminSchema = new Schema<IAdmin>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    role: {
      type: String,
      enum: ["super_admin", "admin"],
      default: "admin",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    loginOtpHash: {
      type: String,
      select: false,
    },

    loginOtpExpiresAt: {
      type: Date,
      select: false,
    },

    loginOtpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    loginOtpLastSentAt: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

adminSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

adminSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const Admin: Model<IAdmin> =
  mongoose.models.Admin || mongoose.model<IAdmin>("Admin", adminSchema);

export default Admin;
