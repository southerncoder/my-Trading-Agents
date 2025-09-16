# Trading Agents Configuration

## Security Notice

**IMPORTANT**: The `config.json` file contains ONLY non-sensitive configuration settings. All sensitive information including:

- API keys (OpenAI, Anthropic, Google, etc.)
- Client IDs and secrets
- Usernames and passwords
- URLs and endpoints
- Database connection strings

**MUST remain in environment variables only**. Never commit sensitive information to version control.

## Configuration Structure

The `config.json` file supports the following configuration sections:

### Analysis Configuration
- `defaultTicker`: Default stock symbol for analysis
- `defaultAnalysisDate`: Default date for historical analysis
- `defaultAnalysts`: Array of analyst types to enable by default
- `defaultResearchDepth`: Default research depth level
- `defaultLLMProvider`: Default LLM provider
- `models`: Model configurations for different agent types

### Flow Control
- `maxDebateRounds`: Maximum rounds for investment debates
- `maxRiskDiscussRounds`: Maximum rounds for risk discussions
- `maxRecursionLimit`: Maximum recursion limit for workflows
- `enableOnlineTools`: Enable/disable online data sources
- Performance and memory optimization flags

### Logging Configuration
- `defaultLogLevel`: Default logging level
- `enableFileLogging`: Enable file-based logging
- `enableConsoleLogging`: Enable console logging
- `enableVerboseLogging`: Enable verbose logging
- `maxLogFiles`: Maximum number of log files to keep
- `maxLogSize`: Maximum size per log file

### Export Configuration
- `defaultFormat`: Default export format (json, csv, markdown, html)
- `includeReports`: Include analysis reports in exports
- `includeMetadata`: Include metadata in exports
- `includeRawData`: Include raw data in exports

### Data Sources
- `yahooFinance`: Yahoo Finance integration settings
- `finnhub`: Finnhub API settings
- `reddit`: Reddit data source settings
- `googleNews`: Google News integration settings
- `technicalIndicators`: Technical analysis indicators

### Performance Tuning
- `connectionPool`: Database connection pool settings
- `cache`: Caching configuration
- `memory`: Memory optimization settings

### Experimental Features
- `enableExperimentalFeatures`: Enable experimental features
- `features`: Individual experimental feature flags

## Environment Variables

All sensitive configuration must be provided via environment variables:

```bash
# API Keys
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_API_KEY=your_google_key
FINNHUB_API_KEY=your_finnhub_key

# Reddit Credentials
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
REDDIT_USERNAME=your_reddit_username
REDDIT_PASSWORD=your_reddit_password

# LLM Endpoints
OPENAI_BASE_URL=https://api.openai.com/v1
LOCAL_LM_STUDIO_BASE_URL=http://localhost:1234/v1
REMOTE_LM_STUDIO_BASE_URL=http://remote-server:1234/v1

# Database
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_neo4j_password
```

## Usage

The CLI will automatically load the `config.json` file if present, and merge it with environment variables. Environment variables take precedence over config file settings for security.

```bash
# Use config.json with environment variables
npm run cli -- --config config.json analyze AAPL

# Override specific settings via command line
npm run cli -- --config config.json --llm-provider openai analyze AAPL
```