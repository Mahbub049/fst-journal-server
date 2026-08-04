import { Router } from "express";
import {
  changeAdminPassword,
  createAdminAccount,
  deleteAdminAccount,
  getAdminProfile,
  listAdmins,
  loginAdmin,
  logoutAdmin,
  requestAdminPasswordReset,
  resetAdminPassword,
  updateAdminAccount,
  updateAdminProfile,
  verifyAdminOtp,
} from "../controllers/auth.controller";
import { protectAdmin } from "../middlewares/adminAuth.middleware";
import {
  loginRateLimiter,
  otpRateLimiter,
  passwordResetRateLimiter,
} from "../middlewares/rateLimit.middleware";

const router = Router();

router.post("/login", loginRateLimiter, loginAdmin);

router.post(
  "/verify-otp",
  otpRateLimiter,
  verifyAdminOtp
);

router.post(
  "/forgot-password",
  passwordResetRateLimiter,
  requestAdminPasswordReset
);

router.post(
  "/reset-password",
  otpRateLimiter,
  resetAdminPassword
);
router.post("/logout", protectAdmin, logoutAdmin);

router.get("/me", protectAdmin, getAdminProfile);
router.patch("/me", protectAdmin, updateAdminProfile);
router.patch("/me/password", protectAdmin, changeAdminPassword);

router.get("/admins", protectAdmin, listAdmins);
router.post("/admins", protectAdmin, createAdminAccount);
router.patch("/admins/:id", protectAdmin, updateAdminAccount);
router.delete("/admins/:id", protectAdmin, deleteAdminAccount);

export default router;
