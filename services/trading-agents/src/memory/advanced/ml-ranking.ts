import { createLogger } from '../../utils/enhanced-logger';
import { ContextRetrievalCriteria, RetrievedMemoryContext } from './context-retrieval/types';

/**
 * ML Ranking Module
 *
 * This module contains all ML-based ranking and advanced similarity calculation methods
 * for context retrieval and memory ranking.
 */

export class MLRanking {
  private logger: any;

  constructor(logger?: any) {
    this.logger = logger || createLogger('system', 'MLRanking');
  }

  // ML-based Relevance Ranking Methods

  /**
   * Calculate ML-based relevance ranking with feature importance
   */
  async calculateMLRelevanceRanking(
    memories: RetrievedMemoryContext[],
    queryCriteria: ContextRetrievalCriteria
  ): Promise<RetrievedMemoryContext[]> {
    try {
      if (memories.length === 0) return memories;

      // Extract features for ML ranking
      const rankingFeatures = memories.map(memory => this.extractRankingFeatures(memory, queryCriteria));

      // Calculate feature importance weights
      const featureWeights = this.calculateFeatureImportanceWeights(rankingFeatures, queryCriteria);

      // Apply ML-based ranking algorithm
      const rankedMemories = this.applyMLRankingAlgorithm(memories, rankingFeatures, featureWeights);

      return rankedMemories;

    } catch (error) {
      this.logger.warn('Error in ML relevance ranking', { error });
      // Fallback to simple relevance-based sorting
      return memories.sort((a, b) => b.relevance_score - a.relevance_score);
    }
  }

  /**
   * Extract features for ML-based ranking
   */
  private extractRankingFeatures(
    memory: RetrievedMemoryContext,
    queryCriteria: ContextRetrievalCriteria
  ): {
    relevance_score: number;
    recency_score: number;
    market_alignment: number;
    technical_alignment: number;
    outcome_quality: number;
    contextual_relevance: number;
    confidence_score: number;
    source_reliability: number;
    temporal_proximity: number;
    categorical_match: number;
  } {
    try {
      const breakdown = memory.similarity_breakdown;

      return {
        relevance_score: memory.relevance_score,
        recency_score: this.calculateRecencyScore(memory.memory_content.timestamp),
        market_alignment: breakdown.market_conditions_similarity,
        technical_alignment: breakdown.technical_indicators_similarity,
        outcome_quality: breakdown.outcome_similarity,
        contextual_relevance: this.calculateContextualRelevance(memory, queryCriteria),
        confidence_score: memory.memory_content.confidence || 0.5,
        source_reliability: memory.meta_information.source_reliability,
        temporal_proximity: breakdown.temporal_similarity,
        categorical_match: this.calculateCategoricalMatch(memory, queryCriteria)
      };

    } catch (error) {
      this.logger.warn('Error extracting ranking features', { error, memoryId: memory.memory_id });
      return {
        relevance_score: 0.5,
        recency_score: 0.5,
        market_alignment: 0.5,
        technical_alignment: 0.5,
        outcome_quality: 0.5,
        contextual_relevance: 0.5,
        confidence_score: 0.5,
        source_reliability: 0.5,
        temporal_proximity: 0.5,
        categorical_match: 0.5
      };
    }
  }

  /**
   * Calculate feature importance weights using ML approach
   */
  private calculateFeatureImportanceWeights(
    rankingFeatures: any[],
    queryCriteria: ContextRetrievalCriteria
  ): Record<string, number> {
    try {
      // Base importance weights
      const baseWeights: Record<string, number> = {
        relevance_score: 0.25,
        recency_score: 0.15,
        market_alignment: 0.15,
        technical_alignment: 0.10,
        outcome_quality: 0.10,
        contextual_relevance: 0.10,
        confidence_score: 0.05,
        source_reliability: 0.05,
        temporal_proximity: 0.03,
        categorical_match: 0.02
      };

      // Adjust weights based on query criteria
      const adjustedWeights: Record<string, number> = { ...baseWeights };

      // Boost market alignment if market conditions are specified
      if (queryCriteria.current_market_conditions) {
        adjustedWeights.market_alignment = (adjustedWeights.market_alignment || 0) + 0.1;
        adjustedWeights.technical_alignment = (adjustedWeights.technical_alignment || 0) + 0.05;
      }

      // Boost technical alignment if technical indicators are specified
      if (queryCriteria.technical_indicators) {
        adjustedWeights.technical_alignment = (adjustedWeights.technical_alignment || 0) + 0.1;
        adjustedWeights.market_alignment = (adjustedWeights.market_alignment || 0) + 0.05;
      }

      // Boost outcome quality for strategy-specific queries
      if (queryCriteria.strategy_type) {
        adjustedWeights.outcome_quality = (adjustedWeights.outcome_quality || 0) + 0.1;
        adjustedWeights.categorical_match = (adjustedWeights.categorical_match || 0) + 0.05;
      }

      // Boost recency for short-term focused queries
      if (queryCriteria.time_horizon === 'short' || queryCriteria.time_horizon === 'intraday') {
        adjustedWeights.recency_score = (adjustedWeights.recency_score || 0) + 0.1;
        adjustedWeights.temporal_proximity = (adjustedWeights.temporal_proximity || 0) + 0.05;
      }

      // Normalize weights to sum to 1.0
      const totalWeight = Object.values(adjustedWeights).reduce((sum, weight) => sum + weight, 0);
      const normalizedWeights: Record<string, number> = {};

      for (const [feature, weight] of Object.entries(adjustedWeights)) {
        normalizedWeights[feature] = weight / totalWeight;
      }

      return normalizedWeights;

    } catch (error) {
      this.logger.warn('Error calculating feature importance weights', { error });
      return {
        relevance_score: 0.25,
        recency_score: 0.15,
        market_alignment: 0.15,
        technical_alignment: 0.10,
        outcome_quality: 0.10,
        contextual_relevance: 0.10,
        confidence_score: 0.05,
        source_reliability: 0.05,
        temporal_proximity: 0.03,
        categorical_match: 0.02
      };
    }
  }

