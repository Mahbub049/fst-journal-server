import mongoose from "mongoose";
import { env } from "./env";

export const connectDB = async () => {
  try {
    await mongoose.connect(env.mongoUri);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};