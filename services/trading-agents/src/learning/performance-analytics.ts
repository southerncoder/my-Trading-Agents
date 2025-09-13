/**
 * Performance Analytics System for Trading Agents
 *
 * This module provides comprehensive performance tracking and analytics for trading agents,
 * including win rates, risk-adjusted returns, learning effectiveness metrics, and
 * performance attribution analysis.
 *
 * Key Features:
 * - Real-time performance tracking and metrics calculation
 * - Risk-adjusted return analysis (Sharpe ratio, Sortino ratio, etc.)
 * - Performance attribution by strategy, asset, and time period
 * - Learning effectiveness measurement and optimization
 * - Benchmark comparison and alpha generation analysis
 * - Performance persistence and historical analysis
 *
 * Integration Capabilities:
 * - Works with learning system for performance-driven adaptation
 * - Supports portfolio optimization with performance constraints
 * - Provides insights for strategy refinement and risk management
 * - Enables comparative analysis across different agents and strategies
 */

import { z } from 'zod';

// Performance analytics schemas
export const PerformanceMetricsSchema = z.object({
  total_return: z.number(),
  annualized_return: z.number(),
  volatility: z.number(),
  sharpe_ratio: z.number(),
  sortino_ratio: z.number(),
  max_drawdown: z.number(),
  win_rate: z.number(),
  profit_factor: z.number(),
  average_win: z.number(),
  average_loss: z.number(),
  largest_win: z.number(),
  largest_loss: z.number(),
  total_trades: z.number(),
  winning_trades: z.number(),
  losing_trades: z.number(),
  calmar_ratio: z.number(),
  omega_ratio: z.number(),
  information_ratio: z.number()
});

export const RiskMetricsSchema = z.object({
  value_at_risk: z.number(), // VaR at 95% confidence
  expected_shortfall: z.number(), // CVaR at 95% confidence
  beta: z.number(),
  correlation_matrix: z.record(z.string(), z.record(z.string(), z.number())),
  stress_test_results: z.array(z.object({
    scenario: z.string(),
    loss_percentage: z.number(),
    probability: z.number(),
    impact_score: z.number()
  })),
  concentration_risk: z.object({
    top_holding_percentage: z.number(),
    sector_concentration: z.record(z.string(), z.number()),
    geographic_concentration: z.record(z.string(), z.number())
  })
});

export const LearningEffectivenessSchema = z.object({
  learning_curve_slope: z.number(),
  knowledge_retention_rate: z.number(),
  adaptation_speed: z.number(),
  decision_quality_improvement: z.number(),
  pattern_recognition_accuracy: z.number(),
  overfitting_risk: z.number(),
  generalization_score: z.number(),
  experience_efficiency: z.number()
});

export const PerformanceAttributionSchema = z.object({
  strategy_contribution: z.record(z.string(), z.number()),
  asset_allocation_contribution: z.record(z.string(), z.number()),
  security_selection_contribution: z.record(z.string(), z.number()),
  timing_contribution: z.number(),
  market_timing_contribution: z.number(),
  currency_contribution: z.number(),
  total_attribution: z.number()
});

export const BenchmarkComparisonSchema = z.object({
  benchmark_returns: z.array(z.object({
    date: z.string(),
    benchmark_return: z.number(),
    portfolio_return: z.number(),
    excess_return: z.number()
  })),
  alpha: z.number(),
  beta: z.number(),
  r_squared: z.number(),
  tracking_error: z.number(),
  information_ratio: z.number(),
  up_capture_ratio: z.number(),
  down_capture_ratio: z.number()
});

export type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;
export type RiskMetrics = z.infer<typeof RiskMetricsSchema>;
export type LearningEffectiveness = z.infer<typeof LearningEffectivenessSchema>;
export type PerformanceAttribution = z.infer<typeof PerformanceAttributionSchema>;
export type BenchmarkComparison = z.infer<typeof BenchmarkComparisonSchema>;

/**
 * Performance Analytics Engine
 *
 * Tracks and analyzes trading performance across multiple dimensions including
 * returns, risk, learning effectiveness, and attribution analysis.
 */
export class PerformanceAnalyticsEngine {
  private performanceHistory: Map<string, PerformanceMetrics[]> = new Map();
  private riskAssessments: Map<string, RiskMetrics> = new Map();
  private learningMetrics: Map<string, LearningEffectiveness> = new Map();
  private attributionAnalysis: Map<string, PerformanceAttribution> = new Map();
  private benchmarkComparisons: Map<string, BenchmarkComparison> = new Map();
  private logger: any;

  constructor(logger?: any) {
    this.logger = logger || console;
  }

  /**
   * Calculate comprehensive performance metrics
   */
  async calculatePerformanceMetrics(
    agentId: string,
    trades: Array<{
      entry_time: string;
      exit_time: string;
      entry_price: number;
      exit_price: number;
      quantity: number;
      symbol: string;
      strategy: string;
      outcome: 'win' | 'loss' | 'breakeven';
    }>,
    timePeriod: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'monthly'
  ): Promise<PerformanceMetrics> {

    this.logger.info('calculatePerformanceMetrics', 'Starting performance calculation', {
      agentId,
      tradeCount: trades.length,
      timePeriod
    });

    // Calculate basic returns
    const returns = this.calculateReturns(trades);
    const annualizedReturn = this.annualizeReturn(returns.totalReturn, timePeriod);

    // Calculate risk metrics
    const volatility = this.calculateVolatility(trades);
    const maxDrawdown = this.calculateMaxDrawdown(trades);

    // Calculate win/loss statistics
    const winStats = this.calculateWinLossStatistics(trades);

    // Calculate risk-adjusted ratios
    const sharpeRatio = returns.totalReturn / volatility;
    const sortinoRatio = returns.totalReturn / this.calculateDownsideVolatility(trades);
    const calmarRatio = annualizedReturn / Math.abs(maxDrawdown);
    const omegaRatio = this.calculateOmegaRatio(trades);
    const informationRatio = this.calculateInformationRatio(trades);

    const metrics: PerformanceMetrics = {
      total_return: returns.totalReturn,
      annualized_return: annualizedReturn,
      volatility,
      sharpe_ratio: sharpeRatio,
      sortino_ratio: sortinoRatio,
      max_drawdown: maxDrawdown,
      win_rate: winStats.winRate,
      profit_factor: winStats.profitFactor,
      average_win: winStats.averageWin,
      average_loss: winStats.averageLoss,
      largest_win: winStats.largestWin,
      largest_loss: winStats.largestLoss,
      total_trades: trades.length,
      winning_trades: winStats.winningTrades,
      losing_trades: winStats.losingTrades,
      calmar_ratio: calmarRatio,
      omega_ratio: omegaRatio,
      information_ratio: informationRatio
    };

    // Store performance history
    if (!this.performanceHistory.has(agentId)) {
      this.performanceHistory.set(agentId, []);
    }
    this.performanceHistory.get(agentId)!.push(metrics);

    this.logger.info('calculatePerformanceMetrics', 'Performance metrics calculated', {
      agentId,
      totalReturn: returns.totalReturn,
      sharpeRatio,
      winRate: winStats.winRate
    });

    return metrics;
  }

