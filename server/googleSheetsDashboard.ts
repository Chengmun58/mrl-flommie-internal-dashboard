import { z } from "zod";

const cellRangeSchema = z.object({
  values: z.array(z.array(z.unknown())).optional(),
});

export const dashboardMetricSchema = z.object({
  key: z.string(),
  value: z.string().nullable(),
  evidence: z.string().nullable(),
  gate: z.string().nullable(),
  freshness: z.string().nullable(),
  note: z.string().nullable(),
});

export type DashboardMetric = z.infer<typeof dashboardMetricSchema>;

const DEFAULT_SPREADSHEET_ID = "1iTHf8aF4vZVGnKYolu_pb8tuC5fcMCBFD71Rw533poQ";
const DEFAULT_RANGE = "'Dashboard Export'!A1:F100";

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function normalizePrivateKey(value: string): string {
  return value.replace(/\\n/g, "\n");
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function createServiceAccountAccessToken(): Promise<string> {
  const clientEmail = env("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const privateKeyRaw = env("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
  if (!clientEmail || !privateKeyRaw) {
    throw new Error("Google Sheets credentials are not configured");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );
  const unsigned = `${header}.${claim}`;
  const { createSign } = await import("crypto");
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = base64url(signer.sign(normalizePrivateKey(privateKeyRaw)));
  const assertion = `${unsigned}.${signature}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) {
    throw new Error(`Google OAuth token request failed: ${response.status}`);
  }
  const body = (await response.json()) as { access_token?: string };
  if (!body.access_token) throw new Error("Google OAuth response had no access token");
  return body.access_token;
}

export async function readDashboardExportFromSheets(): Promise<{
  source: "GOOGLE_SHEETS";
  spreadsheetId: string;
  range: string;
  readAt: string;
  metrics: DashboardMetric[];
}> {
  const spreadsheetId = env("MRL_RESULTS_SPREADSHEET_ID") || DEFAULT_SPREADSHEET_ID;
  const range = env("MRL_DASHBOARD_EXPORT_RANGE") || DEFAULT_RANGE;
  const token = await createServiceAccountAccessToken();
  const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`;
  const response = await fetch(endpoint, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Google Sheets read failed: ${response.status}`);
  }
  const parsed = cellRangeSchema.parse(await response.json());
  const rows = parsed.values || [];
  const metrics = rows
    .slice(1)
    .filter(row => String(row[0] ?? "").trim() !== "")
    .map(row =>
      dashboardMetricSchema.parse({
        key: String(row[0] ?? ""),
        value: row[1] == null || row[1] === "" ? null : String(row[1]),
        evidence: row[2] == null || row[2] === "" ? null : String(row[2]),
        gate: row[3] == null || row[3] === "" ? null : String(row[3]),
        freshness: row[4] == null || row[4] === "" ? null : String(row[4]),
        note: row[5] == null || row[5] === "" ? null : String(row[5]),
      })
    );
  return {
    source: "GOOGLE_SHEETS",
    spreadsheetId,
    range,
    readAt: new Date().toISOString(),
    metrics,
  };
}
