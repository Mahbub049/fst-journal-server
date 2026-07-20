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

export const defaultAnnouncementItems = [
  {
    text: "Welcome to the official website of Journal of FST",
    url: "",
    order: 1,
    isActive: true,
  },
  {
    text: "Call for Papers is now open",
    url: "/call-for-papers",
    order: 2,
    isActive: true,
  },
  {
    text: "Submit your research manuscript through the online submission system",
    url: "/submit-manuscript-portal",
    order: 3,
    isActive: true,
  },
  {
    text: "Explore current and archived issues of the journal",
    url: "/issues/archive",
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

  announcementItems: defaultAnnouncementItems,
  announcementSpeedSeconds: 100,
  announcementGapPixels: 120,

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

const normalizeAnnouncementSpeedSeconds = (value: any) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return defaultSiteSettings.announcementSpeedSeconds;
  }

  return Math.min(Math.max(Math.round(numericValue), 10), 300);
};


const normalizeAnnouncementGapPixels = (value: any) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return defaultSiteSettings.announcementGapPixels;
  }

  return Math.min(Math.max(Math.round(numericValue), 24), 480);
};

const normalizeAnnouncementItems = (items: any[] = []) => {
  return (Array.isArray(items) ? items : [])
    .map((item, index) => ({
      text: String(item.text || "").trim(),
      url: String(item.url || item.linkUrl || item.href || "").trim(),
      order: Number(item.order ?? index + 1),
      isActive: item.isActive ?? true,
    }))
    .filter((item) => item.text);
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

    announcementItems: Array.isArray(body.announcementItems)
      ? normalizeAnnouncementItems(body.announcementItems)
      : defaultAnnouncementItems,
    announcementSpeedSeconds: normalizeAnnouncementSpeedSeconds(
      body.announcementSpeedSeconds
    ),
    announcementGapPixels: normalizeAnnouncementGapPixels(
      body.announcementGapPixels
    ),

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
  let settings = await SiteSettings.findOne().sort({ updatedAt: -1, createdAt: -1 });

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
  patchIfMissing("publisherName", defaultSiteSettings.publisherName);
  patchIfMissing("footerCreditText", defaultSiteSettings.footerCreditText);
  patchIfMissing("contactEmail", defaultSiteSettings.contactEmail);
  patchIfMissing(
    "announcementSpeedSeconds",
    defaultSiteSettings.announcementSpeedSeconds
  );
  patchIfMissing(
    "announcementGapPixels",
    defaultSiteSettings.announcementGapPixels
  );

  if (!Array.isArray((settings as any).announcementItems)) {
    (settings as any).announcementItems = defaultAnnouncementItems;
    changed = true;
  }

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

  // Do not overwrite publisherName after admin changes it.
  // Older code treated "Bangladesh University of Professionals" as a legacy value
  // and replaced it on every admin/public settings fetch, so the saved value
  // appeared to revert after refresh. Missing values are already handled above.

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
    const settings = await createOrMigrateSiteSettings();

    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store",
    });

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

    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store",
    });

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

    let settings = await SiteSettings.findOne().sort({ updatedAt: -1, createdAt: -1 });

    if (!settings) {
      settings = await SiteSettings.create({ ...payload, isPublished: true });
    } else {
      settings.set({ ...payload, isPublished: true });
      await settings.save();
    }

    await SiteSettings.updateMany(
      { _id: { $ne: settings._id } },
      { $set: { isPublished: false } }
    );

    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store",
    });

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
