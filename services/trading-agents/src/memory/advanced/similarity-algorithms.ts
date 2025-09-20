import { createLogger } from '../../utils/enhanced-logger';
import {
  MarketConditionsSimilarityService,
  TechnicalIndicatorsSimilarityService,
  TemporalSimilarityService,
  OutcomeSimilarityService
} from './similarity-services';
import {
  MLBasedSimilarityService,
  ClusteringAlgorithmsService
} from './ml-services';
import {
  SemanticSimilarityService,
  EnsembleSimilarityService
} from './semantic-similarity-services';

/**
 * Similarity Algorithms Module
 *
 * This module contains all similarity calculation algorithms used by the context retrieval system.
 * It provides multi-dimensional similarity calculations, semantic similarity, ML-based ranking,
 * and ensemble similarity methods with confidence intervals.
 */

export class SimilarityAlgorithms {
  private logger: any;
  private marketConditionsService: MarketConditionsSimilarityService;
  private technicalIndicatorsService: TechnicalIndicatorsSimilarityService;
  private temporalService: TemporalSimilarityService;
  private outcomeService: OutcomeSimilarityService;
  private mlService: MLBasedSimilarityService;
  private clusteringService: ClusteringAlgorithmsService;
  private semanticService: SemanticSimilarityService;
  private ensembleService: EnsembleSimilarityService;

  constructor(logger?: any) {
    this.logger = logger || createLogger('system', 'similarity-algorithms');

    // Initialize service instances
    this.marketConditionsService = new MarketConditionsSimilarityService(logger);
    this.technicalIndicatorsService = new TechnicalIndicatorsSimilarityService(logger);
    this.temporalService = new TemporalSimilarityService(logger);
    this.outcomeService = new OutcomeSimilarityService(logger);
    this.mlService = new MLBasedSimilarityService(logger);
    this.clusteringService = new ClusteringAlgorithmsService(logger);
    this.semanticService = new SemanticSimilarityService(logger);
    this.ensembleService = new EnsembleSimilarityService(logger);
  }

  // Core similarity calculation methods

  /**
   * Calculate multi-dimensional similarity between current and historical results
   */
  calculateMultiDimensionalSimilarity(
    result: any,
    criteria: any,
    _embeddingService?: any
  ): {
    market_conditions_similarity: number;
    technical_indicators_similarity: number;
    temporal_similarity: number;
    outcome_similarity: number;
    overall_similarity: number;
  } {
    try {
      const marketSimilarity = this.marketConditionsService.calculateMarketConditionsSimilarity(result, criteria);
      const technicalSimilarity = this.technicalIndicatorsService.calculateTechnicalIndicatorsSimilarity(result, criteria);
      const temporalSimilarity = this.temporalService.calculateTemporalSimilarity(result);
      const outcomeSimilarity = this.outcomeService.calculateOutcomeSimilarity(result, criteria);

      // Weighted combination for overall similarity
      const overallSimilarity = (
        marketSimilarity * 0.3 +
        technicalSimilarity * 0.3 +
        temporalSimilarity * 0.2 +
        outcomeSimilarity * 0.2
      );

      return {
        market_conditions_similarity: marketSimilarity,
        technical_indicators_similarity: technicalSimilarity,
        temporal_similarity: temporalSimilarity,
        outcome_similarity: outcomeSimilarity,
        overall_similarity: overallSimilarity
      };
    } catch (error) {
      this.logger.warn('Error calculating multi-dimensional similarity', { error });
      return {
        market_conditions_similarity: 0.5,
        technical_indicators_similarity: 0.5,
        temporal_similarity: 0.5,
        outcome_similarity: 0.5,
        overall_similarity: 0.5
      };
    }
  }

  // Advanced scenario search methods