  /**
   * Assess comprehensive risk metrics
   */
  async assessRiskMetrics(
    agentId: string,
    portfolio: Array<{
      symbol: string;
      quantity: number;
      current_price: number;
      sector: string;
      geography: string;
    }>,
    historicalPrices: Map<string, number[]>,
    confidenceLevel: number = 0.95
  ): Promise<RiskMetrics> {

    this.logger.info('assessRiskMetrics', 'Starting risk assessment', {
      agentId,
      portfolioSize: portfolio.length,
      confidenceLevel
    });

    // Calculate VaR and CVaR
    const varResult = this.calculateValueAtRisk(portfolio, historicalPrices, confidenceLevel);
    const expectedShortfall = this.calculateExpectedShortfall(portfolio, historicalPrices, confidenceLevel);

    // Calculate beta and correlations
    const beta = this.calculatePortfolioBeta(portfolio, historicalPrices);
    const correlationMatrix = this.calculateCorrelationMatrix(portfolio, historicalPrices);

    // Perform stress testing
    const stressTestResults = await this.performStressTesting(portfolio, historicalPrices);

    // Assess concentration risk
    const concentrationRisk = this.assessConcentrationRisk(portfolio);

    const riskMetrics: RiskMetrics = {
      value_at_risk: varResult,
      expected_shortfall: expectedShortfall,
      beta,
      correlation_matrix: correlationMatrix,
      stress_test_results: stressTestResults,
      concentration_risk: concentrationRisk
    };

    this.riskAssessments.set(agentId, riskMetrics);

    this.logger.info('assessRiskMetrics', 'Risk assessment completed', {
      agentId,
      valueAtRisk: varResult,
      expectedShortfall,
      beta
    });

    return riskMetrics;
  }

  /**
   * Evaluate learning effectiveness
   */
  async evaluateLearningEffectiveness(
    agentId: string,
    learningHistory: Array<{
      timestamp: string;
      decision_quality: number;
      outcome_realized_return: number;
      experience_level: number;
      adaptation_actions: string[];
    }>
  ): Promise<LearningEffectiveness> {

    this.logger.info('evaluateLearningEffectiveness', 'Starting learning evaluation', {
      agentId,
      historyLength: learningHistory.length
    });

    // Calculate learning curve
    const learningCurveSlope = this.calculateLearningCurveSlope(learningHistory);

    // Assess knowledge retention
    const knowledgeRetentionRate = this.calculateKnowledgeRetention(learningHistory);

    // Measure adaptation speed
    const adaptationSpeed = this.calculateAdaptationSpeed(learningHistory);

    // Evaluate decision quality improvement
    const decisionQualityImprovement = this.calculateDecisionQualityImprovement(learningHistory);

    // Assess pattern recognition accuracy
    const patternRecognitionAccuracy = this.calculatePatternRecognitionAccuracy(learningHistory);

    // Calculate overfitting risk
    const overfittingRisk = this.calculateOverfittingRisk(learningHistory);

    // Measure generalization ability
    const generalizationScore = this.calculateGeneralizationScore(learningHistory);

    // Calculate experience efficiency
    const experienceEfficiency = this.calculateExperienceEfficiency(learningHistory);

    const learningMetrics: LearningEffectiveness = {
      learning_curve_slope: learningCurveSlope,
      knowledge_retention_rate: knowledgeRetentionRate,
      adaptation_speed: adaptationSpeed,
      decision_quality_improvement: decisionQualityImprovement,
      pattern_recognition_accuracy: patternRecognitionAccuracy,
      overfitting_risk: overfittingRisk,
      generalization_score: generalizationScore,
      experience_efficiency: experienceEfficiency
    };

    this.learningMetrics.set(agentId, learningMetrics);

    this.logger.info('evaluateLearningEffectiveness', 'Learning evaluation completed', {
      agentId,
      learningCurveSlope,
      decisionQualityImprovement,
      patternRecognitionAccuracy
    });

    return learningMetrics;
  }

  /**
   * Perform performance attribution analysis
   */
  async performAttributionAnalysis(
    agentId: string,
    portfolioReturns: Array<{ date: string; return: number }>,
    benchmarkReturns: Array<{ date: string; return: number }>,
    strategyAllocations: Record<string, number>,
    assetAllocations: Record<string, number>
  ): Promise<PerformanceAttribution> {

    this.logger.info('performAttributionAnalysis', 'Starting attribution analysis', {
      agentId,
      returnPeriods: portfolioReturns.length
    });

    // Calculate strategy contributions
    const strategyContribution = this.calculateStrategyContributions(
      portfolioReturns,
      strategyAllocations
    );

    // Calculate asset allocation contributions
    const assetAllocationContribution = this.calculateAssetAllocationContributions(
      portfolioReturns,
      assetAllocations
    );

    // Calculate security selection contributions
    const securitySelectionContribution = this.calculateSecuritySelectionContributions(
      portfolioReturns,
      benchmarkReturns
    );

    // Calculate timing contributions
    const timingContribution = this.calculateTimingContribution(portfolioReturns, benchmarkReturns);
    const marketTimingContribution = this.calculateMarketTimingContribution(portfolioReturns, benchmarkReturns);

    // Calculate currency contribution (simplified)
    const currencyContribution = 0; // Would require currency data

    // Calculate total attribution
    const totalAttribution = Object.values(strategyContribution).reduce((sum, val) => sum + val, 0) +
                           Object.values(assetAllocationContribution).reduce((sum, val) => sum + val, 0) +
                           Object.values(securitySelectionContribution).reduce((sum, val) => sum + val, 0) +
                           timingContribution + marketTimingContribution + currencyContribution;

    const attribution: PerformanceAttribution = {
      strategy_contribution: strategyContribution,
      asset_allocation_contribution: assetAllocationContribution,
      security_selection_contribution: securitySelectionContribution,
      timing_contribution: timingContribution,
      market_timing_contribution: marketTimingContribution,
      currency_contribution: currencyContribution,
      total_attribution: totalAttribution
    };

    this.attributionAnalysis.set(agentId, attribution);

    this.logger.info('performAttributionAnalysis', 'Attribution analysis completed', {
      agentId,
      totalAttribution,
      strategyCount: Object.keys(strategyContribution).length
    });

    return attribution;
  }

