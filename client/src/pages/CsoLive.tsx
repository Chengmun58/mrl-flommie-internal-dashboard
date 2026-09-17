import { trpc } from "@/lib/trpc";

const NOT_OBTAINED = "NOT OBTAINED";

function metricValue(metrics: Record<string, any>, key: string) {
  const value = metrics?.[key]?.value;
  return value == null || value === "" ? NOT_OBTAINED : String(value);
}

function metricMeta(metrics: Record<string, any>, key: string) {
  const metric = metrics?.[key];
  if (!metric) return "SOURCE MISSING";
  return [metric.evidenceStatus, metric.pipelineGate, metric.freshness].filter(Boolean).join(" · ") || "SOURCE MISSING";
}

export default function CsoLive() {
  const live = trpc.dashboard.live.useQuery(undefined, {
    retry: 1,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const data = live.data;
  const metrics = (data?.metrics ?? {}) as Record<string, any>;
  const cards = [
    ["New Leads Today", "csoTodayNewLeads"],
    ["Latest Appointment Today", "csoTodayLatestAppt"],
    ["Attended Today", "csoTodayAttended"],
    ["SU Package Today", "csoTodaySuReported"],
    ["Attended → SU Today", "csoTodayAttendedToSu"],
    ["Attended → SU Rate", "csoAttendedToSuRateToday"],
    ["KIV Due Today", "csoTodayKivDue"],
    ["Trial FU Current", "csoTrialFuCurrent"],
    ["SU Package Current", "csoSuPackageCurrent"],
    ["Verified Blast Delivered", "verifiedBlastDeliveredToday"],
    ["Paid Revenue Today", "paidRevenueToday"],
  ];

  return (
    <main style={{ maxWidth: 1440, margin: "0 auto", padding: "32px 24px 64px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 24, alignItems: "flex-end", marginBottom: 28 }}>
        <div>
          <p style={{ margin: 0, opacity: 0.65, fontSize: 13, letterSpacing: ".08em" }}>MUMSRELLE · CSO OPERATIONS</p>
          <h1 style={{ margin: "6px 0 8px", fontSize: 34 }}>Live CSO KPI</h1>
          <p style={{ margin: 0, opacity: 0.7 }}>Casesheet → MRL Results Tracker → Apps Script V1.8 → Dashboard</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <strong>{live.isLoading ? "CONNECTING" : data?.status ?? "DEGRADED_LIVE"}</strong>
          <div style={{ fontSize: 12, opacity: 0.65, marginTop: 5 }}>{data?.readAt ? `Read ${new Date(data.readAt).toLocaleString("en-SG", { timeZone: "Asia/Singapore" })} SGT` : "Waiting for source"}</div>
        </div>
      </header>

      {data?.error ? (
        <section style={{ padding: 16, border: "1px solid currentColor", borderRadius: 12, marginBottom: 22 }}>
          <strong>Live source degraded</strong><div style={{ marginTop: 6 }}>{data.error}</div>
        </section>
      ) : null}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        {cards.map(([label, key]) => (
          <article key={key} style={{ border: "1px solid rgba(127,127,127,.25)", borderRadius: 14, padding: 18, minHeight: 126 }}>
            <div style={{ fontSize: 13, opacity: 0.68 }}>{label}</div>
            <div style={{ fontSize: 31, fontWeight: 700, margin: "10px 0" }}>{metricValue(metrics, key)}</div>
            <div style={{ fontSize: 11, opacity: 0.62 }}>{metricMeta(metrics, key)}</div>
          </article>
        ))}
      </section>

      <section style={{ marginTop: 28, borderTop: "1px solid rgba(127,127,127,.25)", paddingTop: 22 }}>
        <h2 style={{ fontSize: 19, marginBottom: 8 }}>Evidence rules</h2>
        <p style={{ margin: 0, opacity: 0.72, lineHeight: 1.6 }}>
          SU Package is signup evidence, not paid revenue. Missing paid revenue or verified blast delivery remains NOT OBTAINED and is never converted to zero. Appointment count remains provisional where the Casesheet does not separately identify BA/trial type.
        </p>
      </section>
    </main>
  );
}
