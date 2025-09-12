import { createLogger } from '../../../utils/enhanced-logger';

/**
 * SimilarityEngine - Handles all similarity calculation algorithms
 * Extracted from the monolithic context-retrieval-layer.ts file
 */
export class SimilarityEngine {
  private logger: any;

  constructor(logger?: any) {
    this.logger = logger || createLogger('system', 'SimilarityEngine');
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  calculateCosineSimilarity(vector1: number[], vector2: number[]): number {
    try {
      if (!vector1 || !vector2 || vector1.length !== vector2.length || vector1.length === 0) {
        return 0; // Return 0 for invalid inputs instead of 0.5
      }

      let dotProduct = 0;
      let norm1 = 0;
      let norm2 = 0;

      for (let i = 0; i < vector1.length; i++) {
        const v1 = vector1[i] ?? 0;
        const v2 = vector2[i] ?? 0;
        dotProduct += v1 * v2;
        norm1 += v1 * v1;
        norm2 += v2 * v2;
      }

      if (norm1 === 0 || norm2 === 0) {
        return 0; // Return 0 for zero vectors instead of 0.5
      }

      const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
      return Math.max(0, Math.min(1, similarity)); // Clamp to [0, 1]

    } catch (error) {
      this.logger.warn('Error calculating cosine similarity', { error });
      return 0; // Return 0 for errors instead of 0.5
    }
  }

  /**
   * Calculate Euclidean similarity (inverse of distance)
   */
  calculateEuclideanSimilarity(vector1: number[], vector2: number[]): number {
    try {
      if (!vector1 || !vector2 || vector1.length !== vector2.length || vector1.length === 0) {
        return 0; // Return 0 for invalid inputs instead of 0.5
      }

      let sumSquaredDiffs = 0;
      for (let i = 0; i < vector1.length; i++) {
        const v1 = vector1[i] ?? 0;
        const v2 = vector2[i] ?? 0;
        const diff = v1 - v2;
        sumSquaredDiffs += diff * diff;
      }

      const distance = Math.sqrt(sumSquaredDiffs);
      const maxPossibleDistance = Math.sqrt(vector1.length * 4); // Assuming values in [-2, 2] range
      const similarity = 1 - (distance / maxPossibleDistance);

      return Math.max(0, Math.min(1, similarity));

    } catch (error) {
      this.logger.warn('Error calculating Euclidean similarity', { error });
      return 0; // Return 0 for errors instead of 0.5
    }
  }

  /**
   * Calculate weighted similarity with feature importance
   */
  calculateWeightedSimilarity(
    features1: any,
    features2: any,
    weights: Record<string, number> = {}
  ): number {
    try {
      if (!features1 || !features2) {
        return 0; // Return 0 for invalid inputs instead of 0.5
      }

      let weightedSum = 0;
      let totalWeight = 0;

      // Default weights for common features
      const defaultWeights: Record<string, number> = {
        success_rate: 0.3,
        profit_loss_ratio: 0.25,
        volatility: 0.15,
        market_regime: 0.1,
        strategy_type: 0.1,
        risk_profile: 0.05,
        time_horizon: 0.05
      };

      const featureWeights = { ...defaultWeights, ...weights };

      for (const [feature, weight] of Object.entries(featureWeights)) {
        if (features1[feature] !== undefined && features2[feature] !== undefined) {
          const value1 = features1[feature];
          const value2 = features2[feature];

          let similarity = 0;

          if (typeof value1 === 'number' && typeof value2 === 'number') {
            // Numerical similarity
            const max = Math.max(Math.abs(value1), Math.abs(value2));
            if (max > 0) {
              similarity = 1 - Math.abs(value1 - value2) / max;
            } else {
              similarity = 1;
            }
          } else if (typeof value1 === 'string' && typeof value2 === 'string') {
            // Categorical similarity
            similarity = value1 === value2 ? 1 : 0;
          } else {
            // Mixed types or undefined
            similarity = 0.5;
          }

          weightedSum += similarity * weight;
          totalWeight += weight;
        }
      }

      return totalWeight > 0 ? weightedSum / totalWeight : 0; // Return 0 instead of 0.5

    } catch (error) {
      this.logger.warn('Error calculating weighted similarity', { error });
      return 0; // Return 0 for errors instead of 0.5
    }
  }

  /**
   * Calculate Jaccard similarity for sets
   */
  calculateJaccardSimilarity(set1: string[], set2: string[]): number {
    try {
      if (!set1 || !set2) {
        return 0; // Return 0 for invalid inputs instead of 0.5
      }

      const set1Normalized = new Set(set1.map(s => s.toLowerCase().trim()));
      const set2Normalized = new Set(set2.map(s => s.toLowerCase().trim()));

      const intersection = new Set([...set1Normalized].filter(x => set2Normalized.has(x)));
      const union = new Set([...set1Normalized, ...set2Normalized]);

      if (union.size === 0) {
        return 1; // Both sets are empty
      }

      return intersection.size / union.size;

    } catch (error) {
      this.logger.warn('Error calculating Jaccard similarity', { error });
      return 0; // Return 0 for errors instead of 0.5
    }
  }

  /**
   * Calculate semantic similarity using embeddings
   */
  async calculateSemanticSimilarity(
    text1: string,
    text2: string,
    _embeddingService?: any
  ): Promise<number> {
    try {
      if (!text1 || !text2) {
        return 0; // Return 0 for invalid inputs instead of 0.5
      }

      if (!_embeddingService) {
        // Fallback to simple text similarity
        return this.calculateJaccardSimilarity(
          text1.toLowerCase().split(/\s+/),
          text2.toLowerCase().split(/\s+/)
        );
      }

      // Use embedding service for semantic similarity
      const embedding1 = await _embeddingService.generateEmbedding(text1);
      const embedding2 = await _embeddingService.generateEmbedding(text2);

      if (!embedding1 || !embedding2) {
        return 0; // Return 0 for missing embeddings instead of 0.5
      }

      return this.calculateCosineSimilarity(embedding1, embedding2);

    } catch (error) {
      this.logger.warn('Error calculating semantic similarity', { error });
      return 0; // Return 0 for errors instead of 0.5
    }
  }

  /**
   * Calculate ensemble similarity using multiple algorithms
   */
  calculateEnsembleSimilarity(
    features1: any,
    features2: any,
    _embeddingService?: any
  ): {
    similarity_score: number;
    confidence_interval: { lower: number; upper: number };
    algorithm_weights: Record<string, number>;
    individual_scores: Record<string, number>;
  } {
    try {
      const individualScores: Record<string, number> = {};

      // Calculate individual algorithm scores
      individualScores.cosine = this.calculateCosineSimilarity(
        this.extractNumericalFeatures(features1),
        this.extractNumericalFeatures(features2)
      );

      individualScores.euclidean = this.calculateEuclideanSimilarity(
        this.extractNumericalFeatures(features1),
        this.extractNumericalFeatures(features2)
      );

      individualScores.weighted = this.calculateWeightedSimilarity(features1, features2);

      individualScores.jaccard = this.calculateJaccardTextSimilarity(features1, features2);

      // Note: Semantic similarity would need to be calculated asynchronously
      // For now, we'll use a placeholder
      individualScores.semantic = 0; // Use 0 instead of 0.5 as placeholder

      // Calculate dynamic weights
      const algorithmWeights = this.calculateDynamicAlgorithmWeights(features1, features2, individualScores);

      // Calculate weighted ensemble score
      const ensembleScore = this.calculateWeightedEnsembleScore(individualScores, algorithmWeights);

      // Calculate confidence interval
      const confidenceInterval = this.calculateSimilarityConfidenceInterval(individualScores, algorithmWeights);

      return {
        similarity_score: ensembleScore,
        confidence_interval: confidenceInterval,
        algorithm_weights: algorithmWeights,
        individual_scores: individualScores
      };

    } catch (error) {
      this.logger.warn('Error calculating ensemble similarity', { error });
      return {
        similarity_score: 0, // Return 0 instead of 0.5
        confidence_interval: { lower: 0, upper: 0.2 }, // Adjusted confidence interval
        algorithm_weights: { euclidean: 0.25, cosine: 0.25, weighted: 0.25, jaccard: 0.15, semantic: 0.1 },
        individual_scores: { euclidean: 0, cosine: 0, weighted: 0, jaccard: 0, semantic: 0 } // All 0 instead of 0.5
      };
    }
  }

  /**
   * Calculate dynamic algorithm weights based on data characteristics
   */
  private calculateDynamicAlgorithmWeights(
    currentFeatures: any,
    historicalFeatures: any,
    individualScores: Record<string, number>
  ): Record<string, number> {
    try {
      // Base weights
      const baseWeights: Record<string, number> = {
        euclidean: 0.25,
        cosine: 0.25,
        weighted: 0.25,
        jaccard: 0.15,
        semantic: 0.10
      };

      const dynamicWeights = { ...baseWeights };

      // Adjust weights based on data characteristics

      // Boost Euclidean for numerical data
      const numericalFeatures = ['success_rate', 'profit_loss_ratio', 'volatility_adjusted_return'];
      const hasNumericalData = numericalFeatures.some(feature =>
        (currentFeatures[feature] !== undefined && currentFeatures[feature] !== null) ||
        (historicalFeatures[feature] !== undefined && historicalFeatures[feature] !== null)
      );

      if (hasNumericalData) {
        dynamicWeights.euclidean = (dynamicWeights.euclidean || 0) + 0.1;
        dynamicWeights.cosine = (dynamicWeights.cosine || 0) + 0.05;
      }

      // Boost Jaccard for categorical data
      const categoricalFeatures = ['strategy_type', 'risk_profile', 'time_horizon'];
      const hasCategoricalData = categoricalFeatures.some(feature =>
        currentFeatures[feature] || historicalFeatures[feature]
      );

      if (hasCategoricalData) {
        dynamicWeights.jaccard = (dynamicWeights.jaccard || 0) + 0.1;
        dynamicWeights.weighted = (dynamicWeights.weighted || 0) + 0.05;
      }

      // Boost semantic for text data
      const hasTextData = currentFeatures.description || historicalFeatures.description;
      if (hasTextData) {
        dynamicWeights.semantic = (dynamicWeights.semantic || 0) + 0.1;
        dynamicWeights.jaccard = (dynamicWeights.jaccard || 0) + 0.05;
      }

      // Adjust based on algorithm performance variance
      const scoreVariance = this.calculateScoreVariance(Object.values(individualScores));
      if (scoreVariance > 0.1) {
        // High variance: trust consensus more
        dynamicWeights.euclidean = (dynamicWeights.euclidean || 0) * 0.9;
        dynamicWeights.cosine = (dynamicWeights.cosine || 0) * 0.9;
        dynamicWeights.weighted = (dynamicWeights.weighted || 0) * 1.1;
        dynamicWeights.jaccard = (dynamicWeights.jaccard || 0) * 1.1;
      }

      // Normalize weights
      const totalWeight = Object.values(dynamicWeights).reduce((sum, weight) => sum + weight, 0);
      const normalizedWeights: Record<string, number> = {};

      for (const [algorithm, weight] of Object.entries(dynamicWeights)) {
        normalizedWeights[algorithm] = weight / totalWeight;
      }

      return normalizedWeights;

    } catch (error) {
      this.logger.warn('Error calculating dynamic algorithm weights', { error });
      return {
        euclidean: 0.25,
        cosine: 0.25,
        weighted: 0.25,
        jaccard: 0.15,
        semantic: 0.10
      };
    }
  }

  /**
   * Calculate weighted ensemble score
   */
  private calculateWeightedEnsembleScore(
    individualScores: Record<string, number>,
    weights: Record<string, number>
  ): number {
    try {
      let weightedSum = 0;
      let totalWeight = 0;

      for (const [algorithm, score] of Object.entries(individualScores)) {
        const weight = weights[algorithm] || 0;
        weightedSum += score * weight;
        totalWeight += weight;
      }

      return totalWeight > 0 ? weightedSum / totalWeight : 0; // Return 0 instead of 0.5

    } catch (error) {
      this.logger.warn('Error calculating weighted ensemble score', { error });
      return 0; // Return 0 for errors instead of 0.5
    }
  }

  /**
   * Calculate confidence interval for similarity score
   */
  private calculateSimilarityConfidenceInterval(
    individualScores: Record<string, number>,
    weights: Record<string, number>
  ): { lower: number; upper: number } {
    try {
      const _scores = Object.values(individualScores);
      const weightedScores = Object.entries(individualScores).map(([algorithm, score]) => ({
        score,
        weight: weights[algorithm] || 0
      }));

      // Calculate weighted mean
      const weightedMean = weightedScores.reduce((sum, item) => sum + item.score * item.weight, 0) /
                          weightedScores.reduce((sum, item) => sum + item.weight, 0);

      // Calculate weighted variance
      const weightedVariance = weightedScores.reduce((sum, item) => {
        const diff = item.score - weightedMean;
        return sum + item.weight * diff * diff;
      }, 0) / weightedScores.reduce((sum, item) => sum + item.weight, 0);

      const stdDev = Math.sqrt(weightedVariance);

      // 95% confidence interval (approximately 2 standard deviations)
      const margin = 1.96 * stdDev;
      const lower = Math.max(0, weightedMean - margin);
      const upper = Math.min(1, weightedMean + margin);

      return { lower, upper };

    } catch (error) {
      this.logger.warn('Error calculating confidence interval', { error });
      return { lower: 0.4, upper: 0.6 };
    }
  }

  /**
   * Calculate Jaccard similarity for text features
   */
  private calculateJaccardTextSimilarity(features1: any, features2: any): number {
    try {
      const text1 = this.extractTextFromFeatures(features1);
      const text2 = this.extractTextFromFeatures(features2);

      return this.calculateJaccardSimilarity(text1.split(/\s+/), text2.split(/\s+/));

    } catch (error) {
      this.logger.warn('Error calculating Jaccard text similarity', { error });
      return 0; // Return 0 for errors instead of 0.5
    }
  }

  /**
   * Extract text content from features for similarity calculation
   */
  private extractTextFromFeatures(features: any): string {
    try {
      const textComponents = [];

      // Add description
      if (features.description) {
        textComponents.push(features.description);
      }

      // Add categorical features
      if (features.strategy_type) {
        textComponents.push(`strategy:${features.strategy_type}`);
      }
      if (features.risk_profile) {
        textComponents.push(`risk:${features.risk_profile}`);
      }
      if (features.time_horizon) {
        textComponents.push(`time:${features.time_horizon}`);
      }

      // Add market conditions
      if (features.market_regime) {
        textComponents.push(`market:${features.market_regime}`);
      }

      return textComponents.join(' ');

    } catch (error) {
      this.logger.warn('Error extracting text from features', { error });
      return '';
    }
  }

  /**
   * Calculate variance of scores
   */
  private calculateScoreVariance(scores: number[]): number {
    try {
      if (scores.length < 2) return 0;

      const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;

      return variance;

    } catch (error) {
      this.logger.warn('Error calculating score variance', { error });
      return 0;
    }
  }

  /**
   * Extract numerical features for vector-based similarity calculations
   */
  private extractNumericalFeatures(features: any): number[] {
    try {
      const numericalFeatures = [
        'success_rate',
        'profit_loss_ratio',
        'volatility',
        'max_drawdown',
        'sharpe_ratio',
        'win_rate',
        'avg_return'
      ];

      return numericalFeatures.map(feature => {
        const value = features[feature];
        return typeof value === 'number' ? value : 0;
      });

    } catch (error) {
      this.logger.warn('Error extracting numerical features', { error });
      return [0, 0, 0, 0, 0, 0, 0]; // Default values of 0 instead of 0.5
    }
  }

  /**
   * Calculate ensemble similarity for multi-dimensional similarity
   */
  async calculateEnsembleMultiDimensionalSimilarity(
    result: any,
    criteria: any,
    embeddingService?: any
  ): Promise<{
    market_conditions_similarity: number;
    technical_indicators_similarity: number;
    temporal_similarity: number;
    outcome_similarity: number;
    overall_similarity: number;
    confidence_intervals: Record<string, { lower: number; upper: number }>;
  }> {
    try {
      // Extract features for ensemble calculation
      const currentFeatures = this.extractOutcomeFeatures(criteria);
      const historicalFeatures = this.extractOutcomeFeatures(result);

      // Calculate ensemble similarity
      const ensembleResult = this.calculateEnsembleSimilarity(currentFeatures, historicalFeatures, embeddingService);

      // Calculate component similarities using ensemble approach
      const marketEnsemble = this.calculateComponentEnsembleSimilarity(
        'market',
        currentFeatures,
        historicalFeatures,
        embeddingService
      );

      const technicalEnsemble = this.calculateComponentEnsembleSimilarity(
        'technical',
        currentFeatures,
        historicalFeatures,
        embeddingService
      );

      // Placeholder for temporal and outcome similarity (will be implemented in other modules)
      const temporalSimilarity = 0; // Use 0 instead of 0.5
      const outcomeSimilarity = 0; // Use 0 instead of 0.5

      // Combine into overall similarity
      const overallSimilarity = (
        marketEnsemble.similarity_score * 0.3 +
        technicalEnsemble.similarity_score * 0.3 +
        temporalSimilarity * 0.2 +
        outcomeSimilarity * 0.2
      );

      return {
        market_conditions_similarity: marketEnsemble.similarity_score,
        technical_indicators_similarity: technicalEnsemble.similarity_score,
        temporal_similarity: temporalSimilarity,
        outcome_similarity: outcomeSimilarity,
        overall_similarity: overallSimilarity,
        confidence_intervals: {
          market: marketEnsemble.confidence_interval,
          technical: technicalEnsemble.confidence_interval,
          overall: ensembleResult.confidence_interval
        }
      };

    } catch (error) {
      this.logger.warn('Error calculating ensemble multi-dimensional similarity', { error });
      return {
        market_conditions_similarity: 0, // Return 0 instead of 0.5
        technical_indicators_similarity: 0, // Return 0 instead of 0.5
        temporal_similarity: 0, // Return 0 instead of 0.5
        outcome_similarity: 0, // Return 0 instead of 0.5
        overall_similarity: 0, // Return 0 instead of 0.5
        confidence_intervals: {
          market: { lower: 0, upper: 0.1 }, // Adjusted confidence interval
          technical: { lower: 0, upper: 0.1 }, // Adjusted confidence interval
          overall: { lower: 0, upper: 0.1 } // Adjusted confidence interval
        }
      };
    }
  }

  /**
   * Calculate component-specific ensemble similarity
   */
  private calculateComponentEnsembleSimilarity(
    component: string,
    currentFeatures: any,
    historicalFeatures: any,
    embeddingService?: any
  ): {
    similarity_score: number;
    confidence_interval: { lower: number; upper: number };
  } {
    try {
      // Extract component-specific features
      const componentFeatures = this.extractComponentFeatures(component, currentFeatures, historicalFeatures);

      // Calculate ensemble similarity for component
      const ensembleResult = this.calculateEnsembleSimilarity(
        componentFeatures.current,
        componentFeatures.historical,
        embeddingService
      );

      return {
        similarity_score: ensembleResult.similarity_score,
        confidence_interval: ensembleResult.confidence_interval
      };

    } catch (error) {
      this.logger.warn(`Error calculating ${component} ensemble similarity`, { error });
      return {
        similarity_score: 0, // Return 0 instead of 0.5
        confidence_interval: { lower: 0, upper: 0.1 } // Adjusted confidence interval
      };
    }
  }

  /**
   * Extract component-specific features
   */
  private extractComponentFeatures(
    component: string,
    currentFeatures: any,
    historicalFeatures: any
  ): {
    current: any;
    historical: any;
  } {
    try {
      switch (component) {
        case 'market':
          return {
            current: {
              market_regime: currentFeatures.market_regime,
              volatility: currentFeatures.volatility,
              trend_direction: currentFeatures.trend_direction,
              description: `market ${currentFeatures.market_regime || ''} ${currentFeatures.trend_direction || ''}`
            },
            historical: {
              market_regime: historicalFeatures.market_regime,
              volatility: historicalFeatures.volatility,
              trend_direction: historicalFeatures.trend_direction,
              description: `market ${historicalFeatures.market_regime || ''} ${historicalFeatures.trend_direction || ''}`
            }
          };

        case 'technical':
          return {
            current: {
              rsi: currentFeatures.rsi,
              macd: currentFeatures.macd,
              bollinger_position: currentFeatures.bollinger_position,
              momentum: currentFeatures.momentum,
              description: `technical rsi:${currentFeatures.rsi || 0} macd:${currentFeatures.macd || 0}`
            },
            historical: {
              rsi: historicalFeatures.rsi,
              macd: historicalFeatures.macd,
              bollinger_position: historicalFeatures.bollinger_position,
              momentum: historicalFeatures.momentum,
              description: `technical rsi:${historicalFeatures.rsi || 0} macd:${historicalFeatures.macd || 0}`
            }
          };

        default:
          return {
            current: currentFeatures,
            historical: historicalFeatures
          };
      }

    } catch (error) {
      this.logger.warn('Error extracting component features', { error, component });
      return {
        current: currentFeatures,
        historical: historicalFeatures
      };
    }
  }

  /**
   * Extract outcome features for similarity calculation
   */
  private extractOutcomeFeatures(data: any): any {
    try {
      if (!data) return {};

      return {
        success_rate: data.success_rate || 0, // Use 0 instead of 0.5
        profit_loss_ratio: data.profit_loss_ratio || 0,
        volatility: data.volatility || 0.15,
        market_regime: data.market_regime || 'unknown',
        strategy_type: data.strategy_type || 'unknown',
        risk_profile: data.risk_profile || 'medium',
        time_horizon: data.time_horizon || 'medium',
        description: data.description || ''
      };
    } catch (error) {
      this.logger.warn('Error extracting outcome features', { error });
      return {};
    }
  }
}

/**
 * Factory function to create SimilarityEngine
 */
export function createSimilarityEngine(logger?: any): SimilarityEngine {
  return new SimilarityEngine(logger);
}