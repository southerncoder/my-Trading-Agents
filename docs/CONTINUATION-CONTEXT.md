# CONTINUATION-CONTEXT.md

## Machine Migration & Environment Setup Checklist (as of 2025-09-13)

This file documents the minimum steps and environment variables required to set up the TradingAgents system on a new machine or after a migration.

---

## 1. Environment Variables (Required)

Copy `.env.example` to `.env.local` and fill in the following values:

- `LLM_PROVIDER` (e.g., `remote_lmstudio`, `openai`, `anthropic`, `google`)
- `LLM_BACKEND_URL` (e.g., `http://localhost:1234/v1` for LM Studio)
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY` (if using cloud LLMs)
- `FINNHUB_API_KEY`, `ALPHA_VANTAGE_API_KEY`, `MARKETSTACK_API_KEY` (for financial data)
- `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` (for Reddit integration)
- `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` (for memory/graph services)

> **Note:** Never commit `.env.local` with real secrets. Only `.env.example` should be tracked in git.

---

## 2. Service Startup

- Start LM Studio (local or network, ensure model is preloaded if needed)
- Start Zep Graphiti and Neo4j (see `py_zep/README.md` for Docker instructions)
- Run `npm install` in `services/trading-agents/` to install dependencies
- Run `npm test` to validate the setup

---

## 3. Validation

- Run `npm run cli` for CLI interface
- Run `npm run test-enhanced` for enhanced tests
- Confirm all tests pass and no secrets are present in committed files

---

## 4. Security

- Ensure `.env.local` is in `.gitignore` (it is by default)
- Rotate any credentials if `.env.local` was ever committed
- Use strong passwords for all services in production

---

## 5. Troubleshooting

- If LM Studio model switching fails, check `REMOTE_LM_STUDIO_BASE_URL` and `REMOTE_LM_STUDIO_API_KEY` environment variables
- For memory/graph issues, verify Zep Graphiti and Neo4j are running and credentials are correct
- For API errors, check all API keys and network connectivity

---

## 6. Migration Notes

- All test files are now in `js/tests/` or subfolders
- No hardcoded secrets or passwords are present in committed code
- All configuration is via environment variables
- See `docs/SECURITY-CONSOLIDATED.md` for security best practices

---

_Last updated: 2025-08-30_
