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
    password: process.env.ADMIN_PASSWORD || "admin12345",
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "your_cloud_name",
    apiKey: process.env.CLOUDINARY_API_KEY || "your_api_key",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "your_api_secret",
  },
};