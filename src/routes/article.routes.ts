import { Router } from "express";
import {
  createAdminArticle,
  deleteAdminArticle,
  getAdminArticleById,
  getAdminArticles,
  reorderAdminArticles,
  updateAdminArticle,
  uploadAdminArticlePdf,
} from "../controllers/article.controller";
import { protectAdmin } from "../middlewares/adminAuth.middleware";
import { uploadSingleFile } from "../middlewares/upload.middleware";

const router = Router();

router.get("/admin/all", protectAdmin, getAdminArticles);
router.post("/admin/upload-pdf", protectAdmin, uploadSingleFile, uploadAdminArticlePdf);
router.patch("/admin/reorder", protectAdmin, reorderAdminArticles);
router.get("/admin/:id", protectAdmin, getAdminArticleById);
router.post("/admin", protectAdmin, createAdminArticle);
router.put("/admin/:id", protectAdmin, updateAdminArticle);
router.delete("/admin/:id", protectAdmin, deleteAdminArticle);

export default router;
