# Project Organization & Structure

## Root Directory Structure

```
my-Trading-Agents/
├── .env.local                    # Main configuration (git-ignored)
├── .env.example                  # Configuration template
├── docker-compose.yml            # Unified service orchestration
├── README.md                     # Project overview and quick start
├── services/                     # Microservices architecture
├── docs/                         # Documentation
├── tools/                        # Utility scripts and automation
├── scripts/                      # Setup and deployment scripts
├── docker/                       # Docker configuration and secrets
├── data/                         # Data storage and cache
├── logs/                         # Application logs
└── exports/                      # Analysis results and exports
```

## Services Architecture

### Core Services (`services/`)
- **`trading-agents/`**: Main application with CLI and agent orchestration
- **`zep_graphiti/`**: Memory service with Neo4j integration
- **`reddit-service/`**: Social sentiment analysis (feature-flagged)
- **`news-aggregator-service/`**: Unified news aggregation
- **`yahoo-finance-service/`**: Financial data provider
- **`google-news-service/`**: News data provider
- **`finance-aggregator-service/`**: Multi-provider data aggregation

### Trading Agents Service Structure (`services/trading-agents/`)
```
trading-agents/
├── src/
│   ├── agents/                   # Individual agent implementations
│   ├── cli/                      # Command-line interface
│   ├── config/                   # Configuration management
│   ├── types/                    # TypeScript type definitions
│   ├── utils/                    # Shared utilities
│   ├── workflows/                # LangGraph workflow definitions
│   └── index.ts                  # Main entry point
├── tests/                        # Test suites
├── config.json                   # Runtime configuration
├── package.json                  # Dependencies and scripts
└── Dockerfile                    # Container definition
```

## Configuration Management

### Environment Configuration
- **`.env.local`**: Primary configuration file (never committed)
- **`.env.example`**: Template with all available options
- **`docker/secrets/`**: Production secret management
- **Centralized Secrets**: All services use main `.env.local`

### Configuration Hierarchy
1. **Individual Agent Settings**: `MARKET_ANALYST_LLM_MODEL=gpt-4o`
2. **Group Settings**: `ANALYSTS_LLM_PROVIDER=openai`
3. **Global Defaults**: `DEFAULT_LLM_MODEL=gpt-4o-mini`
4. **Hardcoded Fallbacks**: Built-in defaults (provider-agnostic)

### Provider Abstraction Requirements
- **NO HARD-CODED PROVIDERS**: All LLM provider selection via configuration
- **Runtime Switching**: Change providers without code changes
- **Multi-Provider Support**: Every agent supports all available providers
- **Fallback Chains**: Automatic provider failover on errors

## Documentation Structure (`docs/`)

### User Documentation
- **`QUICK-START.md`**: 5-minute setup guide
- **`CONFIGURATION.md`**: Complete configuration reference
- **`DOCKER-README.md`**: Container deployment guide
- **`FEATURE-FLAGS.md`**: Feature flag system

### Developer Documentation
- **`GIT-HOOKS.md`**: Development setup and security
- **`todos/`**: Implementation planning and roadmaps
- **`zep-graphiti/`**: Memory system architecture

## Tools & Scripts

### Automation Tools (`tools/`)
- **`start-all-services.sh`**: Unix service startup
- **`start-all-services-simple.ps1`**: Windows service startup
- **`stop-all-services.*`**: Service shutdown scripts
- **Security Tools**: Secret scanning, cleanup, migration

### Setup Scripts (`scripts/`)
- **`setup-hooks.*`**: Git hook installation
- **`start-local-stack.cmd`**: Local development stack
- **`hooks/`**: Pre-commit security validation

## Data Management

### Directory Structure
```
data/                             # Configurable via TRADINGAGENTS_DATA_DIR
├── cache/                        # API response caching
├── market-data/                  # Financial data storage
└── analysis-history/             # Historical analysis results

logs/                             # Configurable via TRADINGAGENTS_LOGS_DIR
├── application.log               # Main application logs
├── agents/                       # Agent-specific logs
└── services/                     # Service-specific logs

exports/                          # Configurable via TRADINGAGENTS_EXPORTS_DIR
├── analysis-reports/             # Generated analysis reports
├── trading-decisions/            # Trading recommendations
└── performance-metrics/          # System performance data
```

## Docker Architecture

### Container Organization
- **Database Layer**: Neo4j for knowledge graphs
- **AI/Memory Layer**: Zep Graphiti for enhanced memory
- **Data Services Layer**: Reddit, News aggregation
- **Application Layer**: Main trading agents

### Network Isolation
- **`trading-agents`**: Main application network
- **`reddit-network`**: Isolated Reddit service network
- **Health Checks**: All services have health monitoring

## LLM Provider Architecture

### Provider Abstraction Layer
```
src/
├── config/
│   ├── llm-providers.ts          # Provider factory and interfaces
│   ├── agent-configs.ts          # Agent-specific configurations
│   └── provider-fallbacks.ts     # Failover chain definitions
├── agents/
│   ├── base-agent.ts             # Provider-agnostic base class
│   ├── market-analyst.ts         # Uses configurable provider
│   └── ...                       # All agents provider-agnostic
└── types/
    ├── llm-provider.ts           # Common provider interface
    └── agent-config.ts           # Configuration type definitions
```

### Configuration-Driven Design
- **Environment Variables**: All provider selection via `.env.local`
- **Runtime Resolution**: Providers resolved at runtime, not compile time
- **Interface Compliance**: All providers implement common interface
- **Graceful Degradation**: Automatic fallback to alternative providers

### Provider Support Matrix
```typescript
// All agents must support all providers
interface SupportedProviders {
  openai: OpenAIProvider;
  anthropic: AnthropicProvider;
  google: GoogleProvider;
  lm_studio: LMStudioProvider;
  ollama: OllamaProvider;
}
```

## Development Conventions

### File Naming
- **TypeScript**: PascalCase for classes, camelCase for functions
- **Configuration**: kebab-case for files, UPPER_CASE for env vars
- **Services**: kebab-case directory names
- **Scripts**: kebab-case with appropriate extensions

### Code Organization
- **Component-Based**: Logical separation by functionality
- **Type Safety**: Comprehensive TypeScript coverage
- **Error Handling**: Consistent error patterns across services
- **Logging**: Structured logging with correlation IDs
- **Provider Abstraction**: No hard-coded LLM provider dependencies
- **Configuration-Driven**: All provider selection via environment variables

### Testing Structure
```
tests/
├── unit/                         # Unit tests for components
├── integration/                  # Service integration tests
├── cli/                          # CLI automation tests
├── manual/                       # Manual testing scripts
└── workflows/                    # LangGraph workflow tests
```

## Security Considerations

### Secret Management
- **Never commit**: Real API keys, passwords, or sensitive data
- **Environment Variables**: All secrets via `.env.local`
- **Docker Secrets**: Production secret management
- **Pre-commit Hooks**: Automatic secret scanning

### Access Control
- **Read-only Containers**: Security-hardened container configuration
- **Network Isolation**: Service-specific network segmentation
- **Resource Limits**: Memory and CPU constraints
- **Health Monitoring**: Continuous service health validation

## Deployment Patterns

### Development
- Local services via npm scripts
- Docker Compose for full stack
- Hot reload with vite-node
- Interactive CLI development

### Production
- Containerized deployment
- Docker secrets management
- Health monitoring and logging
- Horizontal scaling support