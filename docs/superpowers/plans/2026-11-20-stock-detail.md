# Stock Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (chosen: native, inline).

**Goal:** Per-stock page with history timeline and the 12-stage opinion trail.
**Architecture:** `stock-detail.ts` (pure history builder + mtime-cached stage loader) behind a new route in `nightly.ts`; frontend client + markdown parser + `Stock` page.
**Tech Stack:** as the Today plan (Express 5/TS, React 19, zod 4, vitest).
**Spec:** `docs/superpowers/specs/2026-11-20-stock-detail-design.md`

## Global Constraints
- Ticker `^[A-Z][A-Z0-9.\-]{0,9}$`; date `^\d{4}-\d{2}-\d{2}$` and a real calendar date; invalid -> 400. Register `/stock/:ticker` before `/:date`.
- Env `NIGHTLY_LOGS_PATH`, default `/app/logs/nightly`; file `<dir>/<date>/pipeline.json`; strip a leading BOM. Read-only; errors never include paths.
- Stage keys exactly: market, social, news, fundamentals, bull, bear, research_manager, trader, aggressive, conservative, neutral, pm.
- Response envelope `{ success, data | error }`. No raw HTML rendering of LLM text.

## Review Focus
- Ticker path tricks (`../x`, lowercase, 11+ chars) -> 400, no file access.
- `date` param pointing at a night with no pipeline.json -> 200 with `stages: null`.
- pipeline.json present but ticker missing, or a stage not a string -> `stages: null` / stage dropped.
- LLM text containing `<script>`, unbalanced `**`, or very long lines renders as text, never as markup.
- Ticker present on only some nights -> history lists only those nights.

---

### Task 1: Stock detail module + route (web-api)
**Files:** Create `src/services/stock-detail.ts`, `src/services/stock-detail.test.ts`; Modify `src/routes/nightly.ts`, `src/routes/nightly.test.ts`; fixture `src/routes/__fixtures__/logs/2026-11-20/pipeline.json`.
**Interfaces:**
- Consumes: `LedgerRow`, `loadLedger` (existing).
- Produces: `STAGE_KEYS: readonly string[]`; `interface HistoryPoint { date: string; profile: string; price: number; label: string; decision: string; confidence: number; trigger_price?: number; trigger_type?: string; walk_away?: number }`; `stockHistory(byDate: Map<string, LedgerRow[]>, ticker: string): HistoryPoint[]` (oldest first); `loadStages(logsDir: string, date: string, ticker: string): Promise<Record<string, string> | null>`; route `GET /api/nightly/stock/:ticker` -> `{ ticker, date, history, stages }`.
- [ ] Failing tests: `stockHistory lists only nights containing the ticker, oldest first`; `loadStages returns only string stages`; `loadStages strips a BOM`; `loadStages null for missing file / missing ticker`; route: `200 with history and stages`, `date without pipeline -> stages null`, `lowercase or ../ ticker -> 400`, `unknown ticker -> 404`, `bad date -> 400`.
- [ ] Run tests, expect FAIL; implement (stat+mtime cache keyed by path); run tests, lint, type-check, build; commit `feat(web-api): stock detail endpoint`.

### Task 2: Client + markdown parser (web-frontend)
**Files:** Modify `src/services/nightly.ts`, `src/services/nightly.test.ts`; Create `src/components/stock/markdown.ts`, `markdown.test.ts`.
**Interfaces:**
- Produces: `stockDetailSchema`, `type StockDetail`, `fetchStock(ticker: string, date?: string): Promise<StockDetail>`; `type Inline = { text: string; bold: boolean }`; `type Block = { kind: 'heading'; level: 1|2|3; inline: Inline[] } | { kind: 'bullets'; items: Inline[][] } | { kind: 'paragraph'; inline: Inline[] }`; `parseMarkdown(text: string): Block[]`.
- [ ] Failing tests: `fetchStock parses stages null`, `parses history`; `parseMarkdown: ## heading level 2`, `- and * bullets group into one list`, `**bold** splits inline`, `unbalanced ** stays text`, `<script> stays literal text`, `blank lines separate paragraphs`.
- [ ] Run (FAIL), implement, run tests/lint/type-check; commit `feat(web-frontend): stock client and markdown parser`.

### Task 3: Stock page, route, links (web-frontend)
**Files:** Create `src/pages/Stock.tsx`, `src/components/stock/Markdown.tsx`, `HistoryTable.tsx`, `StageTabs.tsx`; Modify `src/App.tsx` (`/stock/:ticker`), `src/components/today/RowDetail.tsx` (link "Full opinion trail").
- [ ] Implement: header (price, call, trigger, walk-away), history table (date, price with change arrow, call, trigger), tabs in pipeline order with `role=tablist`, keyboard arrows, nights switcher from history dates, states for loading/error/stages null.
- [ ] Run tests, lint, type-check, build; browser check against live Nov 20 data (NVDA: 5 history rows, 12 tabs, bold/bullets rendered, no `<`-markup injected); commit `feat(web-frontend): stock detail page`.

### Task 4: Docs + verification
- [ ] README section for the endpoint and `NIGHTLY_LOGS_PATH`; full test/lint/build in both services; commit.
