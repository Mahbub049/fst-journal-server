import path from "path";

/**
 * A dedicated persistent directory, independent of source deployment and CMS media.
 * Only final, verified public OJS PDFs are stored here.
 */
export function getOjsPublicPdfRoot(): string {
  const configured = (process.env.OJS_PUBLIC_PDF_DIR || "").trim();
  if (!configured) throw new Error("OJS_PUBLIC_PDF_DIR must be configured before enabling OJS import");
  if (process.env.NODE_ENV === "production" && !path.isAbsolute(configured)) {
    throw new Error("OJS_PUBLIC_PDF_DIR must be absolute in production");
  }
  const root = path.resolve(configured);
  const projectRoot = path.resolve(process.cwd());
  if (process.env.NODE_ENV === "production" &&
      (root === projectRoot || root.startsWith(projectRoot + path.sep))) {
    throw new Error("OJS_PUBLIC_PDF_DIR must be outside the application checkout");
  }
  const publicWebRoot = path.resolve(projectRoot, "public");
  if (root === publicWebRoot || root.startsWith(publicWebRoot + path.sep)) {
    throw new Error("OJS_PUBLIC_PDF_DIR must be outside the Git-managed public directory");
  }
  return root;
}
