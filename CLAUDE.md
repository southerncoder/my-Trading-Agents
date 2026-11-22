# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

TradingAgents: a multi-agent LLM trading-analysis framework (fork of Tauric Research's project), run as a Docker Compose stack of small Node services. Output is **paper analysis only** (BUY/HOLD/SELL calls, trigger levels), never real orders. A nightly pipeline analyzes a watchlist and renders an HTML brief.

## Layout

- `services/trading-agents/` — the core (TypeScript, Vite/vite-node, LangGraph). Everything else feeds it.
- `services/{yahoo-finance,news-aggregator,finance-aggregator,government-data,social-sentiment}-service/` — data microservices the core calls over HTTP (mostly plain JS/Express; `government-data` is TS).
- `services/web-api` (Express/TS) + `services/web-frontend` (React/Vite/Tailwind) — optional web UI.
- `tools/` — PowerShell/Python operational scripts (nightly brief, eval, ledger scoring, secrets, compose wrapper). `scripts/` is dependency-automation tooling. Several files exist in both; `tools/` is the live one for the nightly pipeline.
- `docker-compose.yml` — all services bound to `127.0.0.1` on `384xx` ports (frontend 38400, web-api 38401, yahoo-finance 38402, news 38404, government-data 38405, finance 38406, social 38407, graphiti 38410, postgres/redis/neo4j 38420-38423).

There is no root `package.json`: each service has its own `package.json`, `node_modules` and `eslint.config.js`. Run npm commands from inside the service directory.

## Commands

Run from `services/trading-agents/` unless noted.

```bash
npm run build            # vite build -> dist/ (the CLI and the container run dist/, not src/)
npm run type-check       # tsc --noEmit
npm run lint             # eslint .   (lint:fix to autofix)
npm run quality          # type-check + lint + prettier check
npm test                 # = test:workflow, vite-node scripts/run-workflow-tests.ts
npm run test:performance # jest (ts-jest ESM), perf tests only
npx vite-node tests/workflow/basic-config.test.ts   # run ONE test file
npm run cli:dev -- analyze NVDA 2026-11-17          # run CLI from source, no build
node cli.js analyze NVDA 2026-11-17                 # run CLI from built dist/
```

- `test` is not a jest run: `scripts/run-workflow-tests.ts` imports a hard-coded list of `tests/workflow/*.test.ts` files and exits 0 unless one is critical. A new workflow test must be added to that list. Many files under `tests/` are standalone vite-node scripts, not picked up by any runner; jest only matches `*.test.ts`/`*.spec.ts` (`jest.config.json`).
- Other services: `news-aggregator` and `finance-aggregator` use jest (`npm test`, `npm run test:unit`); `government-data` uses vitest (`npm run test:unit`, `type-check`); `social-sentiment` uses `node --test`; `yahoo-finance` has no tests.
- Compose must go through `tools/compose.ps1` (loads credentials from `docker/secrets/*.txt` into env): `.\tools\compose.ps1 up -d`, `.\tools\compose.ps1 ps`. Plain `docker compose` lacks the Neo4j/Postgres credentials.
- Shell is PowerShell on Windows; most `tools/*.ps1` are PowerShell-only.

### Nightly pipeline / evaluation

```powershell
.\tools\nightly-brief.ps1 -Tickers NVDA,KO -BrandTickers @()   # analyze -> logs/nightly/<date>/brief-data.json + brief page
.\tools\eval-decisions.ps1 -Tickers NVDA -Repeats 3            # decision-stability spread (logs/eval/<stamp>/)
.\tools\score-ledger.ps1 -MinDays 5                            # forward returns of past calls in data/ledger/decisions.jsonl
```

`nightly-brief.ps1` runs `node cli.js analyze <ticker> <date>` inside the `trading-agents` container once per ticker (~2.5 min each on local models), parses the Portfolio Manager JSON from the log, enriches with yahoo-finance data, appends to the decision ledger, then calls `tools/build-brief-page.py`. `-ReuseEvalDir` rebuilds from earlier logs without re-running models. The viewer (`tools/brief-viewer.html`) is copied once to `logs/nightly/latest.html`; each night only adds `brief-data.js` and `nights.js` (data as `.js` so the page works from `file://`).

Models are chosen by profile in `tools/model-profiles.json` (`hybrid`/`local`/`cloud`): a "fast" model for analysts/debate/risk, a "decision" model for Research Manager, Trader and Portfolio Manager. Edit model names there, never in scripts or code.

`ANALYSIS_ADJUSTMENTS` (comma list `indicators,entrycheck,flat,noise` or `all`) toggles prompt/analysis variants via `adjustmentOn()` in `src/agents/base/evidence.ts`, so each can be A/B measured (`tools/trace-stance.py`) before becoming default. It only takes effect in the container when set at container creation (`-ModelProfile` / nightly script recreate it).

## Architecture (core service)

Pipeline per ticker, orchestrated in `src/graph/enhanced-trading-graph.ts` (`EnhancedTradingAgentsGraph.analyzeAndDecide`, with LangGraph and traditional execution modes; helpers in `src/graph/services/`):

1. Analysts (market, social, news, fundamentals) — grounded in data fetched up front; `src/agents/base/evidence.ts` holds the data-quality guard (`assessDataQuality`) that forces HOLD instead of letting the LLM invent on missing data, plus the adjustment prompts.
2. Bull/Bear researchers → Research Manager.
3. Trader, then the risk team (risky/safe/neutral) → Portfolio Manager, whose structured JSON decision is parsed by `src/agents/base/decision-parser.ts` (`parseDecision`). The nightly scripts depend on that JSON shape and on `action_now`/trigger fields — change both together.

Data flow: `src/dataflows/` (cached/pooled wrappers, `unified-market-data.ts`, `service-digests.ts`) and `src/clients/` call the sibling microservices; news providers are merged into one digest by `news-aggregator-service`, with SentiSense primary and Reddit fallback for social. Memory is Zep Graphiti on Neo4j, reached only through the TS client bridge (`zep-graphiti-memory-provider-client.ts` → `graphiti_ts_bridge.py`), never raw HTTP to the Graphiti API. Other modules: `src/portfolio/` (position sizing, MPT; being extended on this `portfolio-service` branch), `src/strategies/`, `src/backtesting/`, `src/learning/`, `src/resilience/` (circuit breakers), `src/observability/` (Winston logger via `createLogger`).

## Conventions

- Imports are extensionless TS (Vite resolution); tests import from `src/`, never `dist/`.
- No `console.*` in production code (CLI user output excepted) — use `createLogger(context, component)`.
- Never commit real IPs, hostnames, keys, client IDs or model endpoints; use `.env.local` (gitignored), `docker/secrets/`, and placeholders in docs/tests. Secrets flow: root `.env.local` → `tools/migrate-secrets.ps1` → `docker/secrets/*.txt` (containers) or `services/trading-agents/.env.local` (local).
- Don't create summary/status documents unless asked (`.github/copilot-instructions.md`). That file is long and partly stale (mentions a `js/` dir and roadmap that don't exist); trust the code over it.

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes_tool` or `query_graph_tool` instead of Grep
- **Understanding impact**: `get_impact_radius_tool` instead of manually tracing imports
- **Code review**: `detect_changes_tool` + `get_review_context_tool` instead of reading entire files
- **Finding relationships**: `query_graph_tool` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview_tool` + `list_communities_tool`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
| ------ | ---------- |
| `detect_changes_tool` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context_tool` | Need source snippets for review — token-efficient |
| `get_impact_radius_tool` | Understanding blast radius of a change |
| `get_affected_flows_tool` | Finding which execution paths are impacted |
| `query_graph_tool` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes_tool` | Finding functions/classes by name or keyword |
| `get_architecture_overview_tool` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes_tool` for code review.
3. Use `get_affected_flows_tool` to understand impact.
4. Use `query_graph_tool` pattern="tests_for" to check coverage.
