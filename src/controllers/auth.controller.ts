import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Admin from "../models/Admin.model";
import { env } from "../config/env";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware";
import {
  sendAdminLoginOtpEmail,
  sendAdminPasswordResetOtpEmail,
} from "../services/brevoEmail.service";

const createToken = (adminId: string, role: "super_admin" | "admin") => {
  return jwt.sign(
    {
      id: adminId,
      role,
    },
    env.jwtSecret,
    {
      expiresIn: "7d",
    }
  );
};

const createOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

const hashOtp = (otp: string) => {
  return crypto.createHash("sha256").update(otp).digest("hex");
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const getCooldownWaitSeconds = (lastSentAt?: Date) => {
  if (!lastSentAt) {
    return 0;
  }

  const cooldownMs = env.brevo.otpCooldownSeconds * 1000;
  const elapsedMs = Date.now() - lastSentAt.getTime();

  if (elapsedMs >= cooldownMs) {
    return 0;
  }

  return Math.ceil((cooldownMs - elapsedMs) / 1000);
};

export const loginAdmin = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
      return;
    }

    const normalizedEmail = normalizeEmail(String(email));

    const admin = await Admin.findOne({ email: normalizedEmail }).select(
      "+password +loginOtpHash +loginOtpExpiresAt +loginOtpAttempts +loginOtpLastSentAt"
    );

    if (!admin) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    if (!admin.isActive) {
      res.status(403).json({
        success: false,
        message: "This admin account is inactive.",
      });
      return;
    }

    const isMatch = await admin.comparePassword(String(password));

    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    const waitSeconds = getCooldownWaitSeconds(admin.loginOtpLastSentAt);

    if (waitSeconds > 0) {
      res.status(429).json({
        success: false,
        message: `Please wait ${waitSeconds} seconds before requesting another OTP.`,
      });
      return;
    }

    const now = new Date();
    const otp = createOtp();

    admin.loginOtpHash = hashOtp(otp);
    admin.loginOtpExpiresAt = new Date(
      now.getTime() + env.brevo.otpExpiryMinutes * 60 * 1000
    );
    admin.loginOtpAttempts = 0;
    admin.loginOtpLastSentAt = now;

    await admin.save();

    await sendAdminLoginOtpEmail({
      to: admin.email,
      name: admin.name,
      otp,
      expiryMinutes: env.brevo.otpExpiryMinutes,
    });

    res.status(200).json({
      success: true,
      requiresOtp: true,
      message: "OTP has been sent to the admin email.",
      email: admin.email,
      expiresInMinutes: env.brevo.otpExpiryMinutes,
    });
  } catch (error) {
    console.error("Admin login OTP error:", error);

    res.status(500).json({
      success: false,
      message:
        "Login verification could not be started. Please check Brevo configuration.",
    });
  }
};

export const verifyAdminOtp = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({
        success: false,
        message: "Email and OTP are required.",
      });
      return;
    }

    const normalizedEmail = normalizeEmail(String(email));
    const cleanOtp = String(otp).trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      res.status(400).json({
        success: false,
        message: "OTP must be a 6-digit code.",
      });
      return;
    }

    const admin = await Admin.findOne({ email: normalizedEmail }).select(
      "+loginOtpHash +loginOtpExpiresAt +loginOtpAttempts"
    );

    if (!admin || !admin.isActive) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired OTP.",
      });
      return;
    }

    if (!admin.loginOtpHash || !admin.loginOtpExpiresAt) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired OTP.",
      });
      return;
    }

    if (admin.loginOtpExpiresAt.getTime() < Date.now()) {
      admin.loginOtpHash = undefined;
      admin.loginOtpExpiresAt = undefined;
      admin.loginOtpAttempts = 0;
      await admin.save();

      res.status(401).json({
        success: false,
        message: "OTP has expired. Please login again.",
      });
      return;
    }

    if (admin.loginOtpAttempts >= env.brevo.otpMaxAttempts) {
      admin.loginOtpHash = undefined;
      admin.loginOtpExpiresAt = undefined;
      admin.loginOtpAttempts = 0;
      await admin.save();

      res.status(429).json({
        success: false,
        message: "Too many incorrect OTP attempts. Please login again.",
      });
      return;
    }

    const isOtpValid = hashOtp(cleanOtp) === admin.loginOtpHash;

    if (!isOtpValid) {
      admin.loginOtpAttempts += 1;
      await admin.save();

      res.status(401).json({
        success: false,
        message: "Invalid OTP.",
      });
      return;
    }

    admin.loginOtpHash = undefined;
    admin.loginOtpExpiresAt = undefined;
    admin.loginOtpAttempts = 0;
    await admin.save();

    const token = createToken(String(admin._id), admin.role);

    res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      admin: {
        id: String(admin._id),
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Admin OTP verification error:", error);

    res.status(500).json({
      success: false,
      message: "OTP verification failed.",
    });
  }
};

