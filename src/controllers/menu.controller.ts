import { Request, Response } from "express";
import Menu, { MenuLocation } from "../models/Menu.model";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware";

const allowedLocations: MenuLocation[] = [
  "main",
  "about",
  "issues",
  "for-authors",
  "reviewers",
  "editorial-board",
  "footer",
];

const normalizeParentId = (value: unknown) => {
  if (!value) return null;
  if (typeof value === "object" && value && "_id" in value) {
    return String((value as any)._id);
  }
  return String(value);
};

const normalizeMenuPayload = (body: Record<string, any>) => ({
  label: String(body.label || "").trim(),
  location: allowedLocations.includes(body.location) ? body.location : "main",
  type: ["link", "dropdown", "button"].includes(body.type)
    ? body.type
    : "link",
  url: String(body.url || "").trim(),
  parentId: normalizeParentId(body.parentId),
  isExternal: body.isExternal ?? false,
  openInNewTab: body.openInNewTab ?? false,
  isActive: body.isActive ?? true,
});

const getNextOrder = async (location: MenuLocation, parentId: string | null) =>
  Menu.countDocuments({ location, parentId: parentId || null });

const normalizeSiblingOrders = async (
  location: MenuLocation,
  parentId: string | null
) => {
  const siblings = await Menu.find({ location, parentId: parentId || null })
    .sort({ order: 1, createdAt: 1, label: 1 })
    .select("_id");

  if (!siblings.length) return;

  await Menu.bulkWrite(
    siblings.map((menu, index) => ({
      updateOne: {
        filter: { _id: menu._id },
        update: { $set: { order: index } },
      },
    }))
  );
};

const validateParent = async (
  parentId: string | null,
  currentId?: string
) => {
  if (!parentId) return null;

  if (currentId && parentId === currentId) {
    throw new Error("SELF_PARENT");
  }

  const parent = await Menu.findById(parentId);
  if (!parent) throw new Error("PARENT_NOT_FOUND");
  if (parent.type !== "dropdown") throw new Error("PARENT_NOT_DROPDOWN");

  return parent;
};

export const getAdminMenus = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { location, parentId } = req.query;
    const filter: Record<string, any> = {};

    if (location) filter.location = location;
    if (parentId === "root") filter.parentId = null;
    else if (parentId) filter.parentId = parentId;

    const menus = await Menu.find(filter)
      .populate("parentId", "label location type")
      .sort({ location: 1, parentId: 1, order: 1, label: 1 });

    res.status(200).json({ success: true, menus });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch menus." });
  }
};

export const getPublicMenus = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const menus = await Menu.find({ isActive: true })
      .sort({ location: 1, parentId: 1, order: 1, label: 1 })
      .select("-__v");

    res.set("Cache-Control", "no-store");
    res.status(200).json({ success: true, menus });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch menus." });
  }
};

export const getAdminMenuById = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const menu = await Menu.findById(req.params.id).populate(
      "parentId",
      "label location type"
    );

    if (!menu) {
      res.status(404).json({ success: false, message: "Menu item not found." });
      return;
    }

    res.status(200).json({ success: true, menu });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch menu item." });
  }
};

export const createAdminMenu = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const payload = normalizeMenuPayload(req.body);

    if (!payload.label) {
      res.status(400).json({ success: false, message: "Menu label is required." });
      return;
    }

    if (payload.type !== "dropdown" && !payload.url) {
      res.status(400).json({ success: false, message: "Choose linked content or enter a URL." });
      return;
    }

    await validateParent(payload.parentId);

    const order = await getNextOrder(payload.location, payload.parentId);
    const menu = await Menu.create({ ...payload, order });

    res.status(201).json({ success: true, message: "Menu item created successfully.", menu });
  } catch (error: any) {
    if (error?.message === "PARENT_NOT_FOUND") {
      res.status(404).json({ success: false, message: "Parent menu item not found." });
      return;
    }
    if (error?.message === "PARENT_NOT_DROPDOWN") {
      res.status(400).json({ success: false, message: "Only a dropdown item can be selected as a parent." });
      return;
    }
    console.error("Create menu error:", error);
    res.status(500).json({ success: false, message: "Failed to create menu item." });
  }
};

