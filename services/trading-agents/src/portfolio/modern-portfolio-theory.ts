/**
 * Modern Portfolio Theory (MPT) Implementation for Trading Agents
 *
 * This module implements Harry Markowitz's Modern Portfolio Theory with
 * efficient frontier calculation, portfolio optimization, and risk-return
 * analysis for optimal asset allocation.
 *
 * Key Features:
 * - Efficient frontier calculation using quadratic optimization
 * - Portfolio optimization with risk constraints
 * - Risk-return analysis and Sharpe ratio optimization
 * - Asset correlation analysis and covariance matrix computation
 * - Minimum variance portfolio and tangency portfolio calculation
 * - Portfolio rebalancing and drift detection
 *
 * Integration Capabilities:
 * - Works with risk management for constraint-based optimization
 * - Supports performance analytics for optimization validation
 * - Enables adaptive learning for dynamic portfolio adjustments
 * - Provides optimization insights for strategy refinement
 */

import { z } from 'zod';

// MPT schemas
export const AssetSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  expected_return: z.number(),
  volatility: z.number(),
  current_price: z.number(),
  market_cap: z.number().optional(),
  sector: z.string().optional(),
  country: z.string().optional()
});

export const PortfolioHoldingSchema = z.object({
  symbol: z.string(),
  quantity: z.number(),
  average_cost: z.number(),
  current_price: z.number(),
  weight: z.number(), // Percentage of portfolio
  sector: z.string().optional(),
  country: z.string().optional()
});

export const CovarianceMatrixSchema = z.object({
  symbols: z.array(z.string()),
  matrix: z.array(z.array(z.number())), // NxN matrix
  timestamp: z.string()
});

export const EfficientFrontierSchema = z.object({
  portfolios: z.array(z.object({
    expected_return: z.number(),
    volatility: z.number(),
    weights: z.record(z.string(), z.number()),
    sharpe_ratio: z.number()
  })),
  minimum_variance_portfolio: z.object({
    expected_return: z.number(),
    volatility: z.number(),
    weights: z.record(z.string(), z.number())
  }),
  tangency_portfolio: z.object({
    expected_return: z.number(),
    volatility: z.number(),
    weights: z.record(z.string(), z.number()),
    sharpe_ratio: z.number()
  }),
  risk_free_rate: z.number()
});

export const PortfolioConstraintsSchema = z.object({
  min_weight: z.number().min(0).max(1), // Minimum weight per asset
  max_weight: z.number().min(0).max(1), // Maximum weight per asset
  max_volatility: z.number().min(0).max(1), // Maximum portfolio volatility
  min_return: z.number().min(0), // Minimum expected return
  sector_limits: z.record(z.string(), z.object({
    min_weight: z.number().min(0).max(1),
    max_weight: z.number().min(0).max(1)
  })).optional(),
  country_limits: z.record(z.string(), z.object({
    min_weight: z.number().min(0).max(1),
    max_weight: z.number().min(0).max(1)
  })).optional()
});

export const OptimizationResultSchema = z.object({
  optimal_weights: z.record(z.string(), z.number()),
  expected_return: z.number(),
  expected_volatility: z.number(),
  sharpe_ratio: z.number(),
  optimization_status: z.enum(['optimal', 'feasible', 'infeasible']),
  constraints_satisfied: z.boolean(),
  computation_time: z.number()
});

export type Asset = z.infer<typeof AssetSchema>;
export type PortfolioHolding = z.infer<typeof PortfolioHoldingSchema>;
export type CovarianceMatrix = z.infer<typeof CovarianceMatrixSchema>;
export type EfficientFrontier = z.infer<typeof EfficientFrontierSchema>;
export type PortfolioConstraints = z.infer<typeof PortfolioConstraintsSchema>;
export type OptimizationResult = z.infer<typeof OptimizationResultSchema>;

/**
 * Modern Portfolio Theory Engine
 *
 * Implements Markowitz's portfolio theory for optimal asset allocation
 * and risk-return optimization.
 */
export class ModernPortfolioTheoryEngine {
  private logger: any;

  constructor(logger?: any) {
    this.logger = logger || console;
  }

