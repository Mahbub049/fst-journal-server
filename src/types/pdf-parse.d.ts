declare module "pdf-parse" {
  type PdfParseOptions = {
    pagerender?: (pageData: any) => Promise<string> | string;
    max?: number;
    version?: string;
  };

  type PdfParseResult = {
    numpages: number;
    numrender: number;
    info?: Record<string, any>;
    metadata?: any;
    text: string;
    version?: string;
  };

  const pdfParse: (
    dataBuffer: Buffer,
    options?: PdfParseOptions
  ) => Promise<PdfParseResult>;

  export default pdfParse;
}
