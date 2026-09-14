import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Box,
  CalendarClock,
  Check,
  ChevronRight,
  CircleAlert,
  Database,
  FileCheck2,
  Filter,
  Gauge,
  Menu,
  Moon,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  TestTube2,
  X,
  Zap,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import snapshot from "../data/snapshot.json";
import { useTheme } from "../contexts/ThemeContext";

type DetailItem = {
  kind: "action" | "automation" | "source";
  title: string;
  subtitle?: string;
  rows: Array<{ label: string; value: string }>;
  sourceUrl?: string;
  testSourceUrl?: string;
};

const NOT_OBTAINED = "NOT OBTAINED";

const navItems = [
  { id: "today", label: "Today", icon: Gauge },
  { id: "results", label: "MRL Results", icon: BarChart3 },
  { id: "stock", label: "Flommie Stock", icon: Box },
  { id: "automation", label: "Automation", icon: Zap },
  { id: "sources", label: "Sources", icon: Database },
];

const money = (value: number | null | undefined, currency = "SGD") =>
  value == null
    ? NOT_OBTAINED
    : new Intl.NumberFormat("en-SG", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(value);

const number = (value: number | null | undefined) =>
  value == null ? NOT_OBTAINED : new Intl.NumberFormat("en-SG").format(value);

const percent = (value: number | null | undefined) =>
  value == null ? NOT_OBTAINED : `${(value * 100).toFixed(1)}%`;

const dateLabel = (value: string | null | undefined) => {
  if (!value) return NOT_OBTAINED;
  const date = new Date(`${value}T00:00:00+08:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Singapore",
  }).format(date);
};

const readTime = new Intl.DateTimeFormat("en-SG", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Singapore",
}).format(new Date(snapshot.meta.generatedAt));

function statusTone(label: string) {
  const value = label.toUpperCase();
  if (/(PHYSICAL UNVERIFIED|SOURCE MISSING|FAIL|BLOCKED|NOT OBTAINED|NOT RUN|UNVERIFIED)/.test(value)) return "danger";
  if (/(PROVISIONAL|PENDING|PARTIAL|REVIEW|ON HOLD|PLANNED|READY TO BUILD)/.test(value)) return "warning";
  if (/(READABLE|CONFIRMED|PASS|APPROVED|ACTIVE|VERIFIED)/.test(value)) return "success";
  return "neutral";
}

function StatusBadge({ children }: { children: string }) {
  const tone = statusTone(children);
  return (
    <span className={`status-badge status-${tone}`}>
      <span className="status-dot" aria-hidden="true" />
      {children}
    </span>
  );
}

function SourceButton({ href, label = "Open source" }: { href: string; label?: string }) {
  return (
    <a className="source-button" href={href} target="_blank" rel="noreferrer">
      {label}
      <ArrowUpRight size={14} aria-hidden="true" />
    </a>
  );
}

function MetricCard({
  label,
  value,
  meta,
  accent,
}: {
  label: string;
  value: string;
  meta: string;
  accent?: "confirmed" | "provisional" | "neutral";
}) {
  return (
    <article className={`metric-card metric-${accent ?? "neutral"}`}>
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
      <span className="metric-meta">{meta}</span>
    </article>
  );
}

function EmptyValue({ label = NOT_OBTAINED }: { label?: string }) {
  return <span className="empty-value">{label}</span>;
}

function SectionHeading({
  title,
  description,
  meta,
}: {
  title: string;
  description: string;
  meta?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {meta ? <span className="section-meta">{meta}</span> : null}
    </div>
  );
}

function DetailDrawer({ item, onClose }: { item: DetailItem | null; onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!item) return;
    previousFocusRef.current = document.activeElement as HTMLElement;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [item, onClose]);

  if (!item) return null;
  return (
    <div className="drawer-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <div className="drawer-header">
          <div>
            <span className="drawer-kind">{item.kind}</span>
            <h2 id="drawer-title">{item.title}</h2>
            {item.subtitle ? <p>{item.subtitle}</p> : null}
          </div>
          <button ref={closeButtonRef} className="icon-button" onClick={onClose} aria-label="Close details">
            <X size={19} />
          </button>
        </div>
        <div className="drawer-content">
          {item.rows.map((row) => (
            <div className="evidence-row" key={`${row.label}-${row.value}`}>
              <span>{row.label}</span>
              <strong>{row.value || NOT_OBTAINED}</strong>
            </div>
          ))}
        </div>
        <div className="drawer-footer">
          {item.sourceUrl ? <SourceButton href={item.sourceUrl} label="Open primary source" /> : null}
          {item.testSourceUrl ? <SourceButton href={item.testSourceUrl} label="Open test evidence" /> : null}
        </div>
      </aside>
    </div>
  );
}

function Filters({
  business,
  area,
  priority,
  status,
  areas,
  statuses,
  priorities,
  onChange,
  compact = false,
}: {
  business: string;
  area: string;
  priority: string;
  status: string;
  areas: string[];
  statuses: string[];
  priorities: string[];
  onChange: (name: string, value: string) => void;
  compact?: boolean;
}) {
  return (
    <div className={`filters ${compact ? "filters-compact" : ""}`} aria-label="Dashboard filters">
      <label>
        <span>Business</span>
        <select value={business} onChange={(e) => onChange("business", e.target.value)}>
          <option value="All">All businesses</option>
          <option value="MUMSRELLE">MUMSRELLE</option>
          <option value="Flommie">Flommie</option>
          <option value="Both">Both</option>
        </select>
      </label>
      <label>
        <span>Area</span>
        <select value={area} onChange={(e) => onChange("area", e.target.value)}>
          <option value="All">All areas</option>
          {areas.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label>
        <span>Priority</span>
        <select value={priority} onChange={(e) => onChange("priority", e.target.value)}>
          <option value="All">All priorities</option>
          {priorities.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label>
        <span>Status</span>
        <select value={status} onChange={(e) => onChange("status", e.target.value)}>
          <option value="All">All statuses</option>
          {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
    </div>
  );
}

function MrlChart() {
  const data = snapshot.mrlResults.confirmedMonths
    .filter((row) => row.confirmedSC != null || row.storeSalesProxy != null)
    .map((row) => ({
      month: row.month.replace(" 2026", ""),
      confirmed: row.confirmedSC,
      provisional: row.storeSalesProxy,
    }));
  return (
    <div className="chart-shell" aria-label="Monthly SC revenue trend chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-text)", fontSize: 12 }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-text)", fontSize: 11 }}
            tickFormatter={(v) => `${Math.round(v / 1000)}k`}
          />
          <Tooltip
            contentStyle={{ borderRadius: 10, border: "1px solid var(--line)", background: "var(--panel)", boxShadow: "var(--shadow-md)" }}
            formatter={(value) => [money(Number(value)), "SC Revenue"]}
          />
          <ReferenceLine y={snapshot.mrlResults.annualTarget / 12} stroke="var(--warning)" strokeDasharray="4 4" />
          <Line type="monotone" dataKey="confirmed" stroke="var(--confirmed)" strokeWidth={3} dot={{ r: 3, fill: "var(--confirmed)" }} connectNulls={false} />
          <Line type="monotone" dataKey="provisional" stroke="var(--warning)" strokeWidth={3} strokeDasharray="6 5" dot={{ r: 4, fill: "var(--warning)" }} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [detail, setDetail] = useState<DetailItem | null>(null);
  const [activeSection, setActiveSection] = useState("today");
  const [automationSearch, setAutomationSearch] = useState("");
  const [actionFilters, setActionFilters] = useState({ business: "All", area: "All", priority: "All", status: "All" });
  const [automationFilters, setAutomationFilters] = useState({ business: "All", area: "All", priority: "All", status: "All" });

  const automationStatuses = ["Planning only", "Test evidence only", "Runtime verified", "Live approved"];
  const automationAreas = useMemo(
    () => Array.from(new Set(snapshot.automation.automations.map((item) => item.area))).sort(),
    [],
  );
  const actionAreas = useMemo(
    () => Array.from(new Set(snapshot.todayActions.map((item) => item.area))).sort(),
    [],
  );
  const actionStatuses = useMemo(
    () => Array.from(new Set(snapshot.todayActions.map((item) => item.status))).sort(),
    [],
  );
  const actionPriorities = useMemo(
    () => Array.from(new Set(snapshot.todayActions.map((item) => item.priority))).sort(),
    [],
  );
  const automationPriorities = useMemo(
    () => Array.from(new Set(snapshot.automation.automations.map((item) => item.priority))).sort(),
    [],
  );

  const stageLabel = (item: (typeof snapshot.automation.automations)[number]) => {
    if (item.liveApproved) return "Live approved";
    if (item.runtimeVerified) return "Runtime verified";
    if (item.testReady) return "Test evidence only";
    return "Planning only";
  };

  const filteredAutomations = useMemo(() => {
    const query = automationSearch.trim().toLowerCase();
    return snapshot.automation.automations.filter((item) => {
      const businessMatch = automationFilters.business === "All" || item.business === automationFilters.business || item.business === "Both";
      const areaMatch = automationFilters.area === "All" || item.area === automationFilters.area;
      const priorityMatch = automationFilters.priority === "All" || item.priority === automationFilters.priority;
      const statusMatch = automationFilters.status === "All" || stageLabel(item) === automationFilters.status;
      const searchMatch = !query || `${item.id} ${item.name} ${item.owner} ${item.nextDependency}`.toLowerCase().includes(query);
      return businessMatch && areaMatch && priorityMatch && statusMatch && searchMatch;
    });
  }, [automationFilters, automationSearch]);

  const filteredActions = useMemo(() => snapshot.todayActions.filter((item) => {
    const businessMatch = actionFilters.business === "All" || item.business === actionFilters.business || item.business === "Both";
    const areaMatch = actionFilters.area === "All" || item.area === actionFilters.area;
    const priorityMatch = actionFilters.priority === "All" || item.priority === actionFilters.priority;
    const statusMatch = actionFilters.status === "All" || item.status === actionFilters.status;
    return businessMatch && areaMatch && priorityMatch && statusMatch;
  }), [actionFilters]);

  const missingCount = snapshot.todayActions.filter((item) => /(MISSING|UNVERIFIED|NOT OBTAINED|PROVISIONAL)/.test(item.status)).length;
  const latestMarketing = snapshot.marketing.at(-1);
  const supplementalTotals = snapshot.mrlResults.supplementalRevenue.reduce(
    (acc, item) => ({ prhb: acc.prhb + (item.prhb ?? 0), eerr: acc.eerr + (item.eerr ?? 0) }),
    { prhb: 0, eerr: 0 },
  );

  const updateActionFilter = (name: string, value: string) => setActionFilters((current) => ({ ...current, [name]: value }));
  const updateAutomationFilter = (name: string, value: string) => setAutomationFilters((current) => ({ ...current, [name]: value }));
  const clearActionFilters = () => setActionFilters({ business: "All", area: "All", priority: "All", status: "All" });

  const openAction = (item: (typeof snapshot.todayActions)[number]) => setDetail({
    kind: "action",
    title: item.title,
    subtitle: `${item.priority} · ${item.business} · ${item.area}`,
    rows: [
      { label: "Status", value: item.status },
      { label: "Dashboard priority (proposed)", value: item.priority },
      { label: "Owner", value: item.owner },
      { label: "Blocker / missing evidence", value: item.blocker },
      { label: "Next step", value: item.nextStep },
      { label: "Evidence", value: item.evidenceLabel },
    ],
    sourceUrl: item.evidenceUrl,
  });

  const openAutomation = (item: (typeof snapshot.automation.automations)[number]) => setDetail({
    kind: "automation",
    title: `${item.id} · ${item.name}`,
    subtitle: `${item.business} · ${item.area} · ${item.priority}`,
    rows: [
      { label: "Formal planning status", value: item.planningStatus },
      { label: "Sandbox status", value: item.sandboxStatus },
      { label: "Data ready", value: item.dataReady ? "YES — SOURCE GATE RECORDED" : "NO / NOT VERIFIED" },
      { label: "Test ready", value: item.testReady ? "PARTIAL TEST EVIDENCE EXISTS" : "NO INTEGRATION TEST" },
      { label: "Runtime verified", value: item.runtimeVerified ? "YES" : "NO — EXECUTION ID, TIME AND OUTCOME NOT OBTAINED" },
      { label: "Live approved", value: item.liveApproved ? "YES" : "NO" },
      { label: "Safety mode", value: item.safetyMode },
      { label: "Owner", value: item.owner },
      { label: "Next dependency", value: item.nextDependency },
      { label: "Test limitation", value: item.coverageLimitation },
    ],
    sourceUrl: item.sourceUrl,
    testSourceUrl: item.testSourceUrl,
  });

  return (
    <div className={`app-shell ${sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <aside className={`sidebar ${mobileNavOpen ? "mobile-open" : ""}`} aria-label="Primary navigation">
        <div className="brand-block">
          <div className="brand-copy">
            <strong>MRL + Flommie</strong>
            <span>Management control</span>
          </div>
          <button className="icon-button sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}>
            {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
          <button className="icon-button mobile-close" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation">
            <X size={19} />
          </button>
        </div>
        <nav>
          {navItems.map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              href={`#${id}`}
              className={activeSection === id ? "active" : ""}
              aria-current={activeSection === id ? "page" : undefined}
              onClick={() => {
                setActiveSection(id);
                setMobileNavOpen(false);
              }}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-footer">
          <StatusBadge>READ-ONLY</StatusBadge>
          <p>Manual snapshot.<br />No live write connection.</p>
        </div>
      </aside>

      <main id="main-content" className="main-canvas">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">
              <Menu size={20} />
            </button>
            <div>
              <p className="kicker">Internal management dashboard</p>
              <h1>What needs attention today?</h1>
            </div>
          </div>
          <div className="topbar-actions">
            <div className="snapshot-chip">
              <FileCheck2 size={16} aria-hidden="true" />
              <span><strong>Manual snapshot</strong><small>Read {readTime} SGT</small></span>
            </div>
            <button className="icon-button" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
              {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>
          </div>
        </header>

        <div className="content-wrap">
          <section className="source-ribbon" aria-label="Connection status">
            <div>
              <span className="live-indicator" aria-hidden="true" />
              <strong>3 / 3 sources readable</strong>
              <span>Snapshot only — not live sync</span>
            </div>
            <div className="source-ribbon-meta">
              <span>Results data: {dateLabel(snapshot.mrlResults.asOf)}</span>
              <span>Stock data: {dateLabel(snapshot.stock.asOf)}</span>
            </div>
          </section>

          <section id="today" className="dashboard-section section-first">
            <div className="overview-grid">
              <div className="priority-panel">
                <SectionHeading
                  title="Priority actions"
                  description="Dashboard-proposed order based on current evidence. Nothing is marked complete automatically."
                  meta={`${filteredActions.length} visible`}
                />
                <Filters
                  {...actionFilters}
                  areas={actionAreas}
                  statuses={actionStatuses}
                  priorities={actionPriorities}
                  onChange={updateActionFilter}
                  compact
                />
                <div className="action-list">
                  {filteredActions.length ? filteredActions.map((item, index) => (
                    <button className="action-row" key={item.id} onClick={() => openAction(item)}>
                      <span className="action-rank">{String(index + 1).padStart(2, "0")}</span>
                      <span className="action-main">
                        <span className="action-tags"><StatusBadge>{item.priority}</StatusBadge><StatusBadge>{item.status}</StatusBadge></span>
                        <strong>{item.title}</strong>
                        <span>{item.blocker}</span>
                      </span>
                      <span className="action-owner">{item.owner}</span>
                      <ChevronRight size={18} aria-hidden="true" />
                    </button>
                  )) : (
                    <div className="empty-state"><Filter size={20} /><strong>No actions match these filters.</strong><button onClick={clearActionFilters}>Clear filters</button></div>
                  )}
                </div>
              </div>

              <aside className="signal-stack">
                <article className="signal-card signal-danger">
                  <CircleAlert size={20} />
                  <div><strong>{missingCount}</strong><span>flagged data gaps</span></div>
                  <p>Missing is never treated as zero.</p>
                </article>
                <article className="signal-card">
                  <CalendarClock size={20} />
                  <div><strong>{snapshot.mrlResults.remainingDays}</strong><span>days remaining</span></div>
                  <p>SC-only KPI year ending 31 Dec 2026.</p>
                </article>
                <article className="signal-card signal-warning">
                  <TestTube2 size={20} />
                  <div><strong>0</strong><span>new runtimes verified</span></div>
                  <p>No Make execution ID was obtained.</p>
                </article>
                <article className="scope-note">
                  <ShieldCheck size={18} />
                  <div><strong>Safety boundary intact</strong><p>No Sheet writes, messages, bookings, payments or new Make runs.</p></div>
                </article>
              </aside>
            </div>
          </section>

          <section id="results" className="dashboard-section">
            <SectionHeading
              title="MRL Results"
              description="Main KPI uses 2026 SC Revenue / Slimming Centre Revenue only."
              meta={`Data through ${dateLabel(snapshot.mrlResults.asOf)}`}
            />
            <div className="definition-bar">
              <span>Annual management KPI</span>
              <strong>{money(snapshot.mrlResults.annualTarget)}</strong>
              <span>PRHB + EERR excluded</span>
            </div>

            <div className="result-split">
              <article className="result-lane lane-confirmed">
                <div className="lane-heading"><StatusBadge>CONFIRMED</StatusBadge><span>SC actuals only</span></div>
                <div className="lane-number">{money(snapshot.mrlResults.confirmed.ytd)}</div>
                <div className="progress-track" role="progressbar" aria-label="Confirmed KPI achievement" aria-valuenow={snapshot.mrlResults.confirmed.achievement * 100} aria-valuemin={0} aria-valuemax={100}>
                  <span style={{ width: `${snapshot.mrlResults.confirmed.achievement * 100}%` }} />
                </div>
                <div className="lane-grid">
                  <MetricCard label="Achievement" value={percent(snapshot.mrlResults.confirmed.achievement)} meta="of SGD 1.4M" accent="confirmed" />
                  <MetricCard label="Remaining gap" value={money(snapshot.mrlResults.confirmed.remainingGap)} meta="SC revenue needed" accent="confirmed" />
                  <MetricCard label="Required monthly run rate" value={money(snapshot.mrlResults.requiredMonthlyRunRateConfirmed)} meta="calendar-day equivalent" accent="confirmed" />
                </div>
              </article>

              <article className="result-lane lane-provisional">
                <div className="lane-heading"><StatusBadge>PROVISIONAL</StatusBadge><span>{snapshot.mrlResults.provisional.proxyMonth} Store Sales proxy</span></div>
                <div className="lane-number">{money(snapshot.mrlResults.provisional.ytd)}</div>
                <div className="progress-track progress-provisional" role="progressbar" aria-label="Provisional KPI achievement" aria-valuenow={snapshot.mrlResults.provisional.achievement * 100} aria-valuemin={0} aria-valuemax={100}>
                  <span style={{ width: `${snapshot.mrlResults.provisional.achievement * 100}%` }} />
                </div>
                <div className="lane-grid">
                  <MetricCard label="Achievement" value={percent(snapshot.mrlResults.provisional.achievement)} meta="not confirmed SC" accent="provisional" />
                  <MetricCard label="Remaining gap" value={money(snapshot.mrlResults.provisional.remainingGap)} meta="provisional basis" accent="provisional" />
                  <MetricCard label="Proxy included" value={money(snapshot.mrlResults.provisional.proxyValue)} meta="may include other revenue" accent="provisional" />
                </div>
              </article>
            </div>

            <div className="results-lower-grid">
              <article className="panel chart-panel">
                <div className="panel-heading">
                  <div><h3>Monthly SC trend</h3><p>Confirmed actuals; dotted line is provisional proxy only.</p></div>
                  <span className="pace-pill">Elapsed-year pace {percent(snapshot.mrlResults.elapsedYearPace)}</span>
                </div>
                <MrlChart />
                <div className="legend"><span><i className="legend-confirmed" />Confirmed SC</span><span><i className="legend-provisional" />Provisional proxy</span><span><i className="legend-target" />Monthly target equivalent</span></div>
              </article>

              <article className="panel supplement-panel">
                <div className="panel-heading"><div><h3>Supplemental revenue</h3><p>Tracked separately; not part of the SC KPI.</p></div></div>
                <div className="supplement-list">
                  <div><span>PRHB YTD</span><strong>{money(supplementalTotals.prhb)}</strong><small>Excluded from main KPI</small></div>
                  <div><span>EERR YTD</span><strong>{money(supplementalTotals.eerr)}</strong><small>Excluded from main KPI</small></div>
                </div>
                <div className="guardrail"><AlertTriangle size={17} /><span>Weekly snapshots are trend history only. They are not added into current YTD.</span></div>
                <SourceButton href={snapshot.sources[0].url} label="Open Results Tracker" />
              </article>
            </div>

            <article className="panel marketing-panel">
              <div className="panel-heading"><div><h3>Marketing inputs</h3><p>Aggregate funnel metrics. No attributed ROAS is claimed.</p></div><span>{latestMarketing ? dateLabel(latestMarketing.dataAsOf) : NOT_OBTAINED}</span></div>
              <div className="marketing-grid">
                <MetricCard label="Enquiries" value={number(latestMarketing?.enquiries)} meta={latestMarketing?.month ?? NOT_OBTAINED} />
                <MetricCard label="Appointments" value={number(latestMarketing?.appointments)} meta={`Conversion ${percent(latestMarketing?.enquiryToAppointment)}`} />
                <MetricCard label="Sign-ups" value={number(latestMarketing?.signups)} meta={`Conversion ${percent(latestMarketing?.appointmentToSignup)}`} />
                <MetricCard label="Ad spend" value={money(latestMarketing?.adSpend)} meta={latestMarketing?.month ?? NOT_OBTAINED} />
                <MetricCard label="Ad leads" value={number(latestMarketing?.adLeads)} meta={`CPL ${money(latestMarketing?.cpl)}`} />
              </div>
              <div className="not-roas"><CircleAlert size={16} /><span>Total SC revenue ÷ ad spend is intentionally not labelled as advertising-attributed ROAS.</span></div>
            </article>
          </section>

          <section id="stock" className="dashboard-section">
            <SectionHeading
              title="Flommie Stock"
              description="Book snapshot, reservations and availability are separated."
              meta={`Snapshot ${dateLabel(snapshot.stock.asOf)}`}
            />
            <div className="critical-banner">
              <div><AlertTriangle size={20} /><strong>{snapshot.stock.verificationStatus}</strong></div>
              <p>No current physical count or complete movement ledger was obtained. Book stock is not labelled as current physical inventory.</p>
            </div>
            <div className="stock-ledger">
              <article className="stock-total">
                <span>Book closing</span><strong>{number(snapshot.stock.bookClosing)} <small>packs</small></strong><p>After shipped/excluded movements in the dated source snapshot.</p>
              </article>
              <div className="stock-operator" aria-hidden="true">−</div>
              <article className="stock-total stock-reserved">
                <span>Reserved</span><strong>{number(snapshot.stock.reserved)} <small>packs</small></strong><p>Not confirmed shipped; not counted as outflow.</p>
              </article>
              <div className="stock-operator" aria-hidden="true">=</div>
              <article className="stock-total stock-available">
                <span>Book available</span><strong>{number(snapshot.stock.bookAvailable)} <small>packs</small></strong><p>Not a customer promise. Physical stock remains unverified.</p>
              </article>
            </div>

            <div className="stock-detail-grid">
              <article className="panel movement-panel">
                <div className="panel-heading"><div><h3>Movement controls</h3><p>Movement ledger currently has headers only.</p></div><StatusBadge>0 VERIFIED MOVEMENTS</StatusBadge></div>
                <div className="control-list">
                  <div><PackageCheck size={18} /><span><strong>Damage excluded once</strong>{snapshot.stock.damageFormula}</span></div>
                  <div><Check size={18} /><span><strong>Staff / Shopee overlap</strong>Gross 21 less overlap 2 = net outflow 19</span></div>
                  <div><CircleAlert size={18} /><span><strong>Payment is not shipment</strong>RM 502.50 paid notices remain shipment-unverified.</span></div>
                  <div><ShieldCheck size={18} /><span><strong>Duplicate guard required</strong>Exclude cancelled orders and match movement ID + line detail.</span></div>
                </div>
              </article>

              <article className="panel package-panel">
                <div className="panel-heading"><div><h3>Packaging capacity reference</h3><p>Alternatives only — not sealed-SKU counts.</p></div></div>
                <div className="capacity-bars">
                  {[{ label: "7-pack equivalent", value: 3504, width: 100 }, { label: "14-pack equivalent", value: 1752, width: 50 }, { label: "28-pack equivalent", value: 876, width: 25 }].map((item) => (
                    <div key={item.label}><span>{item.label}</span><strong>{number(item.value)}</strong><i><b style={{ width: `${item.width}%` }} /></i></div>
                  ))}
                </div>
                <p className="panel-footnote">These capacities cannot be added together and do not represent actual sealed SKU inventory.</p>
              </article>
            </div>

            <article className="panel finance-panel">
              <div className="panel-heading"><div><h3>Financial separation</h3><p>Payment, released income, costs and profit remain distinct.</p></div></div>
              <div className="finance-grid">
                <div><span>RM customer payment</span><strong>RM 502.50</strong><StatusBadge>PAID NOTICE ONLY</StatusBadge></div>
                <div><span>Released income</span><EmptyValue /></div>
                <div><span>Shipping / cost</span><EmptyValue /></div>
                <div><span>True net profit</span><EmptyValue label="NOT CALCULATED" /><small>Costs incomplete</small></div>
              </div>
            </article>
          </section>

          <section id="automation" className="dashboard-section">
            <SectionHeading
              title="Automation Progress"
              description="NEW is formal planning. SANDBOX holds synthetic test evidence only."
              meta={`${snapshot.automation.automations.length} registered items`}
            />
            <div className="automation-gates">
              <div><Database size={18} /><span>Data ready</span><strong>{snapshot.automation.automations.filter((x) => x.dataReady).length}</strong><small>explicit readiness records</small></div>
              <div><TestTube2 size={18} /><span>Test ready</span><strong>{snapshot.automation.automations.filter((x) => x.testReady).length}</strong><small>partial evidence</small></div>
              <div className="gate-danger"><Zap size={18} /><span>Runtime verified</span><strong>0</strong><small>execution evidence</small></div>
              <div className="gate-danger"><ShieldCheck size={18} /><span>Live approved</span><strong>0</strong><small>new automations</small></div>
            </div>
            <div className="automation-rule"><CircleAlert size={17} /><strong>Formula PASS ≠ Make runtime PASS.</strong><span>Runtime requires execution ID, time and actual result.</span></div>

            <article className="panel registry-panel">
              <div className="registry-toolbar">
                <div className="search-box"><Search size={17} /><input value={automationSearch} onChange={(e) => setAutomationSearch(e.target.value)} placeholder="Search ID, workflow, owner or dependency" aria-label="Search automation registry" /></div>
                <div className="registry-count">{filteredAutomations.length} shown</div>
              </div>
              <Filters {...automationFilters} areas={automationAreas} statuses={automationStatuses} priorities={automationPriorities} onChange={updateAutomationFilter} />
              <div className="table-scroll">
                <table>
                  <thead><tr><th>ID / automation</th><th>Business / area</th><th>Priority</th><th>Data</th><th>Test</th><th>Runtime</th><th>Live approval</th><th /></tr></thead>
                  <tbody>
                    {filteredAutomations.slice(0, 20).map((item) => (
                      <tr key={item.id}>
                        <td><strong>{item.id}</strong><span>{item.name}</span></td>
                        <td>{item.business}<span>{item.area}</span></td>
                        <td><StatusBadge>{item.priority}</StatusBadge></td>
                        <td><StatusBadge>{item.dataReady ? "READY" : "NOT VERIFIED"}</StatusBadge></td>
                        <td><StatusBadge>{item.testReady ? "PARTIAL EVIDENCE" : "NOT TESTED"}</StatusBadge></td>
                        <td><StatusBadge>UNVERIFIED</StatusBadge></td>
                        <td><StatusBadge>NOT APPROVED</StatusBadge></td>
                        <td><button className="row-button" onClick={() => openAutomation(item)} aria-label={`View details for ${item.id}`}><ChevronRight size={17} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredAutomations.length > 20 ? <p className="table-note">Showing the first 20 matching items. Narrow the filters to inspect a specific workflow.</p> : null}
            </article>

            <div className="automation-bottom-grid">
              <article className="panel test-panel">
                <div className="panel-heading"><div><h3>Sandbox test evidence</h3><p>Fictitious fixtures; excluded from real results and stock.</p></div><StatusBadge>TEST ONLY</StatusBadge></div>
                <div className="test-stats">
                  <div><strong>{snapshot.automation.testSummary.results.PASS}</strong><span>recorded PASS</span></div>
                  <div><strong>{snapshot.automation.testSummary.results.FAIL}</strong><span>recorded FAIL</span></div>
                  <div><strong>0</strong><span>Make runs verified</span></div>
                </div>
                <SourceButton href={snapshot.automation.testEvidenceSource} label="Open SANDBOX evidence" />
              </article>

              <article className="panel live-panel">
                <div className="panel-heading"><div><h3>Existing live records</h3><p>Five source records only; not edited or run.</p></div><StatusBadge>RECORDED ONLY</StatusBadge></div>
                <div className="live-list">
                  {snapshot.automation.existingLiveRecords.map((item) => (
                    <div key={item.scenarioId}><span>{item.scenarioId}</span><strong>{item.workflow}</strong><small>Recorded {dateLabel(item.recordedOn)} · runtime not re-tested</small></div>
                  ))}
                </div>
              </article>
            </div>
            <div className="hold-banner"><CalendarClock size={18} /><strong>REAL APPOINTMENTS ON HOLD</strong><span>No current available slots are calculated or promised.</span></div>
          </section>

          <section id="sources" className="dashboard-section">
            <SectionHeading
              title="Sources & audit boundary"
              description="Connected, manual snapshot and test-only data are labelled separately."
              meta="Read-only prototype"
            />
            <div className="sources-grid">
              {snapshot.sources.map((source) => (
                <article className="source-card" key={source.id}>
                  <div className="source-card-top"><Database size={19} /><StatusBadge>{source.connectionStatus}</StatusBadge></div>
                  <h3>{source.name}</h3>
                  <p>{source.role}</p>
                  <dl>
                    <div><dt>Mode</dt><dd>{source.mode}</dd></div>
                    <div><dt>Last modified</dt><dd>{new Intl.DateTimeFormat("en-SG", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Singapore" }).format(new Date(source.modifiedTime))} SGT</dd></div>
                    <div><dt>Last read</dt><dd>{readTime} SGT</dd></div>
                    <div><dt>Writes used</dt><dd>{source.writeAccessUsed ? "YES" : "NO"}</dd></div>
                  </dl>
                  <div className="source-card-actions">
                    <SourceButton href={source.url} label="Open Google Sheet" />
                    <button className="text-button" onClick={() => setDetail({ kind: "source", title: source.name, subtitle: source.mode, rows: [{ label: "Role", value: source.role }, { label: "Connection", value: source.connectionStatus }, { label: "Automatic refresh", value: source.autoRefresh ? "YES" : "NO" }, { label: "Write access used", value: source.writeAccessUsed ? "YES" : "NO" }, { label: "Privacy", value: snapshot.meta.privacy }], sourceUrl: source.url })}>View audit details</button>
                  </div>
                </article>
              ))}
            </div>
            <article className="boundary-panel">
              <ShieldCheck size={22} />
              <div><h3>Prototype safety boundary</h3><p>No Google Sheet edits. No Make activation or execution. No customer messages. No appointment operations. No payment execution. No API keys, tokens or customer personal data are stored in the frontend.</p></div>
            </article>
          </section>
        </div>
      </main>
      {mobileNavOpen ? <button className="mobile-scrim" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation overlay" /> : null}
      <DetailDrawer item={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
