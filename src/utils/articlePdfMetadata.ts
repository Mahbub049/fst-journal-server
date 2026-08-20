import pdfParse from "pdf-parse";

export type ExtractedArticlePdfMetadata = {
  title: string;
  authors: string[];
  abstract: string;
  keywords: string[];
  pages: string;
  doi: string;
  pageCount: number;
  detectedFields: string[];
  warning: string;
};

type PositionedTextItem = {
  text: string;
  x: number;
  y: number;
  width: number;
  index: number;
};

type PositionedLine = {
  y: number;
  items: PositionedTextItem[];
};

type RenderedTextLine = {
  y: number;
  text: string;
};

type RenderedPageLayout = {
  text: string;
  lines: RenderedTextLine[];
  items: PositionedTextItem[];
};

const cleanText = (value: string) => {
  return String(value || "")
    .replace(/\u0000/g, "")
    .replace(/[\t\r]+/g, " ")
    .replace(/ +/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .trim();
};

const cleanLine = (value: string) => {
  return cleanText(value)
    .replace(/^[•·▪◦‣►❖◆◇]+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
};

const splitLines = (value: string) => {
  return String(value || "")
    .split(/\n+/)
    .map(cleanLine)
    .filter(Boolean);
};

const decodeCommonPdfLigatures = (value: string) => {
  return String(value || "")
    .replace(/\uFB00/g, "ff")
    .replace(/\uFB01/g, "fi")
    .replace(/\uFB02/g, "fl")
    .replace(/\uFB03/g, "ffi")
    .replace(/\uFB04/g, "ffl");
};

const normalizeSuperscriptDigits = (value: string) => {
  return String(value || "")
    .replace(/⁰/g, "0")
    .replace(/¹/g, "1")
    .replace(/²/g, "2")
    .replace(/³/g, "3")
    .replace(/⁴/g, "4")
    .replace(/⁵/g, "5")
    .replace(/⁶/g, "6")
    .replace(/⁷/g, "7")
    .replace(/⁸/g, "8")
    .replace(/⁹/g, "9");
};

const normalizePdfText = (value: string) => {
  return cleanText(
    normalizeSuperscriptDigits(decodeCommonPdfLigatures(String(value || "")))
      .replace(/\uF07C/g, "|")
      .replace(//g, "|")
      .replace(/[│┃¦]/g, "|")
  );
};

const isGenericPdfTitle = (value: string) => {
  const normalized = cleanLine(value).toLowerCase();

  return (
    !normalized ||
    normalized === "untitled" ||
    normalized === "document" ||
    normalized.includes("microsoft word") ||
    normalized.includes("adobe indesign") ||
    normalized.endsWith(".pdf")
  );
};

const isGenericPdfAuthor = (value: string) => {
  const normalized = cleanLine(value).toLowerCase();

  return (
    !normalized ||
    /^(?:user|author|unknown|administrator|admin|owner|default|anonymous|none|null|n\/?a)$/i.test(
      normalized
    ) ||
    /microsoft(?:®)?\s*word|adobe|acrobat|libreoffice|wps office/i.test(
      normalized
    )
  );
};

const isJfstHeaderLine = (line: string) => {
  return /\bJournal\s+of\s+FST\b/i.test(line) && /\bVolume\b/i.test(line);
};

const isLikelyAffiliationLine = (line: string) => {
  return (
    /@/.test(line) ||
    /\b(university|department|faculty|school|institute|college|academy|laboratory|lab\b|bangladesh|dhaka|country|email|e-mail|orcid|corresponding|affiliation)\b/i.test(
      line
    ) ||
    /https?:\/\//i.test(line)
  );
};

const stripAuthorAffiliationMarker = (value: string) => {
  return normalizeSuperscriptDigits(cleanLine(value))
    .replace(/\s*(?:[1-9]\d?(?:\s*(?:[-–,])\s*[1-9]\d?)*)\s*[*†‡]*\s*$/g, "")
    .replace(/\s*[*†‡]+\s*$/g, "")
    .replace(/^[\s,;|]+|[\s,;|]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const looksLikeAuthorName = (value: string) => {
  const cleaned = stripAuthorAffiliationMarker(value);
  if (!cleaned || cleaned.length > 120) return false;
  if (/[:!?=]/.test(cleaned)) return false;
  if (isGenericPdfAuthor(cleaned) || isLikelyAffiliationLine(cleaned)) return false;

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 12) return false;

  const letterWords = words.filter((word) => /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(word));
  return letterWords.length === words.length;
};

/**
 * Parse an author block that has already been isolated from the title.
 *
 * This intentionally does not require affiliation numbers. Some JFST papers use
 * superscript affiliation markers, while others export them inconsistently. We
 * use markers when available as strong separators, but normal commas / "and"
 * work as well.
 */
const extractAuthorsFromBlock = (value: string) => {
  let block = normalizeSuperscriptDigits(cleanLine(value || ""))
    .replace(/^authors?\s*[:\-–—]\s*/i, "")
    .replace(/\bORCID\b[\s\S]*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!block) return [];

  // In JFST papers each printed author is followed by an affiliation marker
  // such as 1*, 1, 2 or 3. Convert those markers into unambiguous separators.
  // This also works when pdf.js extracts the superscript as a separate item.
  const withMarkerSeparators = block.replace(
    /([A-Za-zÀ-ÖØ-öø-ÿ.'’\-)\]])\s*(?:[1-9]\d?(?:\s*[-–]\s*[1-9]\d?)*)\s*[*†‡]*\s*(?:,\s*)?/g,
    "$1|||"
  );

  let pieces: string[] = [];

  if (withMarkerSeparators.includes("|||")) {
    pieces = withMarkerSeparators.split("|||");
  } else {
    // Fallback for a future PDF export that omits affiliation superscripts.
    pieces = block
      .replace(/\s+(?:and|&)\s+/gi, ",")
      .split(/\s*[,;|]\s*/);
  }

  const authors: string[] = [];

  for (const piece of pieces) {
    const cleaned = stripAuthorAffiliationMarker(
      piece.replace(/^[\s,;|]+|[\s,;|]+$/g, "")
    );

    if (!looksLikeAuthorName(cleaned)) continue;
    if (!authors.includes(cleaned)) authors.push(cleaned);
  }

  return authors;
};

type JfstFrontMatter = {
  title: string;
  authors: string[];
};

/**
 * Journal of FST has a stable visual first-page structure:
 *   running header
 *   title (one or more lines)
 *   [larger vertical gap]
 *   author block (one or more lines)
 *   [larger vertical gap]
 *   Abstract
 *
 * Previous versions tried to recognize authors by affiliation digits. That is
 * fragile because different Word/PDF exports can detach or omit those digits.
 * Here the TITLE/AUTHOR boundary is derived from the actual Y positions of the
 * printed lines. The largest internal gap between the running header and
 * "Abstract" is the separator between the title and the author block.
 */
const isAffiliationMarkerItem = (value: string) => {
  const normalized = normalizeSuperscriptDigits(cleanLine(value));
  return /^[1-9]\d?(?:\s*[-–]\s*[1-9]\d?)*\s*[*†‡]*$/.test(normalized);
};

const joinRawTextItems = (items: PositionedTextItem[]) => {
  let result = "";

  for (const item of items) {
    const raw = normalizeSuperscriptDigits(decodeCommonPdfLigatures(item.text || ""));
    if (!raw.trim()) continue;

    const text = raw.trim();
    const punctuation = /^[,.;:!?%)\]}]/.test(text);
    const previousEndsWithSpace = /\s$/.test(result);
    const previousEndsWithPunctuation = /[,;]$/.test(result);

    if (
      result &&
      !previousEndsWithSpace &&
      !punctuation &&
      !previousEndsWithPunctuation
    ) {
      result += " ";
    }

    result += text;
  }

  return cleanLine(result);
};

/**
 * Extract the Journal of FST title and author list from the raw positioned
 * PDF text items. This deliberately avoids reconstructing author lines from Y
 * coordinates. Superscript affiliation markers in Word-generated PDFs sit at a
 * slightly different Y position and caused previous versions to split or drop
 * author names.
 *
 * JFST first-page structure is stable:
 *   running journal header
 *   article title
 *   author names with affiliation superscripts
 *   Abstract
 *
 * We locate the first affiliation superscript between the header and Abstract,
 * then use its Y position to isolate the complete author band. This preserves
 * wrapped author names such as "Sayma Alam" + "Suha1".
 */
const extractJfstFrontMatterFromLayout = (
  layout: RenderedPageLayout | undefined
): JfstFrontMatter | null => {
  if (!layout?.items?.length) return null;

  const items = layout.items
    .filter((item) => Boolean(String(item.text || "").trim()))
    .sort((a, b) => a.index - b.index);

  const headerItem = items.find((item) => /\bJournal\s+of\s+FST\b/i.test(item.text));
  const abstractItem = items.find(
    (item) => /^\s*Abstract\b/i.test(normalizePdfText(item.text))
  );

  if (!headerItem || !abstractItem || abstractItem.index <= headerItem.index) {
    return null;
  }

  // Exclude header page numbers (e.g. 23, 195) by requiring the marker to be
  // visibly below the running header. All JFST author superscripts are well
  // below this threshold.
  const firstAuthorMarker = items.find(
    (item) =>
      item.index > headerItem.index &&
      item.index < abstractItem.index &&
      item.y < headerItem.y - 15 &&
      item.y > abstractItem.y + 4 &&
      isAffiliationMarkerItem(item.text)
  );

  if (!firstAuthorMarker) return null;

  // The author name baseline is normally 0-3 PDF units below the superscript.
  // A +6 upper tolerance safely includes the first author's name while keeping
  // the title (typically 20+ units above) out of the author region.
  const authorUpperY = firstAuthorMarker.y + 6;
  const authorLowerY = abstractItem.y + 5;

  const authorItems = items.filter(
    (item) =>
      item.index > headerItem.index &&
      item.index < abstractItem.index &&
      item.y <= authorUpperY &&
      item.y >= authorLowerY
  );

  const authorBlock = joinRawTextItems(authorItems);
  const authors = extractAuthorsFromBlock(authorBlock);

  if (authors.length === 0) return null;

  // Title ends before the author band. Using the marker-derived boundary avoids
  // mistaking a multi-line title such as "... / Ensemble Learning" for an
  // author name.
  const titleLowerY = authorUpperY + 5;
  const titleUpperY = headerItem.y - 10;
  const titleItems = items.filter(
    (item) =>
      item.index > headerItem.index &&
      item.index < firstAuthorMarker.index &&
      item.y < titleUpperY &&
      item.y > titleLowerY
  );

  const title = joinRawTextItems(titleItems);
  if (!title) return null;

  return { title, authors };
};

/**
 * Text-only fallback for PDFs where PDF.js does not expose usable coordinates.
 * This is intentionally secondary; normal JFST PDFs should use the positioned
 * layout parser above.
 */
const extractJfstFrontMatterFromText = (
  firstPageText: string
): JfstFrontMatter | null => {
  const lines = splitLines(normalizePdfText(firstPageText)).slice(0, 80);
  const headerIndex = lines.findIndex(isJfstHeaderLine);
  const abstractIndex = lines.findIndex(
    (line, index) => index > headerIndex && /^abstract\b/i.test(line)
  );

  if (headerIndex < 0 || abstractIndex <= headerIndex + 2) return null;

  const frontLines = lines.slice(headerIndex + 1, abstractIndex);

  // Work backward and find the shortest trailing block that parses into one or
  // more author names. Prefer a block containing commas / affiliation markers.
  for (let count = 1; count <= Math.min(4, frontLines.length - 1); count += 1) {
    const authorBlock = cleanLine(frontLines.slice(-count).join(" "));
    const authors = extractAuthorsFromBlock(authorBlock);
    const hasStrongAuthorSignal =
      /,|\band\b|&|[A-Za-zÀ-ÖØ-öø-ÿ.'’)]\s*[1-9]\d?\s*[*†‡]*/i.test(
        authorBlock
      );

    if (authors.length > 0 && (hasStrongAuthorSignal || count === 1)) {
      const title = cleanLine(frontLines.slice(0, -count).join(" "));
      if (title) return { title, authors };
    }
  }

  return null;
};

const splitMetadataAuthors = (value: string) => {
  const cleaned = normalizeSuperscriptDigits(cleanLine(value || ""))
    .replace(/^authors?\s*[:\-–—]\s*/i, "")
    .replace(/\s+and\s+/gi, ", ")
    .replace(/\s*&\s*/g, ", ")
    .trim();

  return cleaned
    .split(/\s*[,;|]\s*/)
    .map((item) => stripAuthorAffiliationMarker(item))
    .filter(Boolean)
    .filter((item) => item.length >= 2 && item.length <= 120)
    .filter((item) => !isGenericPdfAuthor(item));
};

const extractFallbackTitle = (firstPageText: string, infoTitle: string) => {
  const metadataTitle = cleanLine(infoTitle || "");
  if (metadataTitle && !isGenericPdfTitle(metadataTitle) && metadataTitle.length > 8) {
    return metadataTitle;
  }

  const lines = splitLines(firstPageText).slice(0, 35);
  const abstractIndex = lines.findIndex((line) => /^abstract\b/i.test(line));
  const candidates = (abstractIndex > 0 ? lines.slice(0, abstractIndex) : lines)
    .filter((line) => !isJfstHeaderLine(line))
    .filter((line) => !isLikelyAffiliationLine(line));

  return cleanLine(candidates.slice(0, 3).join(" "));
};

const extractAbstract = (fullText: string) => {
  const normalized = decodeCommonPdfLigatures(fullText);
  const match = normalized.match(
    /\babstract\b\s*[:.\-–—]?\s*([\s\S]{40,6000}?)(?=\n\s*(?:keywords?|key\s*words?|index\s*terms?)\b|\n\s*(?:1\.?|i\.)\s*(?:introduction|background)\b)/i
  );

  if (!match?.[1]) return "";
  return cleanText(match[1]).replace(/\n+/g, " ").trim();
};

const extractKeywords = (fullText: string) => {
  const normalized = decodeCommonPdfLigatures(fullText);
  const match = normalized.match(
    /(?:keywords?|key\s*words?|index\s*terms?)\s*[:.\-–—]?\s*([\s\S]{2,1000}?)(?=\n\s*(?:1\.?|i\.)\s*(?:introduction|background)\b|\n\s*[A-Z][A-Z\s]{4,}\n)/i
  );

  if (!match?.[1]) return [];

  const value = cleanText(match[1]).replace(/\n+/g, " ");
  return value
    .split(/\s*[,;•·|]\s*/)
    .map((item) => item.replace(/[.;]+$/, "").trim())
    .filter(Boolean)
    .filter((item) => item.length <= 100)
    .slice(0, 20);
};

const extractDoi = (fullText: string) => {
  const match = fullText.match(/\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+\b/i);
  return match?.[0]?.replace(/[.,;)\]]+$/, "") || "";
};

const MONTH_PATTERN =
  "(?:January|February|March|April|May|June|July|August|September|October|November|December)";

const findPrintedPageNumberFromLayout = (
  layout: RenderedPageLayout | undefined,
  preferLastPage = false
) => {
  if (!layout?.items?.length) return null;

  const items = layout.items.filter((item) => Boolean(String(item.text || "").trim()));
  const journalItem = items.find((item) => /\bJournal\s+of\s+FST\b/i.test(item.text));

  if (journalItem) {
    const headerItems = items
      .filter((item) => Math.abs(item.y - journalItem.y) <= 6)
      .sort((a, b) => a.x - b.x);
    const headerText = cleanLine(
      normalizePdfText(headerItems.map((item) => item.text).join(" "))
    );

    const rightMatch = headerText.match(
      new RegExp(`${MONTH_PATTERN}\\s+\\d{4}\\s*[|¦│]?\\s*(\\d{1,4})\\s*$`, "i")
    );
    if (rightMatch?.[1]) return Number(rightMatch[1]);
  }

  // Even-numbered/left-running pages use: 216 | Article title...
  const topItems = [...items]
    .sort((a, b) => b.y - a.y || a.x - b.x)
    .slice(0, 20);
  const topText = cleanLine(normalizePdfText(topItems.map((item) => item.text).join(" ")));
  const leftMatch = topText.match(/^\s*(\d{1,4})\s*[|¦│]\s*/);
  if (leftMatch?.[1]) return Number(leftMatch[1]);

  if (preferLastPage) {
    const leading = topText.match(/^\s*(\d{1,4})\b/);
    if (leading?.[1]) return Number(leading[1]);
  }

  return null;
};

const findPrintedPageNumberFromText = (pageText: string) => {
  const normalized = normalizePdfText(pageText);
  const monthMatch = normalized.match(
    new RegExp(`${MONTH_PATTERN}\\s+\\d{4}\\s*[|¦│]?\\s*(\\d{1,4})`, "i")
  );
  if (monthMatch?.[1]) return Number(monthMatch[1]);

  const leftMatch = normalized.match(/^\s*(\d{1,4})\s*[|¦│]\s*/m);
  if (leftMatch?.[1]) return Number(leftMatch[1]);

  return null;
};

const extractPages = (
  pageTexts: string[],
  pageLayouts: RenderedPageLayout[],
  pageCount: number
) => {
  if (pageCount <= 0) return "";

  const firstPrinted =
    findPrintedPageNumberFromLayout(pageLayouts[0]) ??
    findPrintedPageNumberFromText(pageTexts[0] || "");

  const lastLayout = pageLayouts[Math.max(0, pageCount - 1)];
  const lastText = pageTexts[Math.max(0, pageCount - 1)] || "";
  const lastPrinted =
    findPrintedPageNumberFromLayout(lastLayout, true) ??
    findPrintedPageNumberFromText(lastText);

  const makeRange = (first: number, last: number) =>
    first === last ? String(first) : `${first}-${last}`;

  if (
    firstPrinted !== null &&
    lastPrinted !== null &&
    lastPrinted >= firstPrinted
  ) {
    return makeRange(firstPrinted, lastPrinted);
  }

  // Journal article PDFs use continuous printed pagination. Once the first
  // running page is known, the last printed page is deterministic from the PDF
  // page count (e.g. 195 + 22 - 1 = 216).
  if (firstPrinted !== null) {
    return makeRange(firstPrinted, firstPrinted + pageCount - 1);
  }

  if (lastPrinted !== null) {
    return makeRange(Math.max(1, lastPrinted - pageCount + 1), lastPrinted);
  }

  return pageCount === 1 ? "1" : `1-${pageCount}`;
};

const renderPdfPage = (
  pageTexts: string[],
  pageLayouts: RenderedPageLayout[]
) => {
  return async (pageData: any) => {
    const textContent = await pageData.getTextContent({
      normalizeWhitespace: false,
      disableCombineTextItems: false,
    });

    const positionedItems: PositionedTextItem[] = [];

    for (const [itemIndex, item] of (textContent.items || []).entries()) {
      const text = String(item?.str || "");
      const x = Number(item?.transform?.[4]);
      const y = Number(item?.transform?.[5]);
      const width = Number(item?.width || 0);

      if (!text || !Number.isFinite(x) || !Number.isFinite(y)) continue;
      positionedItems.push({
        text,
        x,
        y,
        width: Number.isFinite(width) ? width : 0,
        index: itemIndex,
      });
    }

    const rawItems = [...positionedItems];

    positionedItems.sort((a, b) => {
      if (Math.abs(b.y - a.y) > 0.01) return b.y - a.y;
      return a.x - b.x;
    });

    const lines: PositionedLine[] = [];
    const yTolerance = 4.8;

    for (const item of positionedItems) {
      let bestLine: PositionedLine | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (const line of lines) {
        const distance = Math.abs(line.y - item.y);
        if (distance <= yTolerance && distance < bestDistance) {
          bestLine = line;
          bestDistance = distance;
        }
      }

      if (!bestLine) {
        lines.push({ y: item.y, items: [item] });
        continue;
      }

      bestLine.items.push(item);
      bestLine.y =
        bestLine.items.reduce((sum, current) => sum + current.y, 0) /
        bestLine.items.length;
    }

    lines.sort((a, b) => b.y - a.y);

    const renderedLines: RenderedTextLine[] = lines
      .map((line) => {
        line.items.sort((a, b) => a.x - b.x);

        let result = "";
        let previousEnd: number | null = null;

        for (const item of line.items) {
          const text = item.text;
          const horizontalGap =
            previousEnd === null ? 0 : Math.max(0, item.x - previousEnd);
          const punctuationContinuation = /^[,.;:!?%)\]}]/.test(text);
          const startsWithWhitespace = /^\s/.test(text);
          const resultEndsWithWhitespace = /\s$/.test(result);

          const addSpace =
            result.length > 0 &&
            !punctuationContinuation &&
            !startsWithWhitespace &&
            !resultEndsWithWhitespace &&
            horizontalGap > 0.5;

          result += `${addSpace ? " " : ""}${text}`;
          previousEnd = item.x + item.width;
        }

        return {
          y: line.y,
          text: cleanLine(normalizePdfText(result)),
        };
      })
      .filter((line) => Boolean(line.text));

    const pageText = normalizePdfText(
      renderedLines.map((line) => line.text).join("\n")
    );

    const pageIndex = Number(pageData?.pageIndex);
    if (Number.isFinite(pageIndex) && pageIndex >= 0) {
      pageTexts[pageIndex] = pageText;
      pageLayouts[pageIndex] = { text: pageText, lines: renderedLines, items: rawItems };
    } else {
      pageTexts.push(pageText);
      pageLayouts.push({ text: pageText, lines: renderedLines, items: rawItems });
    }

    return pageText;
  };
};

