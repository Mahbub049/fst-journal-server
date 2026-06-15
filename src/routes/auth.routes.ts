import { Router } from "express";
import {
  changeAdminPassword,
  createAdminAccount,
  deleteAdminAccount,
  getAdminProfile,
  listAdmins,
  loginAdmin,
  requestAdminPasswordReset,
  resetAdminPassword,
  updateAdminAccount,
  updateAdminProfile,
  verifyAdminOtp,
} from "../controllers/auth.controller";
import { protectAdmin } from "../middlewares/adminAuth.middleware";

const router = Router();

router.post("/login", loginAdmin);
router.post("/verify-otp", verifyAdminOtp);
router.post("/forgot-password", requestAdminPasswordReset);
router.post("/reset-password", resetAdminPassword);

router.get("/me", protectAdmin, getAdminProfile);
router.patch("/me", protectAdmin, updateAdminProfile);
router.patch("/me/password", protectAdmin, changeAdminPassword);

router.get("/admins", protectAdmin, listAdmins);
router.post("/admins", protectAdmin, createAdminAccount);
router.patch("/admins/:id", protectAdmin, updateAdminAccount);
router.delete("/admins/:id", protectAdmin, deleteAdminAccount);

export default router;
