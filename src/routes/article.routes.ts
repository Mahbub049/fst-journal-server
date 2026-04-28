import { Router } from "express";
import {
  createAdminArticle,
  deleteAdminArticle,
  getAdminArticleById,
  getAdminArticles,
  updateAdminArticle,
} from "../controllers/article.controller";
import { protectAdmin } from "../middlewares/adminAuth.middleware";

const router = Router();

router.get("/admin/all", protectAdmin, getAdminArticles);
router.get("/admin/:id", protectAdmin, getAdminArticleById);
router.post("/admin", protectAdmin, createAdminArticle);
router.put("/admin/:id", protectAdmin, updateAdminArticle);
router.delete("/admin/:id", protectAdmin, deleteAdminArticle);

export default router;