  /**
   * Build scenario search query
   */
  buildScenarioSearchQuery(scenario: any): string {
    try {
      // Build a comprehensive search query from scenario components
      const queryParts: string[] = [];

      // Add core scenario description
      if (scenario.context_description) {
        queryParts.push(`scenario: ${scenario.context_description}`);
      }

      // Add market conditions
      if (scenario.market_conditions) {
        const conditions = scenario.market_conditions;
        if (conditions.market_regime) queryParts.push(`market_regime:${conditions.market_regime}`);
        if (conditions.volatility) queryParts.push(`volatility:${conditions.volatility}`);
        if (conditions.trend_direction) queryParts.push(`trend:${conditions.trend_direction}`);
      }

      // Add strategy context
      if (scenario.strategy_type) {
        queryParts.push(`strategy:${scenario.strategy_type}`);
      }

      // Add time context
      if (scenario.time_horizon) {
        queryParts.push(`timeframe:${scenario.time_horizon}`);
      }

      // Add risk context
      if (scenario.risk_level) {
        queryParts.push(`risk:${scenario.risk_level}`);
      }

      return queryParts.join(' AND ');
    } catch (error) {
      this.logger.warn('Error building scenario search query', { error, scenario });
      return `scenario ${scenario?.context_description || 'unknown'}`;
    }
  }

  /**
   * Calculate scenario similarity
   */
  calculateScenarioSimilarity(current: any, historical: any): number {
    try {
      if (!current || !historical) return 0.0;

      let totalSimilarity = 0;
      let comparableFeatures = 0;

      // Compare market conditions
      if (current.market_conditions && historical.market_conditions) {
        const marketSim = this.compareMarketConditions(current.market_conditions, historical.market_conditions);
        totalSimilarity += marketSim;
        comparableFeatures++;
      }

      // Compare strategy types
      if (current.strategy_type && historical.strategy_type) {
        const strategySim = current.strategy_type === historical.strategy_type ? 1.0 : 0.3;
        totalSimilarity += strategySim;
        comparableFeatures++;
      }

      // Compare time horizons
      if (current.time_horizon && historical.time_horizon) {
        const timeSim = this.compareTimeHorizons(current.time_horizon, historical.time_horizon);
        totalSimilarity += timeSim;
        comparableFeatures++;
      }

      // Compare risk profiles
      if (current.risk_level && historical.risk_level) {
        const riskSim = this.compareRiskLevels(current.risk_level, historical.risk_level);
        totalSimilarity += riskSim;
        comparableFeatures++;
      }

      // Compare outcomes if available
      if (current.outcomes && historical.outcomes) {
        const outcomeSim = this.compareOutcomes(current.outcomes, historical.outcomes);
        totalSimilarity += outcomeSim;
        comparableFeatures++;
      }

      return comparableFeatures > 0 ? totalSimilarity / comparableFeatures : 0.5;
    } catch (error) {
      this.logger.warn('Error calculating scenario similarity', { error, current, historical });
      return 0.5;
    }
  }

  // Helper methods for scenario similarity calculations

  /**
   * Compare market conditions
   */
  private compareMarketConditions(current: any, historical: any): number {
    if (!current || !historical) return 0.5;

    let similarity = 0;
    let features = 0;

    if (current.market_regime && historical.market_regime) {
      similarity += current.market_regime === historical.market_regime ? 1.0 : 0.2;
      features++;
    }

    if (current.volatility && historical.volatility) {
      const volDiff = Math.abs(current.volatility - historical.volatility);
      similarity += Math.exp(-volDiff * 2); // Exponential decay
      features++;
    }

    if (current.trend_direction && historical.trend_direction) {
      similarity += current.trend_direction === historical.trend_direction ? 1.0 : 0.1;
      features++;
    }

    return features > 0 ? similarity / features : 0.5;
  }

  /**
   * Compare time horizons
   */
  private compareTimeHorizons(current: string, historical: string): number {
    const timeMap: Record<string, number> = {
      'short': 1, 'medium': 2, 'long': 3, 'intraday': 0.5, 'weekly': 1.5, 'monthly': 2.5, 'yearly': 3.5
    };

    const currentVal = timeMap[current.toLowerCase()] || 2;
    const historicalVal = timeMap[historical.toLowerCase()] || 2;

    const diff = Math.abs(currentVal - historicalVal);
    return Math.max(0, 1 - diff / 3); // Scale from 0 to 1
  }

