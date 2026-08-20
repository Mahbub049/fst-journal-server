import fs from "fs/promises";
import path from "path";

const createSafeSegment = (value: string) => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const formatTwoDigitIssueValue = (value: string) => {
  const trimmed = String(value || "").trim();
  const numericMatch = trimmed.match(/\d+/);

  if (!numericMatch) {
    return createSafeSegment(trimmed) || "00";
  }

  return numericMatch[0].padStart(2, "0");
};

export const buildIssueArticleFolderName = (issue: {
  volume?: string;
  issueNumber?: string;
}) => {
  const volume = formatTwoDigitIssueValue(String(issue.volume || ""));
  const issueNumber = formatTwoDigitIssueValue(String(issue.issueNumber || ""));

  return `volume-${volume}_issue-${issueNumber}`;
};

export const getIssueArticlePdfDirectory = (issue: {
  volume?: string;
  issueNumber?: string;
}) => {
  return path.join(
    process.cwd(),
    "public",
    "pdfs",
    "articles",
    buildIssueArticleFolderName(issue)
  );
};

export const ensureIssueArticlePdfDirectory = async (issue: {
  volume?: string;
  issueNumber?: string;
}) => {
  const directory = getIssueArticlePdfDirectory(issue);
  await fs.mkdir(directory, { recursive: true });
  return directory;
};

export const getIssueArticlePdfPublicFolder = (issue: {
  volume?: string;
  issueNumber?: string;
}) => {
  return `public/pdfs/articles/${buildIssueArticleFolderName(issue)}`;
};

export const removeIssueArticlePdfDirectory = async (issue: {
  volume?: string;
  issueNumber?: string;
}) => {
  const directory = getIssueArticlePdfDirectory(issue);
  await fs.rm(directory, { recursive: true, force: true });
};
