# Copilot Instructions for TradingAgents

## Project Overview
- **TradingAgents** is a production-ready TypeScript implementation of a multi-agent LLM-powered financial trading research framework. It simulates a real-world trading firm with specialized agents collaborating via advanced LangGraph workflows.
- **Status**: 100% Complete - Production Ready (as of August 2025)
- **Core Implementation**: Complete TypeScript conversion in `js/` directory with full LangGraph integration
- **Python Reference**: Original Python implementation in `py-reference/` (read-only reference)
- **Main Orchestrator**: `js/src/graph/enhanced-trading-graph.ts` with dual-mode execution (Traditional + LangGraph)
- **Interactive CLI**: Complete command-line interface in `js/src/cli/` with real-time progress tracking
- **Agent System**: All 12 agents implemented in TypeScript under `js/src/agents/`

## Architecture & Key Components

### Core Orchestration
- **Enhanced Trading Graph**: `js/src/graph/enhanced-trading-graph.ts` - Main orchestrator with LangGraph integration
- **LangGraph Integration**: `js/src/graph/langgraph-working.ts` - Working LangGraph implementation with dynamic API resolution
- **Traditional Graph**: `js/src/graph/trading-graph.ts` - Sequential workflow execution
- **Dual Execution Modes**: Seamless switching between traditional and LangGraph workflows

### Agent Implementation (12 Total)
- **Analysts (4)**: Market, Social, News, Fundamentals - in `js/src/agents/analysts/`
- **Researchers (3)**: Bull, Bear researchers + Research Manager - in `js/src/agents/researchers/`
- **Risk Management (4)**: Risky, Safe, Neutral analysts + Portfolio Manager - in `js/src/agents/risk-mgmt/`
- **Trader (1)**: Trading strategy execution - in `js/src/agents/trader/`

### LLM Provider System
- **Multi-Provider Support**: `js/src/models/provider.ts` - OpenAI, Anthropic, Google, LM Studio, Ollama
- **Local Inference**: LM Studio integration for cost-effective development
- **Provider Abstraction**: Unified interface for all LLM providers with connection testing

### Interactive CLI System
- **Main Interface**: `js/src/cli/main.ts` - Complete user experience orchestration
- **User Interaction**: `js/src/cli/utils.ts` - Ticker selection, analyst configuration
- **Terminal UI**: `js/src/cli/display.ts` - Colored output, progress tracking, result formatting
- **Progress Management**: `js/src/cli/message-buffer.ts` - Real-time agent progress tracking

## Key Patterns & Conventions

### Configuration Management
- **Default Config**: `js/src/config/default.ts` - Centralized configuration with environment variable support
- **Type Safety**: All configuration strongly typed with Zod validation
- **Environment Variables**: API keys and provider settings via `.env` file
- **Provider Selection**: Configurable LLM provider switching (cloud vs local)

### Agent Architecture
- **Base Classes**: `js/src/agents/base/` - Abstract and concrete base agent implementations
- **Type System**: Complete TypeScript coverage with strict typing
- **State Management**: Immutable state transitions with `js/src/types/agent-states.ts`
- **Tool Integration**: Unified data flow integration via `js/src/dataflows/`

### Workflow Orchestration
- **LangGraph StateGraph**: Advanced workflow orchestration with conditional routing
- **Dynamic API Resolution**: Runtime compatibility layer for LangGraph.js API differences
- **State Propagation**: Immutable state flow between agents
- **Error Handling**: Comprehensive error recovery and graceful degradation

### Testing Infrastructure
- **Integration Tests**: Complete test suite with `js/tests/test-*.js` files
- **CLI Testing**: Component and integration testing for user interface
- **Mock Support**: Offline testing capabilities with mock data
- **Build Validation**: TypeScript compilation and runtime verification

## Developer Workflows

### Development Setup
```bash
cd js/
npm install                    # Install all dependencies
npm run build                  # TypeScript compilation
npm run test-cli              # CLI integration tests
npm run cli                   # Interactive CLI interface
```

### Testing & Validation
```bash
npm run test-enhanced         # Enhanced graph workflow tests
npm run test-components       # CLI component tests
npm run build                 # Verify TypeScript compilation
```

### LLM Provider Configuration
```bash
# Local development (recommended)
LLM_PROVIDER=lm_studio
LLM_BACKEND_URL=http://localhost:1234/v1

# Cloud providers (optional)
LLM_PROVIDER=openai
OPENAI_API_KEY=your_key
```

## Technical Innovations & Lessons Learned

