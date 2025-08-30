# TradingAgents - Multi-Agent LLM Trading Framework

A TypeScript-based multi-agent framework that simulates a trading firm with specialized AI agents collaborating to analyze financial markets and generate trading insights.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose 
- PowerShell 5.1+

### Setup
```bash
# 1. Start memory services
cd py_zep
.\start-zep-services.ps1

# 2. Install and run TypeScript app
cd ../js
npm install
npm run build
npm run cli
```

### Configuration
```bash
# Local AI (recommended)
LLM_PROVIDER=local_inference
LLM_BACKEND_URL=http://localhost:1234/v1

# Or cloud providers
LLM_PROVIDER=openai
OPENAI_API_KEY=your_key
```

## 🏗️ Architecture

Multi-agent system with:
- **Analysts**: Market, Social, News, Fundamentals
- **Researchers**: Bull & Bear positions  
- **Risk Management**: Safe, Risky, Neutral
- **Execution**: Trader, Portfolio Manager
- **Memory**: Zep Graphiti temporal knowledge graphs
- **Orchestration**: LangGraph workflows

## 🎯 Features

- **Multi-LLM Support**: OpenAI, Anthropic, Google, Local inference
- **Interactive CLI**: Real-time progress tracking
- **TypeScript First**: Full type safety and modern tooling
- **Enterprise Performance**: 15,000x speedup optimizations
- **Memory & Learning**: Persistent knowledge graphs
- **Containerized Services**: Docker-based memory infrastructure

## 📁 Project Structure

```
├── js/                    # TypeScript implementation
│   ├── src/graph/        # Core orchestration
│   ├── src/agents/       # AI agent implementations  
│   ├── src/cli/          # Interactive interface
│   └── src/providers/    # LLM and memory providers
├── py_zep/               # Containerized memory services
└── docs/                 # Documentation
```

## 🧪 Testing

```bash
npm run build
npm run test-enhanced
npm run cli
```

## � CLI: LM Studio Admin Commands

The CLI includes helper commands to manage LM Studio instances used for local or networked inference. These are admin utilities and expect the LM Studio admin endpoint to be reachable when performing load/unload operations.

- `lmstudio:preload -m <model> -h <host>`: Request a model preload on an LM Studio instance and poll for availability.
- `lmstudio:unload -m <model> [-a <adminUrl>]`: Request unload of a model via the LM Studio admin endpoint. If `-a` is omitted the `LM_STUDIO_ADMIN_URL` environment variable will be used.
- `lmstudio:switch -t <model> -h <host> [-f <previous>] [-a <adminUrl>] [--no-unload]`: Switch a running LM Studio instance to a new model. This will request loading the target model and (optionally) request unload of a previous model.
- `lmstudio:metrics`: Prints a snapshot of in-memory LM Studio manager metrics.

Examples:
```powershell
# Preload model on local LM Studio
node dist/cli/cli.js lmstudio:preload -m "llama-3.2-3b-instruct" -h "http://localhost:1234/v1"

# Unload a model via admin endpoint
node dist/cli/cli.js lmstudio:unload -m "old-model" -a "http://192.168.1.85:1234/admin"

# Switch models (load target, unload previous)
node dist/cli/cli.js lmstudio:switch -t "llama-3.2-3b-instruct" -h "http://localhost:1234/v1" -f "old-model" -a "http://localhost:1234/admin"

# Print metrics
node dist/cli/cli.js lmstudio:metrics
```

Troubleshooting
```
1) Admin URL unreachable / permissions error
	- Ensure the LM Studio admin endpoint is reachable from the machine running the CLI.
	- If your LM Studio admin is exposed on a non-standard path, set `LM_STUDIO_ADMIN_URL` or pass `-a` to the command.
	- Check firewall rules and Docker port mappings if using a containerized LM Studio.

2) Model not appearing after preload
	- Confirm the LM Studio `/models` endpoint shows the model name.
	- Increase the poll timeout by setting `LM_STUDIO_MODEL_CACHE_TTL_MS` if model loading takes longer.
	- Inspect LM Studio logs for errors during model load.

3) `lmstudio:switch` hangs or times out
	- The switch command waits for the target model to become available; ensure `-h` points to the correct base URL (e.g., `http://host:port/v1`).
	- Verify the admin endpoint accepted the load request and that the target container or service has started.

4) Metrics show high failure counts
	- Metrics are in-memory counters exposed by `lmstudio:metrics`. High failure counts usually indicate networking or permission issues with the admin endpoint.

5) CLI returns non-zero exit codes
	- The CLI returns exit codes to indicate failures; check the printed error message and inspect LM Studio admin logs, then retry.
```

## �📚 Documentation

- [Getting Started](docs/GETTING-STARTED.md)
- [Architecture](docs/ARCHITECTURE.md) 
- [Configuration](docs/CONFIGURATION.md)
- [Complete Docs](docs/)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**⚠️ Disclaimer:** Educational and research purposes only. Not financial advice.