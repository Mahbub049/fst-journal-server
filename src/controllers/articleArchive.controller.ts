import { Request, Response } from "express";
import type { PipelineStage } from "mongoose";
import Article from "../models/Article.model";
import Issue from "../models/Issue.model";

const tabs = ["all", "latest", "inPress", "topCited", "mostDownloaded", "mostPopular"] as const;
type Tab = (typeof tabs)[number];
const ranking: Partial<Record<Tab, Record<string, 1 | -1>>> = {
  inPress: { createdAt: -1, _id: -1 },
  topCited: { citations: -1, views: -1, downloads: -1, createdAt: -1, _id: -1 },
  mostDownloaded: { downloads: -1, views: -1, createdAt: -1, _id: -1 },
  mostPopular: { views: -1, downloads: -1, createdAt: -1, _id: -1 },
};
const fields = {
  _id: 1, issueId: 1, title: 1, slug: 1, authors: 1, pages: 1,
  publishDate: 1, articleType: 1, accessType: 1, status: 1,
  views: 1, downloads: 1, citations: 1, doi: 1, order: 1, createdAt: 1,
} as const;
const str = (value: unknown) => typeof value === "string" ? value.trim() : "";
const boundedInt = (value: unknown, fallback: number, max: number) => {
  const s = str(value);
  if (!/^\d+$/.test(s)) return fallback;
  const n = Number(s);
  return Number.isSafeInteger(n) && n > 0 ? Math.min(n, max) : fallback;
};
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getPublicArticleArchive = async (req: Request, res: Response) => {
  try {
    const rawTab = str(req.query.tab);
    const tab: Tab = tabs.includes(rawTab as Tab) ? rawTab as Tab : "all";
    const q = str(req.query.q).slice(0, 120);
    const issueSlug = str(req.query.issue).slice(0, 200);
    const requestedPage = boundedInt(req.query.page, 1, 1000000);
    const pageSize = boundedInt(req.query.pageSize, 10, 100);

    // Match the current/recent issue ordering used by the rest of the journal.
    // Only small issue metadata is read; no article abstracts or PDFs are loaded.
    const issues = await Issue.find({ isPublished: true })
      .sort({ order: 1, createdAt: -1, _id: -1 })
      .select("_id title slug volume issueNumber publishDateLabel issn category")
      .lean();
    const issueById = new Map(issues.map(issue => [String(issue._id), issue]));
    const eligible = issueSlug ? issues.filter(issue => issue.slug === issueSlug) : issues;
    const ids = eligible.map(issue => issue._id);
    const filter: Record<string, any> = { isPublished: true, issueId: { $in: ids } };
    if (tab === "inPress") filter.status = "inPress";
    else if (tab !== "all") filter.status = "published";
    if (q) {
      // Literal, case-insensitive partial-word matching; all typed words must match
      // either a title or an author. Escape regex operators supplied by visitors.
      const words = [...new Set(q.split(/\s+/u).filter(Boolean))];
      filter.$and = words.map(word => {
        const regex = new RegExp(escapeRegex(word), "i");
        return { $or: [{ title: regex }, { authors: regex }] };
      });
    }

    const sort = ranking[tab];
    // In issue order, obtain compact counts per issue, then only sort/fetch the
    // issues that actually overlap the requested page. This avoids sorting the
    // entire journal on every page change.
    const counts = !sort && ids.length > 1
      ? await Article.aggregate<{ _id: unknown; count: number }>([
          { $match: filter }, { $group: { _id: "$issueId", count: { $sum: 1 } } },
        ]).exec()
      : null;
    const total = counts
      ? counts.reduce((sum, row) => sum + row.count, 0)
      : ids.length ? await Article.countDocuments(filter).exec() : 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const skip = (page - 1) * pageSize;
    let articles: Array<Record<string, any>> = [];
    if (total > 0) {
      if (sort) {
        // Ranked lists can use the matching compound indexes.
        articles = await Article.find(filter, fields).sort(sort).skip(skip).limit(pageSize).lean();
      } else if (ids.length === 1) {
        articles = await Article.find(filter, fields)
          .sort({ order: 1, createdAt: 1, _id: 1 }).skip(skip).limit(pageSize).lean();
      } else {
        const countByIssue = new Map(counts?.map(row => [String(row._id), row.count]));
        let offset = skip;
        let remaining = pageSize;
        const pageIds: typeof ids = [];
        let localSkip = 0;
        for (const id of ids) {
          const count = countByIssue.get(String(id)) ?? 0;
          if (offset >= count) { offset -= count; continue; }
          if (!pageIds.length) localSkip = offset;
          pageIds.push(id);
          remaining -= count - offset;
          offset = 0;
          if (remaining <= 0) break;
        }
        // Sort by the issue's existing editorial display order, then by article
        // order within each issue. Do not fetch all articles into Node/browser.
        const pipeline: PipelineStage[] = [
          { $match: { ...filter, issueId: { $in: pageIds } } },
          { $project: fields },
          { $addFields: { issueRank: { $indexOfArray: [pageIds, "$issueId"] } } },
          { $sort: { issueRank: 1, order: 1, createdAt: 1, _id: 1 } },
          { $skip: localSkip },
          { $limit: pageSize },
          { $project: { issueRank: 0 } },
        ];
        articles = await Article.aggregate(pipeline).allowDiskUse(true).exec();
      }
    }
    res.set("Cache-Control", "no-store");
    return res.json({ success: true, data: {
      articles: articles.map(article => ({ ...article, issueId: issueById.get(String(article.issueId)) })),
      issues, total, totalPages, page, pageSize,
    } });
  } catch (error) {
    console.error("getPublicArticleArchive error:", error);
    return res.status(500).json({ success: false, message: "Failed to load articles." });
  }
};