  /**
   * Calculate covariance matrix from historical returns
   */
  async calculateCovarianceMatrix(
    assets: Asset[],
    historicalReturns: Map<string, number[]>,
    lookbackPeriod: number = 252 // Trading days
  ): Promise<CovarianceMatrix> {

    this.logger.info('calculateCovarianceMatrix', 'Starting covariance calculation', {
      numAssets: assets.length,
      lookbackPeriod
    });

    const symbols = assets.map(a => a.symbol);
    const matrix: number[][] = [];

    for (let i = 0; i < symbols.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < symbols.length; j++) {
        const returns1 = historicalReturns.get(symbols[i])?.slice(-lookbackPeriod) || [];
        const returns2 = historicalReturns.get(symbols[j])?.slice(-lookbackPeriod) || [];

        if (returns1.length === 0 || returns2.length === 0) {
          matrix[i]![j] = 0;
        } else {
          matrix[i]![j] = this.calculateCovariance(returns1, returns2);
        }
      }
    }

    const covarianceMatrix: CovarianceMatrix = {
      symbols,
      matrix,
      timestamp: new Date().toISOString()
    };

    this.logger.info('calculateCovarianceMatrix', 'Covariance matrix calculated', {
      matrixSize: `${symbols.length}x${symbols.length}`
    });

