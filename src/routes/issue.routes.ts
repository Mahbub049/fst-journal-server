import { Router } from "express";
import { getRecentIssues } from "../controllers/issue.controller";

const router = Router();

router.get("/recent", getRecentIssues);

export default router;