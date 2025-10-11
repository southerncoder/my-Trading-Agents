# Technology Stack & Build System

## Core Technologies

### Runtime & Language
- **Node.js 22+**: Required runtime environment
- **TypeScript 5.x**: Primary language with strict type checking
- **ES Modules**: Modern module system (`"type": "module"` in package.json)

### Build System
- **Vite 7.x**: Primary build tool with ES modules and hot reload
- **vite-node**: Development execution without compilation
- **tsc**: TypeScript compiler for type checking
- **ESLint + Prettier**: Code quality and formatting

### AI/LLM Framework
- **LangChain 0.3.x**: Core LLM orchestration framework
- **LangGraph 0.4.x**: Multi-agent workflow orchestration
- **AI SDK**: Unified interface for multiple LLM providers
- **Provider Support**: OpenAI, Anthropic, Google GenAI, Local LM Studio, Ollama
- **Provider Abstraction**: All LLM calls use configurable provider interfaces - NEVER hard-code specific providers

### Data & Memory
- **Neo4j 5.26**: Graph database for knowledge storage
- **Zep Graphiti**: Enterprise memory system with temporal knowledge graphs
- **Redis**: Caching layer (optional)
- **Winston**: Structured logging with trace correlation

### Financial Data Providers
- **Yahoo Finance 2.x**: Primary market data source
- **Alpha Vantage**: Secondary financial data provider
- **MarketStack**: Tertiary data provider with failover
- **NewsAPI & Brave News**: News aggregation services

### Infrastructure
- **Docker Compose**: Container orchestration
- **Docker Secrets**: Centralized secret management
- **OpenTelemetry**: Observability and tracing
- **Circuit Breakers**: Resilience patterns with opossum

## Common Commands

### Development
```bash
# Install dependencies
npm install

# Development with hot reload
npm run dev
npm run cli:dev

# Type checking
npm run type-check

# Code quality
npm run quality        # Check all (types, lint, format)
npm run quality:fix    # Fix formatting and linting
```

### Building
```bash
# Clean build
npm run clean
npm run build

# Production build with pre-checks
npm run prebuild && npm run build
```

### Testing
```bash
# Run all tests
npm run test:all

# Specific test suites
npm run test:workflow
npm run cli:test

# Manual testing
npm run test:manual:all
```

### Services Management
```bash
# Start all services (PowerShell)
npm run services:start

# Fresh start (clean volumes)
npm run services:fresh

# Stop services
npm run services:stop

# Check service status
npm run services:status
```

### CLI Operations
```bash
# Interactive CLI
npm run cli

# Specific CLI commands
npm run cli:analyze
npm run cli:export
npm run cli:config
npm run cli:historical
```

### Docker Operations
```bash
# Start all services
docker compose up -d

# Start with Reddit service
docker compose --profile reddit up -d

# Build and start
docker compose up --build

# View logs
docker compose logs -f [service-name]

# Stop all services
docker compose down
```

## Configuration Management

### Environment Files
- **`.env.local`**: Main configuration (git-ignored)
- **`.env.example`**: Template with all available options
- **`docker/secrets/`**: Docker secrets for production

### Configuration Hierarchy
1. Individual agent settings (highest priority)
2. Group-level settings (analysts, researchers, etc.)
3. Global defaults
4. Hardcoded fallbacks (lowest priority)

### Provider-Agnostic Design
- **CRITICAL**: Never hard-code specific LLM providers or models in source code
- **Configuration-Driven**: All provider selection via environment variables
- **Runtime Switching**: Support changing providers without code changes
- **Fallback Chain**: Multiple provider options with automatic failover

## Security Practices

### Secret Management
- All secrets in `.env.local` (never committed)
- Docker secrets for containerized deployments
- Environment-specific configuration
- Pre-commit hooks for secret scanning

### Code Quality
- TypeScript strict mode enabled
- ESLint with security rules
- Prettier for consistent formatting
- Pre-commit hooks for validation

## Performance Considerations

### LLM Optimization
- **Provider Abstraction**: Use configuration-driven provider selection
- **Model-Agnostic**: Support any model from any provider via config
- **Temperature and token limit tuning**: Configurable per agent/provider
- **Provider failover and rate limiting**: Automatic switching between providers
- **Local LM Studio support**: Cost optimization with local inference
- **Runtime Provider Selection**: Change providers without code deployment

### Data Caching
- LRU cache for API responses
- Redis integration for distributed caching
- Circuit breakers for API resilience
- Automatic failover between data providers

## LLM Provider Abstraction Rules

### CRITICAL: No Hard-Coded Dependencies
- **NEVER** import provider-specific clients directly in agent code
- **NEVER** hard-code model names or provider-specific parameters
- **ALWAYS** use the configuration system for provider selection
- **ALWAYS** support multiple providers for the same functionality

### Implementation Patterns
```typescript
// ❌ WRONG - Hard-coded provider dependency
import { OpenAI } from 'openai';
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ✅ CORRECT - Configuration-driven provider
const llmProvider = configManager.getLLMProvider(agentType);
const client = createLLMClient(llmProvider);
```

### Configuration Examples
```bash
# Agent-specific provider override
MARKET_ANALYST_LLM_PROVIDER=anthropic
MARKET_ANALYST_LLM_MODEL=claude-3-5-sonnet-20241022

# Fallback to group setting
ANALYSTS_LLM_PROVIDER=openai
ANALYSTS_LLM_MODEL=gpt-4o-mini

# Global default
DEFAULT_LLM_PROVIDER=local_lm_studio
DEFAULT_LLM_MODEL=llama-3.2-3b-instruct
```

### Provider Interface Requirements
- All providers must implement the same interface
- Support for temperature, max_tokens, and other common parameters
- Consistent error handling across providers
- Automatic retry and failover mechanisms

## Development Workflow

### Code Organization
- Component-based folder structure
- Separation of concerns (agents, services, utils)
- Type-safe configuration management
- Comprehensive error handling
- **Provider-agnostic agent implementations**

### Testing Strategy
- Unit tests for core components
- Integration tests for workflows
- Manual tests for external APIs
- CLI automation testing
- **Provider switching tests** to ensure no hard dependencies