  /**
   * Apply ML-based ranking algorithm
   */
  private applyMLRankingAlgorithm(
    memories: RetrievedMemoryContext[],
    rankingFeatures: any[],
    featureWeights: Record<string, number>
  ): RetrievedMemoryContext[] {
    try {
      // Calculate ML-based ranking scores
      const rankedMemories = memories.map((memory, index) => {
        const features = rankingFeatures[index];
        const mlScore = this.calculateMLRankingScore(features, featureWeights);

        return {
          ...memory,
          ml_ranking_score: mlScore
        };
      });

      // Sort by ML ranking score (descending)
      rankedMemories.sort((a, b) => (b as any).ml_ranking_score - (a as any).ml_ranking_score);

      // Update relevance scores with ML ranking
      return rankedMemories.map(memory => ({
        ...memory,
        relevance_score: (memory.relevance_score + (memory as any).ml_ranking_score) / 2
      }));

    } catch (error) {
      this.logger.warn('Error applying ML ranking algorithm', { error });
      return memories;
    }
  }

  /**
   * Calculate ML-based similarity score for a single memory
   */
  calculateMLRankingScore(
    features: any,
    weights: Record<string, number>
  ): number {
    try {
      let score = 0;

      // Apply weighted sum with feature transformations
      for (const [featureName, weight] of Object.entries(weights)) {
        const featureValue = features[featureName] || 0;

        // Apply feature-specific transformations
        let transformedValue = featureValue;

        switch (featureName) {
          case 'recency_score':
            // Exponential boost for recent items
            transformedValue = Math.pow(featureValue, 1.5);
            break;
          case 'confidence_score':
            // Square confidence for stronger effect
            transformedValue = Math.pow(featureValue, 2);
            break;
          case 'outcome_quality':
            // Boost high-quality outcomes
            transformedValue = featureValue > 0.7 ? featureValue * 1.2 : featureValue * 0.8;
            break;
          case 'market_alignment':
          case 'technical_alignment':
            // Apply sigmoid transformation for better discrimination
            transformedValue = 1 / (1 + Math.exp(-3 * (featureValue - 0.5)));
            break;
        }

        score += transformedValue * weight;
      }

      // Apply final normalization and boosting
      const normalizedScore = Math.max(0, Math.min(1, score));

      // Boost top performers
      if (normalizedScore > 0.8) {
        return normalizedScore * 1.1;
      } else if (normalizedScore > 0.6) {
        return normalizedScore * 1.05;
      }

      return normalizedScore;

    } catch (error) {
      this.logger.warn('Error calculating ML ranking score', { error });
      return 0.5;
    }
  }

  /**
   * Calculate recency score based on timestamp
   */
  private calculateRecencyScore(timestamp: string): number {
    try {
      const memoryDate = new Date(timestamp);
      const now = new Date();
      const ageInDays = (now.getTime() - memoryDate.getTime()) / (1000 * 60 * 60 * 24);

      // Exponential decay: newer = higher score
      // Half-life of 30 days
      const decayRate = Math.log(2) / 30;
      const recencyScore = Math.exp(-decayRate * ageInDays);

      return Math.max(0.1, Math.min(1, recencyScore));

    } catch (error) {
      this.logger.warn('Error calculating recency score', { error });
      return 0.5;
    }
  }

