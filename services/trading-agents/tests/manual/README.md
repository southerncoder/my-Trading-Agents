# Manual Tests

These scripts are ad-hoc diagnostic or exploratory tests not executed in CI. They live under `tests/manual/` to keep service root clean.

## Running
Use vite-node (TypeScript/ESM) or node for pure JS:
```
npm run test:manual:brave-news
npm run test:manual:learning
npm run test:manual:lmstudio-connection
npm run test:manual:lmstudio-urls
```

For docker secrets test (runs from trading-agents service root referencing ../../docker):
```
npm run test:manual:docker-secrets
```

## Guidelines
- Never add real API keys; rely on environment variables / Docker secrets.
- Prefer converting repeatable scenarios into automated workflow tests.
- Keep output concise; avoid large dumps.
- Remove obsolete manual tests after feature stabilization.
