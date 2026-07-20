import { Router } from "express";
import {
  getAdminContactPage,
  getPublicContactPage,
  updateAdminContactPage,
} from "../controllers/contactPage.controller";
import { protectAdmin } from "../middlewares/adminAuth.middleware";

const router = Router();

router.get("/", getPublicContactPage);
router.get("/admin", protectAdmin, getAdminContactPage);
router.put("/admin", protectAdmin, updateAdminContactPage);

export default router;