  /**
   * Calculate contextual relevance based on query criteria
   */
  private calculateContextualRelevance(
    memory: RetrievedMemoryContext,
    queryCriteria: ContextRetrievalCriteria
  ): number {
    try {
      let relevance = 0.5;
      let factors = 0;

      // Strategy type alignment
      if (queryCriteria.strategy_type && memory.memory_content.description) {
        const strategyMatch = memory.memory_content.description.toLowerCase().includes(
          queryCriteria.strategy_type.toLowerCase()
        );
        relevance += strategyMatch ? 0.2 : -0.1;
        factors++;
      }

      // Risk tolerance alignment
      if (queryCriteria.risk_tolerance && memory.memory_content.description) {
        const riskMatch = memory.memory_content.description.toLowerCase().includes(
          queryCriteria.risk_tolerance.toLowerCase()
        );
        relevance += riskMatch ? 0.15 : -0.05;
        factors++;
      }

      // Time horizon alignment
      if (queryCriteria.time_horizon && memory.memory_content.description) {
        const timeMatch = memory.memory_content.description.toLowerCase().includes(
          queryCriteria.time_horizon.toLowerCase()
        );
        relevance += timeMatch ? 0.15 : -0.05;
        factors++;
      }

      return factors > 0 ? Math.max(0, Math.min(1, relevance)) : 0.5;

    } catch (error) {
      this.logger.warn('Error calculating contextual relevance', { error });
      return 0.5;
    }
  }

  /**
   * Calculate categorical match score
   */
  private calculateCategoricalMatch(
    memory: RetrievedMemoryContext,
    queryCriteria: ContextRetrievalCriteria
  ): number {
    try {
      let matches = 0;
      let totalCategories = 0;

      // Strategy type match
      if (queryCriteria.strategy_type) {
        totalCategories++;
        // This would be more sophisticated in a real implementation
        if (memory.memory_content.description?.toLowerCase().includes(
          queryCriteria.strategy_type.toLowerCase()
        )) {
          matches++;
        }
      }

      // Risk profile match
      if (queryCriteria.risk_tolerance) {
        totalCategories++;
        if (memory.memory_content.description?.toLowerCase().includes(
          queryCriteria.risk_tolerance.toLowerCase()
        )) {
          matches++;
        }
      }

      // Time horizon match
      if (queryCriteria.time_horizon) {
        totalCategories++;
        if (memory.memory_content.description?.toLowerCase().includes(
          queryCriteria.time_horizon.toLowerCase()
        )) {
          matches++;
        }
      }

      return totalCategories > 0 ? matches / totalCategories : 0.5;

    } catch (error) {
      this.logger.warn('Error calculating categorical match', { error });
      return 0.5;
    }
  }

  // Ensemble Similarity Methods

