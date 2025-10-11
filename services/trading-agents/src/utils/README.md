# Trading Agents Utilities

This directory contains utility functions and modules used throughout the Trading Agents framework.

## Core Utilities

### Risk Management
- `risk-management-engine-simple.ts` - Core risk management engine
- `risk-management-utils.ts` - Risk calculation utilities
- `portfolio-constraints-utils.ts` - Portfolio constraint management
- `position-sizing-utils.ts` - Position sizing calculations

### Data Analysis
- `technical-analysis-utils.ts` - Technical indicator calculations
- `fundamental-analysis-utils.ts` - Fundamental analysis utilities
- `price-data-utils.ts` - Price data processing utilities

### Resilience & Error Handling
- `circuit-breaker.ts` - Circuit breaker pattern implementation
- `retry-handler.ts` - Retry logic with exponential backoff
- `error-handler.ts` - Centralized error handling
- `error-manager.ts` - Error management and classification
- `health-monitor.ts` - Service health monitoring

### LLM Integration
- `llm-provider-utils.ts` - LLM provider abstraction utilities
- `resilient-llm.ts` - Resilient LLM client with failover
- `resilient-embedder.ts` - Resilient embedding generation
- `resilient-dataflow.ts` - Resilient data processing flows

### Logging & Monitoring
- `enhanced-logger.ts` - Enhanced logging capabilities
- `structured-logger.ts` - Structured logging utilities

### Trading Logic
- `decision-engine-utils.ts` - Trading decision engine utilities
- `enhanced-trading-graph.ts` - Enhanced trading workflow graphs

## News Integration

### Real-Time News Sentiment Analysis

The risk management system integrates with the **news-aggregator-service** for real-time news sentiment analysis, replacing simulation-based approaches with actual news data.

#### Integration Features
- **Service Connection**: Connects to `http://news-aggregator:3004` (Docker) or `http://localhost:3004` (local)
- **Multi-Provider News**: Accesses Tavily API, Brave News, Google News, NewsAPI, and Yahoo Finance
- **Intelligent Fallback**: Graceful degradation to sector-based estimation if service unavailable
- **Caching Strategy**: 5-minute TTL with automatic cache invalidation
- **Error Handling**: 10-second timeout with comprehensive error recovery

#### Sentiment Analysis Process
1. **Query Generation**: Creates targeted search queries for symbols and sectors
2. **News Fetching**: Retrieves 5 articles per query from multiple providers
3. **Sentiment Scoring**: Keyword-based analysis (-1 to +1 scale)
4. **Impact Assessment**: Calculates impact based on recency, source credibility, and keywords

#### API Endpoints Used
- **Primary**: `/api/news/aggregate?q={query}&count={limit}` - Multi-provider aggregated results
- **Fallback**: `/api/news?q={query}&pageSize={limit}` - Legacy endpoint for compatibility

#### Configuration
```bash
# Environment variable for service URL
NEWS_AGGREGATOR_URL=http://news-aggregator:3004
```

#### Testing
```bash
# Test news integration
npm run test:news-integration
```

#### Benefits
- **Real Market Data**: Actual news articles from multiple sources
- **Enhanced Accuracy**: Multi-provider sentiment aggregation
- **Reliability**: Never fails completely, always provides sentiment
- **Performance**: Cached results reduce API calls and improve response times

## Docker Integration

### Docker Secrets
- `docker-secrets.ts` - Docker secrets management utilities

## Testing Utilities

### News Integration Testing
- `test-news-integration.ts` - News aggregator service integration tests

## Error Types

### Custom Error Classes
- `trading-agent-error.ts` - Custom error types for trading operations
- `enhanced-error-integration.ts` - Enhanced error integration utilities

## Usage Examples

### Risk Management with News Sentiment
```typescript
import { getSectorSentiment } from './risk-management-utils';

// Get real-time news sentiment for a symbol
const sentiment = await getSectorSentiment('AAPL', 'technology');
console.log(`AAPL sentiment: ${sentiment.score} (${sentiment.impact})`);
```

### Circuit Breaker Pattern
```typescript
import { CircuitBreaker } from './circuit-breaker';

const breaker = new CircuitBreaker({
  failureThreshold: 5,
  recoveryTimeout: 60000
});

const result = await breaker.execute(async () => {
  // Your operation here
});
```

### Resilient LLM Calls
```typescript
import { ResilientLLM } from './resilient-llm';

const llm = new ResilientLLM(config);
const response = await llm.invoke("Analyze this market data...");
```

## Performance Considerations

### Caching
- News sentiment: 5-minute TTL
- Risk calculations: Configurable caching
- LLM responses: Provider-specific caching

### Error Recovery
- Automatic retry with exponential backoff
- Circuit breaker pattern for failing services
- Graceful degradation with fallback strategies

### Monitoring
- Health checks for all external services
- Performance metrics tracking
- Structured logging for debugging

## Contributing

When adding new utilities:
1. Follow the existing naming conventions
2. Include comprehensive error handling
3. Add appropriate logging
4. Write unit tests
5. Update this README

## Related Documentation

- [Risk Management Tests](../../tests/utils/README.md) - Comprehensive test coverage
- [Portfolio Tests](../../tests/portfolio/README.md) - Portfolio-level testing
- [Configuration Guide](../../../../docs/CONFIGURATION.md) - Environment setup
- [Architecture Documentation](../../../../docs/zep-graphiti/ARCHITECTURE.md) - System architecture