import { Router } from "express";
import {
  createAdminEditorialBoard,
  deleteAdminEditorialBoard,
  getAdminEditorialBoard,
  getAdminEditorialBoardById,
  getAdminEditorialBoardConfig,
  getPublicEditorialBoard,
  getPublicEditorialBoardById,
  getPublicEditorialBoardConfig,
  reorderAdminEditorialBoard,
  updateAdminEditorialBoard,
  updateAdminEditorialBoardConfig,
} from "../controllers/editorialBoard.controller";
import { protectAdmin } from "../middlewares/adminAuth.middleware";

const router = Router();

router.get("/admin/config", protectAdmin, getAdminEditorialBoardConfig);
router.put("/admin/config", protectAdmin, updateAdminEditorialBoardConfig);
router.get("/admin/all", protectAdmin, getAdminEditorialBoard);
router.put("/admin/reorder", protectAdmin, reorderAdminEditorialBoard);
router.get("/admin/:id", protectAdmin, getAdminEditorialBoardById);
router.post("/admin", protectAdmin, createAdminEditorialBoard);
router.put("/admin/:id", protectAdmin, updateAdminEditorialBoard);
router.delete("/admin/:id", protectAdmin, deleteAdminEditorialBoard);

router.get("/config", getPublicEditorialBoardConfig);
router.get("/:id", getPublicEditorialBoardById);
router.get("/", getPublicEditorialBoard);

export default router;
