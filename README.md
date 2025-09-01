# TradingAgents - Multi-Agent LLM Trading Framework

A TypeScript-based multi-agent system that simulates a trading firm with specialized AI agents collaborating to analyze financial markets and generate trading insights.

## 🚀 Quick Start

```bash
# Install dependencies
cd js
npm install
npm run build

# Start the interactive CLI
npm run cli
```

## 🏗️ Architecture

Multi-agent system with specialized roles:
- **Analysts**: Market, Social, News, Fundamentals analysis
- **Researchers**: Bull & Bear position research
- **Risk Management**: Safe, Risky, Neutral risk assessment
- **Execution**: Trading and portfolio management
- **Memory System**: Advanced AI-powered learning and pattern recognition

## 🎯 Key Features

- **Multi-LLM Support**: OpenAI, Anthropic, Google, LM Studio, Ollama
- **Interactive CLI**: Real-time analysis progress and results
- **TypeScript**: Full type safety and modern development experience
- **Containerized Services**: Docker-based memory and data infrastructure
- **Advanced Memory**: Temporal reasoning and performance learning
- **LangGraph Orchestration**: Sophisticated workflow management

## 📚 Documentation

- [Getting Started Guide](docs/GETTING-STARTED.md)
- [System Architecture](docs/ARCHITECTURE.md)
- [Configuration Guide](docs/CONFIGURATION.md)
- [Advanced Memory System](docs/ADVANCED-MEMORY-SYSTEM.md)

## 🔧 Configuration

Create a `.env` file in the `js/` directory:

```bash
# LLM Provider (openai | lm_studio | google | anthropic | ollama)
LLM_PROVIDER=openai

# OpenAI-compatible base URL precedence:
# 1) OPENAI_BASE_URL  2) LM_STUDIO_BASE_URL  3) LLM_BACKEND_URL
# If any is set, OpenAI-compatible clients can operate without a real key (dummy key allowed).
OPENAI_BASE_URL=
LM_STUDIO_BASE_URL=
LLM_BACKEND_URL=https://api.openai.com/v1

# API Keys (set only what you use)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=

# Embedding controls: local fallback is DISABLED in production unless true
ALLOW_LOCAL_EMBEDDING=false

# Optional logging
LOG_LEVEL=info

# Optional: Memory Services
ZEP_SERVICE_URL=http://localhost:8000
```

Secret policy: never commit secrets or keys. Use environment variables only. `.env*` files are gitignored; use the provided `.env.example` and `py_zep/.env.example` as templates. For local LM Studio, set `LM_STUDIO_BASE_URL=http://localhost:1234/v1` and omit `OPENAI_API_KEY`.

## 🧪 Development

```bash
# Run tests
npm test

# Start memory services (optional)
cd py_zep
docker-compose up -d

# Development mode
npm run dev
```

## 📁 Project Structure

```
├── js/src/
│   ├── agents/          # AI agent implementations
│   ├── cli/             # Interactive command line interface
│   ├── graph/           # LangGraph orchestration
│   └── providers/       # LLM and memory providers
├── py_zep/              # Memory services (Docker)
└── docs/                # Documentation
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details