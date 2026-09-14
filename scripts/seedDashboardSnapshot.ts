import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { persistDashboardSnapshot } from "../server/db";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const snapshotPath = path.join(root, "client/src/data/snapshot.json");
const raw = await readFile(snapshotPath, "utf8");
const snapshot = JSON.parse(raw);
const sourceReadAtMs = new Date(snapshot.meta.generatedAt).getTime();

await persistDashboardSnapshot({
  snapshotKey: `manual-${snapshot.meta.generatedAt}`,
  version: "2026-09-14-v2",
  sourceReadAtMs,
  resultsAsOf: snapshot.mrlResults.asOf,
  stockAsOf: snapshot.stock.asOf,
  snapshotJson: raw,
  isActive: 1,
});

console.log(JSON.stringify({
  seeded: true,
  snapshotKey: `manual-${snapshot.meta.generatedAt}`,
  registryCounts: snapshot.automation.registryCounts,
  evidenceGateCounts: snapshot.automation.evidenceGateCounts,
}));
