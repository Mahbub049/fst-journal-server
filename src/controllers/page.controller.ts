import { Request, Response } from "express";
import Page from "../models/Page.model";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware";

const createSlug = (text: string) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const getPublicPages = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { group } = req.query;

    const filter: Record<string, any> = {
      isPublished: true,
    };

    if (group) {
      filter.group = group;
    }

    const pages = await Page.find(filter)
      .sort({ group: 1, order: 1, title: 1 })
      .select("-__v");

    res.status(200).json({
      success: true,
      pages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch pages.",
    });
  }
};

export const getPublicPageByGroupAndSlug = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { group, slug } = req.params;

    const page = await Page.findOne({
      group,
      slug,
      isPublished: true,
    }).select("-__v");

    if (!page) {
      res.status(404).json({
        success: false,
        message: "Page not found.",
      });
      return;
    }

    const sortedBlocks = [...page.contentBlocks].sort(
      (a, b) => a.order - b.order
    );

    const pageObject = page.toObject();

    res.status(200).json({
      success: true,
      page: {
        ...pageObject,
        contentBlocks: sortedBlocks,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch page.",
    });
  }
};

export const getAdminPages = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { group } = req.query;

    const filter: Record<string, any> = {};

    if (group) {
      filter.group = group;
    }

    const pages = await Page.find(filter).sort({
      group: 1,
      order: 1,
      title: 1,
    });

    res.status(200).json({
      success: true,
      pages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch admin pages.",
    });
  }
};

export const getAdminPageById = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const page = await Page.findById(req.params.id);

    if (!page) {
      res.status(404).json({
        success: false,
        message: "Page not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      page,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch page.",
    });
  }
};

export const createAdminPage = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      title,
      slug,
      group,
      subtitle,
      bannerImage,
      shortDescription,
      contentBlocks,
      buttonLabel,
      buttonUrl,
      metaTitle,
      metaDescription,
      order,
      isPublished,
    } = req.body;

    if (!title || !group) {
      res.status(400).json({
        success: false,
        message: "Title and group are required.",
      });
      return;
    }

    const finalSlug = slug ? createSlug(slug) : createSlug(title);

    const existingPage = await Page.findOne({
      group,
      slug: finalSlug,
    });

    if (existingPage) {
      res.status(409).json({
        success: false,
        message: "A page with this group and slug already exists.",
      });
      return;
    }

    const page = await Page.create({
      title,
      slug: finalSlug,
      group,
      subtitle,
      bannerImage,
      shortDescription,
      contentBlocks: contentBlocks || [],
      buttonLabel,
      buttonUrl,
      metaTitle,
      metaDescription,
      order: order || 0,
      isPublished: isPublished ?? true,
    });

    res.status(201).json({
      success: true,
      message: "Page created successfully.",
      page,
    });
  } catch (error) {
    console.error("Create page error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create page.",
    });
  }
};

export const updateAdminPage = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      title,
      slug,
      group,
      subtitle,
      bannerImage,
      shortDescription,
      contentBlocks,
      buttonLabel,
      buttonUrl,
      metaTitle,
      metaDescription,
      order,
      isPublished,
    } = req.body;

    const page = await Page.findById(req.params.id);

    if (!page) {
      res.status(404).json({
        success: false,
        message: "Page not found.",
      });
      return;
    }

    const finalGroup = group || page.group;
    const finalSlug = slug ? createSlug(slug) : page.slug;

    const duplicatePage = await Page.findOne({
      _id: { $ne: page._id },
      group: finalGroup,
      slug: finalSlug,
    });

    if (duplicatePage) {
      res.status(409).json({
        success: false,
        message: "Another page with this group and slug already exists.",
      });
      return;
    }

    page.title = title ?? page.title;
    page.slug = finalSlug;
    page.group = finalGroup;
    page.subtitle = subtitle ?? page.subtitle;
    page.bannerImage = bannerImage ?? page.bannerImage;
    page.shortDescription = shortDescription ?? page.shortDescription;
    page.contentBlocks = contentBlocks ?? page.contentBlocks;
    page.buttonLabel = buttonLabel ?? page.buttonLabel;
    page.buttonUrl = buttonUrl ?? page.buttonUrl;
    page.metaTitle = metaTitle ?? page.metaTitle;
    page.metaDescription = metaDescription ?? page.metaDescription;
    page.order = order ?? page.order;
    page.isPublished = isPublished ?? page.isPublished;

    await page.save();

    res.status(200).json({
      success: true,
      message: "Page updated successfully.",
      page,
    });
  } catch (error) {
    console.error("Update page error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update page.",
    });
  }
};

export const deleteAdminPage = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const page = await Page.findById(req.params.id);

    if (!page) {
      res.status(404).json({
        success: false,
        message: "Page not found.",
      });
      return;
    }

    await page.deleteOne();

    res.status(200).json({
      success: true,
      message: "Page deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete page.",
    });
  }
};