# Official Zep Graphiti Services for Trading Agents

This directory provides Docker orchestration for the official Zep Graphiti services used by the TypeScript Trading Agents project.

## Overview

This setup uses **only official Docker images** from Zep AI:
- `zepai/graphiti:latest` - Official Zep Graphiti REST API service
- `neo4j:5.26.0` - Official Neo4j graph database

## Quick Start

1. **Start Services (PowerShell)**:
```powershell
.\start-zep-services.ps1
```

2. **Or start manually**:
```bash
docker-compose up
```

## Configuration

Services are configured via environment variables in the `docker-compose.yml`:

### OpenAI-Compatible Endpoint Integration
```yaml
- OPENAI_API_KEY=your-api-key
- OPENAI_BASE_URL=<your_openai_or_lm_studio_base_url>
- MODEL_NAME=your-model-name
```

### Embedder / Provider Selection
The Graphiti service uses an embedder to generate text embeddings. It expects OpenAI-style environment variables (`OPENAI_API_KEY`, `OPENAI_BASE_URL`).
Optional provider selection via:
- `EMBEDDER_PROVIDER` — one of `openai` (default), `lm_studio`, or `mock`.
- `EMBEDDER_API_KEY` — key for the chosen embedder (if required).
Note: Use `OPENAI_BASE_URL` for any OpenAI-compatible endpoint; no separate LM Studio URL setting is required.

For secure production usage, prefer Docker secrets or environment injection from your orchestration system rather than embedding API keys in `.env` files.


### Neo4j Database
```yaml
- NEO4J_URI=bolt://neo4j:port
- NEO4J_USER=your-username
- NEO4J_PASSWORD=your-secure-password
```

## Service Endpoints

### Zep Graphiti API
- **REST API**: `http://localhost:port`
- **Documentation**: `http://localhost:port/docs`
- **Redoc**: `http://localhost:port/redoc`

### Neo4j Database
- **Browser**: `http://localhost:port`
- **Credentials**: username/password

## Integration

The TypeScript project uses `ZepGraphitiMemoryProvider` to connect to the Zep Graphiti service at the configured endpoint.

### Key API Endpoints Used:
- Episodes, facts, and graph search operations
- Full temporal knowledge graph capabilities
- Semantic and hybrid search functionality

## PowerShell Scripts

- `start-zep-services.ps1` - Start services in new terminal window
- `start-zep-services.ps1 -Fresh` - Clean restart with volume removal

## Official Images Only

This setup **does not include any custom or 3rd party source code**. All services use official Docker images from:
- [Zep AI Official Images](https://hub.docker.com/r/zepai/graphiti)
- [Neo4j Official Images](https://hub.docker.com/_/neo4j)

## Setup

See central docs for setup and security guides:

- docs/zep-graphiti/DEV-SETUP.md
- docs/zep-graphiti/NEO4J_SECURITY_GUIDE.md

## Using Docker Secrets (Local Development)

For local testing you can use file-backed Docker secrets. Create the `secrets/` folder and add the following files (these are referenced by `docker-compose.yml`):

- `secrets/openai_api_key.txt` — your OpenAI-compatible API key (or leave placeholder)
- `secrets/embedder_api_key.txt` — embedder provider API key (optional)

Example (PowerShell):

```powershell
mkdir secrets
Set-Content -Path secrets\lm_studio_url.txt -Value "http://localhost:1234/v1"
Set-Content -Path secrets\openai_api_key.txt -Value "<PLACEHOLDER_OPENAI_API_KEY>"
Set-Content -Path secrets\embedder_api_key.txt -Value "<PLACEHOLDER_EMBEDDER_API_KEY>"
docker-compose up
```

When using secrets, the provided `start-wrapper.sh` will read them from `/run/secrets/*` and export environment variables expected by the Graphiti image.

## API Endpoints

- `POST /memory/add` - Add episodes to the knowledge graph
- `GET /memory/search` - Search the knowledge graph
- `POST /memory/facts` - Add facts/relationships
- `GET /memory/facts/search` - Search for specific facts
- `GET /health` - Service health check

## Integration

The TypeScript project connects to this service via HTTP API calls to manage graph-based memory operations.