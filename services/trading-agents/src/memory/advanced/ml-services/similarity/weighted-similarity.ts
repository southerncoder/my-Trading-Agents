import { createLogger } from '../../../../utils/enhanced-logger';

/**
 * Weighted Similarity Algorithm
 * Calculates similarity with feature importance weighting
 */
export class WeightedSimilarity {
  private logger: any;

  constructor(logger?: any) {
    this.logger = logger || createLogger('system', 'weighted-similarity');
  }

  /**
   * Calculate weighted similarity with feature importance
   */
  calculate(features1: any, features2: any, weights?: Record<string, number>): number {
    try {
      // Define feature weights based on importance for trading outcomes
      const defaultWeights = {
        success_rate: 0.25,
        profit_loss_ratio: 0.20,
        volatility_adjusted_return: 0.15,
        max_drawdown: 0.15,
        sharpe_ratio: 0.10,
        win_rate: 0.10,
        avg_trade_duration: 0.05
      };

      const featureWeights = weights || defaultWeights;

      let weightedSum = 0;
      let totalWeight = 0;

      // Calculate weighted similarity for numerical features
      for (const [feature, weight] of Object.entries(featureWeights)) {
        if (features1[feature] !== undefined && features2[feature] !== undefined) {
          const similarity = 1 - Math.abs(features1[feature] - features2[feature]);
          weightedSum += similarity * weight;
          totalWeight += weight;
        }
      }

      // Add categorical feature similarities
      const categoricalWeights = {
        strategy_type: 0.15,
        risk_profile: 0.10,
        time_horizon: 0.10
      };

      for (const [feature, weight] of Object.entries(categoricalWeights)) {
        if (features1[feature] && features2[feature]) {
          const similarity = features1[feature] === features2[feature] ? 1 : 0.2;
          weightedSum += similarity * weight;
          totalWeight += weight;
        }
      }

      return totalWeight > 0 ? weightedSum / totalWeight : 0.5;

    } catch (error) {
      this.logger.warn('weighted-similarity-failed', 'Weighted similarity calculation failed', { error: error instanceof Error ? error.message : 'Unknown' });
      return 0.5;
    }
  }

  /**
   * Apply non-linear transformation to similarity score for better discrimination
   */
  applySimilarityTransformation(similarity: number): number {
    // Sigmoid transformation for better separation of similar vs dissimilar items
    // This helps distinguish between truly similar (high scores) and somewhat similar (medium scores)
    const transformed = 1 / (1 + Math.exp(-5 * (similarity - 0.5)));
    return Math.max(0, Math.min(1, transformed));
  }
}