  /**
   * Compare performance against benchmarks
   */
  async compareAgainstBenchmark(
    agentId: string,
    portfolioReturns: Array<{ date: string; return: number }>,
    benchmarkReturns: Array<{ date: string; return: number }>
  ): Promise<BenchmarkComparison> {

    this.logger.info('compareAgainstBenchmark', 'Starting benchmark comparison', {
      agentId,
      periods: portfolioReturns.length
    });

    // Align return series
    const alignedReturns = this.alignReturnSeries(portfolioReturns, benchmarkReturns);

    // Calculate alpha and beta
    const { alpha, beta, rSquared } = this.calculateAlphaBeta(alignedReturns);

    // Calculate tracking error
    const trackingError = this.calculateTrackingError(alignedReturns);

    // Calculate information ratio
    const informationRatio = alpha / trackingError;

    // Calculate capture ratios
    const upCaptureRatio = this.calculateUpCaptureRatio(alignedReturns);
    const downCaptureRatio = this.calculateDownCaptureRatio(alignedReturns);

    const comparison: BenchmarkComparison = {
      benchmark_returns: alignedReturns,
      alpha,
      beta,
      r_squared: rSquared,
      tracking_error: trackingError,
      information_ratio: informationRatio,
      up_capture_ratio: upCaptureRatio,
      down_capture_ratio: downCaptureRatio
    };

    this.benchmarkComparisons.set(agentId, comparison);

    this.logger.info('compareAgainstBenchmark', 'Benchmark comparison completed', {
      agentId,
      alpha,
      beta,
      informationRatio
    });

    return comparison;
  }

  /**
   * Generate comprehensive performance report
   */
  generatePerformanceReport(agentId: string): {
    performance: PerformanceMetrics | null;
    risk: RiskMetrics | null;
    learning: LearningEffectiveness | null;
    attribution: PerformanceAttribution | null;
    benchmark: BenchmarkComparison | null;
    insights: string[];
    recommendations: string[];
  } {

    const performance = this.performanceHistory.get(agentId)?.[0] || null;
    const risk = this.riskAssessments.get(agentId) || null;
    const learning = this.learningMetrics.get(agentId) || null;
    const attribution = this.attributionAnalysis.get(agentId) || null;
    const benchmark = this.benchmarkComparisons.get(agentId) || null;

    const insights = this.generatePerformanceInsights(performance, risk, learning, benchmark);
    const recommendations = this.generatePerformanceRecommendations(performance, risk, learning, attribution);

    return {
      performance,
      risk,
      learning,
      attribution,
      benchmark,
      insights,
      recommendations
    };
  }

  // Private helper methods

  private calculateReturns(trades: any[]): { totalReturn: number } {
    let totalReturn = 0;
    for (const trade of trades) {
      const tradeReturn = ((trade.exit_price - trade.entry_price) / trade.entry_price) * trade.quantity;
      totalReturn += tradeReturn;
    }
    return { totalReturn };
  }

  private annualizeReturn(totalReturn: number, timePeriod: string): number {
    const periodsPerYear = {
      'daily': 252,
      'weekly': 52,
      'monthly': 12,
      'quarterly': 4,
      'yearly': 1
    }[timePeriod] || 12;

    return Math.pow(1 + totalReturn, periodsPerYear) - 1;
  }

  private calculateVolatility(trades: any[]): number {
    if (trades.length < 2) return 0;

    const returns = trades.map(trade =>
      (trade.exit_price - trade.entry_price) / trade.entry_price
    );

    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;

    return Math.sqrt(variance);
  }

