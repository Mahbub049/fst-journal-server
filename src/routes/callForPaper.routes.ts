import { Router } from "express";
import {
  getAdminCallForPaper,
  getPublicCallForPaper,
  updateAdminCallForPaper,
} from "../controllers/callForPaper.controller";
import { protectAdmin } from "../middlewares/adminAuth.middleware";

const router = Router();

router.get("/", getPublicCallForPaper);

router.get("/admin", protectAdmin, getAdminCallForPaper);
router.put("/admin", protectAdmin, updateAdminCallForPaper);

export default router;