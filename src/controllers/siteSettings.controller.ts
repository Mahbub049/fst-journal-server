import { Request, Response } from "express";
import SiteSettings from "../models/SiteSettings.model";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware";

const normalizeSiteSettingsPayload = (body: Record<string, any>) => {
  return {
    footerDescription: body.footerDescription || "",
    contactEmail: body.contactEmail || "",
    contactPhone: body.contactPhone || "",
    address: body.address || "",
    copyrightText: body.copyrightText || "",

    journalInfoTitle: body.journalInfoTitle || "Journal Information",
    publisherName: body.publisherName || "",
    publishingModel: body.publishingModel || "",
    language: body.language || "",
    publicationFrequency: body.publicationFrequency || "",

    usefulLinks: Array.isArray(body.usefulLinks)
      ? body.usefulLinks.map((item: any, index: number) => ({
          label: item.label || "",
          url: item.url || "",
          group: item.group || "General",
          order: Number(item.order ?? index + 1),
          isActive: item.isActive ?? true,
        }))
      : [],

    socialLinks: Array.isArray(body.socialLinks)
      ? body.socialLinks.map((item: any, index: number) => ({
          platform: item.platform || "",
          url: item.url || "",
          order: Number(item.order ?? index + 1),
          isActive: item.isActive ?? true,
        }))
      : [],

    isPublished: body.isPublished ?? true,
  };
};

export const getPublicSiteSettings = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const settings = await SiteSettings.findOne({
      isPublished: true,
    }).select("-__v");

    if (!settings) {
      res.status(404).json({
        success: false,
        message: "Site settings not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("getPublicSiteSettings error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch site settings.",
    });
  }
};

export const getAdminSiteSettings = async (
  _req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    let settings = await SiteSettings.findOne();

    if (!settings) {
      settings = await SiteSettings.create({
        footerDescription:
          "BUP Faculty of Science and Technology Journal publishes scholarly research in science, technology, engineering, and interdisciplinary areas.",
        contactEmail: "",
        contactPhone: "",
        address: "Bangladesh University of Professionals, Dhaka, Bangladesh",
        copyrightText:
          "© Bangladesh University of Professionals. All rights reserved.",

        journalInfoTitle: "Journal Information",
        publisherName: "Bangladesh University of Professionals",
        publishingModel: "Open Access",
        language: "English",
        publicationFrequency: "Regular",

        usefulLinks: [
          {
            label: "About the Journal",
            url: "/about/about-the-journal",
            group: "About",
            order: 1,
            isActive: true,
          },
          {
            label: "Author Guidelines",
            url: "/for-authors/author-guidelines",
            group: "For Authors",
            order: 2,
            isActive: true,
          },
          {
            label: "Current Issue",
            url: "/issues/current",
            group: "Browse",
            order: 3,
            isActive: true,
          },
        ],

        socialLinks: [],

        isPublished: true,
      });
    }

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("getAdminSiteSettings error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch site settings.",
    });
  }
};

export const updateAdminSiteSettings = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const payload = normalizeSiteSettingsPayload(req.body);

    let settings = await SiteSettings.findOne();

    if (!settings) {
      settings = await SiteSettings.create(payload);
    } else {
      settings.set(payload);
      await settings.save();
    }

    res.status(200).json({
      success: true,
      message: "Site settings updated successfully.",
      data: settings,
    });
  } catch (error) {
    console.error("updateAdminSiteSettings error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update site settings.",
    });
  }
};