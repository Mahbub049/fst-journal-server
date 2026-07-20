import { Request, Response } from "express";
import EditorialBoard from "../models/EditorialBoard.model";
import Menu from "../models/Menu.model";
import EditorialBoardPage from "../models/EditorialBoardPage.model";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware";

const defaultCategories = [
  { name: "Chief Patron", description: "", order: 0, isActive: true, showInSummary: true },
  { name: "Chief Editor", description: "", order: 1, isActive: true, showInSummary: true },
  { name: "Editor", description: "", order: 2, isActive: true, showInSummary: true },
  { name: "Assistant Editor", description: "", order: 3, isActive: true, showInSummary: true },
  { name: "Editorial Advisory Board", description: "", order: 4, isActive: true, showInSummary: true },
];

const defaultAreas = [
  { name: "Journal Leadership", description: "", order: 0, isActive: true },
  { name: "Assistant Editorial Team", description: "", order: 1, isActive: true },
  { name: "Editorial Advisory Board", description: "", order: 2, isActive: true },
  { name: "General", description: "", order: 3, isActive: true },
];

const createAnchorSlug = (value: string) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getEditorialRoleUrl = (name: string) =>
  `/editorial-board#${createAnchorSlug(name)}`;

const normalizeStringArray = (value: any) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

const normalizeEditorPayload = (body: Record<string, any>) => {
  const payload: Record<string, any> = {
    category: String(body.category || "Editorial Board Member").trim(),
    editorialArea: String(body.editorialArea || "General").trim(),
    name: String(body.name || "").trim(),
    designation: String(body.designation || "").trim(),
    institution: String(body.institution || "").trim(),
    department: String(body.department || "").trim(),
    expertise: normalizeStringArray(body.expertise),
    profileImage: String(body.profileImage || "").trim(),
    bio: String(body.bio || "").trim(),
    email: String(body.email || "").trim(),
    professionalProfileUrl: String(body.professionalProfileUrl || "").trim(),
    biographyUrl: String(body.biographyUrl || "").trim(),
    professionalProfileLabel: String(body.professionalProfileLabel || "").trim(),
    biographyLabel: String(body.biographyLabel || "View Full Biography").trim(),
    isActive: body.isActive ?? true,
  };

  if (body.order !== undefined && body.order !== null && body.order !== "") {
    payload.order = Number(body.order || 0);
  }

  return payload;
};

const normalizeTaxonomy = (items: any, kind: "category" | "area") => {
  const fallback = kind === "category" ? defaultCategories : defaultAreas;
  const source = Array.isArray(items) ? items : fallback;
  const seen = new Set<string>();

  return source
    .map((item: any, index: number) => ({
      ...(item?._id ? { _id: item._id } : {}),
      name: String(item?.name || "").trim(),
      description: String(item?.description || "").trim(),
      order: index,
      isActive: item?.isActive ?? true,
      ...(kind === "category"
        ? { showInSummary: item?.showInSummary ?? true }
        : {}),
    }))
    .filter((item: any) => {
      const key = item.name.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const getOrCreateBoardPage = async () => {
  let config = await EditorialBoardPage.findOne().sort({ updatedAt: -1 });
  if (!config) {
    config = await EditorialBoardPage.create({
      categories: defaultCategories,
      editorialAreas: defaultAreas,
    });
  }

  let changed = false;
  const existingCategories = new Set(
    (config.categories || []).map((item) => item.name.toLowerCase())
  );
  const existingAreas = new Set(
    (config.editorialAreas || []).map((item) => item.name.toLowerCase())
  );

  const members = await EditorialBoard.find({}).select("category editorialArea");
  members.forEach((member) => {
    const category = String(member.category || "").trim();
    const area = String(member.editorialArea || "").trim();
    if (category && !existingCategories.has(category.toLowerCase())) {
      config!.categories.push({
        name: category,
        description: "",
        order: config!.categories.length,
        isActive: true,
        showInSummary: true,
      } as any);
      existingCategories.add(category.toLowerCase());
      changed = true;
    }
    if (area && !existingAreas.has(area.toLowerCase())) {
      config!.editorialAreas.push({
        name: area,
        description: "",
        order: config!.editorialAreas.length,
        isActive: true,
      } as any);
      existingAreas.add(area.toLowerCase());
      changed = true;
    }
  });

  if (changed) await config.save();
  return config;
};

export const getPublicEditorialBoard = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const config = await getOrCreateBoardPage();
    const categoryOrder = new Map(
      config.categories.map((item, index) => [item.name.toLowerCase(), index])
    );

    const editors = await EditorialBoard.find({ isActive: true }).select("-__v");
    editors.sort((a, b) => {
      const categoryA = categoryOrder.get(a.category.toLowerCase()) ?? 999;
      const categoryB = categoryOrder.get(b.category.toLowerCase()) ?? 999;
      if (categoryA !== categoryB) return categoryA - categoryB;
      if (a.order !== b.order) return a.order - b.order;
      return a.name.localeCompare(b.name);
    });

    res.set("Cache-Control", "no-store");
    res.status(200).json({ success: true, data: editors });
  } catch (error) {
    console.error("getPublicEditorialBoard error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch editorial board." });
  }
};

