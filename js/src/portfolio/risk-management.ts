/**
 * Risk Management Engine for Portfolio Optimization
 *
 * This module provides comprehensive risk management capabilities
 * for portfolio optimization, including Value at Risk (VaR) calculation,
 * stress testing, risk-adjusted performance metrics, and risk budgeting.
 *
 * Key Features:
 * - Value at Risk (VaR) calculation using multiple methods
 * - Expected Shortfall (ES) and Conditional VaR
 * - Stress testing with historical scenarios
 * - Risk decomposition and attribution
 * - Risk budgeting and allocation constraints
 * - Dynamic risk limits based on market conditions
 *
 * Integration Capabilities:
 * - Works with portfolio optimization for risk-constrained optimization
 * - Integrates with performance analytics for risk-adjusted metrics
 * - Supports adaptive learning for dynamic risk management
 * - Provides risk insights for strategy refinement
 */

import { z } from 'zod';

// Risk management schemas
export const RiskMetricsSchema = z.object({
  value_at_risk: z.number(), // VaR at specified confidence level
  expected_shortfall: z.number(), // Expected Shortfall (ES)
  volatility: z.number(), // Portfolio volatility
  sharpe_ratio: z.number(), // Risk-adjusted return
  sortino_ratio: z.number(), // Downside risk-adjusted return
  maximum_drawdown: z.number(), // Maximum drawdown
  beta: z.number(), // Market beta
  alpha: z.number(), // Jensen's alpha
  tracking_error: z.number(), // Tracking error vs benchmark
  information_ratio: z.number() // Risk-adjusted active return
});

export const VaRCalculationSchema = z.object({
  method: z.enum(['historical', 'parametric', 'monte_carlo']),
  confidence_level: z.number().min(0.9).max(0.99).default(0.95),
  time_horizon: z.number().min(1).max(252).default(1), // Trading days
  value_at_risk: z.number(),
  expected_shortfall: z.number(),
  calculation_timestamp: z.string(),
  assumptions: z.record(z.string(), z.any())
});

export const StressTestScenarioSchema = z.object({
  name: z.string(),
  description: z.string(),
  shock_type: z.enum(['market_crash', 'volatility_spike', 'interest_rate_change', 'currency_crisis', 'sector_specific', 'custom']),
  shock_parameters: z.record(z.string(), z.number()),
  probability: z.number().min(0).max(1),
  impact: z.object({
    portfolio_return: z.number(),
    portfolio_volatility: z.number(),
    value_at_risk: z.number(),
    drawdown: z.number()
  }),
  recovery_time: z.number() // Days to recover
});

export const RiskBudgetSchema = z.object({
  total_risk_budget: z.number(), // Total risk allocation
  asset_risk_budgets: z.record(z.string(), z.number()), // Risk budget per asset
  risk_contributions: z.record(z.string(), z.number()), // Actual risk contribution
  risk_budget_utilization: z.number(), // Percentage of budget used
  rebalancing_required: z.boolean(),
  risk_limit_breaches: z.array(z.object({
    asset: z.string(),
    current_risk: z.number(),
    risk_limit: z.number(),
    breach_percentage: z.number()
  }))
});

export const RiskLimitsSchema = z.object({
  max_portfolio_volatility: z.number().min(0).max(1),
  max_value_at_risk: z.number().min(0).max(1),
  max_drawdown_limit: z.number().min(0).max(1),
  max_concentration_limit: z.number().min(0).max(1), // Max weight per asset
  min_diversification_ratio: z.number().min(0).max(1),
  stress_test_threshold: z.number().min(0).max(1), // Max acceptable stress loss
  dynamic_limits: z.boolean().default(true),
  market_regime_adjustments: z.record(z.string(), z.object({
    volatility_multiplier: z.number(),
    var_multiplier: z.number(),
    concentration_multiplier: z.number()
  }))
});

export type RiskMetrics = z.infer<typeof RiskMetricsSchema>;
export type VaRCalculation = z.infer<typeof VaRCalculationSchema>;
export type StressTestScenario = z.infer<typeof StressTestScenarioSchema>;
export type RiskBudget = z.infer<typeof RiskBudgetSchema>;
export type RiskLimits = z.infer<typeof RiskLimitsSchema>;

