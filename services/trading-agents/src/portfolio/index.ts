/**
 * Portfolio Optimization Module Index
 *
 * This module provides a comprehensive portfolio optimization suite
 * for the Trading Agents framework, implementing Modern Portfolio Theory
 * with advanced risk management and learning integration.
 *
 * Key Components:
 * - Modern Portfolio Theory (MPT) Engine
 * - Portfolio Optimization Engine
 * - Risk Management Engine
 * - Integration with Learning Systems
 * - Performance Analytics Integration
 *
 * Features:
 * - Efficient frontier calculation
 * - Risk-constrained optimization
 * - Adaptive portfolio rebalancing
 * - Stress testing and scenario analysis
 * - Risk budgeting and attribution
 * - Learning-based portfolio adjustments
 *
 * Usage:
 * ```typescript
 * import {
 *   createModernPortfolioTheoryEngine,
 *   createPortfolioOptimizationEngine,
 *   createRiskManagementEngine
 * } from './portfolio';
 *
 * // Create engines
 * const mptEngine = createModernPortfolioTheoryEngine(logger);
 * const riskEngine = createRiskManagementEngine(riskLimits, logger);
 * const portfolioEngine = createPortfolioOptimizationEngine(config, logger);
 *
 * // Optimize portfolio
 * const result = await portfolioEngine.optimizePortfolio(
 *   currentHoldings,
 *   availableAssets,
 *   historicalReturns,
 *   marketConditions
 * );
 * ```
 */

export * from './modern-portfolio-theory';
export * from './portfolio-optimization';
export * from './risk-management';
export * from './simple-position-sizer';

// Re-export key types for convenience
export type {
  Asset,
  PortfolioHolding,
  CovarianceMatrix,
  EfficientFrontier,
  PortfolioConstraints,
  OptimizationResult
} from './modern-portfolio-theory';

export type {
  PortfolioOptimizationConfig,
  PortfolioOptimizationResult,
  PortfolioRebalancingSignal
} from './portfolio-optimization';

export type {
  RiskMetrics,
  VaRCalculation,
  StressTestScenario,
  RiskBudget,
  RiskLimits
} from './risk-management';

export type {
  PortfolioOptimizationConfig as PortfolioOptimizationConfigType,
  PortfolioOptimizationResult as PortfolioOptimizationResultType,
  PortfolioRebalancingSignal as PortfolioRebalancingSignalType
} from './portfolio-optimization';

export type {
  RiskMetrics as RiskMetricsType,
  VaRCalculation as VaRCalculationType,
  StressTestScenario as StressTestScenarioType,
  RiskBudget as RiskBudgetType,
  RiskLimits as RiskLimitsType
} from './risk-management';

/**
 * Portfolio Optimization Suite
 *
 * Integrated suite of portfolio optimization tools with
 * learning system and risk management integration.
 */
export class PortfolioOptimizationSuite {
  private mptEngine: any;
  private portfolioEngine: any;
  private riskEngine: any;
  private logger: any;

  constructor(
    mptEngine: any,
    portfolioEngine: any,
    riskEngine: any,
    logger?: any
  ) {
    this.mptEngine = mptEngine;
    this.portfolioEngine = portfolioEngine;
    this.riskEngine = riskEngine;
    this.logger = logger || console;
  }

