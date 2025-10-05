# Quick Start Guide

## Prerequisites

- **Node.js 18+** and npm
- **API Key** (OpenAI, Anthropic, or local LM Studio)
- **Docker** (optional, for advanced memory features)

## Installation (5 minutes)

### 1. Clone and Install
```bash
git clone https://github.com/southerncoder/my-Trading-Agents
cd my-Trading-Agents/services/trading-agents
npm install
```

### 2. Configure
```bash
# Copy config template
cp config.template.json config.json

# Create environment file
cp .env.example .env.local
```

Edit `.env.local` with your API key:
```bash
# For OpenAI
OPENAI_API_KEY=sk-your-key-here

# OR for local LM Studio (free)
LOCAL_LM_STUDIO_BASE_URL=http://localhost:1234/v1
```

### 3. Run Your First Analysis
```bash
npm run cli
```

Follow the interactive prompts:
1. Select stock ticker (e.g., AAPL, TSLA, SPY)
2. Choose analysts (market, news, social, fundamentals)
3. Select LLM provider
4. Wait for analysis (1-3 minutes)
5. View results in terminal and `results/` folder

## Example Output

```
✅ Market Analyst: Bullish (Confidence: 85%)
   - Strong technical indicators (RSI: 45, MACD positive)
   - Price trend: Upward momentum

✅ News Analyst: Neutral (Confidence: 70%)
   - Mixed sentiment from recent earnings
   - Regulatory concerns offset by innovation news

✅ Research Manager: Moderate Buy
   - Bull/Bear debate consensus: 60% bullish
   - Risk-adjusted recommendation: Accumulate on dips

💰 Trading Decision: BUY 150 shares
   - Entry: $182.50
   - Stop Loss: $175.00
   - Target: $195.00
```

## Configuration Options

### Use Different LLM Provider

Edit `config.json`:
```json
{
  "analysis": {
    "defaultLLMProvider": "anthropic",
    "models": {
      "quickThinking": {
        "provider": "anthropic",
        "model": "claude-3-5-haiku-20241022"
      }
    }
  }
}
```

### Adjust Analysis Depth

```json
{
  "analysis": {
    "defaultResearchDepth": 5,  // More debate rounds (slower, more thorough)
    "defaultAnalysts": ["market", "news", "social", "fundamentals"]
  }
}
```

### Enable Cost Optimization

```json
{
  "flow": {
    "runMode": "fast",           // Faster, cheaper
    "maxDebateRounds": 1,
    "enableOnlineTools": false   // Use cached data
  }
}
```

## Advanced Features (Optional)

### Memory System with Neo4j

Enables learning from past analyses and pattern recognition:

```powershell
# Start memory services
cd services/zep_graphiti
.\start-zep-services.ps1

# Run with memory enabled
cd ../trading-agents
npm run cli
```

Configure in `.env.local`:
```bash
NEO4J_URI=bolt://localhost:7687
NEO4J_PASSWORD=your-password
```

## Troubleshooting

### "API key not found"
```bash
# Check .env.local exists
ls .env.local

# Verify API key format
cat .env.local | grep OPENAI_API_KEY
```

### "Module not found"
```bash
npm install
npm run build
```

### "Rate limit exceeded"
- Wait 1 minute and retry
- Switch to different provider in `config.json`
- Use local LM Studio (no rate limits)

## Next Steps

- **Customize agents**: See [CONFIGURATION.md](./CONFIGURATION.md)
- **Automate trading**: Set up scheduled runs with cron/Task Scheduler
- **Deploy production**: Use Docker Compose for containerized deployment
- **Contribute**: See [GIT-HOOKS.md](./GIT-HOOKS.md) for development setup

## Common Use Cases

### Daily Market Analysis
```bash
# Analyze S&P 500
npm run cli
# Select: SPY, all analysts, gpt-4o-mini

# Analyze portfolio holdings
npm run cli
# Select: AAPL, MSFT, GOOGL
```

### Research Specific Stock
```json
{
  "analysis": {
    "defaultTicker": "NVDA",
    "defaultAnalysts": ["market", "fundamentals", "news"],
    "defaultResearchDepth": 5
  }
}
```

### Cost-Conscious Analysis
```json
{
  "analysis": {
    "models": {
      "quickThinking": { "provider": "openai", "model": "gpt-4o-mini" },
      "deepThinking": { "provider": "openai", "model": "gpt-4o-mini" }
    }
  },
  "flow": {
    "runMode": "fast",
    "maxDebateRounds": 1
  }
}
```

---

**Need help?** See full documentation in [CONFIGURATION.md](./CONFIGURATION.md)