/**
 * Risk Management Engine
 *
 * Provides comprehensive risk management for portfolio optimization
 * with VaR calculation, stress testing, and risk budgeting capabilities.
 */
export class RiskManagementEngine {
  private logger: any;
  private riskLimits: RiskLimits;

  constructor(
    riskLimits: RiskLimits,
    logger?: any
  ) {
    this.riskLimits = riskLimits;
    this.logger = logger || console;
  }

  /**
   * Calculate comprehensive risk metrics for a portfolio
   */
  async calculateRiskMetrics(
    portfolioWeights: Record<string, number>,
    historicalReturns: Map<string, number[]>,
    benchmarkReturns?: number[],
    riskFreeRate: number = 0.02
  ): Promise<RiskMetrics> {

    this.logger.info('calculateRiskMetrics', 'Starting comprehensive risk calculation', {
      numAssets: Object.keys(portfolioWeights).length,
      hasBenchmark: !!benchmarkReturns
    });

    const startTime = Date.now();

    // Calculate portfolio returns
    const portfolioReturns = this.calculatePortfolioReturns(portfolioWeights, historicalReturns);

    // Calculate VaR and Expected Shortfall
    const varCalculation = await this.calculateVaR(portfolioReturns, {
      method: 'historical',
      confidence_level: 0.95,
      time_horizon: 1
    });

    // Calculate volatility
    const volatility = this.calculateVolatility(portfolioReturns);

    // Calculate Sharpe ratio
    const avgReturn = portfolioReturns.reduce((sum, ret) => sum + ret, 0) / portfolioReturns.length;
    const annualizedReturn = avgReturn * 252; // Annualize
    const annualizedVolatility = volatility * Math.sqrt(252);
    const sharpeRatio = annualizedVolatility > 0 ? (annualizedReturn - riskFreeRate) / annualizedVolatility : 0;

    // Calculate Sortino ratio (downside deviation)
    const downsideReturns = portfolioReturns.filter(ret => ret < 0);
    const downsideDeviation = downsideReturns.length > 0 ?
      Math.sqrt(downsideReturns.reduce((sum, ret) => sum + ret * ret, 0) / downsideReturns.length) : 0;
    const sortinoRatio = downsideDeviation > 0 ? (annualizedReturn - riskFreeRate) / (downsideDeviation * Math.sqrt(252)) : 0;

    // Calculate maximum drawdown
    const maxDrawdown = this.calculateMaximumDrawdown(portfolioReturns);

    // Calculate beta and alpha if benchmark is provided
    let beta = 1;
    let alpha = 0;
    let trackingError = 0;
    let informationRatio = 0;

    if (benchmarkReturns) {
      const betaAlpha = this.calculateBetaAlpha(portfolioReturns, benchmarkReturns, riskFreeRate);
      beta = betaAlpha.beta;
      alpha = betaAlpha.alpha;
      trackingError = betaAlpha.tracking_error;
      informationRatio = trackingError > 0 ? alpha / trackingError : 0;
    }

    const riskMetrics: RiskMetrics = {
      value_at_risk: varCalculation.value_at_risk,
      expected_shortfall: varCalculation.expected_shortfall,
      volatility: annualizedVolatility,
      sharpe_ratio: sharpeRatio,
      sortino_ratio: sortinoRatio,
      maximum_drawdown: maxDrawdown,
      beta,
      alpha,
      tracking_error: trackingError,
      information_ratio: informationRatio
    };

    const computationTime = Date.now() - startTime;
    this.logger.info('calculateRiskMetrics', 'Risk metrics calculated', {
      sharpeRatio: sharpeRatio.toFixed(3),
      volatility: (annualizedVolatility * 100).toFixed(1) + '%',
      maxDrawdown: (maxDrawdown * 100).toFixed(1) + '%',
      computationTime: `${computationTime}ms`
    });

    return riskMetrics;
  }

