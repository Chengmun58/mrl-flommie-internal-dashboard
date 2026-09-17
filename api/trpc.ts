import express from "express";
import { initTRPC } from "@trpc/server";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

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
  generatedAt?: string;
  dashboardExport?: Record<string, DashboardExportMetric>;
  dashboardExportMeta?: {
    status?: string;
    retrievedAt?: string;
    error?: string | null;
  };
};

const t = initTRPC.create();
const publicProcedure = t.procedure;

async function readProductionDashboardApi(): Promise<AppsScriptDashboardPayload> {
  const response = await fetch(DASHBOARD_API_URL, {
    method: "GET",
    redirect: "follow",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Apps Script dashboard API returned HTTP ${response.status}`);
  const payload = (await response.json()) as AppsScriptDashboardPayload;
  if (!payload || payload.ok !== true) throw new Error("Apps Script dashboard API did not return ok=true");
  return payload;
}

const appRouter = t.router({
  auth: t.router({
    me: publicProcedure.query(() => null),
  }),
  dashboard: t.router({
    // The legacy home page already has its own embedded fallback snapshot.
    // Keep this endpoint available without requiring the old database runtime.
    latest: publicProcedure.query(() => null),
    live: publicProcedure.query(async () => {
      try {
        const payload = await readProductionDashboardApi();
        return {
          status: payload.dashboardExportMeta?.status === "LIVE" ? "LIVE" : "DEGRADED_LIVE",
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
  }),
});

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use((req, _res, next) => {
  const procedure = req.query.__trpc;
  if (typeof procedure === "string" && procedure) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query)) {
      if (key === "__trpc") continue;
      if (Array.isArray(value)) {
        for (const item of value) params.append(key, String(item));
      } else if (value != null) {
        params.set(key, String(value));
      }
    }
    const query = params.toString();
    req.url = `/${procedure}${query ? `?${query}` : ""}`;
  }
  next();
});

app.use(createExpressMiddleware({ router: appRouter }));

export default app;
