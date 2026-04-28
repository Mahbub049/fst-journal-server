import { Router } from "express";
import {
  createAdminEditorialBoard,
  deleteAdminEditorialBoard,
  getAdminEditorialBoard,
  getAdminEditorialBoardById,
  getPublicEditorialBoard,
  updateAdminEditorialBoard,
} from "../controllers/editorialBoard.controller";
import { protectAdmin } from "../middlewares/adminAuth.middleware";

const router = Router();

router.get("/admin/all", protectAdmin, getAdminEditorialBoard);
router.get("/admin/:id", protectAdmin, getAdminEditorialBoardById);
router.post("/admin", protectAdmin, createAdminEditorialBoard);
router.put("/admin/:id", protectAdmin, updateAdminEditorialBoard);
router.delete("/admin/:id", protectAdmin, deleteAdminEditorialBoard);

router.get("/", getPublicEditorialBoard);

export default router;