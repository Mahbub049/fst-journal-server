import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import Admin from "../models/Admin.model";

interface JwtPayload {
  id: string;
  role: "super_admin" | "admin";
}

export interface AdminAuthRequest extends Request {
  admin?: {
    id: string;
    name: string;
    email: string;
    role: "super_admin" | "admin";
  };
}

export const protectAdmin = async (
  req: AdminAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Unauthorized. No token provided.",
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, env.jwtSecret) as JwtPayload;

    const admin = await Admin.findById(decoded.id);

    if (!admin || !admin.isActive) {
      res.status(401).json({
        success: false,
        message: "Unauthorized. Admin not found or inactive.",
      });
      return;
    }

    req.admin = {
      id: String(admin._id),
      name: admin.name,
      email: admin.email,
      role: admin.role,
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Unauthorized. Invalid or expired token.",
    });
  }
};