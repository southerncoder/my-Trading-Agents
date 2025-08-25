# TradingAgents - Multi-Agent LLM Financial Trading Framework

**Status:** Production Ready ✅ | 100% Complete TypeScript Implementation  
**Last Updated:** August 24, 2025

A sophisticated multi-agent LLM-powered financial trading research framework that simulates a real-world trading firm with specialized agents collaborating via advanced LangGraph workflows.

## 🎯 Project Status

### ✅ Completed (100%)
- **Core Framework:** Complete TypeScript implementation with LangGraph integration
- **Graph Orchestration:** Dual-mode execution (Traditional + LangGraph workflows)
- **Agent System:** All agent types implemented and tested
- **Interactive CLI:** Full command-line interface with progress tracking
- **Verbose Logging:** Comprehensive debugging and monitoring capabilities with 5 log levels
- **Memory & Learning:** Reflection and adaptation capabilities
- **Multi-LLM Support:** OpenAI, Anthropic, Google, LM Studio providers
- **Build System:** Production-ready development and build workflows
- **Testing Infrastructure:** Comprehensive integration and component tests
- **Local Inference:** LM Studio integration for cost-effective development

## 🏗️ Architecture

```
TradingAgentsGraph
├── Enhanced Dual-Mode Architecture
│   ├── Traditional Sequential Workflow
│   └── LangGraph StateGraph Orchestration
├── Analysts (Market, Social, News, Fundamentals)
├── Researchers (Bull & Bear Positions)
├── Risk Management (Risky, Safe, Neutral)
├── Trading Execution (Trader, Portfolio Manager)
├── Interactive CLI (Real-time progress tracking)
└── Memory System (Learning & Reflection)
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- TypeScript 5.x
- API Keys (OpenAI, Anthropic, Google) or LM Studio for local inference

### Installation

```bash
# Clone the repository
git clone https://github.com/southerncoder/my-Trading-Agents.git
cd my-Trading-Agents/js

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys
```

### Development

```bash
# Build the project
npm run build

# Test the system
npm run test-cli
npm run test-enhanced

# Run interactive CLI
npm run cli

# Development with watch mode
npm run dev
```

## 📁 Project Structure

```
├── js/                     # TypeScript Implementation (Complete)
│   ├── src/
│   │   ├── graph/         # Core orchestration system
│   │   │   ├── trading-graph.ts           # Main graph class
│   │   │   ├── enhanced-trading-graph.ts  # LangGraph integration
│   │   │   ├── langgraph-working.ts       # LangGraph implementation
│   │   │   ├── conditional-logic.ts       # Flow control
│   │   │   ├── propagation.ts            # State management
│   │   │   ├── signal-processing.ts      # Decision extraction
│   │   │   ├── reflection.ts             # Learning system
│   │   │   └── setup.ts                  # Agent configuration
│   │   ├── agents/        # Agent implementations
│   │   ├── cli/           # Interactive command-line interface
│   │   │   ├── main.ts    # CLI orchestration
│   │   │   ├── utils.ts   # User interaction utilities
│   │   │   ├── display.ts # Terminal UI and formatting
│   │   │   └── types.ts   # CLI type definitions
│   │   ├── models/        # LLM provider abstractions
│   │   ├── types/         # TypeScript definitions  
│   │   ├── config/        # Configuration management
│   │   └── dataflows/     # Data source integrations
│   ├── tests/             # Comprehensive test suites
│   ├── dist/              # Compiled JavaScript output
│   └── package.json       # Dependencies and scripts
├── py-reference/          # Python Reference (Read-Only)
├── docs/                  # Documentation
└── CONTINUATION-CONTEXT.md # Complete context for new machines
```

## 🤖 Agent Types

### Analysts
- **Market Analyst:** Technical analysis and price movements
- **Social Analyst:** Social media sentiment and public opinion
- **News Analyst:** News events and market impact
- **Fundamentals Analyst:** Company financials and valuation

### Researchers  
- **Bull Researcher:** Positive investment thesis development
- **Bear Researcher:** Risk identification and negative catalysts

### Risk Management
- **Risky Analyst:** Aggressive high-reward strategies
- **Safe Analyst:** Conservative risk management
- **Neutral Analyst:** Balanced risk assessment

### Execution
- **Trader:** Concrete trading plans and strategies
- **Portfolio Manager:** Final trading decisions with risk considerations

## 💡 Key Features

### 🧠 Advanced Multi-Agent Orchestration
- Dynamic agent selection and execution ordering
- LangGraph StateGraph workflow integration
- Dual execution modes (Traditional + LangGraph)
- State-based workflow with conditional logic
- Memory integration for learning and adaptation

### 🔒 Production-Ready Type Safety  
- Full TypeScript coverage with strict typing
- Zero compilation errors
- Runtime validation and error handling
- Interface contracts between components

### 🎯 Flexible LLM Support
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- Google (Gemini)
- LM Studio (Local inference)
- Ollama (Local models)
- OpenRouter (Multi-provider API)
- Configurable provider switching

### 🖥️ Interactive CLI Experience
- Real-time progress tracking
- Colored terminal output
- Interactive prompts and selections
- Formatted results display
- Mock testing capabilities

### 📊 Advanced Memory System
- Vector-based similarity matching
- Performance-based learning
- Historical context retention

## 🔧 Configuration

### Environment Variables

```bash
# LLM Provider Configuration
LLM_PROVIDER=lm_studio                 # lm_studio | openai | anthropic | google
LLM_BACKEND_URL=http://localhost:1234/v1
DEEP_THINK_LLM=local-model
QUICK_THINK_LLM=local-model