  /**
   * Calculate Value at Risk using multiple methods
   */
  async calculateVaR(
    portfolioReturns: number[],
    config: {
      method: 'historical' | 'parametric' | 'monte_carlo';
      confidence_level: number;
      time_horizon: number;
    }
  ): Promise<VaRCalculation> {

    this.logger.info('calculateVaR', 'Starting VaR calculation', {
      method: config.method,
      confidenceLevel: config.confidence_level,
      timeHorizon: config.time_horizon
    });

    let valueAtRisk: number;
    let expectedShortfall: number;
    const assumptions: Record<string, any> = {
      method: config.method,
      confidence_level: config.confidence_level,
      time_horizon: config.time_horizon,
      data_points: portfolioReturns.length
    };

    switch (config.method) {
      case 'historical': {
        const result = this.calculateHistoricalVaR(portfolioReturns, config.confidence_level);
        valueAtRisk = result.var;
        expectedShortfall = result.es;
        assumptions.historical_window = portfolioReturns.length;
        break;
      }

      case 'parametric': {
        const parametricResult = this.calculateParametricVaR(portfolioReturns, config.confidence_level);
        valueAtRisk = parametricResult.var;
        expectedShortfall = parametricResult.es;
        assumptions.distribution = 'normal';
        assumptions.mean = parametricResult.mean;
        assumptions.std = parametricResult.std;
        break;
      }

      case 'monte_carlo': {
        const mcResult = await this.calculateMonteCarloVaR(portfolioReturns, config);
        valueAtRisk = mcResult.var;
        expectedShortfall = mcResult.es;
        assumptions.simulations = 10000;
        break;
      }

      default:
        throw new Error(`Unsupported VaR method: ${config.method}`);
    }

    // Scale for time horizon
    const scaledVaR = valueAtRisk * Math.sqrt(config.time_horizon);
    const scaledES = expectedShortfall * Math.sqrt(config.time_horizon);

    const varCalculation: VaRCalculation = {
      method: config.method,
      confidence_level: config.confidence_level,
      time_horizon: config.time_horizon,
      value_at_risk: scaledVaR,
      expected_shortfall: scaledES,
      calculation_timestamp: new Date().toISOString(),
      assumptions
    };

    this.logger.info('calculateVaR', 'VaR calculation completed', {
      method: config.method,
      var: (scaledVaR * 100).toFixed(2) + '%',
      es: (scaledES * 100).toFixed(2) + '%'
    });

    return varCalculation;
  }

  /**
   * Perform stress testing with predefined scenarios
   */
  async performStressTest(
    portfolioWeights: Record<string, number>,
    scenarios: StressTestScenario[],
    historicalReturns: Map<string, number[]>
  ): Promise<{
    scenario_results: Array<{
      scenario: StressTestScenario;
      portfolio_impact: {
        return_impact: number;
        volatility_impact: number;
        var_impact: number;
        drawdown_impact: number;
      };
      risk_assessment: 'low' | 'medium' | 'high' | 'critical';
    }>;
    overall_risk_assessment: {
      worst_case_loss: number;
      probability_weighted_loss: number;
      stress_test_passed: boolean;
      recommended_actions: string[];
    };
  }> {

    this.logger.info('performStressTest', 'Starting stress test analysis', {
      numScenarios: scenarios.length,
      numAssets: Object.keys(portfolioWeights).length
    });

    const scenarioResults: Array<{
      scenario: StressTestScenario;
      portfolio_impact: {
        return_impact: number;
        volatility_impact: number;
        var_impact: number;
        drawdown_impact: number;
      };
      risk_assessment: 'low' | 'medium' | 'high' | 'critical';
    }> = [];

    let worstCaseLoss = 0;
    let probabilityWeightedLoss = 0;

    for (const scenario of scenarios) {
      const impact = await this.simulateScenarioImpact(
        portfolioWeights,
        scenario,
        historicalReturns
      );

      // Assess risk level
      let riskAssessment: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (impact.return_impact < -0.15) riskAssessment = 'critical';
      else if (impact.return_impact < -0.10) riskAssessment = 'high';
      else if (impact.return_impact < -0.05) riskAssessment = 'medium';

      scenarioResults.push({
        scenario,
        portfolio_impact: impact,
        risk_assessment: riskAssessment
      });

      // Update overall metrics
      worstCaseLoss = Math.min(worstCaseLoss, impact.return_impact);
      probabilityWeightedLoss += impact.return_impact * scenario.probability;
    }

    // Determine if stress test passed
    const stressTestPassed = Math.abs(worstCaseLoss) <= this.riskLimits.stress_test_threshold;

    // Generate recommended actions
    const recommendedActions = this.generateStressTestRecommendations(
      scenarioResults,
      stressTestPassed
    );

    const overallRiskAssessment = {
      worst_case_loss: worstCaseLoss,
      probability_weighted_loss: probabilityWeightedLoss,
      stress_test_passed: stressTestPassed,
      recommended_actions: recommendedActions
    };

    this.logger.info('performStressTest', 'Stress test completed', {
      worstCaseLoss: (worstCaseLoss * 100).toFixed(2) + '%',
      probabilityWeightedLoss: (probabilityWeightedLoss * 100).toFixed(2) + '%',
      stressTestPassed,
      numHighRiskScenarios: scenarioResults.filter(r => r.risk_assessment === 'high' || r.risk_assessment === 'critical').length
    });

    return {
      scenario_results: scenarioResults,
      overall_risk_assessment: overallRiskAssessment
    };
  }

