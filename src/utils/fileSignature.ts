export type AllowedUploadMimeType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif"
  | "application/pdf"
  | "application/msword"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const startsWithBytes = (
  buffer: Buffer,
  signature: number[]
): boolean => {
  if (buffer.length < signature.length) {
    return false;
  }

  return signature.every(
    (byte, index) => buffer[index] === byte
  );
};

const containsText = (
  buffer: Buffer,
  text: string
): boolean => {
  return buffer.includes(Buffer.from(text, "utf8"));
};

export const detectAllowedUploadMimeType = (
  buffer: Buffer
): AllowedUploadMimeType | null => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) {
    return null;
  }

  // JPEG: FF D8 FF
  if (startsWithBytes(buffer, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }

  // PNG
  if (
    startsWithBytes(buffer, [
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a,
    ])
  ) {
    return "image/png";
  }

  // GIF87a or GIF89a
  const gifHeader = buffer
    .subarray(0, 6)
    .toString("ascii");

  if (
    gifHeader === "GIF87a" ||
    gifHeader === "GIF89a"
  ) {
    return "image/gif";
  }

  // WebP: RIFF....WEBP
  if (
    buffer.subarray(0, 4).toString("ascii") ===
      "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") ===
      "WEBP"
  ) {
    return "image/webp";
  }

  // PDF
  if (
    buffer.subarray(0, 5).toString("ascii") ===
    "%PDF-"
  ) {
    return "application/pdf";
  }

  // Legacy Microsoft Word .doc: OLE Compound File
  if (
    startsWithBytes(buffer, [
      0xd0,
      0xcf,
      0x11,
      0xe0,
      0xa1,
      0xb1,
      0x1a,
      0xe1,
    ])
  ) {
    return "application/msword";
  }

  // DOCX is a ZIP container containing Word structures.
  if (
    startsWithBytes(buffer, [
      0x50,
      0x4b,
      0x03,
      0x04,
    ]) &&
    containsText(buffer, "[Content_Types].xml") &&
    containsText(buffer, "word/")
  ) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  return null;
};