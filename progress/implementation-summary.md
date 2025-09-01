## Progress as of 2025-08-30

- Implemented and installed a cleaned `start-wrapper.sh` in `py_zep/secrets` that normalizes LM Studio URLs, prefers `/v1/models`, supports an `EMBEDDER_LM_STUDIO_URL` override, and has Python fallback HTTP helpers when `curl` is missing.
- Updated `py_zep/docker-compose.yml` to fix Neo4j URI resolution and removed the environment override for `OPENAI_API_KEY` so `.env.local` values are used.
- Persisted embedder settings in `py_zep/.env.local` (including `EMBEDDER_LM_STUDIO_URL` and `OPENAI_BASE_URL`) and set a development placeholder `OPENAI_API_KEY=sk-local` to allow local LM Studio requests.
- Verified that `http://host.docker.internal:1234/v1/models` contains `text-embedding-qwen3-embedding-4b` and that direct POSTs to `/v1/embeddings` succeed from inside the container.
- Reproduced the Graphiti embedder flow; sync and async embedder calls (via installed `openai` and `graphiti_core` wrappers) returned embeddings when environment variables were set correctly.
- Observed an intermittent 500 on `/entity-node`; logs previously showed connection errors (empty Bearer header) which we fixed by adjusting environment and compose. Remaining 500s require an ingestion re-run to capture any further tracebacks.

Next actions (if resumed):
- Re-run the `/entity-node` ingestion test while tailing logs to capture any repeat 500s and fix error handling or add retries for transient network failures.
- Harden `start-wrapper.sh` JSON parsing for `/v1/models` listing.
- Replace placeholder API key with Docker secret mapping for `embedder_api_key` and ensure `.env.local` contains no secrets.
