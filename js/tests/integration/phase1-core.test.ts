/**
 * Phase 1 Core Functionality Test
 *
 * Validates that Phase 1 components can be instantiated and basic methods work
 */

import { describe, it, expect } from '@jest/globals';
import { createLearningSystem } from '../../src/learning/learning-system';
import { createPerformanceAnalyticsEngine } from '../../src/learning/performance-analytics';
import { createAdaptiveLearningEngine } from '../../src/learning/adaptive-learning';
import { createModernPortfolioTheoryEngine } from '../../src/portfolio/modern-portfolio-theory';
import { createPortfolioOptimizationEngine } from '../../src/portfolio/portfolio-optimization';
import { createRiskManagementEngine } from '../../src/portfolio/risk-management';
import { createPortfolioOptimizationSuite } from '../../src/portfolio';

describe('Phase 1 Core Functionality', () => {
  describe('Learning System Components', () => {
    it('should create learning system successfully', () => {
      const learningSystem = createLearningSystem(console);
      expect(learningSystem).toBeDefined();
      expect(typeof learningSystem).toBe('object');
    });

    it('should access reinforcement learning engine', () => {
      const learningSystem = createLearningSystem(console);
      const rlEngine = learningSystem.reinforcementEngine;
      expect(rlEngine).toBeDefined();
      expect(typeof rlEngine.getLearningStats).toBe('function');
    });

    it('should access supervised learning engine', () => {
      const learningSystem = createLearningSystem(console);
      const slEngine = learningSystem.supervisedEngine;
      expect(slEngine).toBeDefined();
      expect(typeof slEngine.trainModel).toBe('function');
    });

    it('should access unsupervised learning engine', () => {
      const learningSystem = createLearningSystem(console);
      const ulEngine = learningSystem.unsupervisedEngine;
      expect(ulEngine).toBeDefined();
      expect(typeof ulEngine.performClustering).toBe('function');
    });

    it('should generate learning insights', async () => {
      const learningSystem = createLearningSystem(console);
      const insights = await learningSystem.generateInsights();
      expect(insights).toBeDefined();
      expect(Array.isArray(insights)).toBe(true);
      expect(insights.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Analytics', () => {
    it('should create performance analytics engine', () => {
      const performanceAnalytics = createPerformanceAnalyticsEngine(console);
      expect(performanceAnalytics).toBeDefined();
      expect(typeof performanceAnalytics).toBe('object');
    });
  });

  describe('Adaptive Learning', () => {
    it('should create adaptive learning engine', () => {
      const adaptiveLearning = createAdaptiveLearningEngine(console);
      expect(adaptiveLearning).toBeDefined();
      expect(typeof adaptiveLearning).toBe('object');
    });
  });

  describe('Modern Portfolio Theory', () => {
    it('should create MPT engine', () => {
      const mptEngine = createModernPortfolioTheoryEngine(console);
      expect(mptEngine).toBeDefined();
      expect(typeof mptEngine).toBe('object');
    });

    it('should calculate covariance matrix', async () => {
      const mptEngine = createModernPortfolioTheoryEngine(console);

      const assets = [
        { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', expected_return: 0.12, volatility: 0.25, current_price: 150.0 },
        { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', expected_return: 0.10, volatility: 0.22, current_price: 300.0 }
      ];

      const historicalReturns = new Map<string, number[]>([
        ['AAPL', [0.02, -0.01, 0.03, 0.01]],
        ['MSFT', [0.01, 0.02, 0.01, -0.01]]
      ]);

      const covarianceMatrix = await mptEngine.calculateCovarianceMatrix(assets, historicalReturns, 252);
      expect(covarianceMatrix).toBeDefined();
    });
  });

  describe('Portfolio Optimization', () => {
    it('should create portfolio optimization engine', () => {
      const config = {
        rebalancing_threshold: 0.05,
        min_rebalancing_interval: 30,
        max_portfolio_volatility: 0.25,
        min_portfolio_return: 0.08,
        risk_free_rate: 0.02,
        optimization_objective: 'sharpe' as const,
        learning_integration: true,
        adaptive_rebalancing: true
      };

      const portfolioEngine = createPortfolioOptimizationEngine(config, console);
      expect(portfolioEngine).toBeDefined();
      expect(typeof portfolioEngine).toBe('object');
    });
  });

  describe('Risk Management', () => {
    it('should create risk management engine', () => {
      const config = {
        max_portfolio_volatility: 0.25,
        max_value_at_risk: 0.15,
        max_drawdown_limit: 0.2,
        max_concentration_limit: 0.3,
        min_diversification_ratio: 0.1,
        stress_test_threshold: 0.2,
        dynamic_limits: true,
        market_regime_adjustments: {}
      };

      const riskEngine = createRiskManagementEngine(config, console);
      expect(riskEngine).toBeDefined();
      expect(typeof riskEngine).toBe('object');
    });
  });

  describe('Portfolio Optimization Suite', () => {
    it('should create portfolio optimization suite', () => {
      const mptEngine = createModernPortfolioTheoryEngine(console);

      const portfolioConfig = {
        rebalancing_threshold: 0.05,
        min_rebalancing_interval: 30,
        max_portfolio_volatility: 0.25,
        min_portfolio_return: 0.08,
        risk_free_rate: 0.02,
        optimization_objective: 'sharpe' as const,
        learning_integration: true,
        adaptive_rebalancing: true
      };
      const portfolioEngine = createPortfolioOptimizationEngine(portfolioConfig, console);

      const riskConfig = {
        max_portfolio_volatility: 0.25,
        max_value_at_risk: 0.15,
        max_drawdown_limit: 0.2,
        max_concentration_limit: 0.3,
        min_diversification_ratio: 0.1,
        stress_test_threshold: 0.2,
        dynamic_limits: true,
        market_regime_adjustments: {}
      };
      const riskEngine = createRiskManagementEngine(riskConfig, console);

      const suite = createPortfolioOptimizationSuite(mptEngine, portfolioEngine, riskEngine, console);
      expect(suite).toBeDefined();
      expect(typeof suite).toBe('object');
    });
  });

  describe('Integration Test', () => {
    it('should integrate all Phase 1 components', () => {
      // Create all components
      const learningSystem = createLearningSystem(console);
      const performanceAnalytics = createPerformanceAnalyticsEngine(console);
      const adaptiveLearning = createAdaptiveLearningEngine(console);
      const mptEngine = createModernPortfolioTheoryEngine(console);

      const portfolioConfig = {
        rebalancing_threshold: 0.05,
        min_rebalancing_interval: 30,
        max_portfolio_volatility: 0.25,
        min_portfolio_return: 0.08,
        risk_free_rate: 0.02,
        optimization_objective: 'sharpe' as const,
        learning_integration: true,
        adaptive_rebalancing: true
      };
      const portfolioEngine = createPortfolioOptimizationEngine(portfolioConfig, console);

      const riskConfig = {
        max_portfolio_volatility: 0.25,
        max_value_at_risk: 0.15,
        max_drawdown_limit: 0.2,
        max_concentration_limit: 0.3,
        min_diversification_ratio: 0.1,
        stress_test_threshold: 0.2,
        dynamic_limits: true,
        market_regime_adjustments: {}
      };
      const riskEngine = createRiskManagementEngine(riskConfig, console);

      const suite = createPortfolioOptimizationSuite(mptEngine, portfolioEngine, riskEngine, console);

      // Verify all components are created successfully
      expect(learningSystem).toBeDefined();
      expect(performanceAnalytics).toBeDefined();
      expect(adaptiveLearning).toBeDefined();
      expect(mptEngine).toBeDefined();
      expect(portfolioEngine).toBeDefined();
      expect(riskEngine).toBeDefined();
      expect(suite).toBeDefined();

      // Verify component types
      expect(typeof learningSystem.generateInsights).toBe('function');
      expect(typeof mptEngine.calculateCovarianceMatrix).toBe('function');
      expect(typeof portfolioEngine).toBe('object');
      expect(typeof riskEngine).toBe('object');
      expect(typeof suite).toBe('object');
    });
  });
});