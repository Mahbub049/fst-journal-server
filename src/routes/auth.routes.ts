import { Router } from "express";
import { getAdminProfile, loginAdmin } from "../controllers/auth.controller";
import { protectAdmin } from "../middlewares/adminAuth.middleware";

const router = Router();

router.post("/login", loginAdmin);
router.get("/me", protectAdmin, getAdminProfile);

export default router;