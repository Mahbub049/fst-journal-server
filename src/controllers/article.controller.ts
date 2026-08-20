import { Response } from "express";
import Article from "../models/Article.model";
import Issue from "../models/Issue.model";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware";
import {
  syncAllArticleCitations,
  syncArticleCitationById,
} from "../services/citationSync.service";
import { detectAllowedUploadMimeType } from "../utils/fileSignature";
import { extractArticlePdfMetadata } from "../utils/articlePdfMetadata";
import { buildIssueArticleFolderName } from "../utils/issueStorage";
import {
  ArticlePdfCommit,
  ArticlePdfMove,
  cleanupUnreferencedLocalArticlePdfs,
  commitTemporaryArticlePdf,
  createTemporaryArticlePdf,
  deleteLocalArticlePdfByUrl,
  discardTemporaryArticlePdf,
  finalizeArticlePdfCommit,
  finalizeArticlePdfMove,
  isTemporaryArticlePdfUrl,
  moveLocalArticlePdfToIssue,
  resolveLocalArticlePdfPath,
  rollbackArticlePdfCommit,
  rollbackArticlePdfMove,
} from "../utils/articleStorage";

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
    citationSyncEnabled: body.citationSyncEnabled ?? true,
    citationSource: body.citationSource || "manual",
    citationSourceId: body.citationSourceId || "",
    citationSyncStatus: body.citationSyncStatus || "idle",
    citationSyncMessage: body.citationSyncMessage || "",

    status: body.status || "published",
    articleType: body.articleType || "Research Article",
    accessType: body.accessType || "Open Access",

    order: Number(body.order || 0),
    isPublished: body.isPublished ?? true,
  };
};

const cleanupArticlePdfStorage = async () => {
  try {
    const [articleRefs, activeIssues] = await Promise.all([
      Article.find({}).select("pdfUrl"),
      Issue.find({}).select("volume issueNumber"),
    ]);

    await cleanupUnreferencedLocalArticlePdfs({
      referencedPdfUrls: articleRefs
        .map((article) => String(article.pdfUrl || "").trim())
        .filter(Boolean),
      activeIssueFolders: activeIssues.map((issue) =>
        buildIssueArticleFolderName(issue)
      ),
    });
  } catch (error) {
    console.warn("Article PDF storage cleanup failed:", error);
  }
};

export const getAdminArticles = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Opening the admin article list also removes old test/orphan PDFs that
    // are no longer referenced by any saved article.
    await cleanupArticlePdfStorage();

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

    if (detectAllowedUploadMimeType(file.buffer) !== "application/pdf") {
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

    const previousTempUrl = String(req.body.previousTempUrl || "").trim();

    let extractedMetadata = {
      title: "",
      authors: [] as string[],
      abstract: "",
      keywords: [] as string[],
      pages: "",
      doi: "",
      pageCount: 0,
      detectedFields: [] as string[],
      warning:
        "PDF selected successfully, but metadata could not be detected automatically. Please fill the article fields manually.",
    };

    try {
      extractedMetadata = await extractArticlePdfMetadata(file.buffer);
    } catch (metadataError) {
      console.warn("Article PDF metadata extraction failed:", metadataError);
    }

    const temporaryPdf = await createTemporaryArticlePdf(file.buffer);

    if (
      isTemporaryArticlePdfUrl(previousTempUrl) &&
      previousTempUrl !== temporaryPdf.tempUrl
    ) {
      await discardTemporaryArticlePdf(previousTempUrl);
    }

    res.status(201).json({
      success: true,
      message:
        "PDF analyzed successfully. It will be saved to the issue folder only after the article is created or updated.",
      fileUrl: temporaryPdf.tempUrl,
      filename: file.originalname,
      temporary: true,
      targetFolder: `public/pdfs/articles/${buildIssueArticleFolderName(issue)}`,
      metadata: extractedMetadata,
    });
  } catch (error) {
    console.error("uploadAdminArticlePdf error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to process article PDF.",
    });
  }
};

