# Current Todos (snapshot 2025-08-30)

- [ ] Re-run ingestion `/entity-node` test while streaming logs to capture any 500 errors and full tracebacks.
- [ ] Add retry/backoff logic and improved error logging around embedder calls in `graphiti_core` or Graphiti wrappers.
- [ ] Harden `py_zep/secrets/start-wrapper.sh` JSON parsing for `/v1/models` listing.
- [ ] Move real `embedder_api_key` into Docker secrets and remove secrets from `.env.local`.
- [ ] Confirm wrapper writes diagnostics to `/tmp` and `/var/log` as expected in container runs.

Completed (high level):
- start-wrapper cleaned and installed
- docker-compose Neo4j URI fixed
- persisting embedder settings in `.env.local`
- verified direct embedder `/v1/embeddings` calls
