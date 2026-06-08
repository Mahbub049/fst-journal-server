import SiteSettings from "../models/SiteSettings.model";
import { defaultSiteSettings, defaultUsefulLinks } from "../controllers/siteSettings.controller";

const legacyFooterDescription =
  "BUP Faculty of Science and Technology Journal publishes scholarly research in science, technology, engineering, and interdisciplinary areas.";

const legacyCopyrightText =
  "© Bangladesh University of Professionals. All rights reserved.";

const mergeUsefulLinksWithDefaults = (links: any[] = []) => {
  const normalized = Array.isArray(links) ? links : [];
  const existingByUrl = new Set(
    normalized.map((item) => String(item.url || "").trim()).filter(Boolean)
  );

  return [
    ...normalized,
    ...defaultUsefulLinks.filter((item) => !existingByUrl.has(item.url)),
  ].map((item, index) => ({
    label: item.label || "",
    url: item.url || "",
    group: item.group || "General",
    order: Number(item.order ?? index + 1),
    isActive: item.isActive ?? true,
  }));
};

export const seedSiteSettings = async () => {
  let settings = await SiteSettings.findOne();

  if (!settings) {
    await SiteSettings.create(defaultSiteSettings);
    return;
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
};
