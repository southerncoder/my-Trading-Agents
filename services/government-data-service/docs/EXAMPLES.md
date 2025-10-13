# Government Data Service Examples

This document provides comprehensive examples of how to use the Government Data Service for various use cases.

## Table of Contents

- [Basic Setup](#basic-setup)
- [Company Analysis](#company-analysis)
- [Economic Research](#economic-research)
- [Market Analysis](#market-analysis)
- [Data Correlation](#data-correlation)
- [Error Handling](#error-handling)
- [Performance Optimization](#performance-optimization)
- [Advanced Use Cases](#advanced-use-cases)

## Basic Setup

### Environment Configuration

```bash
# .env file
FRED_API_KEY=your_fred_api_key_here
BLS_API_KEY=your_bls_api_key_here
USER_AGENT="YourApp/1.0.0 (your-email@example.com)"
```

### Basic Initialization

```typescript
import { GovFinancialData } from 'government-data-service';
import { config } from 'dotenv';

// Load environment variables
config();

// Initialize the service
const govData = new GovFinancialData({
  fredApiKey: process.env.FRED_API_KEY,
  blsApiKey: process.env.BLS_API_KEY,
  userAgent: process.env.USER_AGENT || 'DefaultApp/1.0.0 (contact@example.com)'
});

console.log('Government Data Service initialized');
```

## Company Analysis

### Basic Company Profile

```typescript
async function getCompanyProfile(ticker: string) {
  try {
    const profile = await govData.getCompanyProfile(ticker);
    
    console.log(`\n=== ${profile.company.title} (${ticker}) ===`);
    console.log(`CIK: ${profile.company.cik_str}`);
    console.log(`Recent Filings: ${profile.recentFilings.length}`);
    
    // Show recent filings
    console.log('\nRecent Filings:');
    profile.recentFilings.slice(0, 5).forEach(filing => {
      console.log(`  ${filing.form} - ${filing.filingDate} - ${filing.primaryDocDescription}`);
    });
    
    // Show financial facts if available
    if (profile.financialFacts) {
      console.log(`\nFinancial Facts Available: ${profile.financialFacts.entityName}`);
      const facts = profile.financialFacts.facts;
      if (facts['us-gaap']) {
        const concepts = Object.keys(facts['us-gaap']);
        console.log(`Available Concepts: ${concepts.slice(0, 5).join(', ')}...`);
      }
    }
    
    return profile;
  } catch (error) {
    console.error(`Error fetching profile for ${ticker}:`, error.message);
    throw error;
  }
}

// Usage
getCompanyProfile('AAPL').then(profile => {
  console.log('Profile retrieved successfully');
});
```

### Multiple Company Comparison

```typescript
async function compareCompanies(tickers: string[]) {
  console.log(`\n=== Comparing Companies: ${tickers.join(', ')} ===`);
  
  const profiles = await Promise.all(
    tickers.map(async ticker => {
      try {
        const profile = await govData.getCompanyProfile(ticker);
        return { ticker, profile, error: null };
      } catch (error) {
        return { ticker, profile: null, error: error.message };
      }
    })
  );
  
  // Display comparison
  profiles.forEach(({ ticker, profile, error }) => {
    if (error) {
      console.log(`${ticker}: ERROR - ${error}`);
    } else if (profile) {
      console.log(`${ticker}: ${profile.company.title}`);
      console.log(`  Filings: ${profile.recentFilings.length}`);
      console.log(`  Has Facts: ${profile.financialFacts ? 'Yes' : 'No'}`);
      
      // Show most recent filing
      if (profile.recentFilings.length > 0) {
        const recent = profile.recentFilings[0];
        console.log(`  Latest: ${recent.form} (${recent.filingDate})`);
      }
    }
  });
  
  return profiles;
}

// Usage
compareCompanies(['AAPL', 'MSFT', 'GOOGL', 'AMZN']).then(comparison => {
  console.log('Company comparison completed');
});
```

### Detailed Financial Analysis

```typescript
async function analyzeCompanyFinancials(ticker: string) {
  const profile = await govData.getCompanyProfile(ticker);
  
  if (!profile.financialFacts) {
    console.log(`No financial facts available for ${ticker}`);
    return null;
  }
  
  const facts = profile.financialFacts.facts;
  console.log(`\n=== Financial Analysis: ${profile.company.title} ===`);
  
  // Analyze US-GAAP data
  if (facts['us-gaap']) {
    const gaap = facts['us-gaap'];
    
    // Key financial metrics
    const keyMetrics = ['Assets', 'Revenues', 'NetIncomeLoss', 'StockholdersEquity'];
    
    keyMetrics.forEach(metric => {
      if (gaap[metric]) {
        const concept = gaap[metric];
        console.log(`\n${concept.label}:`);
        console.log(`  Description: ${concept.description}`);
        
        // Show recent values
        if (concept.units.USD) {
          const recentValues = concept.units.USD
            .sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime())
            .slice(0, 3);
          
          recentValues.forEach(value => {
            const amount = (value.val / 1000000).toFixed(0); // Convert to millions
            console.log(`    ${value.end}: $${amount}M (${value.form})`);
          });
        }
      }
    });
  }
  
  return profile.financialFacts;
}

// Usage
analyzeCompanyFinancials('AAPL').then(facts => {
  if (facts) {
    console.log('Financial analysis completed');
  }
});
```

## Economic Research

### Economic Dashboard

```typescript
async function createEconomicDashboard() {
  console.log('\n=== Economic Dashboard ===');
  
  try {
    // Get comprehensive economic data
    const dashboard = await govData.getEconomicDashboard();
    
    // Display BLS data
    if (dashboard.bls) {
      console.log('\n--- Labor Market Indicators ---');
      dashboard.bls.forEach(series => {
        const latest = series.data.find(d => d.latest === 'true');
        if (latest) {
          const seriesName = getSeriesName(series.seriesID);
          console.log(`${seriesName}: ${latest.value}% (${latest.periodName} ${latest.year})`);
        }
      });
    }
    
    // Display FRED data
    if (dashboard.fred) {
      console.log('\n--- Economic Indicators (FRED) ---');
      Object.entries(dashboard.fred).forEach(([seriesId, observations]) => {
        if (observations.length > 0) {
          const latest = observations[observations.length - 1];
          const seriesName = getFREDSeriesName(seriesId);
          console.log(`${seriesName}: ${latest.value} (${latest.date})`);
        }
      });
    }
    
    return dashboard;
  } catch (error) {
    console.error('Error creating economic dashboard:', error.message);
    throw error;
  }
}

function getSeriesName(seriesId: string): string {
  const names: Record<string, string> = {
    'LNS14000000': 'Unemployment Rate',
    'CUUR0000SA0': 'Consumer Price Index',
    'WPUFD49207': 'Producer Price Index',
    'CES0500000003': 'Average Hourly Earnings'
  };
  return names[seriesId] || seriesId;
}

function getFREDSeriesName(seriesId: string): string {
  const names: Record<string, string> = {
    'GDP': 'Gross Domestic Product',
    'UNRATE': 'Unemployment Rate',
    'CPIAUCSL': 'Consumer Price Index'
  };
  return names[seriesId] || seriesId;
}

// Usage
createEconomicDashboard().then(dashboard => {
  console.log('Economic dashboard created');
});
```

### Historical Economic Trends

```typescript
async function analyzeEconomicTrends(startYear: number, endYear: number) {
  console.log(`\n=== Economic Trends (${startYear}-${endYear}) ===`);
  
  // Get BLS historical data
  const blsClient = govData.bls;
  const economicIndicators = await blsClient.getEconomicIndicators({
    startYear,
    endYear
  });
  
  // Analyze unemployment trends
  const unemploymentSeries = economicIndicators.find(s => s.seriesID === 'LNS14000000');
  if (unemploymentSeries) {
    console.log('\n--- Unemployment Rate Trends ---');
    
    // Group by year and calculate averages
    const yearlyAverages = unemploymentSeries.data.reduce((acc, point) => {
      const year = point.year;
      if (!acc[year]) acc[year] = { sum: 0, count: 0 };
      acc[year].sum += parseFloat(point.value);
      acc[year].count += 1;
      return acc;
    }, {} as Record<string, { sum: number; count: number }>);
    
    Object.entries(yearlyAverages).forEach(([year, data]) => {
      const average = (data.sum / data.count).toFixed(1);
      console.log(`${year}: ${average}%`);
    });
  }
  
  // Analyze inflation trends
  const cpiSeries = economicIndicators.find(s => s.seriesID === 'CUUR0000SA0');
  if (cpiSeries) {
    console.log('\n--- Inflation Trends (Year-over-Year) ---');
    
    const sortedData = cpiSeries.data
      .sort((a, b) => `${a.year}-${a.period}`.localeCompare(`${b.year}-${b.period}`));
    
    for (let i = 12; i < sortedData.length; i++) {
      const current = sortedData[i];
      const yearAgo = sortedData[i - 12];
      
      if (current && yearAgo) {
        const inflation = ((parseFloat(current.value) - parseFloat(yearAgo.value)) / parseFloat(yearAgo.value) * 100);
        console.log(`${current.periodName} ${current.year}: ${inflation.toFixed(1)}%`);
      }
    }
  }
  
  return economicIndicators;
}

// Usage
analyzeEconomicTrends(2020, 2023).then(trends => {
  console.log('Economic trends analysis completed');
});
```

## Market Analysis

### Market Indicators Dashboard

```typescript
async function createMarketDashboard() {
  console.log('\n=== Market Indicators Dashboard ===');
  
  try {
    const indicators = await govData.getMarketIndicators();
    
    // Treasury rates
    console.log('\n--- Treasury Rates ---');
    ['DGS3MO', 'DGS2', 'DGS10', 'DGS30'].forEach(rate => {
      if (indicators[rate]) {
        const data = indicators[rate];
        const change = data.change ? ` (${data.change > 0 ? '+' : ''}${data.change.toFixed(2)})` : '';
        const rateName = getTreasuryName(rate);
        console.log(`${rateName}: ${data.current}%${change} (${data.date})`);
      }
    });
    
    // Market indicators
    console.log('\n--- Market Indicators ---');
    ['VIXCLS', 'DEXUSEU', 'DCOILWTICO'].forEach(indicator => {
      if (indicators[indicator]) {
        const data = indicators[indicator];
        const change = data.change ? ` (${data.change > 0 ? '+' : ''}${data.change.toFixed(2)})` : '';
        const indicatorName = getMarketIndicatorName(indicator);
        console.log(`${indicatorName}: ${data.current}${change} (${data.date})`);
      }
    });
    
    // Economic indicators
    console.log('\n--- Economic Indicators ---');
    ['GDP', 'UNRATE', 'CPIAUCSL', 'FEDFUNDS'].forEach(indicator => {
      if (indicators[indicator]) {
        const data = indicators[indicator];
        const change = data.change ? ` (${data.change > 0 ? '+' : ''}${data.change.toFixed(2)})` : '';
        const indicatorName = getEconomicIndicatorName(indicator);
        console.log(`${indicatorName}: ${data.current}${change} (${data.date})`);
      }
    });
    
    return indicators;
  } catch (error) {
    console.error('Error creating market dashboard:', error.message);
    throw error;
  }
}

function getTreasuryName(code: string): string {
  const names: Record<string, string> = {
    'DGS3MO': '3-Month Treasury',
    'DGS2': '2-Year Treasury',
    'DGS10': '10-Year Treasury',
    'DGS30': '30-Year Treasury'
  };
  return names[code] || code;
}

function getMarketIndicatorName(code: string): string {
  const names: Record<string, string> = {
    'VIXCLS': 'VIX Volatility Index',
    'DEXUSEU': 'USD/EUR Exchange Rate',
    'DCOILWTICO': 'WTI Oil Price'
  };
  return names[code] || code;
}

function getEconomicIndicatorName(code: string): string {
  const names: Record<string, string> = {
    'GDP': 'GDP (Billions)',
    'UNRATE': 'Unemployment Rate',
    'CPIAUCSL': 'Consumer Price Index',
    'FEDFUNDS': 'Federal Funds Rate'
  };
  return names[code] || code;
}

// Usage
createMarketDashboard().then(dashboard => {
  console.log('Market dashboard created');
});
```

### Yield Curve Analysis

```typescript
async function analyzeYieldCurve() {
  console.log('\n=== Yield Curve Analysis ===');
  
  const fredClient = govData.fred;
  if (!fredClient) {
    console.log('FRED API key required for yield curve analysis');
    return null;
  }
  
  // Treasury rates for yield curve
  const treasuryRates = ['DGS1MO', 'DGS3MO', 'DGS6MO', 'DGS1', 'DGS2', 'DGS5', 'DGS10', 'DGS20', 'DGS30'];
  const maturities = ['1M', '3M', '6M', '1Y', '2Y', '5Y', '10Y', '20Y', '30Y'];
  
  try {
    const rateData = await fredClient.getMultipleSeriesObservations(treasuryRates, {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
      endDate: new Date().toISOString().split('T')[0]
    });
    
    console.log('\n--- Current Yield Curve ---');
    treasuryRates.forEach((rate, index) => {
      const observations = rateData[rate];
      if (observations && observations.length > 0) {
        const latest = observations[observations.length - 1];
        if (latest.value !== '.') {
          console.log(`${maturities[index]}: ${latest.value}%`);
        }
      }
    });
    
    // Calculate yield curve slope (10Y - 2Y)
    const tenYear = rateData['DGS10'];
    const twoYear = rateData['DGS2'];
    
    if (tenYear && twoYear && tenYear.length > 0 && twoYear.length > 0) {
      const tenYearRate = parseFloat(tenYear[tenYear.length - 1].value);
      const twoYearRate = parseFloat(twoYear[twoYear.length - 1].value);
      
      if (!isNaN(tenYearRate) && !isNaN(twoYearRate)) {
        const slope = tenYearRate - twoYearRate;
        console.log(`\n--- Yield Curve Analysis ---`);
        console.log(`10Y-2Y Spread: ${slope.toFixed(2)}%`);
        
        if (slope < 0) {
          console.log('Status: INVERTED (Potential recession signal)');
        } else if (slope < 0.5) {
          console.log('Status: FLAT (Economic uncertainty)');
        } else {
          console.log('Status: NORMAL (Healthy economic conditions)');
        }
      }
    }
    
    return rateData;
  } catch (error) {
    console.error('Error analyzing yield curve:', error.message);
    throw error;
  }
}

// Usage
analyzeYieldCurve().then(curve => {
  if (curve) {
    console.log('Yield curve analysis completed');
  }
});
```

## Data Correlation

### Cross-Source Economic Analysis

```typescript
async function performCrossSourceAnalysis(year: number = 2023) {
  console.log(`\n=== Cross-Source Economic Analysis (${year}) ===`);
  
  try {
    const correlation = await govData.getCrossSourceCorrelation({ year });
    
    // Display available data sources
    console.log('\n--- Data Sources ---');
    if (correlation.economic) {
      console.log('✓ FRED Economic Data Available');
    } else {
      console.log('✗ FRED Economic Data Not Available');
    }
    
    if (correlation.labor) {
      console.log('✓ BLS Labor Data Available');
    } else {
      console.log('✗ BLS Labor Data Not Available');
    }
    
    if (correlation.demographic) {
      console.log('✓ Census Demographic Data Available');
    } else {
      console.log('✗ Census Demographic Data Not Available');
    }
    
    // Analyze correlations
    console.log('\n--- Correlation Analysis ---');
    console.log('Basic correlations:', correlation.correlation);
    
    // Detailed analysis if data is available
    if (correlation.economic && correlation.labor) {
      console.log('\n--- Economic-Labor Market Correlation ---');
      
      // Example: Analyze unemployment vs GDP growth
      if (correlation.economic.GDP && correlation.labor.length > 0) {
        const unemploymentSeries = correlation.labor.find((s: any) => s.seriesID === 'LNS14000000');
        if (unemploymentSeries) {
          console.log('GDP and Unemployment data available for correlation analysis');
          // Perform actual correlation calculation here
        }
      }
    }
    
    return correlation;
  } catch (error) {
    console.error('Error performing cross-source analysis:', error.message);
    throw error;
  }
}

// Usage
performCrossSourceAnalysis(2023).then(analysis => {
  console.log('Cross-source analysis completed');
});
```

### State-Level Economic Analysis

```typescript
async function analyzeStateEconomics(stateCode: string, year: number = 2021) {
  console.log(`\n=== State Economic Analysis: ${stateCode} (${year}) ===`);
  
  try {
    // Get state demographic data
    const censusClient = govData.census;
    const stateData = await censusClient.getStateEconomicData(year, [
      'NAME',
      'B01001_001E',  // Total population
      'B19013_001E',  // Median household income
      'B25077_001E',  // Median home value
      'B08303_001E'   // Average commute time
    ], stateCode);
    
    if (stateData.length === 0) {
      console.log(`No data found for state code: ${stateCode}`);
      return null;
    }
    
    const state = stateData[0];
    console.log(`\n--- ${state.NAME} Economic Profile ---`);
    console.log(`Population: ${parseInt(state.B01001_001E as string).toLocaleString()}`);
    console.log(`Median Income: $${parseInt(state.B19013_001E as string).toLocaleString()}`);
    console.log(`Median Home Value: $${parseInt(state.B25077_001E as string).toLocaleString()}`);
    console.log(`Average Commute: ${state.B08303_001E} minutes`);
    
    // Calculate derived metrics
    const population = parseInt(state.B01001_001E as string);
    const medianIncome = parseInt(state.B19013_001E as string);
    const medianHomeValue = parseInt(state.B25077_001E as string);
    
    const homeValueToIncomeRatio = medianHomeValue / medianIncome;
    console.log(`\n--- Derived Metrics ---`);
    console.log(`Home Value to Income Ratio: ${homeValueToIncomeRatio.toFixed(1)}x`);
    
    if (homeValueToIncomeRatio > 5) {
      console.log('Housing Affordability: LOW (High cost relative to income)');
    } else if (homeValueToIncomeRatio > 3) {
      console.log('Housing Affordability: MODERATE');
    } else {
      console.log('Housing Affordability: HIGH (Affordable relative to income)');
    }
    
    // Get national comparison
    const nationalData = await censusClient.getEconomicIndicators(year);
    if (nationalData.length > 0) {
      const national = nationalData[0];
      const nationalIncome = parseInt(national.B19013_001E as string);
      const incomeRatio = medianIncome / nationalIncome;
      
      console.log(`\n--- National Comparison ---`);
      console.log(`State vs National Income: ${(incomeRatio * 100).toFixed(1)}% of national median`);
    }
    
    return {
      stateData: state,
      metrics: {
        homeValueToIncomeRatio,
        population,
        medianIncome,
        medianHomeValue
      }
    };
    
  } catch (error) {
    console.error(`Error analyzing state economics for ${stateCode}:`, error.message);
    throw error;
  }
}

// Usage
analyzeStateEconomics('06').then(analysis => { // California
  if (analysis) {
    console.log('State economic analysis completed');
  }
});
```

## Error Handling

### Comprehensive Error Handling

```typescript
async function robustDataRetrieval(ticker: string) {
  console.log(`\n=== Robust Data Retrieval: ${ticker} ===`);
  
  const results = {
    company: null as any,
    economic: null as any,
    market: null as any,
    errors: [] as string[]
  };
  
  // Try to get company data
  try {
    results.company = await govData.getCompanyProfile(ticker);
    console.log('✓ Company data retrieved successfully');
  } catch (error) {
    const errorMsg = `Company data failed: ${error.message}`;
    console.log(`✗ ${errorMsg}`);
    results.errors.push(errorMsg);
  }
  
  // Try to get economic data
  try {
    results.economic = await govData.getEconomicDashboard();
    console.log('✓ Economic data retrieved successfully');
  } catch (error) {
    const errorMsg = `Economic data failed: ${error.message}`;
    console.log(`✗ ${errorMsg}`);
    results.errors.push(errorMsg);
  }
  
  // Try to get market data (requires FRED API key)
  try {
    results.market = await govData.getMarketIndicators();
    console.log('✓ Market data retrieved successfully');
  } catch (error) {
    const errorMsg = `Market data failed: ${error.message}`;
    console.log(`✗ ${errorMsg}`);
    results.errors.push(errorMsg);
  }
  
  // Summary
  console.log(`\n--- Summary ---`);
  console.log(`Successful retrievals: ${3 - results.errors.length}/3`);
  console.log(`Errors encountered: ${results.errors.length}`);
  
  if (results.errors.length > 0) {
    console.log('\nError details:');
    results.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }
  
  return results;
}

// Usage
robustDataRetrieval('AAPL').then(results => {
  console.log('Robust data retrieval completed');
});
```

### Rate Limiting Awareness

```typescript
async function rateLimitAwareProcessing(tickers: string[]) {
  console.log(`\n=== Rate Limit Aware Processing: ${tickers.length} tickers ===`);
  
  const results = [];
  const batchSize = 5; // Process in small batches
  const delayBetweenBatches = 2000; // 2 second delay
  
  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);
    console.log(`\nProcessing batch ${Math.floor(i / batchSize) + 1}: ${batch.join(', ')}`);
    
    // Check rate limiter status before processing
    const health = govData.getHealthStatus();
    console.log(`Rate limiter status - SEC: ${health.sec?.tokensRemaining || 'N/A'} tokens`);
    
    // Process batch
    const batchPromises = batch.map(async ticker => {
      try {
        const profile = await govData.getCompanyProfile(ticker);
        return { ticker, success: true, data: profile };
      } catch (error) {
        return { ticker, success: false, error: error.message };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Display batch results
    batchResults.forEach(result => {
      if (result.success) {
        console.log(`  ✓ ${result.ticker}: ${result.data.company.title}`);
      } else {
        console.log(`  ✗ ${result.ticker}: ${result.error}`);
      }
    });
    
    // Delay between batches (except for the last batch)
    if (i + batchSize < tickers.length) {
      console.log(`Waiting ${delayBetweenBatches}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  // Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`\n--- Processing Summary ---`);
  console.log(`Total processed: ${results.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success rate: ${((successful / results.length) * 100).toFixed(1)}%`);
  
  return results;
}

// Usage
rateLimitAwareProcessing(['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA']).then(results => {
  console.log('Rate limit aware processing completed');
});
```

## Performance Optimization

### Concurrent Data Retrieval

```typescript
async function optimizedDataRetrieval(ticker: string) {
  console.log(`\n=== Optimized Data Retrieval: ${ticker} ===`);
  
  const startTime = Date.now();
  
  // Retrieve data concurrently where possible
  const [companyResult, economicResult, searchResult] = await Promise.allSettled([
    govData.getCompanyProfile(ticker),
    govData.getEconomicDashboard(),
    govData.searchAllSources(ticker)
  ]);
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log(`Data retrieval completed in ${duration}ms`);
  
  // Process results
  const results = {
    company: companyResult.status === 'fulfilled' ? companyResult.value : null,
    economic: economicResult.status === 'fulfilled' ? economicResult.value : null,
    search: searchResult.status === 'fulfilled' ? searchResult.value : null,
    errors: [] as string[]
  };
  
  // Collect errors
  if (companyResult.status === 'rejected') {
    results.errors.push(`Company: ${companyResult.reason.message}`);
  }
  if (economicResult.status === 'rejected') {
    results.errors.push(`Economic: ${economicResult.reason.message}`);
  }
  if (searchResult.status === 'rejected') {
    results.errors.push(`Search: ${searchResult.reason.message}`);
  }
  
  // Display results
  console.log('\n--- Results ---');
  if (results.company) {
    console.log(`✓ Company: ${results.company.company.title}`);
    console.log(`  Filings: ${results.company.recentFilings.length}`);
  }
  
  if (results.economic) {
    console.log(`✓ Economic: BLS=${!!results.economic.bls}, FRED=${!!results.economic.fred}`);
  }
  
  if (results.search) {
    console.log(`✓ Search: ${results.search.sec.length} companies, ${results.search.fred.length} series`);
  }
  
  if (results.errors.length > 0) {
    console.log('\n--- Errors ---');
    results.errors.forEach(error => console.log(`✗ ${error}`));
  }
  
  return results;
}

// Usage
optimizedDataRetrieval('AAPL').then(results => {
  console.log('Optimized data retrieval completed');
});
```

### Caching Strategy

```typescript
class DataCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  set(key: string, data: any, ttlMinutes: number = 60) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000
    });
  }
  
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  clear() {
    this.cache.clear();
  }
  
  size() {
    return this.cache.size;
  }
}

const dataCache = new DataCache();

async function cachedCompanyProfile(ticker: string) {
  const cacheKey = `company_${ticker}`;
  
  // Check cache first
  let profile = dataCache.get(cacheKey);
  if (profile) {
    console.log(`✓ Retrieved ${ticker} from cache`);
    return profile;
  }
  
  // Fetch from API
  console.log(`→ Fetching ${ticker} from API`);
  profile = await govData.getCompanyProfile(ticker);
  
  // Cache the result (cache for 30 minutes)
  dataCache.set(cacheKey, profile, 30);
  
  return profile;
}

async function demonstrateCaching() {
  console.log('\n=== Caching Demonstration ===');
  
  const tickers = ['AAPL', 'MSFT', 'AAPL', 'GOOGL', 'AAPL']; // Note: AAPL repeated
  
  for (const ticker of tickers) {
    const startTime = Date.now();
    await cachedCompanyProfile(ticker);
    const duration = Date.now() - startTime;
    console.log(`  ${ticker}: ${duration}ms`);
  }
  
  console.log(`\nCache size: ${dataCache.size()} entries`);
}

// Usage
demonstrateCaching().then(() => {
  console.log('Caching demonstration completed');
});
```

## Advanced Use Cases

### Sector Analysis

```typescript
async function analyzeSector(sectorTickers: string[], sectorName: string) {
  console.log(`\n=== ${sectorName} Sector Analysis ===`);
  
  const sectorData = await Promise.allSettled(
    sectorTickers.map(ticker => govData.getCompanyProfile(ticker))
  );
  
  const successfulProfiles = sectorData
    .filter(result => result.status === 'fulfilled')
    .map(result => (result as PromiseFulfilledResult<any>).value);
  
  console.log(`\n--- Sector Overview ---`);
  console.log(`Companies analyzed: ${successfulProfiles.length}/${sectorTickers.length}`);
  
  // Analyze filing activity
  const filingStats = successfulProfiles.map(profile => ({
    ticker: profile.company.ticker,
    title: profile.company.title,
    filingCount: profile.recentFilings.length,
    hasFinancialFacts: !!profile.financialFacts,
    mostRecentFiling: profile.recentFilings[0]?.filingDate || 'N/A'
  }));
  
  console.log(`\n--- Filing Activity ---`);
  filingStats
    .sort((a, b) => b.filingCount - a.filingCount)
    .forEach(stat => {
      console.log(`${stat.ticker}: ${stat.filingCount} filings (latest: ${stat.mostRecentFiling})`);
    });
  
  // Calculate sector averages
  const avgFilings = filingStats.reduce((sum, stat) => sum + stat.filingCount, 0) / filingStats.length;
  const companiesWithFacts = filingStats.filter(stat => stat.hasFinancialFacts).length;
  
  console.log(`\n--- Sector Statistics ---`);
  console.log(`Average filings per company: ${avgFilings.toFixed(1)}`);
  console.log(`Companies with financial facts: ${companiesWithFacts}/${filingStats.length} (${((companiesWithFacts / filingStats.length) * 100).toFixed(1)}%)`);
  
  return {
    sectorName,
    companies: filingStats,
    statistics: {
      avgFilings,
      companiesWithFacts,
      totalCompanies: filingStats.length
    }
  };
}

// Usage - Technology Sector
const techTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA'];
analyzeSector(techTickers, 'Technology').then(analysis => {
  console.log('Sector analysis completed');
});
```

### Economic Event Impact Analysis

```typescript
async function analyzeEconomicEventImpact(eventDate: string, eventName: string) {
  console.log(`\n=== Economic Event Impact Analysis ===`);
  console.log(`Event: ${eventName} (${eventDate})`);
  
  const fredClient = govData.fred;
  if (!fredClient) {
    console.log('FRED API key required for event impact analysis');
    return null;
  }
  
  // Define date ranges (30 days before and after the event)
  const eventDateObj = new Date(eventDate);
  const beforeStart = new Date(eventDateObj.getTime() - 30 * 24 * 60 * 60 * 1000);
  const afterEnd = new Date(eventDateObj.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  const beforeStartStr = beforeStart.toISOString().split('T')[0];
  const afterEndStr = afterEnd.toISOString().split('T')[0];
  
  // Key indicators to analyze
  const indicators = ['DGS10', 'VIXCLS', 'DEXUSEU', 'DCOILWTICO'];
  
  try {
    const data = await fredClient.getMultipleSeriesObservations(indicators, {
      startDate: beforeStartStr,
      endDate: afterEndStr
    });
    
    console.log(`\n--- Impact Analysis ---`);
    
    indicators.forEach(indicator => {
      const observations = data[indicator];
      if (!observations || observations.length === 0) return;
      
      // Find observations before and after the event
      const beforeEvent = observations.filter(obs => new Date(obs.date) < eventDateObj);
      const afterEvent = observations.filter(obs => new Date(obs.date) > eventDateObj);
      
      if (beforeEvent.length === 0 || afterEvent.length === 0) return;
      
      // Calculate averages
      const beforeAvg = beforeEvent
        .filter(obs => obs.value !== '.')
        .reduce((sum, obs) => sum + parseFloat(obs.value), 0) / beforeEvent.filter(obs => obs.value !== '.').length;
      
      const afterAvg = afterEvent
        .filter(obs => obs.value !== '.')
        .reduce((sum, obs) => sum + parseFloat(obs.value), 0) / afterEvent.filter(obs => obs.value !== '.').length;
      
      if (isNaN(beforeAvg) || isNaN(afterAvg)) return;
      
      const change = afterAvg - beforeAvg;
      const changePercent = (change / beforeAvg) * 100;
      
      const indicatorName = getMarketIndicatorName(indicator);
      console.log(`${indicatorName}:`);
      console.log(`  Before: ${beforeAvg.toFixed(2)}`);
      console.log(`  After: ${afterAvg.toFixed(2)}`);
      console.log(`  Change: ${change > 0 ? '+' : ''}${change.toFixed(2)} (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%)`);
      
      // Interpret the change
      if (Math.abs(changePercent) > 5) {
        console.log(`  Impact: SIGNIFICANT ${change > 0 ? 'INCREASE' : 'DECREASE'}`);
      } else if (Math.abs(changePercent) > 2) {
        console.log(`  Impact: MODERATE ${change > 0 ? 'INCREASE' : 'DECREASE'}`);
      } else {
        console.log(`  Impact: MINIMAL`);
      }
      console.log('');
    });
    
    return data;
  } catch (error) {
    console.error('Error analyzing economic event impact:', error.message);
    throw error;
  }
}

// Usage - Analyze impact of a Federal Reserve meeting
analyzeEconomicEventImpact('2023-07-26', 'Federal Reserve FOMC Meeting').then(analysis => {
  if (analysis) {
    console.log('Economic event impact analysis completed');
  }
});
```

### Custom Research Pipeline

```typescript
class ResearchPipeline {
  private govData: GovFinancialData;
  private results: Map<string, any> = new Map();
  
  constructor(govData: GovFinancialData) {
    this.govData = govData;
  }
  
  async addCompanyAnalysis(ticker: string) {
    console.log(`Adding company analysis: ${ticker}`);
    try {
      const profile = await this.govData.getCompanyProfile(ticker);
      this.results.set(`company_${ticker}`, profile);
      return profile;
    } catch (error) {
      console.error(`Failed to analyze ${ticker}:`, error.message);
      return null;
    }
  }
  
  async addEconomicContext() {
    console.log('Adding economic context');
    try {
      const [dashboard, indicators] = await Promise.all([
        this.govData.getEconomicDashboard(),
        this.govData.getMarketIndicators().catch(() => null)
      ]);
      
      this.results.set('economic_dashboard', dashboard);
      if (indicators) {
        this.results.set('market_indicators', indicators);
      }
      
      return { dashboard, indicators };
    } catch (error) {
      console.error('Failed to add economic context:', error.message);
      return null;
    }
  }
  
  async addCrossSourceCorrelation(year: number) {
    console.log(`Adding cross-source correlation for ${year}`);
    try {
      const correlation = await this.govData.getCrossSourceCorrelation({ year });
      this.results.set('correlation', correlation);
      return correlation;
    } catch (error) {
      console.error('Failed to add correlation analysis:', error.message);
      return null;
    }
  }
  
  generateReport() {
    console.log('\n=== Research Pipeline Report ===');
    
    // Company analyses
    const companies = Array.from(this.results.keys())
      .filter(key => key.startsWith('company_'))
      .map(key => this.results.get(key));
    
    if (companies.length > 0) {
      console.log(`\n--- Company Analyses (${companies.length}) ---`);
      companies.forEach(company => {
        if (company) {
          console.log(`${company.company.ticker}: ${company.company.title}`);
          console.log(`  Filings: ${company.recentFilings.length}`);
          console.log(`  Financial Facts: ${company.financialFacts ? 'Available' : 'Not Available'}`);
        }
      });
    }
    
    // Economic context
    const dashboard = this.results.get('economic_dashboard');
    if (dashboard) {
      console.log('\n--- Economic Context ---');
      console.log(`BLS Data: ${dashboard.bls ? 'Available' : 'Not Available'}`);
      console.log(`FRED Data: ${dashboard.fred ? 'Available' : 'Not Available'}`);
    }
    
    const indicators = this.results.get('market_indicators');
    if (indicators) {
      console.log('\n--- Market Indicators ---');
      const indicatorCount = Object.keys(indicators).length;
      console.log(`Available indicators: ${indicatorCount}`);
    }
    
    // Correlation analysis
    const correlation = this.results.get('correlation');
    if (correlation) {
      console.log('\n--- Cross-Source Correlation ---');
      console.log(`Economic data: ${correlation.economic ? 'Available' : 'Not Available'}`);
      console.log(`Labor data: ${correlation.labor ? 'Available' : 'Not Available'}`);
      console.log(`Demographic data: ${correlation.demographic ? 'Available' : 'Not Available'}`);
    }
    
    return {
      companies,
      dashboard,
      indicators,
      correlation,
      summary: {
        companiesAnalyzed: companies.length,
        hasEconomicData: !!dashboard,
        hasMarketData: !!indicators,
        hasCorrelationData: !!correlation
      }
    };
  }
  
  clear() {
    this.results.clear();
  }
}

async function runCustomResearch() {
  console.log('\n=== Custom Research Pipeline ===');
  
  const pipeline = new ResearchPipeline(govData);
  
  // Build research pipeline
  await pipeline.addCompanyAnalysis('AAPL');
  await pipeline.addCompanyAnalysis('MSFT');
  await pipeline.addEconomicContext();
  await pipeline.addCrossSourceCorrelation(2023);
  
  // Generate comprehensive report
  const report = pipeline.generateReport();
  
  console.log('\n--- Pipeline Summary ---');
  console.log(`Companies analyzed: ${report.summary.companiesAnalyzed}`);
  console.log(`Economic data: ${report.summary.hasEconomicData ? 'Yes' : 'No'}`);
  console.log(`Market data: ${report.summary.hasMarketData ? 'Yes' : 'No'}`);
  console.log(`Correlation data: ${report.summary.hasCorrelationData ? 'Yes' : 'No'}`);
  
  return report;
}

// Usage
runCustomResearch().then(report => {
  console.log('Custom research pipeline completed');
});
```

## Running the Examples

To run these examples:

1. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run individual examples:**
   ```bash
   # Basic company profile
   npx tsx examples/company-profile.ts

   # Economic dashboard
   npx tsx examples/economic-dashboard.ts

   # Market analysis
   npx tsx examples/market-analysis.ts
   ```

4. **Run all examples:**
   ```bash
   npm run examples
   ```

Remember to respect API rate limits and handle errors appropriately in production code.