# Government Data Service

A unified microservice for accessing US government financial and economic data APIs, including SEC filings, Federal Reserve economic data (FRED), Bureau of Labor Statistics (BLS), and Census Bureau demographic/economic data.

## Features

- **SEC (Securities and Exchange Commission)**
  - Company information and ticker lookups
  - Filing retrieval (10-K, 10-Q, 8-K, etc.)
  - Financial facts and concepts
  - Rate limiting (10 requests/second)

- **FRED (Federal Reserve Economic Data)**
  - Economic series data (GDP, unemployment, inflation, etc.)
  - Historical observations with date ranges
  - Series search and categorization
  - Market indicators and treasury rates
  - Rate limiting (120 requests/minute)

- **BLS (Bureau of Labor Statistics)**
  - Employment and unemployment data
  - Consumer Price Index (CPI) and Producer Price Index (PPI)
  - Industry-specific employment data
  - Average hourly earnings and productivity metrics
  - Rate limiting (conservative approach)

- **Census Bureau**
  - American Community Survey (ACS) data
  - Population estimates
  - Economic census data
  - County Business Patterns
  - Metropolitan statistical area data

## API Endpoints

### Health Check
- `GET /health` - Service health status

### SEC Endpoints
- `GET /api/sec/company/:ticker` - Get company by ticker
- `GET /api/sec/filings/:cik` - Get company filings
- `GET /api/sec/facts/:cik` - Get company financial facts

### FRED Endpoints (requires API key)
- `GET /api/fred/series/:seriesId` - Get series observations
- `GET /api/fred/search?q=query` - Search series
- `GET /api/fred/indicators` - Get market indicators

### BLS Endpoints
- `GET /api/bls/unemployment` - Get unemployment data
- `GET /api/bls/cpi` - Get Consumer Price Index
- `GET /api/bls/indicators` - Get economic indicators

### Census Endpoints
- `GET /api/census/states/:year` - Get state economic data
- `GET /api/census/counties/:year/:state` - Get county data

### Unified Endpoints
- `GET /api/company/:ticker` - Comprehensive company profile
- `GET /api/company/:ticker/context` - Company with economic context
- `GET /api/dashboard` - Economic dashboard
- `GET /api/search?q=query` - Cross-source search
- `GET /api/correlation` - Cross-source correlation analysis

## Environment Variables

### Required
- `FRED_API_KEY` - FRED API key (get from https://fred.stlouisfed.org/docs/api/api_key.html)

### Optional
- `BLS_API_KEY` - BLS API key (get from https://www.bls.gov/developers/api_signature_v2.html)
- `USER_AGENT` - Custom User-Agent string
- `PORT` - Service port (default: 3005)
- `LOG_LEVEL` - Logging level (default: info)

## Docker Usage

### Build
```bash
docker build -t government-data-service .
```

### Run
```bash
docker run -p 3005:3005 \
  -e FRED_API_KEY=your_fred_key \
  -e BLS_API_KEY=your_bls_key \
  government-data-service
```

## Development

### Install Dependencies
```bash
npm install
```

### Development Server
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Start Production
```bash
npm start
```

### Testing
```bash
npm test
```

## Rate Limiting

Each API has different rate limits that are automatically handled:

- **SEC**: 10 requests per second
- **FRED**: 120 requests per minute (2 per second)
- **BLS**: Conservative rate limiting (1 request per 5 seconds)
- **Census**: 5 requests per second (no official limits)

## Error Handling

The service includes comprehensive error handling with:
- Automatic retries for server errors and rate limits
- Exponential backoff for failed requests
- Graceful degradation when services are unavailable
- Structured logging for debugging

## Integration with Trading Agents

This service is designed to integrate with the Trading Agents framework:

1. **Data Provider Integration**: Connects to existing data provider infrastructure
2. **Backtesting Support**: Provides fundamental data for backtesting framework
3. **Agent Memory**: Integrates with agent memory and knowledge systems
4. **Economic Context**: Provides economic indicators for trading decisions

## API Keys Setup

### FRED API Key (Required)
1. Visit https://fred.stlouisfed.org/docs/api/api_key.html
2. Create a free account
3. Generate an API key
4. Set `FRED_API_KEY` environment variable

### BLS API Key (Optional but Recommended)
1. Visit https://www.bls.gov/developers/api_signature_v2.html
2. Register for a free API key
3. Set `BLS_API_KEY` environment variable
4. Without API key: 25 queries/day limit
5. With API key: 500 queries/day limit

## Examples

### Get Company Profile
```bash
curl http://localhost:3005/api/company/AAPL
```

### Search Economic Data
```bash
curl "http://localhost:3005/api/search?q=unemployment"
```

### Get Economic Dashboard
```bash
curl http://localhost:3005/api/dashboard
```

### Get Market Indicators
```bash
curl http://localhost:3005/api/fred/indicators
```

## Monitoring

The service provides health checks and rate limiter status:

```bash
curl http://localhost:3005/health
```

Response includes:
- Service status
- Rate limiter token counts
- Timestamp and version info

## Security

- Runs as non-root user in Docker
- Input validation and sanitization
- Rate limiting to prevent abuse
- Structured error responses (no sensitive data leakage)
- Health checks for monitoring

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details.