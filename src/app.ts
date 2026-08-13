import express, { Request, Response, NextFunction } from "express";
import path from "path";
import cors from "cors";
import routes from "./routes";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { isAllowedClientOrigin } from "./config/origins";
import { seedAdmin } from "./utils/seedAdmin";
import { bootstrapCms } from "./utils/bootstrapCms";
import { startCitationSyncScheduler } from "./services/citationScheduler.service";
import helmet from "helmet";
import multer from "multer";
import cookieParser from "cookie-parser";

const app = express();

if (env.trustProxyHops > 0) {
  app.set("trust proxy", env.trustProxyHops);
}

app.use(cookieParser());
app.disable("x-powered-by");

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

let databaseReadyPromise: Promise<void> | null = null;

const ensureDatabaseReady = () => {
  if (!databaseReadyPromise) {
    databaseReadyPromise = (async () => {
      await connectDB();
      await seedAdmin();
      await bootstrapCms();
      startCitationSyncScheduler();
    })().catch((error) => {
      databaseReadyPromise = null;
      throw error;
    });
  }

  return databaseReadyPromise;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || isAllowedClientOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("REQUEST_ORIGIN_NOT_ALLOWED"));
    },
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "2mb",
    strict: true,
  })
);

app.use(
  express.urlencoded({
    extended: false,
    limit: "2mb",
    parameterLimit: 100,
  })
);

// Serve locally stored public PDFs, for example:
// http://localhost:5000/pdfs/call-for-papers.pdf
app.use(
  "/pdfs",
  express.static(path.join(process.cwd(), "public", "pdfs"), {
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "no-store");
    },
  })
);

app.use(async (_req: Request, _res: Response, next: NextFunction) => {
  try {
    await ensureDatabaseReady();
    next();
  } catch (error) {
    next(error);
  }
});

app.use("/api", routes);

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "BUP FST Journal backend is running",
  });
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "BUP FST Journal API is healthy",
  });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use(
  (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    if (error instanceof multer.MulterError) {
      const isFileTooLarge = error.code === "LIMIT_FILE_SIZE";

      res.status(isFileTooLarge ? 413 : 400).json({
        success: false,
        message: isFileTooLarge
          ? "The uploaded file exceeds the 15 MB limit."
          : "The upload request is invalid.",
      });
      return;
    }

    if (
      error instanceof Error &&
      error.message ===
        "Only JPEG, PNG, WebP, GIF, PDF, DOC, and DOCX files are allowed."
    ) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      return;
    }

    if (
      error instanceof Error &&
      error.message === "REQUEST_ORIGIN_NOT_ALLOWED"
    ) {
      res.status(403).json({
        success: false,
        message: "Forbidden. Request origin is not allowed.",
      });
      return;
    }

    console.error("Server Error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
);

export default app;
