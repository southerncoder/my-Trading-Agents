# Government Financial Data Library

A comprehensive TypeScript library for accessing US government financial and economic data APIs, including SEC filings, Federal Reserve economic data (FRED), Bureau of Labor Statistics (BLS), and Census Bureau demographic/economic data.

## Features

- **SEC (Securities and Exchange Commission)**
  - Company information and ticker lookups
  - Filing retrieval (10-K, 10-Q, 8-K, etc.)
  - Financial facts and concepts
  - Mutual fund data

- **FRED (Federal Reserve Economic Data)**
  - Economic series data (GDP, unemployment, inflation, etc.)
  - Historical observations with date ranges
  - Series search and categorization
  - Market indicators and treasury rates

- **BLS (Bureau of Labor Statistics)**
  - Employment and unemployment data
  - Consumer Price Index (CPI) and Producer Price Index (PPI)
  - Industry-specific employment data
  - Average hourly earnings

- **Census Bureau**
  - American Community Survey (ACS) data
  - Population estimates
  - Economic census data
  - County Business Patterns
  - Metropolitan statistical area data

## Installation

```bash
npm install gov-financial-data
```

## Quick Start

```typescript
import GovFinancialData from 'gov-financial-data';

// Initialize with API keys (FRED and BLS require registration)
const govData = new GovFinancialData({
  fredApiKey: 'your-fred-api-key',
  blsApiKey: 'your-bls-api-key',
  userAgent: 'YourApp/1.0.0 (contact@yourcompany.com)',
});

// Get comprehensive company data
const appleData = await govData.getCompanyProfile('AAPL');
console.log(appleData.company.title); // "Apple Inc."

// Get economic dashboard
const dashboard = await govData.getEconomicDashboard();
console.log(dashboard.bls.unemployment); // Latest unemployment data
```

## API Keys

