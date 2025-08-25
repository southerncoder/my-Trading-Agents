# System Architecture

## Overview

The Trading Agents system is built on a modular, event-driven architecture that orchestrates multiple AI agents to make collaborative trading decisions.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Trading Graph                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Analyst Team  │  │ Research Team   │  │ Risk Mgmt Team  │  │
│  │   (Parallel)    │→ │  (Sequential)   │→ │  (Sequential)   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│                       Data Flows Layer                          │
├─────────────────────────────────────────────────────────────────┤
│  Yahoo Finance │ Finnhub │ Google News │ Reddit │ SimFin │ AI   │
└─────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Infrastructure Layer                       │
├─────────────────────────────────────────────────────────────────┤
│    LangChain │ LangGraph │ TypeScript │ Node.js │ Config Mgmt   │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Trading Graph Layer

#### Graph Structure
- **Entry Point**: Single ticker input with analysis date
- **Conditional Logic**: Dynamic routing based on agent outputs
- **State Management**: Immutable state transitions between agents
- **Error Recovery**: Graceful handling of agent failures

#### Orchestration Patterns
- **Parallel Execution**: All analysts run simultaneously
- **Sequential Debate**: Researchers and risk analysts run in order
- **Conditional Routing**: Skip/retry agents based on state
- **Final Aggregation**: Portfolio manager synthesizes all inputs

### 2. Agent Layer

#### Agent Base Classes
```typescript
AbstractAgent<TInput, TOutput>
├── BaseAgent (concrete implementation)
├── AnalystAgent (market, social, news, fundamentals)
├── ResearcherAgent (bull, bear, manager)
├── TradingAgent (trader)
└── RiskAgent (risky, safe, neutral, portfolio manager)
```

#### Agent Characteristics
- **Stateless**: No persistent state between invocations
- **Tool-Enabled**: Each agent has access to relevant tools
- **Type-Safe**: Strict TypeScript interfaces for inputs/outputs
- **Async**: Non-blocking execution with proper error handling

### 3. Data Flows Layer

#### Toolkit Architecture
```typescript
class Toolkit {
  private yahooFinance: YahooFinanceAPI
  private finnhub: FinnhubAPI
  private googleNews: GoogleNewsAPI
  private reddit: RedditAPI
  private simfin: SimFinAPI
  private openaiData?: OpenAIDataAPI
  private technicalIndicators: TechnicalIndicatorsAPI
}
```

#### Data Sources
- **Market Data**: Yahoo Finance (real-time prices, charts)
- **Financial Data**: Finnhub, SimFin (fundamentals, earnings)
- **News Data**: Google News API (articles, sentiment)
- **Social Data**: Reddit API (discussion sentiment)
- **AI Data**: OpenAI (additional analysis, GPT tools)
- **Technical Data**: Technical indicators (RSI, MACD, etc.)

### 4. Infrastructure Layer

#### LangChain Integration
- **LLM Orchestration**: Provider-agnostic LLM access
- **Tool Binding**: Dynamic tool registration per agent
- **Prompt Management**: Structured prompts with validation
- **Memory Systems**: Conversation and state persistence

#### LangGraph Integration
- **Graph Definition**: Declarative workflow specification
- **State Management**: Centralized state transitions
- **Conditional Logic**: Dynamic routing and branching
- **Execution Engine**: Parallel and sequential orchestration

## State Management

### Agent State Structure
```typescript
interface AgentState {
  // Core inputs
  ticker: string
  analysis_date: string
  
  // Analyst outputs
  market_report?: MarketReport
  sentiment_report?: SentimentReport
  news_report?: NewsReport
  fundamentals_report?: FundamentalsReport
  
  // Research outputs
  investment_plan?: InvestmentPlan
  investment_debate_state?: InvestmentDebateState
  
  // Trading outputs
  trader_investment_plan?: TraderInvestmentPlan
  
  // Risk management outputs
  risk_debate_state?: RiskDebateState
  final_trade_decision?: FinalTradeDecision
}
```

### State Transitions
1. **Initial State**: `{ ticker, analysis_date }`
2. **Analyst Phase**: Add all analyst reports
3. **Research Phase**: Add investment plan and debate state
4. **Trading Phase**: Add trader investment plan
5. **Risk Phase**: Add risk debate state and final decision

### State Validation
- **Runtime Validation**: Zod schemas for all state objects
- **Type Safety**: Compile-time checks with TypeScript
- **Immutability**: State objects are never mutated
- **Versioning**: State schema versioning for compatibility

## Configuration Management

### Environment-Based Config
```typescript
interface Config {
  llm: LLMConfig          // Provider, models, API keys
  tools: ToolsConfig      // API endpoints, rate limits
  agents: AgentsConfig    // Agent-specific settings
  graph: GraphConfig      // Execution parameters
}
```

### Configuration Sources
1. **Environment Variables**: API keys, sensitive data
2. **Config Files**: Default settings, agent parameters
3. **Runtime Overrides**: CLI arguments, programmatic config
4. **Validation**: Comprehensive config validation on startup

## Error Handling Strategy

### Multi-Level Error Handling
1. **Tool Level**: API failures, rate limiting, network errors
2. **Agent Level**: LLM failures, validation errors, timeout
3. **Graph Level**: Agent failures, state corruption, deadlocks
4. **System Level**: Configuration errors, resource exhaustion

### Recovery Mechanisms
- **Retry Logic**: Exponential backoff for transient failures
- **Fallback Tools**: Alternative data sources when primary fails
- **Partial Results**: Continue with available data when possible
- **Circuit Breakers**: Prevent cascading failures

## Security Architecture

### API Key Management
- **Environment Variables**: Secure storage of sensitive data
- **Validation**: API key format and validity checking
- **Rotation**: Support for key rotation without restart
- **Isolation**: Per-service API key isolation

### Data Protection
- **Input Sanitization**: Validate all external inputs
- **Output Filtering**: Remove sensitive data from logs
- **Rate Limiting**: Prevent API abuse and cost overruns
- **Audit Logging**: Track all system interactions

## Performance Characteristics

### Scalability
- **Horizontal**: Multiple graph instances can run independently
- **Vertical**: Agent execution can be distributed across cores
- **Memory**: O(1) memory usage per workflow instance
- **Network**: Efficient batching of API calls

### Optimization Strategies
- **Parallel Execution**: Maximize concurrent agent execution
- **Caching**: Cache tool results and LLM responses
- **Connection Pooling**: Reuse HTTP connections
- **Lazy Loading**: Load tools only when needed

### Monitoring
- **Metrics**: Execution time, success rate, token usage
- **Logging**: Structured logging with correlation IDs
- **Tracing**: End-to-end request tracing
- **Alerting**: Automated alerts for system issues

---

**Last Updated**: August 24, 2025
**Version**: 1.0