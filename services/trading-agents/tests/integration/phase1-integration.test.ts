/**
 * Phase 1 Integration Tests
 *
 * Comprehensive integration tests for Phase 1: Enhanced Intelligence - Memory, Learning, Portfolio Optimization
 *
 * Tests the integration between:
 * - Learning System (reinforcement, supervised, unsupervised learning)
 * - Performance Analytics (risk metrics, attribution analysis)
 * - Adaptive Learning (market regime detection, curriculum learning)
 * - Modern Portfolio Theory (efficient frontier, optimization)
 * - Portfolio Optimization (learning integration, adaptive rebalancing)
 * - Risk Management (VaR calculation, stress testing, risk budgeting)
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createLogger } from '../../src/utils/enhanced-logger';
import { createLearningSystem } from '../../src/learning/learning-system';
import { createPerformanceAnalyticsEngine } from '../../src/learning/performance-analytics';
import { createAdaptiveLearningEngine } from '../../src/learning/adaptive-learning';
import { createModernPortfolioTheoryEngine } from '../../src/portfolio/modern-portfolio-theory';
import { createPortfolioOptimizationEngine } from '../../src/portfolio/portfolio-optimization';
import { createRiskManagementEngine } from '../../src/portfolio/risk-management';
import { createPortfolioOptimizationSuite } from '../../src/portfolio';

// Mock data for testing
const mockHistoricalReturns = new Map<string, number[]>([
  ['AAPL', [0.02, -0.01, 0.03, 0.01, -0.02, 0.04, 0.02, 0.01, -0.01, 0.03]],
  ['MSFT', [0.01, 0.02, 0.01, -0.01, 0.03, 0.02, 0.01, 0.02, 0.01, 0.02]],
  ['GOOGL', [0.03, 0.01, -0.02, 0.02, 0.01, 0.03, 0.02, -0.01, 0.02, 0.01]],
  ['TSLA', [-0.01, 0.05, -0.03, 0.04, -0.02, 0.06, 0.03, -0.04, 0.05, 0.02]],
  ['NVDA', [0.04, 0.03, 0.02, 0.05, 0.01, 0.04, 0.03, 0.02, 0.04, 0.03]]
]);

const mockCurrentHoldings = [
  { symbol: 'AAPL', weight: 0.3, current_price: 150.0, shares: 100 },
  { symbol: 'MSFT', weight: 0.25, current_price: 300.0, shares: 50 },
  { symbol: 'GOOGL', weight: 0.2, current_price: 2500.0, shares: 10 },
  { symbol: 'TSLA', weight: 0.15, current_price: 200.0, shares: 75 },
  { symbol: 'NVDA', weight: 0.1, current_price: 400.0, shares: 25 }
];

const mockAvailableAssets = [
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', expected_return: 0.12, volatility: 0.25 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', expected_return: 0.10, volatility: 0.22 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', expected_return: 0.14, volatility: 0.28 },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Automotive', expected_return: 0.20, volatility: 0.45 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology', expected_return: 0.18, volatility: 0.35 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer', expected_return: 0.16, volatility: 0.30 },
  { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Technology', expected_return: 0.15, volatility: 0.32 }
];

describe('Phase 1 Integration Tests', () => {
  let logger: any;
  let learningSystem: any;
  let performanceAnalytics: any;
  let adaptiveLearning: any;
  let mptEngine: any;
  let portfolioEngine: any;
  let riskEngine: any;
  let portfolioSuite: any;

  beforeAll(async () => {
    // Create logger
    logger = console;

    // Initialize learning system components
    learningSystem = createLearningSystem(logger);
    performanceAnalytics = createPerformanceAnalyticsEngine(logger);
    adaptiveLearning = createAdaptiveLearningEngine(logger);

    // Initialize portfolio optimization components
    mptEngine = createModernPortfolioTheoryEngine(logger);
    portfolioEngine = createPortfolioOptimizationEngine({
      rebalancing_threshold: 0.05,
      min_rebalancing_interval: 30,
      max_portfolio_volatility: 0.25,
      min_portfolio_return: 0.08,
      risk_free_rate: 0.02,
      optimization_objective: 'sharpe',
      learning_integration: true,
      adaptive_rebalancing: true
    }, logger);
    riskEngine = createRiskManagementEngine({
      max_portfolio_volatility: 0.25,
      max_value_at_risk: 0.15,
      max_drawdown_limit: 0.2,
      max_concentration_limit: 0.3,
      min_diversification_ratio: 0.1,
      stress_test_threshold: 0.2,
      dynamic_limits: true,
      market_regime_adjustments: {}
    }, logger);

    // Create integrated portfolio suite
    portfolioSuite = createPortfolioOptimizationSuite(
      mptEngine,
      portfolioEngine,
      riskEngine,
      logger
    );

    logger.info('Phase1IntegrationTest', 'All Phase 1 components initialized successfully');
  });

  afterAll(async () => {
    logger.info('Phase1IntegrationTest', 'Phase 1 integration tests completed');
  });

  describe('Learning System Integration', () => {
    it('should perform reinforcement learning on trading decisions', async () => {
      const tradingDecision = {
        action: 'BUY',
        symbol: 'AAPL',
        confidence: 0.8,
        marketData: { price: 150.0, volume: 1000000, volatility: 0.2 }
      };

      const reward = 0.05; // 5% return achieved

      await learningSystem.reinforcementLearning.updateStrategy(
        tradingDecision,
        reward,
        { market_regime: 'bull', volatility: 'low' }
      );

      const strategy = learningSystem.reinforcementLearning.getStrategy('AAPL');
      expect(strategy).toBeDefined();
      expect(strategy.confidence).toBeGreaterThan(0.7);
    });

    it('should perform supervised learning on market patterns', async () => {
      const marketFeatures = [
        [0.02, 0.15, 0.8, 1000000], // [return, volatility, sentiment, volume]
        [-0.01, 0.12, 0.6, 800000],
        [0.03, 0.18, 0.9, 1200000]
      ];

      const labels = [1, 0, 1]; // 1 = positive signal, 0 = negative signal

      await learningSystem.supervisedLearning.trainModel(marketFeatures, labels);

      const prediction = await learningSystem.supervisedLearning.predictSignal([
        0.025, 0.16, 0.85, 1100000
      ]);

      expect(prediction).toBeGreaterThanOrEqual(0);
      expect(prediction).toBeLessThanOrEqual(1);
    });

    it('should perform unsupervised learning for market clustering', async () => {
      const marketData = [
        { symbol: 'AAPL', features: [0.12, 0.25, 0.8, 1000000] },
        { symbol: 'MSFT', features: [0.10, 0.22, 0.75, 800000] },
        { symbol: 'TSLA', features: [0.20, 0.45, 0.9, 500000] },
        { symbol: 'NVDA', features: [0.18, 0.35, 0.85, 600000] }
      ];

      const clusters = await learningSystem.unsupervisedLearning.clusterAssets(marketData);
      expect(clusters).toBeDefined();
      expect(clusters.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Analytics Integration', () => {
    it('should calculate comprehensive risk metrics', async () => {
      const portfolioWeights = { AAPL: 0.3, MSFT: 0.25, GOOGL: 0.2, TSLA: 0.15, NVDA: 0.1 };
      const benchmarkReturns = [0.01, 0.015, 0.008, 0.012, 0.009, 0.014, 0.011, 0.013, 0.010, 0.016];

      const riskMetrics = await performanceAnalytics.calculateRiskMetrics(
        portfolioWeights,
        mockHistoricalReturns,
        benchmarkReturns
      );

      expect(riskMetrics.volatility).toBeDefined();
      expect(riskMetrics.sharpe_ratio).toBeDefined();
      expect(riskMetrics.maximum_drawdown).toBeDefined();
      expect(riskMetrics.value_at_risk_95).toBeDefined();
      expect(riskMetrics.tracking_error).toBeDefined();
    });

    it('should perform attribution analysis', async () => {
      const portfolioReturns = [0.02, -0.01, 0.03, 0.01, -0.02];
      const benchmarkReturns = [0.015, -0.005, 0.025, 0.008, -0.015];

      const attribution = await performanceAnalytics.calculateAttributionAnalysis(
        portfolioReturns,
        benchmarkReturns,
        mockCurrentHoldings
      );

      expect(attribution.total_attribution).toBeDefined();
      expect(attribution.security_attribution).toBeDefined();
      expect(attribution.allocation_attribution).toBeDefined();
    });
  });

  describe('Adaptive Learning Integration', () => {
    it('should detect market regimes', async () => {
      const marketData = {
        volatility: 0.25,
        trend: 'bullish',
        volume: 1000000,
        sentiment: 0.8
      };

      const regime = await adaptiveLearning.detectMarketRegime(marketData);
      expect(['bull', 'bear', 'sideways']).toContain(regime);
    });

    it('should adapt learning curriculum based on performance', async () => {
      const performanceData = {
        accuracy: 0.75,
        sharpe_ratio: 1.2,
        max_drawdown: 0.12,
        win_rate: 0.65
      };

      const curriculum = await adaptiveLearning.adaptCurriculum(performanceData);

      expect(curriculum.difficulty).toBeDefined();
      expect(curriculum.focus_areas).toBeDefined();
      expect(curriculum.learning_rate).toBeDefined();
    });

    it('should generate exploration strategies', async () => {
      const currentState = {
        portfolio_value: 100000,
        risk_level: 'moderate',
        market_regime: 'bull'
      };

      const strategy = await adaptiveLearning.generateExplorationStrategy(currentState);

      expect(strategy.actions).toBeDefined();
      expect(strategy.probabilities).toBeDefined();
      expect(strategy.risk_adjustments).toBeDefined();
    });
  });

  describe('Modern Portfolio Theory Integration', () => {
    it('should calculate efficient frontier', async () => {
      const efficientFrontier = await mptEngine.calculateEfficientFrontier(
        mockAvailableAssets,
        mockHistoricalReturns,
        50 // number of portfolios
      );

      expect(efficientFrontier).toBeDefined();
      expect(efficientFrontier.portfolios).toBeDefined();
      expect(efficientFrontier.portfolios.length).toBeGreaterThan(0);

      // Check that portfolios are on the efficient frontier
      for (const portfolio of efficientFrontier.portfolios) {
        expect(portfolio.expected_return).toBeDefined();
        expect(portfolio.volatility).toBeDefined();
        expect(portfolio.sharpe_ratio).toBeDefined();
      }
    });

    it('should optimize portfolio with constraints', async () => {
      const constraints = {
        min_weight: 0.05,
        max_weight: 0.35,
        target_return: 0.12,
        max_volatility: 0.25
      };

      const optimizedPortfolio = await mptEngine.optimizePortfolio(
        mockAvailableAssets,
        mockHistoricalReturns,
        constraints
      );

      expect(optimizedPortfolio.weights).toBeDefined();
      expect(optimizedPortfolio.expected_return).toBeGreaterThanOrEqual(constraints.target_return * 0.95);
      expect(optimizedPortfolio.volatility).toBeLessThanOrEqual(constraints.max_volatility);

      // Check weight constraints
      for (const weight of Object.values(optimizedPortfolio.weights)) {
        expect(weight).toBeGreaterThanOrEqual(constraints.min_weight);
        expect(weight).toBeLessThanOrEqual(constraints.max_weight);
      }
    });
  });

  describe('Portfolio Optimization Integration', () => {
    it('should optimize portfolio with learning insights', async () => {
      const learningInsights = {
        strategy_performance: {
          momentum: 0.75,
          mean_reversion: 0.65,
          pairs_trading: 0.70
        },
        risk_adjustments: {
          volatility_targeting: 0.8,
          tail_risk_hedging: 0.6
        },
        market_regime_weights: {
          bull: 0.6,
          bear: 0.2,
          sideways: 0.2
        }
      };

      const marketConditions = {
        volatility_regime: 'moderate',
        trend_strength: 0.7,
        market_sentiment: 0.75
      };

      const result = await portfolioEngine.optimizePortfolio(
        mockCurrentHoldings,
        mockAvailableAssets,
        mockHistoricalReturns,
        marketConditions,
        learningInsights
      );

      expect(result.optimal_weights).toBeDefined();
      expect(result.expected_return).toBeDefined();
      expect(result.expected_volatility).toBeDefined();
      expect(result.sharpe_ratio).toBeDefined();
    });

    it('should generate rebalancing signals', async () => {
      const marketData = new Map<string, { price: number; volume: number; volatility: number }>([
        ['AAPL', { price: 155.0, volume: 1100000, volatility: 0.22 }],
        ['MSFT', { price: 310.0, volume: 900000, volatility: 0.20 }],
        ['GOOGL', { price: 2525.0, volume: 800000, volatility: 0.26 }],
        ['TSLA', { price: 210.0, volume: 1200000, volatility: 0.40 }],
        ['NVDA', { price: 420.0, volume: 950000, volatility: 0.32 }]
      ]);

      const optimalWeights = {
        AAPL: 0.28,
        MSFT: 0.27,
        GOOGL: 0.22,
        TSLA: 0.13,
        NVDA: 0.10
      };

      const signals = await portfolioEngine.generateRebalancingSignals(
        mockCurrentHoldings,
        optimalWeights,
        marketData
      );

      expect(signals).toBeDefined();
      expect(signals.length).toBeGreaterThan(0);

      for (const signal of signals) {
        expect(['BUY', 'SELL', 'HOLD']).toContain(signal.action);
        expect(signal.priority).toBeDefined();
        expect(signal.expected_impact).toBeDefined();
      }
    });
  });

  describe('Risk Management Integration', () => {
    it('should calculate Value at Risk using multiple methods', async () => {
      const portfolioWeights = { AAPL: 0.3, MSFT: 0.25, GOOGL: 0.2, TSLA: 0.15, NVDA: 0.1 };

      const varCalculation = await riskEngine.calculateVaR(
        portfolioWeights,
        mockHistoricalReturns,
        0.95,
        'historical'
      );

      expect(varCalculation.value_at_risk).toBeDefined();
      expect(varCalculation.confidence_level).toBe(0.95);
      expect(varCalculation.calculation_method).toBe('historical');
      expect(varCalculation.expected_shortfall).toBeDefined();
    });

    it('should perform stress testing', async () => {
      const portfolioWeights = { AAPL: 0.3, MSFT: 0.25, GOOGL: 0.2, TSLA: 0.15, NVDA: 0.1 };

      const stressScenarios = [
        {
          name: 'Market Crash 2008',
          returns: { AAPL: -0.5, MSFT: -0.45, GOOGL: -0.55, TSLA: -0.6, NVDA: -0.65 },
          probability: 0.05
        },
        {
          name: 'Tech Bubble Burst',
          returns: { AAPL: -0.4, MSFT: -0.35, GOOGL: -0.45, TSLA: -0.5, NVDA: -0.4 },
          probability: 0.03
        }
      ];

      const stressTestResults = await riskEngine.performStressTest(
        portfolioWeights,
        stressScenarios,
        mockHistoricalReturns
      );

      expect(stressTestResults.scenario_results).toBeDefined();
      expect(stressTestResults.overall_risk_assessment).toBeDefined();
      expect(stressTestResults.recommendations).toBeDefined();
    });

    it('should check risk limit compliance', async () => {
      const riskMetrics = {
        volatility: 0.22,
        value_at_risk_95: 0.12,
        concentration_risk: 0.28
      };

      const portfolioWeights = { AAPL: 0.3, MSFT: 0.25, GOOGL: 0.2, TSLA: 0.15, NVDA: 0.1 };

      const compliance = riskEngine.checkRiskLimits(riskMetrics, portfolioWeights);

      expect(compliance.compliant).toBeDefined();
      expect(compliance.breaches).toBeDefined();
      expect(compliance.overall_risk_score).toBeDefined();
    });
  });

  describe('Complete Portfolio Optimization Suite Integration', () => {
    it('should execute complete portfolio optimization workflow', async () => {
      const marketConditions = {
        volatility_regime: 'moderate',
        trend_strength: 0.7,
        market_sentiment: 0.75
      };

      const benchmarkReturns = [0.01, 0.015, 0.008, 0.012, 0.009, 0.014, 0.011, 0.013, 0.010, 0.016];

      const result = await portfolioSuite.optimizePortfolioWorkflow(
        mockCurrentHoldings,
        mockAvailableAssets,
        mockHistoricalReturns,
        marketConditions,
        benchmarkReturns
      );

      expect(result.optimization).toBeDefined();
      expect(result.riskAnalysis).toBeDefined();
      expect(result.rebalancingSignals).toBeDefined();
      expect(result.recommendations).toBeDefined();

      // Validate optimization results
      expect(result.optimization.expected_return).toBeDefined();
      expect(result.optimization.expected_volatility).toBeDefined();
      expect(result.optimization.sharpe_ratio).toBeDefined();

      // Validate risk analysis
      expect(result.riskAnalysis.volatility).toBeDefined();
      expect(result.riskAnalysis.value_at_risk_95).toBeDefined();

      // Validate rebalancing signals
      expect(result.rebalancingSignals.length).toBeGreaterThan(0);

      // Validate recommendations
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should execute risk assessment workflow', async () => {
      const portfolioWeights = { AAPL: 0.3, MSFT: 0.25, GOOGL: 0.2, TSLA: 0.15, NVDA: 0.1 };

      const stressScenarios = [
        {
          name: 'Market Crash 2008',
          returns: { AAPL: -0.5, MSFT: -0.45, GOOGL: -0.55, TSLA: -0.6, NVDA: -0.65 },
          probability: 0.05
        }
      ];

      const result = await portfolioSuite.riskAssessmentWorkflow(
        portfolioWeights,
        mockHistoricalReturns,
        stressScenarios
      );

      expect(result.riskMetrics).toBeDefined();
      expect(result.stressTestResults).toBeDefined();
      expect(result.riskLimitCompliance).toBeDefined();
      expect(result.mitigationStrategies).toBeDefined();
    });

    it('should execute adaptive adjustment workflow', async () => {
      const learningInsights = {
        strategy_performance: { momentum: 0.75, mean_reversion: 0.65 },
        risk_adjustments: { volatility_targeting: 0.8 },
        market_regime_weights: { bull: 0.6, bear: 0.2, sideways: 0.2 }
      };

      const marketConditions = {
        volatility_regime: 'moderate',
        trend_strength: 0.7,
        market_sentiment: 0.75
      };

      const result = await portfolioSuite.adaptiveAdjustmentWorkflow(
        mockCurrentHoldings,
        learningInsights,
        marketConditions
      );

      expect(result.adjustments).toBeDefined();
      expect(result.expectedImpact).toBeDefined();
      expect(result.confidenceLevel).toBeGreaterThan(0);
      expect(result.confidenceLevel).toBeLessThanOrEqual(1);
    });
  });

  describe('Cross-Component Integration', () => {
    it('should integrate learning insights with portfolio optimization', async () => {
      // Generate learning insights
      const learningInsights = await learningSystem.getLearningInsights(
        mockHistoricalReturns,
        mockCurrentHoldings
      );

      // Use insights in portfolio optimization
      const marketConditions = {
        volatility_regime: 'moderate',
        trend_strength: 0.7,
        market_sentiment: 0.75
      };

      const optimizationResult = await portfolioEngine.optimizePortfolio(
        mockCurrentHoldings,
        mockAvailableAssets,
        mockHistoricalReturns,
        marketConditions,
        learningInsights
      );

      // Validate that learning insights influenced optimization
      expect(optimizationResult.learning_adjustments).toBeDefined();
      expect(optimizationResult.confidence_score).toBeDefined();
    });

    it('should integrate risk management with learning feedback', async () => {
      // Perform risk assessment
      const portfolioWeights = { AAPL: 0.3, MSFT: 0.25, GOOGL: 0.2, TSLA: 0.15, NVDA: 0.1 };
      const riskMetrics = await riskEngine.calculateRiskMetrics(
        portfolioWeights,
        mockHistoricalReturns
      );

      // Use risk metrics as learning feedback
      const learningFeedback = {
        risk_performance: riskMetrics,
        portfolio_weights: portfolioWeights,
        timestamp: new Date()
      };

      await learningSystem.updateLearningModel(learningFeedback);

      // Verify that learning model was updated
      const updatedInsights = await learningSystem.getLearningInsights(
        mockHistoricalReturns,
        mockCurrentHoldings
      );

      expect(updatedInsights.risk_adjustments).toBeDefined();
    });

    it('should integrate performance analytics with adaptive learning', async () => {
      // Calculate performance metrics
      const portfolioWeights = { AAPL: 0.3, MSFT: 0.25, GOOGL: 0.2, TSLA: 0.15, NVDA: 0.1 };
      const performanceMetrics = await performanceAnalytics.calculateRiskMetrics(
        portfolioWeights,
        mockHistoricalReturns
      );

      // Use performance metrics for adaptive learning
      const adaptationResult = await adaptiveLearning.adaptStrategy(
        performanceMetrics,
        { market_regime: 'bull', volatility: 'moderate' }
      );

      expect(adaptationResult.strategy_adjustments).toBeDefined();
      expect(adaptationResult.learning_rate).toBeDefined();
      expect(adaptationResult.confidence_level).toBeDefined();
    });
  });
});