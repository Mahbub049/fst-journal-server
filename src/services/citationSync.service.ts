import Article, { IArticle } from "../models/Article.model";
import { env } from "../config/env";

type CitationProvider = "OpenAlex" | "Crossref";

type CitationLookupResult = {
  count: number;
  source: CitationProvider;
  sourceId?: string;
  message: string;
};

export type CitationSyncResult = {
  articleId: string;
  title: string;
  doi: string;
  previousCitations: number;
  citations: number;
  increasedBy: number;
  source: CitationProvider | "manual";
  status: "success" | "failed" | "skipped";
  message: string;
};

type JsonRecord = Record<string, any>;

const FETCH_TIMEOUT_MS = 12000;

export const normalizeDoi = (value: string) => {
  return String(value || "")
    .trim()
    .replace(/^https?:\/\/doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .replace(/^https?:\/\/dx\.doi\.org\//i, "")
    .trim();
};

const getDoiUrl = (doi: string) => `https://doi.org/${normalizeDoi(doi)}`;

const fetchJsonWithTimeout = async (url: string): Promise<JsonRecord> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": env.citationSync.mailto
          ? `JFST Citation Sync (mailto:${env.citationSync.mailto})`
          : "JFST Citation Sync",
      },
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return (await response.json()) as JsonRecord;
  } finally {
    clearTimeout(timeout);
  }
};

const getOpenAlexCitationCount = async (
  doi: string
): Promise<CitationLookupResult | null> => {
  const normalizedDoi = normalizeDoi(doi);

  if (!normalizedDoi) return null;

  const params = new URLSearchParams({
    filter: `doi:${getDoiUrl(normalizedDoi)}`,
    per_page: "1",
  });

  if (env.citationSync.mailto) {
    params.set("mailto", env.citationSync.mailto);
  }

  const data = await fetchJsonWithTimeout(
    `https://api.openalex.org/works?${params.toString()}`
  );

  const work = Array.isArray(data.results) ? data.results[0] : null;

  if (!work || typeof work.cited_by_count !== "number") {
    return null;
  }

  return {
    count: Math.max(0, Number(work.cited_by_count || 0)),
    source: "OpenAlex",
    sourceId: typeof work.id === "string" ? work.id : "",
    message: "Citation count synced from OpenAlex.",
  };
};

const getCrossrefCitationCount = async (
  doi: string
): Promise<CitationLookupResult | null> => {
  const normalizedDoi = normalizeDoi(doi);

  if (!normalizedDoi) return null;

  const data = await fetchJsonWithTimeout(
    `https://api.crossref.org/works/${encodeURIComponent(normalizedDoi)}`
  );

  const count = data?.message?.["is-referenced-by-count"];

  if (typeof count !== "number") {
    return null;
  }

  return {
    count: Math.max(0, Number(count || 0)),
    source: "Crossref",
    sourceId: normalizedDoi,
    message: "Citation count synced from Crossref.",
  };
};

const lookupCitationCount = async (
  doi: string
): Promise<CitationLookupResult | null> => {
  try {
    const openAlexResult = await getOpenAlexCitationCount(doi);

    if (openAlexResult) {
      return openAlexResult;
    }
  } catch (error) {
    console.warn("OpenAlex citation lookup failed:", error);
  }

  try {
    const crossrefResult = await getCrossrefCitationCount(doi);

    if (crossrefResult) {
      return crossrefResult;
    }
  } catch (error) {
    console.warn("Crossref citation lookup failed:", error);
  }

  return null;
};

export const syncArticleCitationByDocument = async (
  article: IArticle
): Promise<CitationSyncResult> => {
  const normalizedDoi = normalizeDoi(article.doi || "");
  const previousCitations = Number(article.citations || 0);

  if (!normalizedDoi) {
    article.citationSyncStatus = "skipped";
    article.citationSyncMessage = "Citation sync skipped because DOI is missing.";
    article.citationLastSyncedAt = new Date();
    await article.save();

    return {
      articleId: String(article._id),
      title: article.title,
      doi: "",
      previousCitations,
      citations: previousCitations,
      increasedBy: 0,
      source: article.citationSource || "manual",
      status: "skipped",
      message: article.citationSyncMessage,
    };
  }

  if (article.citationSyncEnabled === false) {
    article.citationSyncStatus = "skipped";
    article.citationSyncMessage = "Citation sync skipped because auto-sync is disabled.";
    article.citationLastSyncedAt = new Date();
    await article.save();

    return {
      articleId: String(article._id),
      title: article.title,
      doi: normalizedDoi,
      previousCitations,
      citations: previousCitations,
      increasedBy: 0,
      source: article.citationSource || "manual",
      status: "skipped",
      message: article.citationSyncMessage,
    };
  }

  const lookup = await lookupCitationCount(normalizedDoi);

  if (!lookup) {
    article.citationSyncStatus = "failed";
    article.citationSyncMessage =
      "No citation count found from OpenAlex or Crossref for this DOI.";
    article.citationLastSyncedAt = new Date();
    await article.save();

    return {
      articleId: String(article._id),
      title: article.title,
      doi: normalizedDoi,
      previousCitations,
      citations: previousCitations,
      increasedBy: 0,
      source: article.citationSource || "manual",
      status: "failed",
      message: article.citationSyncMessage,
    };
  }

  article.doi = normalizedDoi;
  article.citations = lookup.count;
  article.citationSource = lookup.source;
  article.citationSourceId = lookup.sourceId || "";
  article.citationLastSyncedAt = new Date();
  article.citationSyncStatus = "success";
  article.citationSyncMessage = lookup.message;

  await article.save();

  return {
    articleId: String(article._id),
    title: article.title,
    doi: normalizedDoi,
    previousCitations,
    citations: lookup.count,
    increasedBy: lookup.count - previousCitations,
    source: lookup.source,
    status: "success",
    message: lookup.message,
  };
};

export const syncArticleCitationById = async (articleId: string) => {
  const article = await Article.findById(articleId);

  if (!article) {
    throw new Error("Article not found.");
  }

  return syncArticleCitationByDocument(article);
};

export const syncAllArticleCitations = async () => {
  const articles = await Article.find({
    doi: { $exists: true, $ne: "" },
    citationSyncEnabled: { $ne: false },
  }).sort({ createdAt: -1 });

  const results: CitationSyncResult[] = [];

  for (const article of articles) {
    try {
      const result = await syncArticleCitationByDocument(article);
      results.push(result);
    } catch (error: any) {
      results.push({
        articleId: String(article._id),
        title: article.title,
        doi: normalizeDoi(article.doi || ""),
        previousCitations: Number(article.citations || 0),
        citations: Number(article.citations || 0),
        increasedBy: 0,
        source: article.citationSource || "manual",
        status: "failed",
        message: error?.message || "Citation sync failed.",
      });
    }
  }

  const success = results.filter((item) => item.status === "success").length;
  const failed = results.filter((item) => item.status === "failed").length;
  const skipped = results.filter((item) => item.status === "skipped").length;
  const totalIncrease = results.reduce(
    (sum, item) => sum + Math.max(0, item.increasedBy || 0),
    0
  );

  return {
    total: results.length,
    success,
    failed,
    skipped,
    totalIncrease,
    results,
  };
};