# Alternative: Cloud providers
# LLM_PROVIDER=openai
# LLM_BACKEND_URL=https://api.openai.com/v1
# DEEP_THINK_LLM=gpt-4o-mini
# QUICK_THINK_LLM=gpt-4o-mini

# API Keys
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key  
GOOGLE_API_KEY=your_google_key

# Data Sources
FINNHUB_API_KEY=your_finnhub_key
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_secret

# System Configuration
ONLINE_TOOLS=true                      # Enable live data sources
MAX_DEBATE_ROUNDS=1
MAX_RISK_DISCUSS_ROUNDS=1
```

## 📖 Usage Examples

### Basic Analysis

```typescript
import { EnhancedTradingAgentsGraph } from './src/graph/enhanced-trading-graph';
import { createConfig } from './src/config';

// Create enhanced graph with LangGraph support
const config = createConfig({
  selectedAnalysts: ['market', 'news', 'fundamentals'],
  enableLangGraph: true,
  llmProvider: 'lm_studio'
});

const graph = new EnhancedTradingAgentsGraph(config);

// Run analysis with decision extraction
const result = await graph.analyzeAndDecide('AAPL', '2025-08-24');

console.log('Trading Decision:', result.decision);
console.log('Reasoning:', result.reasoning);
console.log('Confidence:', result.confidence);
```

### Interactive CLI Usage

```bash
# Start interactive CLI
npm run cli

# Follow prompts:
# 1. Enter ticker symbol (e.g., AAPL)
# 2. Select analysis date
# 3. Choose analysts (market, social, news, fundamentals)
# 4. Configure LLM provider (LM Studio recommended)
# 5. Watch real-time progress
# 6. View formatted results
```

### 🔍 Verbose Logging & Debugging

The CLI now includes comprehensive verbose logging capabilities for debugging and monitoring:

```bash
# Show all CLI options including verbose logging
npm run cli -- --help

# Enable verbose logging for any command
npm run cli -- --verbose menu
npm run cli -- --verbose analyze

# Set specific log levels (debug, info, warn, error, critical)
npm run cli -- --log-level debug menu
npm run cli -- --log-level debug --log-to-console analyze

# Disable file logging (console only)
npm run cli -- --verbose --no-file-logging menu

# Maximum verbosity for debugging
npm run cli -- --verbose --log-level debug --log-to-console
```

**Verbose Logging Features:**
- 🎯 **5 Log Levels**: debug, info, warn, error, critical with intelligent filtering
- ⏱️ **Performance Monitoring**: Built-in operation timers and duration tracking
- 🔗 **Trace Correlation**: Unique trace IDs for request tracking across workflows
- 🤖 **Agent Activity Tracking**: Detailed multi-agent workflow monitoring
- 🌐 **API Call Logging**: HTTP request/response monitoring in debug mode
- 📊 **System Information**: Node.js version, platform, memory usage in debug mode
- 🎨 **Structured Output**: JSON structured logs with colorized console output

**Interactive Configuration:**
- Access verbose logging setup through the main menu: "Configure Verbose Logging"
- Step-by-step configuration with explanations for each log level
- Real-time configuration changes with immediate feedback

### Configuration Customization

```typescript
import { createConfig } from './src/config';
import { EnhancedTradingAgentsGraph } from './src/graph/enhanced-trading-graph';

const customConfig = createConfig({
  llmProvider: 'anthropic',
  deepThinkLlm: 'claude-3-opus',
  quickThinkLlm: 'claude-3-haiku',
  enableLangGraph: true,
  maxDebateRounds: 2,
  onlineTools: false
});

const graph = new EnhancedTradingAgentsGraph(customConfig);
```

## 🧪 Testing

```bash
# Build the project
npm run build

# Run comprehensive tests
npm run test-cli          # CLI integration tests
npm run test-enhanced     # Enhanced graph tests
npm run test-components   # CLI component tests

# Interactive testing
npm run cli              # Start CLI interface
```

## 📚 Documentation

- [Complete Project Summary](docs/PROJECT-SUMMARY.md)
- [Implementation Summary](docs/progress/implementation-summary.md)
- [Current Development Status](docs/progress/current-todos.md)
- [Lessons Learned](docs/progress/lessons-learned.md)
- [Feature Parity Analysis](docs/feature-parity-analysis.md)
- [Continuation Context](CONTINUATION-CONTEXT.md)
- [Python Reference](py-reference/README.md)

## 🛣️ Roadmap

### ✅ Completed
- [x] Complete TypeScript framework with LangGraph integration
- [x] Interactive CLI interface with real-time progress tracking
- [x] Comprehensive testing infrastructure
- [x] Local inference support with LM Studio
- [x] Production-ready build system
- [x] Full documentation and context preservation

### Short Term Enhancements
- [ ] Advanced Jest testing framework integration
- [ ] Performance optimization and benchmarking
- [ ] Cloud deployment with CI/CD pipeline

### Medium Term (1 month)
- [ ] Real-time data streaming capabilities
- [ ] Advanced parallel agent execution
- [ ] Enhanced memory and learning systems

### Long Term (3 months)
- [ ] Web interface and dashboard
- [ ] Portfolio tracking and management
- [ ] Advanced ML model integration
- [ ] Enterprise features and multi-user support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Original Python implementation inspiration
- LangChain and LangGraph frameworks
- OpenAI, Anthropic, and Google for LLM APIs
- Financial data providers (Yahoo Finance, FinnHub)

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/southerncoder/my-Trading-Agents/issues)
- **Discussions:** [GitHub Discussions](https://github.com/southerncoder/my-Trading-Agents/discussions)
- **Documentation:** [Project Docs](docs/)

---

**⚠️ Disclaimer:** This software is for educational and research purposes only. Not financial advice. Use at your own risk.