/**
 * Unit Tests for Position Sizing Utilities
 * 
 * Tests position sizing algorithms and portfolio constraints
 * Requirements: 7.1
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  calculateKellySize,
  calculateRiskParitySize,
  calculateVolatilityAdjustedSize,
  enforceRiskLimits,
  calculateCorrelationAdjustment,
  PositionSizer
} from '../../../src/utils/position-sizing-utils';
import {
  TradingSignal,
  SignalType,
  SignalStrength
} from '../../../src/strategies/base-strategy';

jest.mock('../../../src/utils/enhanced-logger');

// Test data interfaces
interface Portfolio {
  positions: Position[];
  totalValue: number;
  cash: number;
  riskMetrics?: {
    totalRisk: number;
    concentrationRisk: number;
    correlationRisk: number;
  };
}

interface Position {
  symbol: string;
  quantity: number;
  price: number;
  value: number;
  weight: number;
  volatility?: number;
  beta?: number;
}

interface PositionSize {
  shares: number;
  dollarAmount: number;
  portfolioPercentage: number;
  riskAdjustment: number;
  reasoning: string;
  kellyFraction?: number;
  volatilityAdjustment?: number;
  correlationAdjustment?: number;
}

describe('Position Sizing Utilities', () => {
  let positionSizer: PositionSizer;

  const createTestSignal = (type: SignalType, strength: number, confidence: number): TradingSignal => ({
    type,
    strength,
    confidence,
    timestamp: new Date(),
    symbol: 'AAPL',
    price: 150,
    reasoning: 'Test signal',
    metadata: {}
  });

  const createTestPortfolio = (totalValue: number = 100000): Portfolio => ({
    positions: [
      {
        symbol: 'AAPL',
        quantity: 100,
        price: 150,
        value: 15000,
        weight: 0.15,
        volatility: 0.25,
        beta: 1.2
      },
      {
        symbol: 'GOOGL',
        quantity: 20,
        price: 2500,
        value: 50000,
        weight: 0.50,
        volatility: 0.30,
        beta: 1.1
      },
      {
        symbol: 'MSFT',
        quantity: 100,
        price: 300,
        value: 30000,
        weight: 0.30,
        volatility: 0.22,
        beta: 0.9
      }
    ],
    totalValue,
    cash: totalValue * 0.05,
    riskMetrics: {
      totalRisk: 0.18,
      concentrationRisk: 0.12,
      correlationRisk: 0.08
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    positionSizer = new PositionSizer();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('calculateKellySize', () => {
    test('should calculate Kelly Criterion position size', async () => {
      const signal = createTestSignal(SignalType.BUY, 0.8, 0.9);
      const portfolio = createTestPortfolio();

      const positionSize = await calculateKellySize(signal, portfolio);

      expect(positionSize).toBeDefined();
      expect(positionSize.shares).toBeGreaterThan(0);
      expect(positionSize.dollarAmount).toBeGreaterThan(0);
      expect(positionSize.portfolioPercentage).toBeGreaterThan(0);
      expect(positionSize.portfolioPercentage).toBeLessThanOrEqual(0.25); // Max 25% position
      expect(positionSize.kellyFraction).toBeDefined();
      expect(positionSize.reasoning).toContain('Kelly Criterion');
    });

    test('should limit position size for high Kelly fractions', async () => {
      const strongSignal = createTestSignal(SignalType.BUY, 0.95, 0.95);
      const portfolio = createTestPortfolio();

      const positionSize = await calculateKellySize(strongSignal, portfolio);

      expect(positionSize.portfolioPercentage).toBeLessThanOrEqual(0.25); // Should be capped
      expect(positionSize.reasoning).toContain('capped');
    });

    test('should handle negative Kelly fractions', async () => {
      const weakSignal = createTestSignal(SignalType.BUY, 0.3, 0.4);
      const portfolio = createTestPortfolio();

      const positionSize = await calculateKellySize(weakSignal, portfolio);

      expect(positionSize.shares).toBe(0);
      expect(positionSize.dollarAmount).toBe(0);
      expect(positionSize.reasoning).toContain('negative Kelly fraction');
    });

    test('should adjust for signal confidence', async () => {
      const highConfidenceSignal = createTestSignal(SignalType.BUY, 0.7, 0.9);
      const lowConfidenceSignal = createTestSignal(SignalType.BUY, 0.7, 0.5);
      const portfolio = createTestPortfolio();

      const highConfidenceSize = await calculateKellySize(highConfidenceSignal, portfolio);
      const lowConfidenceSize = await calculateKellySize(lowConfidenceSignal, portfolio);

      expect(highConfidenceSize.dollarAmount).toBeGreaterThan(lowConfidenceSize.dollarAmount);
    });

    test('should handle sell signals', async () => {
      const sellSignal = createTestSignal(SignalType.SELL, 0.8, 0.8);
      const portfolio = createTestPortfolio();

      const positionSize = await calculateKellySize(sellSignal, portfolio);

      expect(positionSize.shares).toBeLessThan(0); // Negative for sell
      expect(positionSize.reasoning).toContain('sell');
    });
  });

  describe('calculateRiskParitySize', () => {
    test('should calculate risk parity position size', async () => {
      const portfolio = createTestPortfolio();
      const newPosition: Position = {
        symbol: 'TSLA',
        quantity: 0,
        price: 800,
        value: 0,
        weight: 0,
        volatility: 0.45,
        beta: 1.8
      };

      const positionSize = await calculateRiskParitySize(portfolio, newPosition);

      expect(positionSize).toBeDefined();
      expect(positionSize.shares).toBeGreaterThan(0);
      expect(positionSize.reasoning).toContain('risk parity');
    });

    test('should allocate less to high volatility assets', async () => {
      const portfolio = createTestPortfolio();
      const lowVolPosition: Position = {
        symbol: 'KO',
        quantity: 0,
        price: 60,
        value: 0,
        weight: 0,
        volatility: 0.15,
        beta: 0.6
      };
      const highVolPosition: Position = {
        symbol: 'TSLA',
        quantity: 0,
        price: 800,
        value: 0,
        weight: 0,
        volatility: 0.50,
        beta: 2.0
      };

      const lowVolSize = await calculateRiskParitySize(portfolio, lowVolPosition);
      const highVolSize = await calculateRiskParitySize(portfolio, highVolPosition);

      expect(lowVolSize.portfolioPercentage).toBeGreaterThan(highVolSize.portfolioPercentage);
    });

    test('should maintain portfolio risk balance', async () => {
      const portfolio = createTestPortfolio();
      const newPosition: Position = {
        symbol: 'NVDA',
        quantity: 0,
        price: 400,
        value: 0,
        weight: 0,
        volatility: 0.35,
        beta: 1.5
      };

      const positionSize = await calculateRiskParitySize(portfolio, newPosition);

      // Risk contribution should be balanced
      const riskContribution = positionSize.portfolioPercentage * newPosition.volatility;
      expect(riskContribution).toBeLessThan(0.10); // Reasonable risk contribution
    });

    test('should handle portfolio with existing high concentration', async () => {
      const concentratedPortfolio: Portfolio = {
        ...createTestPortfolio(),
        positions: [
          {
            symbol: 'AAPL',
            quantity: 500,
            price: 150,
            value: 75000,
            weight: 0.75, // Very concentrated
            volatility: 0.25,
            beta: 1.2
          }
        ]
      };

      const newPosition: Position = {
        symbol: 'MSFT',
        quantity: 0,
        price: 300,
        value: 0,
        weight: 0,
        volatility: 0.22,
        beta: 0.9
      };

      const positionSize = await calculateRiskParitySize(concentratedPortfolio, newPosition);

      expect(positionSize.portfolioPercentage).toBeGreaterThan(0.10); // Should help diversify
    });
  });

  describe('calculateVolatilityAdjustedSize', () => {
    test('should adjust position size based on volatility', async () => {
      const signal = createTestSignal(SignalType.BUY, 0.7, 0.8);
      const lowVolatility = 0.15;
      const highVolatility = 0.40;

      const lowVolSize = await calculateVolatilityAdjustedSize(signal, lowVolatility);
      const highVolSize = await calculateVolatilityAdjustedSize(signal, highVolatility);

      expect(lowVolSize.dollarAmount).toBeGreaterThan(highVolSize.dollarAmount);
      expect(lowVolSize.volatilityAdjustment).toBeLessThan(highVolSize.volatilityAdjustment);
    });

    test('should use target volatility for sizing', async () => {
      const signal = createTestSignal(SignalType.BUY, 0.8, 0.8);
      const volatility = 0.25;
      const targetVolatility = 0.15;

      const positionSize = await calculateVolatilityAdjustedSize(signal, volatility, targetVolatility);

      expect(positionSize.volatilityAdjustment).toBeDefined();
      expect(positionSize.reasoning).toContain('volatility adjusted');
    });

    test('should handle extreme volatility values', async () => {
      const signal = createTestSignal(SignalType.BUY, 0.7, 0.7);
      const extremeVolatility = 0.80; // Very high volatility

      const positionSize = await calculateVolatilityAdjustedSize(signal, extremeVolatility);

      expect(positionSize.dollarAmount).toBeGreaterThan(0);
      expect(positionSize.portfolioPercentage).toBeLessThan(0.05); // Should be very small
    });

    test('should handle zero volatility', async () => {
      const signal = createTestSignal(SignalType.BUY, 0.7, 0.7);
      const zeroVolatility = 0.001; // Near zero

      const positionSize = await calculateVolatilityAdjustedSize(signal, zeroVolatility);

      expect(positionSize.dollarAmount).toBeGreaterThan(0);
      expect(positionSize.volatilityAdjustment).toBeLessThan(1);
    });
  });

  describe('enforceRiskLimits', () => {
    test('should enforce maximum position size limits', async () => {
      const largePosition: Position = {
        symbol: 'AAPL',
        quantity: 1000,
        price: 150,
        value: 150000, // 150% of portfolio
        weight: 1.5,
        volatility: 0.25
      };
      const portfolio = createTestPortfolio();

      const adjustedPosition = await enforceRiskLimits(largePosition, portfolio);

      expect(adjustedPosition.weight).toBeLessThanOrEqual(0.25); // Max 25% position
      expect(adjustedPosition.value).toBeLessThanOrEqual(portfolio.totalValue * 0.25);
    });

    test('should enforce sector concentration limits', async () => {
      const portfolio = createTestPortfolio();
      // Add another tech stock to existing tech-heavy portfolio
      const techPosition: Position = {
        symbol: 'NVDA',
        quantity: 100,
        price: 400,
        value: 40000,
        weight: 0.40,
        volatility: 0.35
      };

      const adjustedPosition = await enforceRiskLimits(techPosition, portfolio);

      // Should be reduced due to sector concentration
      expect(adjustedPosition.weight).toBeLessThan(0.40);
    });

    test('should enforce total portfolio risk limits', async () => {
      const highRiskPortfolio: Portfolio = {
        ...createTestPortfolio(),
        riskMetrics: {
          totalRisk: 0.35, // Very high risk
          concentrationRisk: 0.20,
          correlationRisk: 0.15
        }
      };

      const newPosition: Position = {
        symbol: 'TSLA',
        quantity: 50,
        price: 800,
        value: 40000,
        weight: 0.40,
        volatility: 0.50 // High volatility
      };

      const adjustedPosition = await enforceRiskLimits(newPosition, highRiskPortfolio);

      expect(adjustedPosition.weight).toBeLessThan(0.40); // Should be reduced
    });

    test('should allow positions that improve diversification', async () => {
      const concentratedPortfolio: Portfolio = {
        positions: [
          {
            symbol: 'AAPL',
            quantity: 500,
            price: 150,
            value: 75000,
            weight: 0.75,
            volatility: 0.25,
            beta: 1.2
          }
        ],
        totalValue: 100000,
        cash: 25000
      };

      const diversifyingPosition: Position = {
        symbol: 'TLT', // Bonds - negative correlation
        quantity: 200,
        price: 100,
        value: 20000,
        weight: 0.20,
        volatility: 0.12,
        beta: -0.3
      };

      const adjustedPosition = await enforceRiskLimits(diversifyingPosition, concentratedPortfolio);

      expect(adjustedPosition.weight).toBeGreaterThanOrEqual(0.15); // Should allow diversification
    });
  });

  describe('calculateCorrelationAdjustment', () => {
    test('should reduce position size for highly correlated assets', async () => {
      const portfolio = createTestPortfolio();
      const correlatedPosition: Position = {
        symbol: 'MSFT', // Tech stock, correlated with existing AAPL
        quantity: 100,
        price: 300,
        value: 30000,
        weight: 0.30,
        volatility: 0.22
      };

      const adjustment = await calculateCorrelationAdjustment(correlatedPosition, portfolio);

      expect(adjustment).toBeLessThan(1); // Should reduce position
      expect(adjustment).toBeGreaterThan(0);
    });

    test('should increase position size for negatively correlated assets', async () => {
      const portfolio = createTestPortfolio();
      const negativelyCorrelatedPosition: Position = {
        symbol: 'GLD', // Gold, typically negative correlation with tech
        quantity: 100,
        price: 180,
        value: 18000,
        weight: 0.18,
        volatility: 0.18
      };

      const adjustment = await calculateCorrelationAdjustment(negativelyCorrelatedPosition, portfolio);

      expect(adjustment).toBeGreaterThanOrEqual(1); // Should maintain or increase position
    });

    test('should handle uncorrelated assets neutrally', async () => {
      const portfolio = createTestPortfolio();
      const uncorrelatedPosition: Position = {
        symbol: 'JNJ', // Healthcare, low correlation with tech
        quantity: 100,
        price: 160,
        value: 16000,
        weight: 0.16,
        volatility: 0.15
      };

      const adjustment = await calculateCorrelationAdjustment(uncorrelatedPosition, portfolio);

      expect(adjustment).toBeCloseTo(1, 1); // Should be close to neutral
    });

    test('should handle empty portfolio', async () => {
      const emptyPortfolio: Portfolio = {
        positions: [],
        totalValue: 100000,
        cash: 100000
      };

      const newPosition: Position = {
        symbol: 'AAPL',
        quantity: 100,
        price: 150,
        value: 15000,
        weight: 0.15,
        volatility: 0.25
      };

      const adjustment = await calculateCorrelationAdjustment(newPosition, emptyPortfolio);

      expect(adjustment).toBe(1); // No correlation adjustment for first position
    });
  });

  describe('PositionSizer class', () => {
    test('should integrate all sizing methods', async () => {
      const signal = createTestSignal(SignalType.BUY, 0.8, 0.8);
      const portfolio = createTestPortfolio();

      const kellySize = await positionSizer.calculateKellySize(signal, portfolio);
      const riskParitySize = await positionSizer.calculateRiskParitySize(portfolio, {
        symbol: signal.symbol,
        quantity: 0,
        price: signal.price,
        value: 0,
        weight: 0,
        volatility: 0.25
      });

      expect(kellySize).toBeDefined();
      expect(riskParitySize).toBeDefined();
      expect(kellySize.reasoning).toContain('Kelly');
      expect(riskParitySize.reasoning).toContain('risk parity');
    });

    test('should provide ensemble position sizing recommendation', async () => {
      const signal = createTestSignal(SignalType.BUY, 0.8, 0.8);
      const portfolio = createTestPortfolio();

      const recommendation = await positionSizer.getEnsembleRecommendation(signal, portfolio);

      expect(recommendation).toBeDefined();
      expect(recommendation.kellySize).toBeDefined();
      expect(recommendation.riskParitySize).toBeDefined();
      expect(recommendation.volatilityAdjustedSize).toBeDefined();
      expect(recommendation.finalRecommendation).toBeDefined();
      expect(recommendation.reasoning).toBeDefined();
    });

    test('should handle configuration parameters', () => {
      const config = {
        maxPositionSize: 0.20,
        maxSectorConcentration: 0.40,
        targetVolatility: 0.12,
        kellyFractionLimit: 0.25
      };

      const configuredSizer = new PositionSizer(config);

      expect(configuredSizer.getConfig().maxPositionSize).toBe(0.20);
      expect(configuredSizer.getConfig().targetVolatility).toBe(0.12);
    });
  });

  describe('error handling', () => {
    test('should handle invalid signal data', async () => {
      const invalidSignal = {
        ...createTestSignal(SignalType.BUY, 0.8, 0.8),
        strength: -0.5 // Invalid negative strength
      };
      const portfolio = createTestPortfolio();

      await expect(calculateKellySize(invalidSignal, portfolio))
        .rejects.toThrow('Invalid signal strength');
    });

    test('should handle empty portfolio', async () => {
      const signal = createTestSignal(SignalType.BUY, 0.8, 0.8);
      const emptyPortfolio: Portfolio = {
        positions: [],
        totalValue: 0,
        cash: 0
      };

      const positionSize = await calculateKellySize(signal, emptyPortfolio);

      expect(positionSize.shares).toBe(0);
      expect(positionSize.reasoning).toContain('insufficient capital');
    });

    test('should handle missing volatility data', async () => {
      const signal = createTestSignal(SignalType.BUY, 0.8, 0.8);

      const positionSize = await calculateVolatilityAdjustedSize(signal, undefined as any);

      expect(positionSize.volatilityAdjustment).toBe(1); // Default adjustment
      expect(positionSize.reasoning).toContain('default volatility');
    });

    test('should handle extreme portfolio values', async () => {
      const signal = createTestSignal(SignalType.BUY, 0.8, 0.8);
      const extremePortfolio: Portfolio = {
        positions: [],
        totalValue: Number.MAX_SAFE_INTEGER,
        cash: Number.MAX_SAFE_INTEGER
      };

      const positionSize = await calculateKellySize(signal, extremePortfolio);

      expect(positionSize).toBeDefined();
      expect(isFinite(positionSize.dollarAmount)).toBe(true);
    });
  });

  describe('performance optimization', () => {
    test('should handle large portfolios efficiently', async () => {
      const largePortfolio: Portfolio = {
        positions: Array.from({ length: 1000 }, (_, i) => ({
          symbol: `STOCK${i}`,
          quantity: 100,
          price: 50 + i,
          value: (50 + i) * 100,
          weight: 0.001,
          volatility: 0.15 + Math.random() * 0.20,
          beta: 0.5 + Math.random() * 1.5
        })),
        totalValue: 10000000,
        cash: 500000
      };

      const newPosition: Position = {
        symbol: 'NEWSTOCK',
        quantity: 0,
        price: 100,
        value: 0,
        weight: 0,
        volatility: 0.25
      };

      const startTime = Date.now();
      const adjustment = await calculateCorrelationAdjustment(newPosition, largePortfolio);
      const duration = Date.now() - startTime;

      expect(adjustment).toBeDefined();
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should cache correlation calculations', async () => {
      const portfolio = createTestPortfolio();
      const position: Position = {
        symbol: 'AAPL',
        quantity: 100,
        price: 150,
        value: 15000,
        weight: 0.15,
        volatility: 0.25
      };

      // First calculation
      const start1 = Date.now();
      await calculateCorrelationAdjustment(position, portfolio);
      const duration1 = Date.now() - start1;

      // Second calculation (should use cache)
      const start2 = Date.now();
      await calculateCorrelationAdjustment(position, portfolio);
      const duration2 = Date.now() - start2;

      expect(duration2).toBeLessThanOrEqual(duration1);
    });
  });
});