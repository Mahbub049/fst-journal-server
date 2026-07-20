import { Request, Response } from "express";
import Menu from "../models/Menu.model";
import Page, {
  ContentBlockType,
  IContentBlock,
  PageGroup,
} from "../models/Page.model";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware";

const allowedGroups: PageGroup[] = ["about", "for-authors", "issues", "custom"];
const allowedBlockTypes: ContentBlockType[] = [
  "paragraph",
  "heading",
  "list",
  "card",
  "section",
  "columns",
  "quote",
  "notice",
  "image",
  "pdf",
  "button",
  "video",
  "table",
  "code",
  "divider",
  "spacer",
];

const createSlug = (text: string) =>
  String(text || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getPublicPageUrl = (group: PageGroup, slug: string) => {
  if (group === "about" && slug === "contact-us") return "/contact";
  if (group === "about") return `/about/${slug}`;
  if (group === "for-authors") return `/for-authors/${slug}`;
  if (group === "issues") return `/issues/${slug}`;
  return `/${slug}`;
};

const sanitizeHtml = (value: unknown) => {
  const html = String(value || "");

  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+\s*=\s*(["']).*?\1/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript\s*:/gi, "");
};

const sanitizeUrl = (value: unknown) => {
  const url = String(value || "").trim();
  if (!url) return "";

  if (url.startsWith("/") || url.startsWith("#")) return url;
  if (/^(https?:|mailto:|tel:)/i.test(url)) return url;

  return "";
};

const normalizeStringArray = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeBlockStyle = (style: any = {}) => ({
  alignment: ["left", "center", "right", "justify"].includes(style.alignment)
    ? style.alignment
    : "left",
  backgroundColor: String(style.backgroundColor || "").trim(),
  textColor: String(style.textColor || "").trim(),
  width: ["full", "wide", "normal", "narrow"].includes(style.width)
    ? style.width
    : "normal",
  padding: ["none", "small", "medium", "large"].includes(style.padding)
    ? style.padding
    : "medium",
  columns: Math.min(Math.max(Number(style.columns || 2), 1), 4),
  headingLevel: Math.min(Math.max(Number(style.headingLevel || 2), 1), 6),
  variant: String(style.variant || "default").trim(),
});

const normalizeContentBlocks = (
  blocks: unknown,
  depth = 0
): IContentBlock[] => {
  if (!Array.isArray(blocks) || depth > 6) return [];

  return blocks
    .map((rawBlock: any, index) => {
      const type = allowedBlockTypes.includes(rawBlock?.type)
        ? rawBlock.type
        : "paragraph";

      return {
        type,
        title: String(rawBlock?.title || "").trim(),
        content: sanitizeHtml(rawBlock?.content),
        items: normalizeStringArray(rawBlock?.items).map((item) => sanitizeHtml(item)),
        imageUrl: sanitizeUrl(rawBlock?.imageUrl),
        fileUrl: sanitizeUrl(rawBlock?.fileUrl),
        buttonLabel: String(rawBlock?.buttonLabel || "").trim(),
        buttonUrl: sanitizeUrl(rawBlock?.buttonUrl),
        caption: String(rawBlock?.caption || "").trim(),
        altText: String(rawBlock?.altText || "").trim(),
        codeLanguage: String(rawBlock?.codeLanguage || "").trim(),
        style: normalizeBlockStyle(rawBlock?.style),
        children: normalizeContentBlocks(rawBlock?.children, depth + 1),
        order: index,
        isActive: rawBlock?.isActive ?? true,
      } as IContentBlock;
    })
    .filter(Boolean);
};

const sortNestedBlocks = (blocks: any[] = []): any[] =>
  [...blocks]
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .map((block) => ({
      ...(typeof block.toObject === "function" ? block.toObject() : block),
      children: sortNestedBlocks(block.children || []),
    }));

const normalizeGroupOrders = async (group: PageGroup) => {
  const pages = await Page.find({ group })
    .sort({ order: 1, createdAt: 1, title: 1 })
    .select("_id");

  if (!pages.length) return;

  await Page.bulkWrite(
    pages.map((page, index) => ({
      updateOne: {
        filter: { _id: page._id },
        update: { $set: { order: index } },
      },
    }))
  );
};

export const getPublicPages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { group } = req.query;
    const filter: Record<string, any> = { isPublished: true };

    if (group) filter.group = group;

    const pages = await Page.find(filter)
      .sort({ group: 1, order: 1, title: 1 })
      .select("-__v");

    res.set("Cache-Control", "no-store");
    res.status(200).json({ success: true, pages });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch pages." });
  }
};

export const getPublicPageByGroupAndSlug = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { group, slug } = req.params;
    const page = await Page.findOne({ group, slug, isPublished: true }).select("-__v");

    if (!page) {
      res.status(404).json({ success: false, message: "Page not found." });
      return;
    }

    const pageObject = page.toObject();
    res.set("Cache-Control", "no-store");
    res.status(200).json({
      success: true,
      page: { ...pageObject, contentBlocks: sortNestedBlocks(pageObject.contentBlocks) },
    });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch page." });
  }
};

export const getAdminPages = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { group } = req.query;
    const filter: Record<string, any> = {};
    if (group) filter.group = group;

    const pages = await Page.find(filter).sort({ group: 1, order: 1, title: 1 });
    res.status(200).json({ success: true, pages });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch admin pages." });
  }
};

export const getAdminPageById = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const page = await Page.findById(req.params.id);
    if (!page) {
      res.status(404).json({ success: false, message: "Page not found." });
      return;
    }
    res.status(200).json({ success: true, page });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch page." });
  }
};