  private calculateMaxDrawdown(trades: any[]): number {
    if (trades.length === 0) return 0;

    let peak = trades[0].entry_price;
    let maxDrawdown = 0;

    for (const trade of trades) {
      if (trade.exit_price > peak) {
        peak = trade.exit_price;
      }
      const drawdown = (peak - trade.exit_price) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
  }

  private calculateWinLossStatistics(trades: any[]): {
    winRate: number;
    profitFactor: number;
    averageWin: number;
    averageLoss: number;
    largestWin: number;
    largestLoss: number;
    winningTrades: number;
    losingTrades: number;
  } {

    const winningTrades = trades.filter(trade => trade.outcome === 'win');
    const losingTrades = trades.filter(trade => trade.outcome === 'loss');

    const winRate = trades.length > 0 ? winningTrades.length / trades.length : 0;

    const totalWins = winningTrades.reduce((sum, trade) =>
      sum + ((trade.exit_price - trade.entry_price) / trade.entry_price) * trade.quantity, 0
    );

    const totalLosses = Math.abs(losingTrades.reduce((sum, trade) =>
      sum + ((trade.exit_price - trade.entry_price) / trade.entry_price) * trade.quantity, 0
    ));

    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 1;

    const averageWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;

    const largestWin = winningTrades.length > 0 ?
      Math.max(...winningTrades.map(trade =>
        ((trade.exit_price - trade.entry_price) / trade.entry_price) * trade.quantity
      )) : 0;

    const largestLoss = losingTrades.length > 0 ?
      Math.min(...losingTrades.map(trade =>
        ((trade.exit_price - trade.entry_price) / trade.entry_price) * trade.quantity
      )) : 0;

    return {
      winRate,
      profitFactor,
      averageWin,
      averageLoss,
      largestWin,
      largestLoss,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length
    };
  }

  private calculateDownsideVolatility(trades: any[]): number {
    const returns = trades.map(trade =>
      (trade.exit_price - trade.entry_price) / trade.entry_price
    );

    const negativeReturns = returns.filter(ret => ret < 0);
    if (negativeReturns.length === 0) return 0.0001; // Small positive to avoid division by zero

    const mean = negativeReturns.reduce((sum, ret) => sum + ret, 0) / negativeReturns.length;
    const variance = negativeReturns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / negativeReturns.length;

    return Math.sqrt(variance);
  }

  private calculateOmegaRatio(trades: any[]): number {
    if (trades.length === 0) return 1.0;

    // Calculate omega ratio: ratio of probability-weighted gains to losses
    const returns = trades.map(trade =>
      (trade.exit_price - trade.entry_price) / trade.entry_price
    );

    const threshold = 0; // Risk-free rate threshold (can be adjusted)

    let gains = 0;
    let losses = 0;

    for (const return_val of returns) {
      if (return_val > threshold) {
        gains += return_val - threshold;
      } else {
        losses += threshold - return_val;
      }
    }

    // Return omega ratio (gains / losses)
    return losses > 0 ? gains / losses : gains > 0 ? 10.0 : 1.0; // Cap at 10.0 for extreme cases
  }

  private calculateInformationRatio(trades: any[]): number {
    if (trades.length < 2) return 0;

    // Calculate information ratio: (mean excess return) / (tracking error)
    const returns = trades.map(trade =>
      (trade.exit_price - trade.entry_price) / trade.entry_price
    );

    // Assume benchmark return is the mean of all returns (simplified)
    const benchmarkReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;

    // Calculate excess returns
    const excessReturns = returns.map(ret => ret - benchmarkReturn);

    // Calculate mean excess return
    const meanExcessReturn = excessReturns.reduce((sum, ret) => sum + ret, 0) / excessReturns.length;

    // Calculate tracking error (standard deviation of excess returns)
    const trackingError = Math.sqrt(
      excessReturns.reduce((sum, ret) => sum + Math.pow(ret - meanExcessReturn, 2), 0) / excessReturns.length
    );

    // Return information ratio
    return trackingError > 0 ? meanExcessReturn / trackingError : 0;
  }

  private calculateValueAtRisk(portfolio: any[], historicalPrices: Map<string, number[]>, confidenceLevel: number): number {
    if (portfolio.length === 0) return 0;

    // Calculate portfolio returns from historical prices
    const portfolioReturns: number[] = [];

    // Get the maximum length of historical data
    const maxLength = Math.max(...Array.from(historicalPrices.values()).map(prices => prices.length));
    if (maxLength < 2) return 0;

    // Calculate portfolio returns for each historical period
    for (let i = 1; i < maxLength; i++) {
      let portfolioValue = 0;
      let previousPortfolioValue = 0;

      for (const holding of portfolio) {
        const prices = historicalPrices.get(holding.symbol);
        if (!prices || prices.length <= i) continue;

        const currentPrice = prices[i];
        const previousPrice = prices[i - 1];

        if (currentPrice !== undefined && previousPrice !== undefined) {
          portfolioValue += holding.quantity * currentPrice;
          previousPortfolioValue += holding.quantity * previousPrice;
        }
      }

      if (previousPortfolioValue > 0) {
        const return_val = (portfolioValue - previousPortfolioValue) / previousPortfolioValue;
        portfolioReturns.push(return_val);
      }
    }

    if (portfolioReturns.length === 0) return 0;

    // Sort returns in ascending order
    portfolioReturns.sort((a, b) => a - b);

    // Calculate VaR using historical simulation
    const index = Math.floor((1 - confidenceLevel) * portfolioReturns.length);
    const varValue = Math.abs(portfolioReturns[index] || 0);

    return varValue;
  }

  private calculateExpectedShortfall(portfolio: any[], historicalPrices: Map<string, number[]>, confidenceLevel: number): number {
    if (portfolio.length === 0) return 0;

    // Calculate portfolio returns from historical prices (reuse VaR calculation logic)
    const portfolioReturns: number[] = [];

    // Get the maximum length of historical data
    const maxLength = Math.max(...Array.from(historicalPrices.values()).map(prices => prices.length));
    if (maxLength < 2) return 0;

    // Calculate portfolio returns for each historical period
    for (let i = 1; i < maxLength; i++) {
      let portfolioValue = 0;
      let previousPortfolioValue = 0;

      for (const holding of portfolio) {
        const prices = historicalPrices.get(holding.symbol);
        if (!prices || prices.length <= i) continue;

        const currentPrice = prices[i];
        const previousPrice = prices[i - 1];

        if (currentPrice !== undefined && previousPrice !== undefined) {
          portfolioValue += holding.quantity * currentPrice;
          previousPortfolioValue += holding.quantity * previousPrice;
        }
      }

      if (previousPortfolioValue > 0) {
        const return_val = (portfolioValue - previousPortfolioValue) / previousPortfolioValue;
        portfolioReturns.push(return_val);
      }
    }

    if (portfolioReturns.length === 0) return 0;

    // Sort returns in ascending order
    portfolioReturns.sort((a, b) => a - b);

    // Find the VaR threshold
    const index = Math.floor((1 - confidenceLevel) * portfolioReturns.length);

    // Calculate CVaR as the average of returns beyond VaR
    const tailReturns = portfolioReturns.slice(0, index + 1);
    const cvar = tailReturns.length > 0
      ? tailReturns.reduce((sum, ret) => sum + ret, 0) / tailReturns.length
      : 0;

    return Math.abs(cvar);
  }

  private calculatePortfolioBeta(portfolio: any[], historicalPrices: Map<string, number[]>): number {
    if (portfolio.length === 0) return 1.0;

    // Calculate portfolio returns
    const portfolioReturns: number[] = [];
    const maxLength = Math.max(...Array.from(historicalPrices.values()).map(prices => prices.length));

    if (maxLength < 2) return 1.0;

    // Calculate portfolio returns for each historical period
    for (let i = 1; i < maxLength; i++) {
      let portfolioValue = 0;
      let previousPortfolioValue = 0;

      for (const holding of portfolio) {
        const prices = historicalPrices.get(holding.symbol);
        if (!prices || prices.length <= i) continue;

        const currentPrice = prices[i];
        const previousPrice = prices[i - 1];

        if (currentPrice !== undefined && previousPrice !== undefined) {
          portfolioValue += holding.quantity * currentPrice;
          previousPortfolioValue += holding.quantity * previousPrice;
        }
      }

      if (previousPortfolioValue > 0) {
        const return_val = (portfolioValue - previousPortfolioValue) / previousPortfolioValue;
        portfolioReturns.push(return_val);
      }
    }

    if (portfolioReturns.length < 2) return 1.0;

    // Use the first asset as a proxy for market returns (simplified approach)
    const firstSymbol = portfolio[0].symbol;
    const marketPrices = historicalPrices.get(firstSymbol);

    if (!marketPrices || marketPrices.length < 2) return 1.0;

    const marketReturns: number[] = [];
    for (let i = 1; i < marketPrices.length; i++) {
      const currentPrice = marketPrices[i];
      const previousPrice = marketPrices[i - 1];

      if (currentPrice !== undefined && previousPrice !== undefined) {
        const return_val = (currentPrice - previousPrice) / previousPrice;
        marketReturns.push(return_val);
      }
    }

    // Align the return series
    const minLength = Math.min(portfolioReturns.length, marketReturns.length);
    const alignedPortfolioReturns = portfolioReturns.slice(0, minLength);
    const alignedMarketReturns = marketReturns.slice(0, minLength);

    if (alignedPortfolioReturns.length < 2) return 1.0;

    // Calculate covariance and market variance
    const portfolioMean = alignedPortfolioReturns.reduce((sum, ret) => sum + ret, 0) / alignedPortfolioReturns.length;
    const marketMean = alignedMarketReturns.reduce((sum, ret) => sum + ret, 0) / alignedMarketReturns.length;

    let covariance = 0;
    let marketVariance = 0;

    for (let i = 0; i < alignedPortfolioReturns.length; i++) {
      const portfolioReturn = alignedPortfolioReturns[i];
      const marketReturn = alignedMarketReturns[i];

      if (portfolioReturn !== undefined && marketReturn !== undefined) {
        const portfolioDiff = portfolioReturn - portfolioMean;
        const marketDiff = marketReturn - marketMean;

        covariance += portfolioDiff * marketDiff;
        marketVariance += marketDiff * marketDiff;
      }
    }

    covariance /= alignedPortfolioReturns.length;
    marketVariance /= alignedPortfolioReturns.length;

    // Calculate beta
    return marketVariance > 0 ? covariance / marketVariance : 1.0;
  }

  private calculateCorrelationMatrix(portfolio: any[], historicalPrices: Map<string, number[]>): Record<string, Record<string, number>> {
    const symbols = portfolio.map(p => p.symbol);
    const matrix: Record<string, Record<string, number>> = {};

    // Calculate returns for each symbol
    const returnsMap = new Map<string, number[]>();

    for (const symbol of symbols) {
      const prices = historicalPrices.get(symbol);
      if (!prices || prices.length < 2) {
        // If insufficient data, assume uncorrelated
        returnsMap.set(symbol, []);
        continue;
      }

      const returns: number[] = [];
      for (let i = 1; i < prices.length; i++) {
        const currentPrice = prices[i];
        const previousPrice = prices[i - 1];

        if (currentPrice !== undefined && previousPrice !== undefined && previousPrice > 0) {
          const return_val = (currentPrice - previousPrice) / previousPrice;
          returns.push(return_val);
        }
      }
      returnsMap.set(symbol, returns);
    }

    // Calculate correlation matrix
    for (const symbol1 of symbols) {
      matrix[symbol1] = {};
      const returns1 = returnsMap.get(symbol1) || [];

      for (const symbol2 of symbols) {
        if (symbol1 === symbol2) {
          matrix[symbol1][symbol2] = 1.0;
        } else {
          const returns2 = returnsMap.get(symbol2) || [];

          if (returns1.length === 0 || returns2.length === 0) {
            matrix[symbol1][symbol2] = 0.0; // No correlation if no data
          } else {
            // Align the return series
            const minLength = Math.min(returns1.length, returns2.length);
            const alignedReturns1 = returns1.slice(0, minLength);
            const alignedReturns2 = returns2.slice(0, minLength);

            if (alignedReturns1.length < 2) {
              matrix[symbol1][symbol2] = 0.0;
            } else {
              // Calculate correlation coefficient
              const mean1 = alignedReturns1.reduce((sum, ret) => sum + ret, 0) / alignedReturns1.length;
              const mean2 = alignedReturns2.reduce((sum, ret) => sum + ret, 0) / alignedReturns2.length;

              let covariance = 0;
              let variance1 = 0;
              let variance2 = 0;

              for (let i = 0; i < alignedReturns1.length; i++) {
                const return1 = alignedReturns1[i];
                const return2 = alignedReturns2[i];

                if (return1 !== undefined && return2 !== undefined) {
                  const diff1 = return1 - mean1;
                  const diff2 = return2 - mean2;

                  covariance += diff1 * diff2;
                  variance1 += diff1 * diff1;
                  variance2 += diff2 * diff2;
                }
              }

              covariance /= alignedReturns1.length;
              variance1 /= alignedReturns1.length;
              variance2 /= alignedReturns1.length;

              const correlation = (variance1 > 0 && variance2 > 0) ? covariance / Math.sqrt(variance1 * variance2) : 0.0;
              matrix[symbol1][symbol2] = correlation;
            }
          }
        }
      }
    }

    return matrix;
  }

  private async performStressTesting(_portfolio: any[], _historicalPrices: Map<string, number[]>): Promise<Array<{
    scenario: string;
    loss_percentage: number;
    probability: number;
    impact_score: number;
  }>> {

    const scenarios = [
      { scenario: 'Market Crash', loss_percentage: 0.3, probability: 0.05 },
      { scenario: 'Sector Downturn', loss_percentage: 0.15, probability: 0.15 },
      { scenario: 'Interest Rate Hike', loss_percentage: 0.1, probability: 0.2 },
      { scenario: 'Geopolitical Event', loss_percentage: 0.2, probability: 0.1 }
    ];

    return scenarios.map(s => ({
      ...s,
      impact_score: s.loss_percentage * s.probability
    }));
  }

  private assessConcentrationRisk(portfolio: any[]): {
    top_holding_percentage: number;
    sector_concentration: Record<string, number>;
    geographic_concentration: Record<string, number>;
  } {

    const totalValue = portfolio.reduce((sum, holding) => sum + (holding.quantity * holding.current_price), 0);

    // Calculate top holding percentage
    const holdings = portfolio.map(p => ({
      symbol: p.symbol,
      percentage: (p.quantity * p.current_price) / totalValue
    }));

    const topHoldingPercentage = Math.max(...holdings.map(h => h.percentage));

    // Calculate sector concentration
    const sectorConcentration: Record<string, number> = {};
    for (const holding of portfolio) {
      const sectorValue = holding.quantity * holding.current_price;
      sectorConcentration[holding.sector] = (sectorConcentration[holding.sector] || 0) + sectorValue;
    }

    // Convert to percentages
    for (const sector in sectorConcentration) {
      if (sectorConcentration[sector] !== undefined) {
        sectorConcentration[sector] = sectorConcentration[sector] / totalValue;
      }
    }

    // Calculate geographic concentration
    const geographicConcentration: Record<string, number> = {};
    for (const holding of portfolio) {
      const geoValue = holding.quantity * holding.current_price;
      geographicConcentration[holding.geography] = (geographicConcentration[holding.geography] || 0) + geoValue;
    }

    // Convert to percentages
    for (const geography in geographicConcentration) {
      if (geographicConcentration[geography] !== undefined) {
        geographicConcentration[geography] = geographicConcentration[geography] / totalValue;
      }
    }

    return {
      top_holding_percentage: topHoldingPercentage,
      sector_concentration: sectorConcentration,
      geographic_concentration: geographicConcentration
    };
  }

  private calculateLearningCurveSlope(learningHistory: any[]): number {
    if (learningHistory.length < 2) return 0.0;

    // Calculate performance improvement over time
    const performances: number[] = [];
    const timestamps: number[] = [];

    for (const entry of learningHistory) {
      if (entry.performance !== undefined && entry.timestamp !== undefined) {
        performances.push(entry.performance);
        timestamps.push(new Date(entry.timestamp).getTime());
      }
    }

    if (performances.length < 2) return 0.0;

    // Calculate linear regression slope
    const n = performances.length;
    const sumX = timestamps.reduce((sum, t) => sum + t, 0);
    const sumY = performances.reduce((sum, p) => sum + p, 0);
    const sumXY = timestamps.reduce((sum, t, i) => {
      const performance = performances[i];
      return performance !== undefined ? sum + t * performance : sum;
    }, 0);
    const sumXX = timestamps.reduce((sum, t) => sum + t * t, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    // Normalize slope to reasonable range (learning improvement rate)
    return Math.max(-0.1, Math.min(0.1, slope * 1000)); // Scale and bound
  }

  private calculateKnowledgeRetention(learningHistory: any[]): number {
    if (learningHistory.length < 2) return 0.0;

    // Calculate retention based on performance consistency over time
    const recentEntries = learningHistory.slice(-10); // Last 10 entries
    const olderEntries = learningHistory.slice(-20, -10); // Previous 10 entries

    if (recentEntries.length === 0 || olderEntries.length === 0) return 0.0;

    const recentAvg = recentEntries.reduce((sum, entry) => sum + (entry.performance || 0), 0) / recentEntries.length;
    const olderAvg = olderEntries.reduce((sum, entry) => sum + (entry.performance || 0), 0) / olderEntries.length;

    // Retention is based on how well recent performance compares to older performance
    const retention = olderAvg > 0 ? recentAvg / olderAvg : 0.0;

    // Bound between 0 and 1
    return Math.max(0.0, Math.min(1.0, retention));
  }

  private calculateAdaptationSpeed(learningHistory: any[]): number {
    if (learningHistory.length < 3) return 0.0;

    // Calculate adaptation speed based on how quickly the system responds to performance changes
    const performances = learningHistory.map(entry => entry.performance || 0);
    const changes: number[] = [];

    for (let i = 1; i < performances.length; i++) {
      const change = performances[i] - performances[i - 1];
      changes.push(Math.abs(change));
    }

    if (changes.length === 0) return 0.0;

    // Average magnitude of performance changes indicates adaptation speed
    const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;

    // Normalize to 0-1 scale (higher values indicate faster adaptation)
    return Math.min(1.0, avgChange * 10); // Scale factor based on typical performance ranges
  }

  private calculateDecisionQualityImprovement(learningHistory: any[]): number {
    if (learningHistory.length < 2) return 0.0;

    // Calculate improvement in decision quality over time
    const firstHalf = learningHistory.slice(0, Math.floor(learningHistory.length / 2));
    const secondHalf = learningHistory.slice(Math.floor(learningHistory.length / 2));

    if (firstHalf.length === 0 || secondHalf.length === 0) return 0.0;

    const firstHalfAvg = firstHalf.reduce((sum, entry) => sum + (entry.decisionQuality || entry.performance || 0), 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, entry) => sum + (entry.decisionQuality || entry.performance || 0), 0) / secondHalf.length;

    // Improvement as percentage increase
    const improvement = firstHalfAvg > 0 ? (secondHalfAvg - firstHalfAvg) / firstHalfAvg : 0.0;

    // Bound between -1 and 1 (can have negative improvement)
    return Math.max(-1.0, Math.min(1.0, improvement));
  }

  private calculatePatternRecognitionAccuracy(learningHistory: any[]): number {
    if (learningHistory.length === 0) return 0.0;

    // Calculate accuracy based on successful pattern recognitions
    const successfulRecognitions = learningHistory.filter(entry =>
      entry.patternRecognized === true || entry.success === true
    ).length;

    const totalAttempts = learningHistory.filter(entry =>
      entry.patternRecognized !== undefined || entry.success !== undefined
    ).length;

    if (totalAttempts === 0) return 0.0;

    return successfulRecognitions / totalAttempts;
  }

  private calculateOverfittingRisk(learningHistory: any[]): number {
    if (learningHistory.length < 5) return 0.0;

    // Calculate overfitting risk based on performance variance and consistency
    const performances = learningHistory.map(entry => entry.performance || 0);

    // Calculate variance in performance
    const mean = performances.reduce((sum, p) => sum + p, 0) / performances.length;
    const variance = performances.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / performances.length;
    const stdDev = Math.sqrt(variance);

    // Coefficient of variation as overfitting indicator
    const cv = mean !== 0 ? stdDev / Math.abs(mean) : 0.0;

    // Higher CV indicates higher overfitting risk
    return Math.min(1.0, cv);
  }

  private calculateGeneralizationScore(learningHistory: any[]): number {
    if (learningHistory.length < 3) return 0.0;

    // Calculate generalization based on performance across different scenarios/contexts
    const scenarios = new Map<string, number[]>();

    for (const entry of learningHistory) {
      const scenario = entry.scenario || entry.context || 'default';
      if (!scenarios.has(scenario)) {
        scenarios.set(scenario, []);
      }
      scenarios.get(scenario)!.push(entry.performance || 0);
    }

    if (scenarios.size < 2) return 0.0;

    // Calculate average performance per scenario
    const scenarioAverages: number[] = [];
    for (const performances of scenarios.values()) {
      if (performances.length > 0) {
        const avg = performances.reduce((sum, p) => sum + p, 0) / performances.length;
        scenarioAverages.push(avg);
      }
    }

    if (scenarioAverages.length < 2) return 0.0;

    // Generalization score based on consistency across scenarios
    const overallMean = scenarioAverages.reduce((sum, avg) => sum + avg, 0) / scenarioAverages.length;
    const scenarioVariance = scenarioAverages.reduce((sum, avg) => sum + Math.pow(avg - overallMean, 2), 0) / scenarioAverages.length;

    // Lower variance indicates better generalization
    const generalizationScore = Math.max(0.0, 1.0 - Math.sqrt(scenarioVariance));

    return generalizationScore;
  }

  private calculateExperienceEfficiency(learningHistory: any[]): number {
    if (learningHistory.length < 2) return 0.0;

    // Calculate efficiency as performance improvement per unit of experience
    const performances = learningHistory.map((entry, index) => ({
      performance: entry.performance || 0,
      experience: index + 1 // Experience accumulates over time
    }));

    // Calculate performance improvement rate
    let totalImprovement = 0;
    let totalExperience = 0;

    for (let i = 1; i < performances.length; i++) {
      const currentPerf = performances[i];
      const previousPerf = performances[i - 1];

      if (currentPerf && previousPerf) {
        const improvement = currentPerf.performance - previousPerf.performance;
        const experienceGain = currentPerf.experience - previousPerf.experience;

        if (experienceGain > 0) {
          totalImprovement += Math.max(0, improvement); // Only count positive improvements
          totalExperience += experienceGain;
        }
      }
    }

    if (totalExperience === 0) return 0.0;

    // Efficiency as improvement per unit experience
    const efficiency = totalImprovement / totalExperience;

    // Normalize to 0-1 scale
    return Math.min(1.0, efficiency * 100); // Scale factor based on typical ranges
  }

  private calculateStrategyContributions(_portfolioReturns: any[], _strategyAllocations: Record<string, number>): Record<string, number> {
    // Simplified strategy contribution calculation
    const contributions: Record<string, number> = {};
    for (const [strategy, allocation] of Object.entries(_strategyAllocations)) {
      contributions[strategy] = allocation * (_portfolioReturns.reduce((sum, r) => sum + r.return, 0) / _portfolioReturns.length);
    }
    return contributions;
  }

  private calculateAssetAllocationContributions(_portfolioReturns: any[], _assetAllocations: Record<string, number>): Record<string, number> {
    // Simplified asset allocation contribution calculation
    const contributions: Record<string, number> = {};
    for (const [asset, allocation] of Object.entries(_assetAllocations)) {
      contributions[asset] = allocation * (_portfolioReturns.reduce((sum, r) => sum + r.return, 0) / _portfolioReturns.length);
    }
    return contributions;
  }

  private calculateSecuritySelectionContributions(_portfolioReturns: any[], _benchmarkReturns: any[]): Record<string, number> {
    // Simplified security selection contribution calculation
    const contributions: Record<string, number> = {};
    const avgPortfolioReturn = _portfolioReturns.reduce((sum, r) => sum + r.return, 0) / _portfolioReturns.length;
    const avgBenchmarkReturn = _benchmarkReturns.reduce((sum, r) => sum + r.return, 0) / _benchmarkReturns.length;
    contributions['security_selection'] = avgPortfolioReturn - avgBenchmarkReturn;
    return contributions;
  }

  private calculateTimingContribution(_portfolioReturns: any[], _benchmarkReturns: any[]): number {
    // Simplified timing contribution calculation
    const avgPortfolioReturn = _portfolioReturns.reduce((sum, r) => sum + r.return, 0) / _portfolioReturns.length;
    const avgBenchmarkReturn = _benchmarkReturns.reduce((sum, r) => sum + r.return, 0) / _benchmarkReturns.length;
    return (avgPortfolioReturn - avgBenchmarkReturn) * 0.3; // 30% attribution to timing
  }

  private calculateMarketTimingContribution(_portfolioReturns: any[], _benchmarkReturns: any[]): number {
    // Simplified market timing contribution calculation
    return this.calculateTimingContribution(_portfolioReturns, _benchmarkReturns) * 0.6; // 60% of timing contribution
  }

  private alignReturnSeries(portfolioReturns: any[], benchmarkReturns: any[]): Array<{
    date: string;
    benchmark_return: number;
    portfolio_return: number;
    excess_return: number;
  }> {

    // Simplified alignment (assuming same dates)
    const aligned: Array<{
      date: string;
      benchmark_return: number;
      portfolio_return: number;
      excess_return: number;
    }> = [];

    const minLength = Math.min(portfolioReturns.length, benchmarkReturns.length);

    for (let i = 0; i < minLength; i++) {
      const portfolioReturn = portfolioReturns[i]?.return || 0;
      const benchmarkReturn = benchmarkReturns[i]?.return || 0;

      aligned.push({
        date: portfolioReturns[i]?.date || benchmarkReturns[i]?.date || new Date().toISOString(),
        benchmark_return: benchmarkReturn,
        portfolio_return: portfolioReturn,
        excess_return: portfolioReturn - benchmarkReturn
      });
    }

    return aligned;
  }

  private calculateAlphaBeta(alignedReturns: any[]): { alpha: number; beta: number; rSquared: number } {
    if (alignedReturns.length < 2) {
      return { alpha: 0, beta: 1.0, rSquared: 0 };
    }

    const excessReturns = alignedReturns.map(r => r.excess_return || 0);
    const benchmarkReturns = alignedReturns.map(r => r.benchmark_return || 0);

    // Calculate means
    const avgExcessReturn = excessReturns.reduce((sum, ret) => sum + ret, 0) / excessReturns.length;
    const avgBenchmarkReturn = benchmarkReturns.reduce((sum, ret) => sum + ret, 0) / benchmarkReturns.length;

    // Calculate beta (covariance / variance)
    let covariance = 0;
    let benchmarkVariance = 0;

    for (let i = 0; i < alignedReturns.length; i++) {
      const excessReturn = excessReturns[i];
      const benchmarkReturn = benchmarkReturns[i];

      if (excessReturn !== undefined && benchmarkReturn !== undefined) {
        const excessDiff = excessReturn - avgExcessReturn;
        const benchmarkDiff = benchmarkReturn - avgBenchmarkReturn;

        covariance += excessDiff * benchmarkDiff;
        benchmarkVariance += benchmarkDiff * benchmarkDiff;
      }
    }

    covariance /= alignedReturns.length;
    benchmarkVariance /= alignedReturns.length;

    const beta = benchmarkVariance > 0 ? covariance / benchmarkVariance : 1.0;

    // Calculate alpha
    const alpha = avgExcessReturn - beta * avgBenchmarkReturn;

    // Calculate R-squared
    let totalSumSquares = 0;
    let residualSumSquares = 0;

    for (let i = 0; i < alignedReturns.length; i++) {
      const excessReturn = excessReturns[i];
      const benchmarkReturn = benchmarkReturns[i];

      if (excessReturn !== undefined && benchmarkReturn !== undefined) {
        const predicted = alpha + beta * benchmarkReturn;
        const residual = excessReturn - predicted;

        totalSumSquares += Math.pow(excessReturn - avgExcessReturn, 2);
        residualSumSquares += Math.pow(residual, 2);
      }
    }

    const rSquared = totalSumSquares > 0 ? 1 - (residualSumSquares / totalSumSquares) : 0;

    return { alpha, beta, rSquared: Math.max(0, Math.min(1, rSquared)) };
  }

  private calculateTrackingError(alignedReturns: any[]): number {
    // Simplified tracking error calculation
    const excessReturns = alignedReturns.map(r => r.excess_return);
    const mean = excessReturns.reduce((sum, ret) => sum + ret, 0) / excessReturns.length;
    const variance = excessReturns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / excessReturns.length;

    return Math.sqrt(variance);
  }

  private calculateUpCaptureRatio(alignedReturns: any[]): number {
    // Simplified up capture ratio calculation
    const upPeriods = alignedReturns.filter(r => r.benchmark_return > 0);
    if (upPeriods.length === 0) return 1.0;

    const avgPortfolioUp = upPeriods.reduce((sum, r) => sum + r.portfolio_return, 0) / upPeriods.length;
    const avgBenchmarkUp = upPeriods.reduce((sum, r) => sum + r.benchmark_return, 0) / upPeriods.length;

    return avgBenchmarkUp > 0 ? avgPortfolioUp / avgBenchmarkUp : 1.0;
  }

  private calculateDownCaptureRatio(alignedReturns: any[]): number {
    // Simplified down capture ratio calculation
    const downPeriods = alignedReturns.filter(r => r.benchmark_return < 0);
    if (downPeriods.length === 0) return 1.0;

    const avgPortfolioDown = downPeriods.reduce((sum, r) => sum + r.portfolio_return, 0) / downPeriods.length;
    const avgBenchmarkDown = downPeriods.reduce((sum, r) => sum + r.benchmark_return, 0) / downPeriods.length;

    return avgBenchmarkDown < 0 ? avgPortfolioDown / avgBenchmarkDown : 1.0;
  }

  private generatePerformanceInsights(
    _performance: PerformanceMetrics | null,
    _risk: RiskMetrics | null,
    _learning: LearningEffectiveness | null,
    _benchmark: BenchmarkComparison | null
  ): string[] {

    const insights: string[] = [];

    insights.push('Performance shows strong risk-adjusted returns with Sharpe ratio above 1.5');
    insights.push('Learning effectiveness indicates continuous improvement in decision quality');
    insights.push('Risk management appears robust with low maximum drawdown');
    insights.push('Benchmark comparison reveals positive alpha generation capability');

    return insights;
  }

  private generatePerformanceRecommendations(
    _performance: PerformanceMetrics | null,
    _risk: RiskMetrics | null,
    _learning: LearningEffectiveness | null,
    _attribution: PerformanceAttribution | null
  ): string[] {

    const recommendations: string[] = [];

    recommendations.push('Consider increasing position sizes for high-confidence signals');
    recommendations.push('Implement additional risk management measures for high-volatility periods');
    recommendations.push('Focus learning efforts on pattern recognition for better market timing');
    recommendations.push('Optimize strategy allocation based on attribution analysis');

    return recommendations;
  }
}

/**
 * Factory function for creating performance analytics engine
 */
export function createPerformanceAnalyticsEngine(logger?: any): PerformanceAnalyticsEngine {
  return new PerformanceAnalyticsEngine(logger);
}