export const updateAdminMenu = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const menu = await Menu.findById(req.params.id);
    if (!menu) {
      res.status(404).json({ success: false, message: "Menu item not found." });
      return;
    }

    const payload = normalizeMenuPayload(req.body);
    if (!payload.label) {
      res.status(400).json({ success: false, message: "Menu label is required." });
      return;
    }
    if (payload.type !== "dropdown" && !payload.url) {
      res.status(400).json({ success: false, message: "Choose linked content or enter a URL." });
      return;
    }

    const previousLocation = menu.location;
    const previousParentId = menu.parentId ? String(menu.parentId) : null;
    await validateParent(payload.parentId, String(menu._id));

    if (menu.type === "dropdown" && payload.type !== "dropdown") {
      const childCount = await Menu.countDocuments({ parentId: menu._id });
      if (childCount > 0) {
        res.status(400).json({
          success: false,
          message: "This parent still contains child items. Move or delete the children before changing its type.",
        });
        return;
      }
    }

    const placementChanged =
      previousLocation !== payload.location || previousParentId !== payload.parentId;

    menu.label = payload.label;
    menu.location = payload.location;
    menu.type = payload.type;
    menu.url = payload.type === "dropdown" ? payload.url || "" : payload.url;
    menu.parentId = payload.parentId as any;
    menu.isExternal = payload.isExternal;
    menu.openInNewTab = payload.openInNewTab;
    menu.isActive = payload.isActive;

    if (placementChanged) {
      menu.order = await getNextOrder(payload.location, payload.parentId);
    }

    await menu.save();

    if (placementChanged) {
      await normalizeSiblingOrders(previousLocation, previousParentId);
      await normalizeSiblingOrders(payload.location, payload.parentId);
    }

    res.status(200).json({ success: true, message: "Menu item updated successfully.", menu });
  } catch (error: any) {
    const messages: Record<string, string> = {
      SELF_PARENT: "A menu item cannot be its own parent.",
      PARENT_NOT_FOUND: "Parent menu item not found.",
      PARENT_NOT_DROPDOWN: "Only a dropdown item can be selected as a parent.",
    };
    if (messages[error?.message]) {
      res.status(error.message === "PARENT_NOT_FOUND" ? 404 : 400).json({
        success: false,
        message: messages[error.message],
      });
      return;
    }
    console.error("Update menu error:", error);
    res.status(500).json({ success: false, message: "Failed to update menu item." });
  }
};

export const reorderAdminMenus = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const location = req.body.location as MenuLocation;
    const parentId = normalizeParentId(req.body.parentId);
    const orderedIds = Array.isArray(req.body.orderedIds)
      ? req.body.orderedIds.map((id: unknown) => String(id))
      : [];

    if (!allowedLocations.includes(location) || !orderedIds.length) {
      res.status(400).json({ success: false, message: "Menu placement and order list are required." });
      return;
    }

    const count = await Menu.countDocuments({
      _id: { $in: orderedIds },
      location,
      parentId: parentId || null,
    });

    if (count !== orderedIds.length) {
      res.status(400).json({ success: false, message: "Only sibling menu items can be reordered together." });
      return;
    }

    await Menu.bulkWrite(
      orderedIds.map((id: string, index: number) => ({
        updateOne: {
          filter: { _id: id },
          update: { $set: { order: index } },
        },
      }))
    );

    res.status(200).json({ success: true, message: "Menu order updated successfully." });
  } catch (error) {
    console.error("Reorder menu error:", error);
    res.status(500).json({ success: false, message: "Failed to reorder menu items." });
  }
};

export const deleteAdminMenu = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const menu = await Menu.findById(req.params.id);
    if (!menu) {
      res.status(404).json({ success: false, message: "Menu item not found." });
      return;
    }

    const childCount = await Menu.countDocuments({ parentId: menu._id });
    if (childCount > 0) {
      res.status(400).json({
        success: false,
        message: "Move or delete child items before deleting this parent menu.",
      });
      return;
    }

    const location = menu.location;
    const parentId = menu.parentId ? String(menu.parentId) : null;
    await menu.deleteOne();
    await normalizeSiblingOrders(location, parentId);

    res.status(200).json({ success: true, message: "Menu item deleted successfully." });
  } catch {
    res.status(500).json({ success: false, message: "Failed to delete menu item." });
  }
};
