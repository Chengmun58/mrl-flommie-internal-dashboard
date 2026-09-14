import { publicProcedure, router } from "../_core/trpc";
import { getLatestDashboardSnapshot } from "../db";

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
});
