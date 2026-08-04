import rateLimit from "express-rate-limit";

const commonOptions = {
  standardHeaders: true,
  legacyHeaders: false,
};

export const loginRateLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: {
    success: false,
    message:
      "Too many login attempts. Please wait 15 minutes and try again.",
  },
});

export const otpRateLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: {
    success: false,
    message:
      "Too many OTP attempts. Please wait 15 minutes and try again.",
  },
});

export const passwordResetRateLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: {
    success: false,
    message:
      "Too many password-reset requests. Please wait before trying again.",
  },
});