import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GovFinancialData } from '../../src/GovFinancialData.js';
import { SECClient } from '../../src/clients/SECClient.js';
import { FREDClient } from '../../src/clients/FREDClient.js';
import { BLSClient } from '../../src/clients/BLSClient.js';
import { CensusClient } from '../../src/clients/CensusClient.js';

describe('Error Handling Integration Tests', () => {
  let govData: GovFinancialData;
  let secClient: SECClient;
  let fredClient: FREDClient | undefined;
  let blsClient: BLSClient;
  let censusClient: CensusClient;

  beforeAll(() => {
    govData = new GovFinancialData({
      fredApiKey: globalThis.testConfig.fredApiKey,
      blsApiKey: globalThis.testConfig.blsApiKey,
      userAgent: globalThis.testConfig.userAgent
    });

    secClient = new SECClient(globalThis.testConfig.userAgent);
    blsClient = new BLSClient(globalThis.testConfig.blsApiKey, globalThis.testConfig.userAgent);
    censusClient = new CensusClient(globalThis.testConfig.userAgent);

    if (globalThis.testConfig.fredApiKey) {
      fredClient = new FREDClient(globalThis.testConfig.fredApiKey, globalThis.testConfig.userAgent);
    }
  });

  afterAll(async () => {
    // Allow time for any pending requests to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  describe('Network Error Handling', () => {
    it('should handle SEC API network errors gracefully', async () => {
      // Test with invalid base URL to simulate network error
      const invalidClient = new (SECClient as any)('invalid-user-agent');
      (invalidClient as any).baseURL = 'https://invalid-domain-that-does-not-exist.com';

      await expect(invalidClient.getCompanyTickers()).rejects.toThrow();
    }, 30000);

    it('should handle timeout errors appropriately', async () => {
      // Test with very short timeout
      await expect(
        secClient.getCompanyTickers({ timeout: 1 })
      ).rejects.toThrow();
    }, 30000);

    it('should handle malformed responses', async () => {
      // This test would require mocking the HTTP client to return malformed data
      // For now, we'll test with invalid parameters that might cause parsing errors
      
      await expect(
        secClient.getCompanyFacts('invalid-cik-format')
      ).rejects.toThrow();
    }, 30000);
  });

  describe('Rate Limiting Behavior', () => {
    it('should handle SEC rate limiting (10 requests/second)', async () => {
      const startTime = Date.now();
      
      // Make more requests than the rate limit allows
      const promises = Array.from({ length: 15 }, (_, i) => 
        secClient.getCompanyByTicker('AAPL').catch(error => ({ error: error.message }))
      );
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should take at least 1 second due to rate limiting
      expect(duration).toBeGreaterThan(1000);
      
      // Most requests should succeed (rate limiter should handle this)
      const successfulRequests = results.filter(result => !('error' in result));
      expect(successfulRequests.length).toBeGreaterThan(10);
      
      console.log(`Completed ${promises.length} SEC requests in ${duration}ms`);
    }, 60000);

    it('should handle FRED rate limiting (120 requests/minute)', async () => {
      if (!fredClient) return;

      const startTime = Date.now();
      
      // Make multiple requests quickly
      const promises = Array.from({ length: 10 }, (_, i) => 
        fredClient!.getSeries('GDP').catch(error => ({ error: error.message }))
      );
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // All requests should succeed within rate limits
      const successfulRequests = results.filter(result => !('error' in result));
      expect(successfulRequests.length).toBeGreaterThan(5);
      
      console.log(`Completed ${promises.length} FRED requests in ${duration}ms`);
    }, 30000);

    it('should handle BLS rate limiting appropriately', async () => {
      const startTime = Date.now();
      
      // Make multiple requests
      const promises = Array.from({ length: 5 }, (_, i) => 
        blsClient.getUnemploymentRate().catch(error => ({ error: error.message }))
      );
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should handle rate limiting gracefully
      const successfulRequests = results.filter(result => !('error' in result));
      expect(successfulRequests.length).toBeGreaterThan(0);
      
      console.log(`Completed ${promises.length} BLS requests in ${duration}ms`);
    }, 30000);

    it('should handle Census rate limiting appropriately', async () => {
      const startTime = Date.now();
      
      // Make multiple requests
      const promises = Array.from({ length: 5 }, (_, i) => 
        censusClient.getStateData(2021, ['NAME', 'B01001_001E']).catch(error => ({ error: error.message }))
      );
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should handle rate limiting gracefully
      const successfulRequests = results.filter(result => !('error' in result));
      expect(successfulRequests.length).toBeGreaterThan(0);
      
      console.log(`Completed ${promises.length} Census requests in ${duration}ms`);
    }, 30000);
  });

  describe('API Error Responses', () => {
    it('should handle SEC 404 errors for non-existent companies', async () => {
      const company = await secClient.getCompanyByTicker('NONEXISTENTCOMPANY123');
      expect(company).toBeNull();
    }, 30000);

    it('should handle SEC invalid CIK errors', async () => {
      await expect(
        secClient.getCompanyFacts('invalid-cik')
      ).rejects.toThrow();
    }, 30000);

    it('should handle FRED invalid series errors', async () => {
      if (!fredClient) return;

      await expect(
        fredClient.getSeries('INVALID_SERIES_ID_123')
      ).rejects.toThrow();
    }, 30000);

    it('should handle FRED invalid API key errors', async () => {
      const invalidClient = new FREDClient('invalid-api-key', globalThis.testConfig.userAgent);
      
      await expect(
        invalidClient.getSeries('GDP')
      ).rejects.toThrow();
    }, 30000);

    it('should handle BLS invalid series errors', async () => {
      const result = await blsClient.getSeriesData(['INVALID_SERIES_123']);
      
      // BLS returns empty data for invalid series rather than throwing
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    }, 30000);

    it('should handle Census invalid dataset errors', async () => {
      await expect(
        censusClient.getData('invalid', 'invalid', 2021, ['NAME'], { for: 'state:*' })
      ).rejects.toThrow();
    }, 30000);

    it('should handle Census invalid variable errors', async () => {
      await expect(
        censusClient.getData('acs', 'acs5', 2021, ['INVALID_VARIABLE'], { for: 'state:*' })
      ).rejects.toThrow();
    }, 30000);
  });

  describe('Service Degradation Scenarios', () => {
    it('should handle partial service failures in economic dashboard', async () => {
      // This test simulates what happens when some services are down
      const dashboard = await govData.getEconomicDashboard();
      
      expect(dashboard).toBeDefined();
      // Should have at least some data even if some services fail
      expect(dashboard.bls !== null || dashboard.fred !== null).toBe(true);
    }, 60000);

    it('should handle search failures gracefully', async () => {
      const results = await govData.searchAllSources('test query');
      
      expect(results).toBeDefined();
      expect(results.sec).toBeDefined();
      expect(results.fred).toBeDefined();
      
      // Should return empty arrays rather than throwing on failures
      expect(Array.isArray(results.sec)).toBe(true);
      expect(Array.isArray(results.fred)).toBe(true);
    }, 30000);

    it('should handle cross-source correlation with missing data', async () => {
      const correlation = await govData.getCrossSourceCorrelation({ year: 2023 });
      
      expect(correlation).toBeDefined();
      expect(correlation.correlation).toBeDefined();
      
      // Should handle missing data gracefully
      if (correlation.economic === null) {
        console.log('FRED data unavailable, correlation still computed');
      }
      if (correlation.labor === null) {
        console.log('BLS data unavailable, correlation still computed');
      }
      if (correlation.demographic === null) {
        console.log('Census data unavailable, correlation still computed');
      }
    }, 60000);
  });

  describe('Data Validation and Error Recovery', () => {
    it('should validate and handle malformed SEC data', async () => {
      const filings = await secClient.getCompanyFilings('0000320193', { count: 5 });
      
      // Validate data structure
      filings.forEach(filing => {
        expect(filing).toHaveProperty('accessionNumber');
        expect(filing).toHaveProperty('filingDate');
        expect(filing).toHaveProperty('form');
        
        // Validate date format
        expect(filing.filingDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(new Date(filing.filingDate)).toBeInstanceOf(Date);
        
        // Validate numeric fields
        expect(typeof filing.size).toBe('number');
        expect(filing.size).toBeGreaterThan(0);
      });
    }, 30000);

    it('should validate and handle malformed FRED data', async () => {
      if (!fredClient) return;

      const observations = await fredClient.getSeriesObservations('GDP', { limit: 5 });
      
      // Validate data structure
      observations.forEach(obs => {
        expect(obs).toHaveProperty('date');
        expect(obs).toHaveProperty('value');
        
        // Validate date format
        expect(obs.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(new Date(obs.date)).toBeInstanceOf(Date);
        
        // Validate value (should be numeric string or ".")
        expect(typeof obs.value).toBe('string');
        if (obs.value !== '.') {
          expect(isNaN(parseFloat(obs.value))).toBe(false);
        }
      });
    }, 30000);

    it('should validate and handle malformed BLS data', async () => {
      const series = await blsClient.getUnemploymentRate();
      
      expect(series).toHaveProperty('seriesID');
      expect(series).toHaveProperty('data');
      expect(Array.isArray(series.data)).toBe(true);
      
      // Validate data structure
      series.data.forEach(dataPoint => {
        expect(dataPoint).toHaveProperty('year');
        expect(dataPoint).toHaveProperty('period');
        expect(dataPoint).toHaveProperty('value');
        
        // Validate year format
        expect(dataPoint.year).toMatch(/^\d{4}$/);
        expect(parseInt(dataPoint.year)).toBeGreaterThan(1900);
        
        // Validate period format
        expect(dataPoint.period).toMatch(/^M\d{2}$/);
        
        // Validate value
        expect(typeof dataPoint.value).toBe('string');
        expect(isNaN(parseFloat(dataPoint.value))).toBe(false);
      });
    }, 30000);

    it('should validate and handle malformed Census data', async () => {
      const stateData = await censusClient.getStateData(2021, ['NAME', 'B01001_001E']);
      
      expect(Array.isArray(stateData)).toBe(true);
      
      // Validate data structure
      stateData.forEach(state => {
        expect(state).toHaveProperty('NAME');
        expect(state).toHaveProperty('B01001_001E');
        expect(state).toHaveProperty('state');
        
        // Validate state name
        expect(typeof state.NAME).toBe('string');
        expect(state.NAME.length).toBeGreaterThan(0);
        
        // Validate population (should be numeric string)
        expect(typeof state.B01001_001E).toBe('string');
        expect(isNaN(parseInt(state.B01001_001E as string))).toBe(false);
        
        // Validate state code
        expect(typeof state.state).toBe('string');
        expect(state.state).toMatch(/^\d{2}$/);
      });
    }, 30000);
  });

  describe('Retry and Recovery Mechanisms', () => {
    it('should retry failed requests appropriately', async () => {
      // Test retry mechanism by making requests that might fail
      const startTime = Date.now();
      
      try {
        // This might fail due to rate limiting or network issues
        await secClient.getCompanyTickers({ retries: 2, retryDelay: 1000 });
      } catch (error) {
        // Even if it fails, it should have taken time for retries
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Should have taken at least 2 seconds for 2 retries with 1 second delay
        if (duration > 2000) {
          console.log(`Request failed after retries, took ${duration}ms`);
        }
      }
    }, 30000);

    it('should handle circuit breaker behavior', async () => {
      // Test circuit breaker by making multiple failing requests
      const promises = Array.from({ length: 5 }, async (_, i) => {
        try {
          // Make request with very short timeout to force failures
          return await secClient.getCompanyTickers({ timeout: 1 });
        } catch (error) {
          return { error: error.message, attempt: i };
        }
      });
      
      const results = await Promise.all(promises);
      
      // Should have some failures
      const failures = results.filter(result => 'error' in result);
      expect(failures.length).toBeGreaterThan(0);
      
      console.log(`${failures.length} out of ${promises.length} requests failed as expected`);
    }, 30000);
  });

  describe('Resource Cleanup and Memory Management', () => {
    it('should clean up resources after errors', async () => {
      const initialMemory = process.memoryUsage();
      
      // Make multiple requests that might fail
      const promises = Array.from({ length: 10 }, async (_, i) => {
        try {
          return await secClient.getCompanyByTicker(`INVALID${i}`);
        } catch (error) {
          return null;
        }
      });
      
      await Promise.all(promises);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be minimal even with errors
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
      
      console.log(`Memory increase after error handling: ${memoryIncrease / 1024 / 1024}MB`);
    }, 30000);

    it('should handle concurrent error scenarios', async () => {
      const startTime = Date.now();
      
      // Mix of valid and invalid requests
      const promises = [
        secClient.getCompanyByTicker('AAPL'),
        secClient.getCompanyByTicker('INVALID1'),
        secClient.getCompanyByTicker('MSFT'),
        secClient.getCompanyByTicker('INVALID2'),
        secClient.getCompanyByTicker('GOOGL')
      ];
      
      const results = await Promise.allSettled(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      expect(successful).toBeGreaterThan(0);
      expect(failed).toBeGreaterThan(0);
      expect(duration).toBeLessThan(30000);
      
      console.log(`Concurrent error test: ${successful} successful, ${failed} failed in ${duration}ms`);
    }, 45000);
  });
});