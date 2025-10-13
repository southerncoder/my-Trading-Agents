# Government Data Service Testing Framework

This directory contains comprehensive tests for the Government Data Service, including unit tests, integration tests, performance tests, and mock data providers.

## Test Structure

```
tests/
├── setup.ts                           # Global test setup and configuration
├── unit/                              # Unit tests (no external API calls)
│   ├── clients/                       # Client-specific unit tests
│   │   ├── SECClient.test.ts         # SEC client unit tests
│   │   ├── FREDClient.test.ts        # FRED client unit tests
│   │   ├── BLSClient.test.ts         # BLS client unit tests
│   │   └── CensusClient.test.ts      # Census client unit tests
│   └── GovFinancialData.test.ts      # Main service unit tests
├── integration/                       # Integration tests (real API calls)
│   ├── SECClient.integration.test.ts  # SEC API integration tests
│   ├── FREDClient.integration.test.ts # FRED API integration tests
│   └── ErrorHandling.integration.test.ts # Error handling tests
├── performance/                       # Performance and load tests
│   └── DataProcessing.performance.test.ts # Large dataset processing tests
├── mocks/                            # Mock data providers
│   └── MockDataProviders.ts          # Comprehensive mock data
└── README.md                         # This file
```

## Running Tests

### Prerequisites

1. **Environment Setup:**
   ```bash
   # Copy environment template
   cp .env.example .env.local
   
   # Add your API keys (required for integration tests)
   FRED_API_KEY=your_fred_api_key_here
   BLS_API_KEY=your_bls_api_key_here
   TEST_USER_AGENT="TestSuite/1.0.0 (test@example.com)"
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

### Test Commands

```bash
# Run all unit tests (no API calls required)
npm run test:unit

# Run integration tests (requires API keys)
npm run test:integration

# Run performance tests
npm run test:performance

# Run all tests
npm run test:all

# Run tests with coverage report
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Individual Test Suites

```bash
# Run specific test files
npx vitest tests/unit/clients/SECClient.test.ts
npx vitest tests/integration/SECClient.integration.test.ts
npx vitest tests/performance/DataProcessing.performance.test.ts

# Run tests matching a pattern
npx vitest --run --reporter=verbose "SEC"
npx vitest --run --reporter=verbose "integration"
```

## Test Types

### Unit Tests

Unit tests mock all external dependencies and test individual components in isolation.

**Features:**
- No external API calls
- Fast execution (< 30 seconds total)
- High code coverage
- Comprehensive error scenario testing
- Mock data providers for consistent testing

**Example:**
```typescript
// tests/unit/clients/SECClient.test.ts
describe('SECClient', () => {
  it('should fetch company tickers successfully', async () => {
    const mockTickers = { '0': { cik_str: '0000320193', ticker: 'AAPL', title: 'Apple Inc.' } };
    mockAxiosInstance.mockResolvedValueOnce({ data: mockTickers, status: 200 });

    const result = await secClient.getCompanyTickers();
    expect(result).toEqual(mockTickers);
  });
});
```

### Integration Tests

Integration tests make real API calls to verify the service works with actual government APIs.

**Features:**
- Real API calls to SEC, FRED, BLS, Census
- Rate limiting compliance testing
- Error handling with actual API responses
- Data validation and format verification
- Network resilience testing

**Requirements:**
- Valid API keys for FRED and BLS (optional but recommended)
- Internet connection
- Longer execution time (up to 10 minutes)

**Example:**
```typescript
// tests/integration/SECClient.integration.test.ts
describe('SECClient Integration Tests', () => {
  it('should fetch company tickers from real SEC API', async () => {
    const tickers = await secClient.getCompanyTickers();
    
    expect(tickers).toBeDefined();
    expect(typeof tickers).toBe('object');
    expect(Object.keys(tickers).length).toBeGreaterThan(0);
  }, 30000);
});
```

### Performance Tests

Performance tests verify the service can handle large datasets and concurrent operations efficiently.