export const requestAdminPasswordReset = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: "Email address is required.",
      });
      return;
    }

    const normalizedEmail = normalizeEmail(String(email));

    const admin = await Admin.findOne({ email: normalizedEmail }).select(
      "+resetOtpHash +resetOtpExpiresAt +resetOtpAttempts +resetOtpLastSentAt"
    );

    if (!admin) {
      res.status(404).json({
        success: false,
        message: "No admin account was found with this email address.",
      });
      return;
    }

    if (!admin.isActive) {
      res.status(403).json({
        success: false,
        message: "This admin account is inactive.",
      });
      return;
    }

    const waitSeconds = getCooldownWaitSeconds(admin.resetOtpLastSentAt);

    if (waitSeconds > 0) {
      res.status(429).json({
        success: false,
        message: `Please wait ${waitSeconds} seconds before requesting another reset OTP.`,
      });
      return;
    }

    const now = new Date();
    const otp = createOtp();

    admin.resetOtpHash = hashOtp(otp);
    admin.resetOtpExpiresAt = new Date(
      now.getTime() + env.brevo.otpExpiryMinutes * 60 * 1000
    );
    admin.resetOtpAttempts = 0;
    admin.resetOtpLastSentAt = now;

    await admin.save();

    await sendAdminPasswordResetOtpEmail({
      to: admin.email,
      name: admin.name,
      otp,
      expiryMinutes: env.brevo.otpExpiryMinutes,
    });

    res.status(200).json({
      success: true,
      requiresOtp: true,
      message: "Password reset OTP has been sent to the admin email.",
      email: admin.email,
      expiresInMinutes: env.brevo.otpExpiryMinutes,
    });
  } catch (error) {
    console.error("Admin password reset OTP error:", error);

    res.status(500).json({
      success: false,
      message:
        "Password reset verification could not be started. Please check Brevo configuration.",
    });
  }
};

export const resetAdminPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      res.status(400).json({
        success: false,
        message: "Email, OTP, and new password are required.",
      });
      return;
    }

    const normalizedEmail = normalizeEmail(String(email));
    const cleanOtp = String(otp).trim();
    const cleanPassword = String(newPassword);

    if (!/^\d{6}$/.test(cleanOtp)) {
      res.status(400).json({
        success: false,
        message: "OTP must be a 6-digit code.",
      });
      return;
    }

    if (cleanPassword.length < 6) {
      res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long.",
      });
      return;
    }

    const admin = await Admin.findOne({ email: normalizedEmail }).select(
      "+resetOtpHash +resetOtpExpiresAt +resetOtpAttempts +password"
    );

    if (!admin || !admin.isActive) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired password reset OTP.",
      });
      return;
    }

    if (!admin.resetOtpHash || !admin.resetOtpExpiresAt) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired password reset OTP.",
      });
      return;
    }

    if (admin.resetOtpExpiresAt.getTime() < Date.now()) {
      admin.resetOtpHash = undefined;
      admin.resetOtpExpiresAt = undefined;
      admin.resetOtpAttempts = 0;
      await admin.save();

      res.status(401).json({
        success: false,
        message: "Password reset OTP has expired. Please request a new one.",
      });
      return;
    }

    if (admin.resetOtpAttempts >= env.brevo.otpMaxAttempts) {
      admin.resetOtpHash = undefined;
      admin.resetOtpExpiresAt = undefined;
      admin.resetOtpAttempts = 0;
      await admin.save();

      res.status(429).json({
        success: false,
        message:
          "Too many incorrect OTP attempts. Please request a new reset OTP.",
      });
      return;
    }

    const isOtpValid = hashOtp(cleanOtp) === admin.resetOtpHash;

    if (!isOtpValid) {
      admin.resetOtpAttempts += 1;
      await admin.save();

      res.status(401).json({
        success: false,
        message: "Invalid password reset OTP.",
      });
      return;
    }

    admin.password = cleanPassword;
    admin.resetOtpHash = undefined;
    admin.resetOtpExpiresAt = undefined;
    admin.resetOtpAttempts = 0;
    admin.loginOtpHash = undefined;
    admin.loginOtpExpiresAt = undefined;
    admin.loginOtpAttempts = 0;

    await admin.save();

    res.status(200).json({
      success: true,
      message: "Password has been reset successfully. Please login again.",
    });
  } catch (error) {
    console.error("Admin password reset error:", error);

    res.status(500).json({
      success: false,
      message: "Password reset failed.",
    });
  }
};

export const getAdminProfile = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  res.status(200).json({
    success: true,
    admin: req.admin,
  });
};
