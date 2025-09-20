import { createLogger } from '../../../../utils/enhanced-logger';
import { TradingOutcome } from '../types';

/**
 * Cluster Analysis Service
 * Analyzes cluster patterns and provides insights about trading outcomes
 */
export class ClusterAnalysisService {
  private logger: any;

  constructor(logger?: any) {
    this.logger = logger || createLogger('system', 'cluster-analysis');
  }

  /**
   * Calculate cluster centroid from outcome objects
   */
  calculateClusterCentroid(members: TradingOutcome[]): any {
    if (members.length === 0) return {
      success_rate: 0.5,
      profit_loss: 0,
      volatility: 0.15,
      max_drawdown: 0.1,
      sharpe_ratio: 0,
      win_rate: 0.5,
      strategy_type: 'unknown',
      risk_profile: 'medium',
      time_horizon: 'medium'
    };

    const centroid = {
      success_rate: members.reduce((sum, m) => sum + (m.success_rate || 0), 0) / members.length,
      profit_loss: members.reduce((sum, m) => sum + (m.profit_loss || 0), 0) / members.length,
      volatility: members.reduce((sum, m) => sum + (m.volatility || 0.15), 0) / members.length,
      max_drawdown: members.reduce((sum, m) => sum + (m.max_drawdown || 0.1), 0) / members.length,
      sharpe_ratio: members.reduce((sum, m) => sum + (m.sharpe_ratio || 0), 0) / members.length,
      win_rate: members.reduce((sum, m) => sum + (m.win_rate || 0.5), 0) / members.length,
      strategy_type: this.findMostCommonValue(members.map(m => m.strategy_type)),
      risk_profile: this.findMostCommonValue(members.map(m => m.risk_profile)),
      time_horizon: this.findMostCommonValue(members.map(m => m.time_horizon))
    };

    return centroid;
  }

  /**
   * Identify the pattern type of a cluster
   */
  identifyClusterPattern(members: TradingOutcome[]): string {
    if (members.length === 0) return 'unknown';

    const avgSuccess = members.reduce((sum, m) => sum + (m.success_rate || 0), 0) / members.length;
    const avgProfit = members.reduce((sum, m) => sum + (m.profit_loss || 0), 0) / members.length;
    const avgVolatility = members.reduce((sum, m) => sum + (m.volatility || 0.15), 0) / members.length;

    if (avgSuccess > 0.7 && avgProfit > 0.05) {
      return 'high_performance';
    } else if (avgSuccess > 0.6 && avgVolatility < 0.1) {
      return 'stable_performance';
    } else if (avgProfit < -0.05) {
      return 'underperforming';
    } else if (avgVolatility > 0.25) {
      return 'high_risk';
    } else {
      return 'moderate_performance';
    }
  }

  /**
   * Calculate confidence score for a cluster
   */
  calculateClusterConfidence(members: TradingOutcome[]): number {
    if (members.length < 2) return 0.5;

    // Calculate intra-cluster similarity using simple feature comparison
    const features = members.map(m => [
      m.success_rate || 0.5,
      m.profit_loss || 0,
      m.volatility || 0.15,
      m.max_drawdown || 0.1,
      m.sharpe_ratio || 0
    ]);

    let totalSimilarity = 0;
    let pairCount = 0;

    for (let i = 0; i < features.length; i++) {
      for (let j = i + 1; j < features.length; j++) {
        const feature1 = features[i];
        const feature2 = features[j];

        if (feature1 && feature2) {
          const similarity = 1 - this.calculateFeatureDistance(feature1, feature2) / 10; // Normalize
          totalSimilarity += Math.max(0, similarity);
          pairCount++;
        }
      }
    }

    const avgSimilarity = pairCount > 0 ? totalSimilarity / pairCount : 0.5;
    return Math.max(0.3, Math.min(0.9, avgSimilarity));
  }

  /**
   * Calculate Euclidean distance between feature vectors
   */
  private calculateFeatureDistance(features1: number[], features2: number[]): number {
    if (!features1 || !features2) return Infinity;

    let sum = 0;
    const length = Math.min(features1.length, features2.length);

    for (let i = 0; i < length; i++) {
      const val1 = features1[i] || 0;
      const val2 = features2[i] || 0;
      const diff = val1 - val2;
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /**
   * Find most common value in an array
   */
  private findMostCommonValue(values: any[]): any {
    const frequency: Record<string, number> = {};
    let mostCommon = values[0];
    let maxCount = 0;

    for (const value of values) {
      const key = String(value || 'unknown');
      frequency[key] = (frequency[key] || 0) + 1;

      if (frequency[key] > maxCount) {
        maxCount = frequency[key];
        mostCommon = value;
      }
    }

    return mostCommon;
  }

  /**
   * Analyze cluster stability and characteristics
   */
  analyzeClusterStability(cluster: { members: TradingOutcome[]; centroid: any }): {
    stability_score: number;
    risk_profile: string;
    performance_characteristics: string[];
  } {
    const members = cluster.members;
    if (members.length === 0) {
      return {
        stability_score: 0.5,
        risk_profile: 'unknown',
        performance_characteristics: ['insufficient_data']
      };
    }

    // Calculate stability based on variance in key metrics
    const successRates = members.map(m => m.success_rate || 0.5);
    const profitLosses = members.map(m => m.profit_loss || 0);
    const volatilities = members.map(m => m.volatility || 0.15);

    const successVariance = this.calculateVariance(successRates);
    const profitVariance = this.calculateVariance(profitLosses);
    const volatilityVariance = this.calculateVariance(volatilities);

    // Lower variance indicates higher stability
    const stabilityScore = Math.max(0.1, 1 - (successVariance + profitVariance + volatilityVariance) / 3);

    // Determine risk profile
    const avgVolatility = volatilities.reduce((sum, v) => sum + v, 0) / volatilities.length;
    const riskProfile = avgVolatility < 0.1 ? 'low' :
                       avgVolatility < 0.2 ? 'medium' : 'high';

    // Performance characteristics
    const characteristics: string[] = [];
    const avgSuccess = successRates.reduce((sum, s) => sum + s, 0) / successRates.length;
    const avgProfit = profitLosses.reduce((sum, p) => sum + p, 0) / profitLosses.length;

    if (avgSuccess > 0.7) characteristics.push('high_success_rate');
    if (avgProfit > 0.05) characteristics.push('profitable');
    if (avgProfit < -0.05) characteristics.push('loss_making');
    if (stabilityScore > 0.8) characteristics.push('stable');
    if (stabilityScore < 0.4) characteristics.push('volatile');

    return {
      stability_score: stabilityScore,
      risk_profile: riskProfile,
      performance_characteristics: characteristics
    };
  }

  /**
   * Calculate variance of an array of numbers
   */
  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / squaredDiffs.length;
  }
}