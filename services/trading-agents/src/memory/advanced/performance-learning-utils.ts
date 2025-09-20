/**
 * Performance Learning Utilities
 *
 * Utility functions for performance learning operations including
 * metric normalization, correlation analysis, and improvement calculations.
 */

import { AgentPerformanceRecord } from './performance-learning-types';

/**
 * Utility class for performance learning operations
 */
export class PerformanceLearningUtils {

  /**
   * Calculate performance improvement rate
   */
  static calculateImprovementRate(initialValue: number, currentValue: number, periods: number): number {
    if (periods === 0) return 0;
    return (currentValue - initialValue) / periods;
  }

  /**
   * Normalize performance metrics for ML models
   */
  static normalizeMetrics(metrics: Record<string, number>): Record<string, number> {
    const normalized: Record<string, number> = {};

    for (const [key, value] of Object.entries(metrics)) {
      // Apply different normalization based on metric type
      if (key.includes('rate') || key.includes('ratio')) {
        normalized[key] = Math.max(0, Math.min(1, value)); // Clamp to [0,1]
      } else if (key.includes('return')) {
        normalized[key] = Math.tanh(value * 10) / 2 + 0.5; // Sigmoid-like normalization
      } else {
        normalized[key] = value; // No normalization
      }
    }

    return normalized;
  }

}

/**
 * Calculate correlation between performance metrics
 */
export function calculateCorrelation(values1: number[], values2: number[]): number {
  if (values1.length !== values2.length || values1.length === 0) return 0;

  const n = values1.length;
  const sum1 = values1.reduce((sum, val) => sum + val, 0);
  const sum2 = values2.reduce((sum, val) => sum + val, 0);
  const sum1Sq = values1.reduce((sum, val) => sum + val * val, 0);
  const sum2Sq = values2.reduce((sum, val) => sum + val * val, 0);
  const pSum = values1.reduce((sum, val, i) => sum + val * (values2[i] || 0), 0);

  const num = pSum - (sum1 * sum2 / n);
  const den = Math.sqrt((sum1Sq - sum1 * sum1 / n) * (sum2Sq - sum2 * sum2 / n));

  return den === 0 ? 0 : num / den;
}

/**
 * Calculate variance of an array of numbers
 */
export function calculateVariance(values: number[]): number {
  try {
    if (values.length < 2) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  } catch (_error) {
    return 0;
  }
}

/**
 * Calculate R-squared (coefficient of determination)
 */
export function calculateRSquared(targets: number[], predictions: number[]): number {
  try {
    const n = targets.length;
    const targetMean = targets.reduce((sum, val) => sum + val, 0) / n;
    const totalSumSquares = targets.reduce((sum, val) => sum + Math.pow(val - targetMean, 2), 0);
    const residuals = targets.map((target, i) => target - (predictions[i] || 0));
    const residualSumSquares = residuals.reduce((sum, residual) => sum + residual * residual, 0);

    return totalSumSquares > 0 ? 1 - (residualSumSquares / totalSumSquares) : 0;
  } catch (_error) {
    return 0;
  }
}

/**
 * Calculate Q-value update for reinforcement learning
 */
export function calculateQValueUpdate(
  action: {
    action_type: string;
    parameters: Record<string, any>;
    context: {
      market_conditions: any;
      technical_indicators: any;
    };
  },
  outcome: {
    immediate_reward: number;
    delayed_reward?: number;
    success: boolean;
    metrics: Record<string, number>;
  },
  learningRate: number
): number {
  return outcome.immediate_reward * learningRate;
}

/**
 * Update policy parameters for reinforcement learning
 */
export async function updatePolicy(
  agentId: string,
  action: {
    action_type: string;
    parameters: Record<string, any>;
    context: {
      market_conditions: any;
      technical_indicators: any;
    };
  },
  outcome: {
    immediate_reward: number;
    delayed_reward?: number;
    success: boolean;
    metrics: Record<string, number>;
  },
  currentPolicy: Record<string, number>,
  learningRate: number,
  logger?: any
): Promise<Record<string, number>> {
  try {
    // Simple policy update based on outcome
    const updatedPolicy = { ...currentPolicy };

    if (outcome.success) {
      // Increase probability of successful actions
      updatedPolicy.epsilon = Math.max(0.01, (updatedPolicy.epsilon || 0.1) * (1 - learningRate));
    } else {
      // Increase exploration for unsuccessful actions
      updatedPolicy.epsilon = Math.min(0.5, (updatedPolicy.epsilon || 0.1) * (1 + learningRate));
    }

    updatedPolicy.learning_rate = learningRate;

    logger?.info('Policy updated', {
      component: 'PerformanceLearningUtils',
      agent_id: agentId,
      old_policy: currentPolicy,
      new_policy: updatedPolicy
    });

    return updatedPolicy;
  } catch (error) {
    logger?.warn('Policy update failed', { error, agentId });
    return currentPolicy;
  }
}

