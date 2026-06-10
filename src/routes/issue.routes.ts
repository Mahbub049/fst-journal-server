import { Router } from "express";
import {
  createAdminIssue,
  deleteAdminIssue,
  getAdminIssueById,
  getAdminIssues,
  getArticleBySlug,
  getCurrentIssue,
  getHomeArticles,
  getIssueBySlug,
  getPublicIssuesAll,
  getRecentIssues,
  trackArticleDownload,
  updateAdminIssue,
} from "../controllers/issue.controller";
import { protectAdmin } from "../middlewares/adminAuth.middleware";

const router = Router();

/* Admin routes must stay before public dynamic slug routes */
router.get("/admin/all", protectAdmin, getAdminIssues);
router.get("/admin/:id", protectAdmin, getAdminIssueById);
router.post("/admin", protectAdmin, createAdminIssue);
router.put("/admin/:id", protectAdmin, updateAdminIssue);
router.delete("/admin/:id", protectAdmin, deleteAdminIssue);

/* Public routes */
router.get("/recent", getRecentIssues);
router.get("/current", getCurrentIssue);
router.get("/public/all", getPublicIssuesAll);
router.get("/articles/home", getHomeArticles);
router.get(
  "/:issueSlug/articles/:articleSlug/download",
  trackArticleDownload
);
router.get("/:issueSlug/articles/:articleSlug", getArticleBySlug);
router.get("/:slug", getIssueBySlug);

export default router;
