import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Admin, { IAdmin } from "../models/Admin.model";
import { env } from "../config/env";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware";
import {
  sendAdminLoginOtpEmail,
  sendAdminPasswordResetOtpEmail,
} from "../services/brevoEmail.service";

const createToken = (
  adminId: string,
  role: "super_admin" | "admin",
  sessionSecret: string
) => {
  return jwt.sign(
    {
      id: adminId,
      role,
      sid: sessionSecret,
    },
    env.jwtSecret,
    {
      expiresIn: "7d",
    }
  );
};

const createSessionSecret = () => crypto.randomBytes(32).toString("hex");

const getAdminSessionExpiry = () => {
  return new Date(Date.now() + env.admin.sessionIdleMinutes * 60 * 1000);
};

const hashSessionSecret = (sessionSecret: string) => {
  return crypto.createHash("sha256").update(sessionSecret).digest("hex");
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

const sanitizeAdmin = (admin: IAdmin) => ({
  id: String(admin._id),
  _id: String(admin._id),
  name: admin.name,
  email: admin.email,
  role: admin.role,
  isActive: admin.isActive,
  mustChangePassword: admin.mustChangePassword,
  createdAt: admin.get("createdAt"),
  updatedAt: admin.get("updatedAt"),
});

const ensureSuperAdmin = (req: AdminAuthRequest, res: Response) => {
  if (req.admin?.role !== "super_admin") {
    res.status(403).json({
      success: false,
      message: "Only a super admin can manage admin access.",
    });
    return false;
  }

  return true;
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

    const sessionSecret = createSessionSecret();

    admin.loginOtpHash = undefined;
    admin.loginOtpExpiresAt = undefined;
    admin.loginOtpAttempts = 0;
    admin.activeSessionHash = hashSessionSecret(sessionSecret);
    admin.activeSessionExpiresAt = getAdminSessionExpiry();
    admin.lastActiveAt = new Date();

    await admin.save();

    const token = createToken(String(admin._id), admin.role, sessionSecret);

    res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      admin: sanitizeAdmin(admin),
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
    admin.mustChangePassword = false;
    admin.resetOtpHash = undefined;
    admin.resetOtpExpiresAt = undefined;
    admin.resetOtpAttempts = 0;
    admin.loginOtpHash = undefined;
    admin.loginOtpExpiresAt = undefined;
    admin.loginOtpAttempts = 0;
    admin.activeSessionHash = undefined;
    admin.activeSessionExpiresAt = undefined;
    admin.lastActiveAt = undefined;

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


export const logoutAdmin = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    await Admin.findByIdAndUpdate(req.admin?.id, {
      $unset: {
        activeSessionHash: "",
        activeSessionExpiresAt: "",
        lastActiveAt: "",
      },
    });

    res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    console.error("Admin logout error:", error);

    res.status(500).json({
      success: false,
      message: "Logout failed.",
    });
  }
};

export const getAdminProfile = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const admin = await Admin.findById(req.admin?.id);

    if (!admin) {
      res.status(404).json({
        success: false,
        message: "Admin profile was not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      admin: sanitizeAdmin(admin),
    });
  } catch (error) {
    console.error("Get admin profile error:", error);

    res.status(500).json({
      success: false,
      message: "Admin profile could not be loaded.",
    });
  }
};

export const updateAdminProfile = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, email } = req.body;

    const cleanName = String(name || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();

    if (!cleanName || !cleanEmail) {
      res.status(400).json({
        success: false,
        message: "Name and email are required.",
      });
      return;
    }

    const emailPattern = /^\S+@\S+\.\S+$/;

    if (!emailPattern.test(cleanEmail)) {
      res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
      return;
    }

    const duplicate = await Admin.findOne({
      email: cleanEmail,
      _id: { $ne: req.admin?.id },
    });

    if (duplicate) {
      res.status(409).json({
        success: false,
        message: "Another admin account already uses this email.",
      });
      return;
    }

    const admin = await Admin.findById(req.admin?.id);

    if (!admin) {
      res.status(404).json({
        success: false,
        message: "Admin profile was not found.",
      });
      return;
    }

    admin.name = cleanName;
    admin.email = cleanEmail;

    await admin.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      admin: sanitizeAdmin(admin),
    });
  } catch (error) {
    console.error("Update admin profile error:", error);

    res.status(500).json({
      success: false,
      message: "Profile could not be updated.",
    });
  }
};

export const changeAdminPassword = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: "Current password and new password are required.",
      });
      return;
    }

    const cleanNewPassword = String(newPassword);

    if (cleanNewPassword.length < 6) {
      res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long.",
      });
      return;
    }

    const admin = await Admin.findById(req.admin?.id).select("+password");

    if (!admin || !admin.isActive) {
      res.status(404).json({
        success: false,
        message: "Admin profile was not found.",
      });
      return;
    }

    const isCurrentPasswordValid = await admin.comparePassword(
      String(currentPassword)
    );

    if (!isCurrentPasswordValid) {
      res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
      return;
    }

    admin.password = cleanNewPassword;
    admin.mustChangePassword = false;
    admin.loginOtpHash = undefined;
    admin.loginOtpExpiresAt = undefined;
    admin.loginOtpAttempts = 0;
    admin.resetOtpHash = undefined;
    admin.resetOtpExpiresAt = undefined;
    admin.resetOtpAttempts = 0;

    await admin.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully.",
      admin: sanitizeAdmin(admin),
    });
  } catch (error) {
    console.error("Change admin password error:", error);

    res.status(500).json({
      success: false,
      message: "Password could not be changed.",
    });
  }
};

