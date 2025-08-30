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

## 📚 Documentation

- [Getting Started](docs/GETTING-STARTED.md)
- [Architecture](docs/ARCHITECTURE.md) 
- [Configuration](docs/CONFIGURATION.md)
- [Complete Docs](docs/)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**⚠️ Disclaimer:** Educational and research purposes only. Not financial advice.