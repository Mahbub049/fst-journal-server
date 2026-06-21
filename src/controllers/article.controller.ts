import { Response } from "express";
import fs from "fs/promises";
import path from "path";
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

const normalizePdfUrl = (value: any) => {
  const pdfUrl = String(value || "").trim();

  if (!pdfUrl) return "";

  // If old/local uploads saved an absolute localhost backend URL,
  // keep only the public file path so it works after deployment.
  try {
    const parsedUrl = new URL(pdfUrl);

    if (
      ["localhost", "127.0.0.1", "0.0.0.0"].includes(parsedUrl.hostname) &&
      parsedUrl.pathname.startsWith("/pdfs/")
    ) {
      return parsedUrl.pathname;
    }
  } catch {
    // Not an absolute URL. Keep it as it is.
  }

  return pdfUrl;
};

const normalizeArticlePayload = (body: Record<string, any>) => {
  const title = String(body.title || "").trim();
  const slug = createSlug(title);

  return {
    issueId: body.issueId,
    title,
    slug,
    authors: normalizeStringArray(body.authors),
    abstract: body.abstract || "",
    keywords: normalizeStringArray(body.keywords),
    pages: body.pages || "",
    pdfUrl: normalizePdfUrl(body.pdfUrl),

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

const formatTwoDigitValue = (value: string) => {
  const trimmed = value.trim();
  const numericMatch = trimmed.match(/\d+/);

  if (!numericMatch) {
    return createSlug(trimmed) || "00";
  }

  return numericMatch[0].padStart(2, "0");
};

const buildIssuePdfFolderSegments = (issue: {
  volume?: string;
  issueNumber?: string;
}) => {
  const volumeSegment = `volume-${formatTwoDigitValue(String(issue.volume || ""))}`;
  const issueSegment = `issue-${formatTwoDigitValue(String(issue.issueNumber || ""))}`;

  return { volumeSegment, issueSegment };
};

const buildLocalPdfFileName = (title: string, originalName: string) => {
  const titleSlug =
    createSlug(title) || createSlug(originalName.replace(/\.pdf$/i, ""));
  const safeName = titleSlug || "article-pdf";

  return `${Date.now()}-${safeName}.pdf`;
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
      .sort({ order: 1, createdAt: 1 });

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

export const uploadAdminArticlePdf = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const file = req.file;

    if (!file) {
      res.status(400).json({
        success: false,
        message: "No PDF uploaded.",
      });
      return;
    }

    if (file.mimetype !== "application/pdf") {
      res.status(400).json({
        success: false,
        message: "Only PDF files are allowed for article upload.",
      });
      return;
    }

    const issueId = String(req.body.issueId || "").trim();

    if (!issueId) {
      res.status(400).json({
        success: false,
        message: "Please select an issue before uploading the article PDF.",
      });
      return;
    }

    const issue = await Issue.findById(issueId).select(
      "title volume issueNumber publishDateLabel"
    );

    if (!issue) {
      res.status(404).json({
        success: false,
        message: "Selected issue not found. Please refresh and try again.",
      });
      return;
    }

    const title = String(req.body.title || file.originalname || "article-pdf");
    const slug = String(req.body.slug || "");
    const filename = buildLocalPdfFileName(slug || title, file.originalname);
    const { volumeSegment, issueSegment } = buildIssuePdfFolderSegments(issue);

    const pdfDirectory = path.join(
      process.cwd(),
      "public",
      "pdfs",
      "articles",
      volumeSegment,
      issueSegment
    );
    const pdfPath = path.join(pdfDirectory, filename);

    await fs.mkdir(pdfDirectory, { recursive: true });
    await fs.writeFile(pdfPath, file.buffer);

    // Store a relative URL in the database.
    // Example: /pdfs/articles/volume-03/issue-01/article.pdf
    // This keeps links portable across localhost, VM IP, and final domain.
    const fileUrl = `/pdfs/articles/${volumeSegment}/${issueSegment}/${filename}`;

    res.status(201).json({
      success: true,
      message: "Article PDF uploaded locally successfully.",
      fileUrl,
      filename,
      folder: `public/pdfs/articles/${volumeSegment}/${issueSegment}`,
    });
  } catch (error) {
    console.error("uploadAdminArticlePdf error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to upload article PDF.",
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
        message: "Article slug could not be generated from the title.",
      });
      return;
    }

    if (!payload.pdfUrl.trim()) {
      res.status(400).json({
        success: false,
        message: "PDF URL is required. Upload a local PDF or paste an external PDF link.",
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
        message: "Another article with this title/slug already exists in this issue.",
      });
      return;
    }

    await Article.updateMany(
      { issueId: payload.issueId },
      { $inc: { order: 1 } }
    );

    const article = await Article.create({
      ...payload,
      order: 0,
    });

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
        message: "Article slug could not be generated from the title.",
      });
      return;
    }

    if (!payload.pdfUrl.trim()) {
      res.status(400).json({
        success: false,
        message: "PDF URL is required. Upload a local PDF or paste an external PDF link.",
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
        message: "Another article with this title/slug already exists in this issue.",
      });
      return;
    }

    const previousIssueId = String(article.issueId);
    const nextIssueId = String(payload.issueId);

    if (previousIssueId !== nextIssueId) {
      await Article.updateMany(
        {
          issueId: payload.issueId,
          _id: { $ne: article._id },
        },
        { $inc: { order: 1 } }
      );

      payload.order = 0;
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

export const reorderAdminArticles = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const issueId = String(req.body.issueId || "");
    const articleIds = Array.isArray(req.body.articleIds)
      ? req.body.articleIds
      : [];
    const uniqueArticleIds = [
      ...new Set(articleIds.map((id: any) => String(id))),
    ];

    if (!issueId) {
      res.status(400).json({
        success: false,
        message: "Issue is required for article ordering.",
      });
      return;
    }

    if (uniqueArticleIds.length === 0) {
      res.status(400).json({
        success: false,
        message: "Article order list is required.",
      });
      return;
    }

    const issue = await Issue.findById(issueId);

    if (!issue) {
      res.status(404).json({
        success: false,
        message: "Selected issue not found.",
      });
      return;
    }

    const existingCount = await Article.countDocuments({
      issueId,
      _id: { $in: uniqueArticleIds },
    });

    if (existingCount !== uniqueArticleIds.length) {
      res.status(400).json({
        success: false,
        message: "One or more articles in the order list were not found in this issue.",
      });
      return;
    }

    await Article.bulkWrite(
      uniqueArticleIds.map((id, index) => ({
        updateOne: {
          filter: { _id: id, issueId },
          update: { $set: { order: index } },
        },
      }))
    );

    const articles = await Article.find({ issueId })
      .populate("issueId", "title slug volume issueNumber publishDateLabel")
      .sort({ order: 1, createdAt: 1 });

    res.status(200).json({
      success: true,
      message: "Article order updated successfully.",
      data: articles,
    });
  } catch (error) {
    console.error("reorderAdminArticles error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update article order.",
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
