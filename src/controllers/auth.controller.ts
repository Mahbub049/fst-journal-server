import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Admin from "../models/Admin.model";
import { env } from "../config/env";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware";
import { sendAdminLoginOtpEmail } from "../services/brevoEmail.service";

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

    const now = new Date();
    const cooldownMs = env.brevo.otpCooldownSeconds * 1000;

    if (
      admin.loginOtpLastSentAt &&
      now.getTime() - admin.loginOtpLastSentAt.getTime() < cooldownMs
    ) {
      const waitSeconds = Math.ceil(
        (cooldownMs - (now.getTime() - admin.loginOtpLastSentAt.getTime())) /
          1000
      );

      res.status(429).json({
        success: false,
        message: `Please wait ${waitSeconds} seconds before requesting another OTP.`,
      });
      return;
    }

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

export const getAdminProfile = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  res.status(200).json({
    success: true,
    admin: req.admin,
  });
};
