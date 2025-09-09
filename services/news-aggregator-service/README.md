# News Aggregator Service

A unified news aggregation service that consolidates multiple news providers (Google News, Yahoo Finance, Bing News, NewsAPI) with intelligent provider selection, fallback logic, and caching for improved reliability and performance.

## Features

- **Multi-Provider Support**: Integrates Google News, Yahoo Finance, Bing News, and NewsAPI
- **Intelligent Fallback**: Automatically switches to healthy providers when others fail
- **Health Monitoring**: Continuous monitoring of provider status and performance
- **Caching**: Built-in response caching for improved performance
- **Rate Limiting**: Configurable rate limits per provider
- **Structured Logging**: Winston-based logging with trace correlation
- **Security**: Helmet.js security headers and CORS configuration
- **Docker Ready**: Containerized deployment with health checks

## Quick Start

### Using Docker (Recommended)

1. **Configure Environment Variables**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your API keys
   ```

2. **Build and Run**
   ```bash
   docker build -t news-aggregator-service .
   docker run -p 3004:3004 --env-file .env.local news-aggregator-service
   ```

### Using Docker Compose

Add to your main `docker-compose.yml`:

```yaml
services:
  news-aggregator:
    build: ./services/news-aggregator-service
    ports:
      - "3004:3004"
    env_file:
      - ./services/news-aggregator-service/.env.local
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3004/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
```

### Local Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your API keys
   ```

3. **Start Service**
   ```bash
   npm start
   ```

4. **Development Mode**
   ```bash
   npm run dev
   ```

## API Endpoints

### Health Check
```http
GET /health
```
Returns service health status and provider availability.

### News Search
```http
GET /api/news/search?q={query}&limit={limit}&provider={provider}
```
Search for news articles across all providers.

**Parameters:**
- `q`: Search query (required)
- `limit`: Maximum results (default: 10, max: 100)
- `provider`: Specific provider (optional: google, yahoo, bing, newsapi)

### Financial News
```http
GET /api/news/financial?symbol={symbol}&limit={limit}
```
Get financial news for a specific stock symbol.

**Parameters:**
- `symbol`: Stock symbol (e.g., AAPL, TSLA) (required)
- `limit`: Maximum results (default: 10, max: 50)

### Provider Status
```http
GET /api/providers/status
```
Get detailed status of all news providers including health, response times, and error rates.

### Cache Statistics
```http
GET /api/cache/stats
```
Get cache performance statistics and hit rates.

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `production` | No |
| `LOG_LEVEL` | Logging level | `info` | No |
| `PORT` | Service port | `3004` | No |
| `NEWS_API_KEY` | NewsAPI key | - | Yes |
| `BING_NEWS_API_KEY` | Bing News API key | - | No |
| `YAHOO_FINANCE_API_KEY` | Yahoo Finance API key | - | No |
| `CACHE_TTL_SECONDS` | Cache TTL in seconds | `300` | No |
| `QUOTE_CACHE_TTL_SECONDS` | Quote cache TTL | `60` | No |
| `NEWSAPI_RATE_LIMIT` | NewsAPI rate limit | `100` | No |
| `BING_NEWS_RATE_LIMIT` | Bing News rate limit | `100` | No |
| `YAHOO_FINANCE_RATE_LIMIT` | Yahoo Finance rate limit | `2000` | No |

### API Keys Setup

