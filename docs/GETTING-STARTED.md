# Getting Started with TradingAgents

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** and npm
- **Docker & Docker Compose** (for advanced memory system)
- **API Keys** for cloud providers (OpenAI, Anthropic, Google)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/southerncoder/my-Trading-Agents
   cd my-Trading-Agents/services/trading-agents
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys and preferences
   ```

4. **Start advanced memory services** (optional but recommended)
   ```bash
   cd ../py_zep
   ./start-zep-services.ps1
   ```

5. **Build and run**
   ```bash
   cd ../js
   npm run build
   npm run cli
   ```

## 🧠 Advanced Memory System

The TradingAgents framework includes a sophisticated AI/ML memory system with:

- **Temporal Relationship Mapping**: Statistical correlation analysis
- **Memory Consolidation**: ML clustering and pattern recognition  
- **Context Retrieval**: Multi-dimensional intelligent search
- **Performance Learning**: Reinforcement learning with agent optimization

### Memory System Setup

1. **Start Docker services**
   ```powershell
   cd py_zep
   .\start-zep-services.ps1
   ```

2. **Test memory system**
   ```bash
   cd js
   npm run test-memory-advanced
   ```

3. **View memory analytics**
   - Access Neo4j Browser: http://localhost:7474
   - Username: neo4j, Password: devpassword

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env.local` and configure your API keys:

```bash
# Required: Choose your LLM provider(s)
OPENAI_API_KEY=your_openai_api_key
# OR for local LLM
LM_STUDIO_BASE_URL=http://localhost:1234/v1

# Optional: Additional providers
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_API_KEY=your_google_key

# Optional: Market data providers
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
MARKETSTACK_API_KEY=your_marketstack_key
```

**📖 For detailed configuration options, see [CONFIGURATION.md](CONFIGURATION.md)**

## 🎯 Running Your First Analysis

### Interactive CLI

1. **Start the CLI**
   ```bash
   cd js
   node run-cli-safe.js
   ```

2. **Select "🚀 Run New Analysis"**

3. **Enter configuration:**
   - **Stock Symbol**: AAPL, MSFT, TSLA, etc.
   - **Analysis Date**: YYYY-MM-DD format
   - **Analysts**: Choose your analysis team
   - **Research Depth**: Shallow/Deep analysis
   - **LLM Provider**: Your preferred provider

4. **Watch the analysis**: Real-time progress with agent collaboration

### Command Line Usage

```bash
# Run with development tools
npm run cli:analyze

# Run specific commands
npm run cli:menu
npm run cli:export
npm run cli:historical
```

## 🏗️ LM Studio Setup (Optional)

### Local Inference Configuration

1. **Install LM Studio** from [lmstudio.ai](https://lmstudio.ai/)
2. **Load models** and enable API server on port 1234
3. **Configure environment**:
   ```bash
   LM_STUDIO_BASE_URL=http://localhost:1234/v1
   DEFAULT_LLM_PROVIDER=openai
   ```

## 🔍 Example Analysis Flow

### Sample Configuration
```bash
# Mix providers for optimal results
ANALYSTS_LLM_PROVIDER=openai          # Fast analysis
RESEARCHERS_LLM_PROVIDER=anthropic    # Deep reasoning
TRADER_LLM_PROVIDER=openai           # Quick decisions
```

### Expected Output
```
🚀 Starting Trading Analysis...
📊 Analyzing AAPL for 2025-08-29
👥 Agents: market_analyst, news_analyst, fundamentals_analyst

✅ Market Analyst: Positive momentum detected
✅ News Analyst: Favorable sentiment in recent headlines  
✅ Fundamentals Analyst: Strong financial metrics
✅ Research Team: Bull case supported by growth prospects
✅ Risk Management: Moderate risk, suitable for portfolio
✅ Final Decision: BUY with 0.78 confidence
```

## 🛠️ Development Workflow

### Development Mode
```bash
npm run dev    # Hot reload development
npm run cli    # Interactive CLI with TypeScript
```

### Production Build
```bash
npm run build  # Build for production
npm test       # Run test suite
```

### Testing
```bash
npm run test:all              # Complete test suite
npm run test-enhanced         # Enhanced graph workflow tests
npm run test-langgraph        # LangGraph integration tests
```

## 🔒 Security Best Practices

### API Key Management
- Never commit API keys to version control
- Use `.env.local` for sensitive configuration
- Rotate API keys regularly

### Network Security
- Configure firewall rules for LM Studio
- Use HTTPS for production deployments

## 🚨 Troubleshooting

### Common Issues

**CLI Not Starting**
```bash
# Check Node.js version
node --version  # Should be 18+

# Rebuild if needed
npm run clean && npm run build
```

**LM Studio Connection Failed**
```bash
# Test connectivity
curl http://your_ip:1234/v1/models

# Check firewall settings
# Verify LM Studio API server is running
```

**Missing Dependencies**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Debug Mode
```bash
# Enable verbose logging
npm run cli -- --verbose --log-level debug
```

## 📚 Next Steps

- **[Architecture Guide](./ARCHITECTURE.md)** - Understand the system design
- **[CLI Reference](./CLI-GUIDE.md)** - Detailed CLI documentation
- **[API Documentation](./API-REFERENCE.md)** - Programmatic usage
- **[Performance Guide](./PERFORMANCE.md)** - Optimization techniques

---

**Ready to analyze your first stock? Start with the interactive CLI! 🚀**