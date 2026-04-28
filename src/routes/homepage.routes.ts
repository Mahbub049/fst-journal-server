import { Router } from "express";
import {
  getAdminHomepage,
  getPublicHomepage,
  updateAdminHomepage,
} from "../controllers/homepage.controller";
import { protectAdmin } from "../middlewares/adminAuth.middleware";

const router = Router();

router.get("/", getPublicHomepage);

router.get("/admin", protectAdmin, getAdminHomepage);
router.put("/admin", protectAdmin, updateAdminHomepage);

export default router;