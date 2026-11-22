# Paper Portfolio System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Paper portfolios on real market data: picks from three sources, recorded buys, pending trigger orders, nightly exit/risk rules with alerts, a shadow portfolio that takes every pick, results per source against SPY, triggered re-analysis and a weekly teaching review.

**Architecture:** A new `services/portfolio-service` (Express 5, TypeScript ESM, `pg`) owns schema `portfolio` in the existing Postgres. Pure domain modules (accounting, fills, exits, risk, performance, screen, news) hold all rules and are unit-tested; a thin store layer is tested against real Postgres in a throwaway schema. The agent pipeline is reached only through a host-side adapter (`tools/analyze-ticker.ps1`, driven by `tools/portfolio-worker.ps1`) because analysis runs via `compose.ps1 exec trading-agents node cli.js analyze`. nginx routes `/api/portfolio/` to the service; new React pages live in `web-frontend`.

**Tech Stack:** Node 24, Express 5, TypeScript 6 (ESM, `.js` specifiers), `pg` 8, zod 4, vitest 5; React 19 + Tailwind 4 + zod; Windows PowerShell 5.1 + Pester 3.4 for host tools.

**Spec:** Claude Doc "Paper-portfolio system: build approaches and stages" (https://claude.ai/artifact/3AcsM2iGAcDoJV2Vq7nAqW), approach 1, stages 1-4, approved 2026-11-22.

## Global Constraints

- Paper trading only; no broker integration. Real market data from the local yahoo-finance service.
- Host ports bound to 127.0.0.1 in 384xx: portfolio-service host port **38408** (container 3008). Ollama stays on 11434.
- Secrets: never printed, never in env files in the repo; the service reads Postgres credentials from Docker secrets `/run/secrets/postgres_{user,password,db}`.
- Model names come only from `tools/model-profiles.json`.
- Fixed position sizes (confidence is uncalibrated); size never scales with confidence.
- Point-in-time: the nightly job for date D uses bars up to and including D only; an order created on night D can first fill on D+1's bar.
- Every pick freezes its reasoning, inputs and confidence (decision journal). LLM seconds and models are stored per analysis.
- Results are always shown against SPY.
- Response envelope `{success, data | error}` as in web-api.

## Data model (decided here; the design left it open)

Schema `portfolio`, created by SQL migrations run at service start (`schema_migrations` table).

- `portfolios` (id, name, kind `owner|shadow`, starting_cash, cash, rules jsonb, created_on date, archived bool). Rules: `position_size` (default 1000), `max_position_pct` 15, `max_sector_pct` 35, `stop_pct` 8 (used when the call has no walk-away price), `target_pct` 15, `max_hold_days` 60, `order_expiry_days` 10, `drawdown_alert_pct` 10, `max_open_positions` 20.
- `candidates` (decision journal: id, run_date, ticker, source `watchlist|screen|news|on_demand|reanalysis`, decision, confidence, action_now, label, price, trigger_price, trigger_type, walk_away, rationale, key_risks jsonb, pm jsonb, inputs jsonb, profile, fast_model, decision_model, llm_seconds, created_at; unique run_date+ticker+source).
- `orders` (id, portfolio_id, candidate_id, ticker, direction `long|short`, intent `open|close`, kind `market|trigger`, trigger_price, trigger_when `above|below`, amount (dollars, open) or quantity (close), status `pending|filled|cancelled|expired`, created_on, expires_on, filled_on, fill_price, note).
- `positions` (id, portfolio_id, ticker, direction, quantity, avg_cost, opened_on, closed_on, status `open|closed`, source, candidate_id, stop_price, target_price, hold_until, realized_pnl, sector).
- `trades` (id, portfolio_id, position_id, order_id, ticker, direction, action `open|add|reduce|close`, quantity, price, traded_on, source).
- `alerts` (id, portfolio_id, position_id, order_id, ticker, kind, severity `action|info`, message, run_date, data jsonb, created_at, acknowledged_at; unique portfolio+ticker+kind+run_date).
- `snapshots` (portfolio_id, date, cash, long_value, short_value, equity, spy_close; pk portfolio+date).
- `bars` (ticker, date, open, high, low, close; pk ticker+date) - EOD cache.
- `tickers` (ticker, name, sector, updated_at) - sector for risk.
- `source_picks` (run_date, ticker, source `screen|news`, score, reasons jsonb; pk run_date+ticker+source).
- `analysis_requests` (id, ticker, reason `on_demand|stop_hit|target_hit|big_move|stale`, portfolio_id, position_id, status `queued|running|done|failed`, requested_at, started_at, finished_at, candidate_id, error).
- `runs` (id, kind `nightly|weekly_review`, run_date, started_at, finished_at, status, summary jsonb).
- `reviews` (id, week_ending date unique, model, body_md, data jsonb, created_at).

Pick labels that count as tradeable: `Buy now`, `Buy if price reaches trigger`, `Short (bet price falls)`, `Short if price reaches trigger`.

Fill rules (EOD bars): trigger `above` fills when high >= trigger at max(open, trigger); `below` fills when low <= trigger at min(open, trigger). Stops: long low <= stop at min(open, stop); short high >= stop at max(open, stop). Targets mirror. Stop wins when both hit on one bar. Quantities are fractional, rounded to 4 places. Shorts credit proceeds to cash and need cash >= notional to open.

## Review Focus

1. A night with no bar for a ticker (halt, holiday, bad symbol): nothing fills, nothing crashes, the position keeps its last mark.
2. Re-running the nightly job for the same date: no duplicate fills, trades, alerts or snapshots.
3. A buy larger than cash, or a sell larger than the position: rejected with a clear message, no partial writes.
4. A pick whose trigger is already through the price on the next bar's open (gap): fills at the open, not the trigger.
5. Shorts: P&L sign, cash, stop direction and equity are all inverted correctly.

---

### Task 1: Service scaffold, database and migrations

**Files:** Create `services/portfolio-service/{package.json,tsconfig.json,vitest.config.ts,Dockerfile,.dockerignore,eslint.config.js}`, `src/server.ts`, `src/app.ts`, `src/db/pool.ts`, `src/db/migrate.ts`, `src/db/migrations/001_init.sql`, `src/test/db.ts`; Modify `docker-compose.yml` (service + secrets + mounts).

**Interfaces:** Produces `createPool(cfg?) : pg.Pool`, `migrate(pool, schema='portfolio')`, `createApp(deps): express.Express`, test helper `withTestDb(fn)` that creates a throwaway schema, migrates it, sets `search_path`, and drops it.

- [ ] Test: `migrate` creates every table above in a fresh schema and is idempotent (second run applies nothing).
- [ ] Test: `GET /api/portfolio/health` returns `{success:true}`.
- [ ] Implement; compose service `portfolio-service` on 127.0.0.1:38408, secrets postgres_*, mounts `./data:/app/data:ro`, `./tools/model-profiles.json:/app/config/model-profiles.json:ro`, env `YAHOO_URL=http://yahoo-finance:3002`, `NEWS_URL=http://news-aggregator:3004`, `OLLAMA_URL=http://host.docker.internal:11434`.
- [ ] Commit.

### Task 2: Domain rules (pure)

**Files:** `src/domain/{accounting,fills,exits,risk,performance}.ts` + tests.

**Interfaces:**
- `applyOpen(pos|null, {direction, quantity, price}) -> Position`, `applyClose(pos, quantity, price) -> {position, realized}`, `cashDelta(direction, action, qty, price)`, `equity(cash, positions, marks)`.
- `triggerFill(order, bar) -> number|null`, `triggerWhen(trigger, refPrice) -> 'above'|'below'`, `quantityFor(amount, price)`.
- `exitPlan(direction, entry, walkAway|null, rules, openedOn) -> {stop, target, holdUntil}`, `checkExit(position, bar, date) -> {kind:'stop_hit'|'target_hit'|'max_hold', price}|null`, `isBigMove(position, bar, prevClose, atr)`.
- `riskAlerts(portfolio, positions, marks, sectors, peakEquity) -> AlertDraft[]`, `preTradeCheck(...) -> {ok, error?, warnings[]}`.
- `indexSeries(snapshots) -> {date, portfolio, spy}[]` (both start at 100), `sourceStats(closedAndOpenPositions, marks, spyByDate)`.
- [ ] Tests per function including the five Review Focus cases; implement; commit.

### Task 3: Market data client

**Files:** `src/market/yahoo.ts` + test. `fetchBars(ticker, from, to)` parses the CSV, `fetchQuotes(tickers)` (POST /api/quotes, chunks of 100), `fetchSector(ticker)`. Bars cached through the store. Tests stub `fetch`.

### Task 4: Store

**Files:** `src/store/*.ts` + db tests. Repositories for every table; `tx(fn)` helper. Integration tests run against real Postgres via `withTestDb`.

### Task 5: Ledger ingest

**Files:** `src/jobs/ingest.ts` + test with fixture. Reads `data/ledger/decisions.jsonl` lines for a date, maps group `screen|news` to that source and anything else to `watchlist`, upserts candidates (inputs = price, ma50, ma200, target, range_pos, atr, stance; llm_seconds when present).

### Task 6: Portfolio operations

**Files:** `src/services/portfolio-ops.ts` + db tests. `createPortfolio`, `recordBuy` (market, at given price or last close), `placeTriggerOrder`, `recordSell` (partial or full), `cancelOrder`, `ackAlert`. All in one transaction each; pre-trade checks.

### Task 7: Nightly job

**Files:** `src/jobs/nightly.ts` + db tests. For date D: ingest; load bars for held/ordered tickers + SPY; fill or expire pending orders; check exits (owner: alerts; shadow: auto-close); sell-call alerts from tonight's calls; big moves -> re-analysis requests; shadow opens from tonight's picks; mark-to-market snapshots; risk alerts; record run. Idempotent per date.

### Task 8: REST routes

**Files:** `src/routes/*.ts` + tests (app on port 0, real test schema). Portfolios CRUD, positions, orders, trades, alerts, candidates (`/picks?date=`), performance, sources/results, analysis-requests (create, list, claim, complete, fail), runs, `POST /jobs/nightly`, `GET /sources/tonight`, reviews.

### Task 9: Host adapter and nightly hooks

**Files:** `tools/decision-parse.ps1` (+Tests) extracted from nightly-brief; `tools/analyze-ticker.ps1`; `tools/portfolio-worker.ps1`; Modify `tools/nightly-brief.ps1` (`-ExtraTickers ticker:source`, `seconds` in ledger lines), `tools/nightly-run.ps1` (sources before the brief, `POST /jobs/nightly` after, drain worker queue, weekly review on Fridays); register "Portfolio analysis worker" task (every 10 minutes, hidden).

### Task 10: Screen and news sources

**Files:** `src/sources/{universe.json,screen.ts,news.ts}` + tests. Screen: trend (price > 200-day avg, 50-day > 200-day), not stretched (price <= 1.15 x 50-day), analyst rating <= 2.5, upside to target ranked, excludes watchlist and anything picked in the last 5 days; top 4. News: market-mover queries, counts universe ticker/company mentions in titles, top 3 not on the watchlist or screened tonight.

### Task 11: Weekly review

**Files:** `src/jobs/weekly-review.ts` + test (stubbed LLM). Gathers the week (trades, alerts, picks by source with outcomes, owner vs shadow vs SPY), asks the default profile's decision model through Ollama `/api/chat`, stores markdown; on LLM failure stores a data-only review.

### Task 12: Web pages

**Files:** nginx route; `web-frontend/src/services/portfolio.ts` (+test), pages `Portfolios`, `Portfolio`, `Picks`, `Sources`, `Reviews`, a two-line indexed chart, nav update (+test).

### Task 13: Deploy, end-to-end check, review

Build, run against real data (create a portfolio, buy, trigger order, nightly for the latest date, one on-demand analysis through the worker, screen and news dry run, a weekly review), fresh-context review on the most capable model, fix Critical/Important test-first, commit, push.