### Required
- **FRED API Key**: Free registration at [https://fred.stlouisfed.org/docs/api/api_key.html](https://fred.stlouisfed.org/docs/api/api_key.html)
- **BLS API Key**: Free registration at [https://www.bls.gov/developers/api_signature_v2.html](https://www.bls.gov/developers/api_signature_v2.html)

### Not Required
- **SEC**: No API key needed, but requires proper User-Agent header
- **Census**: No API key needed

## Individual Client Usage

### SEC Client

```typescript
import { SECClient } from 'gov-financial-data';

const sec = new SECClient('YourApp/1.0.0 (contact@yourcompany.com)');

// Find company by ticker
const company = await sec.getCompanyByTicker('MSFT');

// Get recent filings
const filings = await sec.getCompanyFilings(company.cik_str, {
  type: '10-K',
  count: 5
});

// Get financial facts
const facts = await sec.getCompanyFacts(company.cik_str);
```

### FRED Client

```typescript
import { FREDClient } from 'gov-financial-data';

const fred = new FREDClient('your-api-key');

// Get GDP data
const gdpData = await fred.getObservations('GDP', {
  startDate: '2020-01-01',
  endDate: '2023-12-31'
});

// Search for series
const inflationSeries = await fred.searchSeries('inflation', {
  limit: 10,
  orderBy: 'popularity'
});

// Get multiple series at once
const indicators = await fred.getMultipleSeriesObservations([
  'UNRATE',    // Unemployment Rate
  'FEDFUNDS',  // Federal Funds Rate
  'CPIAUCSL'   // Consumer Price Index
]);
```

### BLS Client

```typescript
import { BLSClient } from 'gov-financial-data';

const bls = new BLSClient('your-api-key');

// Get unemployment rate
const unemployment = await bls.getUnemploymentRate({
  startYear: 2022,
  endYear: 2023
});

// Get Consumer Price Index
const cpi = await bls.getCPI();

// Get multiple economic indicators
const indicators = await bls.getEconomicIndicators();
```

### Census Client

```typescript
import { CensusClient } from 'gov-financial-data';

const census = new CensusClient();

// Get state-level data
const stateData = await census.getStateEconomicData(2021, [
  'NAME',
  'B01001_001E',  // Total Population
  'B19013_001E'   // Median Household Income
]);

// Get county data for a specific state
const countyData = await census.getCountyEconomicData(2021, [
  'NAME',
  'B01001_001E'
], '06'); // California

// Search for variables
const incomeVars = await census.searchVariables(2021, 'acs/acs5', 'income');
```

## Configuration Options

```typescript
const govData = new GovFinancialData({
  fredApiKey: 'your-fred-key',
  blsApiKey: 'your-bls-key',
  userAgent: 'YourApp/1.0.0 (contact@yourcompany.com)',
  defaultTimeout: 30000,  // 30 seconds
  maxRetries: 3,
  retryDelay: 1000       // 1 second
});
```

## Error Handling

The library includes comprehensive error handling with automatic retries for network issues and rate limiting:

```typescript
try {
  const company = await govData.sec.getCompanyByTicker('AAPL');
} catch (error) {
  if (error.code === 'HTTP_404') {
    console.log('Company not found');
  } else if (error.code === 'NETWORK_ERROR') {
    console.log('Network issue - check connection');
  } else {
    console.log('Other error:', error.message);
  }
}
```

## Rate Limiting

Each API has different rate limits:
- **SEC**: 10 requests per second
- **FRED**: 120 requests per minute (1000/day without API key)
- **BLS**: 25 queries per day (500 with API key)
- **Census**: No official limits, but be respectful

The library automatically handles rate limiting with exponential backoff.

## Common Use Cases

### Economic Analysis Dashboard

```typescript
const dashboard = await govData.getEconomicDashboard();

// Access different data sources
console.log('Unemployment:', dashboard.bls.unemployment);
console.log('GDP:', dashboard.fred.GDP);
```

### Company Financial Analysis

```typescript
const profile = await govData.getCompanyProfile('AAPL');

// Company information
console.log('Company:', profile.company.title);

// Recent filings
profile.recentFilings.forEach(filing => {
  console.log(`${filing.filingDate}: ${filing.form}`);
});

// Financial data
if (profile.financialFacts) {
  const revenue = profile.financialFacts.facts['us-gaap']?.Revenues;
  // Process revenue data...
}
```

### Market Indicators

```typescript
if (govData.fred) {
  const indicators = await govData.getMarketIndicators();
  
  Object.entries(indicators).forEach(([indicator, data]) => {
    console.log(`${indicator}: ${data.current} (${data.change > 0 ? '+' : ''}${data.change})`);
  });
}
```

### Demographic Analysis

```typescript
const demographics = await govData.census.getEconomicIndicators(2021, {
  state: '06'  // California
});

demographics.forEach(data => {
  console.log(`Population: ${data.B01001_001E}`);
  console.log(`Median Income: $${data.B19013_001E}`);
});
```

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Development

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Run linting
npm run lint

# Run examples
npm run dev
```

## API Documentation

### Response Types

All API responses are properly typed with TypeScript interfaces:

- `SECCompany`, `SECFiling`, `SECCompanyFacts`
- `FREDSeries`, `FREDObservation`, `FREDCategory`
- `BLSSeries`, `BLSDataPoint`, `BLSSeriesInfo`
- `CensusVariable`, `CensusData`

### Error Types

```typescript
interface ApiError {
  code: string;
  message: string;
  status?: number;
}
```

Common error codes:
- `HTTP_404`: Resource not found
- `HTTP_429`: Rate limit exceeded
- `NETWORK_ERROR`: Connection issues
- `REQUEST_ERROR`: Invalid request

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Changelog

### v1.0.0
- Initial release
- SEC, FRED, BLS, and Census API clients
- Comprehensive error handling and retry logic
- Full TypeScript support
- Extensive test coverage

## Support

For issues and questions:
- GitHub Issues: [Repository Issues](https://github.com/your-repo/issues)
- Documentation: [API Docs](https://your-docs-site.com)

## Related Resources

- [SEC EDGAR API Documentation](https://www.sec.gov/edgar/sec-api-documentation)
- [FRED API Documentation](https://fred.stlouisfed.org/docs/api/)
- [BLS API Documentation](https://www.bls.gov/developers/)
- [Census API Documentation](https://www.census.gov/developers/)
