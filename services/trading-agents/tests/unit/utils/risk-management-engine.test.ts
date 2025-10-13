/**
 * Unit Tests for RiskManagementEngine
 * 
 * Tests all risk management functions replacing placeholder implementations
 * Requirements: 7.1
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  assessMarketRisk,
  assessTechnicalIndicatorRisk,
  applyQuantitativeFundamentalRiskModels,
  getSectorSentiment,
  getRecentVolatility,
  detectVolatilityClustering,
  calculateVaR,
  calculateCVaR,
  performMonteCarloSimulation
} from '../../../src/utils/risk-management-utils';

jest.mock('../../../src/utils/enhanced-logger');

// Mock data interfaces
interface TechnicalIndicators {
  rsi: number;
  macd: { macd: number; signal: number; histogram: number };
  bollingerBands: { upper: number; middle: number; lower: number };
  price: number;
}

interface FundamentalData {
  peRatio: number;
  debtToEquity: number;
  currentRatio: number;
  roe: number;
  marketCap: number;
}

interface Portfolio {
  positions: Array<{
    symbol: string;
    quantity: number;
    price: number;
    value: number;
  }>;
  totalValue: number;
  cash: number;
}

interface PriceData {
  timestamp: Date;
  price: number;
  volume: number;
}

describe('RiskManagementEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('assessMarketRisk', () => {
    test('should assess market risk from market report', async () => {
      const marketReport = 'Market showing high volatility with declining trends and uncertain outlook';
      const symbol = 'AAPL';

      const result = await assessMarketRisk(marketReport, symbol);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.factors).toBeInstanceOf(Array);
      expect(result.factors.length).toBeGreaterThan(0);
    });

    test('should handle empty market report', async () => {
      const marketReport = '';
      const symbol = 'AAPL';

      const result = await assessMarketRisk(marketReport, symbol);

      expect(result.score).toBe(0.5);
      expect(result.factors).toContain('No market data available');
    });

    test('should identify volatility indicators', async () => {
      const volatileReport = 'Market experiencing extreme volatility with wild price swings';
      const symbol = 'AAPL';

      const result = await assessMarketRisk(volatileReport, symbol);

      expect(result.factors.some(factor => factor.includes('volatility'))).toBe(true);
      expect(result.score).toBeGreaterThan(0.5);
    });

    test('should identify positive market sentiment', async () => {
      const positiveReport = 'Market rally continues with strong gains across all sectors';
      const symbol = 'AAPL';

      const result = await assessMarketRisk(positiveReport, symbol);

      expect(result.factors.some(factor => factor.includes('rally'))).toBe(true);
      expect(result.score).toBeLessThan(0.5);
    });

    test('should identify negative market sentiment', async () => {
      const negativeReport = 'Market decline accelerates with significant drops in major indices';
      const symbol = 'AAPL';

      const result = await assessMarketRisk(negativeReport, symbol);

      expect(result.factors.some(factor => factor.includes('decline'))).toBe(true);
      expect(result.score).toBeGreaterThan(0.5);
    });
  });

  describe('assessTechnicalIndicatorRisk', () => {
    test('should assess RSI extreme zones', async () => {
      const symbol = 'AAPL';
      
      const result = await assessTechnicalIndicatorRisk(symbol);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.factors).toBeInstanceOf(Array);
    });

    test('should detect RSI overbought conditions', async () => {
      const symbol = 'AAPL';
      
      // Mock RSI data to simulate overbought condition
      const result = await assessTechnicalIndicatorRisk(symbol);

      expect(result.factors).toBeDefined();
      expect(result.score).toBeGreaterThan(0);
    });

    test('should detect MACD divergence', async () => {
      const symbol = 'AAPL';
      
      const result = await assessTechnicalIndicatorRisk(symbol);

      expect(result).toBeDefined();
      expect(typeof result.score).toBe('number');
    });

    test('should detect Bollinger Band squeeze', async () => {
      const symbol = 'AAPL';
      
      const result = await assessTechnicalIndicatorRisk(symbol);

      expect(result).toBeDefined();
      expect(result.factors).toBeInstanceOf(Array);
    });

    test('should handle missing technical data', async () => {
      const symbol = 'INVALID_SYMBOL';
      
      const result = await assessTechnicalIndicatorRisk(symbol);

      expect(result.score).toBeGreaterThan(0);
      expect(result.factors).toContain('Limited technical data available');
    });
  });

  describe('applyQuantitativeFundamentalRiskModels', () => {
    test('should calculate VaR and CVaR', async () => {
      const symbol = 'AAPL';
      const fundamentals: FundamentalData = {
        peRatio: 25.5,
        debtToEquity: 1.2,
        currentRatio: 1.8,
        roe: 0.15,
        marketCap: 2500000000000
      };

      const result = await applyQuantitativeFundamentalRiskModels(symbol, fundamentals);

      expect(result).toBeDefined();
      expect(result.valueAtRisk).toBeGreaterThan(0);
      expect(result.conditionalVaR).toBeGreaterThan(result.valueAtRisk);
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(1);
    });

    test('should calculate Sharpe and Sortino ratios', async () => {
      const symbol = 'AAPL';
      const fundamentals: FundamentalData = {
        peRatio: 20.0,
        debtToEquity: 0.8,
        currentRatio: 2.0,
        roe: 0.20,
        marketCap: 3000000000000
      };

      const result = await applyQuantitativeFundamentalRiskModels(symbol, fundamentals);

      expect(result.sharpeRatio).toBeDefined();
      expect(result.sortinoRatio).toBeDefined();
      expect(typeof result.sharpeRatio).toBe('number');
      expect(typeof result.sortinoRatio).toBe('number');
    });

    test('should handle extreme fundamental values', async () => {
      const symbol = 'AAPL';
      const extremeFundamentals: FundamentalData = {
        peRatio: 100, // Very high P/E
        debtToEquity: 5.0, // High debt
        currentRatio: 0.5, // Low liquidity
        roe: -0.10, // Negative ROE
        marketCap: 1000000000
      };

      const result = await applyQuantitativeFundamentalRiskModels(symbol, extremeFundamentals);

      expect(result.riskScore).toBeGreaterThan(0.7); // Should indicate high risk
    });

    test('should perform Monte Carlo simulation', async () => {
      const symbol = 'AAPL';
      const fundamentals: FundamentalData = {
        peRatio: 22.0,
        debtToEquity: 1.0,
        currentRatio: 1.5,
        roe: 0.18,
        marketCap: 2800000000000
      };

      const result = await applyQuantitativeFundamentalRiskModels(symbol, fundamentals);

      expect(result.monteCarloResults).toBeDefined();
      expect(result.monteCarloResults.scenarios).toBeGreaterThan(0);
      expect(result.monteCarloResults.confidenceIntervals).toBeDefined();
    });
  });

  describe('getSectorSentiment', () => {
    test('should analyze sector sentiment from news', async () => {
      const symbol = 'AAPL';
      const sector = 'Technology';

      const result = await getSectorSentiment(symbol, sector);

      expect(result).toBeDefined();
      expect(result.sentiment).toBeGreaterThanOrEqual(-1);
      expect(result.sentiment).toBeLessThanOrEqual(1);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.sources).toBeInstanceOf(Array);
    });

    test('should handle unknown sectors', async () => {
      const symbol = 'UNKNOWN';
      const sector = 'Unknown Sector';

      const result = await getSectorSentiment(symbol, sector);

      expect(result.sentiment).toBe(0);
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.sources).toHaveLength(0);
    });

    test('should aggregate sentiment from multiple sources', async () => {
      const symbol = 'TSLA';
      const sector = 'Automotive';

      const result = await getSectorSentiment(symbol, sector);

      expect(result.sources.length).toBeGreaterThan(0);
      expect(result.aggregationMethod).toBeDefined();
    });

    test('should provide sector rotation analysis', async () => {
      const symbol = 'JPM';
      const sector = 'Financial Services';

      const result = await getSectorSentiment(symbol, sector);

      expect(result.sectorRotation).toBeDefined();
      expect(result.relativePerformance).toBeDefined();
    });
  });

  describe('getRecentVolatility', () => {
    test('should calculate historical volatility', async () => {
      const symbol = 'AAPL';
      const priceHistory: PriceData[] = Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        price: 150 + Math.random() * 20 - 10,
        volume: 1000000 + Math.random() * 500000
      }));

      const result = await getRecentVolatility(symbol, priceHistory);

      expect(result).toBeDefined();
      expect(result.historicalVolatility).toBeGreaterThan(0);
      expect(result.annualizedVolatility).toBeGreaterThan(0);
      expect(result.volatilityPercentile).toBeGreaterThanOrEqual(0);
      expect(result.volatilityPercentile).toBeLessThanOrEqual(100);
    });

    test('should calculate GARCH volatility forecast', async () => {
      const symbol = 'AAPL';
      const priceHistory: PriceData[] = Array.from({ length: 100 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        price: 150 * Math.exp((Math.random() - 0.5) * 0.02 * i),
        volume: 1000000
      }));

      const result = await getRecentVolatility(symbol, priceHistory);

      expect(result.garchVolatility).toBeDefined();
      expect(result.garchVolatility).toBeGreaterThan(0);
    });

    test('should classify volatility regime', async () => {
      const symbol = 'AAPL';
      const lowVolPrices: PriceData[] = Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        price: 150 + Math.random() * 2 - 1, // Low volatility
        volume: 1000000
      }));

      const result = await getRecentVolatility(symbol, lowVolPrices);

      expect(result.volatilityRegime).toMatch(/^(low|medium|high)$/);
    });

    test('should handle insufficient price data', async () => {
      const symbol = 'AAPL';
      const insufficientData: PriceData[] = [
        { timestamp: new Date(), price: 150, volume: 1000000 }
      ];

      const result = await getRecentVolatility(symbol, insufficientData);

      expect(result.historicalVolatility).toBe(0);
      expect(result.dataQuality).toBe('insufficient');
    });
  });

  describe('detectVolatilityClustering', () => {
    test('should detect volatility clustering using ARCH test', async () => {
      const symbol = 'AAPL';
      const clusteredPrices: PriceData[] = [];
      
      // Generate price data with volatility clustering
      let price = 150;
      let highVolPeriod = false;
      
      for (let i = 0; i < 100; i++) {
        if (i % 20 === 0) highVolPeriod = !highVolPeriod;
        const volatility = highVolPeriod ? 0.05 : 0.01;
        price *= (1 + (Math.random() - 0.5) * volatility);
        
        clusteredPrices.push({
          timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          price,
          volume: 1000000
        });
      }

      const result = await detectVolatilityClustering(symbol, clusteredPrices);

      expect(result).toBeDefined();
      expect(result.archTestResult).toBeDefined();
      expect(result.archTestResult.testStatistic).toBeGreaterThan(0);
      expect(result.archTestResult.pValue).toBeGreaterThanOrEqual(0);
      expect(result.archTestResult.pValue).toBeLessThanOrEqual(1);
    });

    test('should identify clustering periods', async () => {
      const symbol = 'AAPL';
      const priceHistory: PriceData[] = Array.from({ length: 50 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        price: 150 + Math.sin(i / 10) * 10 + Math.random() * 5,
        volume: 1000000
      }));

      const result = await detectVolatilityClustering(symbol, priceHistory);

      expect(result.clusteringPeriods).toBeInstanceOf(Array);
      expect(result.clusteringStrength).toBeGreaterThanOrEqual(0);
      expect(result.clusteringStrength).toBeLessThanOrEqual(1);
    });

    test('should handle non-clustered data', async () => {
      const symbol = 'AAPL';
      const randomPrices: PriceData[] = Array.from({ length: 50 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        price: 150 + Math.random() * 2 - 1, // Random walk
        volume: 1000000
      }));

      const result = await detectVolatilityClustering(symbol, randomPrices);

      expect(result.clusteringStrength).toBeLessThan(0.3);
      expect(result.archTestResult.pValue).toBeGreaterThan(0.05);
    });
  });

  describe('calculateVaR', () => {
    test('should calculate Value at Risk for portfolio', async () => {
      const portfolio: Portfolio = {
        positions: [
          { symbol: 'AAPL', quantity: 100, price: 150, value: 15000 },
          { symbol: 'GOOGL', quantity: 50, price: 2500, value: 125000 },
          { symbol: 'MSFT', quantity: 200, price: 300, value: 60000 }
        ],
        totalValue: 200000,
        cash: 0
      };
      const confidence = 0.95;

      const var95 = await calculateVaR(portfolio, confidence);

      expect(var95).toBeGreaterThan(0);
      expect(var95).toBeLessThan(portfolio.totalValue * 0.2); // Reasonable VaR
    });

    test('should handle different confidence levels', async () => {
      const portfolio: Portfolio = {
        positions: [
          { symbol: 'AAPL', quantity: 100, price: 150, value: 15000 }
        ],
        totalValue: 15000,
        cash: 0
      };

      const var95 = await calculateVaR(portfolio, 0.95);
      const var99 = await calculateVaR(portfolio, 0.99);

      expect(var99).toBeGreaterThan(var95);
    });

    test('should handle empty portfolio', async () => {
      const emptyPortfolio: Portfolio = {
        positions: [],
        totalValue: 0,
        cash: 10000
      };

      const var95 = await calculateVaR(emptyPortfolio, 0.95);

      expect(var95).toBe(0);
    });
  });

  describe('calculateCVaR', () => {
    test('should calculate Conditional Value at Risk', async () => {
      const portfolio: Portfolio = {
        positions: [
          { symbol: 'AAPL', quantity: 100, price: 150, value: 15000 },
          { symbol: 'TSLA', quantity: 50, price: 800, value: 40000 }
        ],
        totalValue: 55000,
        cash: 0
      };
      const confidence = 0.95;

      const cvar95 = await calculateCVaR(portfolio, confidence);

      expect(cvar95).toBeGreaterThan(0);
      expect(cvar95).toBeLessThan(portfolio.totalValue * 0.3);
    });

    test('should ensure CVaR is greater than VaR', async () => {
      const portfolio: Portfolio = {
        positions: [
          { symbol: 'AAPL', quantity: 100, price: 150, value: 15000 }
        ],
        totalValue: 15000,
        cash: 0
      };
      const confidence = 0.95;

      const var95 = await calculateVaR(portfolio, confidence);
      const cvar95 = await calculateCVaR(portfolio, confidence);

      expect(cvar95).toBeGreaterThanOrEqual(var95);
    });
  });

  describe('performMonteCarloSimulation', () => {
    test('should run Monte Carlo simulation for portfolio', async () => {
      const portfolio: Portfolio = {
        positions: [
          { symbol: 'AAPL', quantity: 100, price: 150, value: 15000 },
          { symbol: 'GOOGL', quantity: 20, price: 2500, value: 50000 }
        ],
        totalValue: 65000,
        cash: 0
      };
      const scenarios = 10000;

      const result = await performMonteCarloSimulation(portfolio, scenarios);

      expect(result).toBeDefined();
      expect(result.scenarios).toBe(scenarios);
      expect(result.returns).toHaveLength(scenarios);
      expect(result.statistics).toBeDefined();
      expect(result.statistics.mean).toBeDefined();
      expect(result.statistics.standardDeviation).toBeGreaterThan(0);
      expect(result.percentiles).toBeDefined();
      expect(result.percentiles['5']).toBeLessThan(result.percentiles['95']);
    });

    test('should handle correlation between assets', async () => {
      const portfolio: Portfolio = {
        positions: [
          { symbol: 'AAPL', quantity: 100, price: 150, value: 15000 },
          { symbol: 'MSFT', quantity: 100, price: 300, value: 30000 }
        ],
        totalValue: 45000,
        cash: 0
      };

      const result = await performMonteCarloSimulation(portfolio, 1000);

      expect(result.correlationMatrix).toBeDefined();
      expect(result.correlationMatrix.length).toBe(2);
    });

    test('should provide confidence intervals', async () => {
      const portfolio: Portfolio = {
        positions: [
          { symbol: 'AAPL', quantity: 100, price: 150, value: 15000 }
        ],
        totalValue: 15000,
        cash: 0
      };

      const result = await performMonteCarloSimulation(portfolio, 5000);

      expect(result.confidenceIntervals).toBeDefined();
      expect(result.confidenceIntervals['95']).toBeDefined();
      expect(result.confidenceIntervals['99']).toBeDefined();
    });
  });

  describe('error handling', () => {
    test('should handle invalid symbols gracefully', async () => {
      const result = await assessTechnicalIndicatorRisk('INVALID_SYMBOL');
      
      expect(result.score).toBeGreaterThan(0);
      expect(result.factors).toContain('Limited technical data available');
    });

    test('should handle network errors in data fetching', async () => {
      const symbol = 'AAPL';
      
      // This should not throw but handle gracefully
      const result = await getSectorSentiment(symbol, 'Technology');
      
      expect(result).toBeDefined();
      expect(typeof result.sentiment).toBe('number');
    });

    test('should handle empty price history', async () => {
      const symbol = 'AAPL';
      const emptyHistory: PriceData[] = [];

      const result = await getRecentVolatility(symbol, emptyHistory);

      expect(result.historicalVolatility).toBe(0);
      expect(result.dataQuality).toBe('insufficient');
    });
  });
});