  /**
   * Complete portfolio optimization workflow
   */
  async optimizePortfolioWorkflow(
    currentHoldings: any[],
    availableAssets: any[],
    historicalReturns: Map<string, number[]>,
    marketConditions?: any,
    benchmarkReturns?: number[]
  ): Promise<{
    optimization: any;
    riskAnalysis: any;
    rebalancingSignals: any[];
    recommendations: string[];
  }> {

    this.logger.info('PortfolioOptimizationSuite', 'Starting complete portfolio optimization workflow', {
      numHoldings: currentHoldings.length,
      numAssets: availableAssets.length,
      hasMarketConditions: !!marketConditions
    });

    try {
      // Step 1: Calculate covariance matrix
      const _covarianceMatrix = await this.mptEngine.calculateCovarianceMatrix(
        availableAssets,
        historicalReturns,
        252
      );

      // Step 2: Perform portfolio optimization
      const optimizationResult = await this.portfolioEngine.optimizePortfolio(
        currentHoldings,
        availableAssets,
        historicalReturns,
        marketConditions
      );

      // Step 3: Calculate comprehensive risk metrics
      const riskMetrics = await this.riskEngine.calculateRiskMetrics(
        optimizationResult.optimal_weights,
        historicalReturns,
        benchmarkReturns
      );

      // Step 4: Generate rebalancing signals
      const marketData = new Map<string, { price: number; volume: number; volatility: number }>();
      for (const holding of currentHoldings) {
        marketData.set(holding.symbol, {
          price: holding.current_price,
          volume: 1000000, // Placeholder
          volatility: 0.2 // Placeholder
        });
      }

      const rebalancingSignals = await this.portfolioEngine.generateRebalancingSignals(
        currentHoldings,
        optimizationResult.optimal_weights,
        marketData
      );

      // Step 5: Generate recommendations
      const recommendations = this.generateOptimizationRecommendations(
        optimizationResult,
        riskMetrics,
        rebalancingSignals
      );

      const result = {
        optimization: optimizationResult,
        riskAnalysis: riskMetrics,
        rebalancingSignals,
        recommendations
      };

      this.logger.info('PortfolioOptimizationSuite', 'Portfolio optimization workflow completed', {
        expectedReturn: optimizationResult.expected_return,
        expectedVolatility: optimizationResult.expected_volatility,
        sharpeRatio: optimizationResult.sharpe_ratio,
        numSignals: rebalancingSignals.length,
        numRecommendations: recommendations.length
      });

      return result;

    } catch (error) {
      this.logger.error('PortfolioOptimizationSuite', 'Portfolio optimization workflow failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Risk assessment and stress testing workflow
   */
  async riskAssessmentWorkflow(
    portfolioWeights: Record<string, number>,
    historicalReturns: Map<string, number[]>,
    stressScenarios: any[]
  ): Promise<{
    riskMetrics: any;
    stressTestResults: any;
    riskLimitCompliance: any;
    mitigationStrategies: string[];
  }> {

    this.logger.info('PortfolioOptimizationSuite', 'Starting risk assessment workflow', {
      numAssets: Object.keys(portfolioWeights).length,
      numScenarios: stressScenarios.length
    });

    try {
      // Calculate risk metrics
      const riskMetrics = await this.riskEngine.calculateRiskMetrics(
        portfolioWeights,
        historicalReturns
      );

      // Perform stress testing
      const stressTestResults = await this.riskEngine.performStressTest(
        portfolioWeights,
        stressScenarios,
        historicalReturns
      );

      // Check risk limit compliance
      const riskLimitCompliance = this.riskEngine.checkRiskLimits(riskMetrics, portfolioWeights);

      // Generate mitigation strategies
      const mitigationStrategies = this.generateRiskMitigationStrategies(
        riskMetrics,
        stressTestResults,
        riskLimitCompliance
      );

      const result = {
        riskMetrics,
        stressTestResults,
        riskLimitCompliance,
        mitigationStrategies
      };

      this.logger.info('PortfolioOptimizationSuite', 'Risk assessment workflow completed', {
        compliant: riskLimitCompliance.compliant,
        stressTestPassed: stressTestResults.overall_risk_assessment.stress_test_passed,
        numStrategies: mitigationStrategies.length
      });

      return result;

    } catch (error) {
      this.logger.error('PortfolioOptimizationSuite', 'Risk assessment workflow failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Adaptive portfolio adjustment based on learning insights
   */
  async adaptiveAdjustmentWorkflow(
    currentHoldings: any[],
    learningInsights: any,
    marketConditions: any
  ): Promise<{
    adjustments: any;
    expectedImpact: any;
    confidenceLevel: number;
  }> {

    this.logger.info('PortfolioOptimizationSuite', 'Starting adaptive adjustment workflow', {
      hasLearningInsights: !!learningInsights,
      marketConditions
    });

    try {
      // Get current weights
      const currentWeights: Record<string, number> = {};
      for (const holding of currentHoldings) {
        currentWeights[holding.symbol] = holding.weight;
      }

      // Perform adaptive adjustment
      const adjustmentResult = await this.portfolioEngine.adaptivePortfolioAdjustment(
        currentHoldings,
        learningInsights,
        marketConditions
      );

      // Calculate confidence level based on learning insights
      const confidenceLevel = this.calculateAdjustmentConfidence(learningInsights, marketConditions);

      const result = {
        adjustments: adjustmentResult,
        expectedImpact: adjustmentResult.expected_impact,
        confidenceLevel
      };

      this.logger.info('PortfolioOptimizationSuite', 'Adaptive adjustment workflow completed', {
        adjustmentReason: adjustmentResult.adjustment_reason,
        confidenceLevel: (confidenceLevel * 100).toFixed(1) + '%'
      });

      return result;

    } catch (error) {
      this.logger.error('PortfolioOptimizationSuite', 'Adaptive adjustment workflow failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Private helper methods

  private generateOptimizationRecommendations(
    optimization: any,
    riskMetrics: any,
    rebalancingSignals: any[]
  ): string[] {

    const recommendations: string[] = [];

    // Sharpe ratio recommendations
    if (optimization.sharpe_ratio > 2.0) {
      recommendations.push('Excellent risk-adjusted returns - consider maintaining current strategy');
    } else if (optimization.sharpe_ratio > 1.0) {
      recommendations.push('Good risk-adjusted returns - monitor for further optimization opportunities');
    } else {
      recommendations.push('Consider rebalancing to improve risk-adjusted returns');
    }

    // Diversification recommendations
    if (riskMetrics.diversification_ratio < 0.8) {
      recommendations.push('Portfolio may benefit from increased diversification');
    }

    // Rebalancing recommendations
    const highPrioritySignals = rebalancingSignals.filter(s => s.priority === 'high');
    if (highPrioritySignals.length > 0) {
      recommendations.push(`${highPrioritySignals.length} high-priority rebalancing opportunities identified`);
    }

    // Risk management recommendations
    if (riskMetrics.maximum_drawdown > 0.15) {
      recommendations.push('Consider implementing stop-loss mechanisms to limit drawdown risk');
    }

    return recommendations;
  }

  private generateRiskMitigationStrategies(
    riskMetrics: any,
    stressTestResults: any,
    riskLimitCompliance: any
  ): string[] {

    const strategies: string[] = [];

    // Address risk limit breaches
    if (!riskLimitCompliance.compliant) {
      for (const breach of riskLimitCompliance.breaches) {
        switch (breach.limit_type) {
          case 'portfolio_volatility':
            strategies.push('Reduce portfolio volatility through diversification or hedging');
            break;
          case 'value_at_risk':
            strategies.push('Implement VaR reduction strategies (options, diversification)');
            break;
          case 'concentration_limit':
            strategies.push('Reduce position concentrations to improve diversification');
            break;
        }
      }
    }

    // Address stress test failures
    if (!stressTestResults.overall_risk_assessment.stress_test_passed) {
      strategies.push('Implement tail risk hedging strategies for extreme market events');
      strategies.push('Consider dynamic risk limits based on market volatility');
    }

    // General risk mitigation
    if (riskMetrics.volatility > 0.25) {
      strategies.push('Consider volatility-targeted strategies or VIX-based hedging');
    }

    return strategies;
  }

  private calculateAdjustmentConfidence(
    learningInsights: any,
    marketConditions: any
  ): number {

    let confidence = 0.5; // Base confidence

    // Increase confidence based on learning insights
    if (learningInsights) {
      if (learningInsights.strategy_performance) {
        confidence += 0.2; // Historical performance data
      }
      if (learningInsights.risk_adjustments) {
        confidence += 0.15; // Risk management insights
      }
      if (learningInsights.market_regime_weights) {
        confidence += 0.1; // Market regime awareness
      }
    }

    // Adjust based on market conditions
    switch (marketConditions.volatility_regime) {
      case 'low':
        confidence += 0.1; // More confident in stable markets
        break;
      case 'high':
        confidence -= 0.1; // Less confident in volatile markets
        break;
    }

    return Math.max(0.1, Math.min(0.9, confidence)); // Bound between 10% and 90%
  }
}

/**
 * Factory function for creating portfolio optimization suite
 */
export function createPortfolioOptimizationSuite(
  mptEngine: any,
  portfolioEngine: any,
  riskEngine: any,
  logger?: any
): PortfolioOptimizationSuite {
  return new PortfolioOptimizationSuite(mptEngine, portfolioEngine, riskEngine, logger);
}