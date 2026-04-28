import { Router } from "express";
import {
  createAdminMenu,
  deleteAdminMenu,
  getAdminMenuById,
  getAdminMenus,
  getPublicMenus,
  updateAdminMenu,
} from "../controllers/menu.controller";
import { protectAdmin } from "../middlewares/adminAuth.middleware";

const router = Router();

router.get("/admin/all", protectAdmin, getAdminMenus);
router.get("/admin/:id", protectAdmin, getAdminMenuById);
router.post("/admin", protectAdmin, createAdminMenu);
router.put("/admin/:id", protectAdmin, updateAdminMenu);
router.delete("/admin/:id", protectAdmin, deleteAdminMenu);

router.get("/", getPublicMenus);

export default router;