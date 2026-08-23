import { Router } from "express";
import {
  getAdminSiteSettings,
  getPublicSiteSettings,
  updateAdminSiteSettings,
} from "../controllers/siteSettings.controller";
import {
  getAdminNavbarLegacyLink,
  getPublicNavbarLegacyLink,
  updateAdminNavbarLegacyLink,
} from "../controllers/navbarLegacyLink.controller";
import { protectAdmin } from "../middlewares/adminAuth.middleware";

const router = Router();

router.get("/", getPublicSiteSettings);

router.get("/navbar-link", getPublicNavbarLegacyLink);
router.get("/navbar-link/admin", protectAdmin, getAdminNavbarLegacyLink);
router.put("/navbar-link/admin", protectAdmin, updateAdminNavbarLegacyLink);

router.get("/admin", protectAdmin, getAdminSiteSettings);
router.put("/admin", protectAdmin, updateAdminSiteSettings);

export default router;
