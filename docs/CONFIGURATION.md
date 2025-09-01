# Environment-Driven Configuration System

## 🎯 Overview

TradingAgents uses a sophisticated 4-tier environment variable hierarchy that allows fine-grained control over LLM providers and models for each agent type, plus comprehensive directory path configuration for secure deployment.

## 📁 Directory Configuration

### Environment Variables for Paths

All directory paths are configurable via environment variables for security and deployment flexibility:

```bash
# Required: Main directories
TRADINGAGENTS_EXPORTS_DIR=/path/to/exports        # Export outputs directory
TRADINGAGENTS_RESULTS_DIR=/path/to/results        # Trading analysis results
TRADINGAGENTS_DATA_DIR=/path/to/data              # Data storage and cache
TRADINGAGENTS_CACHE_DIR=/path/to/cache            # Application cache
TRADINGAGENTS_LOGS_DIR=/path/to/logs              # Logging output
TRADINGAGENTS_PROJECT_DIR=/path/to/project        # Project root directory
```

### Directory Path Features

**🔒 Security Benefits:**
- Zero hardcoded paths in source code
- Environment-specific directory configuration
- Secure path resolution and validation
- No sensitive path information in git repository

**⚙️ Flexibility Benefits:**
- Support for both relative and absolute paths
- Intelligent fallback to default directories
- Cross-platform path handling
- Easy deployment configuration

**📋 Default Behavior:**
```typescript
// Fallback directories (when environment variables not set)
{
  exportsDir: './exports',
  resultsDir: './results', 
  dataDir: './data',
  cacheDir: './cache',
  logsDir: './logs',
  projectDir: process.cwd()
}
```

### Directory Setup Examples

**Development Environment:**
```bash
# .env.local
TRADINGAGENTS_EXPORTS_DIR=./exports
TRADINGAGENTS_RESULTS_DIR=./results
TRADINGAGENTS_DATA_DIR=./data
TRADINGAGENTS_CACHE_DIR=./cache
TRADINGAGENTS_LOGS_DIR=./logs
```

**Production Environment:**
```bash
# Production deployment
TRADINGAGENTS_EXPORTS_DIR=/var/lib/tradingagents/exports
TRADINGAGENTS_RESULTS_DIR=/var/lib/tradingagents/results
TRADINGAGENTS_DATA_DIR=/var/lib/tradingagents/data
TRADINGAGENTS_CACHE_DIR=/tmp/tradingagents/cache
TRADINGAGENTS_LOGS_DIR=/var/log/tradingagents
```

**Docker Environment:**
```bash
# Docker deployment
TRADINGAGENTS_EXPORTS_DIR=/app/data/exports
TRADINGAGENTS_RESULTS_DIR=/app/data/results
TRADINGAGENTS_DATA_DIR=/app/data/storage
TRADINGAGENTS_CACHE_DIR=/app/cache
TRADINGAGENTS_LOGS_DIR=/app/logs
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

### 1. Individual Agent Configuration

Override settings for specific agents:

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

# Social Analyst specific settings
SOCIAL_ANALYST_LLM_PROVIDER=google
SOCIAL_ANALYST_LLM_MODEL=gemini-1.5-pro
```

**Available Individual Agents:**
- `MARKET_ANALYST_*`
- `NEWS_ANALYST_*` 
- `SOCIAL_ANALYST_*`
- `FUNDAMENTALS_ANALYST_*`
- `BULL_RESEARCHER_*`
- `BEAR_RESEARCHER_*`
- `RESEARCH_MANAGER_*`
- `RISKY_ANALYST_*`
- `SAFE_ANALYST_*`
- `NEUTRAL_ANALYST_*`
- `PORTFOLIO_MANAGER_*`
- `TRADER_*`

### 2. Group-Level Configuration

Configure entire agent groups:

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

# All Managers (Research Manager, Portfolio Manager)
MANAGERS_LLM_PROVIDER=openai
MANAGERS_LLM_MODEL=gpt-4o
MANAGERS_LLM_TEMPERATURE=0.5
MANAGERS_LLM_MAX_TOKENS=3000

