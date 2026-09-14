import { describe, expect, it } from "vitest";
import { MAX_EVIDENCE_FILE_BYTES, validateEvidenceFile } from "./evidencePolicy";

const encoded = (value: string) => Buffer.from(value).toString("base64");

describe("validateEvidenceFile", () => {
  it("accepts an allowed non-PII text file", () => {
    const result = validateEvidenceFile({
      fileName: "runtime-evidence.txt",
      mimeType: "text/plain",
      base64Data: encoded("non-PII verification evidence"),
      confirmedNoPii: true,
    });
    expect(result.baseName).toBe("runtime-evidence.txt");
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it("rejects upload without the non-PII confirmation", () => {
    expect(() => validateEvidenceFile({
      fileName: "evidence.pdf",
      mimeType: "application/pdf",
      base64Data: encoded("sample"),
      confirmedNoPii: false,
    })).toThrow(/no customer PII/i);
  });

  it("rejects an executable extension", () => {
    expect(() => validateEvidenceFile({
      fileName: "evidence.exe",
      mimeType: "application/octet-stream",
      base64Data: encoded("sample"),
      confirmedNoPii: true,
    })).toThrow(/not allowed/i);
  });

  it("rejects files larger than 10 MB", () => {
    expect(() => validateEvidenceFile({
      fileName: "large.txt",
      mimeType: "text/plain",
      base64Data: Buffer.alloc(MAX_EVIDENCE_FILE_BYTES + 1, 1).toString("base64"),
      confirmedNoPii: true,
    })).toThrow(/10 MB/i);
  });
});
