import { Router } from "express";
import {
  createAdminArticle,
  deleteAdminArticle,
  discardAdminArticleTempPdf,
  getAdminArticleById,
  getAdminArticles,
  reorderAdminArticles,
  syncAdminAllArticleCitations,
  syncAdminArticleCitation,
  updateAdminArticle,
  uploadAdminArticlePdf,
} from "../controllers/article.controller";
import { protectAdmin } from "../middlewares/adminAuth.middleware";
import { uploadSingleFile } from "../middlewares/upload.middleware";

const router = Router();

router.get("/admin/all", protectAdmin, getAdminArticles);
router.post("/admin/upload-pdf", protectAdmin, uploadSingleFile, uploadAdminArticlePdf);
router.delete("/admin/temp-pdf", protectAdmin, discardAdminArticleTempPdf);
router.post("/admin/sync-citations", protectAdmin, syncAdminAllArticleCitations);
router.patch("/admin/reorder", protectAdmin, reorderAdminArticles);
router.post("/admin/:id/sync-citation", protectAdmin, syncAdminArticleCitation);
router.get("/admin/:id", protectAdmin, getAdminArticleById);
router.post("/admin", protectAdmin, createAdminArticle);
router.put("/admin/:id", protectAdmin, updateAdminArticle);
router.delete("/admin/:id", protectAdmin, deleteAdminArticle);

export default router;
