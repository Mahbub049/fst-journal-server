import { Request, Response } from "express";
import fs from "fs/promises";
import path from "path";
import Issue from "../models/Issue.model";
import Article from "../models/Article.model";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware";

const createSlug = (text: string) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const formatTwoDigitValue = (value: string) => {
  const trimmed = value.trim();
  const numericMatch = trimmed.match(/\d+/);

  if (!numericMatch) {
    return createSlug(trimmed);
  }

  return numericMatch[0].padStart(2, "0");
};

const createIssueSlug = (body: Record<string, any>) => {
  const titleSlug = createSlug(body.title || "");
  const volumeSlug = String(body.volume || "").trim()
    ? `volume-${formatTwoDigitValue(String(body.volume || ""))}`
    : "";
  const issueSlug = String(body.issueNumber || "").trim()
    ? `issue-${formatTwoDigitValue(String(body.issueNumber || ""))}`
    : "";
  const dateSlug = createSlug(body.publishDateLabel || "");

  return [titleSlug, volumeSlug, issueSlug, dateSlug].filter(Boolean).join("-");
};


const resolveLocalPdfPath = (pdfUrl: string) => {
  const cleanedUrl = pdfUrl.split("?")[0].split("#")[0];

  if (!cleanedUrl.startsWith("/pdfs/")) {
    return null;
  }

  const relativePdfPath = cleanedUrl.replace(/^\/pdfs\//, "");
  const normalizedRelativePath = path.normalize(relativePdfPath);

  if (normalizedRelativePath.startsWith("..") || path.isAbsolute(normalizedRelativePath)) {
    return null;
  }

  return path.join(process.cwd(), "public", "pdfs", normalizedRelativePath);
};

const getDownloadFileName = (articleTitle: string, pdfUrl: string) => {
  const urlFileName = pdfUrl.split("?")[0].split("#")[0].split("/").pop();
  const fallbackName = `${createSlug(articleTitle) || "article"}.pdf`;
  return urlFileName || fallbackName;
};

const normalizeIssuePayload = (body: Record<string, any>) => {
  return {
    title: body.title || "",
    slug: createIssueSlug(body),
    category: body.category || "Research Article",
    issn: body.issn || "",
    volume: body.volume || "",
    issueNumber: body.issueNumber || "",
    publishDateLabel: body.publishDateLabel || "",
    coverImage: body.coverImage || "",
    pdfUrl: body.pdfUrl || "",
    isRecent: body.isRecent ?? true,
    isPublished: body.isPublished ?? true,
  };
};

const normalizeIssueOrders = async () => {
  const orderedIssues = await Issue.find({})
    .sort({ order: 1, createdAt: -1 })
    .select("_id");

  if (orderedIssues.length === 0) return;

  await Issue.bulkWrite(
    orderedIssues.map((issue, index) => ({
      updateOne: {
        filter: { _id: issue._id },
        update: { $set: { order: index } },
      },
    }))
  );
};

/* =========================
   PUBLIC ISSUE CONTROLLERS
========================= */

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

export const getPublicIssuesAll = async (_req: Request, res: Response) => {
  try {
    const issues = await Issue.find({
      isPublished: true,
    })
      .sort({ order: 1, createdAt: -1 })
      .select("-__v");

    res.status(200).json({
      success: true,
      data: issues,
    });
  } catch (error) {
    console.error("getPublicIssuesAll error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch published issues",
    });
  }
};

export const getCurrentIssue = async (_req: Request, res: Response) => {
  try {
    let issue = await Issue.findOne({
      isPublished: true,
      isRecent: true,
    }).sort({ order: 1, createdAt: -1 });

    if (!issue) {
      issue = await Issue.findOne({
        isPublished: true,
      }).sort({ order: 1, createdAt: -1 });
    }

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: "Current issue not found",
      });
    }

    const articles = await Article.find({
      issueId: issue._id,
      isPublished: true,
    }).sort({ order: 1, createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: {
        issue,
        articles,
      },
    });
  } catch (error) {
    console.error("getCurrentIssue error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch current issue",
    });
  }
};

export const getIssueBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const issue = await Issue.findOne({
      slug,
      isPublished: true,
    });

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }

    const articles = await Article.find({
      issueId: issue._id,
      isPublished: true,
    }).sort({ order: 1, createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: {
        issue,
        articles,
      },
    });
  } catch (error) {
    console.error("getIssueBySlug error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch issue details",
    });
  }
};

