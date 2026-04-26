import { Router } from "express";
import issueRoutes from "./issue.routes";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "BUP FST Journal API is running",
  });
});

router.use("/issues", issueRoutes);

export default router;