  /**
   * Perform risk budgeting and allocation analysis
   */
  async performRiskBudgeting(
    portfolioWeights: Record<string, number>,
    covarianceMatrix: Array<Array<number>>,
    totalRiskBudget: number
  ): Promise<RiskBudget> {

    this.logger.info('performRiskBudgeting', 'Starting risk budgeting analysis', {
      numAssets: Object.keys(portfolioWeights).length,
      totalRiskBudget: (totalRiskBudget * 100).toFixed(1) + '%'
    });

    // Calculate risk contributions using Euler's theorem
    const riskContributions = this.calculateRiskContributions(portfolioWeights, covarianceMatrix);

    // Calculate portfolio volatility
    const _portfolioVolatility = this.calculatePortfolioVolatilityFromWeights(portfolioWeights, covarianceMatrix);

    // Calculate risk budget utilization
    const totalRiskContribution = Object.values(riskContributions).reduce((sum, contrib) => sum + contrib, 0);
    const riskBudgetUtilization = totalRiskContribution / totalRiskBudget;

    // Check for risk limit breaches
    const riskLimitBreaches: Array<{
      asset: z.infer<typeof RiskBudgetSchema>['risk_limit_breaches'][0];
    }> = [];

    for (const [asset, contribution] of Object.entries(riskContributions)) {
      const assetBudget = totalRiskBudget * (portfolioWeights[asset] || 0);
      if (contribution > assetBudget * 1.1) { // 10% over budget
        riskLimitBreaches.push({
          asset: {
            asset,
            current_risk: contribution,
            risk_limit: assetBudget,
            breach_percentage: (contribution - assetBudget) / assetBudget
          }
        });
      }
    }

    const riskBudget: RiskBudget = {
      total_risk_budget: totalRiskBudget,
      asset_risk_budgets: Object.fromEntries(
        Object.keys(portfolioWeights).map(asset => [
          asset,
          totalRiskBudget * (portfolioWeights[asset] || 0)
        ])
      ),
      risk_contributions: riskContributions,
      risk_budget_utilization: riskBudgetUtilization,
      rebalancing_required: riskLimitBreaches.length > 0,
      risk_limit_breaches: riskLimitBreaches.map(item => item.asset)
    };

    this.logger.info('performRiskBudgeting', 'Risk budgeting completed', {
      riskBudgetUtilization: (riskBudgetUtilization * 100).toFixed(1) + '%',
      rebalancingRequired: riskBudget.rebalancing_required,
      numBreaches: riskLimitBreaches.length
    });

    return riskBudget;
  }

