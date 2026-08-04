import multer from "multer";

const storage = multer.memoryStorage();

const allowedReportedMimeTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const uploadSingleFile = multer({
  storage,

  limits: {
    fileSize: 15 * 1024 * 1024,
    files: 1,
    fields: 6,
    parts: 7,
    fieldNameSize: 100,
    fieldSize: 64 * 1024,
    fieldNestingDepth: 2,
  },

  fileFilter: (_req, file, callback) => {
    const reportedMimeType =
      file.mimetype.toLowerCase();

    if (
      allowedReportedMimeTypes.has(
        reportedMimeType
      )
    ) {
      callback(null, true);
      return;
    }

    callback(
      new Error(
        "Only JPEG, PNG, WebP, GIF, PDF, DOC, and DOCX files are allowed."
      )
    );
  },
}).single("file");