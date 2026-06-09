import { Router } from "express";
import {
  getAdminCallForPaper,
  getPublicCallForPaper,
  updateAdminCallForPaper,
  uploadAdminCallForPaperPdf,
} from "../controllers/callForPaper.controller";
import { protectAdmin } from "../middlewares/adminAuth.middleware";
import { uploadSingleFile } from "../middlewares/upload.middleware";

const router = Router();

router.get("/", getPublicCallForPaper);

router.get("/admin", protectAdmin, getAdminCallForPaper);
router.put("/admin", protectAdmin, updateAdminCallForPaper);
router.put(
  "/admin/pdf",
  protectAdmin,
  uploadSingleFile,
  uploadAdminCallForPaperPdf
);

export default router;
