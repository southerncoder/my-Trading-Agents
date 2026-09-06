# News Aggregator Service - Testing Guide

## Test Structure

The test suite is organized into two categories as per requirements:

### Integration Tests (`tests/integration/`)
- **Purpose**: Test the Express API endpoints via HTTP requests
- **Framework**: Jest + Supertest
- **Location**: `tests/integration/api.integration.test.js`
- **Run Command**: `npm run test:integration`

These tests verify the complete request/response cycle through the Express server:
- GET /api/news/aggregate (bulk JSON aggregation)
- GET /api/news/aggregate/stream (Server-Sent Events streaming)
- GET /api/news/health (provider health status)
- GET /api/news/statistics (aggregated metrics)

### Unit Tests (`tests/unit/`)
- **Purpose**: Test individual functions and classes directly
- **Framework**: Jest with mocked providers
- **Location**: `tests/unit/resilient-aggregator.test.js`
- **Run Command**: `npm run test:unit`

These tests verify internal logic without HTTP overhead:
- ResilientNewsAggregator constructor and initialization
- aggregateNews() method with various scenarios
- aggregateNewsStreaming() async generator
- getProvidersHealth() health checks
- getStatistics() metrics collection
- Circuit breaker and retry patterns
- Concurrent execution behavior

## Running Tests

```bash
# Install test dependencies first
npm install

# Run all tests
npm test

# Run only integration tests (HTTP endpoints)
npm run test:integration

# Run only unit tests (direct function calls)
npm run test:unit

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Coverage Areas

### Integration Tests Cover:
✅ HTTP request/response validation
✅ Query parameter validation
✅ Error status codes (400, 500)
✅ Server-Sent Events (SSE) streaming format
✅ Response structure and schema
✅ End-to-end resilience patterns
✅ Multiple provider coordination via HTTP

### Unit Tests Cover:
✅ Component initialization
✅ Provider execution logic
✅ Circuit breaker triggering
✅ Retry handler behavior
✅ Error handling and recovery
✅ Statistics calculation
✅ Concurrent execution patterns
✅ Streaming event generation
✅ Health check aggregation

## Testing Best Practices

1. **Integration tests** should:
   - Use `supertest` to make real HTTP requests
   - Validate HTTP status codes and headers
   - Test complete request/response cycles
   - Mock external API calls to providers
   - Test error scenarios (missing params, provider failures)

2. **Unit tests** should:
   - Import and test functions directly
   - Use comprehensive mocking for dependencies
   - Test edge cases and error conditions
   - Verify internal state and behavior
   - Test concurrent execution patterns

3. **Both test types** should:
   - Use descriptive test names
   - Follow AAA pattern (Arrange, Act, Assert)
   - Test happy paths and error scenarios
   - Verify resilience patterns work correctly
   - Ensure proper cleanup after tests

## Mocking Strategy

### Integration Tests
- Mock all provider implementations to avoid real API calls
- Use Jest mocks for NewsAPI, Tavily, Brave News, SERP API, Google News
- Return predictable test data for consistent assertions
- Simulate both successful and failing providers

### Unit Tests
- Create lightweight mock providers with jest.fn()
- Test both success and failure scenarios
- Verify retry and circuit breaker logic
- Test concurrent execution timing

## Continuous Integration

For CI/CD pipelines, use:

```bash
# Run all tests with coverage
npm run test:coverage

# Lint code
npm run lint
```

## Debugging Tests

To debug a specific test:

```bash
# Run specific test file
npx jest tests/integration/api.integration.test.js

# Run specific test suite
npx jest -t "GET /api/news/aggregate"

# Run with verbose output
npx jest --verbose

# Run with debugging
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Test Data

Mock article structure:
```javascript
{
  title: 'Test Article',
  description: 'Test description',
  url: 'https://example.com/article',
  publishedAt: '2025-10-05T10:00:00Z',
  source: { name: 'Test Source' }
}
```

## Expected Test Results

When running the complete test suite, expect:
- ✅ All integration tests pass (HTTP endpoints work correctly)
- ✅ All unit tests pass (internal logic is correct)
- ✅ 80%+ code coverage for critical paths
- ✅ No real API calls made (all mocked)
- ✅ Fast execution (<5 seconds for full suite)

## Troubleshooting

### Common Issues:

1. **Tests timeout**
   - Check if providers are properly mocked
   - Verify no real API calls are being made
   - Increase Jest timeout if needed: `jest.setTimeout(10000)`

2. **SSE streaming tests fail**
   - Ensure Content-Type header is `text/event-stream`
   - Verify events follow SSE format: `data: {...}\n\n`
   - Check async generator yields all expected events

3. **Mock not working**
   - Verify jest.mock() is called before imports
   - Check mock implementation returns expected structure
   - Use jest.clearAllMocks() in beforeEach if needed

4. **CRLF line ending warnings**
   - Non-blocking cosmetic issue on Windows
   - Can be fixed with: `npm run lint:fix`
   - Or configure git: `git config core.autocrlf false`
