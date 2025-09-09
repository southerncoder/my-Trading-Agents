# Environment-Driven Configuration System

## 🎯 Overview

TradingAgents uses a 4-tier environment variable hierarchy for fine-grained control over LLM providers and models for each agent type, plus comprehensive directory path configuration for secure deployment.

## 🔐 Centralized Secret Management

### Docker Secrets Integration

TradingAgents uses **centralized secret management** with Docker secrets for production deployments:

**✅ Benefits:**
- **Single Source of Truth**: All secrets consolidated in main `.env.local`
- **Docker Secrets**: Secure secret management for containerized deployments
- **No Scattered Files**: Eliminates service-specific `.env.local` files

**📁 Secret File Structure:**
```
.env.local                    # Main configuration file (development)
docker/secrets/               # Docker secrets directory
├── openai_api_key.txt        # OpenAI API key
├── anthropic_api_key.txt     # Anthropic API key
└── neo4j_password.txt        # Neo4j database password
```

**🔧 Migration from Service-Specific Files:**

The system has been migrated from scattered `.env.local` files to centralized configuration:

```bash
# ❌ OLD: Scattered configuration (removed)
services/trading-agents/.env.local
services/google-news-service/.env.local
services/reddit-service/.env.local

# ✅ NEW: Centralized configuration
.env.local                           # Main configuration
docker/secrets/                      # Docker secrets
```

### Environment Variable Loading

The system automatically loads configuration from the main `.env.local` file:

```typescript
// Configuration automatically loaded from .env.local
const config = {
  openaiApiKey: process.env.OPENAI_API_KEY,
  redditClientId: process.env.REDDIT_CLIENT_ID,
  marketstackApiKey: process.env.MARKETSTACK_API_KEY,
  // ... all other secrets
};
```

### Docker Secrets Usage

For Docker deployments, secrets are mounted as files:

```yaml
# docker-compose.yml
services:
  trading-agents:
    secrets:
      - openai_api_key
      - reddit_client_id
    environment:
      - OPENAI_API_KEY_FILE=/run/secrets/openai_api_key
      - REDDIT_CLIENT_ID_FILE=/run/secrets/reddit_client_id
```

**🔒 Security Best Practices:**
- Store actual secrets only in main `.env.local` (git-ignored)
- Use Docker secrets for containerized deployments
- Never commit real API keys to version control
- Use environment-specific secret management in production

## 📁 Directory Configuration

### Environment Variables for Paths

All directory paths are configurable via environment variables for security and deployment flexibility:

```bash
# Required: Main directories
TRADINGAGENTS_EXPORTS_DIR=/path/to/exports        # Export outputs directory
TRADINGAGENTS_RESULTS_DIR=/path/to/results        # Trading analysis results
TRADINGAGENTS_DATA_DIR=/path/to/data              # Data storage and cache
TRADINGAGENTS_LOGS_DIR=/path/to/logs              # Logging output
TRADINGAGENTS_PROJECT_DIR=/path/to/project        # Project root directory
```

### Directory Path Features

**🔒 Security Benefits:**
- Zero hardcoded paths in source code
- Environment-specific directory configuration
- Secure path resolution and validation

**⚙️ Flexibility Benefits:**
- Support for both relative and absolute paths
- Intelligent fallback to default directories
- Cross-platform path handling

**📋 Default Behavior:**
```typescript
// Fallback directories (when environment variables not set)
{
  exportsDir: './exports',
  resultsDir: './results', 
  dataDir: './data',
  logsDir: './logs',
  projectDir: process.cwd()
}
```

### Directory Setup Examples

**Development Environment:**
```bash
TRADINGAGENTS_EXPORTS_DIR=./exports
TRADINGAGENTS_RESULTS_DIR=./results
TRADINGAGENTS_DATA_DIR=./data
TRADINGAGENTS_LOGS_DIR=./logs
```

**Production Environment:**
```bash
TRADINGAGENTS_EXPORTS_DIR=/var/lib/tradingagents/exports
TRADINGAGENTS_RESULTS_DIR=/var/lib/tradingagents/results
TRADINGAGENTS_DATA_DIR=/var/lib/tradingagents/data
TRADINGAGENTS_LOGS_DIR=/var/log/tradingagents
```

