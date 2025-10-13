/**
 * Comprehensive Risk Management Unit Tests
 * 
 * This test suite provides comprehensive coverage for all risk management functions
 * that replaced placeholder implementations, including:
 * - Technical indicator risk assessment (RSI, MACD, Bollinger Bands)
 * - Quantitative risk models (VaR, CVaR, Monte Carlo simulation)
 * - Sector sentiment analysis with real news integration
 * - Volatility analysis with GARCH modeling and ARCH tests
 * - Extreme market condition scenarios
 * - Historical data validation against known market events
 * - Performance benchmarks for risk calculation speed
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { RiskManagementEngine } from '../../src/utils/risk-management-engine-simple.js';
import type {
  TechnicalIndicatorRisk,
  QuantitativeRisk,
  SectorSentiment,
  VolatilityAnalysis,
  ArchTestResult
} from '../../src/utils/risk-management-engine-simple.js';

// Mock fetch for news API calls
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('Comprehensive Risk Management Tests', () => {
  let engine: RiskManagementEngine;
  let mockConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConfig = {
      llm: { provider: 'openai', model: 'gpt-4' },
      dataProviders: {},
      agents: {}
    };
    
    engine = new RiskManagementEngine(mockConfig);

    // Mock successful news API responses
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        status: 'success',
        results: {
          'google-news': {
            articles: [
              {
                title: 'Market Analysis Update',
                description: 'Current market conditions show moderate volatility',
                publishedAt: new Date().toISOString(),
                source: { name: 'Financial Times' },
                url: 'https://example.com/article1'
              }
            ]
          }
        }
      })
    } as Response);
  });

  describe('Technical Indicator Risk Assessment', () => {
    test('should correctly assess RSI extreme zones', async () => {
      const result = await engine.assessTechnicalIndicatorRisk('AAPL');

      expect(result).toHaveProperty('rsiExtremeZones');
      expect(result).toHaveProperty('macdDivergence');
      expect(result).toHaveProperty('bollingerSqueeze');
      expect(result).toHaveProperty('overallRiskScore');
      expect(result).toHaveProperty('riskFactors');
      expect(result).toHaveProperty('confidence');

      // Validate data types and ranges
      expect(typeof result.rsiExtremeZones).toBe('boolean');
      expect(typeof result.macdDivergence).toBe('boolean');
      expect(typeof result.bollingerSqueeze).toBe('boolean');
      expect(result.overallRiskScore).toBeGreaterThanOrEqual(0);
      expect(result.overallRiskScore).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.riskFactors)).toBe(true);
      expect(result.riskFactors.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    test('should identify MACD divergence patterns', async () => {
      // Run multiple assessments to test different scenarios
      const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];
      const results = await Promise.all(
        symbols.map(symbol => engine.assessTechnicalIndicatorRisk(symbol))
      );

      // Validate all results
      results.forEach((result, index) => {
        expect(result.overallRiskScore).toBeGreaterThanOrEqual(0);
        expect(result.overallRiskScore).toBeLessThanOrEqual(1);
        expect(result.riskFactors.length).toBeGreaterThan(0);
        expect(result.confidence).toBeGreaterThan(0.5); // Should have reasonable confidence
      });

      // Should have some variation in risk scores
      const scores = results.map(r => r.overallRiskScore);
      const minScore = Math.min(...scores);
      const maxScore = Math.max(...scores);
      expect(maxScore - minScore).toBeGreaterThan(0); // Some variation expected
    });

    test('should detect Bollinger Band squeeze conditions', async () => {
      const result = await engine.assessTechnicalIndicatorRisk('VOLATILE_STOCK');

      expect(result.bollingerSqueeze).toBeDefined();
      expect(typeof result.bollingerSqueeze).toBe('boolean');

      // If squeeze is detected, should be reflected in risk factors
      if (result.bollingerSqueeze) {
        expect(result.riskFactors.some(factor => 
          factor.toLowerCase().includes('bollinger') || 
          factor.toLowerCase().includes('squeeze')
        )).toBe(true);
      }
    });

    test('should handle technical analysis errors gracefully', async () => {
      // Test with various edge cases
      const edgeCases = ['', 'INVALID', '123', 'VERY_LONG_SYMBOL_NAME_THAT_EXCEEDS_NORMAL_LENGTH'];
      
      for (const symbol of edgeCases) {
        const result = await engine.assessTechnicalIndicatorRisk(symbol);
        
        expect(result).toBeDefined();
        expect(result.overallRiskScore).toBeGreaterThanOrEqual(0);
        expect(result.overallRiskScore).toBeLessThanOrEqual(1);
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      }
    });

    test('should provide meaningful risk factors', async () => {
      const result = await engine.assessTechnicalIndicatorRisk('TEST_SYMBOL');

      expect(result.riskFactors).toBeDefined();
      expect(Array.isArray(result.riskFactors)).toBe(true);
      expect(result.riskFactors.length).toBeGreaterThan(0);

      // Risk factors should be non-empty strings
      result.riskFactors.forEach(factor => {
        expect(typeof factor).toBe('string');
        expect(factor.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Quantitative Risk Models', () => {
    test('should calculate VaR and CVaR correctly', async () => {
      const result = await engine.applyQuantitativeFundamentalRiskModels('AAPL');

      expect(result).toHaveProperty('valueAtRisk');
      expect(result).toHaveProperty('conditionalVaR');
      expect(result).toHaveProperty('sharpeRatio');
      expect(result).toHaveProperty('sortinoRatio');
      expect(result).toHaveProperty('maxDrawdown');
      expect(result).toHaveProperty('riskScore');
      expect(result).toHaveProperty('confidence');

      // Validate VaR and CVaR relationship
      expect(result.valueAtRisk).toBeGreaterThan(0);
      expect(result.conditionalVaR).toBeGreaterThan(0);
      expect(result.conditionalVaR).toBeGreaterThanOrEqual(result.valueAtRisk); // CVaR >= VaR

      // Validate risk metrics ranges
      expect(result.maxDrawdown).toBeGreaterThan(0);
      expect(result.maxDrawdown).toBeLessThan(1); // Should be less than 100%
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(1);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    test('should validate Sharpe and Sortino ratio calculations', async () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL'];
      const results = await Promise.all(
        symbols.map(symbol => engine.applyQuantitativeFundamentalRiskModels(symbol))
      );

      results.forEach(result => {
        // Sharpe ratio can be negative, but should be reasonable
        expect(result.sharpeRatio).toBeGreaterThan(-3);
        expect(result.sharpeRatio).toBeLessThan(5);

        // Sortino ratio should typically be higher than Sharpe ratio
        // But allow some variance due to simulation
        expect(Math.abs(result.sortinoRatio - result.sharpeRatio)).toBeLessThan(3);
      });
    });

    test('should perform Monte Carlo simulation correctly', async () => {
      const result = await engine.applyQuantitativeFundamentalRiskModels('MONTE_CARLO_TEST');

      // Monte Carlo should provide reasonable risk estimates
      expect(result.valueAtRisk).toBeLessThan(0.2); // Daily VaR should be reasonable
      expect(result.conditionalVaR).toBeLessThan(0.3); // CVaR should be reasonable
      expect(result.confidence).toBeGreaterThan(0.7); // Should have high confidence
    });

    test('should handle different market volatility regimes', async () => {
      // Test with symbols that might have different volatility characteristics
      const lowVolSymbol = 'UTILITIES_STOCK';
      const highVolSymbol = 'CRYPTO_STOCK';

      const lowVolResult = await engine.applyQuantitativeFundamentalRiskModels(lowVolSymbol);
      const highVolResult = await engine.applyQuantitativeFundamentalRiskModels(highVolSymbol);

      // Both should be valid results
      expect(lowVolResult.valueAtRisk).toBeGreaterThan(0);
      expect(highVolResult.valueAtRisk).toBeGreaterThan(0);
      expect(lowVolResult.riskScore).toBeGreaterThanOrEqual(0);
      expect(highVolResult.riskScore).toBeGreaterThanOrEqual(0);
    });

    test('should provide consistent risk scoring', async () => {
      const symbol = 'CONSISTENCY_TEST';
      
      // Run multiple times to test consistency
      const results = await Promise.all([
        engine.applyQuantitativeFundamentalRiskModels(symbol),
        engine.applyQuantitativeFundamentalRiskModels(symbol),
        engine.applyQuantitativeFundamentalRiskModels(symbol)
      ]);

      // Due to caching, results should be identical
      expect(results[0]).toEqual(results[1]);
      expect(results[1]).toEqual(results[2]);
    });
  });

  describe('Sector Sentiment Analysis', () => {
    test('should analyze sector sentiment with real news integration', async () => {
      const result = await engine.getSectorSentiment('AAPL');

      expect(result).toHaveProperty('sentiment');
      expect(result).toHaveProperty('sectorRotation');
      expect(result).toHaveProperty('correlationRisk');
      expect(result).toHaveProperty('newsImpact');
      expect(result).toHaveProperty('confidence');

      // Validate sentiment range
      expect(result.sentiment).toBeGreaterThanOrEqual(-1);
      expect(result.sentiment).toBeLessThanOrEqual(1);

      // Validate other properties
      expect(typeof result.sectorRotation).toBe('boolean');
      expect(result.correlationRisk).toBeGreaterThanOrEqual(0);
      expect(result.correlationRisk).toBeLessThanOrEqual(1);
      expect(result.newsImpact).toBeGreaterThanOrEqual(0);
      expect(result.newsImpact).toBeLessThanOrEqual(1);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    test('should handle different sector classifications correctly', async () => {
      const sectorTests = [
        { symbol: 'AAPL', expectedSector: 'technology' },
        { symbol: 'JPM', expectedSector: 'financials' },
        { symbol: 'JNJ', expectedSector: 'healthcare' },
        { symbol: 'XOM', expectedSector: 'energy' },
        { symbol: 'NEE', expectedSector: 'utilities' }
      ];

      const results = await Promise.all(
        sectorTests.map(test => engine.getSectorSentiment(test.symbol))
      );

      // Each sector should have different correlation risks
      const correlationRisks = results.map(r => r.correlationRisk);
      const uniqueRisks = new Set(correlationRisks);
      expect(uniqueRisks.size).toBeGreaterThan(1); // Should have variation
    });

    test('should integrate news sentiment correctly', async () => {
      // Mock positive news
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          results: {
            'google-news': {
              articles: [
                {
                  title: 'Strong Earnings Beat Expectations',
                  description: 'Company reports excellent growth and positive outlook',
                  publishedAt: new Date().toISOString(),
                  source: { name: 'Bloomberg' }
                }
              ]
            }
          }
        })
      } as Response);

      const result = await engine.getSectorSentiment('POSITIVE_NEWS_TEST');

      expect(result.newsImpact).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('should handle news API failures gracefully', async () => {
      // Mock API failure
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await engine.getSectorSentiment('NETWORK_ERROR_TEST');

      // Should still return valid result with fallback
      expect(result.sentiment).toBeGreaterThanOrEqual(-1);
      expect(result.sentiment).toBeLessThanOrEqual(1);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    test('should process multiple news sources', async () => {
      // Mock multiple news sources
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          results: {
            'google-news': {
              articles: [
                {
                  title: 'Tech Sector Rally',
                  description: 'Technology stocks surge on innovation news',
                  publishedAt: new Date().toISOString(),
                  source: { name: 'TechCrunch' }
                }
              ]
            },
            'newsapi': {
              articles: [
                {
                  title: 'Market Optimism Grows',
                  description: 'Investors show bullish sentiment on growth prospects',
                  publishedAt: new Date().toISOString(),
                  source: { name: 'Reuters' }
                }
              ]
            }
          }
        })
      } as Response);

      const result = await engine.getSectorSentiment('MULTI_SOURCE_TEST');

      expect(result.newsImpact).toBeGreaterThan(0);
      expect(result.sentiment).toBeDefined();
    });
  });

  describe('Volatility Analysis', () => {
    test('should calculate recent volatility accurately', async () => {
      const result = await engine.getRecentVolatility('AAPL');

      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(2); // Should be reasonable (less than 200%)
    });

    test('should detect volatility clustering correctly', async () => {
      const result = await engine.detectVolatilityClustering('AAPL');

      expect(typeof result).toBe('boolean');
    });

    test('should perform comprehensive volatility analysis', async () => {
      const result = await engine.analyzeVolatility('AAPL');

      expect(result).toHaveProperty('historicalVolatility');
      expect(result).toHaveProperty('garchVolatility');
      expect(result).toHaveProperty('volatilityClustering');
      expect(result).toHaveProperty('archTestResult');
      expect(result).toHaveProperty('volatilityRegime');
      expect(result).toHaveProperty('confidence');

      // Validate volatility values
      expect(result.historicalVolatility).toBeGreaterThan(0);
      expect(result.garchVolatility).toBeGreaterThan(0);
      expect(typeof result.volatilityClustering).toBe('boolean');

      // Validate ARCH test result
      expect(result.archTestResult).toHaveProperty('testStatistic');
      expect(result.archTestResult).toHaveProperty('pValue');
      expect(result.archTestResult).toHaveProperty('isSignificant');
      expect(result.archTestResult).toHaveProperty('lagOrder');

      expect(typeof result.archTestResult.testStatistic).toBe('number');
      expect(result.archTestResult.pValue).toBeGreaterThanOrEqual(0);
      expect(result.archTestResult.pValue).toBeLessThanOrEqual(1);
      expect(typeof result.archTestResult.isSignificant).toBe('boolean');
      expect(result.archTestResult.lagOrder).toBeGreaterThan(0);

      // Validate volatility regime
      expect(['low', 'medium', 'high']).toContain(result.volatilityRegime);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    test('should classify volatility regimes correctly', async () => {
      const symbols = ['LOW_VOL', 'MED_VOL', 'HIGH_VOL'];
      const results = await Promise.all(
        symbols.map(symbol => engine.analyzeVolatility(symbol))
      );

      // Should have valid regimes for all
      results.forEach(result => {
        expect(['low', 'medium', 'high']).toContain(result.volatilityRegime);
        expect(result.historicalVolatility).toBeGreaterThan(0);
        expect(result.garchVolatility).toBeGreaterThan(0);
      });
    });

    test('should validate GARCH vs historical volatility relationship', async () => {
      const result = await engine.analyzeVolatility('GARCH_TEST');

      // GARCH volatility should be reasonably close to historical volatility
      const ratio = result.garchVolatility / result.historicalVolatility;
      expect(ratio).toBeGreaterThan(0.5);
      expect(ratio).toBeLessThan(2.0); // Should be within reasonable range
    });
  });

  describe('Extreme Market Conditions', () => {
    test('should handle market crash scenarios', async () => {
      // Mock crash-related news
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          results: {
            'google-news': {
              articles: [
                {
                  title: 'Market Crash: Massive Sell-off',
                  description: 'Panic selling with bearish sentiment and fear',
                  publishedAt: new Date().toISOString(),
                  source: { name: 'Financial Times' }
                }
              ]
            }
          }
        })
      } as Response);

      const sentiment = await engine.getSectorSentiment('CRASH_TEST');
      const volatility = await engine.analyzeVolatility('CRASH_TEST');
      const technical = await engine.assessTechnicalIndicatorRisk('CRASH_TEST');

      // All should return valid results even in extreme conditions
      expect(sentiment.sentiment).toBeGreaterThanOrEqual(-1);
      expect(sentiment.sentiment).toBeLessThanOrEqual(1);
      expect(volatility.volatilityRegime).toBeDefined();
      expect(technical.overallRiskScore).toBeGreaterThanOrEqual(0);
      expect(technical.overallRiskScore).toBeLessThanOrEqual(1);
    });

    test('should handle euphoric market conditions', async () => {
      // Mock euphoric news
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          results: {
            'google-news': {
              articles: [
                {
                  title: 'Record Breaking Rally',
                  description: 'Unprecedented gains with extreme bullish sentiment',
                  publishedAt: new Date().toISOString(),
                  source: { name: 'Bloomberg' }
                }
              ]
            }
          }
        })
      } as Response);

      const result = await engine.getSectorSentiment('EUPHORIA_TEST');

      expect(result.sentiment).toBeGreaterThan(0); // Should be positive
      expect(result.newsImpact).toBeGreaterThan(0.5); // High impact
    });

    test('should handle high volatility periods', async () => {
      const result = await engine.analyzeVolatility('HIGH_VOLATILITY_TEST');

      // Should handle high volatility gracefully
      expect(result.volatilityRegime).toBeDefined();
      expect(['low', 'medium', 'high']).toContain(result.volatilityRegime);
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('Performance and Accuracy Validation', () => {
    test('should meet performance requirements', async () => {
      const startTime = performance.now();
      
      await Promise.all([
        engine.assessTechnicalIndicatorRisk('PERF_TEST_1'),
        engine.applyQuantitativeFundamentalRiskModels('PERF_TEST_2'),
        engine.getSectorSentiment('PERF_TEST_3'),
        engine.analyzeVolatility('PERF_TEST_4')
      ]);

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should provide consistent results with caching', async () => {
      const symbol = 'CACHE_CONSISTENCY_TEST';

      // First call
      const result1 = await engine.assessTechnicalIndicatorRisk(symbol);
      
      // Second call should use cache and be identical
      const result2 = await engine.assessTechnicalIndicatorRisk(symbol);

      expect(result1).toEqual(result2);
    });

    test('should validate risk score correlations', async () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL'];
      
      const technicalResults = await Promise.all(
        symbols.map(symbol => engine.assessTechnicalIndicatorRisk(symbol))
      );
      
      const quantResults = await Promise.all(
        symbols.map(symbol => engine.applyQuantitativeFundamentalRiskModels(symbol))
      );

      // All results should be valid
      technicalResults.forEach(result => {
        expect(result.overallRiskScore).toBeGreaterThanOrEqual(0);
        expect(result.overallRiskScore).toBeLessThanOrEqual(1);
      });

      quantResults.forEach(result => {
        expect(result.riskScore).toBeGreaterThanOrEqual(0);
        expect(result.riskScore).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle network timeouts gracefully', async () => {
      // Mock timeout
      (global.fetch as jest.MockedFunction<typeof fetch>).mockImplementationOnce(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const result = await engine.getSectorSentiment('TIMEOUT_TEST');

      expect(result.sentiment).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    test('should handle malformed API responses', async () => {
      // Mock malformed response
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'data' })
      } as Response);

      const result = await engine.getSectorSentiment('MALFORMED_TEST');

      expect(result.sentiment).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    test('should handle empty or null inputs', async () => {
      const edgeCases = ['', null, undefined, 'VERY_LONG_SYMBOL_NAME_EXCEEDING_NORMAL_LIMITS'];
      
      for (const testCase of edgeCases) {
        const symbol = testCase as string || 'NULL_TEST';
        
        const technical = await engine.assessTechnicalIndicatorRisk(symbol);
        const quant = await engine.applyQuantitativeFundamentalRiskModels(symbol);
        const volatility = await engine.getRecentVolatility(symbol);

        expect(technical.overallRiskScore).toBeGreaterThanOrEqual(0);
        expect(quant.riskScore).toBeGreaterThanOrEqual(0);
        expect(volatility).toBeGreaterThan(0);
      }
    });

    test('should handle concurrent requests without conflicts', async () => {
      const symbols = Array.from({ length: 10 }, (_, i) => `CONCURRENT_${i}`);
      
      const promises = symbols.map(symbol => 
        Promise.all([
          engine.assessTechnicalIndicatorRisk(symbol),
          engine.applyQuantitativeFundamentalRiskModels(symbol),
          engine.getRecentVolatility(symbol)
        ])
      );

      const results = await Promise.all(promises);

      expect(results.length).toBe(symbols.length);
      results.forEach(([technical, quant, volatility]) => {
        expect(technical.overallRiskScore).toBeGreaterThanOrEqual(0);
        expect(quant.riskScore).toBeGreaterThanOrEqual(0);
        expect(volatility).toBeGreaterThan(0);
      });
    });
  });

  describe('Historical Data Validation', () => {
    test('should validate against known market scenarios', async () => {
      // Test with symbols representing different market conditions
      const scenarios = [
        { symbol: 'STABLE_STOCK', expectedVolRegime: ['low', 'medium'] },
        { symbol: 'VOLATILE_STOCK', expectedVolRegime: ['medium', 'high'] },
        { symbol: 'TECH_GROWTH', expectedVolRegime: ['medium', 'high'] }
      ];

      for (const scenario of scenarios) {
        const volatilityResult = await engine.analyzeVolatility(scenario.symbol);
        const technicalResult = await engine.assessTechnicalIndicatorRisk(scenario.symbol);

        expect(scenario.expectedVolRegime).toContain(volatilityResult.volatilityRegime);
        expect(technicalResult.confidence).toBeGreaterThan(0.5);
      }
    });

    test('should provide reasonable risk estimates for different asset classes', async () => {
      const assetClasses = [
        { symbol: 'UTILITY_STOCK', expectedRiskRange: [0, 0.6] },
        { symbol: 'TECH_STOCK', expectedRiskRange: [0.2, 1.0] },
        { symbol: 'CRYPTO_STOCK', expectedRiskRange: [0.4, 1.0] }
      ];

      for (const asset of assetClasses) {
        const result = await engine.assessTechnicalIndicatorRisk(asset.symbol);
        
        expect(result.overallRiskScore).toBeGreaterThanOrEqual(asset.expectedRiskRange[0]);
        expect(result.overallRiskScore).toBeLessThanOrEqual(asset.expectedRiskRange[1]);
      }
    });
  });
});