# All Risk Analysts (Risky, Safe, Neutral)
RISK_ANALYSTS_LLM_PROVIDER=google
RISK_ANALYSTS_LLM_MODEL=gemini-1.5-pro
RISK_ANALYSTS_LLM_TEMPERATURE=0.7
RISK_ANALYSTS_LLM_MAX_TOKENS=3500
```

### 3. Global Default Configuration

System-wide defaults for all agents:

```bash
# Default provider and model for all agents
DEFAULT_LLM_PROVIDER=openai
DEFAULT_LLM_MODEL=local-model
DEFAULT_LLM_TEMPERATURE=0.7
DEFAULT_LLM_MAX_TOKENS=3000

```

### 4. Hardcoded Fallbacks

Built into the code as final safety net:

```typescript
// Hardcoded in src/types/agent-config.ts
const fallbacks = {
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
  temperature: 0.7,
  maxTokens: 3000
};
```

## 🌐 Provider Configuration

### OpenAI Configuration
```bash
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=https://api.openai.com/v1  # Optional override
OPENAI_DEFAULT_MODEL=gpt-4o-mini
```

**Available Models:**
- `gpt-4o`
- `gpt-4o-mini` 
- `o1-mini`
- `gpt-4-turbo`

### Anthropic Configuration
```bash
ANTHROPIC_API_KEY=your_anthropic_api_key
ANTHROPIC_BASE_URL=https://api.anthropic.com  # Optional override
ANTHROPIC_DEFAULT_MODEL=claude-3-5-sonnet-20241022
```

**Available Models:**
- `claude-3-5-sonnet-20241022`
- `claude-3-haiku-20240307`
- `claude-3-opus-20240229`

### Google Configuration
```bash
GOOGLE_API_KEY=your_google_api_key
GOOGLE_BASE_URL=https://generativelanguage.googleapis.com  # Optional
GOOGLE_DEFAULT_MODEL=gemini-1.5-pro
```

**Available Models:**
- `gemini-1.5-pro`
- `gemini-1.5-flash`
- `gemini-pro`


## 📋 Configuration Examples

### Example 1: Multi-Provider Setup
```bash
# Use different providers for different purposes
ANALYSTS_LLM_PROVIDER=openai          # Fast analysis
ANALYSTS_LLM_MODEL=gpt-4o-mini

RESEARCHERS_LLM_PROVIDER=anthropic    # Deep reasoning
RESEARCHERS_LLM_MODEL=claude-3-5-sonnet-20241022

RISK_ANALYSTS_LLM_PROVIDER=google     # Balanced perspective
RISK_ANALYSTS_LLM_MODEL=gemini-1.5-pro

TRADER_LLM_PROVIDER=openai           # Final decisions
TRADER_LLM_MODEL=gpt-4o
```

### Example 2: Cost-Optimized Cloud Setup
```bash
# Use cost-effective models
ANALYSTS_LLM_PROVIDER=openai
ANALYSTS_LLM_MODEL=gpt-4o-mini         # Cheaper for analysis

RESEARCHERS_LLM_PROVIDER=openai
RESEARCHERS_LLM_MODEL=gpt-4o-mini      # Budget-friendly research

# Use premium model only for final decisions
PORTFOLIO_MANAGER_LLM_PROVIDER=openai
PORTFOLIO_MANAGER_LLM_MODEL=gpt-4o     # Premium for important decisions
```

### Example 4: Performance-Optimized Setup
```bash
# Fast models for real-time analysis
ANALYSTS_LLM_PROVIDER=openai
ANALYSTS_LLM_MODEL=gpt-4o-mini
ANALYSTS_LLM_TEMPERATURE=0.1           # Lower temperature for consistency

# High-quality models for research
RESEARCHERS_LLM_PROVIDER=anthropic
RESEARCHERS_LLM_MODEL=claude-3-5-sonnet-20241022
RESEARCHERS_LLM_TEMPERATURE=0.8        # Higher temperature for creativity
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
- Use absolute paths in production environments

### Environment Separation
```bash
# Development
.env.local          # Local development settings
.env.example        # Template with example values

# Staging  
.env.staging        # Staging environment

# Production
# Use cloud secret management or environment variables
# Never store production secrets in files
```

### Path Security Best Practices
```bash
# ✅ Good: Environment variables
TRADINGAGENTS_EXPORTS_DIR=/secure/path/exports

# ❌ Bad: Hardcoded paths in source
const exportPath = '/hardcoded/path/exports';

# ✅ Good: Relative paths in development
TRADINGAGENTS_EXPORTS_DIR=./exports

# ✅ Good: Absolute paths in production
TRADINGAGENTS_EXPORTS_DIR=/var/lib/tradingagents/exports
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