**Features:**
- Large dataset processing (10,000+ records)
- Concurrent request handling
- Memory usage monitoring
- Processing time benchmarks
- Resource cleanup verification

**Example:**
```typescript
// tests/performance/DataProcessing.performance.test.ts
describe('Large Dataset Processing', () => {
  it('should process large state dataset efficiently', async () => {
    const largeDataset = MockDataScenarios.generateLargeDataset(10000);
    const startTime = Date.now();
    
    const processedData = largeDataset.map(item => ({
      ...item,
      populationDensity: parseInt(item.B01001_001E as string) / 1000
    }));
    
    const processingTime = Date.now() - startTime;
    expect(processingTime).toBeLessThan(5000); // Should process in under 5 seconds
  }, 10000);
});
```

## Mock Data Providers

The testing framework includes comprehensive mock data providers that simulate real API responses without making external calls.

### Available Mock Providers

1. **MockSECProvider** - SEC EDGAR database simulation
2. **MockFREDProvider** - Federal Reserve Economic Data simulation
3. **MockBLSProvider** - Bureau of Labor Statistics simulation
4. **MockCensusProvider** - U.S. Census Bureau simulation

### Mock Data Scenarios

```typescript
import { MockDataScenarios } from './mocks/MockDataProviders';

// Create different test scenarios
const healthyScenario = MockDataScenarios.createHealthyScenario();
const partialFailureScenario = MockDataScenarios.createPartialFailureScenario();
const rateLimitedScenario = MockDataScenarios.createRateLimitedScenario();
const emptyDataScenario = MockDataScenarios.createEmptyDataScenario();

// Generate large datasets for performance testing
const largeDataset = MockDataScenarios.generateLargeDataset(10000);
const timeSeriesData = MockDataScenarios.generateTimeSeriesData('GDP', startDate, endDate);
```

### Using Mock Providers

```typescript
// In your tests
import { MockSECProvider } from '../mocks/MockDataProviders';

describe('Company Analysis', () => {
  it('should analyze mock company data', () => {
    const company = MockSECProvider.getCompanyByTicker('AAPL');
    expect(company).toBeDefined();
    expect(company?.ticker).toBe('AAPL');
    expect(company?.title).toContain('Apple');
  });
});
```

## Test Configuration

### Vitest Configuration

The project uses separate Vitest configurations for different test types:

- `vitest.config.ts` - Unit tests configuration
- `vitest.integration.config.ts` - Integration tests configuration

### Global Test Setup

The `tests/setup.ts` file provides:
- Environment variable loading
- Global test configuration
- Test utilities and helpers
- Timeout and retry settings

### Environment Variables

```bash
# Required for integration tests
FRED_API_KEY=your_fred_api_key_here
BLS_API_KEY=your_bls_api_key_here

# Test configuration
TEST_USER_AGENT="TestSuite/1.0.0 (test@example.com)"
NODE_ENV=test
LOG_LEVEL=error
```

## Coverage Reports

Generate coverage reports to ensure comprehensive testing:

```bash
# Generate coverage report
npm run test:coverage

# View coverage report
open coverage/index.html
```

**Coverage Targets:**
- Lines: 80%+
- Functions: 80%+
- Branches: 80%+
- Statements: 80%+

## Best Practices

### Writing Unit Tests

1. **Mock External Dependencies:**
   ```typescript
   vi.mock('axios', () => ({
     default: {
       create: vi.fn(() => mockAxiosInstance)
     }
   }));
   ```

2. **Test Error Scenarios:**
   ```typescript
   it('should handle API errors gracefully', async () => {
     mockAxiosInstance.mockRejectedValueOnce(new Error('Network error'));
     await expect(client.getData()).rejects.toThrow('Network error');
   });
   ```

3. **Validate Data Structures:**
   ```typescript
   expect(result).toHaveProperty('company');
   expect(result.company).toHaveProperty('ticker');
   expect(result.company.ticker).toBe('AAPL');
   ```

### Writing Integration Tests

