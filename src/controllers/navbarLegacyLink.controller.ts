import { Request, Response } from "express";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware";
import NavbarLegacyLink, {
  NavbarLegacyLinkPosition,
} from "../models/NavbarLegacyLink.model";

const allowedPositions: NavbarLegacyLinkPosition[] = [
  "before-search",
  "between-search-submit",
  "after-submit",
];

export const defaultNavbarLegacyLinkSettings = {
  enabled: true,
  label: "Old JFST Website",
  url: "https://jfst.bup.edu.bd/index.php/jfst",
  position: "between-search-submit" as NavbarLegacyLinkPosition,
  openInNewTab: true,
};

const normalizeUrl = (value: unknown) => {
  const cleanValue = String(value || "").trim();

  if (!cleanValue) {
    return defaultNavbarLegacyLinkSettings.url;
  }

  if (cleanValue.startsWith("/")) {
    return cleanValue;
  }

  if (/^https?:\/\//i.test(cleanValue)) {
    return cleanValue;
  }

  return `https://${cleanValue}`;
};

const normalizePosition = (value: unknown): NavbarLegacyLinkPosition => {
  const cleanValue = String(value || "") as NavbarLegacyLinkPosition;

  return allowedPositions.includes(cleanValue)
    ? cleanValue
    : defaultNavbarLegacyLinkSettings.position;
};

const getOrCreateSettings = async () => {
  let settings = await NavbarLegacyLink.findOne().sort({
    updatedAt: -1,
    createdAt: -1,
  });

  if (!settings) {
    return NavbarLegacyLink.create(defaultNavbarLegacyLinkSettings);
  }

  let changed = false;

  if (!settings.label?.trim()) {
    settings.label = defaultNavbarLegacyLinkSettings.label;
    changed = true;
  }

  if (!settings.url?.trim()) {
    settings.url = defaultNavbarLegacyLinkSettings.url;
    changed = true;
  }

  if (!allowedPositions.includes(settings.position)) {
    settings.position = defaultNavbarLegacyLinkSettings.position;
    changed = true;
  }

  if (changed) {
    await settings.save();
  }

  return settings;
};

export const getPublicNavbarLegacyLink = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const settings = await getOrCreateSettings();

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
    console.error("getPublicNavbarLegacyLink error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch navbar old website button settings.",
    });
  }
};

export const getAdminNavbarLegacyLink = async (
  _req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const settings = await getOrCreateSettings();

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
    console.error("getAdminNavbarLegacyLink error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch navbar old website button settings.",
    });
  }
};

export const updateAdminNavbarLegacyLink = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const payload = {
      enabled: req.body.enabled ?? true,
      label:
        String(req.body.label || "").trim() ||
        defaultNavbarLegacyLinkSettings.label,
      url: normalizeUrl(req.body.url),
      position: normalizePosition(req.body.position),
      openInNewTab: req.body.openInNewTab ?? true,
    };

    let settings = await NavbarLegacyLink.findOne().sort({
      updatedAt: -1,
      createdAt: -1,
    });

    if (!settings) {
      settings = await NavbarLegacyLink.create(payload);
    } else {
      settings.set(payload);
      await settings.save();
    }

    // This feature is a singleton. Remove accidental older copies so there is
    // always one authoritative navbar button configuration.
    await NavbarLegacyLink.deleteMany({
      _id: { $ne: settings._id },
    });

    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store",
    });

    res.status(200).json({
      success: true,
      message: "Navbar old website button settings updated successfully.",
      data: settings,
    });
  } catch (error) {
    console.error("updateAdminNavbarLegacyLink error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update navbar old website button settings.",
    });
  }
};
