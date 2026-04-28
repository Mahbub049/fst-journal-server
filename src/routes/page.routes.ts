import { Router } from "express";
import {
  createAdminPage,
  deleteAdminPage,
  getAdminPageById,
  getAdminPages,
  getPublicPageByGroupAndSlug,
  getPublicPages,
  updateAdminPage,
} from "../controllers/page.controller";
import { protectAdmin } from "../middlewares/adminAuth.middleware";

const router = Router();

router.get("/admin/all", protectAdmin, getAdminPages);
router.get("/admin/:id", protectAdmin, getAdminPageById);
router.post("/admin", protectAdmin, createAdminPage);
router.put("/admin/:id", protectAdmin, updateAdminPage);
router.delete("/admin/:id", protectAdmin, deleteAdminPage);

router.get("/", getPublicPages);
router.get("/:group/:slug", getPublicPageByGroupAndSlug);

export default router;