1. **Respect Rate Limits:**
   ```typescript
   // Add delays between requests
   await new Promise(resolve => setTimeout(resolve, 200));
   ```

2. **Handle API Failures Gracefully:**
   ```typescript
   it('should handle API unavailability', async () => {
     try {
       const result = await client.getData();
       expect(result).toBeDefined();
     } catch (error) {
       // API might be down, log but don't fail test
       console.warn('API unavailable:', error.message);
     }
   });
   ```

3. **Use Realistic Timeouts:**
   ```typescript
   it('should fetch data within reasonable time', async () => {
     const result = await client.getData();
     expect(result).toBeDefined();
   }, 30000); // 30 second timeout
   ```

### Writing Performance Tests

1. **Set Performance Benchmarks:**
   ```typescript
   const startTime = Date.now();
   await processLargeDataset();
   const duration = Date.now() - startTime;
   expect(duration).toBeLessThan(5000); // 5 second limit
   ```

2. **Monitor Memory Usage:**
   ```typescript
   const initialMemory = process.memoryUsage();
   await memoryIntensiveOperation();
   const finalMemory = process.memoryUsage();
   const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
   expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB limit
   ```

3. **Test Concurrent Operations:**
   ```typescript
   const promises = Array.from({ length: 10 }, () => client.getData());
   const results = await Promise.all(promises);
   expect(results).toHaveLength(10);
   ```

## Troubleshooting

### Common Issues

1. **API Key Errors:**
   ```
   Error: FRED API key is required
   ```
   **Solution:** Add `FRED_API_KEY` to your `.env.local` file

2. **Rate Limiting:**
   ```
   Error: Rate limit exceeded
   ```
   **Solution:** Reduce test concurrency or add delays between requests

3. **Network Timeouts:**
   ```
   Error: timeout of 30000ms exceeded
   ```
   **Solution:** Increase timeout or check internet connection

4. **Mock Import Errors:**
   ```
   Error: Cannot find module '../mocks/MockDataProviders'
   ```
   **Solution:** Ensure mock files are properly exported and paths are correct

### Debug Mode

Run tests with debug output:

```bash
# Enable debug logging
DEBUG=* npm run test:unit

# Run specific test with verbose output
npx vitest --run --reporter=verbose tests/unit/clients/SECClient.test.ts
```

### Test Isolation

Ensure tests don't interfere with each other:

```typescript
beforeEach(() => {
  vi.clearAllMocks();
  // Reset any global state
});

afterEach(() => {
  vi.restoreAllMocks();
  // Cleanup resources
});
```

## Contributing

When adding new tests:

1. **Follow naming conventions:**
   - Unit tests: `*.test.ts`
   - Integration tests: `*.integration.test.ts`
   - Performance tests: `*.performance.test.ts`

2. **Add appropriate timeouts:**
   - Unit tests: Default (5 seconds)
   - Integration tests: 30-60 seconds
   - Performance tests: Up to 10 minutes

3. **Include error scenarios:**
   - Network failures
   - Invalid inputs
   - Rate limiting
   - API errors

4. **Update mock data:**
   - Keep mock data realistic
   - Add new scenarios as needed
   - Maintain data consistency

5. **Document test purpose:**
   ```typescript
   describe('Feature Name', () => {
     it('should handle specific scenario correctly', async () => {
       // Test implementation
     });
   });
   ```

## Continuous Integration

The test suite is designed to run in CI/CD environments:

```yaml
# Example GitHub Actions workflow
- name: Run Unit Tests
  run: npm run test:unit

- name: Run Integration Tests
  run: npm run test:integration
  env:
    FRED_API_KEY: ${{ secrets.FRED_API_KEY }}
    BLS_API_KEY: ${{ secrets.BLS_API_KEY }}

- name: Generate Coverage Report
  run: npm run test:coverage
```

## Support

For testing issues:

1. Check the troubleshooting section above
2. Review test logs for specific error messages
3. Ensure all dependencies are installed
4. Verify API keys are correctly configured
5. Check network connectivity for integration tests

For questions or contributions, please refer to the main project documentation.