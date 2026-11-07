import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { receiveOjsPdf, requireOjsPdfAuth } from "../controllers/ojsImport.controller";
import { receivePublishedIssue, finalizePublishedIssue, receivePublishedIssueCover } from "../controllers/ojsAutoIssue.controller";

const router = Router();

const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1, fields: 12, parts: 16, fieldSize: 4096 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype === "application/pdf"),
}).single("file");

const uploadPdf = (req: Request, res: Response, next: NextFunction): void => {
  pdfUpload(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      console.error("[OJS PDF] Multipart upload rejected:", error.code);
    }
    next(error);
  });
};

const coverUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 6, parts: 8, fieldSize: 512 },
  fileFilter: (_req, file, cb) => cb(null, ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.mimetype)),
}).single("file");

// The shared token is verified before any PDF or cover is read into memory.
router.post("/pdf", requireOjsPdfAuth, uploadPdf, receiveOjsPdf);
// Authentication + the bounded JSON parser are mounted at app.ts before these handlers.
router.post("/issue", requireOjsPdfAuth, receivePublishedIssue);
router.post("/issue/cover", requireOjsPdfAuth, coverUpload, receivePublishedIssueCover);
router.post("/issue/finalize", requireOjsPdfAuth, finalizePublishedIssue);

export default router;
