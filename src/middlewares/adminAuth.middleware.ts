import { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import Admin from "../models/Admin.model";

interface JwtPayload {
  id: string;
  role: "super_admin" | "admin";
  sid?: string;
}

export interface AdminAuthRequest extends Request {
  admin?: {
    id: string;
    name: string;
    email: string;
    role: "super_admin" | "admin";
    isActive: boolean;
    mustChangePassword: boolean;
    sessionSecret?: string;
  };
}

const hashSessionSecret = (sessionSecret: string) => {
  return crypto.createHash("sha256").update(sessionSecret).digest("hex");
};

const getAdminSessionExpiry = () => {
  return new Date(Date.now() + env.admin.sessionIdleMinutes * 60 * 1000);
};

export const protectAdmin = async (
  req: AdminAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token =
      typeof req.cookies?.admin_session === "string"
        ? req.cookies.admin_session
        : undefined;

    if (!token) {
      res.status(401).json({
        success: false,
        message:
          "Unauthorized. No session was provided.",
      });
      return;
    }

    const decoded = jwt.verify(
      token,
      env.jwtSecret,
      {
        algorithms: ["HS256"],
        issuer: env.jwtIssuer,
        audience: env.jwtAudience,
      }
    ) as JwtPayload;

    if (!decoded.sid) {
      res.status(401).json({
        success: false,
        message: "Unauthorized. Session is invalid.",
      });
      return;
    }

    const admin = await Admin.findById(decoded.id).select(
      "+activeSessionHash +activeSessionExpiresAt +lastActiveAt"
    );

    if (!admin || !admin.isActive) {
      res.status(401).json({
        success: false,
        message: "Unauthorized. Admin not found or inactive.",
      });
      return;
    }

    const sessionHash = hashSessionSecret(decoded.sid);

    if (
      !admin.activeSessionHash ||
      !admin.activeSessionExpiresAt ||
      admin.activeSessionHash !== sessionHash
    ) {
      res.status(401).json({
        success: false,
        message: "Unauthorized. Session has ended.",
      });
      return;
    }

    if (admin.activeSessionExpiresAt.getTime() < Date.now()) {
      await Admin.findByIdAndUpdate(admin._id, {
        $unset: {
          activeSessionHash: "",
          activeSessionExpiresAt: "",
          lastActiveAt: "",
        },
      });

      res.status(401).json({
        success: false,
        message: "Unauthorized. Session expired due to inactivity.",
      });
      return;
    }

    await Admin.findByIdAndUpdate(admin._id, {
      activeSessionExpiresAt: getAdminSessionExpiry(),
      lastActiveAt: new Date(),
    });

    req.admin = {
      id: String(admin._id),
      name: admin.name,
      email: admin.email,
      role: admin.role,
      isActive: admin.isActive,
      mustChangePassword: admin.mustChangePassword,
      sessionSecret: decoded.sid,
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Unauthorized. Invalid or expired session.",
    });
  }
};