  /**
   * Check if portfolio complies with risk limits
   */
  checkRiskLimits(
    riskMetrics: RiskMetrics,
    portfolioWeights: Record<string, number>
  ): {
    compliant: boolean;
    breaches: Array<{
      limit_type: string;
      current_value: number;
      limit_value: number;
      breach_severity: 'minor' | 'moderate' | 'severe';
    }>;
    recommended_actions: string[];
  } {

    const breaches: Array<{
      limit_type: string;
      current_value: number;
      limit_value: number;
      breach_severity: 'minor' | 'moderate' | 'severe';
    }> = [];

    // Check volatility limit
    if (riskMetrics.volatility > this.riskLimits.max_portfolio_volatility) {
      breaches.push({
        limit_type: 'portfolio_volatility',
        current_value: riskMetrics.volatility,
        limit_value: this.riskLimits.max_portfolio_volatility,
        breach_severity: riskMetrics.volatility > this.riskLimits.max_portfolio_volatility * 1.2 ? 'severe' : 'moderate'
      });
    }

    // Check VaR limit
    if (Math.abs(riskMetrics.value_at_risk) > this.riskLimits.max_value_at_risk) {
      breaches.push({
        limit_type: 'value_at_risk',
        current_value: Math.abs(riskMetrics.value_at_risk),
        limit_value: this.riskLimits.max_value_at_risk,
        breach_severity: Math.abs(riskMetrics.value_at_risk) > this.riskLimits.max_value_at_risk * 1.2 ? 'severe' : 'moderate'
      });
    }

    // Check drawdown limit
    if (riskMetrics.maximum_drawdown > this.riskLimits.max_drawdown_limit) {
      breaches.push({
        limit_type: 'maximum_drawdown',
        current_value: riskMetrics.maximum_drawdown,
        limit_value: this.riskLimits.max_drawdown_limit,
        breach_severity: riskMetrics.maximum_drawdown > this.riskLimits.max_drawdown_limit * 1.2 ? 'severe' : 'moderate'
      });
    }

    // Check concentration limits
    const maxWeight = Math.max(...Object.values(portfolioWeights));
    if (maxWeight > this.riskLimits.max_concentration_limit) {
      breaches.push({
        limit_type: 'concentration_limit',
        current_value: maxWeight,
        limit_value: this.riskLimits.max_concentration_limit,
        breach_severity: maxWeight > this.riskLimits.max_concentration_limit * 1.2 ? 'severe' : 'moderate'
      });
    }

    const compliant = breaches.length === 0;
    const recommendedActions = this.generateRiskLimitRecommendations(breaches);

    this.logger.info('checkRiskLimits', 'Risk limit check completed', {
      compliant,
      numBreaches: breaches.length,
      severeBreaches: breaches.filter(b => b.breach_severity === 'severe').length
    });

    return {
      compliant,
      breaches,
      recommended_actions: recommendedActions
    };
  }

  /**
   * Update risk limits based on market conditions
   */
  updateRiskLimits(marketConditions: {
    volatility_regime: 'low' | 'normal' | 'high';
    market_stress: 'low' | 'moderate' | 'high';
  }): void {

    if (!this.riskLimits.dynamic_limits) return;

    const regimeAdjustment = this.riskLimits.market_regime_adjustments[marketConditions.volatility_regime];

    if (regimeAdjustment) {
      this.riskLimits.max_portfolio_volatility *= regimeAdjustment.volatility_multiplier;
      this.riskLimits.max_value_at_risk *= regimeAdjustment.var_multiplier;
      this.riskLimits.max_concentration_limit *= regimeAdjustment.concentration_multiplier;
    }

    // Additional adjustments based on market stress
    switch (marketConditions.market_stress) {
      case 'high':
        this.riskLimits.max_portfolio_volatility *= 0.8; // Reduce volatility limit
        this.riskLimits.max_value_at_risk *= 0.8; // Reduce VaR limit
        break;
      case 'moderate':
        this.riskLimits.max_portfolio_volatility *= 0.9;
        this.riskLimits.max_value_at_risk *= 0.9;
        break;
    }

    this.logger.info('updateRiskLimits', 'Risk limits updated for market conditions', {
      volatilityRegime: marketConditions.volatility_regime,
      marketStress: marketConditions.market_stress,
      newVolatilityLimit: (this.riskLimits.max_portfolio_volatility * 100).toFixed(1) + '%',
      newVaRLimit: (this.riskLimits.max_value_at_risk * 100).toFixed(1) + '%'
    });
  }