export const extractArticlePdfMetadata = async (
  buffer: Buffer
): Promise<ExtractedArticlePdfMetadata> => {
  const pageTexts: string[] = [];
  const pageLayouts: RenderedPageLayout[] = [];

  const parsed = await pdfParse(buffer, {
    pagerender: renderPdfPage(pageTexts, pageLayouts),
  });

  const orderedPageTexts = pageTexts.filter(Boolean);
  const fullText = normalizePdfText(
    orderedPageTexts.length > 0 ? orderedPageTexts.join("\n\n") : parsed.text || ""
  );
  const firstPageText = pageTexts[0] || orderedPageTexts[0] || fullText;

  const jfstFrontMatter =
    extractJfstFrontMatterFromLayout(pageLayouts[0]) ||
    extractJfstFrontMatterFromText(firstPageText);

  const infoTitle = String(parsed.info?.Title || "");
  const infoAuthor = String(parsed.info?.Author || "");

  const title =
    jfstFrontMatter?.title || extractFallbackTitle(firstPageText, infoTitle);

  let authors = jfstFrontMatter?.authors || [];
  if (authors.length === 0 && infoAuthor && !isGenericPdfAuthor(infoAuthor)) {
    authors = splitMetadataAuthors(infoAuthor);
  }

  const abstract = extractAbstract(fullText);
  const keywords = extractKeywords(fullText);
  const doi = extractDoi(fullText);
  const pageCount = Number(parsed.numpages || orderedPageTexts.length || 0);
  const pages = extractPages(pageTexts, pageLayouts, pageCount);

  const detectedFields = [
    title ? "title" : "",
    authors.length > 0 ? "authors" : "",
    abstract ? "abstract" : "",
    keywords.length > 0 ? "keywords" : "",
    pages ? "pages" : "",
  ].filter(Boolean);

  const warning =
    detectedFields.length >= 4
      ? "PDF metadata was detected automatically. Please review the values before saving."
      : "Only part of the PDF metadata could be detected automatically. Please review and complete any missing fields before saving.";

  return {
    title,
    authors,
    abstract,
    keywords,
    pages,
    doi,
    pageCount,
    detectedFields,
    warning,
  };
};
