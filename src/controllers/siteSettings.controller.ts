import { Request, Response } from "express";
import SiteSettings from "../models/SiteSettings.model";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware";

const legacyFooterDescription =
  "BUP Faculty of Science and Technology Journal publishes scholarly research in science, technology, engineering, and interdisciplinary areas.";

const legacyCopyrightText =
  "© Bangladesh University of Professionals. All rights reserved.";

export const defaultUsefulLinks = [
  {
    label: "About the Journal",
    url: "/about/about-the-journal",
    group: "Journal",
    order: 1,
    isActive: true,
  },
  {
    label: "Aims & Scope",
    url: "/about/aims-scope",
    group: "Journal",
    order: 2,
    isActive: true,
  },
  {
    label: "Editorial Board",
    url: "/editorial-board",
    group: "Journal",
    order: 3,
    isActive: true,
  },
  {
    label: "Contact",
    url: "/contact",
    group: "Journal",
    order: 4,
    isActive: true,
  },
  {
    label: "Author Guidelines",
    url: "/for-authors/author-guidelines",
    group: "For Authors",
    order: 1,
    isActive: true,
  },
  {
    label: "Submission Guidelines",
    url: "/for-authors/submission-guidelines",
    group: "For Authors",
    order: 2,
    isActive: true,
  },
  {
    label: "Peer Review Process",
    url: "/for-authors/peer-review-process",
    group: "For Authors",
    order: 3,
    isActive: true,
  },
  {
    label: "Templates",
    url: "/for-authors/templates",
    group: "For Authors",
    order: 4,
    isActive: true,
  },
  {
    label: "Current Issue",
    url: "/issues/current",
    group: "Browse",
    order: 1,
    isActive: true,
  },
  {
    label: "Archive",
    url: "/issues/archive",
    group: "Browse",
    order: 2,
    isActive: true,
  },
  {
    label: "Most Cited",
    url: "/issues/most-cited",
    group: "Browse",
    order: 3,
    isActive: true,
  },
  {
    label: "Most Read",
    url: "/issues/most-read",
    group: "Browse",
    order: 4,
    isActive: true,
  },
];

export const defaultSiteSettings = {
  footerJournalTitle: "Journal of FST",
  footerJournalSubtitle: "Bangladesh University of Professionals",
  footerDescription:
    "A scholarly journal platform dedicated to publishing quality research in science, technology, engineering, and related interdisciplinary fields.",
  publisherLabel: "Publisher",
  publisherName: "Faculty of Science & Technology, BUP",
  contactEmail: "journal.fst@bup.edu.bd",
  contactPhone: "",
  address:
    "Bangladesh University of Professionals, Mirpur Cantonment, Dhaka - 1216",
  copyrightText: "Copyright © 2026 Journal of FST. All rights reserved.",
  footerCreditText: "Designed for academic publishing and research visibility.",
  footerCreditUrl: "",

  journalInfoTitle: "Journal Information",
  publishingModel: "Hybrid",
  language: "English",
  publicationFrequency: "Annual",

  usefulLinks: defaultUsefulLinks,
  socialLinks: [],
  isPublished: true,
};

const mergeUsefulLinksWithDefaults = (links: any[] = []) => {
  const normalized = Array.isArray(links) ? links : [];
  const existingByUrl = new Set(
    normalized.map((item) => String(item.url || "").trim()).filter(Boolean)
  );

  const missingDefaults = defaultUsefulLinks.filter(
    (item) => !existingByUrl.has(item.url)
  );

  return [...normalized, ...missingDefaults]
    .map((item, index) => ({
      label: item.label || "",
      url: item.url || "",
      group: item.group || "General",
      order: Number(item.order ?? index + 1),
      isActive: item.isActive ?? true,
    }));
};

