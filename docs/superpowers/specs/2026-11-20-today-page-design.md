# Today page + nightly read API (design, short)

Status: awaiting approval. Size: small change (one new route group, one page, one volume mount).

## Intent
The nightly run already produces 24 calls a night into `data/ledger/decisions.jsonl`, but nothing in the web app shows them. Build the Today board from the approved design canvas in `services/web-frontend`, fed by real data, so the morning read is one screen: what to buy now, what waits for a trigger, how close each trigger is, and why. This is the first slice of the human-friendly, educational UI. Portfolio is out of scope.

## Goals
- `web-api` serves read-only nightly data from the ledger.
- `web-frontend` gets a Today page at `/`.
- The existing Dashboard, Analysis, History and Backtesting pages stay; the old Dashboard moves to `/dashboard` (kept reachable, nothing deleted).

## Non-goals
- No Stock, Scorecard, Stocks, Platform or Mobile pages yet. No watchlist writing. No portfolio. No theme rework (use the existing theme context).
- No chart library; draw small SVG by hand like the canvas does.

## Anti-goals
- Never let the API write to the ledger or watchlist. Mount read-only.
- Do not present a stale night as today: show the date prominently and flag when the newest night is older than the last weekday.

## Approaches (chosen: 1)
1. Read-only endpoints in `web-api` over a read-only mount of `./data` (chosen). Reusable by later pages.
2. Nightly script writes a static `latest.json` the frontend loads: least code but not queryable.
3. Extend the old HTML brief viewer: leaves the React app stuck on the old pages.

## Design
API (new `routes/nightly.ts`, mounted at `/api/nightly`):
- `GET /api/nightly/dates` -> ledger dates, newest first.
- `GET /api/nightly/latest` and `GET /api/nightly/:date` -> `{ date, profile, rows[], summary }`.
  - Row = ledger fields the page needs: ticker, group, label, action_now, decision, confidence, price, trigger_price, trigger_type, trigger_reason, walk_away, atr, stance, pm.rationale, pm.key_risks, pm.what_would_change_my_mind.
  - Derived per row: `change_pct` vs the previous ledger date, `distance_to_trigger_pct`, `inside_half_day` (distance within half of ATR as a percent of price).
  - Rows with no trigger_price (buy-now) are valid; derived trigger fields are null.
  - `summary`: counts by label, triggers inside half a typical day, biggest mover.
- Date param validated against `^\d{4}-\d{2}-\d{2}$`; file parsed per request with a small mtime cache. Malformed JSONL lines are skipped and counted.
- docker-compose: add `./data:/app/data:ro` to web-api; path from `NIGHTLY_LEDGER_PATH` (default `/app/data/ledger/decisions.jsonl`).

Frontend:
- `pages/Today.tsx` at `/`, `services/nightly.ts` for fetch + zod parse, small `components/today/*` (summary strip, buy-now list, trigger table with distance bar, row expander for rationale/risks).
- Old `Dashboard` route moves to `/dashboard`; nav gets "Today" first.

## Testing
- web-api: unit tests for the derive functions (change_pct, distance, inside_half_day, no-trigger rows) and the route (latest, bad date, missing file) against a fixture ledger.
- web-frontend: type-check, lint, build; page checked against the real Nov 20 data in a browser.

## Left to the builder
Visual details follow the Today board in design artifact `bf2dd495-68de-4061-8bb9-0c1e2ceed336`. Component split and file names are the builder's call.
