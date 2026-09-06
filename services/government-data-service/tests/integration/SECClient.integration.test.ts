import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SECClient } from '../../src/clients/SECClient.js';

describe('SECClient Integration Tests', () => {
  let secClient: SECClient;

  beforeAll(() => {
    secClient = new SECClient(globalThis.testConfig.userAgent);
  });

  afterAll(async () => {
    // Allow time for any pending requests to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('Real API Integration', () => {
    it('should fetch company tickers from real SEC API', async () => {
      const tickers = await secClient.getCompanyTickers();
      
      expect(tickers).toBeDefined();
      expect(typeof tickers).toBe('object');
      expect(Object.keys(tickers).length).toBeGreaterThan(0);
      
      // Check structure of first company
      const firstCompany = Object.values(tickers)[0];
      expect(firstCompany).toHaveProperty('cik_str');
      expect(firstCompany).toHaveProperty('ticker');
      expect(firstCompany).toHaveProperty('title');
    }, 30000);

    it('should find Apple by ticker', async () => {
      const company = await secClient.getCompanyByTicker('AAPL');
      
      expect(company).toBeDefined();
      expect(company?.ticker).toBe('AAPL');
      expect(company?.title).toContain('Apple');
      expect(company?.cik_str).toBe('0000320193');
    }, 30000);

    it('should find Microsoft by CIK', async () => {
      const company = await secClient.getCompanyByCIK('789019');
      
      expect(company).toBeDefined();
      expect(company?.ticker).toBe('MSFT');
      expect(company?.title).toContain('Microsoft');
      expect(company?.cik_str).toBe('0000789019');
    }, 30000);

    it('should fetch Apple filings', async () => {
      const filings = await secClient.getCompanyFilings('0000320193', { count: 5 });
      
      expect(filings).toBeDefined();
      expect(Array.isArray(filings)).toBe(true);
      expect(filings.length).toBeGreaterThan(0);
      expect(filings.length).toBeLessThanOrEqual(5);
      
      // Check structure of first filing
      const firstFiling = filings[0];
      expect(firstFiling).toHaveProperty('accessionNumber');
      expect(firstFiling).toHaveProperty('filingDate');
      expect(firstFiling).toHaveProperty('form');
      expect(firstFiling).toHaveProperty('primaryDocument');
    }, 30000);

    it('should fetch Apple company facts', async () => {
      const facts = await secClient.getCompanyFacts('0000320193');
      
      expect(facts).toBeDefined();
      expect(facts.entityName).toContain('Apple');
      expect(facts.cik).toBe('0000320193');
      expect(facts.facts).toBeDefined();
      expect(typeof facts.facts).toBe('object');
    }, 30000);

    it('should handle non-existent company gracefully', async () => {
      const company = await secClient.getCompanyByTicker('NONEXISTENT');
      expect(company).toBeNull();
    }, 30000);

    it('should handle rate limiting gracefully', async () => {
      // Make multiple rapid requests to test rate limiting
      const promises = Array.from({ length: 5 }, (_, i) => 
        secClient.getCompanyByTicker('AAPL')
      );
      
      const results = await Promise.all(promises);
      
      // All requests should succeed (rate limiter should handle this)
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result?.ticker).toBe('AAPL');
      });
    }, 60000);

    it('should respect rate limiter status', () => {
      const status = secClient.getRateLimiterStatus();
      expect(status).toBeDefined();
      expect(status?.tokensRemaining).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid CIK gracefully', async () => {
      await expect(secClient.getCompanyFacts('invalid-cik')).rejects.toThrow();
    }, 30000);

    it('should handle network timeouts', async () => {
      // Test with very short timeout
      const shortTimeoutClient = new SECClient(globalThis.testConfig.userAgent);
      
      await expect(
        secClient.getCompanyTickers({ timeout: 1 }) // 1ms timeout
      ).rejects.toThrow();
    }, 30000);
  });

  describe('Data Validation', () => {
    it('should return properly formatted CIK strings', async () => {
      const company = await secClient.getCompanyByTicker('AAPL');
      
      expect(company?.cik_str).toMatch(/^\d{10}$/); // 10-digit CIK
    }, 30000);

    it('should return valid filing dates', async () => {
      const filings = await secClient.getCompanyFilings('0000320193', { count: 1 });
      
      if (filings.length > 0) {
        const filing = filings[0];
        expect(filing.filingDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(new Date(filing.filingDate)).toBeInstanceOf(Date);
      }
    }, 30000);

    it('should return valid form types', async () => {
      const filings = await secClient.getCompanyFilings('0000320193', { count: 10 });
      
      const validFormTypes = ['10-K', '10-Q', '8-K', '20-F', 'DEF 14A', 'S-1', 'S-3'];
      
      filings.forEach(filing => {
        expect(validFormTypes.some(validType => 
          filing.form.includes(validType)
        )).toBe(true);
      });
    }, 30000);
  });

  describe('Performance Tests', () => {
    it('should handle concurrent requests efficiently', async () => {
      const startTime = Date.now();
      
      const promises = [
        secClient.getCompanyByTicker('AAPL'),
        secClient.getCompanyByTicker('MSFT'),
        secClient.getCompanyByTicker('GOOGL'),
        secClient.getCompanyByTicker('AMZN'),
        secClient.getCompanyByTicker('TSLA')
      ];
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (accounting for rate limiting)
      expect(duration).toBeLessThan(60000); // 60 seconds max
      
      // All requests should succeed
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result?.ticker).toBeDefined();
      });
    }, 90000);

    it('should maintain performance with large filing requests', async () => {
      const startTime = Date.now();
      
      const filings = await secClient.getCompanyFilings('0000320193', { count: 100 });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(30000); // 30 seconds max
      expect(filings.length).toBeGreaterThan(0);
    }, 45000);
  });

  describe('Real-world Scenarios', () => {
    it('should handle popular stock tickers', async () => {
      const popularTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA'];
      
      for (const ticker of popularTickers) {
        const company = await secClient.getCompanyByTicker(ticker);
        expect(company).toBeDefined();
        expect(company?.ticker).toBe(ticker);
        
        // Add delay to respect rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }, 120000);

    it('should handle different filing types', async () => {
      const filings = await secClient.getCompanyFilings('0000320193', { count: 50 });
      
      const formTypes = new Set(filings.map(f => f.form));
      
      // Apple should have multiple form types
      expect(formTypes.size).toBeGreaterThan(1);
      expect(Array.from(formTypes)).toContain('10-K');
    }, 30000);

    it('should provide consistent data across calls', async () => {
      const company1 = await secClient.getCompanyByTicker('AAPL');
      await new Promise(resolve => setTimeout(resolve, 1000));
      const company2 = await secClient.getCompanyByTicker('AAPL');
      
      expect(company1).toEqual(company2);
    }, 30000);
  });
});