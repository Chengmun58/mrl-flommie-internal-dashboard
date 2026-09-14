import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ENV } from "../server/_core/env";
import { getUserByOpenId, insertEvidenceFile, listEvidenceFiles, upsertUser } from "../server/db";
import { storageGetSignedUrl, storagePut } from "../server/storage";

const label = "System verification — full-stack storage 2026-09-14";
const existing = (await listEvidenceFiles(100)).find(item => item.evidenceLabel === label);

if (existing) {
  const signedUrl = await storageGetSignedUrl(existing.storageKey);
  const response = await fetch(signedUrl);
  const body = await response.text();
  console.log(JSON.stringify({ reused: true, id: existing.id, status: response.status, bodyMatches: body.includes("MRL + Flommie file storage verification") }));
  process.exit(0);
}

if (!ENV.ownerOpenId) throw new Error("Owner identity is not configured");
await upsertUser({ openId: ENV.ownerOpenId, name: ENV.ownerName || "Project owner", loginMethod: "system-verification" });
const owner = await getUserByOpenId(ENV.ownerOpenId);
if (!owner) throw new Error("Owner record was not created");

const localPath = "/tmp/mrl-flommie-storage-verification.txt";
await writeFile(localPath, "MRL + Flommie file storage verification\nNon-PII system evidence only.\n", "utf8");
const bytes = await readFile(localPath);
const stored = await storagePut(`mrl-flommie-evidence/${owner.id}/storage-verification.txt`, bytes, "text/plain");
const id = await insertEvidenceFile({
  storageKey: stored.key,
  storageUrl: stored.url,
  originalName: path.basename(localPath),
  mimeType: "text/plain",
  sizeBytes: bytes.length,
  business: "Internal",
  area: "System",
  evidenceLabel: label,
  uploadedByUserId: owner.id,
  uploadedByOpenId: owner.openId,
});
const signedUrl = await storageGetSignedUrl(stored.key);
const response = await fetch(signedUrl);
const body = await response.text();
console.log(JSON.stringify({ reused: false, id, key: stored.key, url: stored.url, status: response.status, bodyMatches: body.includes("MRL + Flommie file storage verification") }));
process.exit(0);
