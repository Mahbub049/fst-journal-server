import { Request, Response } from "express";
import ContactPage from "../models/ContactPage.model";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware";

const DEFAULT_CONTACT_PAGE = {
  showEyebrow: true,
  eyebrow: "Contact",
  title: "Contact Us",
  subtitle: "Contact information for journal communication.",
  contentTitle: "Contact Us",
  contentHtml:
    "For journal-related communication, authors and readers may contact the editorial office through journal.fst@bup.edu.bd.",
  officeEyebrow: "Editorial Office",
  officeTitle: "Editorial Office",
  officeDescription:
    "For any queries regarding manuscript submission, processing, or publication requirements, please contact the Editorial Office.",
  publishedByLabel: "Published By",
  publishedBy: "Journal of Faculty of Science & Technology",
  institutionLabel: "Institution",
  institution: "Bangladesh University of Professionals",
  addressLabel: "Address",
  address: "Mirpur Cantonment, Dhaka - 1216",
  emailLabel: "Email",
  email: "editor.fstjournal@bup.edu.bd",
  phoneLabel: "Phone",
  phone: "",
  supportEyebrow: "Office Note",
  supportTitle: "Author Support",
  supportDescription:
    "For any queries regarding manuscript submission, processing, or publication requirements, please contact the Editorial Office.",
  emailButtonLabel: "Email Editorial Office",
  emailSubject: "Journal of FST editorial office inquiry",
  isPublished: true,
};

const optionalString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const sanitizeHtml = (value: unknown) =>
  String(value || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+\s*=\s*(["']).*?\1/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript\s*:/gi, "");

const normalizePayload = (body: Record<string, any>) => ({
  showEyebrow: body.showEyebrow ?? true,
  eyebrow: optionalString(body.eyebrow),
  title: optionalString(body.title),
  subtitle: optionalString(body.subtitle),
  contentTitle: optionalString(body.contentTitle),
  contentHtml: sanitizeHtml(body.contentHtml),
  officeEyebrow: optionalString(body.officeEyebrow),
  officeTitle: optionalString(body.officeTitle),
  officeDescription: optionalString(body.officeDescription),
  publishedByLabel: optionalString(body.publishedByLabel),
  publishedBy: optionalString(body.publishedBy),
  institutionLabel: optionalString(body.institutionLabel),
  institution: optionalString(body.institution),
  addressLabel: optionalString(body.addressLabel),
  address: optionalString(body.address),
  emailLabel: optionalString(body.emailLabel),
  email: optionalString(body.email),
  phoneLabel: optionalString(body.phoneLabel),
  phone: optionalString(body.phone),
  supportEyebrow: optionalString(body.supportEyebrow),
  supportTitle: optionalString(body.supportTitle),
  supportDescription: optionalString(body.supportDescription),
  emailButtonLabel: optionalString(body.emailButtonLabel),
  emailSubject: optionalString(body.emailSubject),
  isPublished: body.isPublished ?? true,
});

const getOrCreateContactPage = async () => {
  let contactPage = await ContactPage.findOne().sort({ updatedAt: -1 });
  if (!contactPage) contactPage = await ContactPage.create(DEFAULT_CONTACT_PAGE);
  return contactPage;
};

export const getPublicContactPage = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const contactPage = await getOrCreateContactPage();
    if (!contactPage.isPublished) {
      res.status(404).json({ success: false, message: "Contact page not found." });
      return;
    }

    res.set("Cache-Control", "no-store");
    res.status(200).json({ success: true, data: contactPage });
  } catch (error) {
    console.error("getPublicContactPage error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch contact page." });
  }
};

export const getAdminContactPage = async (
  _req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const contactPage = await getOrCreateContactPage();
    res.status(200).json({ success: true, data: contactPage });
  } catch (error) {
    console.error("getAdminContactPage error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch contact page." });
  }
};

export const updateAdminContactPage = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const payload = normalizePayload(req.body);
    let contactPage = await ContactPage.findOne().sort({ updatedAt: -1 });

    if (!contactPage) contactPage = await ContactPage.create(payload);
    else {
      contactPage.set(payload);
      await contactPage.save();
    }

    res.status(200).json({
      success: true,
      message: "Contact page updated successfully.",
      data: contactPage,
    });
  } catch (error) {
    console.error("updateAdminContactPage error:", error);
    res.status(500).json({ success: false, message: "Failed to update contact page." });
  }
};
