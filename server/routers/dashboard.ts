import { publicProcedure, router } from "../_core/trpc";
import { getLatestDashboardSnapshot } from "../db";
import { readDashboardExportFromSheets } from "../googleSheetsDashboard";

export const dashboardRouter = router({
  latest: publicProcedure.query(async () => {
    const record = await getLatestDashboardSnapshot();
    if (!record) return null;
    return {
      id: record.id,
      version: record.version,
      sourceReadAtMs: record.sourceReadAtMs,
      resultsAsOf: record.resultsAsOf,
      stockAsOf: record.stockAsOf,
      persistedAt: record.createdAt,
      snapshot: JSON.parse(record.snapshotJson) as unknown,
    };
  }),

  live: publicProcedure.query(async () => {
    try {
      const feed = await readDashboardExportFromSheets();
      return { status: "LIVE" as const, ...feed };
    } catch (error) {
      return {
        status: "DEGRADED_LIVE" as const,
        source: "GOOGLE_SHEETS" as const,
        readAt: new Date().toISOString(),
        metrics: [],
        error: error instanceof Error ? error.message : "Unknown Google Sheets read error",
      };
    }
  }),
});
