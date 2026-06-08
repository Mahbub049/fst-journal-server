import { Request, Response } from "express";
import Article from "../models/Article.model";
import Issue from "../models/Issue.model";
import Page from "../models/Page.model";
import EditorialBoard from "../models/EditorialBoard.model";
import CallForPaper from "../models/CallForPaper.model";

const escapeRegex = (text: string) => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const normalizeNumericToken = (token: string) => {
  if (!/^\d+$/.test(token)) return escapeRegex(token);

  const normalizedNumber = String(Number(token));

  return `0*${escapeRegex(normalizedNumber)}`;
};

const uniqueRegexes = (regexes: RegExp[]) => {
  const seen = new Set<string>();

  return regexes.filter((regex) => {
    const key = `${regex.source}-${regex.flags}`;
    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
};

const buildSearchRegexes = (query: string) => {
  const cleanQuery = query.trim();
  const regexes: RegExp[] = [new RegExp(escapeRegex(cleanQuery), "i")];

  const tokens = cleanQuery.split(/[\s_-]+/).filter(Boolean);

  if (tokens.length > 1) {
    const flexiblePattern = tokens.map(normalizeNumericToken).join("[\\s_-]+");
    regexes.push(new RegExp(flexiblePattern, "i"));
  }

  return uniqueRegexes(regexes);
};

const buildFieldSearch = (fields: string[], regexes: RegExp[]) => {
  return fields.flatMap((field) =>
    regexes.map((regex) => ({
      [field]: regex,
    }))
  );
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

    const searchRegexes = buildSearchRegexes(query);

    const articles = await Article.find({
      isPublished: true,
      $or: buildFieldSearch(
        [
          "title",
          "authors",
          "abstract",
          "keywords",
          "pages",
          "doi",
          "articleId",
          "articleType",
          "accessType",
          "publishDate",
        ],
        searchRegexes
      ),
    })
      .populate(
        "issueId",
        "title slug volume issueNumber publishDateLabel issn category"
      )
      .sort({ createdAt: -1 })
      .limit(30);

    const issues = await Issue.find({
      isPublished: true,
      $or: buildFieldSearch(
        [
          "title",
          "slug",
          "category",
          "issn",
          "volume",
          "issueNumber",
          "publishDateLabel",
        ],
        searchRegexes
      ),
    })
      .sort({ order: 1, createdAt: -1 })
      .limit(30);

    const pages = await Page.find({
      isPublished: true,
      $or: buildFieldSearch(
        [
          "title",
          "slug",
          "group",
          "subtitle",
          "shortDescription",
          "metaTitle",
          "metaDescription",
          "buttonLabel",
          "buttonUrl",
          "contentBlocks.title",
          "contentBlocks.content",
          "contentBlocks.items",
          "contentBlocks.buttonLabel",
          "contentBlocks.buttonUrl",
        ],
        searchRegexes
      ),
    })
      .sort({ group: 1, order: 1 })
      .limit(30);

    const editorialMembers = await EditorialBoard.find({
      isActive: true,
      $or: buildFieldSearch(
        [
          "category",
          "editorialArea",
          "name",
          "designation",
          "institution",
          "department",
          "expertise",
          "bio",
          "email",
        ],
        searchRegexes
      ),
    })
      .sort({ category: 1, editorialArea: 1, order: 1 })
      .limit(30);

    const callForPapers = await CallForPaper.find({
      isPublished: true,
      $or: buildFieldSearch(
        [
          "title",
          "subtitle",
          "description",
          "submissionButtonLabel",
          "submissionButtonLink",
          "contactEmail",
          "contactPhone",
          "publisherInfo",
          "importantDates.label",
          "importantDates.date",
          "topics.title",
          "topics.description",
          "instructions.text",
        ],
        searchRegexes
      ),
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