export const listAdmins = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!ensureSuperAdmin(req, res)) {
      return;
    }

    const admins = await Admin.find().sort({ role: -1, createdAt: 1 });

    res.status(200).json({
      success: true,
      admins: admins.map(sanitizeAdmin),
    });
  } catch (error) {
    console.error("List admins error:", error);

    res.status(500).json({
      success: false,
      message: "Admin accounts could not be loaded.",
    });
  }
};

export const createAdminAccount = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!ensureSuperAdmin(req, res)) {
      return;
    }

    const { name, email, temporaryPassword, role, isActive } = req.body;
    const cleanName = String(name || "").trim();
    const cleanEmail = normalizeEmail(String(email || ""));
    const cleanPassword = String(temporaryPassword || "");
    const cleanRole: "super_admin" | "admin" =
      role === "super_admin" ? "super_admin" : "admin";

    if (!cleanName || !cleanEmail || !cleanPassword) {
      res.status(400).json({
        success: false,
        message: "Name, email, and temporary password are required.",
      });
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
      return;
    }

    if (cleanPassword.length < 6) {
      res.status(400).json({
        success: false,
        message: "Temporary password must be at least 6 characters long.",
      });
      return;
    }

    const existingAdmin = await Admin.findOne({ email: cleanEmail });

    if (existingAdmin) {
      res.status(409).json({
        success: false,
        message: "An admin account already exists with this email.",
      });
      return;
    }

    const admin = await Admin.create({
      name: cleanName,
      email: cleanEmail,
      password: cleanPassword,
      role: cleanRole,
      isActive: typeof isActive === "boolean" ? isActive : true,
      mustChangePassword: true,
    });

    res.status(201).json({
      success: true,
      message:
        "Admin access created. Share the temporary password securely and ask the admin to change it after login.",
      admin: sanitizeAdmin(admin),
    });
  } catch (error) {
    console.error("Create admin account error:", error);

    res.status(500).json({
      success: false,
      message: "Admin access could not be created.",
    });
  }
};

export const updateAdminAccount = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!ensureSuperAdmin(req, res)) {
      return;
    }

    const { id } = req.params;
    const { name, email, role, isActive, temporaryPassword } = req.body;

    const admin = await Admin.findById(id).select("+password");

    if (!admin) {
      res.status(404).json({
        success: false,
        message: "Admin account was not found.",
      });
      return;
    }

    if (email !== undefined) {
      const cleanEmail = normalizeEmail(String(email));

      if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
        res.status(400).json({
          success: false,
          message: "Please enter a valid email address.",
        });
        return;
      }

      const duplicate = await Admin.findOne({
        email: cleanEmail,
        _id: { $ne: admin._id },
      });

      if (duplicate) {
        res.status(409).json({
          success: false,
          message: "Another admin account already uses this email.",
        });
        return;
      }

      admin.email = cleanEmail;
    }

    if (name !== undefined) {
      const cleanName = String(name).trim();

      if (!cleanName) {
        res.status(400).json({
          success: false,
          message: "Name cannot be empty.",
        });
        return;
      }

      admin.name = cleanName;
    }

    if (role === "super_admin" || role === "admin") {
      admin.role = role;
    }

    if (typeof isActive === "boolean") {
      if (String(admin._id) === req.admin?.id && !isActive) {
        res.status(400).json({
          success: false,
          message: "You cannot deactivate your own account.",
        });
        return;
      }

      admin.isActive = isActive;
    }

    if (temporaryPassword !== undefined && String(temporaryPassword).trim()) {
      const cleanPassword = String(temporaryPassword);

      if (cleanPassword.length < 6) {
        res.status(400).json({
          success: false,
          message: "Temporary password must be at least 6 characters long.",
        });
        return;
      }

      admin.password = cleanPassword;
      admin.mustChangePassword = true;
      admin.loginOtpHash = undefined;
      admin.loginOtpExpiresAt = undefined;
      admin.loginOtpAttempts = 0;
      admin.resetOtpHash = undefined;
      admin.resetOtpExpiresAt = undefined;
      admin.resetOtpAttempts = 0;
      admin.activeSessionHash = undefined;
      admin.activeSessionExpiresAt = undefined;
      admin.lastActiveAt = undefined;
    }

    if (typeof isActive === "boolean" && !isActive) {
      admin.activeSessionHash = undefined;
      admin.activeSessionExpiresAt = undefined;
      admin.lastActiveAt = undefined;
    }

    await admin.save();

    res.status(200).json({
      success: true,
      message: "Admin access updated successfully.",
      admin: sanitizeAdmin(admin),
    });
  } catch (error) {
    console.error("Update admin account error:", error);

    res.status(500).json({
      success: false,
      message: "Admin access could not be updated.",
    });
  }
};

export const deleteAdminAccount = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!ensureSuperAdmin(req, res)) {
      return;
    }

    const { id } = req.params;

    if (id === req.admin?.id) {
      res.status(400).json({
        success: false,
        message: "You cannot delete your own account.",
      });
      return;
    }

    const admin = await Admin.findById(id);

    if (!admin) {
      res.status(404).json({
        success: false,
        message: "Admin account was not found.",
      });
      return;
    }

    await admin.deleteOne();

    res.status(200).json({
      success: true,
      message: "Admin access removed successfully.",
    });
  } catch (error) {
    console.error("Delete admin account error:", error);

    res.status(500).json({
      success: false,
      message: "Admin access could not be removed.",
    });
  }
};
