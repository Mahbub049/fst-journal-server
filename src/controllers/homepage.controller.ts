import { Request, Response } from "express";
import Homepage from "../models/Homepage.model";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware";

const clampNumber = (
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.min(Math.max(Math.round(numericValue), minimum), maximum);
};

const normalizeTargetDate = (value: unknown) => {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isFinite(date.getTime()) ? date : null;
};

type DisplayScope = "homepage" | "all" | "custom";

const normalizeDisplayScope = (
  value: unknown,
  fallback: DisplayScope,
): DisplayScope => {
  const scope = String(value || "");

  if (scope === "homepage" || scope === "all" || scope === "custom") {
    return scope;
  }

  return fallback;
};

const normalizeDisplayPaths = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .map((item) => {
          if (item === "*") return item;
          return item.startsWith("/") ? item : `/${item}`;
        })
        .slice(0, 100),
    ),
  );
};

const normalizeHomepagePayload = (body: Record<string, any>) => {
  return {
    heroTitle: body.heroTitle || "",
    heroSubtitle: body.heroSubtitle || "",
    journalCoverImage: body.journalCoverImage || "",
    publishingModel: body.publishingModel || "",
    issnPrint: body.issnPrint || "",
    issnOnline: body.issnOnline || "",

    metrics: Array.isArray(body.metrics)
      ? body.metrics.map((item: any, index: number) => ({
          label: item.label || "",
          value: item.value || "",
          description: item.description || "",
          order: Number(item.order ?? index + 1),
          isActive: item.isActive ?? true,
        }))
      : [],

    overviewTitle: body.overviewTitle || "",
    overviewContent: body.overviewContent || "",

    countdownEnabled: body.countdownEnabled ?? true,
    countdownTitle:
      String(body.countdownTitle || "").trim() ||
      "Countdown to the Next Journal Milestone",
    countdownTargetDate: normalizeTargetDate(body.countdownTargetDate),
    countdownExpiredText:
      String(body.countdownExpiredText || "").trim() ||
      "The scheduled date has arrived",

    carouselEnabled: body.carouselEnabled ?? true,
    carouselIntervalSeconds: clampNumber(
      body.carouselIntervalSeconds,
      5,
      2,
      30,
    ),
    carouselImages: Array.isArray(body.carouselImages)
      ? body.carouselImages
          .map((item: any, index: number) => ({
            imageUrl: String(item.imageUrl || item.url || "").trim(),
            altText: String(item.altText || item.alt || "").trim(),
            order: Number(item.order ?? index + 1),
            isActive: item.isActive ?? true,
          }))
          .filter((item: { imageUrl: string }) => item.imageUrl)
      : [],

    journalInfoTitle: body.journalInfoTitle || "",
    journalInfoItems: Array.isArray(body.journalInfoItems)
      ? body.journalInfoItems.map((item: any, index: number) => ({
          label: item.label || "",
          value: item.value || "",
          order: Number(item.order ?? index + 1),
          isActive: item.isActive ?? true,
        }))
      : [],

    executiveEditorsTitle: body.executiveEditorsTitle || "",
    executiveEditorsSubtitle: body.executiveEditorsSubtitle || "",
    executiveEditorsShowBiographyPreview:
      body.executiveEditorsShowBiographyPreview === true,

    articlesSectionTitle: body.articlesSectionTitle || "",
    articlesSectionSubtitle: body.articlesSectionSubtitle || "",
    recentIssuesTitle: body.recentIssuesTitle || "",
    recentIssuesSubtitle: body.recentIssuesSubtitle || "",

    buttons: Array.isArray(body.buttons)
      ? body.buttons.map((item: any, index: number) => ({
          label: item.label || "",
          url: item.url || "",
          variant: item.variant || "primary",
          order: Number(item.order ?? index + 1),
          isActive: item.isActive ?? true,
        }))
      : [],

    launchModalEnabled: body.launchModalEnabled ?? false,
    launchModalLayout: ["text", "image-text", "image"].includes(
      String(body.launchModalLayout),
    )
      ? body.launchModalLayout
      : "text",
    launchModalEyebrow:
      String(body.launchModalEyebrow || "").trim() || "A NEW CHAPTER BEGINS",
    launchModalTitle:
      String(body.launchModalTitle || "").trim() ||
      "Welcome to the New Journal of FST Website",
    launchModalMessage:
      String(body.launchModalMessage || "").trim() ||
      "We are delighted to welcome you to the newly launched digital home of the Journal of FST, Bangladesh University of Professionals. Explore our research, editorial community, current issues, and future calls for papers through a faster and more accessible journal experience.",
    launchModalImageUrl: String(body.launchModalImageUrl || "").trim(),
    launchModalImageAlt:
      String(body.launchModalImageAlt || "").trim() ||
      "Journal of FST inauguration",
    launchModalPrimaryLabel:
      String(body.launchModalPrimaryLabel || "").trim() || "Explore the Journal",
    launchModalPrimaryUrl:
      String(body.launchModalPrimaryUrl || "").trim() || "/issues/archive",
    launchModalSecondaryLabel:
      String(body.launchModalSecondaryLabel || "").trim() ||
      "Continue to Website",
    launchModalStartAt: normalizeTargetDate(body.launchModalStartAt),
    launchModalEndAt: normalizeTargetDate(body.launchModalEndAt),
    launchModalFrequency: [
      "every-visit",
      "once-per-session",
      "once-per-day",
    ].includes(String(body.launchModalFrequency))
      ? body.launchModalFrequency
      : "once-per-session",
    launchModalDismissible: body.launchModalDismissible ?? true,
    launchModalAutoCloseSeconds: clampNumber(
      body.launchModalAutoCloseSeconds,
      0,
      0,
      120,
    ),
    launchModalScope: normalizeDisplayScope(body.launchModalScope, "homepage"),
    launchModalCustomPaths: normalizeDisplayPaths(body.launchModalCustomPaths),

    celebrationEnabled: body.celebrationEnabled ?? false,
    celebrationStyle: ["confetti", "fireworks", "both"].includes(
      String(body.celebrationStyle),
    )
      ? body.celebrationStyle
      : "both",
    celebrationDurationSeconds: clampNumber(
      body.celebrationDurationSeconds,
      8,
      2,
      30,
    ),
    celebrationFrequency: ["once-per-session", "every-page"].includes(
      String(body.celebrationFrequency),
    )
      ? body.celebrationFrequency
      : "once-per-session",
    celebrationStartAt: normalizeTargetDate(body.celebrationStartAt),
    celebrationEndAt: normalizeTargetDate(body.celebrationEndAt),
    celebrationScope: normalizeDisplayScope(body.celebrationScope, "all"),
    celebrationCustomPaths: normalizeDisplayPaths(body.celebrationCustomPaths),

    isPublished: body.isPublished ?? true,
  };
};

export const getPublicHomepage = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const homepage = await Homepage.findOne({ isPublished: true }).select("-__v");

    if (!homepage) {
      res.status(404).json({
        success: false,
        message: "Homepage content not found.",
      });
      return;
    }

    res.status(200).json({ success: true, homepage });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch homepage content.",
    });
  }
};

export const getAdminHomepage = async (
  _req: AdminAuthRequest,
  res: Response,
): Promise<void> => {
  try {
    let homepage = await Homepage.findOne();
    if (!homepage) homepage = await Homepage.create({});
    res.status(200).json({ success: true, homepage });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch homepage content.",
    });
  }
};

export const updateAdminHomepage = async (
  req: AdminAuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const payload = normalizeHomepagePayload(req.body);

    if (!payload.heroTitle.trim()) {
      res.status(400).json({
        success: false,
        message: "Hero title is required.",
      });
      return;
    }

    let homepage = await Homepage.findOne();
    if (!homepage) {
      homepage = await Homepage.create(payload);
    } else {
      homepage.set(payload);
      await homepage.save();
    }

    res.status(200).json({
      success: true,
      message: "Homepage content updated successfully.",
      homepage,
    });
  } catch (error) {
    console.error("Update homepage error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update homepage content.",
    });
  }
};
