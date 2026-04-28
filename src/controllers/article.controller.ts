import { Response } from "express";
import Article from "../models/Article.model";
import Issue from "../models/Issue.model";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware";

const createSlug = (text: string) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const normalizeStringArray = (value: any) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeArticlePayload = (body: Record<string, any>) => {
  const title = body.title || "";
  const slug = body.slug ? createSlug(body.slug) : createSlug(title);

  return {
    issueId: body.issueId,
    title,
    slug,
    authors: normalizeStringArray(body.authors),
    abstract: body.abstract || "",
    keywords: normalizeStringArray(body.keywords),
    pages: body.pages || "",
    pdfUrl: body.pdfUrl || "",

    articleId: body.articleId || "",
    articleUrl: body.articleUrl || "",
    doi: body.doi || "",
    publishDate: body.publishDate || "",

    views: Number(body.views || 0),
    downloads: Number(body.downloads || 0),
    citations: Number(body.citations || 0),

    status: body.status || "published",
    articleType: body.articleType || "Research Article",
    accessType: body.accessType || "Open Access",

    order: Number(body.order || 0),
    isPublished: body.isPublished ?? true,
  };
};

export const getAdminArticles = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { search, issueId, status, publication } = req.query;

    const filter: Record<string, any> = {};

    if (issueId && issueId !== "all") {
      filter.issueId = issueId;
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    if (publication === "published") {
      filter.isPublished = true;
    }

    if (publication === "draft") {
      filter.isPublished = false;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
        { authors: { $regex: search, $options: "i" } },
        { doi: { $regex: search, $options: "i" } },
        { articleId: { $regex: search, $options: "i" } },
      ];
    }

    const articles = await Article.find(filter)
      .populate("issueId", "title slug volume issueNumber publishDateLabel")
      .sort({ order: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: articles,
    });
  } catch (error) {
    console.error("getAdminArticles error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch articles.",
    });
  }
};

export const getAdminArticleById = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const article = await Article.findById(req.params.id).populate(
      "issueId",
      "title slug volume issueNumber publishDateLabel"
    );

    if (!article) {
      res.status(404).json({
        success: false,
        message: "Article not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: article,
    });
  } catch (error) {
    console.error("getAdminArticleById error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch article.",
    });
  }
};

export const createAdminArticle = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const payload = normalizeArticlePayload(req.body);

    if (!payload.issueId) {
      res.status(400).json({
        success: false,
        message: "Issue is required.",
      });
      return;
    }

    const issue = await Issue.findById(payload.issueId);

    if (!issue) {
      res.status(404).json({
        success: false,
        message: "Selected issue not found.",
      });
      return;
    }

    if (!payload.title.trim()) {
      res.status(400).json({
        success: false,
        message: "Article title is required.",
      });
      return;
    }

    if (!payload.slug.trim()) {
      res.status(400).json({
        success: false,
        message: "Article slug is required.",
      });
      return;
    }

    if (!payload.pdfUrl.trim()) {
      res.status(400).json({
        success: false,
        message: "PDF URL is required.",
      });
      return;
    }

    const duplicateArticle = await Article.findOne({
      issueId: payload.issueId,
      slug: payload.slug,
    });

    if (duplicateArticle) {
      res.status(409).json({
        success: false,
        message: "Another article with this slug already exists in this issue.",
      });
      return;
    }

    const article = await Article.create(payload);

    res.status(201).json({
      success: true,
      message: "Article created successfully.",
      data: article,
    });
  } catch (error) {
    console.error("createAdminArticle error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create article.",
    });
  }
};

export const updateAdminArticle = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const article = await Article.findById(req.params.id);

    if (!article) {
      res.status(404).json({
        success: false,
        message: "Article not found.",
      });
      return;
    }

    const payload = normalizeArticlePayload(req.body);

    if (!payload.issueId) {
      res.status(400).json({
        success: false,
        message: "Issue is required.",
      });
      return;
    }

    const issue = await Issue.findById(payload.issueId);

    if (!issue) {
      res.status(404).json({
        success: false,
        message: "Selected issue not found.",
      });
      return;
    }

    if (!payload.title.trim()) {
      res.status(400).json({
        success: false,
        message: "Article title is required.",
      });
      return;
    }

    if (!payload.slug.trim()) {
      res.status(400).json({
        success: false,
        message: "Article slug is required.",
      });
      return;
    }

    if (!payload.pdfUrl.trim()) {
      res.status(400).json({
        success: false,
        message: "PDF URL is required.",
      });
      return;
    }

    const duplicateArticle = await Article.findOne({
      issueId: payload.issueId,
      slug: payload.slug,
      _id: { $ne: article._id },
    });

    if (duplicateArticle) {
      res.status(409).json({
        success: false,
        message: "Another article with this slug already exists in this issue.",
      });
      return;
    }

    article.set(payload);
    await article.save();

    res.status(200).json({
      success: true,
      message: "Article updated successfully.",
      data: article,
    });
  } catch (error) {
    console.error("updateAdminArticle error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update article.",
    });
  }
};

export const deleteAdminArticle = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const article = await Article.findById(req.params.id);

    if (!article) {
      res.status(404).json({
        success: false,
        message: "Article not found.",
      });
      return;
    }

    await article.deleteOne();

    res.status(200).json({
      success: true,
      message: "Article deleted successfully.",
    });
  } catch (error) {
    console.error("deleteAdminArticle error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete article.",
    });
  }
};