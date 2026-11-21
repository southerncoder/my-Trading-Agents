# Today Page + Nightly Read API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the nightly ledger read-only from `web-api` and show it as a Today page at `/` in `web-frontend`.

**Architecture:** A pure derive module (`nightly-derive.ts`) turns ledger rows into page rows and a summary; a thin reader loads `decisions.jsonl`; an Express router exposes three GET endpoints. The frontend fetches through the existing same-origin `/api` base, validates with zod, and renders small components. No chart library.

**Tech Stack:** Express 5 + TypeScript 6 (ESM, `.js` import specifiers) in web-api; React 19, Tailwind 4, zod 4, react-router 7 in web-frontend; vitest added as a dev dependency to both (neither has a test runner today).

**Spec:** `docs/superpowers/specs/2026-11-20-today-page-design.md`

## Global Constraints

- Ledger path from env `NIGHTLY_LEDGER_PATH`, default `/app/data/ledger/decisions.jsonl`; mounted `./data:/app/data:ro`. The API never writes.
- Date param must match `^\d{4}-\d{2}-\d{2}$`; anything else is 400.
- Endpoints: `GET /api/nightly/dates`, `/api/nightly/latest`, `/api/nightly/:date` (register `dates` and `latest` before `:date`). Response envelope matches `health.ts`: `{ success: true, data }` or `{ success: false, error }`.
- Row derived fields: `change_pct` vs the previous ledger date (null if none), `distance_to_trigger_pct = (trigger_price - price) / price * 100` (null without a trigger), `inside_half_day = abs(distance) <= 0.5 * atr / price * 100`.
- Old Dashboard moves to `/dashboard`; nothing deleted. Today is nav item one.
- Port/host conventions unchanged (web-api 38401, frontend 38400). Paper trading only.
- New `.ts`/`.tsx` files must pass `npm run lint` and `npm run type-check` in their service. Commit trailers per session attribution.

## Review Focus

- Ledger file missing or empty: `latest` returns 404 with a clear message, `dates` returns `[]`, no crash.
- Malformed JSONL line (partial write during the nightly run): skipped and counted in `skipped_lines`, other rows still served.
- First night ever / ticker absent on the previous night: `change_pct` is null, not NaN or 0.
- Buy-now rows with no `trigger_price`: derived trigger fields null, row still listed.
- Path-like date (`../../etc/passwd`, `2026-13-45`): 400 and never touches the filesystem beyond the ledger.
- Weekend or pre-run morning: `stale` is false on Saturday for a Friday night; true on Tuesday morning for a Friday night.

---

### Task 1: Derive module (web-api)

**Files:**
- Create: `services/web-api/src/services/nightly-derive.ts`
- Test: `services/web-api/src/services/nightly-derive.test.ts`
- Modify: `services/web-api/package.json` (add `vitest` devDependency and `"test": "vitest run"`)

**Interfaces:**
- Produces:
  - `interface LedgerRow { date: string; ticker: string; group: string; profile: string; label: string; action_now: string; decision: string; confidence: number; price: number; trigger_price?: number; trigger_type?: string; trigger_reason?: string; walk_away?: number; atr?: number; stance: Record<string, string>; pm: { rationale?: string; key_risks?: string[]; what_would_change_my_mind?: string } }`
  - `interface NightlyRow extends LedgerRow { change_pct: number | null; distance_to_trigger_pct: number | null; inside_half_day: boolean }`
  - `interface NightlySummary { by_label: Record<string, number>; inside_half_day: number; biggest_mover: { ticker: string; change_pct: number } | null }`
  - `deriveRows(rows: LedgerRow[], previous?: LedgerRow[]): NightlyRow[]`
  - `summarize(rows: NightlyRow[]): NightlySummary`
  - `expectedNightDate(now: Date): string` (YYYY-MM-DD in America/Chicago: most recent weekday on or before today if local time is 18:00 or later, otherwise the most recent weekday strictly before today)

