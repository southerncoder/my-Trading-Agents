/**
 * Portfolio Risk Management Unit Tests
 * 
 * Comprehensive test suite for portfolio-level risk management functions including:
 * - Value at Risk (VaR) calculations using multiple methods
 * - Expected Shortfall (ES) and Conditional VaR
 * - Stress testing with historical scenarios
 * - Risk decomposition and attribution
 * - Risk budgeting and allocation constraints
 * - Dynamic risk limits based on market conditions
 * - Portfolio optimization with risk constraints
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { RiskManagementEngine } from '../../src/portfolio/risk-management.js';
import type {
  RiskMetrics,
  VaRCalculation,
  StressTestScenario,
  RiskBudget,
  RiskLimits
} from '../../src/portfolio/risk-management.js';

describe('Portfolio Risk Management Engine', () => {
  let engine: RiskManagementEngine;
  let mockRiskLimits: RiskLimits;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    mockRiskLimits = {
      max_portfolio_volatility: 0.20,
      max_value_at_risk: 0.05,
      max_drawdown_limit: 0.15,
      max_concentration_limit: 0.10,
      min_diversification_ratio: 0.60,
      stress_test_threshold: 0.10,
      dynamic_limits: true,
      market_regime_adjustments: {
        'high': {
          volatility_multiplier: 0.8,
          var_multiplier: 0.8,
          concentration_multiplier: 0.8
        },
        'normal': {
          volatility_multiplier: 1.0,
          var_multiplier: 1.0,
          concentration_multiplier: 1.0
        },
        'low': {
          volatility_multiplier: 1.2,
          var_multiplier: 1.2,
          concentration_multiplier: 1.2
        }
      }
    };

    engine = new RiskManagementEngine(mockRiskLimits, mockLogger);
  });

  /**
   * Helper function to generate mock historical returns
   */
  const generateMockReturns = (symbols: string[], periods: number = 252): Map<string, number[]> => {
    const returns = new Map<string, number[]>();
    
    symbols.forEach(symbol => {
      const symbolReturns: number[] = [];
      let volatility = 0.15; // Base volatility
      
      // Adjust volatility by symbol type
      if (symbol.includes('TECH')) volatility = 0.25;
      if (symbol.includes('UTIL')) volatility = 0.10;
      if (symbol.includes('CRYPTO')) volatility = 0.40;
      
      for (let i = 0; i < periods; i++) {
        // Generate returns with some autocorrelation
        const randomReturn = (Math.random() - 0.5) * volatility * 2;
        const trend = 0.0002; // Small positive trend
        symbolReturns.push(randomReturn + trend);
      }
      
      returns.set(symbol, symbolReturns);
    });
    
    return returns;
  };

  /**
   * Helper function to generate mock benchmark returns
   */
  const generateBenchmarkReturns = (periods: number = 252): number[] => {
    const returns: number[] = [];
    const volatility = 0.12; // Market volatility
    
    for (let i = 0; i < periods; i++) {
      const randomReturn = (Math.random() - 0.5) * volatility * 2;
      const trend = 0.0003; // Market trend
      returns.push(randomReturn + trend);
    }
    
    return returns;
  };

  describe('Risk Metrics Calculation', () => {
    test('should calculate comprehensive risk metrics correctly', async () => {
      const portfolioWeights = {
        'AAPL': 0.30,
        'MSFT': 0.25,
        'GOOGL': 0.20,
        'AMZN': 0.15,
        'TSLA': 0.10
      };
      
      const historicalReturns = generateMockReturns(Object.keys(portfolioWeights));
      const benchmarkReturns = generateBenchmarkReturns();

      const result = await engine.calculateRiskMetrics(
        portfolioWeights,
        historicalReturns,
        benchmarkReturns,
        0.02 // 2% risk-free rate
      );

      // Validate all required properties exist
      expect(result).toHaveProperty('value_at_risk');
      expect(result).toHaveProperty('expected_shortfall');
      expect(result).toHaveProperty('volatility');
      expect(result).toHaveProperty('sharpe_ratio');
      expect(result).toHaveProperty('sortino_ratio');
      expect(result).toHaveProperty('maximum_drawdown');
      expect(result).toHaveProperty('beta');
      expect(result).toHaveProperty('alpha');
      expect(result).toHaveProperty('tracking_error');
      expect(result).toHaveProperty('information_ratio');

      // Validate ranges and relationships
      expect(result.volatility).toBeGreaterThan(0);
      expect(result.volatility).toBeLessThan(1); // Should be reasonable
      expect(Math.abs(result.value_at_risk)).toBeGreaterThan(0);
      expect(Math.abs(result.expected_shortfall)).toBeGreaterThanOrEqual(Math.abs(result.value_at_risk));
      expect(result.maximum_drawdown).toBeGreaterThanOrEqual(0);
      expect(result.maximum_drawdown).toBeLessThan(1);
      expect(result.beta).toBeGreaterThan(0); // Should be positive for equity portfolio
      expect(result.tracking_error).toBeGreaterThanOrEqual(0);
    });

    test('should handle portfolio with single asset', async () => {
      const portfolioWeights = { 'AAPL': 1.0 };
      const historicalReturns = generateMockReturns(['AAPL']);

      const result = await engine.calculateRiskMetrics(
        portfolioWeights,
        historicalReturns
      );

      expect(result.volatility).toBeGreaterThan(0);
      expect(result.sharpe_ratio).toBeDefined();
      expect(result.maximum_drawdown).toBeGreaterThanOrEqual(0);
    });

    test('should calculate risk metrics without benchmark', async () => {
      const portfolioWeights = {
        'STOCK1': 0.50,
        'STOCK2': 0.30,
        'STOCK3': 0.20
      };
      
      const historicalReturns = generateMockReturns(Object.keys(portfolioWeights));

      const result = await engine.calculateRiskMetrics(
        portfolioWeights,
        historicalReturns
      );

      // Without benchmark, beta should default to 1, alpha to 0
      expect(result.beta).toBe(1);
      expect(result.alpha).toBe(0);
      expect(result.tracking_error).toBe(0);
      expect(result.information_ratio).toBe(0);
      
      // Other metrics should still be calculated
      expect(result.volatility).toBeGreaterThan(0);
      expect(result.sharpe_ratio).toBeDefined();
    });
  });

  describe('Value at Risk Calculations', () => {
    test('should calculate historical VaR correctly', async () => {
      const portfolioReturns = Array.from({ length: 1000 }, () => 
        (Math.random() - 0.5) * 0.04 // ±2% daily returns
      );

      const result = await engine.calculateVaR(portfolioReturns, {
        method: 'historical',
        confidence_level: 0.95,
        time_horizon: 1
      });

      expect(result.method).toBe('historical');
      expect(result.confidence_level).toBe(0.95);
      expect(result.time_horizon).toBe(1);
      expect(result.value_at_risk).toBeGreaterThan(0);
      expect(result.expected_shortfall).toBeGreaterThan(0);
      expect(result.expected_shortfall).toBeGreaterThanOrEqual(result.value_at_risk);
      expect(result.calculation_timestamp).toBeDefined();
      expect(result.assumptions).toHaveProperty('historical_window');
    });

    test('should calculate parametric VaR correctly', async () => {
      const portfolioReturns = Array.from({ length: 500 }, () => 
        (Math.random() - 0.5) * 0.03
      );

      const result = await engine.calculateVaR(portfolioReturns, {
        method: 'parametric',
        confidence_level: 0.99,
        time_horizon: 1
      });

      expect(result.method).toBe('parametric');
      expect(result.confidence_level).toBe(0.99);
      expect(result.value_at_risk).toBeGreaterThan(0);
      expect(result.expected_shortfall).toBeGreaterThan(0);
      expect(result.assumptions).toHaveProperty('distribution');
      expect(result.assumptions).toHaveProperty('mean');
      expect(result.assumptions).toHaveProperty('std');
    });

    test('should calculate Monte Carlo VaR correctly', async () => {
      const portfolioReturns = Array.from({ length: 300 }, () => 
        (Math.random() - 0.5) * 0.025
      );

      const result = await engine.calculateVaR(portfolioReturns, {
        method: 'monte_carlo',
        confidence_level: 0.95,
        time_horizon: 5
      });

      expect(result.method).toBe('monte_carlo');
      expect(result.time_horizon).toBe(5);
      expect(result.value_at_risk).toBeGreaterThan(0);
      expect(result.expected_shortfall).toBeGreaterThan(0);
      expect(result.assumptions).toHaveProperty('simulations');
    });

    test('should scale VaR for different time horizons', async () => {
      const portfolioReturns = Array.from({ length: 252 }, () => 
        (Math.random() - 0.5) * 0.02
      );

      const var1Day = await engine.calculateVaR(portfolioReturns, {
        method: 'historical',
        confidence_level: 0.95,
        time_horizon: 1
      });

      const var10Day = await engine.calculateVaR(portfolioReturns, {
        method: 'historical',
        confidence_level: 0.95,
        time_horizon: 10
      });

      // 10-day VaR should be approximately sqrt(10) times 1-day VaR
      const expectedRatio = Math.sqrt(10);
      const actualRatio = var10Day.value_at_risk / var1Day.value_at_risk;
      
      expect(actualRatio).toBeGreaterThan(expectedRatio * 0.8);
      expect(actualRatio).toBeLessThan(expectedRatio * 1.2);
    });

    test('should handle empty returns array', async () => {
      const result = await engine.calculateVaR([], {
        method: 'historical',
        confidence_level: 0.95,
        time_horizon: 1
      });

      expect(result.value_at_risk).toBe(0);
      expect(result.expected_shortfall).toBe(0);
    });
  });

  describe('Stress Testing', () => {
    test('should perform comprehensive stress testing', async () => {
      const portfolioWeights = {
        'TECH1': 0.40,
        'FINANCE1': 0.30,
        'ENERGY1': 0.20,
        'UTIL1': 0.10
      };
      
      const historicalReturns = generateMockReturns(Object.keys(portfolioWeights));

      const scenarios: StressTestScenario[] = [
        {
          name: 'Market Crash 2008',
          description: 'Severe market downturn similar to 2008 financial crisis',
          shock_type: 'market_crash',
          shock_parameters: { market_drop: -0.30 },
          probability: 0.02,
          impact: {
            portfolio_return: -0.25,
            portfolio_volatility: 0.40,
            value_at_risk: -0.15,
            drawdown: 0.30
          },
          recovery_time: 365
        },
        {
          name: 'Volatility Spike',
          description: 'Sudden increase in market volatility',
          shock_type: 'volatility_spike',
          shock_parameters: { vol_multiplier: 2.0 },
          probability: 0.10,
          impact: {
            portfolio_return: -0.05,
            portfolio_volatility: 0.30,
            value_at_risk: -0.08,
            drawdown: 0.10
          },
          recovery_time: 30
        }
      ];

      const result = await engine.performStressTest(
        portfolioWeights,
        scenarios,
        historicalReturns
      );

      expect(result).toHaveProperty('scenario_results');
      expect(result).toHaveProperty('overall_risk_assessment');
      
      expect(result.scenario_results.length).toBe(scenarios.length);
      
      result.scenario_results.forEach(scenarioResult => {
        expect(scenarioResult).toHaveProperty('scenario');
        expect(scenarioResult).toHaveProperty('portfolio_impact');
        expect(scenarioResult).toHaveProperty('risk_assessment');
        
        expect(['low', 'medium', 'high', 'critical']).toContain(scenarioResult.risk_assessment);
        
        expect(scenarioResult.portfolio_impact).toHaveProperty('return_impact');
        expect(scenarioResult.portfolio_impact).toHaveProperty('volatility_impact');
        expect(scenarioResult.portfolio_impact).toHaveProperty('var_impact');
        expect(scenarioResult.portfolio_impact).toHaveProperty('drawdown_impact');
      });

      expect(result.overall_risk_assessment).toHaveProperty('worst_case_loss');
      expect(result.overall_risk_assessment).toHaveProperty('probability_weighted_loss');
      expect(result.overall_risk_assessment).toHaveProperty('stress_test_passed');
      expect(result.overall_risk_assessment).toHaveProperty('recommended_actions');
      
      expect(typeof result.overall_risk_assessment.stress_test_passed).toBe('boolean');
      expect(Array.isArray(result.overall_risk_assessment.recommended_actions)).toBe(true);
    });

    test('should classify risk levels correctly', async () => {
      const portfolioWeights = { 'TEST': 1.0 };
      const historicalReturns = generateMockReturns(['TEST']);

      const severeScenario: StressTestScenario = {
        name: 'Severe Crisis',
        description: 'Extreme market stress',
        shock_type: 'market_crash',
        shock_parameters: {},
        probability: 0.01,
        impact: {
          portfolio_return: -0.20, // 20% loss should be critical
          portfolio_volatility: 0.50,
          value_at_risk: -0.25,
          drawdown: 0.40
        },
        recovery_time: 500
      };

      const result = await engine.performStressTest(
        portfolioWeights,
        [severeScenario],
        historicalReturns
      );

      expect(result.scenario_results[0].risk_assessment).toBe('critical');
    });
  });

  describe('Risk Budgeting', () => {
    test('should perform risk budgeting analysis', async () => {
      const portfolioWeights = {
        'ASSET1': 0.40,
        'ASSET2': 0.35,
        'ASSET3': 0.25
      };

      // Create a simple covariance matrix
      const covarianceMatrix = [
        [0.04, 0.02, 0.01],  // ASSET1 variances and covariances
        [0.02, 0.03, 0.015], // ASSET2 variances and covariances
        [0.01, 0.015, 0.025] // ASSET3 variances and covariances
      ];

      const totalRiskBudget = 0.15; // 15% risk budget

      const result = await engine.performRiskBudgeting(
        portfolioWeights,
        covarianceMatrix,
        totalRiskBudget
      );

      expect(result).toHaveProperty('total_risk_budget');
      expect(result).toHaveProperty('asset_risk_budgets');
      expect(result).toHaveProperty('risk_contributions');
      expect(result).toHaveProperty('risk_budget_utilization');
      expect(result).toHaveProperty('rebalancing_required');
      expect(result).toHaveProperty('risk_limit_breaches');

      expect(result.total_risk_budget).toBe(totalRiskBudget);
      expect(result.risk_budget_utilization).toBeGreaterThan(0);
      expect(typeof result.rebalancing_required).toBe('boolean');
      expect(Array.isArray(result.risk_limit_breaches)).toBe(true);

      // Check that asset risk budgets sum correctly
      const assetBudgetSum = Object.values(result.asset_risk_budgets)
        .reduce((sum, budget) => sum + budget, 0);
      expect(assetBudgetSum).toBeCloseTo(totalRiskBudget, 6);

      // Check that all assets have risk contributions
      Object.keys(portfolioWeights).forEach(asset => {
        expect(result.risk_contributions).toHaveProperty(asset);
        expect(result.risk_contributions[asset]).toBeGreaterThanOrEqual(0);
      });
    });

    test('should detect risk limit breaches', async () => {
      const portfolioWeights = {
        'HIGH_RISK_ASSET': 0.80, // Concentrated position
        'LOW_RISK_ASSET': 0.20
      };

      const covarianceMatrix = [
        [0.10, 0.02],  // High variance for first asset
        [0.02, 0.01]   // Low variance for second asset
      ];

      const totalRiskBudget = 0.05; // Low risk budget

      const result = await engine.performRiskBudgeting(
        portfolioWeights,
        covarianceMatrix,
        totalRiskBudget
      );

      // Should likely require rebalancing due to concentration
      expect(result.risk_budget_utilization).toBeGreaterThan(1); // Over budget
      expect(result.rebalancing_required).toBe(true);
    });
  });

  describe('Risk Limits Compliance', () => {
    test('should check risk limits compliance', () => {
      const riskMetrics: RiskMetrics = {
        value_at_risk: -0.03,
        expected_shortfall: -0.045,
        volatility: 0.18,
        sharpe_ratio: 1.2,
        sortino_ratio: 1.5,
        maximum_drawdown: 0.12,
        beta: 1.1,
        alpha: 0.02,
        tracking_error: 0.04,
        information_ratio: 0.5
      };

      const portfolioWeights = {
        'ASSET1': 0.30,
        'ASSET2': 0.25,
        'ASSET3': 0.20,
        'ASSET4': 0.15,
        'ASSET5': 0.10
      };

      const result = engine.checkRiskLimits(riskMetrics, portfolioWeights);

      expect(result).toHaveProperty('compliant');
      expect(result).toHaveProperty('breaches');
      expect(result).toHaveProperty('recommended_actions');

      expect(typeof result.compliant).toBe('boolean');
      expect(Array.isArray(result.breaches)).toBe(true);
      expect(Array.isArray(result.recommended_actions)).toBe(true);

      // Should be compliant with these reasonable metrics
      expect(result.compliant).toBe(true);
      expect(result.breaches.length).toBe(0);
    });

    test('should detect volatility limit breach', () => {
      const riskMetrics: RiskMetrics = {
        value_at_risk: -0.03,
        expected_shortfall: -0.045,
        volatility: 0.25, // Exceeds 20% limit
        sharpe_ratio: 1.0,
        sortino_ratio: 1.2,
        maximum_drawdown: 0.10,
        beta: 1.0,
        alpha: 0.01,
        tracking_error: 0.03,
        information_ratio: 0.3
      };

      const portfolioWeights = { 'ASSET1': 1.0 };

      const result = engine.checkRiskLimits(riskMetrics, portfolioWeights);

      expect(result.compliant).toBe(false);
      expect(result.breaches.length).toBeGreaterThan(0);
      
      const volatilityBreach = result.breaches.find(b => b.limit_type === 'portfolio_volatility');
      expect(volatilityBreach).toBeDefined();
      expect(volatilityBreach!.current_value).toBe(0.25);
      expect(volatilityBreach!.limit_value).toBe(0.20);
    });

    test('should detect concentration limit breach', () => {
      const riskMetrics: RiskMetrics = {
        value_at_risk: -0.02,
        expected_shortfall: -0.03,
        volatility: 0.15,
        sharpe_ratio: 1.5,
        sortino_ratio: 1.8,
        maximum_drawdown: 0.08,
        beta: 0.9,
        alpha: 0.02,
        tracking_error: 0.02,
        information_ratio: 1.0
      };

      const portfolioWeights = {
        'CONCENTRATED_ASSET': 0.85, // Exceeds 10% concentration limit
        'OTHER_ASSET': 0.15
      };

      const result = engine.checkRiskLimits(riskMetrics, portfolioWeights);

      expect(result.compliant).toBe(false);
      
      const concentrationBreach = result.breaches.find(b => b.limit_type === 'concentration_limit');
      expect(concentrationBreach).toBeDefined();
      expect(concentrationBreach!.current_value).toBe(0.85);
      expect(concentrationBreach!.limit_value).toBe(0.10);
    });

    test('should generate appropriate recommendations', () => {
      const riskMetrics: RiskMetrics = {
        value_at_risk: -0.08, // Exceeds 5% VaR limit
        expected_shortfall: -0.12,
        volatility: 0.30, // Exceeds 20% volatility limit
        sharpe_ratio: 0.5,
        sortino_ratio: 0.6,
        maximum_drawdown: 0.20, // Exceeds 15% drawdown limit
        beta: 1.2,
        alpha: -0.01,
        tracking_error: 0.06,
        information_ratio: -0.2
      };

      const portfolioWeights = { 'RISKY_ASSET': 1.0 };

      const result = engine.checkRiskLimits(riskMetrics, portfolioWeights);

      expect(result.compliant).toBe(false);
      expect(result.breaches.length).toBeGreaterThan(0);
      expect(result.recommended_actions.length).toBeGreaterThan(0);

      // Should have multiple breaches
      expect(result.breaches.some(b => b.limit_type === 'portfolio_volatility')).toBe(true);
      expect(result.breaches.some(b => b.limit_type === 'value_at_risk')).toBe(true);
      expect(result.breaches.some(b => b.limit_type === 'maximum_drawdown')).toBe(true);
    });
  });

  describe('Dynamic Risk Limits', () => {
    test('should update risk limits based on market conditions', () => {
      const originalVolatilityLimit = engine['riskLimits'].max_portfolio_volatility;
      const originalVaRLimit = engine['riskLimits'].max_value_at_risk;

      engine.updateRiskLimits({
        volatility_regime: 'high',
        market_stress: 'high'
      });

      const newVolatilityLimit = engine['riskLimits'].max_portfolio_volatility;
      const newVaRLimit = engine['riskLimits'].max_value_at_risk;

      // Limits should be tightened in high stress conditions
      expect(newVolatilityLimit).toBeLessThan(originalVolatilityLimit);
      expect(newVaRLimit).toBeLessThan(originalVaRLimit);
    });

    test('should relax limits in low volatility regime', () => {
      const originalVolatilityLimit = mockRiskLimits.max_portfolio_volatility;
      
      engine.updateRiskLimits({
        volatility_regime: 'low',
        market_stress: 'low'
      });

      const newVolatilityLimit = engine['riskLimits'].max_portfolio_volatility;

      // Limits should be relaxed in low stress conditions
      expect(newVolatilityLimit).toBeGreaterThan(originalVolatilityLimit);
    });

    test('should not update limits when dynamic limits are disabled', () => {
      const staticLimits = { ...mockRiskLimits, dynamic_limits: false };
      const staticEngine = new RiskManagementEngine(staticLimits, mockLogger);
      
      const originalVolatilityLimit = staticEngine['riskLimits'].max_portfolio_volatility;

      staticEngine.updateRiskLimits({
        volatility_regime: 'high',
        market_stress: 'high'
      });

      const newVolatilityLimit = staticEngine['riskLimits'].max_portfolio_volatility;

      // Limits should remain unchanged
      expect(newVolatilityLimit).toBe(originalVolatilityLimit);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle empty portfolio weights', async () => {
      const emptyWeights = {};
      const emptyReturns = new Map<string, number[]>();

      const result = await engine.calculateRiskMetrics(emptyWeights, emptyReturns);

      // Should return reasonable defaults
      expect(result.volatility).toBe(0);
      expect(result.sharpe_ratio).toBe(0);
      expect(result.maximum_drawdown).toBe(0);
    });

    test('should handle mismatched returns data', async () => {
      const portfolioWeights = { 'ASSET1': 0.5, 'ASSET2': 0.5 };
      const mismatchedReturns = new Map([
        ['ASSET1', [0.01, 0.02, 0.03]],
        ['ASSET2', [0.01, 0.02]] // Different length
      ]);

      const result = await engine.calculateRiskMetrics(portfolioWeights, mismatchedReturns);

      // Should handle gracefully
      expect(result).toBeDefined();
      expect(result.volatility).toBeGreaterThanOrEqual(0);
    });

    test('should handle extreme return values', async () => {
      const portfolioWeights = { 'EXTREME_ASSET': 1.0 };
      const extremeReturns = new Map([
        ['EXTREME_ASSET', [-0.5, 0.8, -0.3, 0.6, -0.4]] // Extreme returns
      ]);

      const result = await engine.calculateRiskMetrics(portfolioWeights, extremeReturns);

      expect(result).toBeDefined();
      expect(result.volatility).toBeGreaterThan(0);
      expect(result.maximum_drawdown).toBeGreaterThan(0);
      expect(result.maximum_drawdown).toBeLessThan(1);
    });

    test('should handle zero variance assets', async () => {
      const portfolioWeights = { 'ZERO_VAR_ASSET': 1.0 };
      const zeroVarReturns = new Map([
        ['ZERO_VAR_ASSET', [0.01, 0.01, 0.01, 0.01, 0.01]] // No variance
      ]);

      const result = await engine.calculateRiskMetrics(portfolioWeights, zeroVarReturns);

      expect(result.volatility).toBe(0);
      expect(result.maximum_drawdown).toBe(0);
      // Sharpe ratio should handle division by zero
      expect(isNaN(result.sharpe_ratio) || result.sharpe_ratio === 0).toBe(true);
    });
  });

  describe('Performance Validation', () => {
    test('should complete risk calculations within reasonable time', async () => {
      const largePortfolio = Object.fromEntries(
        Array.from({ length: 50 }, (_, i) => [`ASSET_${i}`, 1/50])
      );
      
      const largeReturns = generateMockReturns(Object.keys(largePortfolio), 1000);

      const startTime = performance.now();
      
      const result = await engine.calculateRiskMetrics(largePortfolio, largeReturns);
      
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result).toBeDefined();
      expect(result.volatility).toBeGreaterThan(0);
    });

    test('should handle concurrent risk calculations', async () => {
      const portfolios = Array.from({ length: 5 }, (_, i) => ({
        [`ASSET_${i}_1`]: 0.6,
        [`ASSET_${i}_2`]: 0.4
      }));

      const promises = portfolios.map((weights, i) => {
        const returns = generateMockReturns(Object.keys(weights));
        return engine.calculateRiskMetrics(weights, returns);
      });

      const results = await Promise.all(promises);

      expect(results.length).toBe(portfolios.length);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.volatility).toBeGreaterThan(0);
      });
    });
  });
});