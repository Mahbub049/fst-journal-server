import express, { Request, Response, NextFunction } from "express";
import path from "path";
import cors from "cors";
import routes from "./routes";
import { env } from "./config/env";
import { connectDB } from "./config/db";
import { seedAdmin } from "./utils/seedAdmin";
import { bootstrapCms } from "./utils/bootstrapCms";
import { startCitationSyncScheduler } from "./services/citationScheduler.service";

const app = express();

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

const allowedOrigins = Array.from(
  new Set([
    ...env.clientUrls,
    "http://localhost:3000",
    "http://localhost:3001",
    "http://103.121.194.11",
    "http://ijfst.bup.edu.bd",
    "https://ijfst.bup.edu.bd",
    "http://jfst.bup.edu.bd",
    "https://jfst.bup.edu.bd",
  ].filter(Boolean))
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

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
    console.error("Server Error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
);

export default app;
