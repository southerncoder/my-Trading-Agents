import { createLogger } from '../../../../utils/enhanced-logger';

/**
 * Euclidean Distance Similarity Algorithm
 * Calculates similarity based on Euclidean distance between feature vectors
 */
export class EuclideanSimilarity {
  private logger: any;

  constructor(logger?: any) {
    this.logger = logger || createLogger('system', 'euclidean-similarity');
  }

  /**
   * Calculate Euclidean similarity between feature vectors
   */
  calculate(features1: any, features2: any, numericalFeatures?: string[]): number {
    try {
      const features = numericalFeatures || [
        'success_rate', 'profit_loss_ratio', 'volatility_adjusted_return',
        'max_drawdown', 'sharpe_ratio', 'win_rate', 'avg_trade_duration'
      ];

      let sumSquaredDiff = 0;
      let count = 0;

      for (const feature of features) {
        if (features1[feature] !== undefined && features2[feature] !== undefined) {
          const diff = features1[feature] - features2[feature];
          sumSquaredDiff += diff * diff;
          count++;
        }
      }

      if (count === 0) return 0.5;

      const euclideanDistance = Math.sqrt(sumSquaredDiff / count);
      // Convert distance to similarity (0 = identical, higher = more different)
      return Math.exp(-euclideanDistance);

    } catch (error) {
      this.logger.warn('euclidean-similarity-failed', 'Euclidean similarity calculation failed', { error: error instanceof Error ? error.message : 'Unknown' });
      return 0.5;
    }
  }
}