export const getArticleBySlug = async (req: Request, res: Response) => {
  try {
    const { issueSlug, articleSlug } = req.params;

    const issue = await Issue.findOne({
      slug: issueSlug,
      isPublished: true,
    });

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }

    const article = await Article.findOneAndUpdate(
      {
        issueId: issue._id,
        slug: articleSlug,
        isPublished: true,
      },
      {
        $inc: { views: 1 },
      },
      {
        new: true,
      }
    );

    if (!article) {
      return res.status(404).json({
        success: false,
        message: "Article not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        issue,
        article,
      },
    });
  } catch (error) {
    console.error("getArticleBySlug error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch article details",
    });
  }
};

export const trackArticleDownload = async (req: Request, res: Response) => {
  try {
    const { issueSlug, articleSlug } = req.params;

    const issue = await Issue.findOne({
      slug: issueSlug,
      isPublished: true,
    });

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }

    const article = await Article.findOneAndUpdate(
      {
        issueId: issue._id,
        slug: articleSlug,
        isPublished: true,
      },
      {
        $inc: { downloads: 1 },
      },
      {
        new: true,
      }
    );

    if (!article) {
      return res.status(404).json({
        success: false,
        message: "Article not found",
      });
    }

    if (!article.pdfUrl?.trim()) {
      return res.status(404).json({
        success: false,
        message: "PDF not available",
      });
    }

    const rawPdfUrl = article.pdfUrl.trim();

    // External PDFs are still opened by redirecting to their original URL.
    if (/^https?:\/\//i.test(rawPdfUrl)) {
      return res.redirect(302, rawPdfUrl);
    }

    // Local uploads are served directly from the backend download endpoint.
    // This avoids redirecting the browser to /pdfs/..., which may be handled
    // by the Next.js frontend on the live domain and cause a 404.
    const localPdfPath = resolveLocalPdfPath(
      rawPdfUrl.startsWith("/") ? rawPdfUrl : `/${rawPdfUrl}`
    );

    if (!localPdfPath) {
      return res.status(400).json({
        success: false,
        message: "Invalid local PDF path",
      });
    }

    try {
      await fs.access(localPdfPath);
    } catch {
      return res.status(404).json({
        success: false,
        message: "PDF file was not found on the server",
      });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${getDownloadFileName(article.title, rawPdfUrl)}"`
    );
    res.setHeader("Cache-Control", "no-store");

    return res.sendFile(localPdfPath);
  } catch (error) {
    console.error("trackArticleDownload error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to open PDF",
    });
  }
};

export const getHomeArticles = async (req: Request, res: Response) => {
  try {
    const tab = String(req.query.tab || "latest");
    const limit = Number(req.query.limit || 6);

    const filter: any = {
      isPublished: true,
    };

    let sort: any = {
      createdAt: -1,
    };

    if (tab === "latest") {
      filter.status = "published";
      sort = {
        order: 1,
        createdAt: -1,
      };
    }

    if (tab === "inPress") {
      filter.status = "inPress";
      sort = {
        createdAt: -1,
      };
    }

    if (tab === "topCited") {
      filter.status = "published";
      sort = {
        citations: -1,
        views: -1,
        createdAt: -1,
      };
    }

    if (tab === "mostDownloaded") {
      filter.status = "published";
      sort = {
        downloads: -1,
        views: -1,
        createdAt: -1,
      };
    }

    if (tab === "mostPopular") {
      filter.status = "published";
      sort = {
        views: -1,
        downloads: -1,
        createdAt: -1,
      };
    }

    const articles = await Article.find(filter)
      .populate(
        "issueId",
        "title slug volume issueNumber publishDateLabel issn category"
      )
      .sort(sort)
      .limit(limit);

    return res.status(200).json({
      success: true,
      data: articles,
    });
  } catch (error) {
    console.error("getHomeArticles error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch homepage articles",
    });
  }
};

/* =========================
   ADMIN ISSUE CONTROLLERS
========================= */

export const getAdminIssues = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { search, status } = req.query;

    const filter: Record<string, any> = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
        { volume: { $regex: search, $options: "i" } },
        { issueNumber: { $regex: search, $options: "i" } },
      ];
    }

    if (status === "published") {
      filter.isPublished = true;
    }

    if (status === "draft") {
      filter.isPublished = false;
    }

    if (status === "recent") {
      filter.isRecent = true;
    }

    const issues = await Issue.find(filter).sort({
      order: 1,
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      data: issues,
    });
  } catch (error) {
    console.error("getAdminIssues error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch admin issues.",
    });
  }
};

export const getAdminIssueById = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      res.status(404).json({
        success: false,
        message: "Issue not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: issue,
    });
  } catch (error) {
    console.error("getAdminIssueById error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch issue.",
    });
  }
};

