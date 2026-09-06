import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FREDClient } from '../../src/clients/FREDClient.js';

describe('FREDClient Integration Tests', () => {
  let fredClient: FREDClient;

  beforeAll(() => {
    const apiKey = globalThis.testConfig.fredApiKey;
    
    if (!apiKey) {
      console.warn('FRED_API_KEY not provided, skipping FRED integration tests');
      return;
    }

    fredClient = new FREDClient(apiKey, globalThis.testConfig.userAgent);
  });

  afterAll(async () => {
    // Allow time for any pending requests to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('Real API Integration', () => {
    it('should fetch GDP series information', async () => {
      if (!fredClient) return;

      const series = await fredClient.getSeries('GDP');
      
      expect(series).toBeDefined();
      expect(series.id).toBe('GDP');
      expect(series.title).toContain('Gross Domestic Product');
      expect(series.units).toContain('Dollars');
      expect(series.frequency).toBeDefined();
    }, 30000);

    it('should fetch GDP observations', async () => {
      if (!fredClient) return;

      const observations = await fredClient.getSeriesObservations('GDP', {
        limit: 10
      });
      
      expect(observations).toBeDefined();
      expect(Array.isArray(observations)).toBe(true);
      expect(observations.length).toBeGreaterThan(0);
      expect(observations.length).toBeLessThanOrEqual(10);
      
      // Check structure of first observation
      const firstObs = observations[0];
      expect(firstObs).toHaveProperty('date');
      expect(firstObs).toHaveProperty('value');
      expect(firstObs.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }, 30000);

    it('should search for unemployment series', async () => {
      if (!fredClient) return;

      const results = await fredClient.searchSeries('unemployment rate', {
        limit: 5
      });
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(5);
      
      // Should find the main unemployment rate series
      const unrateFound = results.some(series => 
        series.id === 'UNRATE' || series.title.toLowerCase().includes('unemployment')
      );
      expect(unrateFound).toBe(true);
    }, 30000);

    it('should fetch multiple series observations', async () => {
      if (!fredClient) return;

      const seriesIds = ['GDP', 'UNRATE', 'CPIAUCSL'];
      const results = await fredClient.getMultipleSeriesObservations(seriesIds, {
        startDate: '2023-01-01',
        endDate: '2023-12-31'
      });
      
      expect(results).toBeDefined();
      expect(typeof results).toBe('object');
      
      seriesIds.forEach(seriesId => {
        expect(results[seriesId]).toBeDefined();
        expect(Array.isArray(results[seriesId])).toBe(true);
      });
    }, 45000);

    it('should fetch economic indicators', async () => {
      if (!fredClient) return;

      const indicators = await fredClient.getEconomicIndicators({
        startDate: '2023-01-01',
        endDate: '2023-12-31'
      });
      
      expect(indicators).toBeDefined();
      expect(typeof indicators).toBe('object');
      
      // Should include key economic indicators
      const expectedIndicators = ['GDP', 'UNRATE', 'CPIAUCSL'];
      expectedIndicators.forEach(indicator => {
        expect(indicators[indicator]).toBeDefined();
        expect(Array.isArray(indicators[indicator])).toBe(true);
      });
    }, 60000);

    it('should fetch market indicators', async () => {
      if (!fredClient) return;

      const indicators = await fredClient.getMarketIndicators({
        startDate: '2023-01-01',
        endDate: '2023-12-31'
      });
      
      expect(indicators).toBeDefined();
      expect(typeof indicators).toBe('object');
      
      // Should include key market indicators
      const expectedMarketIndicators = ['DGS10', 'DGS2', 'VIXCLS'];
      const foundIndicators = Object.keys(indicators);
      
      expectedMarketIndicators.forEach(indicator => {
        if (indicators[indicator]) {
          expect(Array.isArray(indicators[indicator])).toBe(true);
        }
      });
    }, 60000);

    it('should handle date range filtering', async () => {
      if (!fredClient) return;

      const observations = await fredClient.getSeriesObservations('GDP', {
        startDate: '2023-01-01',
        endDate: '2023-06-30'
      });
      
      expect(observations).toBeDefined();
      expect(Array.isArray(observations)).toBe(true);
      
      // All observations should be within the specified date range
      observations.forEach(obs => {
        const obsDate = new Date(obs.date);
        expect(obsDate).toBeInstanceOf(Date);
        expect(obsDate.getFullYear()).toBe(2023);
        expect(obsDate.getMonth()).toBeLessThan(6); // 0-indexed months
      });
    }, 30000);

    it('should respect rate limiter status', () => {
      if (!fredClient) return;

      const status = fredClient.getRateLimiterStatus();
      expect(status).toBeDefined();
      expect(status?.tokensRemaining).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid series ID', async () => {
      if (!fredClient) return;

      await expect(fredClient.getSeries('INVALID_SERIES_ID')).rejects.toThrow();
    }, 30000);

    it('should handle empty search results gracefully', async () => {
      if (!fredClient) return;

      const results = await fredClient.searchSeries('xyznonexistentquery123');
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    }, 30000);

    it('should handle network timeouts', async () => {
      if (!fredClient) return;

      await expect(
        fredClient.getSeries('GDP', { timeout: 1 }) // 1ms timeout
      ).rejects.toThrow();
    }, 30000);

    it('should handle invalid date ranges', async () => {
      if (!fredClient) return;

      // Future date range that doesn't exist
      const observations = await fredClient.getSeriesObservations('GDP', {
        startDate: '2050-01-01',
        endDate: '2050-12-31'
      });
      
      expect(observations).toBeDefined();
      expect(Array.isArray(observations)).toBe(true);
      expect(observations.length).toBe(0);
    }, 30000);
  });

  describe('Data Validation', () => {
    it('should return valid date formats', async () => {
      if (!fredClient) return;

      const observations = await fredClient.getSeriesObservations('GDP', { limit: 5 });
      
      observations.forEach(obs => {
        expect(obs.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(new Date(obs.date)).toBeInstanceOf(Date);
        expect(isNaN(new Date(obs.date).getTime())).toBe(false);
      });
    }, 30000);

    it('should return numeric values', async () => {
      if (!fredClient) return;

      const observations = await fredClient.getSeriesObservations('GDP', { limit: 5 });
      
      observations.forEach(obs => {
        // Value should be a string that represents a number or "."
        expect(typeof obs.value).toBe('string');
        if (obs.value !== '.') {
          expect(isNaN(parseFloat(obs.value))).toBe(false);
        }
      });
    }, 30000);

    it('should return consistent series metadata', async () => {
      if (!fredClient) return;

      const series = await fredClient.getSeries('UNRATE');
      
      expect(series.id).toBe('UNRATE');
      expect(series.title).toBeDefined();
      expect(series.units).toBeDefined();
      expect(series.frequency).toBeDefined();
      expect(series.seasonal_adjustment).toBeDefined();
      expect(typeof series.popularity).toBe('number');
    }, 30000);
  });

  describe('Performance Tests', () => {
    it('should handle concurrent requests efficiently', async () => {
      if (!fredClient) return;

      const startTime = Date.now();
      
      const promises = [
        fredClient.getSeries('GDP'),
        fredClient.getSeries('UNRATE'),
        fredClient.getSeries('CPIAUCSL'),
        fredClient.getSeries('DGS10'),
        fredClient.getSeries('FEDFUNDS')
      ];
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (accounting for rate limiting)
      expect(duration).toBeLessThan(30000); // 30 seconds max
      
      // All requests should succeed
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
      });
    }, 45000);

    it('should maintain performance with large observation requests', async () => {
      if (!fredClient) return;

      const startTime = Date.now();
      
      const observations = await fredClient.getSeriesObservations('GDP', {
        startDate: '2000-01-01',
        endDate: '2023-12-31'
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(30000); // 30 seconds max
      expect(observations.length).toBeGreaterThan(0);
    }, 45000);
  });

  describe('Real-world Scenarios', () => {
    it('should handle popular economic indicators', async () => {
      if (!fredClient) return;

      const popularSeries = ['GDP', 'UNRATE', 'CPIAUCSL', 'DGS10', 'FEDFUNDS'];
      
      for (const seriesId of popularSeries) {
        const series = await fredClient.getSeries(seriesId);
        expect(series).toBeDefined();
        expect(series.id).toBe(seriesId);
        
        // Add delay to respect rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }, 60000);

    it('should provide consistent data across calls', async () => {
      if (!fredClient) return;

      const series1 = await fredClient.getSeries('GDP');
      await new Promise(resolve => setTimeout(resolve, 1000));
      const series2 = await fredClient.getSeries('GDP');
      
      expect(series1.id).toBe(series2.id);
      expect(series1.title).toBe(series2.title);
      expect(series1.units).toBe(series2.units);
    }, 30000);

    it('should handle different observation frequencies', async () => {
      if (!fredClient) return;

      // Test different frequency series
      const seriesTests = [
        { id: 'GDP', expectedFreq: 'Quarterly' },
        { id: 'UNRATE', expectedFreq: 'Monthly' },
        { id: 'DGS10', expectedFreq: 'Daily' }
      ];
      
      for (const test of seriesTests) {
        const series = await fredClient.getSeries(test.id);
        expect(series.frequency).toBe(test.expectedFreq);
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }, 45000);

    it('should handle search with various keywords', async () => {
      if (!fredClient) return;

      const searchTerms = ['unemployment', 'inflation', 'gdp', 'interest rate'];
      
      for (const term of searchTerms) {
        const results = await fredClient.searchSeries(term, { limit: 3 });
        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);
        
        // Results should be relevant to search term
        if (results.length > 0) {
          const relevantFound = results.some(series =>
            series.title.toLowerCase().includes(term.toLowerCase()) ||
            series.notes?.toLowerCase().includes(term.toLowerCase())
          );
          expect(relevantFound).toBe(true);
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }, 60000);
  });
});