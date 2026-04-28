import { Request, Response } from "express";
import EditorialBoard from "../models/EditorialBoard.model";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware";

const normalizeStringArray = (value: any) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeEditorPayload = (body: Record<string, any>) => {
return {
  category: body.category || "Editorial Board Member",
  editorialArea: body.editorialArea || "General",
  name: body.name || "",
    designation: body.designation || "",
    institution: body.institution || "",
    department: body.department || "",
    expertise: normalizeStringArray(body.expertise),
    profileImage: body.profileImage || "",
    bio: body.bio || "",
    email: body.email || "",
    order: Number(body.order || 0),
    isActive: body.isActive ?? true,
  };
};

/* =========================
   PUBLIC CONTROLLER
========================= */

export const getPublicEditorialBoard = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const editors = await EditorialBoard.find({ isActive: true })
      .sort({ category: 1, order: 1, name: 1 })
      .select("-__v");

    res.status(200).json({
      success: true,
      data: editors,
    });
  } catch (error) {
    console.error("getPublicEditorialBoard error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch editorial board.",
    });
  }
};

/* =========================
   ADMIN CONTROLLERS
========================= */

export const getAdminEditorialBoard = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { search, category, editorialArea, status } = req.query;

    const filter: Record<string, any> = {};

    if (category && category !== "all") {
      filter.category = category;
    }

if (editorialArea && editorialArea !== "all") {
  filter.editorialArea = editorialArea;
}

    if (status === "active") {
      filter.isActive = true;
    }

    if (status === "inactive") {
      filter.isActive = false;
    }

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

    const editors = await EditorialBoard.find(filter).sort({
  category: 1,
  editorialArea: 1,
  order: 1,
  createdAt: -1,
});

    res.status(200).json({
      success: true,
      data: editors,
    });
  } catch (error) {
    console.error("getAdminEditorialBoard error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch editorial board members.",
    });
  }
};

export const getAdminEditorialBoardById = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const editor = await EditorialBoard.findById(req.params.id);

    if (!editor) {
      res.status(404).json({
        success: false,
        message: "Editorial board member not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: editor,
    });
  } catch (error) {
    console.error("getAdminEditorialBoardById error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch editorial board member.",
    });
  }
};

export const createAdminEditorialBoard = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const payload = normalizeEditorPayload(req.body);

    if (!payload.name.trim()) {
      res.status(400).json({
        success: false,
        message: "Editor name is required.",
      });
      return;
    }

    if (!payload.category.trim()) {
      res.status(400).json({
        success: false,
        message: "Editor category is required.",
      });
      return;
    }

    if (!payload.editorialArea.trim()) {
  res.status(400).json({
    success: false,
    message: "Editorial area is required.",
  });
  return;
}

    const editor = await EditorialBoard.create(payload);

    res.status(201).json({
      success: true,
      message: "Editorial board member created successfully.",
      data: editor,
    });
  } catch (error) {
    console.error("createAdminEditorialBoard error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create editorial board member.",
    });
  }
};

export const updateAdminEditorialBoard = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const editor = await EditorialBoard.findById(req.params.id);

    if (!editor) {
      res.status(404).json({
        success: false,
        message: "Editorial board member not found.",
      });
      return;
    }

    const payload = normalizeEditorPayload(req.body);

    if (!payload.name.trim()) {
      res.status(400).json({
        success: false,
        message: "Editor name is required.",
      });
      return;
    }

    if (!payload.category.trim()) {
      res.status(400).json({
        success: false,
        message: "Editor category is required.",
      });
      return;
    }

    editor.set(payload);
    await editor.save();

    res.status(200).json({
      success: true,
      message: "Editorial board member updated successfully.",
      data: editor,
    });
  } catch (error) {
    console.error("updateAdminEditorialBoard error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update editorial board member.",
    });
  }
};

export const deleteAdminEditorialBoard = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const editor = await EditorialBoard.findById(req.params.id);

    if (!editor) {
      res.status(404).json({
        success: false,
        message: "Editorial board member not found.",
      });
      return;
    }

    await editor.deleteOne();

    res.status(200).json({
      success: true,
      message: "Editorial board member deleted successfully.",
    });
  } catch (error) {
    console.error("deleteAdminEditorialBoard error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete editorial board member.",
    });
  }
};