export const createAdminIssue = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const payload = normalizeIssuePayload(req.body);

    if (!payload.title.trim()) {
      res.status(400).json({
        success: false,
        message: "Issue title is required.",
      });
      return;
    }

    if (!payload.slug.trim()) {
      res.status(400).json({
        success: false,
        message: "Issue slug is required.",
      });
      return;
    }

    if (!payload.volume.trim()) {
      res.status(400).json({
        success: false,
        message: "Volume is required.",
      });
      return;
    }

    if (!payload.issueNumber.trim()) {
      res.status(400).json({
        success: false,
        message: "Issue number is required.",
      });
      return;
    }

    if (!payload.publishDateLabel.trim()) {
      res.status(400).json({
        success: false,
        message: "Publication date label is required.",
      });
      return;
    }

    if (!payload.coverImage.trim()) {
      res.status(400).json({
        success: false,
        message: "Cover image URL is required.",
      });
      return;
    }

    const existingIssue = await Issue.findOne({ slug: payload.slug });

    if (existingIssue) {
      res.status(409).json({
        success: false,
        message: "Another issue already exists with this slug.",
      });
      return;
    }

    await Issue.updateMany({}, { $inc: { order: 1 } });

    const issue = await Issue.create({
      ...payload,
      order: 0,
    });

    res.status(201).json({
      success: true,
      message: "Issue created successfully.",
      data: issue,
    });
  } catch (error) {
    console.error("createAdminIssue error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create issue.",
    });
  }
};

export const updateAdminIssue = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      res.status(404).json({
        success: false,
        message: "Issue not found.",
      });
      return;
    }

    const payload = normalizeIssuePayload(req.body);

    if (!payload.title.trim()) {
      res.status(400).json({
        success: false,
        message: "Issue title is required.",
      });
      return;
    }

    if (!payload.slug.trim()) {
      res.status(400).json({
        success: false,
        message: "Issue slug is required.",
      });
      return;
    }

    if (!payload.volume.trim()) {
      res.status(400).json({
        success: false,
        message: "Volume is required.",
      });
      return;
    }

    if (!payload.issueNumber.trim()) {
      res.status(400).json({
        success: false,
        message: "Issue number is required.",
      });
      return;
    }

    if (!payload.publishDateLabel.trim()) {
      res.status(400).json({
        success: false,
        message: "Publication date label is required.",
      });
      return;
    }

    if (!payload.coverImage.trim()) {
      res.status(400).json({
        success: false,
        message: "Cover image URL is required.",
      });
      return;
    }

    const duplicateIssue = await Issue.findOne({
      slug: payload.slug,
      _id: { $ne: issue._id },
    });

    if (duplicateIssue) {
      res.status(409).json({
        success: false,
        message: "Another issue already exists with this slug.",
      });
      return;
    }

    issue.set(payload);
    await issue.save();

    res.status(200).json({
      success: true,
      message: "Issue updated successfully.",
      data: issue,
    });
  } catch (error) {
    console.error("updateAdminIssue error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update issue.",
    });
  }
};


export const reorderAdminIssues = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const issueIds = Array.isArray(req.body.issueIds) ? req.body.issueIds : [];
    const uniqueIssueIds = [...new Set(issueIds.map((id: any) => String(id)))];

    if (uniqueIssueIds.length === 0) {
      res.status(400).json({
        success: false,
        message: "Issue order list is required.",
      });
      return;
    }

    const existingCount = await Issue.countDocuments({
      _id: { $in: uniqueIssueIds },
    });

    if (existingCount !== uniqueIssueIds.length) {
      res.status(400).json({
        success: false,
        message: "One or more issues in the order list were not found.",
      });
      return;
    }

    await Issue.bulkWrite(
      uniqueIssueIds.map((id, index) => ({
        updateOne: {
          filter: { _id: id },
          update: { $set: { order: index } },
        },
      }))
    );

    const issues = await Issue.find({}).sort({
      order: 1,
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      message: "Issue display order updated successfully.",
      data: issues,
    });
  } catch (error) {
    console.error("reorderAdminIssues error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update issue display order.",
    });
  }
};

export const deleteAdminIssue = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      res.status(404).json({
        success: false,
        message: "Issue not found.",
      });
      return;
    }

    const articleCount = await Article.countDocuments({
      issueId: issue._id,
    });

    if (articleCount > 0) {
      res.status(400).json({
        success: false,
        message:
          "This issue has articles. Delete or move the articles before deleting the issue.",
      });
      return;
    }

    await issue.deleteOne();
    await normalizeIssueOrders();

    res.status(200).json({
      success: true,
      message: "Issue deleted successfully.",
    });
  } catch (error) {
    console.error("deleteAdminIssue error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete issue.",
    });
  }
};
