# CONTINUATION-CONTEXT.md

## Machine Migration & Environment Setup Checklist (as of 2025-08-30)

This file documents the minimum steps and environment variables required to set up the TradingAgents system on a new machine or after a migration.

---

## 1. Environment Variables (Required)

Copy `.env.local.example` to `.env.local` and fill in the following values:

- `LLM_PROVIDER` (e.g., `lm_studio`, `openai`, `anthropic`, `google`)
- `LM_STUDIO_HOST` (if using LM Studio, e.g., `localhost` or `remote-host`)
- `LLM_BACKEND_URL` (e.g., `http://localhost:1234/v1`)
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY` (if using cloud LLMs)
- `FINNHUB_API_KEY`, `ALPHA_VANTAGE_API_KEY`, `NEWS_API_KEY` (for financial data)
- `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USERNAME`, `REDDIT_PASSWORD` (for Reddit integration)
- `JWT_SECRET`, `ENCRYPTION_KEY` (for production security)
- `ZEP_GRAPHITI_URL`, `NEO4J_URL`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` (for memory/graph services)

> **Note:** Never commit `.env.local` with real secrets. Only `.env.local.example` should be tracked in git.

---

## 2. Service Startup

- Start LM Studio (local or network, ensure model is preloaded if needed)
- Start Zep Graphiti and Neo4j (see `py_zep/README.md` for Docker instructions)
- Run `npm install` in `js/` to install dependencies
- Run `npm test` to validate the setup

---

## 3. Validation

- Run `npm run cli` for CLI interface
- Run `npm run test-enhanced` for enhanced tests
- Run `npm run health-check` to check all services
- Confirm all tests pass and no secrets are present in committed files

---

## 4. Security

- Ensure `.env.local` is in `.gitignore` (it is by default)
- Rotate any credentials if `.env.local` was ever committed
- Use strong passwords for all services in production

---

## 5. Troubleshooting

- If LM Studio model switching fails, check `LM_STUDIO_HOST` and `LLM_BACKEND_URL`
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