export const getPublicEditorialBoardById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id.match(/^[a-fA-F0-9]{24}$/)) {
      res.status(404).json({ success: false, message: "Editorial board member not found." });
      return;
    }

    const editor = await EditorialBoard.findOne({ _id: id, isActive: true }).select("-__v");
    if (!editor) {
      res.status(404).json({ success: false, message: "Editorial board member not found." });
      return;
    }

    res.set("Cache-Control", "no-store");
    res.status(200).json({ success: true, data: editor });
  } catch (error) {
    console.error("getPublicEditorialBoardById error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch editorial board member." });
  }
};

export const getPublicEditorialBoardConfig = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const config = await getOrCreateBoardPage();
    res.set("Cache-Control", "no-store");
    res.status(200).json({ success: true, data: config });
  } catch (error) {
    console.error("getPublicEditorialBoardConfig error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch editorial board page settings." });
  }
};

export const getAdminEditorialBoardConfig = async (
  _req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const config = await getOrCreateBoardPage();
    res.status(200).json({ success: true, data: config });
  } catch (error) {
    console.error("getAdminEditorialBoardConfig error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch editorial board page settings." });
  }
};

export const updateAdminEditorialBoardConfig = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const config = await getOrCreateBoardPage();
    const categories = normalizeTaxonomy(req.body.categories, "category");
    const editorialAreas = normalizeTaxonomy(req.body.editorialAreas, "area");

    const currentCategories = new Map(
      config.categories.map((item: any) => [String(item._id), item.name])
    );
    const currentAreas = new Map(
      config.editorialAreas.map((item: any) => [String(item._id), item.name])
    );
    const incomingCategoryIds = new Set(
      categories.filter((item: any) => item._id).map((item: any) => String(item._id))
    );
    const incomingAreaIds = new Set(
      editorialAreas.filter((item: any) => item._id).map((item: any) => String(item._id))
    );

    for (const [id, oldName] of currentCategories) {
      if (!incomingCategoryIds.has(id)) {
        const assignedCount = await EditorialBoard.countDocuments({ category: oldName });
        if (assignedCount > 0) {
          res.status(400).json({
            success: false,
            message: `The role "${oldName}" is assigned to ${assignedCount} member(s). Reassign them before deleting the role.`,
          });
          return;
        }

        await Menu.updateMany(
          { url: getEditorialRoleUrl(oldName) },
          { $set: { isActive: false } }
        );
      }
    }

    for (const [id, oldName] of currentAreas) {
      if (!incomingAreaIds.has(id)) {
        const assignedCount = await EditorialBoard.countDocuments({ editorialArea: oldName });
        if (assignedCount > 0) {
          res.status(400).json({
            success: false,
            message: `The editorial area "${oldName}" is assigned to ${assignedCount} member(s). Reassign them before deleting the area.`,
          });
          return;
        }
      }
    }

    for (const item of categories as any[]) {
      const oldName = item._id ? currentCategories.get(String(item._id)) : undefined;
      if (oldName && oldName !== item.name) {
        await EditorialBoard.updateMany(
          { category: oldName },
          { $set: { category: item.name } }
        );
        await Menu.updateMany(
          { url: getEditorialRoleUrl(oldName), label: oldName },
          { $set: { label: item.name } }
        );
        await Menu.updateMany(
          { url: getEditorialRoleUrl(oldName) },
          { $set: { url: getEditorialRoleUrl(item.name) } }
        );
      }
    }

    for (const item of editorialAreas as any[]) {
      const oldName = item._id ? currentAreas.get(String(item._id)) : undefined;
      if (oldName && oldName !== item.name) {
        await EditorialBoard.updateMany(
          { editorialArea: oldName },
          { $set: { editorialArea: item.name } }
        );
      }
    }

    config.set({
      eyebrow: String(req.body.eyebrow || "Editorial Leadership").trim(),
      pageTitle: String(req.body.pageTitle || "Editorial Board").trim(),
      intro: String(req.body.intro || "").trim(),
      summaryEyebrow: String(req.body.summaryEyebrow || "Board Summary").trim(),
      summaryTitle: String(req.body.summaryTitle || "Editorial Review Structure").trim(),
      summaryDescription: String(req.body.summaryDescription || "").trim(),
      chiefEditorResponsibilityTitle: String(
        req.body.chiefEditorResponsibilityTitle || "Chief Editor Responsibilities"
      ).trim(),
      chiefEditorResponsibilityDescription: String(
        req.body.chiefEditorResponsibilityDescription || ""
      ).trim(),
      showSummaryCards: req.body.showSummaryCards ?? true,
      showTotalCard: req.body.showTotalCard ?? true,
      editorialOfficeTitle: String(req.body.editorialOfficeTitle || "Editorial Office").trim(),
      editorialOfficeDescription: String(req.body.editorialOfficeDescription || "").trim(),
      editorialOfficePublisher: String(req.body.editorialOfficePublisher || "").trim(),
      editorialOfficeInstitution: String(req.body.editorialOfficeInstitution || "").trim(),
      editorialOfficeAddress: String(req.body.editorialOfficeAddress || "").trim(),
      editorialOfficeEmail: String(req.body.editorialOfficeEmail || "").trim(),
      editorialOfficePhone: String(req.body.editorialOfficePhone || "").trim(),
      categories,
      editorialAreas,
    });
    await config.save();

    res.status(200).json({
      success: true,
      message: "Editorial board page settings updated successfully.",
      data: config,
    });
  } catch (error) {
    console.error("updateAdminEditorialBoardConfig error:", error);
    res.status(500).json({ success: false, message: "Failed to update editorial board page settings." });
  }
};

