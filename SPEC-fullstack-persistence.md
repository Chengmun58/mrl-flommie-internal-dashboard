# Spec: Full-stack Persistence and Evidence File Storage

## Objective

Upgrade the existing MRL + Flommie read-only Dashboard in place so its privacy-safe aggregate snapshot, automation evidence classifications, and approved internal evidence-file metadata can persist in a managed database. Add object-file storage for internal, non-PII evidence files while preserving all existing read-only business boundaries.

The current embedded snapshot remains the seed/baseline. Google Sheets remain read-only and are not connected for write access. No Make scenario is enabled or run. No customer messages, appointment actions, or payments are performed. No public deployment is included.

## Architecture options considered

| Approach | Tradeoffs | Cost | Setup complexity |
|---|---|---:|---:|
| Managed full-stack database plus object storage | Cross-device durable records, typed API, future private access controls; requires schema/migrations and server routes | Managed project usage | Medium |
| Browser-only local storage | Fast and simple but device-specific, easy to lose, no shared access, no secure file storage | None | Low |

**Selected:** Managed database plus object storage because the user explicitly requested a database, full-stack conversion, and persisted data.

## Persisted data

1. `dashboard_snapshots`: privacy-safe aggregate JSON snapshots, version, source-read timestamp, result date, stock date, and active flag.
2. `evidence_files`: file metadata only: storage key, original filename, MIME type, byte size, business, area, evidence label, uploader identity when available, and timestamps.
3. Existing users/auth tables supplied by the full-stack template.

No customer phone numbers, addresses, medical data, identity documents, personal email addresses, or raw customer exports may be uploaded or persisted.

## API boundary

- Dashboard snapshot reads are server-backed and read-only from the UI.
- Initial baseline seeding is an administrative setup action performed once during implementation.
- Evidence upload requires authenticated/private access; file type and size are validated server-side.
- File deletion, Google Sheet writes, Make actions, messaging, appointments, and payments are outside this phase.

## File storage policy

Allowed: PDF, CSV, XLSX, PNG, JPG, WEBP, and plain-text operational evidence that contains no customer PII. Maximum file size: 10 MB. The UI must show a privacy warning before upload. Object data is stored in managed file storage; the database stores metadata and ownership only.

## Commands

- Development: `pnpm dev`
- Type check: `pnpm check`
- Tests: `pnpm test`
- Production build: `pnpm build`
- Migration generation: `pnpm drizzle-kit generate`

## Testing strategy

- Unit/integration tests for snapshot fallback, record counts, upload validation, and protected mutations.
- Database verification after migration and baseline seed.
- Browser verification for persisted snapshot loading, clear status labelling, upload validation, and evidence list rendering.
- Production scan confirming no debug collector or log-reporting endpoint.

## Boundaries

**Always:** preserve source dates, status wording, 49 = 44 new/planned + 5 existing-live, partial evidence separate from test ready, and no inferred readiness.

**Ask first:** public deployment, granting users access, automatic Google Sheet refresh, or broadening permitted file content.

**Never:** store API keys in frontend code; request Google Sheet write scopes; enable/run Make; send messages; change appointments; execute payments; upload known customer PII.

## Success criteria

- Existing dashboard behavior remains available.
- Current privacy-safe snapshot is persisted in the database and is returned by the backend.
- The UI identifies database persistence separately from source freshness.
- File storage supports validated non-PII uploads and persisted metadata.
- Type checks, tests, build, database checks, browser checks, and production debug scans pass.
- Nothing is deployed publicly.
