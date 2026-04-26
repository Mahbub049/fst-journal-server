import { Request, Response } from "express";
import Issue from "../models/Issue.model";

export const getRecentIssues = async (_req: Request, res: Response) => {
  try {
    const issues = await Issue.find({
      isPublished: true,
      isRecent: true,
    })
      .sort({ order: 1, createdAt: -1 })
      .limit(4);

    res.status(200).json({
      success: true,
      data: issues,
    });
  } catch (error) {
    console.error("getRecentIssues error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch recent issues",
    });
  }
};