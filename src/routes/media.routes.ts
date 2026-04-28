import { Router } from "express";
import {
  deleteMedia,
  getAllMedia,
  uploadMedia,
} from "../controllers/media.controller";
import { protectAdmin } from "../middlewares/adminAuth.middleware";
import { uploadSingleFile } from "../middlewares/upload.middleware";

const router = Router();

router.get("/", protectAdmin, getAllMedia);
router.post("/upload", protectAdmin, uploadSingleFile, uploadMedia);
router.delete("/:id", protectAdmin, deleteMedia);

export default router;