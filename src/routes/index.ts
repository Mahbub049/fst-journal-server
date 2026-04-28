import { Router } from "express";
import issueRoutes from "./issue.routes";
import authRoutes from "./auth.routes";
import mediaRoutes from "./media.routes";
import pageRoutes from "./page.routes";
import menuRoutes from "./menu.routes";
import homepageRoutes from "./homepage.routes";
import articleRoutes from "./article.routes";
import editorialBoardRoutes from "./editorialBoard.routes";
import callForPaperRoutes from "./callForPaper.routes";
import siteSettingsRoutes from "./siteSettings.routes";
import searchRoutes from "./search.routes";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "BUP FST Journal API is running",
  });
});

router.use("/issues", issueRoutes);
router.use("/auth", authRoutes);
router.use("/media", mediaRoutes);
router.use("/pages", pageRoutes);
router.use("/menus", menuRoutes);
router.use("/homepage", homepageRoutes);
router.use("/articles", articleRoutes);
router.use("/editorial-board", editorialBoardRoutes);
router.use("/call-for-papers", callForPaperRoutes);
router.use("/site-settings", siteSettingsRoutes);
router.use("/search", searchRoutes);

export default router;