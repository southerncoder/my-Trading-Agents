/**
 * Portfolio Optimization Engine
 *
 * This module provides comprehensive portfolio optimization capabilities
 * using Modern Portfolio Theory, integrating with learning systems and
 * risk management for adaptive portfolio allocation.
 *
 * Key Features:
 * - Dynamic portfolio rebalancing based on market conditions
 * - Integration with learning systems for strategy optimization
 * - Risk-adjusted portfolio construction
 * - Performance-based portfolio adjustments
 * - Multi-objective optimization (return, risk, diversification)
 *
 * Integration Capabilities:
 * - Works with learning system for strategy refinement
 * - Integrates with risk management for constraint optimization
 * - Supports performance analytics for optimization validation
 * - Enables adaptive learning for dynamic allocation adjustments
 */

import { z } from 'zod';
import { ModernPortfolioTheoryEngine, Asset, PortfolioHolding, CovarianceMatrix, PortfolioConstraints, OptimizationResult } from './modern-portfolio-theory';

// Portfolio optimization schemas
export const PortfolioOptimizationConfigSchema = z.object({
  rebalancing_threshold: z.number().min(0).max(1).default(0.05), // 5% drift threshold
  min_rebalancing_interval: z.number().min(1).default(30), // Days
  max_portfolio_volatility: z.number().min(0).max(1).default(0.25), // 25% max volatility
  min_portfolio_return: z.number().min(0).default(0.08), // 8% minimum return
  risk_free_rate: z.number().min(0).default(0.02), // 2% risk-free rate
  optimization_objective: z.enum(['sharpe', 'return', 'volatility', 'diversification']).default('sharpe'),
  sector_constraints: z.record(z.string(), z.object({
    min_weight: z.number().min(0).max(1),
    max_weight: z.number().min(0).max(1)
  })).optional(),
  country_constraints: z.record(z.string(), z.object({
    min_weight: z.number().min(0).max(1),
    max_weight: z.number().min(0).max(1)
  })).optional(),
  learning_integration: z.boolean().default(true),
  adaptive_rebalancing: z.boolean().default(true)
});

export const PortfolioOptimizationResultSchema = z.object({
  optimal_weights: z.record(z.string(), z.number()),
  expected_return: z.number(),
  expected_volatility: z.number(),
  sharpe_ratio: z.number(),
  optimization_status: z.enum(['optimal', 'feasible', 'infeasible']),
  rebalancing_trades: z.array(z.object({
    symbol: z.string(),
    action: z.enum(['buy', 'sell']),
    quantity: z.number(),
    estimated_value: z.number()
  })),
  portfolio_metrics: z.object({
    diversification_ratio: z.number(),
    concentration_metrics: z.object({
      top_holding_weight: z.number(),
      herfindahl_index: z.number(),
      sector_concentration: z.record(z.string(), z.number())
    })
  }),
  optimization_timestamp: z.string(),
  next_rebalancing_date: z.string()
});

export const PortfolioRebalancingSignalSchema = z.object({
  symbol: z.string(),
  current_weight: z.number(),
  target_weight: z.number(),
  drift_percentage: z.number(),
  recommended_action: z.enum(['buy', 'sell', 'hold']),
  priority: z.enum(['high', 'medium', 'low']),
  estimated_impact: z.object({
    return_impact: z.number(),
    risk_impact: z.number(),
    diversification_impact: z.number()
  })
});

export type PortfolioOptimizationConfig = z.infer<typeof PortfolioOptimizationConfigSchema>;
export type PortfolioOptimizationResult = z.infer<typeof PortfolioOptimizationResultSchema>;
export type PortfolioRebalancingSignal = z.infer<typeof PortfolioRebalancingSignalSchema>;

/**
 * Portfolio Optimization Engine
 *
 * Provides comprehensive portfolio optimization with learning integration
 * and adaptive rebalancing capabilities.
 */
export class PortfolioOptimizationEngine {
  private mptEngine: ModernPortfolioTheoryEngine;
  private config: PortfolioOptimizationConfig;
  private logger: any;
  private lastOptimization: Date | null = null;