export const discardAdminArticleTempPdf = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const tempUrl = String(req.body.tempUrl || "").trim();

    if (isTemporaryArticlePdfUrl(tempUrl)) {
      await discardTemporaryArticlePdf(tempUrl);
    }

    res.status(200).json({
      success: true,
      message: "Temporary PDF cleared.",
    });
  } catch (error) {
    console.error("discardAdminArticleTempPdf error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to clear temporary PDF.",
    });
  }
};

export const createAdminArticle = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  let pdfCommit: ArticlePdfCommit | null = null;

  try {
    const payload = normalizeArticlePayload(req.body);

    if (!payload.issueId) {
      res.status(400).json({ success: false, message: "Issue is required." });
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
        message:
          "PDF is required. Upload a local PDF or paste an external PDF link.",
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
        message:
          "Another article with this title/slug already exists in this issue.",
      });
      return;
    }

    const article = new Article({
      ...payload,
      order: 0,
    });

    if (isTemporaryArticlePdfUrl(payload.pdfUrl)) {
      pdfCommit = await commitTemporaryArticlePdf({
        tempUrl: payload.pdfUrl,
        issue,
        articleId: String(article._id),
      });
      article.pdfUrl = pdfCommit.publicUrl;
    }

    await Article.updateMany(
      { issueId: payload.issueId },
      { $inc: { order: 1 } }
    );

    try {
      await article.save();
    } catch (error) {
      await Article.updateMany(
        { issueId: payload.issueId },
        { $inc: { order: -1 } }
      );
      throw error;
    }

    if (pdfCommit) {
      await finalizeArticlePdfCommit(pdfCommit);
    }

    await cleanupArticlePdfStorage();

    res.status(201).json({
      success: true,
      message: "Article created successfully.",
      data: article,
    });
  } catch (error: any) {
    if (pdfCommit) {
      try {
        await rollbackArticlePdfCommit(pdfCommit);
      } catch (rollbackError) {
        console.error("Failed to roll back article PDF:", rollbackError);
      }
    }

    console.error("createAdminArticle error:", error);

    res.status(500).json({
      success: false,
      message: error?.message || "Failed to create article.",
    });
  }
};