  /**
   * Calculate ensemble similarity using multiple algorithms with confidence intervals
   */
  calculateEnsembleSimilarity(
    currentFeatures: any,
    historicalFeatures: any,
    embeddingService?: any
  ): {
    similarity_score: number;
    confidence_interval: { lower: number; upper: number };
    algorithm_weights: Record<string, number>;
    individual_scores: Record<string, number>;
  } {
    try {
      // Define ensemble of similarity algorithms
      const _algorithms = {
        euclidean: () => this.calculateEuclideanSimilarity(currentFeatures, historicalFeatures),
        cosine: () => this.calculateCosineSimilarity(currentFeatures, historicalFeatures),
        weighted: () => this.calculateWeightedSimilarity(currentFeatures, historicalFeatures),
        jaccard: () => this.calculateJaccardTextSimilarity(currentFeatures, historicalFeatures),
        semantic: () => this.calculateSemanticSimilarity(
          this.extractTextFromFeatures(currentFeatures),
          this.extractTextFromFeatures(historicalFeatures),
          embeddingService
        )
      };

      // Calculate individual algorithm scores
      const individualScores: Record<string, number> = {};

      // Calculate synchronous versions for immediate use
      individualScores.euclidean = this.calculateEuclideanSimilarity(currentFeatures, historicalFeatures);
      individualScores.cosine = this.calculateCosineSimilarity(currentFeatures, historicalFeatures);
      individualScores.weighted = this.calculateWeightedSimilarity(currentFeatures, historicalFeatures);
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

      return this.calculateJaccardSimilarity(text1, text2);

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

  // Semantic Similarity Methods

  /**
   * Calculate semantic similarity using embeddings for text content
   */
  async calculateSemanticSimilarity(
    currentText: string,
    historicalText: string,
    embeddingService?: any
  ): Promise<number> {
    try {
      if (!currentText || !historicalText) return 0.5;

      // If embedding service is available, use it for semantic similarity
      if (embeddingService && typeof embeddingService.generateEmbedding === 'function') {
        const currentEmbedding = await embeddingService.generateEmbedding(currentText);
        const historicalEmbedding = await embeddingService.generateEmbedding(historicalText);

        if (currentEmbedding && historicalEmbedding) {
          return this.calculateEmbeddingSimilarity(currentEmbedding, historicalEmbedding);
        }
      }

      // Fallback to text-based similarity if embeddings not available
      return this.calculateTextSimilarity(currentText, historicalText);

    } catch (error) {
      this.logger.warn('Error calculating semantic similarity', { error });
      return 0.5;
    }
  }

  /**
   * Calculate similarity between embeddings using cosine similarity
   */
  private calculateEmbeddingSimilarity(embedding1: number[], embedding2: number[]): number {
    try {
      if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
        return 0.5;
      }

      // Calculate cosine similarity
      let dotProduct = 0;
      let norm1 = 0;
      let norm2 = 0;

      for (let i = 0; i < embedding1.length; i++) {
        const val1 = embedding1[i] || 0;
        const val2 = embedding2[i] || 0;
        dotProduct += val1 * val2;
        norm1 += val1 * val1;
        norm2 += val2 * val2;
      }

      if (norm1 === 0 || norm2 === 0) return 0.5;

      const cosineSimilarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));

      // Normalize to 0-1 range and apply sigmoid for better discrimination
      const normalizedSimilarity = (cosineSimilarity + 1) / 2;
      return 1 / (1 + Math.exp(-3 * (normalizedSimilarity - 0.5))); // Sigmoid transformation

    } catch (error) {
      this.logger.warn('Error calculating embedding similarity', { error });
      return 0.5;
    }
  }

  /**
   * Calculate text similarity using various text analysis methods
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    try {
      if (!text1 || !text2) return 0.5;

      // Normalize texts
      const normalizedText1 = this.normalizeText(text1);
      const normalizedText2 = this.normalizeText(text2);

      // Calculate multiple similarity metrics
      const jaccardSimilarity = this.calculateJaccardSimilarity(normalizedText1, normalizedText2);
      const levenshteinSimilarity = this.calculateLevenshteinSimilarity(normalizedText1, normalizedText2);
      const ngramSimilarity = this.calculateNGramSimilarity(normalizedText1, normalizedText2, 2);

      // Weighted combination of similarity metrics
      const weights = {
        jaccard: 0.4,
        levenshtein: 0.3,
        ngram: 0.3
      };

      const combinedSimilarity = (
        jaccardSimilarity * weights.jaccard +
        levenshteinSimilarity * weights.levenshtein +
        ngramSimilarity * weights.ngram
      );

      return Math.max(0, Math.min(1, combinedSimilarity));

    } catch (error) {
      this.logger.warn('Error calculating text similarity', { error });
      return 0.5;
    }
  }

  /**
   * Normalize text for similarity comparison
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Calculate Jaccard similarity between two texts
   */
  private calculateJaccardSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(' ').filter(word => word.length > 0));
    const words2 = new Set(text2.split(' ').filter(word => word.length > 0));

    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Calculate Levenshtein distance similarity
   */
  private calculateLevenshteinSimilarity(text1: string, text2: string): number {
    const maxLength = Math.max(text1.length, text2.length);
    if (maxLength === 0) return 1;

    const distance = this.levenshteinDistance(text1, text2);
    return 1 - (distance / maxLength);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    // Simple character-by-character comparison for similarity
    // This is a simplified version to avoid complex matrix operations
    const longer = str1.length > str2.length ? str1 : str2;

    if (longer.length === 0) return 0;

    // Count character differences
    let differences = 0;
    const minLength = Math.min(str1.length, str2.length);

    for (let i = 0; i < minLength; i++) {
      if (str1[i] !== str2[i]) {
        differences++;
      }
    }

    // Add penalty for length difference
    differences += Math.abs(str1.length - str2.length);

    return differences;
  }

  /**
   * Calculate N-gram similarity
   */
  private calculateNGramSimilarity(text1: string, text2: string, n: number): number {
    const ngrams1 = this.generateNGrams(text1, n);
    const ngrams2 = this.generateNGrams(text2, n);

    const intersection = new Set([...ngrams1].filter(ngram => ngrams2.has(ngram)));
    const union = new Set([...ngrams1, ...ngrams2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Generate N-grams from text
   */
  private generateNGrams(text: string, n: number): Set<string> {
    const ngrams = new Set<string>();
    const words = text.split(' ').filter(word => word.length > 0);

    for (let i = 0; i <= words.length - n; i++) {
      const ngram = words.slice(i, i + n).join(' ');
      ngrams.add(ngram);
    }

    return ngrams;
  }

  /**
   * Extract semantic features from memory content for embedding
   */
  private extractSemanticFeatures(memory: RetrievedMemoryContext): string {
    try {
      const components = [
        memory.memory_content.description,
        `market_regime:${memory.similarity_breakdown.market_conditions_similarity > 0.7 ? 'similar' : 'different'}`,
        `outcome:${memory.similarity_breakdown.outcome_similarity > 0.7 ? 'similar' : 'different'}`,
        `technical:${memory.similarity_breakdown.technical_indicators_similarity > 0.7 ? 'similar' : 'different'}`,
        `temporal:${memory.similarity_breakdown.temporal_similarity > 0.7 ? 'recent' : 'distant'}`
      ];

      // Add contextual insights
      if (memory.contextual_insights.key_factors.length > 0) {
        components.push(`factors:${memory.contextual_insights.key_factors.join(', ')}`);
      }

      if (memory.contextual_insights.recommended_actions.length > 0) {
        components.push(`actions:${memory.contextual_insights.recommended_actions.join(', ')}`);
      }

      return components.join(' | ');

    } catch (error) {
      this.logger.warn('Error extracting semantic features', { error });
      return memory.memory_content.description || 'unknown memory content';
    }
  }

  /**
   * Calculate semantic similarity between memories using embeddings
   */
  async calculateMemorySemanticSimilarity(
    memory1: RetrievedMemoryContext,
    memory2: RetrievedMemoryContext,
    embeddingService?: any
  ): Promise<number> {
    try {
      const text1 = this.extractSemanticFeatures(memory1);
      const text2 = this.extractSemanticFeatures(memory2);

      return await this.calculateSemanticSimilarity(text1, text2, embeddingService);

    } catch (error) {
      this.logger.warn('Error calculating memory semantic similarity', { error });
      return 0.5;
    }
  }

  /**
   * Enhance similarity calculation with semantic analysis
   */
  async enhanceSimilarityWithSemantics(
    baseSimilarity: {
      market_conditions_similarity: number;
      technical_indicators_similarity: number;
      temporal_similarity: number;
      outcome_similarity: number;
      overall_similarity: number;
    },
    memory1: RetrievedMemoryContext,
    memory2: RetrievedMemoryContext,
    embeddingService?: any
  ): Promise<typeof baseSimilarity> {
    try {
      // Calculate semantic similarity
      const semanticSimilarity = await this.calculateMemorySemanticSimilarity(memory1, memory2, embeddingService);

      // Enhance overall similarity with semantic component
      const enhancedOverall = 0.8 * baseSimilarity.overall_similarity + 0.2 * semanticSimilarity;

      return {
        ...baseSimilarity,
        overall_similarity: Math.max(0, Math.min(1, enhancedOverall))
      };

    } catch (error) {
      this.logger.warn('Error enhancing similarity with semantics', { error });
      return baseSimilarity;
    }
  }

  /**
   * Create embedding-based memory index for faster semantic search
   */
  createSemanticMemoryIndex(memories: RetrievedMemoryContext[]): Map<string, number[]> {
    const index = new Map<string, number[]>();

    // This would be used with actual embedding service
    // For now, create placeholder embeddings based on content hash
    for (const memory of memories) {
      const contentHash = this.simpleHash(memory.memory_content.description);
      // Create a simple pseudo-embedding based on memory characteristics
      const pseudoEmbedding = this.createPseudoEmbedding(memory, contentHash);
      index.set(memory.memory_id, pseudoEmbedding);
    }

    return index;
  }

  /**
   * Create pseudo-embedding for demonstration purposes
   */
  private createPseudoEmbedding(memory: RetrievedMemoryContext, contentHash: number): number[] {
    // Create a 128-dimensional pseudo-embedding based on memory characteristics
    const embedding = new Array(128);

    // Use different aspects of the memory to create embedding dimensions
    const baseValue = contentHash % 1000 / 1000; // 0-1 range

    for (let i = 0; i < 128; i++) {
      // Create variation based on memory properties
      const variation = Math.sin(i * 0.1) * Math.cos(baseValue * Math.PI * 2);
      const similarityFactor = (
        memory.similarity_breakdown.market_conditions_similarity +
        memory.similarity_breakdown.technical_indicators_similarity +
        memory.similarity_breakdown.temporal_similarity +
        memory.similarity_breakdown.outcome_similarity
      ) / 4;

      embedding[i] = (baseValue + variation * 0.1 + similarityFactor * 0.2) % 1;
    }

    return embedding;
  }

  /**
   * Simple hash function for content
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Advanced Similarity Methods

  /**
   * Calculate outcome similarity between current criteria and historical results
   */
  async calculateOutcomeSimilarity(result: any, criteria: ContextRetrievalCriteria): Promise<number> {
    try {
      // Extract outcomes from the result
      const resultOutcomes = this.extractOutcomesFromFact(result);

      if (!resultOutcomes || Object.keys(resultOutcomes).length === 0) {
        return 0.5; // Neutral similarity when no outcome data
      }

      // Extract features for ML-based similarity calculation
      const currentFeatures = this.extractOutcomeFeatures(criteria);
      const historicalFeatures = this.extractOutcomeFeatures(resultOutcomes);

      // Calculate multi-dimensional similarity using ML approach
      const similarityScore = this.calculateMLSimilarityScore(currentFeatures, historicalFeatures);

      // Apply confidence adjustment based on data quality
      const confidence = this.calculateOutcomeConfidence(resultOutcomes);
      const adjustedSimilarity = this.applyConfidenceAdjustment(similarityScore, confidence);

      // Apply temporal decay for older outcomes
      const temporalDecay = this.calculateTemporalDecay(result);
      const finalSimilarity = adjustedSimilarity * temporalDecay;

      return Math.max(0, Math.min(1, finalSimilarity));
    } catch (error) {
      this.logger.warn('Error calculating outcome similarity', { error, result });
      return 0.5;
    }
  }

  /**
   * Extract outcome features for ML-based similarity calculation
   */
  private extractOutcomeFeatures(data: any): {
    strategy_type: string;
    risk_profile: string;
    time_horizon: string;
    success_rate: number;
    profit_loss_ratio: number;
    volatility_adjusted_return: number;
    max_drawdown: number;
    sharpe_ratio: number;
    win_rate: number;
    avg_trade_duration: number;
    market_regime_performance: Record<string, number>;
  } {
    try {
      // Extract and normalize features
      const features = {
        strategy_type: data.strategy_type || data.strategy || 'unknown',
        risk_profile: data.risk_tolerance || data.risk_level || data.risk_profile || 'medium',
        time_horizon: data.time_horizon || data.timeframe || 'medium',
        success_rate: this.normalizeSuccessRate(data.success_rate || data.win_rate || data.accuracy || 0.5),
        profit_loss_ratio: this.normalizeProfitLossRatio(data.profit_loss || data.pnl || data.return || 0),
        volatility_adjusted_return: this.calculateVolatilityAdjustedReturn(data),
        max_drawdown: Math.abs(data.max_drawdown || data.drawdown || 0),
        sharpe_ratio: data.sharpe_ratio || data.risk_adjusted_return || 0,
        win_rate: this.normalizeWinRate(data.win_rate || data.success_rate || 0.5),
        avg_trade_duration: data.avg_trade_duration || data.holding_period || 1,
        market_regime_performance: this.extractMarketRegimePerformance(data)
      };

      return features;
    } catch (error) {
      this.logger.warn('Error extracting outcome features', { error, data });
      return this.getDefaultOutcomeFeatures();
    }
  }

  /**
   * Calculate ML-based similarity score using multiple algorithms
   */
  calculateMLSimilarityScore(currentFeatures: any, historicalFeatures: any): number {
    try {
      // Calculate similarity using multiple approaches
      const euclideanSimilarity = this.calculateEuclideanSimilarity(currentFeatures, historicalFeatures);
      const cosineSimilarity = this.calculateCosineSimilarity(currentFeatures, historicalFeatures);
      const weightedSimilarity = this.calculateWeightedSimilarity(currentFeatures, historicalFeatures);

      // Ensemble approach: weighted average of different similarity measures
      const ensembleWeights = {
        euclidean: 0.3,
        cosine: 0.4,
        weighted: 0.3
      };

      const ensembleSimilarity = (
        euclideanSimilarity * ensembleWeights.euclidean +
        cosineSimilarity * ensembleWeights.cosine +
        weightedSimilarity * ensembleWeights.weighted
      );

      // Apply non-linear transformation for better discrimination
      return this.applySimilarityTransformation(ensembleSimilarity);

    } catch (error) {
      this.logger.warn('Error calculating ML similarity score', { error });
      return 0.5;
    }
  }

  /**
   * Calculate confidence in outcome data quality
   */
  private calculateOutcomeConfidence(outcomes: any): number {
    try {
      let confidence = 0.5; // Base confidence
      let factors = 0;

      // Data completeness factor
      const requiredFields = ['success_rate', 'profit_loss', 'strategy_type'];
      const presentFields = requiredFields.filter(field => outcomes[field] !== undefined);
      confidence += (presentFields.length / requiredFields.length) * 0.3;
      factors++;

      // Data consistency factor
      if (outcomes.success_rate && outcomes.win_rate) {
        const consistency = 1 - Math.abs(outcomes.success_rate - outcomes.win_rate);
        confidence += consistency * 0.2;
        factors++;
      }

      // Historical performance factor
      if (outcomes.confidence_score !== undefined) {
        confidence += outcomes.confidence_score * 0.3;
        factors++;
      }

      // Sample size factor (if available)
      if (outcomes.sample_size) {
        const sampleConfidence = Math.min(outcomes.sample_size / 100, 1) * 0.2;
        confidence += sampleConfidence;
        factors++;
      }

      return factors > 0 ? confidence / factors : 0.5;

    } catch (error) {
      this.logger.warn('Error calculating outcome confidence', { error });
      return 0.5;
    }
  }

  /**
   * Apply confidence adjustment to similarity score
   */
  private applyConfidenceAdjustment(similarity: number, confidence: number): number {
    // Higher confidence increases similarity, lower confidence decreases it
    const adjustment = (confidence - 0.5) * 0.2; // ±0.2 adjustment range
    return Math.max(0, Math.min(1, similarity + adjustment));
  }

  /**
   * Calculate temporal decay for older outcomes
   */
  private calculateTemporalDecay(result: any): number {
    try {
      if (!result.created_at) return 0.8; // Default decay for unknown age

      const resultDate = new Date(result.created_at);
      const now = new Date();
      const ageInDays = (now.getTime() - resultDate.getTime()) / (1000 * 60 * 60 * 24);

      // Exponential decay: newer data has higher weight
      // Half-life of 180 days (6 months)
      const decayRate = Math.log(2) / 180;
      const decay = Math.exp(-decayRate * ageInDays);

      return Math.max(0.1, decay); // Minimum decay of 0.1

    } catch (error) {
      this.logger.warn('Error calculating temporal decay', { error });
      return 0.8;
    }
  }

  /**
   * Extract outcomes from fact data
   */
  private extractOutcomesFromFact(fact: any): any {
    try {
      if (!fact) return {};

      // Extract outcomes from various fact structures
      return {
        strategy_type: fact.strategy_type || fact.trading_strategy || fact.approach,
        success_rate: fact.success_rate || fact.win_rate || fact.accuracy,
        profit_loss: fact.profit_loss || fact.pnl || fact.return || fact.performance,
        risk_outcome: fact.risk_outcome || fact.risk_level || fact.risk_assessment,
        time_effectiveness: fact.time_effectiveness || fact.time_horizon || fact.holding_period,
        confidence_score: fact.confidence_score || fact.confidence || fact.certainty,
        market_impact: fact.market_impact || fact.alpha || fact.beta,
        drawdown: fact.drawdown || fact.max_drawdown,
        sharpe_ratio: fact.sharpe_ratio || fact.risk_adjusted_return,
        execution_quality: fact.execution_quality || fact.slippage || fact.fill_rate,
        outcome_category: this.categorizeOutcome(fact),
        lessons_learned: fact.lessons_learned || fact.insights || fact.notes
      };
    } catch (error) {
      this.logger.warn('Error extracting outcomes from fact', { error, fact });
      return {};
    }
  }

  /**
   * Categorize outcome based on performance metrics
   */
  private categorizeOutcome(fact: any): string {
    if (!fact) return 'unknown';

    const profit = fact.profit_loss || fact.pnl || fact.return;
    if (profit !== undefined) {
      if (profit > 0.05) return 'highly_successful';
      if (profit > 0) return 'successful';
      if (profit > -0.05) return 'neutral';
      return 'unsuccessful';
    }

    const success = fact.success_rate || fact.win_rate;
    if (success !== undefined) {
      if (success > 0.7) return 'highly_successful';
      if (success > 0.5) return 'successful';
      if (success > 0.3) return 'neutral';
      return 'unsuccessful';
    }

    return 'unknown';
  }

  /**
   * Normalize success rate to 0-1 range
   */
  private normalizeSuccessRate(rate: number): number {
    return Math.max(0, Math.min(1, rate));
  }

  /**
   * Normalize profit/loss ratio using logarithmic scaling
   */
  private normalizeProfitLossRatio(pl: number): number {
    if (pl === 0) return 0.5;
    // Logarithmic scaling to handle wide range of P/L values
    const sign = pl > 0 ? 1 : -1;
    const absPl = Math.abs(pl);
    const normalized = Math.min(Math.log(1 + absPl) / 5, 1); // Cap at 1
    return 0.5 + (sign * normalized * 0.5); // Center at 0.5
  }

  /**
   * Calculate volatility-adjusted return
   */
  private calculateVolatilityAdjustedReturn(data: any): number {
    const return_val = data.return || data.profit_loss || data.pnl || 0;
    const volatility = data.volatility || data.std_dev || 0.15; // Default 15% volatility

    if (volatility === 0) return return_val;

    // Sharpe ratio approximation
    return return_val / volatility;
  }

  /**
   * Normalize win rate to 0-1 range
   */
  private normalizeWinRate(rate: number): number {
    return Math.max(0, Math.min(1, rate));
  }

  /**
   * Extract market regime performance data
   */
  private extractMarketRegimePerformance(data: any): Record<string, number> {
    const regimes: Record<string, number> = {};

    // Extract performance by market regime if available
    if (data.market_regime_performance) {
      Object.assign(regimes, data.market_regime_performance);
    }

    // Default regimes if no data available
    if (Object.keys(regimes).length === 0) {
      regimes['bull'] = 0.6;
      regimes['bear'] = 0.4;
      regimes['sideways'] = 0.5;
      regimes['high_volatility'] = 0.45;
    }

    return regimes;
  }

  /**
   * Get default outcome features for error cases
   */
  private getDefaultOutcomeFeatures(): any {
    return {
      strategy_type: 'unknown',
      risk_profile: 'medium',
      time_horizon: 'medium',
      success_rate: 0.5,
      profit_loss_ratio: 0.5,
      volatility_adjusted_return: 0,
      max_drawdown: 0.1,
      sharpe_ratio: 0,
      win_rate: 0.5,
      avg_trade_duration: 1,
      market_regime_performance: {
        'bull': 0.5,
        'bear': 0.5,
        'sideways': 0.5,
        'high_volatility': 0.5
      }
    };
  }

  /**
   * Calculate Euclidean similarity between feature vectors
   */
  private calculateEuclideanSimilarity(features1: any, features2: any): number {
    try {
      const numericalFeatures = [
        'success_rate', 'profit_loss_ratio', 'volatility_adjusted_return',
        'max_drawdown', 'sharpe_ratio', 'win_rate', 'avg_trade_duration'
      ];

      let sumSquaredDiff = 0;
      let count = 0;

      for (const feature of numericalFeatures) {
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
      this.logger.warn('Error calculating Euclidean similarity', { error });
      return 0.5;
    }
  }

  /**
   * Calculate cosine similarity between feature vectors
   */
  private calculateCosineSimilarity(features1: any, features2: any): number {
    try {
      const numericalFeatures = [
        'success_rate', 'profit_loss_ratio', 'volatility_adjusted_return',
        'max_drawdown', 'sharpe_ratio', 'win_rate', 'avg_trade_duration'
      ];

      let dotProduct = 0;
      let norm1 = 0;
      let norm2 = 0;

      for (const feature of numericalFeatures) {
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
      this.logger.warn('Error calculating cosine similarity', { error });
      return 0.5;
    }
  }

  /**
   * Calculate weighted similarity with feature importance
   */
  private calculateWeightedSimilarity(features1: any, features2: any): number {
    try {
      // Define feature weights based on importance for trading outcomes
      const weights = {
        success_rate: 0.25,
        profit_loss_ratio: 0.20,
        volatility_adjusted_return: 0.15,
        max_drawdown: 0.15,
        sharpe_ratio: 0.10,
        win_rate: 0.10,
        avg_trade_duration: 0.05
      };

      let weightedSum = 0;
      let totalWeight = 0;

      for (const [feature, weight] of Object.entries(weights)) {
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
      this.logger.warn('Error calculating weighted similarity', { error });
      return 0.5;
    }
  }

  /**
   * Apply non-linear transformation to similarity score for better discrimination
   */
  private applySimilarityTransformation(similarity: number): number {
    // Sigmoid transformation for better separation of similar vs dissimilar items
    // This helps distinguish between truly similar (high scores) and somewhat similar (medium scores)
    const transformed = 1 / (1 + Math.exp(-5 * (similarity - 0.5)));
    return Math.max(0, Math.min(1, transformed));
  }

  /**
   * Calculate ensemble similarity for multi-dimensional similarity calculation
   */
  async calculateEnsembleMultiDimensionalSimilarity(
    result: any,
    criteria: ContextRetrievalCriteria,
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

      const temporalSimilarity = this.calculateTemporalSimilarity(result);
      const outcomeSimilarity = await this.calculateOutcomeSimilarity(result, criteria);

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
        market_conditions_similarity: 0.5,
        technical_indicators_similarity: 0.5,
        temporal_similarity: 0.5,
        outcome_similarity: 0.5,
        overall_similarity: 0.5,
        confidence_intervals: {
          market: { lower: 0.4, upper: 0.6 },
          technical: { lower: 0.4, upper: 0.6 },
          overall: { lower: 0.4, upper: 0.6 }
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
        similarity_score: 0.5,
        confidence_interval: { lower: 0.4, upper: 0.6 }
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
   * Calculate temporal similarity (placeholder - would need temporal data)
   */
  private calculateTemporalSimilarity(_result: any): number {
    // This would calculate temporal similarity based on time-based patterns
    // For now, return a neutral similarity
    return 0.5;
  }
}

/**
 * Factory function to create MLRanking instance
 */
export function createMLRanking(logger?: any): MLRanking {
  return new MLRanking(logger);
}