### LangGraph Integration Breakthrough
- **Challenge**: LangGraph.js TypeScript definitions didn't match runtime exports
- **Solution**: Dynamic import strategy with runtime API inspection
- **Implementation**: `js/src/graph/langgraph-working.ts` with compatibility layer
- **Impact**: Future-proof integration that adapts to library evolution

### Enhanced Dual-Mode Architecture
- **Innovation**: Seamless switching between traditional sequential and LangGraph workflow execution
- **Benefit**: Migration path and fallback options for different use cases
- **Implementation**: Single interface with mode detection in `enhanced-trading-graph.ts`

### Local Inference Integration
- **LM Studio Support**: OpenAI-compatible local server integration
- **Cost Effectiveness**: Zero API costs for development and testing
- **Provider Pattern**: Unified interface handling both cloud and local models

### Production-Ready TypeScript Implementation
- **Type Safety**: 100% TypeScript coverage with zero compilation errors
- **Error Handling**: Comprehensive error management throughout the stack
- **ES Module Compatibility**: Modern module system with import/export
- **Build System**: Production-ready compilation and development workflows

## Integration & External Dependencies

### Core Technologies
- **TypeScript 5.x**: Type safety and modern JavaScript features
- **Node.js 18+**: Runtime environment
- **LangChain & LangGraph**: LLM orchestration with advanced workflows
- **Inquirer.js, Chalk, Ora**: Interactive CLI with colored output and progress tracking

### LLM Providers
- **Cloud**: OpenAI (GPT-4), Anthropic (Claude), Google (Gemini)
- **Local**: LM Studio (recommended), Ollama
- **Multi-Provider**: OpenRouter for unified access

### Data Sources
- **Market Data**: Yahoo Finance, FinnHub APIs
- **Social/News**: Reddit, Google News APIs
- **Technical**: Custom indicators and calculations

## Usage Examples

### Interactive CLI (Primary Interface)
```bash
npm run cli
# Interactive prompts guide through:
# - Ticker selection (e.g., AAPL)
# - Analyst configuration
# - LLM provider selection
# - Real-time progress tracking
# - Formatted results display
```

### Programmatic Usage
```typescript
import { EnhancedTradingAgentsGraph } from './src/graph/enhanced-trading-graph';

const graph = new EnhancedTradingAgentsGraph({
  enableLangGraph: true,
  llmProvider: 'lm_studio',
  selectedAnalysts: ['market', 'news']
});

const result = await graph.analyzeAndDecide('AAPL', '2025-08-24');
```

## Development Best Practices (Learned)

### Type Safety First
- Use strict TypeScript settings with no implicit any
- Define interfaces for all data structures
- Validate configuration at runtime with Zod
- Handle optional and undefined values explicitly

### Error Handling Strategy
- Implement graceful degradation for API failures
- Provide meaningful error messages to users
- Log errors appropriately for debugging
- Use try-catch blocks with specific error types

### Module Architecture
- Keep clear separation of concerns between components
- Use dependency injection for testability
- Implement provider patterns for external integrations
- Design for extensibility and modularity

### Testing Approach
- Integration tests for complete workflows
- Component tests for individual modules
- Mock data for offline development
- Runtime validation for dynamic APIs

### CLI Design Principles
- Provide clear, colored output for better UX
- Show real-time progress for long-running operations
- Offer helpful error messages and guidance
- Support both interactive and programmatic usage

---

## Contributing Guidelines

**When working with this codebase:**

### Code Standards
- Follow established TypeScript patterns and conventions
- Maintain 100% type safety - no `any` types without justification
- Use consistent error handling patterns throughout
- Document complex logic with JSDoc comments
- Follow the existing modular architecture

### Adding New Features
- **New Agents**: Implement in appropriate subfolder under `js/src/agents/`
- **LLM Providers**: Extend `js/src/models/provider.ts` with new provider support
- **Data Sources**: Add to `js/src/dataflows/` with consistent error handling
- **CLI Features**: Extend `js/src/cli/` modules following existing patterns

### Testing New Code
- Add integration tests for new workflows
- Test error conditions and edge cases
- Verify TypeScript compilation without errors
- Test both online and offline scenarios where applicable

### Documentation Updates
- Update this file for architectural changes
- Maintain README.md with current capabilities
- Document configuration changes in default.ts
- Update type definitions for new interfaces

### API Integration Best Practices
- Use dynamic imports for libraries with API compatibility issues
- Implement connection testing for external services
- Provide graceful fallbacks for service failures
- Handle rate limiting and API errors appropriately

---

**Project Status**: ✅ Production Ready - 100% Complete Implementation
**Last Updated**: August 24, 2025
**Next Steps**: Deployment, optimization, or feature enhancement based on needs