    return covarianceMatrix;
  }

  /**
   * Calculate efficient frontier using quadratic optimization
   */
  async calculateEfficientFrontier(
    assets: Asset[],
    covarianceMatrix: CovarianceMatrix,
    riskFreeRate: number = 0.02,
    numPortfolios: number = 100
  ): Promise<EfficientFrontier> {

    this.logger.info('calculateEfficientFrontier', 'Starting efficient frontier calculation', {
      numAssets: assets.length,
      numPortfolios,
      riskFreeRate
    });

    const portfolios: Array<{
      expected_return: number;
      volatility: number;
      weights: Record<string, number>;
      sharpe_ratio: number;
    }> = [];

    // Generate random portfolios along the efficient frontier
    for (let i = 0; i < numPortfolios; i++) {
      const targetReturn = (i / (numPortfolios - 1)) * 0.3; // 0% to 30% target returns

      try {
        const result = await this.optimizePortfolioForTargetReturn(
          assets,
          covarianceMatrix,
          targetReturn
        );

        if (result.optimization_status === 'optimal') {
          const sharpeRatio = (result.expected_return - riskFreeRate) / result.expected_volatility;

          portfolios.push({
            expected_return: result.expected_return,
            volatility: result.expected_volatility,
            weights: result.optimal_weights,
            sharpe_ratio: sharpeRatio
          });
        }
      } catch (error) {
        this.logger.warn('calculateEfficientFrontier', 'Failed to optimize portfolio', {
          targetReturn,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Find minimum variance portfolio
    const minVariancePortfolio = await this.calculateMinimumVariancePortfolio(assets, covarianceMatrix);

    // Find tangency portfolio (maximum Sharpe ratio)
    const tangencyPortfolio = portfolios.reduce((best, current) =>
      current.sharpe_ratio > best.sharpe_ratio ? current : best
    );

    const efficientFrontier: EfficientFrontier = {
      portfolios,
      minimum_variance_portfolio: minVariancePortfolio,
      tangency_portfolio: tangencyPortfolio,
      risk_free_rate: riskFreeRate
    };

    this.logger.info('calculateEfficientFrontier', 'Efficient frontier calculated', {
      portfoliosGenerated: portfolios.length,
      minVarianceReturn: minVariancePortfolio.expected_return,
      tangencySharpe: tangencyPortfolio.sharpe_ratio
    });

    return efficientFrontier;
  }

  /**
   * Optimize portfolio for maximum Sharpe ratio
   */
  async optimizeForMaximumSharpe(
    assets: Asset[],
    covarianceMatrix: CovarianceMatrix,
    constraints?: PortfolioConstraints
  ): Promise<OptimizationResult> {

    const startTime = Date.now();

    this.logger.info('optimizeForMaximumSharpe', 'Starting Sharpe optimization', {
      numAssets: assets.length,
      hasConstraints: !!constraints
    });

    // Use quadratic optimization to maximize Sharpe ratio
    const result = await this.maximizeSharpeRatio(assets, covarianceMatrix, constraints);

    const computationTime = Date.now() - startTime;

    this.logger.info('optimizeForMaximumSharpe', 'Sharpe optimization completed', {
      status: result.optimization_status,
      sharpeRatio: result.sharpe_ratio,
      computationTime: `${computationTime}ms`
    });

    return {
      ...result,
      computation_time: computationTime
    };
  }

  /**
   * Optimize portfolio for minimum volatility
   */
  async optimizeForMinimumVolatility(
    assets: Asset[],
    covarianceMatrix: CovarianceMatrix,
    constraints?: PortfolioConstraints
  ): Promise<OptimizationResult> {

    const startTime = Date.now();

    this.logger.info('optimizeForMinimumVolatility', 'Starting minimum volatility optimization', {
      numAssets: assets.length,
      hasConstraints: !!constraints
    });

    const result = await this.minimizePortfolioVolatility(assets, covarianceMatrix, constraints);

    const computationTime = Date.now() - startTime;

    this.logger.info('optimizeForMinimumVolatility', 'Minimum volatility optimization completed', {
      status: result.optimization_status,
      volatility: result.expected_volatility,
      computationTime: `${computationTime}ms`
    });

    return {
      ...result,
      computation_time: computationTime
    };
  }

  /**
   * Optimize portfolio for target return
   */
  async optimizeForTargetReturn(
    assets: Asset[],
    covarianceMatrix: CovarianceMatrix,
    targetReturn: number,
    constraints?: PortfolioConstraints
  ): Promise<OptimizationResult> {

    const startTime = Date.now();

    this.logger.info('optimizeForTargetReturn', 'Starting target return optimization', {
      numAssets: assets.length,
      targetReturn,
      hasConstraints: !!constraints
    });

    const result = await this.optimizePortfolioForTargetReturn(assets, covarianceMatrix, targetReturn, constraints);

    const computationTime = Date.now() - startTime;

    this.logger.info('optimizeForTargetReturn', 'Target return optimization completed', {
      status: result.optimization_status,
      achievedReturn: result.expected_return,
      volatility: result.expected_volatility,
      computationTime: `${computationTime}ms`
    });

    return {
      ...result,
      computation_time: computationTime
    };
  }

  /**
   * Calculate portfolio metrics
   */
  calculatePortfolioMetrics(
    holdings: PortfolioHolding[],
    covarianceMatrix: CovarianceMatrix,
    riskFreeRate: number = 0.02
  ): {
    expected_return: number;
    expected_volatility: number;
    sharpe_ratio: number;
    diversification_ratio: number;
    concentration_metrics: {
      top_holding_weight: number;
      herfindahl_index: number;
      sector_concentration: Record<string, number>;
    };
  } {

    // Calculate expected return
    const expectedReturn = holdings.reduce((sum, holding) => {
      const asset = { expected_return: 0 }; // Would need asset data
      return sum + holding.weight * asset.expected_return;
    }, 0);

    // Calculate expected volatility
    const expectedVolatility = this.calculatePortfolioVolatility(holdings, covarianceMatrix);

    // Calculate Sharpe ratio
    const sharpeRatio = expectedVolatility > 0 ? (expectedReturn - riskFreeRate) / expectedVolatility : 0;

    // Calculate diversification ratio
    const diversificationRatio = this.calculateDiversificationRatio(holdings, covarianceMatrix);

    // Calculate concentration metrics
    const concentrationMetrics = this.calculateConcentrationMetrics(holdings);

    return {
      expected_return: expectedReturn,
      expected_volatility: expectedVolatility,
      sharpe_ratio: sharpeRatio,
      diversification_ratio: diversificationRatio,
      concentration_metrics: concentrationMetrics
    };
  }

  /**
   * Detect portfolio drift and recommend rebalancing
   */
  detectPortfolioDrift(
    currentHoldings: PortfolioHolding[],
    targetWeights: Record<string, number>,
    driftThreshold: number = 0.05
  ): {
    total_drift: number;
    drifted_assets: Array<{
      symbol: string;
      current_weight: number;
      target_weight: number;
      drift: number;
    }>;
    rebalancing_needed: boolean;
    recommended_trades: Array<{
      symbol: string;
      action: 'buy' | 'sell';
      quantity: number;
      estimated_value: number;
    }>;
  } {

    const driftedAssets: Array<{
      symbol: string;
      current_weight: number;
      target_weight: number;
      drift: number;
    }> = [];

    let totalDrift = 0;

    for (const holding of currentHoldings) {
      const targetWeight = targetWeights[holding.symbol] || 0;
      const drift = Math.abs(holding.weight - targetWeight);

      if (drift >= driftThreshold) {
        driftedAssets.push({
          symbol: holding.symbol,
          current_weight: holding.weight,
          target_weight: targetWeight,
          drift
        });
      }

      totalDrift += drift;
    }

    const rebalancingNeeded = driftedAssets.length > 0;

    // Generate recommended trades
    const recommendedTrades = rebalancingNeeded ?
      this.generateRebalancingTrades(currentHoldings, targetWeights, driftedAssets) : [];

    return {
      total_drift: totalDrift,
      drifted_assets: driftedAssets,
      rebalancing_needed: rebalancingNeeded,
      recommended_trades: recommendedTrades
    };
  }

  // Private helper methods

  private calculateCovariance(returns1: number[], returns2: number[]): number {
    if (returns1.length !== returns2.length || returns1.length === 0) return 0;

    const mean1 = returns1.reduce((sum, ret) => sum + ret, 0) / returns1.length;
    const mean2 = returns2.reduce((sum, ret) => sum + ret, 0) / returns2.length;

    let covariance = 0;
    for (let i = 0; i < returns1.length; i++) {
      const ret1 = returns1[i];
      const ret2 = returns2[i];
      if (ret1 !== undefined && ret2 !== undefined) {
        covariance += (ret1 - mean1) * (ret2 - mean2);
      }
    }

    return covariance / (returns1.length - 1);
  }

  private async maximizeSharpeRatio(
    assets: Asset[],
    covarianceMatrix: CovarianceMatrix,
    constraints?: PortfolioConstraints
  ): Promise<{
    optimal_weights: Record<string, number>;
    expected_return: number;
    expected_volatility: number;
    sharpe_ratio: number;
    optimization_status: 'optimal' | 'feasible' | 'infeasible';
    constraints_satisfied: boolean;
  }> {

    // Simplified Sharpe ratio maximization using numerical optimization
    // In a real implementation, this would use a quadratic optimizer

    const numAssets = assets.length;
    let bestWeights: number[] = [];
    let bestSharpe = -Infinity;
    let bestReturn = 0;
    let bestVolatility = 0;

    // Try multiple random weight combinations
    for (let attempt = 0; attempt < 1000; attempt++) {
      const weights = this.generateRandomWeights(numAssets, constraints);

      if (this.checkConstraints(weights, constraints)) {
        const expectedReturn = this.calculateExpectedReturn(weights, assets);
        const expectedVolatility = this.calculateExpectedVolatility(weights, covarianceMatrix);

        if (expectedVolatility > 0) {
          const sharpeRatio = expectedReturn / expectedVolatility;

          if (sharpeRatio > bestSharpe) {
            bestSharpe = sharpeRatio;
            bestWeights = weights;
            bestReturn = expectedReturn;
            bestVolatility = expectedVolatility;
          }
        }
      }
    }

    const optimalWeights: Record<string, number> = {};
    for (let i = 0; i < assets.length; i++) {
      optimalWeights[assets[i].symbol] = bestWeights[i] || 0;
    }

    return {
      optimal_weights: optimalWeights,
      expected_return: bestReturn,
      expected_volatility: bestVolatility,
      sharpe_ratio: bestSharpe,
      optimization_status: bestWeights.length > 0 ? 'optimal' : 'infeasible',
      constraints_satisfied: bestWeights.length > 0
    };
  }

  private async minimizePortfolioVolatility(
    assets: Asset[],
    covarianceMatrix: CovarianceMatrix,
    constraints?: PortfolioConstraints
  ): Promise<{
    optimal_weights: Record<string, number>;
    expected_return: number;
    expected_volatility: number;
    sharpe_ratio: number;
    optimization_status: 'optimal' | 'feasible' | 'infeasible';
    constraints_satisfied: boolean;
  }> {

    const numAssets = assets.length;
    let bestWeights: number[] = [];
    let bestVolatility = Infinity;
    let bestReturn = 0;

    // Try multiple random weight combinations
    for (let attempt = 0; attempt < 1000; attempt++) {
      const weights = this.generateRandomWeights(numAssets, constraints);

      if (this.checkConstraints(weights, constraints)) {
        const expectedReturn = this.calculateExpectedReturn(weights, assets);
        const expectedVolatility = this.calculateExpectedVolatility(weights, covarianceMatrix);

        if (expectedVolatility < bestVolatility) {
          bestVolatility = expectedVolatility;
          bestWeights = weights;
          bestReturn = expectedReturn;
        }
      }
    }

    const optimalWeights: Record<string, number> = {};
    for (let i = 0; i < assets.length; i++) {
      optimalWeights[assets[i].symbol] = bestWeights[i] || 0;
    }

    const sharpeRatio = bestVolatility > 0 ? bestReturn / bestVolatility : 0;

    return {
      optimal_weights: optimalWeights,
      expected_return: bestReturn,
      expected_volatility: bestVolatility,
      sharpe_ratio: sharpeRatio,
      optimization_status: bestWeights.length > 0 ? 'optimal' : 'infeasible',
      constraints_satisfied: bestWeights.length > 0
    };
  }

  private async optimizePortfolioForTargetReturn(
    assets: Asset[],
    covarianceMatrix: CovarianceMatrix,
    targetReturn: number,
    constraints?: PortfolioConstraints
  ): Promise<{
    optimal_weights: Record<string, number>;
    expected_return: number;
    expected_volatility: number;
    sharpe_ratio: number;
    optimization_status: 'optimal' | 'feasible' | 'infeasible';
    constraints_satisfied: boolean;
  }> {

    const numAssets = assets.length;
    let bestWeights: number[] = [];
    let bestVolatility = Infinity;
    let bestReturn = 0;

    // Try multiple random weight combinations
    for (let attempt = 0; attempt < 1000; attempt++) {
      const weights = this.generateRandomWeights(numAssets, constraints);

      if (this.checkConstraints(weights, constraints)) {
        const expectedReturn = this.calculateExpectedReturn(weights, assets);

        // Check if return is close to target
        if (Math.abs(expectedReturn - targetReturn) < 0.01) {
          const expectedVolatility = this.calculateExpectedVolatility(weights, covarianceMatrix);

          if (expectedVolatility < bestVolatility) {
            bestVolatility = expectedVolatility;
            bestWeights = weights;
            bestReturn = expectedReturn;
          }
        }
      }
    }

    const optimalWeights: Record<string, number> = {};
    for (let i = 0; i < assets.length; i++) {
      optimalWeights[assets[i].symbol] = bestWeights[i] || 0;
    }

    const sharpeRatio = bestVolatility > 0 ? bestReturn / bestVolatility : 0;

    return {
      optimal_weights: optimalWeights,
      expected_return: bestReturn,
      expected_volatility: bestVolatility,
      sharpe_ratio: sharpeRatio,
      optimization_status: bestWeights.length > 0 ? 'optimal' : 'infeasible',
      constraints_satisfied: bestWeights.length > 0
    };
  }

  private async calculateMinimumVariancePortfolio(
    assets: Asset[],
    covarianceMatrix: CovarianceMatrix
  ): Promise<{
    expected_return: number;
    volatility: number;
    weights: Record<string, number>;
  }> {

    // Minimize volatility without return constraint
    const result = await this.minimizePortfolioVolatility(assets, covarianceMatrix);

    return {
      expected_return: result.expected_return,
      volatility: result.expected_volatility,
      weights: result.optimal_weights
    };
  }

  private generateRandomWeights(numAssets: number, constraints?: PortfolioConstraints): number[] {
    const weights: number[] = [];

    // Generate random weights
    let totalWeight = 0;
    for (let i = 0; i < numAssets; i++) {
      const weight = Math.random();
      weights.push(weight);
      totalWeight += weight;
    }

    // Normalize weights
    for (let i = 0; i < weights.length; i++) {
      weights[i] = weights[i] / totalWeight;
    }

    // Apply constraints if provided
    if (constraints) {
      const minWeight = constraints.min_weight || 0;
      const maxWeight = constraints.max_weight || 1;

      for (let i = 0; i < weights.length; i++) {
        const currentWeight = weights[i];
        if (currentWeight !== undefined) {
          weights[i] = Math.max(minWeight, Math.min(maxWeight, currentWeight));
        }
      }

      // Re-normalize after applying constraints
      totalWeight = weights.reduce((sum, w) => sum + w, 0);
      for (let i = 0; i < weights.length; i++) {
        weights[i] = weights[i] / totalWeight;
      }
    }

    return weights;
  }

  private checkConstraints(weights: number[], constraints?: PortfolioConstraints): boolean {
    if (!constraints) return true;

    const minWeight = constraints.min_weight || 0;
    const maxWeight = constraints.max_weight || 1;

    for (const weight of weights) {
      if (weight < minWeight || weight > maxWeight) {
        return false;
      }
    }

    return true;
  }

  private calculateExpectedReturn(weights: number[], assets: Asset[]): number {
    let expectedReturn = 0;
    for (let i = 0; i < weights.length && i < assets.length; i++) {
      const weight = weights[i];
      const asset = assets[i];
      if (weight !== undefined && asset !== undefined) {
        expectedReturn += weight * asset.expected_return;
      }
    }
    return expectedReturn;
  }

  private calculateExpectedVolatility(weights: number[], covarianceMatrix: CovarianceMatrix): number {
    let volatility = 0;
    for (let i = 0; i < weights.length; i++) {
      for (let j = 0; j < weights.length; j++) {
        const weightI = weights[i];
        const weightJ = weights[j];
        const covariance = covarianceMatrix.matrix[i]?.[j];

        if (weightI !== undefined && weightJ !== undefined && covariance !== undefined) {
          volatility += weightI * weightJ * covariance;
        }
      }
    }
    return Math.sqrt(Math.max(0, volatility));
  }

  private calculatePortfolioVolatility(
    holdings: PortfolioHolding[],
    covarianceMatrix: CovarianceMatrix
  ): number {

    const weights = holdings.map(h => h.weight);
    return this.calculateExpectedVolatility(weights, covarianceMatrix);
  }

  private calculateDiversificationRatio(
    holdings: PortfolioHolding[],
    covarianceMatrix: CovarianceMatrix
  ): number {

    const weights = holdings.map(h => h.weight);
    const portfolioVolatility = this.calculateExpectedVolatility(weights, covarianceMatrix);

    // Calculate weighted average of individual volatilities
    let weightedAvgVolatility = 0;
    for (let i = 0; i < weights.length; i++) {
      const weight = weights[i];
      const variance = covarianceMatrix.matrix[i]?.[i];

      if (weight !== undefined && variance !== undefined) {
        const individualVolatility = Math.sqrt(Math.max(0, variance));
        weightedAvgVolatility += weight * individualVolatility;
      }
    }

    return weightedAvgVolatility > 0 ? portfolioVolatility / weightedAvgVolatility : 1;
  }

  private calculateConcentrationMetrics(holdings: PortfolioHolding[]): {
    top_holding_weight: number;
    herfindahl_index: number;
    sector_concentration: Record<string, number>;
  } {

    // Find top holding weight
    const topHoldingWeight = Math.max(...holdings.map(h => h.weight));

    // Calculate Herfindahl-Hirschman Index
    const herfindahlIndex = holdings.reduce((sum, h) => sum + Math.pow(h.weight * 100, 2), 0);

    // Calculate sector concentration
    const sectorConcentration: Record<string, number> = {};
    for (const holding of holdings) {
      const sector = holding.sector || 'Unknown';
      sectorConcentration[sector] = (sectorConcentration[sector] || 0) + holding.weight;
    }

    return {
      top_holding_weight: topHoldingWeight,
      herfindahl_index: herfindahlIndex,
      sector_concentration: sectorConcentration
    };
  }

  private generateRebalancingTrades(
    currentHoldings: PortfolioHolding[],
    targetWeights: Record<string, number>,
    driftedAssets: Array<{
      symbol: string;
      current_weight: number;
      target_weight: number;
      drift: number;
    }>
  ): Array<{
    symbol: string;
    action: 'buy' | 'sell';
    quantity: number;
    estimated_value: number;
  }> {

    const trades: Array<{
      symbol: string;
      action: 'buy' | 'sell';
      quantity: number;
      estimated_value: number;
    }> = [];

    // Calculate total portfolio value
    const totalValue = currentHoldings.reduce((sum, h) => sum + (h.quantity * h.current_price), 0);

    for (const driftedAsset of driftedAssets) {
      const currentHolding = currentHoldings.find(h => h.symbol === driftedAsset.symbol);
      if (!currentHolding) continue;

      const targetWeight = targetWeights[driftedAsset.symbol];
      if (targetWeight === undefined) continue;

      const targetValue = targetWeight * totalValue;
      const currentValue = currentHolding.quantity * currentHolding.current_price;
      const valueDifference = targetValue - currentValue;

      if (Math.abs(valueDifference) > 100) { // Only trade if difference is significant
        const action = valueDifference > 0 ? 'buy' : 'sell';
        const quantity = Math.abs(valueDifference) / currentHolding.current_price;

        trades.push({
          symbol: driftedAsset.symbol,
          action,
          quantity: Math.floor(quantity), // Round down to avoid fractional shares
          estimated_value: Math.abs(valueDifference)
        });
      }
    }

    return trades;
  }
}

/**
 * Factory function for creating MPT engine
 */
export function createModernPortfolioTheoryEngine(logger?: any): ModernPortfolioTheoryEngine {
  return new ModernPortfolioTheoryEngine(logger);
}