# Official Zep Graphiti Services for Trading Agents

This directory provides Docker orchestration for the official Zep Graphiti services used by the TypeScript Trading Agents project.

## Overview

This setup uses **only official Docker images** from Zep AI:
- `zepai/graphiti:latest` - Official Zep Graphiti REST API service
- `neo4j:5.22.0` - Official Neo4j graph database

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

### LM Studio Integration
```yaml
- OPENAI_API_KEY=lm-studio
- OPENAI_BASE_URL=http://host.docker.internal:1234/v1
- MODEL_NAME=microsoft/phi-4-mini-reasoning
```

### Neo4j Database
```yaml
- NEO4J_URI=bolt://neo4j:7687
- NEO4J_USER=neo4j
- NEO4J_PASSWORD=password
```

## Service Endpoints

### Zep Graphiti API (Port 8000)
- **REST API**: `http://localhost:8000`
- **Documentation**: `http://localhost:8000/docs`
- **Redoc**: `http://localhost:8000/redoc`

### Neo4j Database (Port 7474/7687)
- **Browser**: `http://localhost:7474`
- **Credentials**: neo4j/password

## Integration

The TypeScript project uses `ZepGraphitiMemoryProvider` to connect to the Zep Graphiti service at `http://localhost:8000`.

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

1. Install dependencies using uv:
```bash
uv sync
```

2. Set up environment variables in `.env`:
```bash
# LM Studio configuration (for local LLM)
OPENAI_API_KEY=lm-studio
OPENAI_BASE_URL=http://localhost:1234/v1
OPENAI_MODEL=microsoft/phi-4-mini-reasoning

# Neo4j configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# Service configuration
ZEP_SERVICE_HOST=0.0.0.0
ZEP_SERVICE_PORT=8080
```

3. Start Neo4j (required for Graphiti):
```bash
docker run -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/password neo4j:5.22.0
```

4. Run the Zep Graphiti service:
```bash
uv run python main.py
```

## API Endpoints

- `POST /memory/add` - Add episodes to the knowledge graph
- `GET /memory/search` - Search the knowledge graph
- `POST /memory/facts` - Add facts/relationships
- `GET /memory/facts/search` - Search for specific facts
- `GET /health` - Service health check

## Integration

The TypeScript project connects to this service via HTTP API calls to manage graph-based memory operations.