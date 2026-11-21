# Scorecard (design and plan, short)

> Executed inline with superpowers:executing-plans. Approach approved in chat 2026-11-20 ("agree, continue").

**Goal:** Show whether past calls worked, fairly: forward returns at fixed horizons, as excess return over SPY, split by call type, confidence band and model profile.
**Why this shape:** `tools/score-ledger.ps1` compares every call to the latest quote (mixed horizons, no benchmark). This week SPY fell 6.8% and the watchlist 7.5%, so raw returns mostly say "the market fell". The JSON file is the stable seam: the engine can be replaced later (e.g. by portfolio work) without touching the API or page.
**Non-goals:** portfolio/paper positions, intraday data, deleting `score-ledger.ps1` (left in place; the README says the scorecard supersedes it).
**Anti-goals:** the API stays read-only and network-free; a failed scoring run must never destroy the last good `scorecard.json`; the page must not imply conclusions from tiny samples.

## Global Constraints
- Scorer code in `services/web-api/src/scorecard/` (pure, tested) and `src/scripts/score.ts` (CLI, runs on the host). Reuses `loadLedger` (BOM, bad rows, one profile per night).
- Env: `NIGHTLY_LEDGER_PATH` (default `../../data/ledger/decisions.jsonl` from the web-api dir), `NIGHTLY_LOGS_PATH` (default `../../logs/nightly`), `YAHOO_URL` (default `http://localhost:38402`). Output `<logs>/scorecard.json`, written to a temp file then renamed.
- Prices: ledger `price` is that day's close. History CSV from `GET {YAHOO_URL}/api/historical/{T}?startDate=&endDate=` (header `Date,Open,High,Low,Close,...`, comment lines start with `#`).
- Horizons 1, 3, 5 trading days (bars strictly after the call date). A call counts at a horizon only if that many bars exist for the stock and SPY.
- Fills (trigger calls, bars inside the horizon, in order): breakout (trigger > price) fills at `max(open, trigger)` when `high >= trigger`; pullback (trigger < price) fills at `min(open, trigger)` when `low <= trigger`; a bar with `low <= walk_away` before any fill cancels the call; a bar that would both fill and touch walk-away cancels it. Unfilled at horizon end = not filled.
- Per call and horizon: `now_ret` = close(h)/price - 1; `excess` = now_ret - SPY return over the same window; trigger calls also get status and `wait_ret` (filled: close(h)/fill - 1; not filled or cancelled: 0).
- Groups: label, confidence band (`0.70+`, `0.60-0.69`, `<0.60`), profile. Cell: `n`, `avg_ret_pct`, `avg_excess_pct`, `up_share` (share with excess > 0), `enough` = n >= 10; trigger calls add `fill_rate`, `cancelled_rate`, `wait_minus_now_pct` (avg wait_ret - now_ret).
- Contract `scorecard.json`: `{ generated_at, benchmark: 'SPY', horizons: [1,3,5], calls: number, unscored: number, matured: Record<'1'|'3'|'5', number>, groups: { label: Cell[], band: Cell[], profile: Cell[] } }` with `Cell = { key, horizon, n, avg_ret_pct, avg_excess_pct, up_share, enough, trigger?: { n, fill_rate, cancelled_rate, wait_minus_now_pct } }`.
- API: `GET /api/nightly/scorecard` (before `/:date`) -> `{ scorecard: object | null }`; missing or unparsable file -> `null`, 200.

## Review Focus
- Weekend/holiday gaps (counted in bars, not days); ticker with no history or SPY missing -> call unscored and counted, never NaN.
- Same bar fills and touches walk-away; gap open beyond trigger; trigger equal to price; missing walk_away; price 0.
- Yahoo down or partial failure: CLI keeps the previous scorecard.json and exits non-zero.
- Fewer than 10 calls in a cell: shown but flagged "too early", never styled as a verdict.

### Task 1: Scoring core
**Files:** Create `src/scorecard/score.ts` + `score.test.ts`.
**Interfaces:** `parseBars(csv: string): Bar[]`; `scoreCall(call: ScoreInput, bars: Bar[], spy: Bar[], horizon: number): CallResult | null`; `buildScorecard(calls: ScoreInput[], barsByTicker: Map<string, Bar[]>, spy: Bar[], now: Date): Scorecard`. `ScoreInput = { date, ticker, profile, label, action_now, confidence, price, trigger_price?, walk_away? }`.
- [ ] Tests first for each Review Focus line and rule above; run (FAIL); implement; run; commit `feat(web-api): scorecard scoring core`.

### Task 2: CLI, endpoint, launcher
**Files:** Create `src/scripts/score.ts`; Modify `src/routes/nightly.ts` (+ `platform.test.ts` cases), `package.json` (`"score": "npm run build && node dist/scripts/score.js"`), `tools/nightly-run.ps1` (non-fatal step before status is written, output to `logs/nightly/score.log`), README.
- [ ] Endpoint tests first (file present, missing, unparsable); implement; CLI atomic-write helper tested; commit.

### Task 3: Frontend
**Files:** `src/services/nightly.ts` (+ test): `fetchScorecard()`; Create `src/pages/Scorecard.tsx`; `App.tsx` route `/scorecard`; `Layout.tsx` nav.
- Page: plain-language intro (excess vs SPY, why), matured counts per horizon, one table per group kind (rows: key; columns per horizon: n, avg excess, up share), "too early" label for `enough: false`, trigger section (fill rate, waiting vs buying now), empty state when `scorecard` is null.
- [ ] Client tests first; implement; commit.

### Task 4: Verify
- [ ] Run the CLI on real data, read the JSON, spot-check one call by hand against the history CSV; rebuild containers; curl endpoint; fresh reviewer; fix Critical/Important with TDD.
