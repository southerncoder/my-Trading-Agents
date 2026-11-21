# Watchlist requests (design and plan, short)

> Executed inline with superpowers:executing-plans. Approach "request queue" chosen by the user in chat 2026-11-20 ("2").

**Goal:** Add a stock or change its schedule from the Stocks page without the API ever writing `tools/watchlist.json`.
**How:** The page POSTs a request; the API validates it and appends one line to `data/requests/watchlist.jsonl`; at the start of the next nightly run `Apply-WatchlistRequests` (in `tools/watchlist.ps1`, the single writer of `watchlist.json`) applies them and records results. The page shows requests as "pending".
**Non-goals:** removing stocks, applying changes instantly, checking that a ticker exists (a bad symbol shows up as "no price" in that night's status), auth beyond what the API already has.
**Anti-goals:** the API gets write access to nothing but the requests folder; the watchlist mount stays read-only; a malformed or hostile request can never reach `watchlist.json`; no request is lost if a nightly run crashes mid-apply.

## Global Constraints
- Queue: `data/requests/watchlist.jsonl` (git-ignored), one JSON object per line: `{ id, at, action: 'add' | 'set_cadence', ticker, list?, cadence?, lesson? }`. Compose mounts `./data/requests:/app/requests` read-write for web-api only (the `./data:/app/data:ro` mount stays). Env `WATCHLIST_REQUESTS_PATH`, default `/app/requests/watchlist.jsonl`.
- Rules (same in API and PowerShell; PowerShell is the authority): ticker trimmed, uppercased, `^[A-Z][A-Z0-9.\-]{0,9}$`; list `core|brands` (strict for requests); cadence `nightly|weekly|once|paused`; `add` needs list and cadence, `lesson` optional, max 200 chars, control characters stripped; `set_cadence` needs cadence.
- API `POST /api/watchlist/requests`: body must be `application/json` (else 415); existing `validateOrigin` and rate limit apply; at most 25 pending lines (else 429); `add` for a ticker already on the watchlist or already pending as an add -> 409; `set_cadence` for a ticker neither on the watchlist nor pending as an add -> 404; invalid fields -> 400 with a plain message; success -> 202 `{ id }`. `GET /api/watchlist` gains `pending: Request[]`.
- Apply: move the queue to `watchlist.jsonl.processing` first (an append after the move starts a new queue; a leftover `.processing` from a crashed run is processed first), validate and apply each line, write `watchlist.json` via temp file then move (UTF-8 no BOM, same JSON shape, `_comment` kept), append `{ at, request, result: 'applied' | 'rejected', reason? }` to `watchlist.done.jsonl`, delete `.processing`. If `watchlist.json` is missing or unparsable, change nothing and keep the `.processing` file. Returns summary lines for `status.txt`.
- Launcher: call it right after `watchlist.ps1` is dot-sourced and before `Get-Watchlist`; add its summary lines to `$lines`.

## Review Focus
- A request written while the apply runs is not lost; a crashed run does not drop requests; unparsable queue lines are rejected, not fatal.
- Hostile input: ticker like `NVDA"}], "x":1`, path-like, 10 MB body, wrong content type, cross-origin POST.
- `add` of an existing ticker, `set_cadence` of an unknown one, two pending adds of the same ticker.
- `watchlist.json` stays valid JSON with `_comment` and the array shape even with one stock.
- The Stocks page never claims a change is live; pending requests are visible; failure to post shows a plain message.

### Task 1: Apply side (PowerShell + Pester)
**Files:** Modify `tools/watchlist.ps1` (add `Apply-WatchlistRequests`), `tools/nightly-run.ps1`; Create `tools/watchlist.Tests.ps1`; `.gitignore` (`data/requests/`).
**Interface:** `Apply-WatchlistRequests([string]$WatchlistPath, [string]$QueuePath, [string]$DonePath): string[]`.
- [ ] Pester tests first for every Review Focus line and rule above (`Invoke-Pester tools\watchlist.Tests.ps1`, Pester 3.4 syntax); implement; commit.

### Task 2: API
**Files:** Create `src/services/watchlist-requests.ts` (+ test), extend `src/routes/watchlist.ts` (+ route tests), `docker-compose.yml`, README.
**Interfaces:** `validateRequest(body: unknown): { ok: true, request } | { ok: false, status, error }`, `readPending(path)`, `appendRequest(path, request)`.
- [ ] Tests first; implement; commit.

### Task 3: Frontend
**Files:** `src/services/nightly.ts` (+ test): `pending` in the watchlist schema, `postWatchlistRequest()`; `src/pages/Stocks.tsx`; `src/components/stocks/` form helper (+ test).
- Add-stock form (ticker, list, schedule, optional note) and a schedule select per row; a "waiting for the next nightly run" list; plain success and error messages.
- [ ] Tests first; implement; commit.

### Task 4: Verify
- [ ] Apply against a temp copy; POST to the running stack, see it pending, then remove the test line; fresh reviewer; fix Critical/Important with TDD.
