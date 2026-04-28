import { Request, Response } from "express";
import Article from "../models/Article.model";
import Issue from "../models/Issue.model";
import Page from "../models/Page.model";
import EditorialBoard from "../models/EditorialBoard.model";
import CallForPaper from "../models/CallForPaper.model";

const escapeRegex = (text: string) => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const publicSearch = async (req: Request, res: Response) => {
  try {
    const query = String(req.query.q || "").trim();

    if (!query) {
      return res.status(200).json({
        success: true,
        data: {
          articles: [],
          issues: [],
          pages: [],
          editorialMembers: [],
          callForPapers: [],
        },
      });
    }

    const safeQuery = escapeRegex(query);
    const regex = new RegExp(safeQuery, "i");

    const articles = await Article.find({
      isPublished: true,
      $or: [
        { title: regex },
        { authors: regex },
        { abstract: regex },
        { keywords: regex },
        { pages: regex },
        { doi: regex },
        { articleId: regex },
        { articleType: regex },
        { accessType: regex },
        { publishDate: regex },
      ],
    })
      .populate("issueId", "title slug volume issueNumber publishDateLabel issn category")
      .sort({ createdAt: -1 })
      .limit(30);

    const issues = await Issue.find({
      isPublished: true,
      $or: [
        { title: regex },
        { slug: regex },
        { category: regex },
        { issn: regex },
        { volume: regex },
        { issueNumber: regex },
        { publishDateLabel: regex },
      ],
    })
      .sort({ order: 1, createdAt: -1 })
      .limit(30);

    const pages = await Page.find({
      isPublished: true,
      $or: [
        { title: regex },
        { slug: regex },
        { group: regex },
        { subtitle: regex },
        { shortDescription: regex },
        { metaTitle: regex },
        { metaDescription: regex },
        { buttonLabel: regex },
        { buttonUrl: regex },
        { "contentBlocks.title": regex },
        { "contentBlocks.content": regex },
        { "contentBlocks.items": regex },
        { "contentBlocks.buttonLabel": regex },
        { "contentBlocks.buttonUrl": regex },
      ],
    })
      .sort({ group: 1, order: 1 })
      .limit(30);

    const editorialMembers = await EditorialBoard.find({
      isActive: true,
      $or: [
        { category: regex },
        { editorialArea: regex },
        { name: regex },
        { designation: regex },
        { institution: regex },
        { department: regex },
        { expertise: regex },
        { bio: regex },
        { email: regex },
      ],
    })
      .sort({ category: 1, editorialArea: 1, order: 1 })
      .limit(30);

    const callForPapers = await CallForPaper.find({
      isPublished: true,
      $or: [
        { title: regex },
        { subtitle: regex },
        { description: regex },
        { submissionButtonLabel: regex },
        { submissionButtonLink: regex },
        { contactEmail: regex },
        { contactPhone: regex },
        { publisherInfo: regex },
        { "importantDates.label": regex },
        { "importantDates.date": regex },
        { "topics.title": regex },
        { "topics.description": regex },
        { "instructions.text": regex },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(10);

    return res.status(200).json({
      success: true,
      data: {
        articles,
        issues,
        pages,
        editorialMembers,
        callForPapers,
      },
    });
  } catch (error) {
    console.error("publicSearch error:", error);

    return res.status(500).json({
      success: false,
      message: "Search failed",
    });
  }
};