export const getAdminEditorialBoard = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { search, category, editorialArea, status } = req.query;
    const filter: Record<string, any> = {};

    if (category && category !== "all") filter.category = category;
    if (editorialArea && editorialArea !== "all") filter.editorialArea = editorialArea;
    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { editorialArea: { $regex: search, $options: "i" } },
        { designation: { $regex: search, $options: "i" } },
        { institution: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
        { expertise: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const config = await getOrCreateBoardPage();
    const categoryOrder = new Map(
      config.categories.map((item, index) => [item.name.toLowerCase(), index])
    );
    const editors = await EditorialBoard.find(filter);
    editors.sort((a, b) => {
      const categoryA = categoryOrder.get(a.category.toLowerCase()) ?? 999;
      const categoryB = categoryOrder.get(b.category.toLowerCase()) ?? 999;
      if (categoryA !== categoryB) return categoryA - categoryB;
      if (a.order !== b.order) return a.order - b.order;
      return a.name.localeCompare(b.name);
    });

    res.status(200).json({ success: true, data: editors });
  } catch (error) {
    console.error("getAdminEditorialBoard error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch editorial board members." });
  }
};

export const getAdminEditorialBoardById = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const editor = await EditorialBoard.findById(req.params.id);
    if (!editor) {
      res.status(404).json({ success: false, message: "Editorial board member not found." });
      return;
    }
    res.status(200).json({ success: true, data: editor });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch editorial board member." });
  }
};

