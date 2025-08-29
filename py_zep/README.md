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
- OPENAI_API_KEY=your-api-key
- OPENAI_BASE_URL=http://your-lm-studio-host:port/v1
- MODEL_NAME=your-model-name
```

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

1. Install dependencies using uv:
```bash
uv sync
```

2. Set up environment variables in `.env`:
```bash
# LM Studio configuration (for local LLM)
OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=http://your-host:port/v1
OPENAI_MODEL=your-model-name

# Neo4j configuration
NEO4J_URI=bolt://your-host:port
NEO4J_USER=your-username
NEO4J_PASSWORD=your-secure-password

# Service configuration
ZEP_SERVICE_HOST=your-host
ZEP_SERVICE_PORT=your-port
```

3. Start Neo4j (required for Graphiti):
```bash
docker run -p port:port -p port:port -e NEO4J_AUTH=username/password neo4j:5.22.0
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