# Government Data Service - Usage Guide

## Overview

The Government Data Service provides comprehensive access to official government financial and economic data sources, including SEC filings, Federal Reserve economic data (FRED), Bureau of Labor Statistics (BLS), and Census Bureau data. This service enhances fundamental analysis capabilities with authoritative government data.

## Table of Contents

1. [Service Overview](#service-overview)
2. [API Endpoints](#api-endpoints)
3. [Data Sources](#data-sources)
4. [Usage Examples](#usage-examples)
5. [Integration with Trading Agents](#integration-with-trading-agents)
6. [Rate Limits and Quotas](#rate-limits-and-quotas)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)

---

## Service Overview

### Architecture

The Government Data Service is a containerized microservice that aggregates data from multiple government APIs:

- **SEC EDGAR**: Company filings, financial facts, and mutual fund data
- **FRED (Federal Reserve)**: Economic time series data
- **BLS (Bureau of Labor Statistics)**: Employment and price index data
- **Census Bureau**: Demographic and economic indicators

### Service Configuration

```yaml
# docker-compose.yml
government-data:
  build:
    context: ./services/government-data-service
  ports:
    - "3005:3005"
  environment:
    - NODE_ENV=production
    - LOG_LEVEL=info
  secrets:
    - fred_api_key
    - bls_api_key
```

### Environment Variables

```bash
# Required API Keys
FRED_API_KEY=your_fred_api_key
BLS_API_KEY=your_bls_api_key

# Optional Configuration
GOVERNMENT_DATA_PORT=3005
GOVERNMENT_DATA_TIMEOUT=30000
GOVERNMENT_DATA_CACHE_TTL=3600
```

---

## API Endpoints

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "sec": "operational",
    "fred": "operational",
    "bls": "operational",
    "census": "operational"
  }
}
```

### Company Profile

```http
GET /api/company/{symbol}
```

**Parameters:**
- `symbol` (required): Stock ticker symbol (e.g., AAPL)

**Response:**
```json
{
  "symbol": "AAPL",
  "companyName": "Apple Inc.",
  "cik": "0000320193",
  "secFilings": [...],
  "economicContext": {...},
  "lastUpdated": "2024-01-15T10:30:00Z"
}
```

### SEC Filings

```http
GET /api/sec/filings/{symbol}
GET /api/sec/filings/{symbol}?type=10-K&limit=5
```

**Parameters:**
- `symbol` (required): Stock ticker symbol
- `type` (optional): Filing type (10-K, 10-Q, 8-K, etc.)
- `limit` (optional): Number of filings to return (default: 10)

**Response:**
```json
{
  "symbol": "AAPL",
  "filings": [
    {
      "filingType": "10-K",
      "filingDate": "2023-11-03",
      "reportDate": "2023-09-30",
      "documentUrl": "https://www.sec.gov/...",
      "facts": {
        "revenues": 383285000000,
        "netIncome": 96995000000,
        "totalAssets": 352755000000
      }
    }
  ]
}
```

### Economic Indicators (FRED)

```http
GET /api/fred/series/{seriesId}
GET /api/fred/series/GDP?start=2020-01-01&end=2023-12-31
```

**Parameters:**
- `seriesId` (required): FRED series ID (e.g., GDP, UNRATE, CPIAUCSL)
- `start` (optional): Start date (YYYY-MM-DD)
- `end` (optional): End date (YYYY-MM-DD)

**Response:**
```json
{
  "seriesId": "GDP",
  "title": "Gross Domestic Product",
  "units": "Billions of Dollars",
  "frequency": "Quarterly",
  "data": [
    {
      "date": "2023-10-01",
      "value": 27610.0
    }
  ]
}
```

### Labor Statistics (BLS)

```http
GET /api/bls/series/{seriesId}
GET /api/bls/series/UNRATE?start=2020&end=2023
```

**Parameters:**
- `seriesId` (required): BLS series ID (e.g., UNRATE, CPIAUCSL)
- `start` (optional): Start year (YYYY)
- `end` (optional): End year (YYYY)

**Response:**
```json
{
  "seriesId": "UNRATE",
  "title": "Unemployment Rate",
  "data": [
    {
      "year": "2023",
      "period": "M12",
      "periodName": "December",
      "value": "3.7"
    }
  ]
}
```

### Economic Dashboard

```http
GET /api/dashboard/economic
```

**Response:**
```json
{
  "gdp": {
    "current": 27610.0,
    "change": 2.4,
    "units": "Billions of Dollars"
  },
  "unemployment": {
    "current": 3.7,
    "change": -0.1,
    "units": "Percent"
  },
  "inflation": {
    "current": 3.1,
    "change": -0.2,
    "units": "Percent"
  },
  "treasuryRates": {
    "oneYear": 4.85,
    "tenYear": 4.25,
    "thirtyYear": 4.35
  },
  "lastUpdated": "2024-01-15T10:30:00Z"
}
```

---

## Data Sources

### SEC EDGAR Database

**Available Data:**
- Company filings (10-K, 10-Q, 8-K, etc.)
- Financial facts and metrics
- Mutual fund data
- Company concepts and taxonomies

**Key Features:**
- Real-time filing notifications
- Structured financial data extraction
- Historical filing archives
- XBRL data parsing

**Rate Limits:**
- 10 requests per second
- User-Agent header required
- No API key required

### Federal Reserve Economic Data (FRED)

**Available Data:**
- GDP and economic growth indicators
- Interest rates and monetary policy data
- Employment and labor market statistics
- Price indices and inflation data
- International economic data

**Key Features:**
- 800,000+ economic time series
- Real-time and historical data
- Multiple data frequencies (daily, weekly, monthly, quarterly, annual)
- Data transformations and calculations

**Rate Limits:**
- 120 requests per minute
- API key required
- 1000 requests per day (free tier)

### Bureau of Labor Statistics (BLS)

**Available Data:**
- Employment and unemployment statistics
- Consumer and producer price indices
- Wage and salary data
- Productivity and costs
- Occupational employment statistics

**Key Features:**
- Official U.S. labor market data
- Industry-specific statistics
- Regional and metropolitan area data
- Seasonal adjustments available

**Rate Limits:**
- 500 requests per day (registered users)
- 25 requests per day (unregistered)
- API key recommended

### Census Bureau

**Available Data:**
- Population estimates and demographics
- Economic census data
- American Community Survey (ACS)
- County Business Patterns
- International trade data

**Key Features:**
- Comprehensive demographic data
- Business and economic statistics
- Geographic data at multiple levels
- Historical trend analysis

**Rate Limits:**
- No official rate limits
- Reasonable use policy applies

---

## Usage Examples

### Basic Company Analysis

```typescript
import { GovernmentDataClient } from './clients/government-data-client';

const client = new GovernmentDataClient();

// Get comprehensive company profile
const profile = await client.getCompanyProfile('AAPL');
console.log('Company:', profile.companyName);
console.log('Latest 10-K filing:', profile.secFilings[0]);

// Get recent SEC filings
const filings = await client.getSECFilings('AAPL', '10-K', 3);
console.log('Recent 10-K filings:', filings);

// Get economic context
const economicData = await client.getEconomicIndicators([
  'GDP', 'UNRATE', 'CPIAUCSL'
]);
console.log('Economic indicators:', economicData);
```

### Economic Analysis

```typescript
// Analyze economic trends
async function analyzeEconomicTrends() {
  const client = new GovernmentDataClient();
  
  // Get GDP growth
  const gdp = await client.getFREDData('GDP', '2020-01-01', '2023-12-31');
  
  // Get unemployment rate
  const unemployment = await client.getBLSData('UNRATE', '2020', '2023');
  
  // Get inflation data
  const inflation = await client.getFREDData('CPIAUCSL', '2020-01-01', '2023-12-31');
  
  return {
    gdpGrowth: calculateGrowthRate(gdp.data),
    unemploymentTrend: analyzeTrend(unemployment.data),
    inflationRate: calculateInflationRate(inflation.data)
  };
}
```

### Sector Analysis

```typescript
// Analyze sector-specific data
async function analyzeSector(sector: string) {
  const client = new GovernmentDataClient();
  
  // Get sector employment data
  const employment = await client.getBLSData(`CES${sector}000001`);
  
  // Get sector-specific economic indicators
  const indicators = await client.getFREDData(`${sector}PROD`);
  
  return {
    employment: employment.data,
    productivity: indicators.data,
    trend: analyzeSectorTrend(employment.data, indicators.data)
  };
}
```

### Integration with Risk Assessment

```typescript
// Use government data for risk assessment
async function assessMacroeconomicRisk(symbol: string) {
  const client = new GovernmentDataClient();
  
  // Get company fundamentals from SEC
  const company = await client.getCompanyProfile(symbol);
  
  // Get economic indicators
  const economic = await client.getEconomicIndicators([
    'GDP', 'UNRATE', 'CPIAUCSL', 'FEDFUNDS'
  ]);
  
  // Calculate risk factors
  const riskFactors = {
    economicGrowth: assessGDPRisk(economic.gdp),
    laborMarket: assessUnemploymentRisk(economic.unemployment),
    inflation: assessInflationRisk(economic.inflation),
    monetaryPolicy: assessInterestRateRisk(economic.federalFundsRate)
  };
  
  return {
    overallRisk: calculateOverallRisk(riskFactors),
    factors: riskFactors,
    recommendations: generateRecommendations(riskFactors)
  };
}
```

---

## Integration with Trading Agents

### Fundamental Analysis Enhancement

The government data service integrates seamlessly with the trading agents system:

```typescript
// In the enhanced trading graph
class EnhancedTradingAgentsGraph {
  async analyzeAndDecide(symbol: string, date: string) {
    // Get government data insights
    if (this.governmentDataClient) {
      const governmentData = await this.governmentDataClient.getCompanyProfile(symbol);
      
      // Use in fundamental analysis
      const fundamentalAnalysis = await this.fundamentalsAnalyst.analyze(symbol, {
        secFilings: governmentData.secFilings,
        economicContext: governmentData.economicContext
      });
      
      // Incorporate into risk assessment
      const riskAssessment = await this.riskEngine.assess(symbol, {
        governmentData: governmentData
      });
    }
  }
}
```

### Economic Context Integration

```typescript
// Add economic context to analysis
class EconomicContextAnalyzer {
  async addEconomicContext(analysis: any, symbol: string): Promise<any> {
    const client = new GovernmentDataClient();
    
    // Get current economic conditions
    const economic = await client.getEconomicIndicators([
      'GDP', 'UNRATE', 'CPIAUCSL', 'FEDFUNDS'
    ]);
    
    // Analyze impact on company
    const impact = this.analyzeEconomicImpact(analysis, economic);
    
    return {
      ...analysis,
      economicContext: economic,
      economicImpact: impact,
      adjustedRating: this.adjustRatingForEconomics(analysis.rating, impact)
    };
  }
}
```

---

## Rate Limits and Quotas

### API Rate Limits

| Service | Rate Limit | Daily Quota | Authentication |
|---------|------------|-------------|----------------|
| SEC EDGAR | 10 req/sec | Unlimited | User-Agent required |
| FRED | 120 req/min | 1000 req/day | API key required |
| BLS | No limit | 500 req/day | API key recommended |
| Census | No limit | Reasonable use | None required |

### Rate Limit Handling

The service implements automatic rate limiting and retry logic:

```typescript
class RateLimitManager {
  private limits = new Map<string, RateLimit>();
  
  async makeRequest(service: string, request: () => Promise<any>): Promise<any> {
    const limit = this.limits.get(service);
    
    if (limit && limit.isExceeded()) {
      await this.waitForReset(limit);
    }
    
    try {
      const result = await request();
      this.updateLimit(service, true);
      return result;
    } catch (error) {
      if (this.isRateLimitError(error)) {
        this.updateLimit(service, false);
        throw new RateLimitError(service, error);
      }
      throw error;
    }
  }
}
```

---

## Error Handling

### Common Error Types

```typescript
// Government data specific errors
class GovernmentDataError extends Error {
  constructor(
    public service: string,
    public errorType: 'rate_limit' | 'not_found' | 'invalid_request' | 'service_unavailable',
    message: string
  ) {
    super(message);
  }
}

// SEC specific errors
class SECError extends GovernmentDataError {
  constructor(errorType: string, message: string) {
    super('SEC', errorType as any, message);
  }
}

// FRED specific errors
class FREDError extends GovernmentDataError {
  constructor(errorType: string, message: string) {
    super('FRED', errorType as any, message);
  }
}
```

### Error Recovery

```typescript
// Automatic error recovery and fallback
class GovernmentDataClient {
  async getCompanyProfile(symbol: string): Promise<CompanyProfile> {
    try {
      // Try to get complete profile
      return await this.getCompleteProfile(symbol);
    } catch (error) {
      if (error instanceof RateLimitError) {
        // Use cached data if available
        return await this.getCachedProfile(symbol);
      } else if (error instanceof SECError) {
        // Get partial profile without SEC data
        return await this.getPartialProfile(symbol);
      }
      throw error;
    }
  }
}
```

---

## Best Practices

### 1. Caching Strategy

```typescript
// Implement intelligent caching
class GovernmentDataCache {
  private cache = new Map<string, CacheEntry>();
  
  // Different TTL for different data types
  private getTTL(dataType: string): number {
    switch (dataType) {
      case 'sec_filings': return 24 * 60 * 60 * 1000; // 24 hours
      case 'economic_data': return 60 * 60 * 1000;    // 1 hour
      case 'company_profile': return 12 * 60 * 60 * 1000; // 12 hours
      default: return 30 * 60 * 1000; // 30 minutes
    }
  }
}
```

### 2. Data Validation

```typescript
// Validate government data
class DataValidator {
  validateSECFiling(filing: any): boolean {
    return (
      filing.filingType &&
      filing.filingDate &&
      filing.documentUrl &&
      this.isValidDate(filing.filingDate)
    );
  }
  
  validateEconomicData(data: any): boolean {
    return (
      data.seriesId &&
      Array.isArray(data.data) &&
      data.data.every(point => point.date && point.value !== null)
    );
  }
}
```

### 3. Performance Optimization

```typescript
// Batch requests when possible
class BatchRequestManager {
  async batchFREDRequest(seriesIds: string[]): Promise<any[]> {
    // FRED supports multiple series in one request
    const batchSize = 10;
    const batches = this.chunkArray(seriesIds, batchSize);
    
    const results = await Promise.all(
      batches.map(batch => this.fredClient.getSeries(batch.join(',')))
    );
    
    return results.flat();
  }
}
```

### 4. Monitoring and Alerting

```typescript
// Monitor government data service health
class GovernmentDataMonitor {
  async checkServiceHealth(): Promise<HealthStatus> {
    const services = ['sec', 'fred', 'bls', 'census'];
    const results = await Promise.all(
      services.map(async service => {
        try {
          await this.testService(service);
          return { service, status: 'healthy' };
        } catch (error) {
          return { service, status: 'unhealthy', error: error.message };
        }
      })
    );
    
    return {
      overall: results.every(r => r.status === 'healthy') ? 'healthy' : 'degraded',
      services: results
    };
  }
}
```

### 5. Data Quality Assurance

```typescript
// Ensure data quality and consistency
class DataQualityChecker {
  checkDataQuality(data: any, source: string): QualityReport {
    const checks = {
      completeness: this.checkCompleteness(data),
      consistency: this.checkConsistency(data),
      timeliness: this.checkTimeliness(data, source),
      accuracy: this.checkAccuracy(data, source)
    };
    
    return {
      overall: this.calculateOverallQuality(checks),
      checks,
      recommendations: this.generateRecommendations(checks)
    };
  }
}
```

---

## Troubleshooting

### Common Issues

1. **API Key Issues**
   - Verify API keys are correctly set in environment variables
   - Check API key quotas and limits
   - Ensure proper authentication headers

2. **Rate Limiting**
   - Implement exponential backoff
   - Use caching to reduce API calls
   - Monitor rate limit headers

3. **Data Availability**
   - Some economic data has reporting delays
   - SEC filings may not be immediately available
   - Handle missing data gracefully

4. **Service Connectivity**
   - Check network connectivity to government APIs
   - Verify firewall and proxy settings
   - Monitor service status pages

### Debug Mode

```bash
# Enable debug logging
DEBUG=government-data:*
LOG_LEVEL=debug

# Test individual services
curl http://localhost:3005/api/test/sec
curl http://localhost:3005/api/test/fred
curl http://localhost:3005/api/test/bls
```

---

*This government data usage guide is maintained and updated with API changes and new features.*