/**
 * Calculate exploration vs exploitation strategy
 */
export function calculateExplorationStrategy(
  agentId: string,
  context: {
    market_conditions: any;
    technical_indicators: any;
  },
  currentEpsilon: number = 0.1,
  logger?: any
): {
  exploration_probability: number;
  exploitation_confidence: number;
} {
  try {
    // Adjust exploration based on market conditions
    let explorationProbability = currentEpsilon;
    let exploitationConfidence = 1 - currentEpsilon;

    // Increase exploration in uncertain market conditions
    if (context.market_conditions?.volatility > 0.3) {
      explorationProbability = Math.min(0.4, explorationProbability * 1.5);
      exploitationConfidence = Math.max(0.6, exploitationConfidence * 0.9);
    }

    // Decrease exploration in stable conditions
    if (context.market_conditions?.volatility < 0.1) {
      explorationProbability = Math.max(0.05, explorationProbability * 0.7);
      exploitationConfidence = Math.min(0.95, exploitationConfidence * 1.1);
    }

    logger?.debug('Exploration strategy calculated', {
      component: 'PerformanceLearningUtils',
      agent_id: agentId,
      exploration_probability: explorationProbability,
      exploitation_confidence: exploitationConfidence,
      market_volatility: context.market_conditions?.volatility
    });

    return {
      exploration_probability: explorationProbability,
      exploitation_confidence: exploitationConfidence
    };
  } catch (error) {
    logger?.warn('Exploration strategy calculation failed', { error, agentId });
    return {
      exploration_probability: currentEpsilon,
      exploitation_confidence: 1 - currentEpsilon
    };
  }
}

/**
 * Extract insights from reinforcement learning outcomes
 */
export function extractReinforcementInsights(
  action: {
    action_type: string;
    parameters: Record<string, any>;
    context: {
      market_conditions: any;
      technical_indicators: any;
    };
  },
  outcome: {
    immediate_reward: number;
    delayed_reward?: number;
    success: boolean;
    metrics: Record<string, number>;
  },
  qValueUpdate: number
): string[] {
  const insights: string[] = [];

  try {
    if (outcome.success) {
      insights.push(`${action.action_type} action successful with reward ${outcome.immediate_reward}`);
    } else {
      insights.push(`${action.action_type} action failed, adjusting strategy`);
    }

    if (Math.abs(qValueUpdate) > 0.1) {
      insights.push(`Significant learning update: ${qValueUpdate > 0 ? 'positive' : 'negative'} reinforcement`);
    }

    if (outcome.metrics.success_rate && outcome.metrics.success_rate > 0.8) {
      insights.push('High success rate detected, reinforcing current strategy');
    }

    if (outcome.metrics.max_drawdown && outcome.metrics.max_drawdown > 0.1) {
      insights.push('High drawdown detected, risk management adjustments needed');
    }

    return insights;
  } catch (error) {
    return [`Error extracting insights: ${error instanceof Error ? error.message : 'Unknown error'}`];
  }
}

/**
 * Store reinforcement learning data (placeholder for actual storage)
 */
export async function storeReinforcementData(
  agentId: string,
  action: {
    action_type: string;
    parameters: Record<string, any>;
    context: {
      market_conditions: any;
      technical_indicators: any;
    };
  },
  outcome: {
    immediate_reward: number;
    delayed_reward?: number;
    success: boolean;
    metrics: Record<string, number>;
  },
  qValueUpdate: number,
  zepClient?: any,
  logger?: any
): Promise<void> {
  try {
    const reinforcementData = {
      agent_id: agentId,
      timestamp: new Date().toISOString(),
      action,
      outcome,
      q_value_update: qValueUpdate,
      learning_insights: extractReinforcementInsights(action, outcome, qValueUpdate)
    };

    if (zepClient?.storeReinforcementData) {
      await zepClient.storeReinforcementData(reinforcementData);
    }

    logger?.info('Reinforcement data stored', {
      component: 'PerformanceLearningUtils',
      agent_id: agentId,
      action_type: action.action_type,
      q_value_update: qValueUpdate
    });
  } catch (error) {
    logger?.warn('Failed to store reinforcement data', { error, agentId });
  }
}

/**
 * Make ML-based performance predictions for scenarios
 */