const normalizeSiteSettingsPayload = (body: Record<string, any>) => {
  return {
    footerJournalTitle:
      body.footerJournalTitle || defaultSiteSettings.footerJournalTitle,
    footerJournalSubtitle:
      body.footerJournalSubtitle || defaultSiteSettings.footerJournalSubtitle,
    footerDescription:
      body.footerDescription || defaultSiteSettings.footerDescription,
    publisherLabel: body.publisherLabel || defaultSiteSettings.publisherLabel,
    publisherName: body.publisherName || defaultSiteSettings.publisherName,
    contactEmail: body.contactEmail || defaultSiteSettings.contactEmail,
    contactPhone: body.contactPhone || "",
    address: body.address || defaultSiteSettings.address,
    copyrightText: body.copyrightText || defaultSiteSettings.copyrightText,
    footerCreditText:
      body.footerCreditText || defaultSiteSettings.footerCreditText,
    footerCreditUrl: body.footerCreditUrl || "",

    journalInfoTitle: body.journalInfoTitle || defaultSiteSettings.journalInfoTitle,
    publishingModel: body.publishingModel || defaultSiteSettings.publishingModel,
    language: body.language || defaultSiteSettings.language,
    publicationFrequency:
      body.publicationFrequency || defaultSiteSettings.publicationFrequency,

    usefulLinks: Array.isArray(body.usefulLinks)
      ? body.usefulLinks.map((item: any, index: number) => ({
          label: item.label || "",
          url: item.url || "",
          group: item.group || "General",
          order: Number(item.order ?? index + 1),
          isActive: item.isActive ?? true,
        }))
      : defaultUsefulLinks,

    socialLinks: Array.isArray(body.socialLinks)
      ? body.socialLinks.map((item: any, index: number) => ({
          platform: item.platform || "",
          url: item.url || "",
          order: Number(item.order ?? index + 1),
          isActive: item.isActive ?? true,
        }))
      : [],

    isPublished: body.isPublished ?? true,
  };
};

const createOrMigrateSiteSettings = async () => {
  let settings = await SiteSettings.findOne();

  if (!settings) {
    return SiteSettings.create(defaultSiteSettings);
  }

  let changed = false;

  const patchIfMissing = (field: string, value: any) => {
    const current = (settings as any)[field];
    if (current === undefined || current === null || current === "") {
      (settings as any)[field] = value;
      changed = true;
    }
  };

  patchIfMissing("footerJournalTitle", defaultSiteSettings.footerJournalTitle);
  patchIfMissing(
    "footerJournalSubtitle",
    defaultSiteSettings.footerJournalSubtitle
  );
  patchIfMissing("publisherLabel", defaultSiteSettings.publisherLabel);
  patchIfMissing("footerCreditText", defaultSiteSettings.footerCreditText);
  patchIfMissing("contactEmail", defaultSiteSettings.contactEmail);

  if (
    settings.footerDescription === legacyFooterDescription ||
    !settings.footerDescription
  ) {
    settings.footerDescription = defaultSiteSettings.footerDescription;
    changed = true;
  }

  if (settings.copyrightText === legacyCopyrightText || !settings.copyrightText) {
    settings.copyrightText = defaultSiteSettings.copyrightText;
    changed = true;
  }

  if (
    !settings.publisherName ||
    settings.publisherName === "Bangladesh University of Professionals"
  ) {
    settings.publisherName = defaultSiteSettings.publisherName;
    changed = true;
  }

  const mergedLinks = mergeUsefulLinksWithDefaults(settings.usefulLinks as any[]);
  if (mergedLinks.length !== (settings.usefulLinks || []).length) {
    settings.usefulLinks = mergedLinks as any;
    changed = true;
  }

  if (changed) {
    await settings.save();
  }

  return settings;
};

export const getPublicSiteSettings = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const settings = await SiteSettings.findOne({ isPublished: true }).select(
      "-__v"
    );

    if (!settings) {
      res.status(200).json({
        success: true,
        data: defaultSiteSettings,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("getPublicSiteSettings error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch site settings.",
    });
  }
};

export const getAdminSiteSettings = async (
  _req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const settings = await createOrMigrateSiteSettings();

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("getAdminSiteSettings error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch site settings.",
    });
  }
};

export const updateAdminSiteSettings = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const payload = normalizeSiteSettingsPayload(req.body);

    let settings = await SiteSettings.findOne();

    if (!settings) {
      settings = await SiteSettings.create(payload);
    } else {
      settings.set(payload);
      await settings.save();
    }

    res.status(200).json({
      success: true,
      message: "Site settings updated successfully.",
      data: settings,
    });
  } catch (error) {
    console.error("updateAdminSiteSettings error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update site settings.",
    });
  }
};
