import { createLogger } from '../../../../utils/enhanced-logger';

/**
 * Cosine Similarity Algorithm
 * Calculates similarity based on cosine of the angle between feature vectors
 */
export class CosineSimilarity {
  private logger: any;

  constructor(logger?: any) {
    this.logger = logger || createLogger('system', 'cosine-similarity');
  }

  /**
   * Calculate cosine similarity between feature vectors
   */
  calculate(features1: any, features2: any, numericalFeatures?: string[]): number {
    try {
      const features = numericalFeatures || [
        'success_rate', 'profit_loss_ratio', 'volatility_adjusted_return',
        'max_drawdown', 'sharpe_ratio', 'win_rate', 'avg_trade_duration'
      ];

      let dotProduct = 0;
      let norm1 = 0;
      let norm2 = 0;

      for (const feature of features) {
        if (features1[feature] !== undefined && features2[feature] !== undefined) {
          dotProduct += features1[feature] * features2[feature];
          norm1 += features1[feature] * features1[feature];
          norm2 += features2[feature] * features2[feature];
        }
      }

      if (norm1 === 0 || norm2 === 0) return 0.5;

      const cosineSimilarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
      // Normalize to 0-1 range
      return (cosineSimilarity + 1) / 2;

    } catch (error) {
      this.logger.warn('cosine-similarity-failed', 'Cosine similarity calculation failed', { error: error instanceof Error ? error.message : 'Unknown' });
      return 0.5;
    }
  }
}