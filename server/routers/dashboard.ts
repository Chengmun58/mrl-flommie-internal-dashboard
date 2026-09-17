import { publicProcedure, router } from "../_core/trpc";
import { getLatestDashboardSnapshot } from "../db";

const DASHBOARD_API_URL =
  "https://script.google.com/macros/s/AKfycby6oQinLNizPsiwEy-5i95-7JXknUkqYGq4K_24l_WkB8jOnbiE0uMs0B-9NDETmomq/exec?api=dashboard";

type DashboardExportMetric = {
  value: string | null;
  evidenceStatus: string | null;
  pipelineGate: string | null;
  freshness: string | null;
  note: string | null;
};

type AppsScriptDashboardPayload = {
  ok: boolean;
  apiVersion?: string;
  source?: string;
  generatedAt?: string;
  dashboardExport?: Record<string, DashboardExportMetric>;
  dashboardExportMeta?: {
    ok?: boolean;
    status?: "LIVE" | "DEGRADED_LIVE" | string;
    spreadsheetId?: string;
    sheet?: string;
    retrievedAt?: string;
    error?: string | null;
  };
};

async function readProductionDashboardApi(): Promise<AppsScriptDashboardPayload> {
  const response = await fetch(DASHBOARD_API_URL, {
    method: "GET",
    redirect: "follow",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Apps Script dashboard API returned HTTP ${response.status}`);
  }

  const payload = (await response.json()) as AppsScriptDashboardPayload;
  if (!payload || payload.ok !== true) {
    throw new Error("Apps Script dashboard API did not return ok=true");
  }
  return payload;
}

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
      const payload = await readProductionDashboardApi();
      const status = payload.dashboardExportMeta?.status === "LIVE" ? "LIVE" : "DEGRADED_LIVE";
      return {
        status: status as "LIVE" | "DEGRADED_LIVE",
        source: "APPS_SCRIPT_V1_8" as const,
        readAt: payload.dashboardExportMeta?.retrievedAt ?? payload.generatedAt ?? new Date().toISOString(),
        metrics: payload.dashboardExport ?? {},
        sourceMeta: payload.dashboardExportMeta ?? null,
        error: payload.dashboardExportMeta?.error ?? null,
      };
    } catch (error) {
      return {
        status: "DEGRADED_LIVE" as const,
        source: "APPS_SCRIPT_V1_8" as const,
        readAt: new Date().toISOString(),
        metrics: {} as Record<string, DashboardExportMetric>,
        sourceMeta: null,
        error: error instanceof Error ? error.message : "Unknown Apps Script dashboard API error",
      };
    }
  }),
});