export const updateAdminArticle = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  let pdfCommit: ArticlePdfCommit | null = null;
  let pdfMove: ArticlePdfMove | null = null;
  let previousPdfUrl = "";
  let articleSaved = false;
  let shiftedNextIssueOrders = false;
  let nextIssueIdForRollback = "";

  try {
    const article = await Article.findById(req.params.id);

    if (!article) {
      res.status(404).json({
        success: false,
        message: "Article not found.",
      });
      return;
    }

    previousPdfUrl = String(article.pdfUrl || "").trim();
    const payload = normalizeArticlePayload(req.body);

    if (!payload.issueId) {
      res.status(400).json({ success: false, message: "Issue is required." });
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
        message:
          "PDF is required. Upload a local PDF or paste an external PDF link.",
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
        message:
          "Another article with this title/slug already exists in this issue.",
      });
      return;
    }

    const previousIssueId = String(article.issueId);
    const nextIssueId = String(payload.issueId);

    if (isTemporaryArticlePdfUrl(payload.pdfUrl)) {
      pdfCommit = await commitTemporaryArticlePdf({
        tempUrl: payload.pdfUrl,
        issue,
        articleId: String(article._id),
      });
      payload.pdfUrl = pdfCommit.publicUrl;
    } else if (previousIssueId !== nextIssueId) {
      const previousLocalPath = resolveLocalArticlePdfPath(previousPdfUrl);
      const requestedLocalPath = resolveLocalArticlePdfPath(payload.pdfUrl);

      // If the issue changes but the PDF itself was not replaced, move the
      // existing local file into the new issue's canonical folder as well.
      if (
        previousLocalPath &&
        requestedLocalPath &&
        previousLocalPath === requestedLocalPath
      ) {
        pdfMove = await moveLocalArticlePdfToIssue({
          pdfUrl: previousPdfUrl,
          issue,
          articleId: String(article._id),
        });

        if (pdfMove) {
          payload.pdfUrl = pdfMove.publicUrl;
        }
      }
    }

    if (previousIssueId !== nextIssueId) {
      await Article.updateMany(
        {
          issueId: payload.issueId,
          _id: { $ne: article._id },
        },
        { $inc: { order: 1 } }
      );

      shiftedNextIssueOrders = true;
      nextIssueIdForRollback = nextIssueId;
      payload.order = 0;
    }

    article.set(payload);
    await article.save();
    articleSaved = true;

    // Once the article is saved, file cleanup is best-effort. A cleanup error
    // must not roll the file back while the database points to the new path.
    if (pdfCommit) {
      try {
        await finalizeArticlePdfCommit(pdfCommit);
      } catch (cleanupError) {
        console.warn("Article PDF backup cleanup failed:", cleanupError);
      }
    }

    if (pdfMove) {
      try {
        await finalizeArticlePdfMove(pdfMove);
      } catch (cleanupError) {
        console.warn("Moved article PDF backup cleanup failed:", cleanupError);
      }
    }

    const nextPdfUrl = String(article.pdfUrl || "").trim();
    if (
      previousPdfUrl &&
      previousPdfUrl !== nextPdfUrl &&
      !pdfMove
    ) {
      try {
        await deleteLocalArticlePdfByUrl(previousPdfUrl);
      } catch (cleanupError) {
        console.warn("Previous article PDF cleanup failed:", cleanupError);
      }
    }

    await cleanupArticlePdfStorage();

    res.status(200).json({
      success: true,
      message: "Article updated successfully.",
      data: article,
    });
  } catch (error: any) {
    if (!articleSaved) {
      if (pdfCommit) {
        try {
          await rollbackArticlePdfCommit(pdfCommit);
        } catch (rollbackError) {
          console.error("Failed to roll back article PDF:", rollbackError);
        }
      }

      if (pdfMove) {
        try {
          await rollbackArticlePdfMove(pdfMove);
        } catch (rollbackError) {
          console.error("Failed to roll back moved article PDF:", rollbackError);
        }
      }

      if (shiftedNextIssueOrders && nextIssueIdForRollback) {
        try {
          await Article.updateMany(
            { issueId: nextIssueIdForRollback },
            { $inc: { order: -1 } }
          );
        } catch (rollbackError) {
          console.error("Failed to restore article ordering:", rollbackError);
        }
      }
    }

    console.error("updateAdminArticle error:", error);

    res.status(500).json({
      success: false,
      message: error?.message || "Failed to update article.",
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
    const uniqueArticleIds: string[] = Array.from(
      new Set(articleIds.map((id: any) => String(id)))
    );

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

export const syncAdminArticleCitation = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const articleId = String(req.params.id);
    const result = await syncArticleCitationById(articleId);
    const article = await Article.findById(articleId).populate(
      "issueId",
      "title slug volume issueNumber publishDateLabel"
    );

    res.status(200).json({
      success: true,
      message: result.message,
      data: article,
      sync: result,
    });
  } catch (error: any) {
    console.error("syncAdminArticleCitation error:", error);

    res.status(500).json({
      success: false,
      message: error?.message || "Failed to sync article citation.",
    });
  }
};

export const syncAdminAllArticleCitations = async (
  _req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const summary = await syncAllArticleCitations();
    const articles = await Article.find({})
      .populate("issueId", "title slug volume issueNumber publishDateLabel")
      .sort({ order: 1, createdAt: 1 });

    res.status(200).json({
      success: true,
      message: `Citation sync completed for ${summary.total} article(s).`,
      data: articles,
      sync: summary,
    });
  } catch (error: any) {
    console.error("syncAdminAllArticleCitations error:", error);

    res.status(500).json({
      success: false,
      message: error?.message || "Failed to sync citation counts.",
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

    const pdfUrl = String(article.pdfUrl || "").trim();

    await article.deleteOne();

    if (pdfUrl) {
      try {
        await deleteLocalArticlePdfByUrl(pdfUrl);
      } catch (fileError) {
        console.warn("Article deleted but local PDF cleanup failed:", fileError);
      }
    }

    await cleanupArticlePdfStorage();

    res.status(200).json({
      success: true,
      message: "Article and its local PDF were deleted successfully.",
    });
  } catch (error) {
    console.error("deleteAdminArticle error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete article.",
    });
  }
};
