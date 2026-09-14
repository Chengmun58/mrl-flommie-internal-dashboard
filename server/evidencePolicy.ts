import path from "node:path";

export const MAX_EVIDENCE_FILE_BYTES = 10 * 1024 * 1024;

const allowedTypes = new Map<string, Set<string>>([
  ["application/pdf", new Set([".pdf"])],
  ["text/csv", new Set([".csv"])],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", new Set([".xlsx"])],
  ["image/png", new Set([".png"])],
  ["image/jpeg", new Set([".jpg", ".jpeg"])],
  ["image/webp", new Set([".webp"])],
  ["text/plain", new Set([".txt"])],
]);

export function validateEvidenceFile(input: {
  fileName: string;
  mimeType: string;
  base64Data: string;
  confirmedNoPii: boolean;
}) {
  if (!input.confirmedNoPii) throw new Error("Confirm that the file contains no customer PII before upload.");

  const baseName = path.basename(input.fileName).trim();
  if (!baseName || baseName !== input.fileName.trim() || baseName.length > 255) {
    throw new Error("Invalid file name.");
  }

  const allowedExtensions = allowedTypes.get(input.mimeType);
  const extension = path.extname(baseName).toLowerCase();
  if (!allowedExtensions?.has(extension)) {
    throw new Error("File type is not allowed. Use PDF, CSV, XLSX, PNG, JPG, WEBP, or TXT.");
  }

  const normalizedBase64 = input.base64Data.replace(/\s/g, "");
  if (!normalizedBase64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalizedBase64)) {
    throw new Error("Invalid file payload.");
  }

  const bytes = Buffer.from(normalizedBase64, "base64");
  if (bytes.length === 0) throw new Error("The selected file is empty.");
  if (bytes.length > MAX_EVIDENCE_FILE_BYTES) throw new Error("File exceeds the 10 MB limit.");

  const safeName = baseName.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!safeName) throw new Error("File name cannot be normalized safely.");

  return { bytes, safeName, baseName };
}