export const createAdminPage = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { title, group } = req.body;

    if (!String(title || "").trim() || !allowedGroups.includes(group)) {
      res.status(400).json({ success: false, message: "A valid title and group are required." });
      return;
    }

    const slug = createSlug(title);
    if (!slug) {
      res.status(400).json({ success: false, message: "The page title cannot generate a valid URL slug." });
      return;
    }

    const duplicate = await Page.findOne({ group, slug });
    if (duplicate) {
      res.status(409).json({
        success: false,
        message: "A page with this title already exists in the selected group.",
      });
      return;
    }

    const order = await Page.countDocuments({ group });
    const page = await Page.create({
      title: String(title).trim(),
      slug,
      group,
      subtitle: String(req.body.subtitle || ""),
      bannerImage: sanitizeUrl(req.body.bannerImage),
      shortDescription: String(req.body.shortDescription || ""),
      contentBlocks: normalizeContentBlocks(req.body.contentBlocks),
      buttonLabel: String(req.body.buttonLabel || ""),
      buttonUrl: sanitizeUrl(req.body.buttonUrl),
      metaTitle: String(req.body.metaTitle || ""),
      metaDescription: String(req.body.metaDescription || ""),
      order,
      isPublished: req.body.isPublished ?? true,
    });

    res.status(201).json({ success: true, message: "Page created successfully.", page });
  } catch (error) {
    console.error("Create page error:", error);
    res.status(500).json({ success: false, message: "Failed to create page." });
  }
};

export const updateAdminPage = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const page = await Page.findById(req.params.id);
    if (!page) {
      res.status(404).json({ success: false, message: "Page not found." });
      return;
    }

    const title = String(req.body.title ?? page.title).trim();
    const group = (req.body.group || page.group) as PageGroup;

    if (!title || !allowedGroups.includes(group)) {
      res.status(400).json({ success: false, message: "A valid title and group are required." });
      return;
    }

    const slug = createSlug(title);
    const duplicate = await Page.findOne({
      _id: { $ne: page._id },
      group,
      slug,
    });

    if (duplicate) {
      res.status(409).json({
        success: false,
        message: "Another page with this title already exists in the selected group.",
      });
      return;
    }

    const previousGroup = page.group;
    const previousTitle = page.title;
    const previousUrl = getPublicPageUrl(
      page.group as PageGroup,
      page.slug
    );
    page.title = title;
    page.slug = slug;
    page.group = group;
    page.subtitle = String(req.body.subtitle ?? page.subtitle ?? "");
    page.bannerImage = sanitizeUrl(req.body.bannerImage ?? page.bannerImage ?? "");
    page.shortDescription = String(
      req.body.shortDescription ?? page.shortDescription ?? ""
    );
    if (req.body.contentBlocks !== undefined) {
      page.contentBlocks = normalizeContentBlocks(req.body.contentBlocks) as any;
    }
    page.buttonLabel = String(req.body.buttonLabel ?? page.buttonLabel ?? "");
    page.buttonUrl = sanitizeUrl(req.body.buttonUrl ?? page.buttonUrl ?? "");
    page.metaTitle = String(req.body.metaTitle ?? page.metaTitle ?? "");
    page.metaDescription = String(
      req.body.metaDescription ?? page.metaDescription ?? ""
    );
    page.isPublished = req.body.isPublished ?? page.isPublished;

    if (previousGroup !== group) {
      page.order = await Page.countDocuments({ group });
    }

    await page.save();

    const nextUrl = getPublicPageUrl(group, slug);
    if (previousUrl !== nextUrl || previousTitle !== title) {
      await Menu.updateMany(
        { url: previousUrl, label: previousTitle },
        { $set: { label: title } }
      );
      await Menu.updateMany(
        { url: previousUrl },
        { $set: { url: nextUrl } }
      );
    }

    if (previousGroup !== group) {
      await normalizeGroupOrders(previousGroup as PageGroup);
      await normalizeGroupOrders(group);
    }

    res.status(200).json({ success: true, message: "Page updated successfully.", page });
  } catch (error) {
    console.error("Update page error:", error);
    res.status(500).json({ success: false, message: "Failed to update page." });
  }
};

export const reorderAdminPages = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const group = req.body.group as PageGroup;
    const orderedIds = Array.isArray(req.body.orderedIds)
      ? req.body.orderedIds.map((id: unknown) => String(id))
      : [];

    if (!allowedGroups.includes(group) || !orderedIds.length) {
      res.status(400).json({ success: false, message: "A page group and order list are required." });
      return;
    }

    const count = await Page.countDocuments({ group, _id: { $in: orderedIds } });
    if (count !== orderedIds.length) {
      res.status(400).json({ success: false, message: "All reordered pages must belong to the same group." });
      return;
    }

    await Page.bulkWrite(
      orderedIds.map((id: string, index: number) => ({
        updateOne: { filter: { _id: id, group }, update: { $set: { order: index } } },
      }))
    );

    res.status(200).json({ success: true, message: "Page order updated successfully." });
  } catch (error) {
    console.error("Reorder page error:", error);
    res.status(500).json({ success: false, message: "Failed to reorder pages." });
  }
};

export const deleteAdminPage = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const page = await Page.findById(req.params.id);
    if (!page) {
      res.status(404).json({ success: false, message: "Page not found." });
      return;
    }

    const group = page.group as PageGroup;
    const publicUrl = getPublicPageUrl(group, page.slug);
    await page.deleteOne();
    await Menu.updateMany({ url: publicUrl }, { $set: { isActive: false } });
    await normalizeGroupOrders(group);

    res.status(200).json({ success: true, message: "Page deleted successfully." });
  } catch {
    res.status(500).json({ success: false, message: "Failed to delete page." });
  }
};