  // Private helper methods

  private calculatePortfolioReturns(
    weights: Record<string, number>,
    historicalReturns: Map<string, number[]>
  ): number[] {

    const symbols = Object.keys(weights);
    if (symbols.length === 0) return [];

    // Get the length of the first return series
    const firstSymbol = symbols[0];
    if (!firstSymbol) return [];

    const firstReturns = historicalReturns.get(firstSymbol);
    if (!firstReturns || firstReturns.length === 0) return [];

    const numPeriods = firstReturns.length;
    const portfolioReturns: number[] = [];

    for (let i = 0; i < numPeriods; i++) {
      let portfolioReturn = 0;

      for (const symbol of symbols) {
        const assetReturns = historicalReturns.get(symbol);
        const weight = weights[symbol] || 0;

        if (assetReturns && i < assetReturns.length) {
          const assetReturn = assetReturns[i];
          if (assetReturn !== undefined) {
            portfolioReturn += weight * assetReturn;
          }
        }
      }

      portfolioReturns.push(portfolioReturn);
    }

    return portfolioReturns;
  }

  private calculateHistoricalVaR(returns: number[], confidenceLevel: number): { var: number; es: number } {
    if (returns.length === 0) return { var: 0, es: 0 };

    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
    const varValue = -(sortedReturns[index] || 0); // Negative because we want loss

    // Calculate Expected Shortfall (average of losses beyond VaR)
    const tailLosses = sortedReturns.slice(0, index + 1);
    const expectedShortfall = tailLosses.length > 0 ?
      -tailLosses.reduce((sum, loss) => sum + loss, 0) / tailLosses.length : varValue;

    return { var: varValue, es: expectedShortfall };
  }

  private calculateParametricVaR(returns: number[], confidenceLevel: number): { var: number; es: number; mean: number; std: number } {
    if (returns.length === 0) return { var: 0, es: 0, mean: 0, std: 0 };

    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / (returns.length - 1);
    const std = Math.sqrt(variance);

    // For normal distribution, VaR = -mean + z * std
    const zScore = this.getZScore(confidenceLevel);
    const varValue = -mean + zScore * std;

    // Expected Shortfall for normal distribution
    const expectedShortfall = std * Math.exp(-0.5 * zScore * zScore) / ((1 - confidenceLevel) * Math.sqrt(2 * Math.PI));

    return { var: varValue, es: expectedShortfall, mean, std };
  }

  private async calculateMonteCarloVaR(
    returns: number[],
    config: { confidence_level: number; time_horizon: number }
  ): Promise<{ var: number; es: number }> {

    if (returns.length === 0) return { var: 0, es: 0 };

    const numSimulations = 10000;
    const simulatedReturns: number[] = [];

    // Fit distribution parameters
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / (returns.length - 1);
    const std = Math.sqrt(variance);

    // Generate simulations
    for (let i = 0; i < numSimulations; i++) {
      // Simple random walk simulation
      let simulatedReturn = 0;
      for (let t = 0; t < config.time_horizon; t++) {
        const randomShock = this.generateNormalRandom(mean, std);
        simulatedReturn += randomShock;
      }
      simulatedReturns.push(simulatedReturn);
    }

    // Calculate VaR from simulations
    const result = this.calculateHistoricalVaR(simulatedReturns, config.confidence_level);
    return result;
  }

  private calculateVolatility(returns: number[]): number {
    if (returns.length === 0) return 0;

    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / (returns.length - 1);

    return Math.sqrt(variance);
  }

