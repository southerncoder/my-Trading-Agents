# Zep Graphiti Service for Trading Agents

This directory contains a Python service that provides Zep Graphiti functionality for the TypeScript Trading Agents project.

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