- [ ] **Step 1: Add vitest** - `npm install -D vitest` in `services/web-api` (run on Windows), add the `test` script, confirm `npm test` reports no tests.
- [ ] **Step 2: Write failing tests** in `nightly-derive.test.ts`: `change_pct is null when ticker absent from previous night`; `change_pct is (price/prev.price-1)*100`; `buy-now row without trigger_price has null distance and inside_half_day false`; `inside_half_day true when |distance| <= half of atr percent` (price 100, atr 4, trigger 101.9 true, 102.1 false); `summarize picks biggest absolute mover` (NVDA -14.01 beats +3); `summarize counts by label`; `expectedNightDate Saturday 10:00 -> Friday`, `Monday 10:00 -> previous Friday`, `Tuesday 19:00 -> Tuesday`.
- [ ] **Step 3: Run** `npm test` in web-api; expect FAIL (module missing).
- [ ] **Step 4: Implement** the signatures above in `nightly-derive.ts`; pure functions, no I/O. Use `Intl.DateTimeFormat` with `timeZone: 'America/Chicago'` for the local date/hour.
- [ ] **Step 5: Run** `npm test`, `npm run lint`, `npm run type-check`; expect all pass.
- [ ] **Step 6: Commit** `feat(web-api): nightly derive module`.

### Task 2: Ledger reader, routes, mount (web-api)

**Files:**
- Create: `services/web-api/src/services/ledger-reader.ts`, `services/web-api/src/routes/nightly.ts`
- Test: `services/web-api/src/routes/nightly.test.ts`, fixture `services/web-api/src/routes/__fixtures__/ledger.jsonl`
- Modify: `services/web-api/src/server.ts` (import + `app.use('/api/nightly', nightlyRoutes)` next to the other routes, after `/api/health`), `docker-compose.yml` (web-api volumes: add `- ./data:/app/data:ro`)

**Interfaces:**
- Consumes: `deriveRows`, `summarize`, `expectedNightDate`, `LedgerRow` from Task 1.
- Produces:
  - `loadLedger(path: string): Promise<{ byDate: Map<string, LedgerRow[]>; skipped: number }>` (missing file -> empty map; bad lines skipped and counted; mtime-keyed cache)
  - `nightlyRoutes: Router`. `latest`/`:date` data shape: `{ date: string; profile: string; stale: boolean; expected_date: string; skipped_lines: number; rows: NightlyRow[]; summary: NightlySummary }`; `dates` data shape: `string[]` newest first.

- [ ] **Step 1: Write fixture** (3 dates incl. one bad line, one buy-now row) and failing route tests using an express app listening on port 0 + `fetch`: `GET /dates returns newest first`, `GET /latest returns derived rows and summary`, `GET /2026-11-19 returns that night`, `GET /2026-13-45 is 400`, `GET /..%2f..%2fetc is 400`, `unknown valid date is 404`, `missing ledger file: dates [] and latest 404`, `skipped_lines counts the malformed line`. Point the router at the fixture through `NIGHTLY_LEDGER_PATH`.
- [ ] **Step 2: Run** `npm test`; expect FAIL.
- [ ] **Step 3: Implement** `loadLedger` and `nightlyRoutes` per the Interfaces block; read the env var at request time so tests can set it.
- [ ] **Step 4: Wire** the router in `server.ts` and add the compose mount; no auth change (read-only data).
- [ ] **Step 5: Run** `npm test`, `npm run lint`, `npm run type-check`, `npm run build`; then `docker compose config -q` at repo root; expect all pass.
- [ ] **Step 6: Commit** `feat(web-api): read-only nightly endpoints`.

### Task 3: Frontend client (web-frontend)

**Files:**
- Create: `services/web-frontend/src/services/nightly.ts`
- Test: `services/web-frontend/src/services/nightly.test.ts`
- Modify: `services/web-frontend/package.json` (vitest devDependency, `"test": "vitest run"`)