  constructor(
    config: PortfolioOptimizationConfig,
    logger?: any
  ) {
    this.config = config;
    this.mptEngine = new ModernPortfolioTheoryEngine(logger);
    this.logger = logger || console;
  }

  /**
   * Optimize portfolio with learning integration
   */
  async optimizePortfolio(
    currentHoldings: PortfolioHolding[],
    availableAssets: Asset[],
    historicalReturns: Map<string, number[]>,
    marketConditions?: {
      volatility_regime: 'low' | 'normal' | 'high';
      market_trend: 'bull' | 'bear' | 'sideways';
      risk_premium: number;
    }
  ): Promise<PortfolioOptimizationResult> {

    this.logger.info('optimizePortfolio', 'Starting portfolio optimization', {
      numHoldings: currentHoldings.length,
      numAvailableAssets: availableAssets.length,
      marketConditions
    });

    const startTime = Date.now();

    try {
      // Calculate covariance matrix
      const covarianceMatrix = await this.mptEngine.calculateCovarianceMatrix(
        availableAssets,
        historicalReturns,
        252 // 1 year lookback
      );

      // Adjust constraints based on market conditions
      const adjustedConstraints = this.adjustConstraintsForMarketConditions(marketConditions);

      // Perform optimization based on objective
      let optimizationResult: OptimizationResult;

      switch (this.config.optimization_objective) {
        case 'sharpe':
          optimizationResult = await this.mptEngine.optimizeForMaximumSharpe(
            availableAssets,
            covarianceMatrix,
            adjustedConstraints
          );
          break;
        case 'return':
          optimizationResult = await this.mptEngine.optimizeForTargetReturn(
            availableAssets,
            covarianceMatrix,
            this.config.min_portfolio_return,
            adjustedConstraints
          );
          break;
        case 'volatility':
          optimizationResult = await this.mptEngine.optimizeForMinimumVolatility(
            availableAssets,
            covarianceMatrix,
            adjustedConstraints
          );
          break;
        case 'diversification':
          optimizationResult = await this.optimizeForDiversification(
            availableAssets,
            covarianceMatrix,
            adjustedConstraints
          );
          break;
        default:
          optimizationResult = await this.mptEngine.optimizeForMaximumSharpe(
            availableAssets,
            covarianceMatrix,
            adjustedConstraints
          );
      }

      // Detect portfolio drift and generate rebalancing trades
      const driftAnalysis = this.mptEngine.detectPortfolioDrift(
        currentHoldings,
        optimizationResult.optimal_weights,
        this.config.rebalancing_threshold
      );

      // Calculate portfolio metrics
      const portfolioMetrics = this.mptEngine.calculatePortfolioMetrics(
        currentHoldings,
        covarianceMatrix,
        this.config.risk_free_rate
      );

      // Generate optimization result
      const result: PortfolioOptimizationResult = {
        optimal_weights: optimizationResult.optimal_weights,
        expected_return: optimizationResult.expected_return,
        expected_volatility: optimizationResult.expected_volatility,
        sharpe_ratio: optimizationResult.sharpe_ratio,
        optimization_status: optimizationResult.optimization_status,
        rebalancing_trades: driftAnalysis.rebalancing_needed ? driftAnalysis.recommended_trades : [],
        portfolio_metrics: portfolioMetrics,
        optimization_timestamp: new Date().toISOString(),
        next_rebalancing_date: this.calculateNextRebalancingDate()
      };

      this.lastOptimization = new Date();

      const computationTime = Date.now() - startTime;
      this.logger.info('optimizePortfolio', 'Portfolio optimization completed', {
        status: result.optimization_status,
        expectedReturn: result.expected_return,
        expectedVolatility: result.expected_volatility,
        sharpeRatio: result.sharpe_ratio,
        numTrades: result.rebalancing_trades.length,
        computationTime: `${computationTime}ms`
      });

      return result;

    } catch (error) {
      this.logger.error('optimizePortfolio', 'Portfolio optimization failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Generate rebalancing signals with priority ranking
   */
  async generateRebalancingSignals(
    currentHoldings: PortfolioHolding[],
    targetWeights: Record<string, number>,
    marketData: Map<string, { price: number; volume: number; volatility: number }>
  ): Promise<PortfolioRebalancingSignal[]> {

    this.logger.info('generateRebalancingSignals', 'Generating rebalancing signals', {
      numHoldings: currentHoldings.length
    });

    const signals: PortfolioRebalancingSignal[] = [];

    for (const holding of currentHoldings) {
      const targetWeight = targetWeights[holding.symbol] || 0;
      const currentWeight = holding.weight;
      const driftPercentage = Math.abs(currentWeight - targetWeight) / Math.max(currentWeight, targetWeight);

      if (driftPercentage >= this.config.rebalancing_threshold) {
        // Calculate estimated impact
        const marketInfo = marketData.get(holding.symbol);
        const estimatedImpact = this.calculateRebalancingImpact(
          holding,
          targetWeight,
          marketInfo
        );

        // Determine priority based on drift and market conditions
        const priority = this.determineRebalancingPriority(driftPercentage, marketInfo);

        const action = currentWeight > targetWeight ? 'sell' : 'buy';

        signals.push({
          symbol: holding.symbol,
          current_weight: currentWeight,
          target_weight: targetWeight,
          drift_percentage: driftPercentage,
          recommended_action: action,
          priority,
          estimated_impact: estimatedImpact
        });
      }
    }

    // Sort by priority and impact
    signals.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Secondary sort by total impact
      const totalImpactA = Math.abs(a.estimated_impact.return_impact) +
                          Math.abs(a.estimated_impact.risk_impact) +
                          Math.abs(a.estimated_impact.diversification_impact);
      const totalImpactB = Math.abs(b.estimated_impact.return_impact) +
                          Math.abs(b.estimated_impact.risk_impact) +
                          Math.abs(b.estimated_impact.diversification_impact);
      return totalImpactB - totalImpactA;
    });

    this.logger.info('generateRebalancingSignals', 'Rebalancing signals generated', {
      numSignals: signals.length,
      highPriority: signals.filter(s => s.priority === 'high').length,
      mediumPriority: signals.filter(s => s.priority === 'medium').length,
      lowPriority: signals.filter(s => s.priority === 'low').length
    });

    return signals;
  }

  /**
   * Adaptive portfolio adjustment based on learning insights
   */
  async adaptivePortfolioAdjustment(
    currentHoldings: PortfolioHolding[],
    learningInsights: {
      strategy_performance: Map<string, number>;
      risk_adjustments: Map<string, number>;
      market_regime_weights: Record<string, number>;
    },
    marketConditions: {
      volatility_regime: 'low' | 'normal' | 'high';
      market_trend: 'bull' | 'bear' | 'sideways';
    }
  ): Promise<{
    adjusted_weights: Record<string, number>;
    adjustment_reason: string;
    expected_impact: {
      return_change: number;
      risk_change: number;
      diversification_change: number;
    };
  }> {

    this.logger.info('adaptivePortfolioAdjustment', 'Starting adaptive adjustment', {
      marketConditions,
      hasLearningInsights: !!learningInsights
    });

    // Start with current weights
    const adjustedWeights: Record<string, number> = {};
    for (const holding of currentHoldings) {
      adjustedWeights[holding.symbol] = holding.weight;
    }

    let adjustmentReason = 'No significant adjustments needed';

    // Apply learning-based adjustments
    if (this.config.learning_integration && learningInsights) {
      const adjustments = this.applyLearningAdjustments(
        adjustedWeights,
        learningInsights,
        marketConditions
      );

      Object.assign(adjustedWeights, adjustments.weights);
      adjustmentReason = adjustments.reason;
    }

    // Apply market regime adjustments
    if (this.config.adaptive_rebalancing) {
      const regimeAdjustments = this.applyMarketRegimeAdjustments(
        adjustedWeights,
        marketConditions
      );

      Object.assign(adjustedWeights, regimeAdjustments.weights);
      if (regimeAdjustments.reason !== 'No regime adjustments') {
        adjustmentReason += `; ${regimeAdjustments.reason}`;
      }
    }

    // Normalize weights
    const totalWeight = Object.values(adjustedWeights).reduce((sum, w) => sum + w, 0);
    for (const symbol in adjustedWeights) {
      const currentWeight = adjustedWeights[symbol];
      if (currentWeight !== undefined) {
        adjustedWeights[symbol] = currentWeight / totalWeight;
      }
    }

    // Calculate expected impact
    const expectedImpact = this.calculateAdjustmentImpact(
      currentHoldings,
      adjustedWeights
    );

    this.logger.info('adaptivePortfolioAdjustment', 'Adaptive adjustment completed', {
      adjustmentReason,
      expectedReturnChange: expectedImpact.return_change,
      expectedRiskChange: expectedImpact.risk_change,
      expectedDiversificationChange: expectedImpact.diversification_change
    });

    return {
      adjusted_weights: adjustedWeights,
      adjustment_reason: adjustmentReason,
      expected_impact: expectedImpact
    };
  }

  /**
   * Check if portfolio needs rebalancing
   */
  shouldRebalance(
    currentHoldings: PortfolioHolding[],
    targetWeights: Record<string, number>,
    lastRebalancingDate: Date
  ): {
    needs_rebalancing: boolean;
    reason: string;
    urgency: 'high' | 'medium' | 'low';
    max_drift: number;
  } {

    // Check time-based rebalancing
    const daysSinceLastRebalancing = (Date.now() - lastRebalancingDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceLastRebalancing >= this.config.min_rebalancing_interval) {
      return {
        needs_rebalancing: true,
        reason: `Time-based rebalancing: ${Math.floor(daysSinceLastRebalancing)} days since last rebalancing`,
        urgency: 'medium',
        max_drift: 0
      };
    }

    // Check drift-based rebalancing
    let maxDrift = 0;
    let totalDrift = 0;
    let numDriftedAssets = 0;

    for (const holding of currentHoldings) {
      const targetWeight = targetWeights[holding.symbol] || 0;
      const drift = Math.abs(holding.weight - targetWeight);
      maxDrift = Math.max(maxDrift, drift);
      totalDrift += drift;

      if (drift >= this.config.rebalancing_threshold) {
        numDriftedAssets++;
      }
    }

    const avgDrift = totalDrift / currentHoldings.length;

    if (maxDrift >= this.config.rebalancing_threshold * 2) { // High urgency threshold
      return {
        needs_rebalancing: true,
        reason: `High drift detected: ${numDriftedAssets} assets exceeded ${(this.config.rebalancing_threshold * 100).toFixed(1)}% threshold`,
        urgency: 'high',
        max_drift: maxDrift
      };
    }

    if (avgDrift >= this.config.rebalancing_threshold) {
      return {
        needs_rebalancing: true,
        reason: `Average drift exceeded threshold: ${(avgDrift * 100).toFixed(1)}%`,
        urgency: 'medium',
        max_drift: maxDrift
      };
    }

    return {
      needs_rebalancing: false,
      reason: `Portfolio within acceptable drift limits. Max drift: ${(maxDrift * 100).toFixed(1)}%`,
      urgency: 'low',
      max_drift: maxDrift
    };
  }

  /**
   * Update optimization configuration
   */
  updateConfig(newConfig: Partial<PortfolioOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('updateConfig', 'Portfolio optimization config updated', {
      updatedFields: Object.keys(newConfig)
    });
  }

  // Private helper methods

  private adjustConstraintsForMarketConditions(marketConditions?: {
    volatility_regime: 'low' | 'normal' | 'high';
    market_trend: 'bull' | 'bear' | 'sideways';
    risk_premium: number;
  }): PortfolioConstraints | undefined {

    if (!marketConditions) return undefined;

    const baseConstraints: PortfolioConstraints = {
      min_weight: 0.01, // 1% minimum weight
      max_weight: 0.25, // 25% maximum weight
      max_volatility: this.config.max_portfolio_volatility,
      min_return: this.config.min_portfolio_return,
      sector_limits: this.config.sector_constraints,
      country_limits: this.config.country_constraints
    };

    // Adjust based on volatility regime
    switch (marketConditions.volatility_regime) {
      case 'high':
        baseConstraints.max_volatility = Math.min(baseConstraints.max_volatility || 1, 0.15); // Reduce max volatility
        baseConstraints.max_weight = 0.15; // Reduce max position size
        break;
      case 'low':
        baseConstraints.max_volatility = Math.min(baseConstraints.max_volatility || 1, 0.35); // Allow higher volatility
        baseConstraints.max_weight = 0.35; // Allow larger positions
        break;
    }

    // Adjust based on market trend
    switch (marketConditions.market_trend) {
      case 'bear':
        baseConstraints.min_return = Math.max(baseConstraints.min_return || 0, 0.02); // Lower return expectations
        break;
      case 'bull':
        baseConstraints.min_return = Math.max(baseConstraints.min_return || 0, 0.12); // Higher return expectations
        break;
    }

    return baseConstraints;
  }

  private async optimizeForDiversification(
    assets: Asset[],
    covarianceMatrix: CovarianceMatrix,
    constraints?: PortfolioConstraints
  ): Promise<OptimizationResult> {

    // Use minimum volatility as proxy for maximum diversification
    // In practice, this could be enhanced with more sophisticated diversification metrics
    return await this.mptEngine.optimizeForMinimumVolatility(assets, covarianceMatrix, constraints);
  }

  private calculateRebalancingImpact(
    holding: PortfolioHolding,
    targetWeight: number,
    marketInfo?: { price: number; volume: number; volatility: number }
  ): {
    return_impact: number;
    risk_impact: number;
    diversification_impact: number;
  } {

    const currentWeight = holding.weight;
    const weightChange = targetWeight - currentWeight;

    // Estimate return impact (simplified)
    const returnImpact = weightChange * holding.average_cost * 0.05; // Assume 5% expected return

    // Estimate risk impact based on volatility
    const volatility = marketInfo?.volatility || 0.2; // Default 20% volatility
    const riskImpact = weightChange * volatility * holding.current_price;

    // Estimate diversification impact (simplified)
    const diversificationImpact = Math.abs(weightChange) * -0.1; // Assume slight negative impact on diversification

    return {
      return_impact: returnImpact,
      risk_impact: riskImpact,
      diversification_impact: diversificationImpact
    };
  }

  private determineRebalancingPriority(
    driftPercentage: number,
    marketInfo?: { price: number; volume: number; volatility: number }
  ): 'high' | 'medium' | 'low' {

    // High priority for large drifts or high volatility
    if (driftPercentage > 0.15 || (marketInfo && marketInfo.volatility > 0.3)) {
      return 'high';
    }

    // Medium priority for moderate drifts
    if (driftPercentage > 0.08) {
      return 'medium';
    }

    // Low priority for small drifts
    return 'low';
  }

  private applyLearningAdjustments(
    currentWeights: Record<string, number>,
    learningInsights: {
      strategy_performance: Map<string, number>;
      risk_adjustments: Map<string, number>;
      market_regime_weights: Record<string, number>;
    },
    marketConditions: {
      volatility_regime: 'low' | 'normal' | 'high';
      market_trend: 'bull' | 'bear' | 'sideways';
    }
  ): {
    weights: Record<string, number>;
    reason: string;
  } {

    const adjustedWeights = { ...currentWeights };
    let adjustmentMade = false;
    const reasons: string[] = [];

    // Apply strategy performance adjustments
    for (const [symbol, performance] of learningInsights.strategy_performance) {
      if (adjustedWeights[symbol] !== undefined) {
        const adjustment = performance * 0.1; // 10% max adjustment
        adjustedWeights[symbol] = Math.max(0.01, Math.min(0.4, adjustedWeights[symbol] + adjustment));
        adjustmentMade = true;
        reasons.push(`Strategy performance adjustment for ${symbol}: ${(adjustment * 100).toFixed(1)}%`);
      }
    }

    // Apply risk adjustments
    for (const [symbol, riskAdjustment] of learningInsights.risk_adjustments) {
      if (adjustedWeights[symbol] !== undefined) {
        const adjustment = riskAdjustment * 0.05; // 5% max adjustment
        adjustedWeights[symbol] = Math.max(0.01, Math.min(0.4, adjustedWeights[symbol] + adjustment));
        adjustmentMade = true;
        reasons.push(`Risk adjustment for ${symbol}: ${(adjustment * 100).toFixed(1)}%`);
      }
    }

    return {
      weights: adjustedWeights,
      reason: adjustmentMade ? reasons.join('; ') : 'No learning-based adjustments applied'
    };
  }

  private applyMarketRegimeAdjustments(
    currentWeights: Record<string, number>,
    _marketConditions: {
      volatility_regime: 'low' | 'normal' | 'high';
      market_trend: 'bull' | 'bear' | 'sideways';
    }
  ): {
    weights: Record<string, number>;
    reason: string;
  } {

    const adjustedWeights = { ...currentWeights };
    let adjustmentMade = false;
    const reasons: string[] = [];

    // Adjust based on volatility regime
    switch (_marketConditions.volatility_regime) {
      case 'high':
        // Reduce exposure to volatile assets
        for (const symbol in adjustedWeights) {
          const currentWeight = adjustedWeights[symbol];
          if (currentWeight !== undefined && currentWeight > 0.2) { // Reduce large positions
            const reduction = currentWeight * 0.1;
            adjustedWeights[symbol] = currentWeight - reduction;
            adjustmentMade = true;
            reasons.push(`Reduced ${symbol} exposure due to high volatility: -${(reduction * 100).toFixed(1)}%`);
          }
        }
        break;
      case 'low':
        // Can take slightly more risk
        for (const symbol in adjustedWeights) {
          const currentWeight = adjustedWeights[symbol];
          if (currentWeight !== undefined && currentWeight < 0.15) { // Increase small positions
            const increase = currentWeight * 0.05;
            adjustedWeights[symbol] = currentWeight + increase;
            adjustmentMade = true;
            reasons.push(`Increased ${symbol} exposure due to low volatility: +${(increase * 100).toFixed(1)}%`);
          }
        }
        break;
    }

    // Adjust based on market trend
    switch (_marketConditions.market_trend) {
      case 'bull':
        // Slightly increase equity exposure
        for (const symbol in adjustedWeights) {
          const currentWeight = adjustedWeights[symbol];
          if (currentWeight !== undefined) {
            const increase = currentWeight * 0.02;
            adjustedWeights[symbol] = currentWeight + increase;
            adjustmentMade = true;
            reasons.push(`Bull market adjustment for ${symbol}: +${(increase * 100).toFixed(1)}%`);
          }
        }
        break;
      case 'bear':
        // Reduce equity exposure
        for (const symbol in adjustedWeights) {
          const currentWeight = adjustedWeights[symbol];
          if (currentWeight !== undefined) {
            const reduction = currentWeight * 0.03;
            adjustedWeights[symbol] = currentWeight - reduction;
            adjustmentMade = true;
            reasons.push(`Bear market adjustment for ${symbol}: -${(reduction * 100).toFixed(1)}%`);
          }
        }
        break;
    }

    return {
      weights: adjustedWeights,
      reason: adjustmentMade ? reasons.join('; ') : 'No regime adjustments'
    };
  }

  private calculateAdjustmentImpact(
    currentHoldings: PortfolioHolding[],
    adjustedWeights: Record<string, number>
  ): {
    return_change: number;
    risk_change: number;
    diversification_change: number;
  } {

    // Simplified impact calculation
    let returnChange = 0;
    let riskChange = 0;
    let diversificationChange = 0;

    for (const holding of currentHoldings) {
      const newWeight = adjustedWeights[holding.symbol] || 0;
      const weightChange = newWeight - holding.weight;

      // Estimate return impact
      returnChange += weightChange * 0.05; // Assume 5% expected return

      // Estimate risk impact
      riskChange += Math.abs(weightChange) * 0.15; // Assume 15% volatility

      // Estimate diversification impact
      diversificationChange += Math.abs(weightChange) * -0.05; // Slight negative impact
    }

    return {
      return_change: returnChange,
      risk_change: riskChange,
      diversification_change: diversificationChange
    };
  }

  private calculateNextRebalancingDate(): string {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + this.config.min_rebalancing_interval);
    return nextDate.toISOString();
  }
}

/**
 * Factory function for creating portfolio optimization engine
 */
export function createPortfolioOptimizationEngine(
  config: PortfolioOptimizationConfig,
  logger?: any
): PortfolioOptimizationEngine {
  return new PortfolioOptimizationEngine(config, logger);
}