## 🏗️ Configuration Hierarchy

The system processes configuration in this priority order:

```
1. Individual Agent Settings    (Highest Priority)
2. Group-Level Settings
3. Global Default Settings
4. Hardcoded Fallbacks         (Lowest Priority)
```

## 🔧 Configuration Levels

### Individual Agent Configuration
```bash
# Market Analyst specific settings
MARKET_ANALYST_LLM_PROVIDER=openai
MARKET_ANALYST_LLM_MODEL=gpt-4o-mini
MARKET_ANALYST_LLM_TEMPERATURE=0.5
MARKET_ANALYST_LLM_MAX_TOKENS=2000

# News Analyst specific settings  
NEWS_ANALYST_LLM_PROVIDER=anthropic
NEWS_ANALYST_LLM_MODEL=claude-3-5-sonnet-20241022
NEWS_ANALYST_LLM_TEMPERATURE=0.3
NEWS_ANALYST_LLM_MAX_TOKENS=3000
```

**Available Individual Agents:**
- `MARKET_ANALYST_*`, `NEWS_ANALYST_*`, `SOCIAL_ANALYST_*`
- `FUNDAMENTALS_ANALYST_*`, `BULL_RESEARCHER_*`, `BEAR_RESEARCHER_*`
- `RESEARCH_MANAGER_*`, `RISKY_ANALYST_*`, `SAFE_ANALYST_*`
- `NEUTRAL_ANALYST_*`, `PORTFOLIO_MANAGER_*`, `TRADER_*`

### Group-Level Configuration
```bash
# All Analysts (Market, News, Social, Fundamentals)
ANALYSTS_LLM_PROVIDER=openai
ANALYSTS_LLM_MODEL=gpt-4o-mini
ANALYSTS_LLM_TEMPERATURE=0.4
ANALYSTS_LLM_MAX_TOKENS=2500

# All Researchers (Bull, Bear, Research Manager)
RESEARCHERS_LLM_PROVIDER=anthropic
RESEARCHERS_LLM_MODEL=claude-3-5-sonnet-20241022
RESEARCHERS_LLM_TEMPERATURE=0.6
RESEARCHERS_LLM_MAX_TOKENS=4000
```

### Global Default Configuration
```bash
# System-wide defaults
DEFAULT_LLM_PROVIDER=openai
DEFAULT_LLM_MODEL=local-model
DEFAULT_LLM_TEMPERATURE=0.7
DEFAULT_LLM_MAX_TOKENS=3000
```

## 🌐 Provider Configuration

### OpenAI Configuration
```bash
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=https://api.openai.com/v1  # Optional override
OPENAI_DEFAULT_MODEL=gpt-4o-mini
```

**Available Models:** `gpt-4o`, `gpt-4o-mini`, `o1-mini`, `gpt-4-turbo`

### Anthropic Configuration
```bash
ANTHROPIC_API_KEY=your_anthropic_api_key
ANTHROPIC_BASE_URL=https://api.anthropic.com  # Optional override
ANTHROPIC_DEFAULT_MODEL=claude-3-5-sonnet-20241022
```

**Available Models:** `claude-3-5-sonnet-20241022`, `claude-3-haiku-20240307`, `claude-3-opus-20240229`

### LM Studio Configuration
```bash
LM_STUDIO_BASE_URL=http://localhost:1234/v1
LM_STUDIO_ADMIN_URL=http://localhost:1234  # Optional
LM_STUDIO_MODEL_CACHE_TTL_MS=30000         # Optional
```

**Features:** Model verification, concurrent safety, auto-loading, performance caching, timeout protection


## 📋 Configuration Examples

### Multi-Provider Setup
```bash
# Different providers for different purposes
ANALYSTS_LLM_PROVIDER=openai          # Fast analysis
ANALYSTS_LLM_MODEL=gpt-4o-mini

RESEARCHERS_LLM_PROVIDER=anthropic    # Deep reasoning
RESEARCHERS_LLM_MODEL=claude-3-5-sonnet-20241022

RISK_ANALYSTS_LLM_PROVIDER=google     # Balanced perspective
RISK_ANALYSTS_LLM_MODEL=gemini-1.5-pro

TRADER_LLM_PROVIDER=openai           # Final decisions
TRADER_LLM_MODEL=gpt-4o
```

