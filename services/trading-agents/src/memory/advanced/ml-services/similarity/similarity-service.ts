import { createLogger } from '../../../../utils/enhanced-logger';
import { EuclideanSimilarity } from './euclidean-similarity';
import { CosineSimilarity } from './cosine-similarity';
import { WeightedSimilarity } from './weighted-similarity';
import { SimilarityResult, SimilarityConfig } from '../types';

/**
 * ML-Based Similarity Service
 * Orchestrates various similarity calculation algorithms
 */
export class MLBasedSimilarityService {
  private logger: any;
  private euclideanSimilarity: EuclideanSimilarity;
  private cosineSimilarity: CosineSimilarity;
  private weightedSimilarity: WeightedSimilarity;

  constructor(logger?: any) {
    this.logger = logger || createLogger('system', 'ml-similarity');
    this.euclideanSimilarity = new EuclideanSimilarity(this.logger);
    this.cosineSimilarity = new CosineSimilarity(this.logger);
    this.weightedSimilarity = new WeightedSimilarity(this.logger);
  }

  /**
   * Calculate Euclidean similarity between feature vectors
   */
  calculateEuclideanSimilarity(features1: any, features2: any, config?: SimilarityConfig): number {
    return this.euclideanSimilarity.calculate(features1, features2, config?.numericalFeatures);
  }

  /**
   * Calculate cosine similarity between feature vectors
   */
  calculateCosineSimilarity(features1: any, features2: any, config?: SimilarityConfig): number {
    return this.cosineSimilarity.calculate(features1, features2, config?.numericalFeatures);
  }

  /**
   * Calculate weighted similarity with feature importance
   */
  calculateWeightedSimilarity(features1: any, features2: any, config?: SimilarityConfig): number {
    return this.weightedSimilarity.calculate(features1, features2, config?.weights);
  }

  /**
   * Calculate comprehensive similarity using multiple methods
   */
  calculateComprehensiveSimilarity(features1: any, features2: any, config?: SimilarityConfig): SimilarityResult {
    try {
      const euclideanScore = this.calculateEuclideanSimilarity(features1, features2, config);
      const cosineScore = this.calculateCosineSimilarity(features1, features2, config);
      const weightedScore = this.calculateWeightedSimilarity(features1, features2, config);

      // Combine scores with equal weighting
      const combinedScore = (euclideanScore + cosineScore + weightedScore) / 3;

      // Apply transformation for better discrimination
      const transformedScore = this.weightedSimilarity.applySimilarityTransformation(combinedScore);

      return {
        score: transformedScore,
        confidence: this.calculateConfidenceScore([euclideanScore, cosineScore, weightedScore]),
        method: 'weighted' // Primary method
      };

    } catch (error) {
      this.logger.warn('comprehensive-similarity-failed', 'Comprehensive similarity calculation failed', {
        error: error instanceof Error ? error.message : 'Unknown'
      });

      return {
        score: 0.5,
        confidence: 0.5,
        method: 'weighted'
      };
    }
  }

  /**
   * Calculate confidence score based on consistency of different methods
   */
  private calculateConfidenceScore(scores: number[]): number {
    if (scores.length < 2) return 0.5;

    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // Lower standard deviation indicates more consistent results (higher confidence)
    return Math.max(0.3, Math.min(0.9, 1 - stdDev));
  }
}