export async function mlPerformancePrediction(
  agentId: string,
  scenario: {
    scenario_name: string;
    market_conditions: any;
    time_horizon: number;
  },
  historicalData?: AgentPerformanceRecord[],
  logger?: any
): Promise<{
  scenario_name: string;
  predicted_metrics: {
    expected_return: number;
    success_rate: number;
    volatility: number;
    max_drawdown: number;
    sharpe_ratio: number;
  };
  confidence_intervals: {
    return_ci: [number, number];
    success_rate_ci: [number, number];
  };
  risk_factors: string[];
  recommendations: string[];
}> {
  try {
    // Base predictions on historical data if available
    let baseReturn = 0.08;
    let baseSuccessRate = 0.75;
    let baseVolatility = 0.15;
    let baseMaxDrawdown = 0.08;
    let baseSharpeRatio = 1.2;

    if (historicalData && historicalData.length > 0) {
      // Calculate averages from historical data
      const returns = historicalData.map(r => r.trading_metrics.total_return);
      const successRates = historicalData.map(r => r.trading_metrics.success_rate);
      const volatilities = historicalData.map(r => r.market_conditions.volatility);
      const drawdowns = historicalData.map(r => r.trading_metrics.max_drawdown);
      const sharpes = historicalData.map(r => r.trading_metrics.sharpe_ratio);

      baseReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length || 0.08;
      baseSuccessRate = successRates.reduce((sum, r) => sum + r, 0) / successRates.length || 0.75;
      baseVolatility = volatilities.reduce((sum, v) => sum + v, 0) / volatilities.length || 0.15;
      baseMaxDrawdown = drawdowns.reduce((sum, d) => sum + d, 0) / drawdowns.length || 0.08;
      baseSharpeRatio = sharpes.reduce((sum, s) => sum + s, 0) / sharpes.length || 1.2;
    }

    // Adjust predictions based on scenario market conditions
    const marketVolatility = scenario.market_conditions?.volatility || 0.1;
    const marketRegime = scenario.market_conditions?.market_regime || 'neutral';

    // Adjust for market conditions
    let adjustmentFactor = 1.0;
    const riskFactors: string[] = [];
    const recommendations: string[] = [];

    if (marketVolatility > 0.3) {
      adjustmentFactor *= 0.8; // Reduce expectations in high volatility
      riskFactors.push('high_market_volatility');
      recommendations.push('reduce_position_sizes');
    } else if (marketVolatility < 0.1) {
      adjustmentFactor *= 1.1; // Increase expectations in low volatility
      recommendations.push('maintain_position_sizes');
    }

    if (marketRegime === 'bull') {
      adjustmentFactor *= 1.2;
      recommendations.push('favor_long_positions');
    } else if (marketRegime === 'bear') {
      adjustmentFactor *= 0.7;
      riskFactors.push('bear_market_conditions');
      recommendations.push('implement_hedging_strategies');
    }

    // Apply adjustments
    const predictedReturn = baseReturn * adjustmentFactor;
    const predictedSuccessRate = Math.min(0.95, baseSuccessRate * adjustmentFactor);
    const predictedVolatility = baseVolatility * (marketVolatility > 0.2 ? 1.3 : 0.9);
    const predictedMaxDrawdown = baseMaxDrawdown * (marketVolatility > 0.2 ? 1.4 : 0.8);
    const predictedSharpeRatio = baseSharpeRatio * adjustmentFactor;

    // Calculate confidence intervals (simplified)
    const confidenceRange = 0.15; // 15% confidence range
    const returnCI: [number, number] = [
      Math.max(0, predictedReturn * (1 - confidenceRange)),
      predictedReturn * (1 + confidenceRange)
    ];
    const successRateCI: [number, number] = [
      Math.max(0, predictedSuccessRate * (1 - confidenceRange)),
      Math.min(1, predictedSuccessRate * (1 + confidenceRange))
    ];

    logger?.info('ML performance prediction completed', {
      component: 'PerformanceLearningUtils',
      agent_id: agentId,
      scenario: scenario.scenario_name,
      predicted_return: predictedReturn,
      confidence_range: confidenceRange
    });

    return {
      scenario_name: scenario.scenario_name,
      predicted_metrics: {
        expected_return: Number(predictedReturn.toFixed(4)),
        success_rate: Number(predictedSuccessRate.toFixed(4)),
        volatility: Number(predictedVolatility.toFixed(4)),
        max_drawdown: Number(predictedMaxDrawdown.toFixed(4)),
        sharpe_ratio: Number(predictedSharpeRatio.toFixed(4))
      },
      confidence_intervals: {
        return_ci: returnCI.map(v => Number(v.toFixed(4))) as [number, number],
        success_rate_ci: successRateCI.map(v => Number(v.toFixed(4))) as [number, number]
      },
      risk_factors: riskFactors,
      recommendations
    };
  } catch (error) {
    logger?.warn('ML performance prediction failed', { error, agentId, scenario: scenario.scenario_name });

    // Return fallback predictions
    return {
      scenario_name: scenario.scenario_name,
      predicted_metrics: {
        expected_return: 0.08,
        success_rate: 0.75,
        volatility: 0.15,
        max_drawdown: 0.08,
        sharpe_ratio: 1.2
      },
      confidence_intervals: {
        return_ci: [0.05, 0.12],
        success_rate_ci: [0.7, 0.8]
      },
      risk_factors: ['prediction_error'],
      recommendations: ['monitor_performance_closely']
    };
  }
}