  private calculateMaximumDrawdown(returns: number[]): number {
    if (returns.length === 0) return 0;

    let peak = 1;
    let maxDrawdown = 0;

    for (const ret of returns) {
      const cumulativeReturn = peak * (1 + ret);
      peak = Math.max(peak, cumulativeReturn);
      const drawdown = (peak - cumulativeReturn) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
  }

  private calculateBetaAlpha(
    portfolioReturns: number[],
    benchmarkReturns: number[],
    riskFreeRate: number
  ): { beta: number; alpha: number; tracking_error: number } {

    if (portfolioReturns.length !== benchmarkReturns.length || portfolioReturns.length === 0) {
      return { beta: 1, alpha: 0, tracking_error: 0 };
    }

    // Calculate covariance and variances
    const portfolioMean = portfolioReturns.reduce((sum, ret) => sum + ret, 0) / portfolioReturns.length;
    const benchmarkMean = benchmarkReturns.reduce((sum, ret) => sum + ret, 0) / benchmarkReturns.length;

    let covariance = 0;
    let benchmarkVariance = 0;

    for (let i = 0; i < portfolioReturns.length; i++) {
      const portRet = portfolioReturns[i];
      const benchRet = benchmarkReturns[i];
      if (portRet !== undefined && benchRet !== undefined) {
        covariance += (portRet - portfolioMean) * (benchRet - benchmarkMean);
        benchmarkVariance += Math.pow(benchRet - benchmarkMean, 2);
      }
    }

    covariance /= (portfolioReturns.length - 1);
    benchmarkVariance /= (portfolioReturns.length - 1);

    const beta = benchmarkVariance > 0 ? covariance / benchmarkVariance : 1;

    // Calculate alpha (annualized)
    const portfolioExcessReturn = (portfolioMean * 252) - riskFreeRate;
    const benchmarkExcessReturn = (benchmarkMean * 252) - riskFreeRate;
    const alpha = portfolioExcessReturn - (beta * benchmarkExcessReturn);

    // Calculate tracking error
    const trackingErrors: number[] = [];
    for (let i = 0; i < portfolioReturns.length; i++) {
      const portRet = portfolioReturns[i];
      const benchRet = benchmarkReturns[i];
      if (portRet !== undefined && benchRet !== undefined) {
        const expectedReturn = riskFreeRate / 252 + beta * (benchRet - riskFreeRate / 252);
        trackingErrors.push(portRet - expectedReturn);
      }
    }

    const trackingError = this.calculateVolatility(trackingErrors) * Math.sqrt(252);

    return { beta, alpha, tracking_error: trackingError };
  }

  private async simulateScenarioImpact(
    portfolioWeights: Record<string, number>,
    scenario: StressTestScenario,
    _historicalReturns: Map<string, number[]>
  ): Promise<{
    return_impact: number;
    volatility_impact: number;
    var_impact: number;
    drawdown_impact: number;
  }> {

    // Simplified scenario simulation - in practice, this would use more sophisticated models
    let returnImpact = 0;
    let volatilityImpact = 0;

    switch (scenario.shock_type) {
      case 'market_crash':
        returnImpact = -0.15; // 15% loss
        volatilityImpact = 0.3; // 30% increase in volatility
        break;
      case 'volatility_spike':
        returnImpact = -0.05;
        volatilityImpact = 0.5;
        break;
      case 'interest_rate_change':
        returnImpact = scenario.shock_parameters.interest_rate_change || 0.02;
        volatilityImpact = 0.1;
        break;
      case 'currency_crisis':
        returnImpact = -0.10;
        volatilityImpact = 0.25;
        break;
      case 'sector_specific':
        returnImpact = -0.08;
        volatilityImpact = 0.15;
        break;
      default:
        returnImpact = scenario.impact.portfolio_return;
        volatilityImpact = scenario.impact.portfolio_volatility;
    }

    // Calculate VaR impact (simplified)
    const varImpact = returnImpact * 1.5; // Conservative estimate

    // Calculate drawdown impact
    const drawdownImpact = Math.abs(returnImpact) * 1.2;

    return {
      return_impact: returnImpact,
      volatility_impact: volatilityImpact,
      var_impact: varImpact,
      drawdown_impact: drawdownImpact
    };
  }

  private calculateRiskContributions(
    weights: Record<string, number>,
    covarianceMatrix: number[][]
  ): Record<string, number> {

    const symbols = Object.keys(weights);
    const contributions: Record<string, number> = {};

    // Calculate portfolio volatility
    const portfolioVolatility = this.calculatePortfolioVolatilityFromWeights(weights, covarianceMatrix);

    if (portfolioVolatility === 0) {
      // Equal contribution if no volatility
      const equalContribution = 1 / symbols.length;
      for (const symbol of symbols) {
        contributions[symbol] = equalContribution;
      }
      return contributions;
    }

    // Calculate marginal contributions
    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      if (!symbol) continue;

      const weight = weights[symbol];

      if (weight !== undefined && weight > 0) {
        // Simplified risk contribution calculation
        const variance = covarianceMatrix[i]?.[i] || 0;
        const marginalContribution = variance * weight / portfolioVolatility;
        contributions[symbol] = marginalContribution;
      } else {
        contributions[symbol] = 0;
      }
    }

    return contributions;
  }

