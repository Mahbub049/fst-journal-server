import { Router } from "express";
import { readJournalMetrics, readAdminJournalMetrics, setJournalMetricsEnabled, refreshJournalMetrics } from "../controllers/journalMetrics.controller";
import {
  getAdminHomepage,
  getPublicHomepage,
  updateAdminHomepage,
} from "../controllers/homepage.controller";
import { protectAdmin } from "../middlewares/adminAuth.middleware";

const router = Router();

router.get("/", getPublicHomepage);
router.get("/journal-metrics", readJournalMetrics);
router.get("/admin/journal-metrics", protectAdmin, readAdminJournalMetrics);
router.put("/admin/journal-metrics", protectAdmin, setJournalMetricsEnabled);
router.post("/admin/journal-metrics/refresh", protectAdmin, refreshJournalMetrics);

router.get("/admin", protectAdmin, getAdminHomepage);
router.put("/admin", protectAdmin, updateAdminHomepage);

export default router;