import { Router } from "express";
import {
  getAdminProfile,
  loginAdmin,
  requestAdminPasswordReset,
  resetAdminPassword,
  verifyAdminOtp,
} from "../controllers/auth.controller";
import { protectAdmin } from "../middlewares/adminAuth.middleware";

const router = Router();

router.post("/login", loginAdmin);
router.post("/verify-otp", verifyAdminOtp);
router.post("/forgot-password", requestAdminPasswordReset);
router.post("/reset-password", resetAdminPassword);
router.get("/me", protectAdmin, getAdminProfile);

export default router;
