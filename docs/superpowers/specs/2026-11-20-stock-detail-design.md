# Stock detail page (design, short)

Status: approved in chat 2026-11-20 ("do it"). Size: small change (one endpoint, one page, one markdown renderer).

## Intent
Today lists 24 calls; the reader needs to see WHY one call was made and how it changed night to night. This is the educational half of the UI: the opinion trail (analysts -> bull/bear -> research manager -> trader -> risk views -> PM) for one stock.

## Goals
- `GET /api/nightly/stock/:ticker?date=YYYY-MM-DD` returns the ticker's history across ledger nights and that night's 12 stage write-ups.
- `/stock/:ticker` page: header (price, call, trigger, walk-away), history timeline, stage tabs. Today rows link to it.

## Non-goals
- No new ledger fields, no portfolio, no editing, no charts beyond the timeline table. No markdown library.

## Anti-goals
- The API stays read-only; never expose filesystem paths; never render LLM text as HTML.

## Approaches
Only source for stage text is `logs/nightly/<date>/pipeline.json` (keyed by ticker; stages market, social, news, fundamentals, bull, bear, research_manager, trader, aggressive, conservative, neutral, pm, plus pm_json). History comes from the ledger. Considered: copying stages into the ledger (rejected: ledger would grow 7 MB/week and the nightly script is out of scope); reading pipeline.json per request with an mtime cache (chosen).

## Design
- Env `NIGHTLY_LOGS_PATH` (default `/app/logs/nightly`); web-api already mounts `./logs`.
- Ticker validated `^[A-Z][A-Z0-9.\-]{0,9}$`, date `YYYY-MM-DD`; unknown ticker or no history -> 404.
- Default date = newest night with the ticker. `stages` is null when that night's pipeline.json is missing, unreadable, or lacks the ticker (page shows "write-ups not available for this night"). Non-string stage values are dropped.
- Frontend renders stage text with a small parser (headings, bold, bullets, paragraphs) into React elements; unknown syntax stays plain text.

## Testing
Unit tests for history building, stage loading (BOM, missing file, missing ticker, bad types), route validation, and the markdown parser. Browser check against live Nov 20 data.