1. **NewsAPI**: Get your free API key from [newsapi.org](https://newsapi.org/)
2. **Bing News API**: Get your API key from [Microsoft Bing APIs](https://www.microsoft.com/en-us/bing/apis/bing-news-search-api)
3. **Yahoo Finance**: No API key required for basic operations

## Provider Details

### Google News (via NewsAPI)
- **Endpoint**: `/api/news/search?q={query}&provider=google`
- **Features**: Global news coverage, real-time updates
- **Rate Limit**: 100 requests/minute (free tier)
- **Fallback**: Automatic fallback to other providers

### Yahoo Finance
- **Endpoint**: `/api/news/financial?symbol={symbol}`
- **Features**: Financial news, stock quotes, market data
- **Rate Limit**: 2000 requests/minute
- **Fallback**: Automatic fallback to NewsAPI

### Bing News
- **Endpoint**: `/api/news/search?q={query}&provider=bing`
- **Features**: Web search integration, diverse sources
- **Rate Limit**: 100 requests/minute
- **Fallback**: Automatic fallback to other providers

### NewsAPI Direct
- **Endpoint**: `/api/news/search?q={query}&provider=newsapi`
- **Features**: Direct NewsAPI access, custom filtering
- **Rate Limit**: 100 requests/minute (free tier)
- **Fallback**: Used as fallback for other providers

## Monitoring & Logging

### Health Monitoring
The service continuously monitors provider health and automatically:
- Switches to healthy providers when others fail
- Tracks response times and error rates
- Updates provider status in real-time

### Logging
Structured logging with Winston includes:
- Request/response logging with trace IDs
- Provider performance metrics
- Error tracking and debugging information
- Cache hit/miss statistics

### Cache Performance
Built-in caching provides:
- Response time optimization
- Reduced API calls and costs
- Configurable TTL settings
- Cache statistics and monitoring

## Development

### Project Structure
```
services/news-aggregator-service/
├── src/
│   ├── index.js              # Main service file
│   ├── providers/            # Provider implementations
│   │   ├── google-news.js
│   │   ├── yahoo-finance.js
│   │   ├── bing-news.js
│   │   └── newsapi.js
│   ├── utils/
│   │   ├── cache.js
│   │   ├── health-monitor.js
│   │   └── rate-limiter.js
│   └── middleware/
│       ├── error-handler.js
│       └── request-logger.js
├── Dockerfile
├── package.json
├── .env.local.example
└── README.md
```

### Testing
```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run linting
npm run lint
```

### Building for Production
```bash
# Build Docker image
docker build -t news-aggregator-service .

# Run in production
docker run -d --name news-aggregator -p 3004:3004 --env-file .env.local news-aggregator-service
```

## Integration Examples

### JavaScript/TypeScript Client
```javascript
const axios = require('axios');

async function getFinancialNews(symbol) {
  try {
    const response = await axios.get(`http://localhost:3004/api/news/financial?symbol=${symbol}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch financial news:', error.message);
  }
}

async function searchNews(query) {
  try {
    const response = await axios.get(`http://localhost:3004/api/news/search?q=${query}`);
    return response.data;
  } catch (error) {
    console.error('Failed to search news:', error.message);
  }
}
```

### Python Client
```python
import requests

def get_news(query, limit=10):
    try:
        response = requests.get(f'http://localhost:3004/api/news/search?q={query}&limit={limit}')
        return response.json()
    except Exception as e:
        print(f'Failed to fetch news: {e}')
        return None
```

## Troubleshooting

### Common Issues

1. **Provider Unavailable**
   - Check provider status: `GET /api/providers/status`
   - Verify API keys in `.env.local`
   - Check network connectivity

2. **Rate Limit Exceeded**
   - Monitor rate limit headers in responses
   - Implement client-side rate limiting
   - Consider upgrading API plans

3. **Cache Issues**
   - Check cache stats: `GET /api/cache/stats`
   - Clear cache if needed (restart service)
   - Adjust TTL settings

4. **Service Not Starting**
   - Check logs for error messages
   - Verify environment variables
   - Ensure required ports are available

### Debug Mode
Enable debug logging by setting `LOG_LEVEL=debug` in your environment.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Check the troubleshooting section above
- Review the API documentation
- Check provider-specific documentation
- Open an issue on GitHub

---

**Version**: 1.0.0
**Last Updated**: September 2025
**Node.js**: 18+
**Docker**: Required for production deployment