export const createAdminEditorialBoard = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const payload = normalizeEditorPayload(req.body);
    if (!payload.name || !payload.category || !payload.editorialArea) {
      res.status(400).json({ success: false, message: "Name, category, and editorial area are required." });
      return;
    }

    const order = await EditorialBoard.countDocuments({ category: payload.category });
    const editor = await EditorialBoard.create({ ...payload, order });
    await getOrCreateBoardPage();

    res.status(201).json({ success: true, message: "Editorial board member created successfully.", data: editor });
  } catch (error) {
    console.error("createAdminEditorialBoard error:", error);
    res.status(500).json({ success: false, message: "Failed to create editorial board member." });
  }
};

export const updateAdminEditorialBoard = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const editor = await EditorialBoard.findById(req.params.id);
    if (!editor) {
      res.status(404).json({ success: false, message: "Editorial board member not found." });
      return;
    }

    const payload = normalizeEditorPayload(req.body);
    if (!payload.name || !payload.category || !payload.editorialArea) {
      res.status(400).json({ success: false, message: "Name, category, and editorial area are required." });
      return;
    }

    const previousCategory = editor.category;
    if (payload.category !== previousCategory) {
      payload.order = await EditorialBoard.countDocuments({ category: payload.category });
    } else if (payload.order === undefined) {
      delete payload.order;
    }

    editor.set(payload);
    await editor.save();
    await getOrCreateBoardPage();

    res.status(200).json({ success: true, message: "Editorial board member updated successfully.", data: editor });
  } catch (error) {
    console.error("updateAdminEditorialBoard error:", error);
    res.status(500).json({ success: false, message: "Failed to update editorial board member." });
  }
};

export const reorderAdminEditorialBoard = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const orderedIds = Array.isArray(req.body.orderedIds)
      ? req.body.orderedIds.map((id: any) => String(id))
      : [];
    if (!orderedIds.length) {
      res.status(400).json({ success: false, message: "Editorial board order list is required." });
      return;
    }

    const members = await EditorialBoard.find({ _id: { $in: orderedIds } });
    const map = new Map(members.map((member) => [String(member._id), member]));
    const counters: Record<string, number> = {};
    const operations = orderedIds
      .map((id: string) => {
        const member = map.get(id);
        if (!member) return null;
        const category = member.category || "Editorial Board Member";
        const order = counters[category] || 0;
        counters[category] = order + 1;
        return { updateOne: { filter: { _id: id }, update: { $set: { order } } } };
      })
      .filter(Boolean);

    if (operations.length) await EditorialBoard.bulkWrite(operations as any[]);
    res.status(200).json({ success: true, message: "Editorial board order updated successfully." });
  } catch (error) {
    console.error("reorderAdminEditorialBoard error:", error);
    res.status(500).json({ success: false, message: "Failed to update editorial board order." });
  }
};

export const deleteAdminEditorialBoard = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const editor = await EditorialBoard.findById(req.params.id);
    if (!editor) {
      res.status(404).json({ success: false, message: "Editorial board member not found." });
      return;
    }
    await editor.deleteOne();
    res.status(200).json({ success: true, message: "Editorial board member deleted successfully." });
  } catch {
    res.status(500).json({ success: false, message: "Failed to delete editorial board member." });
  }
};
