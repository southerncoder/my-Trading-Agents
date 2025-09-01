Pause note — 2025-08-30

Work paused. Snapshot of state and resume instructions:

- Reason for pause: manual checkpoint and environment shutdown requested.
- Services stopped: zep-graphiti and neo4j (see instructions below for restore).
- Key files changed:
  - `py_zep/.env.local`: embedder and OPENAI_BASE_URL persisted; placeholder `OPENAI_API_KEY=sk-local` set for local testing.
  - `py_zep/docker-compose.yml`: removed `OPENAI_API_KEY` override so env_file values are used.
  - `py_zep/secrets/start-wrapper.sh`: cleaned and installed (normalizes LM Studio URLs, checks `/v1/models`, supports embedder override).
- Quick resume steps:
  1. Ensure LM Studio (embedder) is reachable from the host at `http://host.docker.internal:1234` or update `py_zep/.env.local` accordingly.
  2. Replace `OPENAI_API_KEY` in `.env.local` with a real key or configure Docker secret `embedder_api_key` and update `docker-compose.yml` to use it.
  3. Start services: `docker compose -f py_zep/docker-compose.yml up -d` from repo root.
  4. Tail logs: `docker logs -f trading-agents-zep-graphiti` and `docker logs -f trading-agents-neo4j`.

- Contact details: See README for auth and developer notes.
