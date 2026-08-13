import dotenv from "dotenv";

dotenv.config();

const requiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export const env = {
  port: process.env.PORT || "5000",

  nodeEnv: process.env.NODE_ENV || "development",

  trustProxyHops: Math.max(
    0,
    Number.parseInt(process.env.TRUST_PROXY_HOPS || "0", 10) || 0
  ),

  mongoUri: requiredEnv("MONGODB_URI"),

  jwtSecret: requiredEnv("JWT_SECRET"),

  otpPepper: requiredEnv("OTP_PEPPER"),

  jwtIssuer:
    process.env.JWT_ISSUER?.trim() ||
    "bup-fst-journal",

  jwtAudience:
    process.env.JWT_AUDIENCE?.trim() ||
    "bup-fst-admin",

  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",

  clientUrls: (process.env.CLIENT_URLS || process.env.CLIENT_URL || "http://localhost:3000")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),

  admin: {
    name: process.env.ADMIN_NAME || "Admin",
    email: process.env.ADMIN_EMAIL || "admin@bupfstjournal.com",
    initialPassword: process.env.ADMIN_INITIAL_PASSWORD || "",
    sessionIdleMinutes: Number(process.env.ADMIN_SESSION_IDLE_MINUTES || 60),
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

  citationSync: {
    enabled: process.env.CITATION_SYNC_ENABLED !== "false",
    intervalHours: Number(process.env.CITATION_SYNC_INTERVAL_HOURS || 24),
    startupDelayMinutes: Number(
      process.env.CITATION_SYNC_STARTUP_DELAY_MINUTES || 10
    ),
    mailto: process.env.CITATION_SYNC_MAILTO || "",
  },
};
