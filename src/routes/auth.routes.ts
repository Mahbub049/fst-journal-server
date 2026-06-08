import { Router } from "express";
import {
  getAdminProfile,
  loginAdmin,
  verifyAdminOtp,
} from "../controllers/auth.controller";
import { protectAdmin } from "../middlewares/adminAuth.middleware";

const router = Router();

router.post("/login", loginAdmin);
router.post("/verify-otp", verifyAdminOtp);
router.get("/me", protectAdmin, getAdminProfile);

export default router;
