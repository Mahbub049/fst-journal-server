import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.model";
import { env } from "../config/env";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware";

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

    const admin = await Admin.findOne({ email }).select("+password");

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

    const isMatch = await admin.comparePassword(password);

    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

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
    res.status(500).json({
      success: false,
      message: "Login failed.",
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