# News Aggregator Service - Enterprise Architecture

## Overview

Enterprise-ready news aggregation service that combines multiple news providers (NEWS_API, TAVILY_API, SERP_API for Bing News, Brave News) with comprehensive resilience patterns, streaming support, and production-grade error handling.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     News Aggregator Service                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │           Resilient News Aggregator Layer                  │ │
│  │  - Concurrent provider execution                           │ │
│  │  - Streaming & bulk response modes                         │ │
│  │  - Graceful degradation                                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                            │                                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Resilience Layer                              │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │ │
│  │  │Circuit Breaker│  │Retry Handler │  │Error Recovery   │ │ │
│  │  │- 5 failures   │  │- 3 attempts  │  │- Default empty  │ │ │
│  │  │- 60s timeout  │  │- Exp backoff │  │  array response │ │ │
│  │  └──────────────┘  └──────────────┘  └─────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                            │                                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  Provider Layer                            │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐ │ │
│  │  │NEWS_API  │ │TAVILY_API│ │SERP_API  │ │BRAVE_NEWS_API│ │ │
│  │  │(NewsAPI) │ │(AI-Power)│ │(Bing News│ │(Privacy-First│ │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Key Features

### ✅ Enterprise Resilience Patterns
- **Circuit Breakers**: Prevents cascading failures with automatic recovery
- **Retry with Exponential Backoff**: 3 attempts with intelligent backoff
- **Graceful Degradation**: Returns partial results when providers fail
- **Health Monitoring**: Real-time provider health tracking

### ✅ Dual Response Modes
- **Bulk JSON Response**: Single aggregated response from all providers
- **Streaming Response**: Progressive results as providers complete

### ✅ Comprehensive Logging
- **Log Levels**: DEBUG, INFO, WARN, ERROR, CRITICAL
- **Structured Logging**: JSON format with full context
- **Performance Metrics**: Response times, error rates, success rates

### ✅ Provider Support
- **NEWS_API**: Traditional news aggregation
- **TAVILY_API**: AI-powered web search
- **SERP_API**: Bing News via SERP API
- **BRAVE_NEWS_API**: Privacy-focused news search

### ✅ Error Handling
- **Provider Failures**: Isolated failures don't affect other providers
- **Circuit Breaker States**: CLOSED, OPEN, HALF_OPEN
- **Default Empty Arrays**: Never fails completely, always returns structure
- **Detailed Error Context**: Provider name, error message, recovery info

## API Endpoints

### 1. Aggregate News (Bulk)
```http
GET /api/news/aggregate?q=Tesla&count=10
```

**Response:**
```json
{
  "query": "Tesla",
  "timestamp": "2025-10-05T10:30:00Z",
  "providers": {
    "newsapi": {
      "status": "success",
      "data": { "articles": [...] },
      "responseTime": 850,
      "articlesCount": 10
    },
    "tavily": {
      "status": "success",
      "data": { "articles": [...] },
      "responseTime": 1200,
      "articlesCount": 8
    },
    "serp-api": {
      "status": "failed",
      "error": "Circuit breaker is OPEN",
      "circuitOpen": true
    }
  },
  "summary": {
    "total": 18,
    "successful": 2,
    "failed": 1
  },
  "errors": [
    {
      "provider": "serp-api",
      "message": "Circuit breaker is OPEN",
      "recoverable": false
    }
  ],
  "responseTime": 1250
}
```

### 2. Aggregate News (Streaming)
```http
GET /api/news/aggregate/stream?q=Tesla&count=10
Accept: text/event-stream
```

**Response Stream:**
```javascript
// Event 1: Start
{
  "type": "start",
  "query": "Tesla",
  "timestamp": "2025-10-05T10:30:00Z",
  "providers": ["newsapi", "tavily", "serp-api", "brave-news"]
}

// Event 2: First provider completes
{
  "type": "provider-result",
  "provider": "newsapi",
  "status": "success",
  "data": { "articles": [...] },
  "responseTime": 850,
  "articlesCount": 10,
  "timestamp": "2025-10-05T10:30:01Z"
}

// Event 3: Second provider completes
{
  "type": "provider-result",
  "provider": "tavily",
  "status": "success",
  "data": { "articles": [...] },
  "responseTime": 1200,
  "articlesCount": 8,
  "timestamp": "2025-10-05T10:30:02Z"
}

// Event 4: Provider failure
{
  "type": "provider-result",
  "provider": "serp-api",
  "status": "failed",
  "error": "Circuit breaker is OPEN",
  "circuitOpen": true,
  "timestamp": "2025-10-05T10:30:02Z"
}

// Event 5: Complete
{
  "type": "complete",
  "totalDuration": 1250,
  "timestamp": "2025-10-05T10:30:02Z"
}
```

### 3. Provider Health
```http
GET /api/news/health
```

**Response:**
```json
{
  "newsapi": {
    "healthy": true,
    "message": "NewsAPI is responding",
    "circuitBreaker": {
      "state": "CLOSED",
      "failures": 0,
      "successCount": 150,
      "requestCount": 152,
      "errorRate": "1.32%"
    },
    "stats": {
      "successCount": 150,
      "failureCount": 2,
      "totalRequests": 152,
      "lastSuccess": "2025-10-05T10:29:50Z",
      "errorRate": "1.32%"
    }
  },
  "serp-api": {
    "healthy": false,
    "message": "Circuit breaker is OPEN",
    "circuitBreaker": {
      "state": "OPEN",
      "failures": 5,
      "nextAttemptTime": 1696504800000
    }
  }
}
```

### 4. Statistics
```http
GET /api/news/statistics
```

**Response:**
```json
{
  "providers": {
    "newsapi": {
      "successCount": 150,
      "failureCount": 2,
      "totalRequests": 152,
      "errorRate": "1.32%",
      "circuitBreaker": {
        "state": "CLOSED",
        "failures": 0
      }
    }
  },
  "aggregated": {
    "totalRequests": 500,
    "totalSuccesses": 485,
    "totalFailures": 15,
    "overallErrorRate": "3.00%"
  }
}
```

## Resilience Configuration

### Circuit Breaker
```javascript
{
  failureThreshold: 5,       // Open after 5 failures
  recoveryTimeout: 60000,    // Wait 60s before retry
  monitoringWindow: 300000,  // 5-minute failure window
  minimumRequests: 3         // Need 3 requests to evaluate
}
```

### Retry Handler
```javascript
{
  maxAttempts: 3,            // Retry up to 3 times
  baseDelay: 1000,           // Start with 1s delay
  maxDelay: 30000,           // Max 30s delay
  backoffMultiplier: 2,      // Double delay each time
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT'],
  retryableStatuses: [429, 500, 502, 503, 504]
}
```

## Error Handling Strategy

### 1. Provider Failure
```
Request → Retry (3x with backoff) → Circuit Breaker Check → Return Error
```

### 2. Partial Success
```
Provider A: Success (10 articles)
Provider B: Success (8 articles)
Provider C: Failed (Circuit Open)
→ Returns 18 articles with error details
```

### 3. Complete Failure
```
All Providers: Failed
→ Returns empty structure with detailed error information
{
  "providers": {},
  "summary": { "total": 0, "successful": 0, "failed": 4 },
  "errors": [...]
}
```

## Logging Levels

### DEBUG
- Provider health checks
- Cache hits/misses
- Retry attempts
- Circuit breaker state changes

### INFO
- Aggregation start/complete
- Provider successes
- Response metrics

### WARN
- Provider failures (recoverable)
- Retry attempts
- Cache evictions

### ERROR
- Circuit breaker opens
- Provider failures (non-recoverable)
- Configuration errors

### CRITICAL
- Service initialization failures
- All providers down
- System-level errors

## Environment Variables

```bash
# API Keys
NEWS_API_KEY=your_newsapi_key
TAVILY_API_KEY=your_tavily_key
SERP_API_KEY=your_serp_api_key
BRAVE_NEWS_API_KEY=your_brave_key

# Service Configuration
PORT=3004
LOG_LEVEL=info
NODE_ENV=production

# Resilience Configuration
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT=60000
RETRY_MAX_ATTEMPTS=3
RETRY_BASE_DELAY=1000
```

## Usage Examples

### Node.js Client
```javascript
const axios = require('axios');

// Bulk request
const response = await axios.get('http://localhost:3004/api/news/aggregate', {
  params: { q: 'Tesla stock', count: 20 }
});

console.log(`Total articles: ${response.data.summary.total}`);
console.log(`Successful providers: ${response.data.summary.successful}`);

// Streaming request
const EventSource = require('eventsource');
const es = new EventSource('http://localhost:3004/api/news/aggregate/stream?q=Tesla');

es.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'provider-result' && data.status === 'success') {
    console.log(`${data.provider}: ${data.articlesCount} articles in ${data.responseTime}ms`);
  }
};
```

### Curl Examples
```bash
# Bulk aggregation
curl "http://localhost:3004/api/news/aggregate?q=Tesla&count=10"

# Streaming aggregation
curl -N "http://localhost:3004/api/news/aggregate/stream?q=Tesla&count=10"

# Health check
curl "http://localhost:3004/api/news/health"

# Statistics
curl "http://localhost:3004/api/news/statistics"
```

## Performance Characteristics

- **Average Response Time**: 800-1500ms (depends on providers)
- **Concurrent Provider Execution**: All providers fetch simultaneously
- **Circuit Breaker Recovery**: 60 seconds default
- **Retry Overhead**: 1s → 2s → 4s (exponential backoff)
- **Memory Usage**: ~50MB baseline + caching

## Testing

```bash
# Run full test suite
npm test

# Run manual provider tests
npm run test:manual:all

# Test specific provider
npm run test:manual:bing
npm run test:manual:brave-config
npm run test:manual:providers
```

## Monitoring & Observability

### Metrics to Track
- Provider success/failure rates
- Circuit breaker state transitions
- Response times per provider
- Cache hit rates
- Error rates by type

### Recommended Monitoring
- Prometheus metrics export
- Grafana dashboards
- Winston log aggregation
- Health check polling

## Production Deployment

### Docker Compose
```yaml
services:
  news-aggregator:
    image: news-aggregator:latest
    environment:
      - NEWS_API_KEY=${NEWS_API_KEY}
      - TAVILY_API_KEY=${TAVILY_API_KEY}
      - SERP_API_KEY=${SERP_API_KEY}
      - BRAVE_NEWS_API_KEY=${BRAVE_NEWS_API_KEY}
      - LOG_LEVEL=info
    ports:
      - "3004:3004"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3004/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Future Enhancements

- [ ] Rate limiting per provider
- [ ] Advanced caching strategies
- [ ] Webhook support for async notifications
- [ ] GraphQL API
- [ ] Redis-backed distributed circuit breakers
- [ ] Prometheus metrics exporter
- [ ] OpenTelemetry tracing

## License

MIT

## Support

For issues or questions, please open a GitHub issue or contact the development team.
