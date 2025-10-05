# Docker Compose Feature Flags

## Reddit Service Feature Flag

The Reddit sentiment analysis service is now feature-flagged and disabled by default since we're not actively working on Reddit integration.

### Current Status ✅

- **Reddit Service**: Feature-flagged OFF by default
- **Trading Agents**: Can start and run without Reddit service
- **Service Availability Check**: Automatic detection and graceful fallback when Reddit is unavailable

### Usage

**Default (without Reddit):**
```bash
docker compose up
```

**With Reddit service:**
```bash
docker compose --profile reddit up
```

### Service Architecture

The system is designed to handle Reddit service availability gracefully:

1. **Startup Independence**: Trading-agents service starts without requiring Reddit service
2. **Runtime Detection**: Checks Reddit service availability before first API call
3. **Graceful Fallback**: Provides neutral sentiment data when Reddit is unavailable
4. **Circuit Breaker**: Prevents cascading failures with automatic retry logic

### Environment Variables

**Reddit Feature Control:**
- `REDDIT_ENABLED=true/false` - Enable/disable Reddit integration (default: false)
- `REDDIT_SERVICE_URL=http://reddit-service:3001` - Service endpoint
- `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` - OAuth credentials

### Code Implementation

**Service Availability Check:**
```typescript
// RedditAPI class automatically checks service health
const redditEnabled = process.env.REDDIT_ENABLED?.toLowerCase() === 'true';
if (!redditEnabled) {
  // Returns neutral sentiment data
  return { sentiment: 'neutral', confidence: 0 };
}

// Check service health before making calls
const isHealthy = await this.redditClient.healthCheck();
if (!isHealthy) {
  // Graceful fallback to neutral sentiment
  return this.getFallbackSentiment(ticker);
}
```

**Fallback Behavior:**
- Returns neutral sentiment (0.0 confidence)
- Provides informative messages about unavailable data
- Continues analysis with other data sources
- Logs warnings but doesn't fail the entire analysis

### What's Feature-Flagged

- `reddit-service`: The Reddit sentiment analysis service
- `reddit-network`: Internal network for Reddit service isolation

### Current Services (Default)

- `neo4j`: Database for knowledge graph storage ✅
- `zep-graphiti`: Memory service for Zep Graphiti ✅
- `trading-agents`: Main trading agents application ✅

### Services with Reddit Profile

All default services plus:
- `reddit-service`: Reddit sentiment analysis (port 3001)
- `reddit-network`: Isolated network for Reddit service

### Re-enabling Reddit

**Temporary (with profile):**
```bash
docker compose --profile reddit up
```

**Permanent (modify docker-compose.yml):**
Remove the `profiles: ["reddit"]` line from the `reddit-service` in `docker-compose.yml`

### Testing

**Test without Reddit:**
```bash
# Start services
docker compose up -d

# Verify trading-agents works
docker compose exec trading-agents node cli.js --help
```

**Test with Reddit:**
```bash
# Start with Reddit
docker compose --profile reddit up -d

# Check Reddit service health
curl http://localhost:3001/health
```

### Benefits

1. **Faster Startup**: No dependency on Reddit service health checks
2. **Reliability**: Trading analysis continues even if Reddit service fails
3. **Flexibility**: Easy to enable/disable Reddit integration
4. **Development Focus**: Can work on core trading features without Reddit complexity
5. **Graceful Degradation**: System provides useful analysis even with missing data sources