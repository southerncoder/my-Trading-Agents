# Getting Started with TradingAgents

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** and npm
- **LM Studio** (optional, for local inference)
- **API Keys** for cloud providers (OpenAI, Anthropic, Google)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/southerncoder/my-Trading-Agents
   cd my-Trading-Agents/js
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

4. **Build the project**
   ```bash
   npm run build
   ```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Global defaults
DEFAULT_LLM_PROVIDER=openai
DEFAULT_LLM_MODEL=gpt-4o-mini
DEFAULT_LLM_TEMPERATURE=0.7
DEFAULT_LLM_MAX_TOKENS=3000

# API Keys (only needed for cloud providers)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_API_KEY=your_google_api_key_here

# LM Studio Configuration (for local inference)
LM_STUDIO_BASE_URL=http://your_host_ip:1234/v1
```

### Agent-Specific Configuration

Override settings for specific agents or groups:

```bash
# Group-level overrides
ANALYSTS_LLM_PROVIDER=openai
ANALYSTS_LLM_MODEL=gpt-4o-mini
RESEARCHERS_LLM_PROVIDER=anthropic
RESEARCHERS_LLM_MODEL=claude-3-5-sonnet-20241022

# Individual agent overrides (highest priority)
MARKET_ANALYST_LLM_PROVIDER=google
MARKET_ANALYST_LLM_MODEL=gemini-1.5-pro
```

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

1. **Install LM Studio**
   - Download from [LM Studio website](https://lmstudio.ai/)
   - Load your preferred models (recommended: 7B-13B parameters)

2. **Configure Network Access**
   ```bash
   # In LM Studio, enable API server
   # Set port to 1234
   # Allow network access for remote connections
   ```

3. **Update Environment**
   ```bash
   LM_STUDIO_BASE_URL=http://your_host_ip:1234/v1
   DEFAULT_LLM_PROVIDER=openai
   DEFAULT_LLM_MODEL=gpt-4o-mini
   ```

## 🔍 Example Analysis Flow

### Sample Configuration
```bash
# Use mix of providers for best results
ANALYSTS_LLM_PROVIDER=openai          # Fast, reliable analysis
RESEARCHERS_LLM_PROVIDER=anthropic    # Deep reasoning
RISK_ANALYSTS_LLM_PROVIDER=openai  # Cloud inference
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
# Run with hot reload
npm run dev

# TypeScript development
npm run cli    # Uses tsx for TypeScript execution
```

### Production Build
```bash
# Build for production
npm run build

# Run compiled version
node dist/cli/main.js
```

### Testing
```bash
# Run test suite
npm test

# End-to-end validation
node test-end-to-end-workflow.js
```

## 🔒 Security Best Practices

### API Key Management
- Never commit API keys to version control
- Use `.env.local` for sensitive configuration
- Rotate API keys regularly
- Use environment-specific key management

### Network Security
- Configure LM Studio firewall rules
- Use HTTPS for production deployments
- Implement rate limiting for API calls

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