**Interfaces:**
- Produces: `nightlyDaySchema` (zod, mirrors Task 2's `latest` data shape, trigger fields nullable); `type NightlyDay = z.infer<typeof nightlyDaySchema>`; `fetchLatestNight(): Promise<NightlyDay>`; `fetchNight(date: string): Promise<NightlyDay>`; `fetchNightDates(): Promise<string[]>`. They call `${VITE_API_URL || '/api'}/nightly/...` and throw `Error` with the server `error` text on non-OK.

- [ ] **Step 1: Failing tests** with `fetch` stubbed: `parses a latest response including a buy-now row`, `rejects a response missing rows`, `throws the server message on 404`.
- [ ] **Step 2: Run** `npm test`; expect FAIL.
- [ ] **Step 3: Implement** the functions above.
- [ ] **Step 4: Run** `npm test`, `npm run lint`, `npm run type-check`; expect pass.
- [ ] **Step 5: Commit** `feat(web-frontend): nightly client`.

### Task 4: Today page, routing, nav (web-frontend)

**Files:**
- Create (under `services/web-frontend/`): `src/pages/Today.tsx`, `src/components/today/SummaryStrip.tsx`, `BuyNowList.tsx`, `TriggerTable.tsx`, `DistanceBar.tsx` (hand-drawn SVG; exports pure `barPosition(distancePct: number, atrPct: number): number`, 0-100 clamped), `RowDetail.tsx`
- Test: `src/components/today/distance-bar.test.ts`
- Modify: `src/App.tsx` (`/` -> `Today`, `/dashboard` -> `Dashboard`), `src/components/Layout.tsx` (nav: Today first, Dashboard added)

**Interfaces:**
- Consumes: `fetchLatestNight`, `NightlyDay` from Task 3.
- Produces: `Today` page: header with the night's date and model profile, a stale banner when `stale` is true, summary strip (counts by label, triggers inside half a day, biggest mover), buy-now list, trigger table sorted by `abs(distance_to_trigger_pct)` ascending with a distance bar, expandable row showing `pm.rationale`, `key_risks`, `what_would_change_my_mind`, walk-away and stance trail. Loading, error and empty states each render a plain-language message. Colors use the existing theme variables; up/down uses teal/orange, never color alone, and every colored mark has a text label.

- [ ] **Step 1: Failing test** for `barPosition`: `0 distance -> 100`, `distance equal to one atr% -> 50`, `distance beyond 2 atr% clamps to 0`, `atrPct 0 -> 0`.
- [ ] **Step 2: Implement** `barPosition`, then the components and page; wire routes and nav.
- [ ] **Step 3: Run** `npm test`, `npm run lint`, `npm run type-check`, `npm run build`; expect pass.
- [ ] **Step 4: Browser check** against the real ledger: start web-api with `NIGHTLY_LEDGER_PATH=D:\Code\PersonalDev\my-Trading-Agents\data\ledger\decisions.jsonl` and the Vite dev server (proxy to it); open `/` and confirm the Nov 20 night shows 24 rows (20 triggers; KO, XOM, PFE, GME buy-now), NVDA as biggest mover at about -14%, and the stale banner absent for a current night; screenshot at desktop and 390px widths.
- [ ] **Step 5: Commit** `feat(web-frontend): Today page`.

### Task 5: Cross-service check and docs

**Files:**
- Modify: `services/web-api/README.md` (one short section: the three endpoints, the env var, the read-only mount)

- [ ] **Step 1: Run** lint, type-check, build and test in web-api and web-frontend; confirm `npm audit` still reports zero.
- [ ] **Step 2: Run** `docker compose build web-api web-frontend` and `docker compose up -d web-api web-frontend`; `curl http://localhost:38401/api/nightly/latest` returns the Nov 20 night; open `http://localhost:38400/`.
- [ ] **Step 3: Commit** `docs: nightly API and Today page`.

---

## Self-review notes
- Spec coverage: endpoints (T2), derive rules and summary (T1), mount and env (T2), Today page, stale flag, dashboard move, nav (T4), tests (T1-4), no portfolio, read-only (Global Constraints). Gap found and fixed: the stale rule was undefined in the spec; defined in T1 as my call (18:00 America/Chicago cutoff, after the 4:42 PM nightly run plus run time).
- Types: `NightlyRow`, `NightlySummary` and the `latest` shape are defined once in T1/T2 and mirrored by T3's schema.
- Proportion: bodies are left to the implementer; only signatures, test names and values are fixed.
