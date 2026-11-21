# Stocks + Platform pages (design and plan, short)

> Executed inline with superpowers:executing-plans. Design and plan share one file (small change); approved in chat 2026-11-20 ("proceed" after the options message).

**Goal:** A read-only Stocks page (the 24 watchlist stocks, cadence, latest call) and a Platform page (last nightly run, models, watchlist counts).
**Non-goals:** writing `watchlist.json` (own step, needs approval), per-service live health (needs the service network map; deferred), Scorecard.
**Anti-goals:** the API stays read-only; no filesystem paths in errors; no secrets exposed (the mounted `tools/` dir is read-only and holds no secrets).

## Global Constraints
- Compose: web-api gets `./tools:/app/tools:ro` (directory, not a single file: the PowerShell rewrite replaces the file's inode and a file bind mount would go stale). Env `WATCHLIST_PATH` default `/app/tools/watchlist.json`.
- Watchlist rules mirror `tools/watchlist.ps1`: ticker `^[A-Z][A-Z0-9.\-]{0,9}$`; list in `core|brands`; cadence in `nightly|weekly|once|paused`, unknown cadence is treated as `paused`; entries failing the ticker or list rule are skipped and counted. Strip a leading BOM.
- Envelope `{ success, data | error }`; routes under `/api/nightly/status` and `/api/watchlist` (the latter registered in `server.ts` beside nightly).
- Status = newest `<NIGHTLY_LOGS_PATH>/<date>/status.txt` (date dir `YYYY-MM-DD`), lines trimmed, blank lines dropped.
- Ledger rows additionally keep optional `fast_model`, `decision_model`.

## Review Focus
- Watchlist missing/unparsable -> 200 `{ stocks: [], skipped: 0, available: false }`, page says so.
- Unknown cadence -> `paused`; bad ticker/list -> skipped and counted.
- No status.txt anywhere -> `status: null`, not 500.
- Stock on the watchlist with no ledger history (new or paused) -> `latest: null`, no link to its detail page.
- Date directories with odd names (`latest.html`, `../`) never selected for status.

### Task 1: API
**Files:** Create `src/services/watchlist.ts` (+ `.test.ts`), `src/services/run-status.ts` (+ `.test.ts`), `src/routes/watchlist.ts`; Modify `src/services/nightly-derive.ts` + `ledger-reader.ts` (model fields), `src/routes/nightly.ts` (`GET /status`, before `/:date`), `src/server.ts`, `docker-compose.yml`, route tests.
**Interfaces:** `loadWatchlist(path: string): Promise<{ stocks: WatchEntry[]; skipped: number; available: boolean }>`, `WatchEntry { ticker: string; list: 'core'|'brands'; cadence: 'nightly'|'weekly'|'once'|'paused'; lesson?: string }`; `loadRunStatus(logsDir: string): Promise<{ date: string; lines: string[] } | null>`; `GET /api/watchlist` -> `{ stocks: (WatchEntry & { latest: { date; price; label; decision; confidence; trigger_price?: number } | null })[]; skipped; available; counts: Record<cadence, number> }`; `GET /api/nightly/status` -> `{ status: { date; lines } | null; models: { date; profile; fast_model?: string; decision_model?: string; rows: number } | null }`.
- [ ] Failing tests for each Review Focus line and the happy paths; run (FAIL); implement; run tests, eslint, type-check, build; commit `feat(web-api): watchlist and run status endpoints`.

### Task 2: Frontend
**Files:** Modify `src/services/nightly.ts` (+ test): `fetchWatchlist()`, `fetchRunStatus()` with zod; Create `src/pages/Stocks.tsx`, `src/pages/Platform.tsx`; Modify `src/App.tsx` (`/stocks`, `/platform`), `Layout.tsx` nav.
- Stocks: table (ticker linking to `/stock/:ticker` only when `latest` exists, list, cadence, latest call, price), filters for list and cadence (native selects, labelled), counts line, empty/unavailable states.
- Platform: cards for the last run (status lines as a list), models used, watchlist counts, nights/rows; states for no status.
- [ ] Failing client tests (parse watchlist with `latest: null`; parse status null); implement; tests/lint/type-check/build; commit `feat(web-frontend): stocks and platform pages`.

### Task 3: Verify
- [ ] Live check through local node + vite against real data; rebuild `web-api` + `web-frontend` containers (`POSTGRES_PASSWORD` placeholder for interpolation only, `--no-deps`); curl the new endpoints; README; fresh reviewer; fix Critical/Important with TDD.