  private calculatePortfolioVolatilityFromWeights(
    weights: Record<string, number>,
    covarianceMatrix: number[][]
  ): number {

    const symbols = Object.keys(weights);
    let volatility = 0;

    for (let i = 0; i < symbols.length; i++) {
      for (let j = 0; j < symbols.length; j++) {
        const symbolI = symbols[i];
        const symbolJ = symbols[j];
        if (!symbolI || !symbolJ) continue;

        const weightI = weights[symbolI] || 0;
        const weightJ = weights[symbolJ] || 0;
        const covariance = covarianceMatrix[i]?.[j] || 0;

        volatility += weightI * weightJ * covariance;
      }
    }

    return Math.sqrt(Math.max(0, volatility));
  }

  private generateStressTestRecommendations(
    scenarioResults: Array<{
      scenario: StressTestScenario;
      portfolio_impact: any;
      risk_assessment: string;
    }>,
    stressTestPassed: boolean
  ): string[] {

    const recommendations: string[] = [];

    if (!stressTestPassed) {
      recommendations.push('Implement additional hedging strategies to reduce tail risk');
      recommendations.push('Consider reducing portfolio leverage during high volatility periods');
    }

    const highRiskScenarios = scenarioResults.filter(r => r.risk_assessment === 'high' || r.risk_assessment === 'critical');

    if (highRiskScenarios.length > 0) {
      recommendations.push(`Address ${highRiskScenarios.length} high-risk scenarios through diversification or hedging`);
    }

    const marketCrashScenarios = scenarioResults.filter(r => r.scenario.shock_type === 'market_crash');
    if (marketCrashScenarios.some(s => s.risk_assessment === 'critical')) {
      recommendations.push('Increase allocation to defensive assets for market crash protection');
    }

    return recommendations;
  }

  private generateRiskLimitRecommendations(breaches: Array<{
    limit_type: string;
    current_value: number;
    limit_value: number;
    breach_severity: 'minor' | 'moderate' | 'severe';
  }>): string[] {

    const recommendations: string[] = [];

    for (const breach of breaches) {
      switch (breach.limit_type) {
        case 'portfolio_volatility':
          recommendations.push(`Reduce portfolio volatility by ${((breach.current_value - breach.limit_value) * 100).toFixed(1)}% through diversification`);
          break;
        case 'value_at_risk':
          recommendations.push(`Reduce Value at Risk exposure by implementing hedging strategies`);
          break;
        case 'maximum_drawdown':
          recommendations.push(`Implement stop-loss mechanisms to limit drawdown risk`);
          break;
        case 'concentration_limit':
          recommendations.push(`Reduce position concentration by diversifying across more assets`);
          break;
      }
    }

    return recommendations;
  }

  private getZScore(confidenceLevel: number): number {
    // Simplified z-score lookup for common confidence levels
    switch (confidenceLevel) {
      case 0.90: return 1.645;
      case 0.95: return 1.96;
      case 0.99: return 2.576;
      default: return 1.96; // Default to 95%
    }
  }

  private generateNormalRandom(mean: number, std: number): number {
    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * std + mean;
  }
}

/**
 * Factory function for creating risk management engine
 */
export function createRiskManagementEngine(
  riskLimits: RiskLimits,
  logger?: any
): RiskManagementEngine {
  return new RiskManagementEngine(riskLimits, logger);
}