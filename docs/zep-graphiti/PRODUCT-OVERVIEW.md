
<p align="center">
	<img src="https://avatars.githubusercontent.com/u/10604394?v=4" alt="SouthernCoder" width="100" style="border-radius: 50%;"/>
</p>

# TradingAgents Product Overview

<p align="center">
	<b>Maintained by <a href="https://github.com/southerncoder">SouthernCoder</a></b><br>
	<sub>Originally created by Tauric Research</sub>
</p>

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

---
<p align="center">
	<sub>Attribution: TradingAgents was originally developed by Tauric Research. All major contributions and ongoing maintenance are by <a href="https://github.com/southerncoder">SouthernCoder</a>.</sub>
</p>