  /**
   * Compare risk levels
   */
  private compareRiskLevels(current: string, historical: string): number {
    const riskMap: Record<string, number> = {
      'low': 1, 'conservative': 1, 'medium': 2, 'moderate': 2, 'high': 3, 'aggressive': 3
    };

    const currentVal = riskMap[current.toLowerCase()] || 2;
    const historicalVal = riskMap[historical.toLowerCase()] || 2;

    const diff = Math.abs(currentVal - historicalVal);
    return Math.max(0, 1 - diff / 2); // Scale from 0 to 1
  }

  /**
   * Compare outcomes
   */
  private compareOutcomes(current: any, historical: any): number {
    if (!current || !historical) return 0.5;

    let similarity = 0;
    let features = 0;

    // Compare success rates
    if (current.success_rate && historical.success_rate) {
      const successDiff = Math.abs(current.success_rate - historical.success_rate);
      similarity += Math.exp(-successDiff * 3);
      features++;
    }

    // Compare profit/loss outcomes
    if (current.profit_loss && historical.profit_loss) {
      const plSimilarity = (current.profit_loss > 0) === (historical.profit_loss > 0) ? 1.0 : 0.2;
      similarity += plSimilarity;
      features++;
    }

    return features > 0 ? similarity / features : 0.5;
  }

  // Semantic embedding similarity methods

  /**
   * Cluster similar outcomes for pattern recognition
   */
  clusterOutcomes(outcomes: any[]): {
    clusters: Array<{
      centroid: any;
      members: any[];
      cluster_id: string;
      pattern_type: string;
      confidence: number;
    }>;
    clusterAssignments: Map<string, string>;
  } {
    return this.clusteringService.clusterOutcomes(outcomes);
  }

  // Semantic embedding similarity methods

  /**
   * Calculate semantic similarity using embeddings for text content
   */
  async calculateSemanticSimilarity(
    currentText: string,
    historicalText: string,
    _embeddingService?: any
  ): Promise<number> {
    return this.semanticService.calculateSemanticSimilarity(currentText, historicalText, undefined);
  }

  // Ensemble similarity methods with confidence intervals

  /**
   * Calculate ensemble similarity using multiple algorithms with confidence intervals
   */
  calculateEnsembleSimilarity(
    currentFeatures: any,
    historicalFeatures: any,
    _embeddingService?: any
  ): {
    similarity_score: number;
    confidence_interval: { lower: number; upper: number };
    algorithm_weights: Record<string, number>;
    individual_scores: Record<string, number>;
  } {
    try {
      // Calculate individual algorithm scores
      const individualScores: Record<string, number> = {};

      // Calculate synchronous versions for immediate use
      individualScores.euclidean = this.mlService.calculateEuclideanSimilarity(currentFeatures, historicalFeatures);
      individualScores.cosine = this.mlService.calculateCosineSimilarity(currentFeatures, historicalFeatures);
      individualScores.weighted = this.mlService.calculateWeightedSimilarity(currentFeatures, historicalFeatures);
      individualScores.jaccard = this.calculateJaccardTextSimilarity(currentFeatures, historicalFeatures);
      individualScores.semantic = 0.5; // Placeholder for async semantic similarity

      // Calculate dynamic algorithm weights based on data characteristics
      const algorithmWeights = this.calculateDynamicAlgorithmWeights(currentFeatures, historicalFeatures, individualScores);

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
        similarity_score: 0.5,
        confidence_interval: { lower: 0.4, upper: 0.6 },
        algorithm_weights: { euclidean: 0.25, cosine: 0.25, weighted: 0.25, jaccard: 0.15, semantic: 0.1 },
        individual_scores: { euclidean: 0.5, cosine: 0.5, weighted: 0.5, jaccard: 0.5, semantic: 0.5 }
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

      return totalWeight > 0 ? weightedSum / totalWeight : 0.5;

    } catch (error) {
      this.logger.warn('Error calculating weighted ensemble score', { error });
      return 0.5;
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

      return this.calculateJaccardTextSimilarity(text1, text2);

    } catch (error) {
      this.logger.warn('Error calculating Jaccard text similarity', { error });
      return 0.5;
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
}

/**
 * Factory function to create SimilarityAlgorithms instance
 */
export function createSimilarityAlgorithms(logger?: any): SimilarityAlgorithms {
  return new SimilarityAlgorithms(logger);
}