### Cost-Optimized Setup
```bash
# Cost-effective models for analysis
ANALYSTS_LLM_PROVIDER=openai
ANALYSTS_LLM_MODEL=gpt-4o-mini

RESEARCHERS_LLM_PROVIDER=openai
RESEARCHERS_LLM_MODEL=gpt-4o-mini

# Premium model for final decisions
PORTFOLIO_MANAGER_LLM_PROVIDER=openai
PORTFOLIO_MANAGER_LLM_MODEL=gpt-4o
```

## ⚙️ Advanced Configuration

### Temperature Settings
- **0.0-0.3**: Deterministic, consistent outputs
- **0.4-0.7**: Balanced creativity and consistency  
- **0.8-1.0**: Creative, varied outputs

### Token Limits
- **1000-2000**: Quick analysis, summaries
- **2000-4000**: Standard analysis
- **4000+**: Deep research, complex reasoning

### Configuration Validation

The system validates configuration at startup:

```bash
# Check current configuration
node -e "
require('dotenv').config({ path: '.env.local' });
const { DEFAULT_AGENT_CONFIGS } = require('./dist/types/agent-config.js');
console.log('Configuration loaded:', Object.keys(DEFAULT_AGENT_CONFIGS));
"
```

## 🔒 Security Considerations

### API Key Management
- Store API keys in `.env.local` (git-ignored)
- Never commit secrets to version control
- Use environment-specific key management in production
- Rotate keys regularly

### Directory Security
- Configure directories via environment variables only
- Use secure paths with appropriate permissions
- Ensure export directories are not publicly accessible
- Validate all directory paths before use

### Environment Separation
```bash
# Development
.env.local          # Local development settings

# Production
# Use cloud secret management or environment variables
# Never store production secrets in files
```

## 🚨 Troubleshooting

### Configuration Not Loading
```bash
# Verify .env.local exists and has correct format
cat .env.local

# Check for syntax errors
node -e "require('dotenv').config({ path: '.env.local' }); console.log('✅ Environment loaded');"
```

### Directory Configuration Issues
```bash
# Check directory environment variables
node -e "
require('dotenv').config({ path: '.env.local' });
console.log('Exports Dir:', process.env.TRADINGAGENTS_EXPORTS_DIR || 'Using default');
console.log('Results Dir:', process.env.TRADINGAGENTS_RESULTS_DIR || 'Using default');
console.log('Data Dir:', process.env.TRADINGAGENTS_DATA_DIR || 'Using default');
"

# Test directory creation
node -e "
const fs = require('fs');
const path = './exports';
try {
  fs.mkdirSync(path, { recursive: true });
  console.log('✅ Directory creation successful');
} catch (err) {
  console.log('❌ Directory creation failed:', err.message);
}
"

# Check directory permissions
ls -la exports/ results/ data/ cache/ logs/ 2>/dev/null || echo "Some directories may not exist yet"
```

### Provider Authentication Issues
```bash
# Test API keys
node -e "console.log('OpenAI Key:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing');"
node -e "console.log('Anthropic Key:', process.env.ANTHROPIC_API_KEY ? '✅ Set' : '❌ Missing');"
```

### Model Availability
```bash
# Test OpenAI models
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models

# Test Anthropic models  
curl -H "x-api-key: $ANTHROPIC_API_KEY" -H "anthropic-version: 2023-06-01" https://api.anthropic.com/v1/models

# Test Google Generative AI
curl -H "x-goog-api-key: $GOOGLE_API_KEY" https://generativelanguage.googleapis.com/v1beta/models
```

### Export Functionality Issues
```bash
# Test export directory access
node -e "
const { ConfigManager } = require('./dist/config/config-manager.js');
const config = new ConfigManager();
const exportDir = config.getExportsDirectory();
console.log('Export directory:', exportDir);
console.log('Directory exists:', require('fs').existsSync(exportDir));
"

# Check export permissions
touch exports/test.txt && echo '✅ Export directory writable' || echo '❌ Export directory not writable'
rm exports/test.txt 2>/dev/null
```

---

**Configure once, run anywhere! The environment-driven system adapts to your infrastructure and preferences. 🚀**