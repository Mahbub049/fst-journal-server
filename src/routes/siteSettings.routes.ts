import { Router } from "express";
import {
  getAdminSiteSettings,
  getPublicSiteSettings,
  updateAdminSiteSettings,
} from "../controllers/siteSettings.controller";
import { protectAdmin } from "../middlewares/adminAuth.middleware";

const router = Router();

router.get("/", getPublicSiteSettings);

router.get("/admin", protectAdmin, getAdminSiteSettings);
router.put("/admin", protectAdmin, updateAdminSiteSettings);

export default router;