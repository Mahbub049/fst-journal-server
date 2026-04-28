import { Request, Response } from "express";
import Menu from "../models/Menu.model";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware";

const normalizeMenuPayload = (body: Record<string, any>) => {
  return {
    label: body.label,
    location: body.location || "main",
    type: body.type || "link",
    url: body.url || "",
    parentId: body.parentId || null,
    isExternal: body.isExternal ?? false,
    openInNewTab: body.openInNewTab ?? false,
    order: Number(body.order || 0),
    isActive: body.isActive ?? true,
  };
};

export const getAdminMenus = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { location, parentId } = req.query;

    const filter: Record<string, any> = {};

    if (location) {
      filter.location = location;
    }

    if (parentId === "root") {
      filter.parentId = null;
    } else if (parentId) {
      filter.parentId = parentId;
    }

    const menus = await Menu.find(filter)
      .populate("parentId", "label location type")
      .sort({ location: 1, order: 1, label: 1 });

    res.status(200).json({
      success: true,
      menus,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch menus.",
    });
  }
};

export const getPublicMenus = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const menus = await Menu.find({ isActive: true })
      .sort({ location: 1, order: 1, label: 1 })
      .select("-__v");

    res.status(200).json({
      success: true,
      menus,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch menus.",
    });
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
      res.status(404).json({
        success: false,
        message: "Menu item not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      menu,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch menu item.",
    });
  }
};

export const createAdminMenu = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const payload = normalizeMenuPayload(req.body);

    if (!payload.label) {
      res.status(400).json({
        success: false,
        message: "Menu label is required.",
      });
      return;
    }

    if (payload.type !== "dropdown" && !payload.url) {
      res.status(400).json({
        success: false,
        message: "URL is required for link and button menu items.",
      });
      return;
    }

    if (payload.parentId) {
      const parentMenu = await Menu.findById(payload.parentId);

      if (!parentMenu) {
        res.status(404).json({
          success: false,
          message: "Parent menu item not found.",
        });
        return;
      }
    }

    const menu = await Menu.create(payload);

    res.status(201).json({
      success: true,
      message: "Menu item created successfully.",
      menu,
    });
  } catch (error) {
    console.error("Create menu error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create menu item.",
    });
  }
};

export const updateAdminMenu = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const menu = await Menu.findById(req.params.id);

    if (!menu) {
      res.status(404).json({
        success: false,
        message: "Menu item not found.",
      });
      return;
    }

    const payload = normalizeMenuPayload(req.body);

    if (!payload.label) {
      res.status(400).json({
        success: false,
        message: "Menu label is required.",
      });
      return;
    }

    if (payload.type !== "dropdown" && !payload.url) {
      res.status(400).json({
        success: false,
        message: "URL is required for link and button menu items.",
      });
      return;
    }

    if (payload.parentId) {
      if (String(payload.parentId) === String(menu._id)) {
        res.status(400).json({
          success: false,
          message: "A menu item cannot be its own parent.",
        });
        return;
      }

      const parentMenu = await Menu.findById(payload.parentId);

      if (!parentMenu) {
        res.status(404).json({
          success: false,
          message: "Parent menu item not found.",
        });
        return;
      }
    }

    menu.label = payload.label;
    menu.location = payload.location;
    menu.type = payload.type;
    menu.url = payload.url;
    menu.parentId = payload.parentId;
    menu.isExternal = payload.isExternal;
    menu.openInNewTab = payload.openInNewTab;
    menu.order = payload.order;
    menu.isActive = payload.isActive;

    await menu.save();

    res.status(200).json({
      success: true,
      message: "Menu item updated successfully.",
      menu,
    });
  } catch (error) {
    console.error("Update menu error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update menu item.",
    });
  }
};

export const deleteAdminMenu = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const menu = await Menu.findById(req.params.id);

    if (!menu) {
      res.status(404).json({
        success: false,
        message: "Menu item not found.",
      });
      return;
    }

    const childCount = await Menu.countDocuments({ parentId: menu._id });

    if (childCount > 0) {
      res.status(400).json({
        success: false,
        message: "Delete child menu items before deleting this parent item.",
      });
      return;
    }

    await menu.deleteOne();

    res.status(200).json({
      success: true,
      message: "Menu item deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete menu item.",
    });
  }
};