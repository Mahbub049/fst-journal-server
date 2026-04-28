import { Request, Response } from "express";
import Homepage from "../models/Homepage.model";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware";

const normalizeHomepagePayload = (body: Record<string, any>) => {
  return {
    heroTitle: body.heroTitle || "",
    heroSubtitle: body.heroSubtitle || "",
    journalCoverImage: body.journalCoverImage || "",
    publishingModel: body.publishingModel || "",
    issnPrint: body.issnPrint || "",
    issnOnline: body.issnOnline || "",

    metrics: Array.isArray(body.metrics)
      ? body.metrics.map((item: any, index: number) => ({
          label: item.label || "",
          value: item.value || "",
          description: item.description || "",
          order: Number(item.order ?? index + 1),
          isActive: item.isActive ?? true,
        }))
      : [],

    overviewTitle: body.overviewTitle || "",
    overviewContent: body.overviewContent || "",

    journalInfoTitle: body.journalInfoTitle || "",
    journalInfoItems: Array.isArray(body.journalInfoItems)
      ? body.journalInfoItems.map((item: any, index: number) => ({
          label: item.label || "",
          value: item.value || "",
          order: Number(item.order ?? index + 1),
          isActive: item.isActive ?? true,
        }))
      : [],

    executiveEditorsTitle: body.executiveEditorsTitle || "",
    executiveEditorsSubtitle: body.executiveEditorsSubtitle || "",

    articlesSectionTitle: body.articlesSectionTitle || "",
    articlesSectionSubtitle: body.articlesSectionSubtitle || "",

    recentIssuesTitle: body.recentIssuesTitle || "",
    recentIssuesSubtitle: body.recentIssuesSubtitle || "",

    buttons: Array.isArray(body.buttons)
      ? body.buttons.map((item: any, index: number) => ({
          label: item.label || "",
          url: item.url || "",
          variant: item.variant || "primary",
          order: Number(item.order ?? index + 1),
          isActive: item.isActive ?? true,
        }))
      : [],

    isPublished: body.isPublished ?? true,
  };
};

export const getPublicHomepage = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const homepage = await Homepage.findOne({ isPublished: true }).select(
      "-__v"
    );

    if (!homepage) {
      res.status(404).json({
        success: false,
        message: "Homepage content not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      homepage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch homepage content.",
    });
  }
};

export const getAdminHomepage = async (
  _req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    let homepage = await Homepage.findOne();

    if (!homepage) {
      homepage = await Homepage.create({});
    }

    res.status(200).json({
      success: true,
      homepage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch homepage content.",
    });
  }
};

export const updateAdminHomepage = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const payload = normalizeHomepagePayload(req.body);

    if (!payload.heroTitle.trim()) {
      res.status(400).json({
        success: false,
        message: "Hero title is required.",
      });
      return;
    }

    let homepage = await Homepage.findOne();

    if (!homepage) {
      homepage = await Homepage.create(payload);
    } else {
      homepage.set(payload);
      await homepage.save();
    }

    res.status(200).json({
      success: true,
      message: "Homepage content updated successfully.",
      homepage,
    });
  } catch (error) {
    console.error("Update homepage error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update homepage content.",
    });
  }
};