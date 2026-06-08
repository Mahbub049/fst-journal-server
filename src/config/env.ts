import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: process.env.PORT || "5000",

  nodeEnv: process.env.NODE_ENV || "development",

  mongoUri:
    process.env.MONGODB_URI ||
    "mongodb+srv://bupfstjournal:4fu0kRMcp9XUgidB@cluster0.h0zb1dz.mongodb.net/bupfstjournal?appName=Cluster0",

  jwtSecret:
    process.env.JWT_SECRET ||
    "b7bce970d49139b44ed3baf50298967657088c4154b120eb66ceebb09cf93ec8",

  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",

  admin: {
    name: process.env.ADMIN_NAME || "Admin",
    email: process.env.ADMIN_EMAIL || "admin@bupfstjournal.com",
    initialPassword: process.env.ADMIN_INITIAL_PASSWORD || "",
  },

  brevo: {
    apiKey: process.env.BREVO_API_KEY || "",
    senderEmail: process.env.BREVO_SENDER_EMAIL || "",
    senderName: process.env.BREVO_SENDER_NAME || "Journal of FST Admin",
    otpExpiryMinutes: Number(process.env.ADMIN_OTP_EXPIRY_MINUTES || 10),
    otpCooldownSeconds: Number(process.env.ADMIN_OTP_COOLDOWN_SECONDS || 60),
    otpMaxAttempts: Number(process.env.ADMIN_OTP_MAX_ATTEMPTS || 5),
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "your_cloud_name",
    apiKey: process.env.CLOUDINARY_API_KEY || "your_api_key",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "your_api_secret",
  },
};
