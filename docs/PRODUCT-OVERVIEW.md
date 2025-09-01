# TradingAgents Product Overview

TradingAgents is a TypeScript-based multi-agent LLM trading framework designed for modern, cross-shell development and robust, production-ready workflows.

## Key Features
- **Multi-Agent LLM Orchestration**: Specialized agents for market, news, social, research, risk, and trading.
- **Provider Flexibility**: Supports OpenAI, Anthropic, Google, LM Studio, and Ollama via unified config.
- **Advanced Memory**: Temporal reasoning, persistent memory, and Zep Graphiti integration (see `js/examples/memory/`).
- **Interactive CLI**: Real-time analysis, config management, and progress tracking.
- **Modern Tooling**: Vite build, vite-node for TS/ESM, cross-shell scripts, and containerized services.
- **Security**: All secrets via environment variables; no hardcoded credentials.

## Quick Start
```sh
cd js
npm install
npm run build
npm run cli
```

## Test & Example Demos
- Run Jest tests: `npm test`
- Run memory demos: `npx vite-node examples/memory/test-zep-graphiti-memory.ts`

## Documentation
- [Getting Started](GETTING-STARTED.md)
- [Architecture](ARCHITECTURE.md)
- [Configuration](CONFIGURATION.md)
- [Security](SECURITY-CONSOLIDATED.md)

For advanced memory and Zep Graphiti, see `js/examples/memory/` and the [Advanced Memory System](ADVANCED-MEMORY-SYSTEM.md) doc (archived).

---
For full details, see the docs folder and root README.
