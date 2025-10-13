# Government Data Service API Documentation

## Overview

The Government Data Service provides a unified interface to access data from multiple U.S. government APIs including SEC, FRED, BLS, and Census Bureau. This service handles rate limiting, error handling, and data normalization across all sources.

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
  - [GovFinancialData](#govfinancialdata)
  - [SEC Client](#sec-client)
  - [FRED Client](#fred-client)
  - [BLS Client](#bls-client)
  - [Census Client](#census-client)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Examples](#examples)
- [Testing](#testing)

## Installation

```bash
npm install government-data-service
```

## Configuration

### Environment Variables

```bash
# Required for FRED API access
FRED_API_KEY=your_fred_api_key_here

# Optional for enhanced BLS API access (higher rate limits)
BLS_API_KEY=your_bls_api_key_here

# Required User-Agent for SEC API compliance
USER_AGENT="YourApp/1.0.0 (your-email@example.com)"
```

### Configuration Object

```typescript
interface LibraryConfig {
  fredApiKey?: string;
  blsApiKey?: string;
  userAgent: string;
  defaultTimeout: number;
  maxRetries: number;
  retryDelay: number;
}
```

## Quick Start

```typescript
import { GovFinancialData } from 'government-data-service';

// Initialize the service
const govData = new GovFinancialData({
  fredApiKey: process.env.FRED_API_KEY,
  blsApiKey: process.env.BLS_API_KEY,
  userAgent: 'MyApp/1.0.0 (contact@myapp.com)'
});

// Get company profile with SEC filings
const appleProfile = await govData.getCompanyProfile('AAPL');

// Get economic dashboard
const dashboard = await govData.getEconomicDashboard();

// Search across all sources
const results = await govData.searchAllSources('unemployment');
```

## API Reference

### GovFinancialData

The main class that provides unified access to all government data sources.

#### Constructor

```typescript
constructor(config?: Partial<LibraryConfig>)
```

#### Methods

##### `getCompanyProfile(ticker: string): Promise<CompanyProfile>`

Retrieves comprehensive company information including SEC filings and financial facts.

**Parameters:**
- `ticker` (string): Stock ticker symbol (e.g., 'AAPL')

**Returns:**
```typescript
interface CompanyProfile {
  company: SECCompany;
  recentFilings: SECFiling[];
  financialFacts: SECCompanyFacts | null;
}
```

**Example:**
```typescript
const profile = await govData.getCompanyProfile('AAPL');
console.log(`Company: ${profile.company.title}`);
console.log(`Recent filings: ${profile.recentFilings.length}`);
```

##### `getEconomicDashboard(): Promise<EconomicDashboard>`

Fetches economic indicators from multiple sources (BLS, FRED).

**Returns:**
```typescript
interface EconomicDashboard {
  bls: BLSSeries[] | null;
  fred: { [seriesId: string]: FREDObservation[] } | null;
}
```

**Example:**
```typescript
const dashboard = await govData.getEconomicDashboard();
if (dashboard.bls) {
  console.log('BLS data available');
}
if (dashboard.fred) {
  console.log('FRED data available');
}
```

##### `searchAllSources(query: string): Promise<SearchResults>`

Searches across SEC companies and FRED series.

**Parameters:**
- `query` (string): Search term

**Returns:**
```typescript
interface SearchResults {
  sec: SECCompany[];
  fred: FREDSeries[];
}
```

**Example:**
```typescript
const results = await govData.searchAllSources('technology');
console.log(`Found ${results.sec.length} companies and ${results.fred.length} series`);
```

##### `getMarketIndicators(): Promise<MarketIndicators>`

Retrieves key market indicators from FRED (requires FRED API key).

**Returns:**
```typescript
interface MarketIndicators {
  [seriesId: string]: {
    current: string;
    previous?: string;
    change?: number;
    date: string;
  };
}
```

**Example:**
```typescript
const indicators = await govData.getMarketIndicators();
console.log(`10-Year Treasury: ${indicators.DGS10?.current}%`);
```

##### `getCrossSourceCorrelation(options?: { year?: number; state?: string }): Promise<CorrelationData>`

Analyzes correlations across multiple data sources.

**Parameters:**
- `options.year` (number, optional): Year for analysis (defaults to previous year)
- `options.state` (string, optional): State code for geographic filtering

**Example:**
```typescript
const correlation = await govData.getCrossSourceCorrelation({ year: 2023 });
console.log('Cross-source correlation analysis:', correlation.correlation);
```

##### `getCompanyWithEconomicContext(ticker: string): Promise<CompanyWithContext>`

Retrieves company data along with relevant economic context.

**Example:**
```typescript
const context = await govData.getCompanyWithEconomicContext('AAPL');
console.log('Company:', context.company.company.title);
console.log('Economic context:', context.economicContext);
```

##### `getHealthStatus(): HealthStatus`

Returns the health status of all API clients including rate limiter information.

**Returns:**
```typescript
interface HealthStatus {
  sec: { tokensRemaining: number } | null;
  fred: { tokensRemaining: number } | null;
  bls: { tokensRemaining: number } | null;
  census: { tokensRemaining: number } | null;
}
```

### SEC Client

Direct access to SEC EDGAR database.

#### Key Methods

##### `getCompanyTickers(): Promise<{ [ticker: string]: SECCompany }>`

Retrieves all company tickers and their CIK mappings.

##### `getCompanyByTicker(ticker: string): Promise<SECCompany | null>`

Finds company information by ticker symbol.

##### `getCompanyFilings(cik: string, options?: FilingOptions): Promise<SECFiling[]>`

Retrieves recent filings for a company.

**Options:**
```typescript
interface FilingOptions {
  count?: number;    // Number of filings to retrieve (default: 10)
  type?: string;     // Filing type filter (e.g., '10-K', '10-Q')
}
```

##### `getCompanyFacts(cik: string): Promise<SECCompanyFacts>`

Retrieves structured financial data for a company.

##### `getFilingDocument(cik: string, accessionNumber: string, primaryDocument: string): Promise<string>`

Downloads the content of a specific filing document.

**Example:**
```typescript
const secClient = new SECClient('MyApp/1.0.0 (contact@myapp.com)');

// Get Apple's information
const apple = await secClient.getCompanyByTicker('AAPL');
console.log(`Apple CIK: ${apple?.cik_str}`);

// Get recent filings
const filings = await secClient.getCompanyFilings(apple!.cik_str, { count: 5 });
console.log(`Recent filings: ${filings.length}`);

// Get financial facts
const facts = await secClient.getCompanyFacts(apple!.cik_str);
console.log(`Entity: ${facts.entityName}`);
```

### FRED Client

Access to Federal Reserve Economic Data.

#### Key Methods

##### `getSeries(seriesId: string): Promise<FREDSeries>`

Retrieves metadata for a specific data series.

##### `getSeriesObservations(seriesId: string, options?: ObservationOptions): Promise<FREDObservation[]>`

Retrieves data observations for a series.

**Options:**
```typescript
interface ObservationOptions {
  startDate?: string;  // YYYY-MM-DD format
  endDate?: string;    // YYYY-MM-DD format
  limit?: number;      // Maximum number of observations
}
```

##### `searchSeries(query: string, options?: SearchOptions): Promise<FREDSeries[]>`

Searches for data series by keyword.

##### `getMultipleSeriesObservations(seriesIds: string[], options?: ObservationOptions): Promise<{ [seriesId: string]: FREDObservation[] }>`

Retrieves observations for multiple series efficiently.

**Example:**
```typescript
const fredClient = new FREDClient('your-api-key', 'MyApp/1.0.0 (contact@myapp.com)');

// Get GDP data
const gdpSeries = await fredClient.getSeries('GDP');
console.log(`GDP Series: ${gdpSeries.title}`);

// Get recent GDP observations
const gdpData = await fredClient.getSeriesObservations('GDP', {
  startDate: '2023-01-01',
  limit: 4
});
console.log(`Latest GDP: ${gdpData[gdpData.length - 1].value}`);

// Search for unemployment data
const unemploymentSeries = await fredClient.searchSeries('unemployment rate');
console.log(`Found ${unemploymentSeries.length} unemployment series`);
```

### BLS Client

Access to Bureau of Labor Statistics data.

#### Key Methods

##### `getSeriesData(seriesIds: string[], options?: BLSOptions): Promise<BLSSeries[]>`

Retrieves data for one or more BLS series.

**Options:**
```typescript
interface BLSOptions {
  startYear?: number;
  endYear?: number;
}
```

##### `getUnemploymentRate(options?: BLSOptions): Promise<BLSSeries>`

Retrieves the national unemployment rate (series LNS14000000).

##### `getConsumerPriceIndex(options?: BLSOptions): Promise<BLSSeries>`

Retrieves the Consumer Price Index (series CUUR0000SA0).

##### `getEconomicIndicators(options?: BLSOptions): Promise<BLSSeries[]>`

Retrieves multiple key economic indicators.

**Example:**
```typescript
const blsClient = new BLSClient('your-api-key', 'MyApp/1.0.0 (contact@myapp.com)');

// Get unemployment rate
const unemployment = await blsClient.getUnemploymentRate({
  startYear: 2023,
  endYear: 2023
});
console.log(`Current unemployment: ${unemployment.data[0].value}%`);

// Get multiple economic indicators
const indicators = await blsClient.getEconomicIndicators({
  startYear: 2023,
  endYear: 2023
});
console.log(`Retrieved ${indicators.length} economic indicators`);
```

### Census Client

Access to U.S. Census Bureau data.

#### Key Methods

##### `getVariables(dataset: string, survey: string, year: number): Promise<CensusVariable[]>`

Retrieves available variables for a dataset.

##### `getData(dataset: string, survey: string, year: number, variables: string[], geography: GeographyOptions): Promise<CensusData[]>`

Retrieves census data for specified variables and geography.

**Geography Options:**
```typescript
interface GeographyOptions {
  for: string;    // e.g., 'state:*', 'county:*', 'state:06'
  in?: string;    // e.g., 'state:06' for counties in California
}
```

##### `getStateData(year: number, variables: string[], stateCode?: string): Promise<CensusData[]>`

Retrieves data for states.

##### `getCountyData(year: number, variables: string[], stateCode?: string, countyCode?: string): Promise<CensusData[]>`

Retrieves data for counties.

**Example:**
```typescript
const censusClient = new CensusClient('MyApp/1.0.0 (contact@myapp.com)');

// Get state population data
const stateData = await censusClient.getStateData(2021, [
  'NAME',           // State name
  'B01001_001E'     // Total population
]);

stateData.forEach(state => {
  console.log(`${state.NAME}: ${state.B01001_001E} people`);
});

// Get California county data
const caCounties = await censusClient.getCountyData(2021, [
  'NAME',
  'B01001_001E',
  'B19013_001E'     // Median household income
], '06'); // California state code

console.log(`Found ${caCounties.length} California counties`);
```

## Error Handling

The service implements comprehensive error handling:

### Error Types

```typescript
interface ApiError {
  code: string;
  message: string;
  status?: number;
}
```

### Common Error Scenarios

1. **Network Errors**: Connection timeouts, DNS failures
2. **Rate Limiting**: API rate limits exceeded
3. **Authentication**: Invalid API keys
4. **Data Not Found**: Invalid tickers, series IDs, etc.
5. **Malformed Responses**: Invalid JSON or unexpected data structure

### Error Handling Example

```typescript
try {
  const company = await govData.getCompanyProfile('INVALID');
} catch (error) {
  if (error.code === 'HTTP_404') {
    console.log('Company not found');
  } else if (error.code === 'NETWORK_ERROR') {
    console.log('Network connection failed');
  } else {
    console.log('Unexpected error:', error.message);
  }
}
```

## Rate Limiting

Each API has different rate limits that are automatically handled:

| API | Rate Limit | Notes |
|-----|------------|-------|
| SEC | 10 requests/second | Strictly enforced |
| FRED | 120 requests/minute | With API key |
| BLS | 25 requests/10 minutes (public)<br>500 requests/10 minutes (registered) | Higher limits with API key |
| Census | ~50 requests/minute | Unofficial limit |

### Rate Limiter Status

```typescript
const status = govData.getHealthStatus();
console.log('SEC tokens remaining:', status.sec?.tokensRemaining);
console.log('FRED tokens remaining:', status.fred?.tokensRemaining);
```

## Examples

### Complete Company Analysis

```typescript
import { GovFinancialData } from 'government-data-service';

async function analyzeCompany(ticker: string) {
  const govData = new GovFinancialData({
    fredApiKey: process.env.FRED_API_KEY,
    blsApiKey: process.env.BLS_API_KEY,
    userAgent: 'CompanyAnalyzer/1.0.0 (analyst@example.com)'
  });

  try {
    // Get company profile
    const profile = await govData.getCompanyProfile(ticker);
    console.log(`\n=== ${profile.company.title} (${ticker}) ===`);
    console.log(`CIK: ${profile.company.cik_str}`);
    console.log(`Recent filings: ${profile.recentFilings.length}`);

    // Get economic context
    const context = await govData.getCompanyWithEconomicContext(ticker);
    if (context.economicContext.marketIndicators) {
      console.log('\n=== Market Indicators ===');
      Object.entries(context.economicContext.marketIndicators).forEach(([key, value]) => {
        console.log(`${key}: ${value.current}% (${value.date})`);
      });
    }

    // Get recent filings details
    console.log('\n=== Recent Filings ===');
    profile.recentFilings.slice(0, 5).forEach(filing => {
      console.log(`${filing.form} - ${filing.filingDate} - ${filing.primaryDocDescription}`);
    });

    return {
      profile,
      context: context.economicContext
    };

  } catch (error) {
    console.error(`Error analyzing ${ticker}:`, error.message);
    throw error;
  }
}

// Usage
analyzeCompany('AAPL').then(analysis => {
  console.log('Analysis complete');
}).catch(console.error);
```

### Economic Dashboard

```typescript
async function createEconomicDashboard() {
  const govData = new GovFinancialData({
    fredApiKey: process.env.FRED_API_KEY,
    blsApiKey: process.env.BLS_API_KEY,
    userAgent: 'EconomicDashboard/1.0.0 (dashboard@example.com)'
  });

  try {
    // Get comprehensive economic data
    const [dashboard, marketIndicators, correlation] = await Promise.all([
      govData.getEconomicDashboard(),
      govData.getMarketIndicators(),
      govData.getCrossSourceCorrelation({ year: 2023 })
    ]);

    console.log('\n=== Economic Dashboard ===');
    
    // Market indicators
    if (marketIndicators) {
      console.log('\n--- Market Indicators ---');
      Object.entries(marketIndicators).forEach(([indicator, data]) => {
        const change = data.change ? ` (${data.change > 0 ? '+' : ''}${data.change.toFixed(2)})` : '';
        console.log(`${indicator}: ${data.current}%${change}`);
      });
    }

    // BLS data
    if (dashboard.bls) {
      console.log('\n--- Labor Market ---');
      dashboard.bls.forEach(series => {
        const latest = series.data.find(d => d.latest === 'true');
        if (latest) {
          console.log(`${series.seriesID}: ${latest.value}% (${latest.periodName} ${latest.year})`);
        }
      });
    }

    // Correlation insights
    console.log('\n--- Cross-Source Analysis ---');
    console.log('Economic data sources:', Object.keys(correlation).filter(k => k !== 'correlation'));
    console.log('Correlation analysis:', correlation.correlation);

    return {
      dashboard,
      marketIndicators,
      correlation
    };

  } catch (error) {
    console.error('Error creating dashboard:', error.message);
    throw error;
  }
}

// Usage
createEconomicDashboard().then(dashboard => {
  console.log('Dashboard created successfully');
}).catch(console.error);
```

### Multi-Source Search

```typescript
async function searchEconomicData(query: string) {
  const govData = new GovFinancialData({
    fredApiKey: process.env.FRED_API_KEY,
    userAgent: 'DataSearcher/1.0.0 (search@example.com)'
  });

  try {
    const results = await govData.searchAllSources(query);
    
    console.log(`\n=== Search Results for "${query}" ===`);
    
    // SEC companies
    console.log(`\n--- Companies (${results.sec.length}) ---`);
    results.sec.slice(0, 10).forEach(company => {
      console.log(`${company.ticker}: ${company.title}`);
    });

    // FRED series
    console.log(`\n--- Economic Series (${results.fred.length}) ---`);
    results.fred.slice(0, 10).forEach(series => {
      console.log(`${series.id}: ${series.title}`);
    });

    return results;

  } catch (error) {
    console.error(`Error searching for "${query}":`, error.message);
    throw error;
  }
}

// Usage
searchEconomicData('technology').then(results => {
  console.log('Search completed');
}).catch(console.error);
```

## Testing

The service includes comprehensive test suites:

### Running Tests

```bash
# Unit tests
npm run test

# Integration tests (requires API keys)
npm run test:integration

# Performance tests
npm run test:performance

# All tests
npm run test:all
```

### Test Configuration

Set up test environment variables:

```bash
# .env.test
FRED_API_KEY=your_test_fred_api_key
BLS_API_KEY=your_test_bls_api_key
TEST_USER_AGENT="TestSuite/1.0.0 (test@example.com)"
```

### Mock Data Providers

For testing without API dependencies:

```typescript
import { MockDataScenarios } from 'government-data-service/tests/mocks';

// Create test scenarios
const healthyScenario = MockDataScenarios.createHealthyScenario();
const failureScenario = MockDataScenarios.createPartialFailureScenario();
const largeDataset = MockDataScenarios.generateLargeDataset(10000);
```

## Support

For issues, questions, or contributions:

- GitHub Issues: [repository-url/issues]
- Documentation: [repository-url/docs]
- Examples: [repository-url/examples]

## License

MIT License - see LICENSE file for details.