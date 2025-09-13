import { createLogger } from '../../utils/enhanced-logger';

/**
 * Semantic Similarity Service
 * Handles embedding-based similarity calculations and semantic matching
 */
export class SemanticSimilarityService {
  private logger: any;

  constructor(logger?: any) {
    this.logger = logger || createLogger('system', 'semantic-similarity');
  }

  /**
   * Calculate semantic similarity between text descriptions
   */
  calculateSemanticSimilarity(text1: string, text2: string, embeddings?: number[][]): number {
    try {
      if (!text1 || !text2) return 0.5;

      // If embeddings are provided, use them directly
      if (embeddings && embeddings.length >= 2) {
        return this.cosineSimilarity(embeddings[0], embeddings[1]);
      }

      // Otherwise, use simple text-based similarity
      return this.calculateTextSimilarity(text1, text2);

    } catch (error) {
      this.logger.warn('Error calculating semantic similarity', { error });
      return 0.5;
    }
  }

  /**
   * Calculate similarity between multiple text pairs
   */
  calculateBatchSemanticSimilarity(textPairs: Array<[string, string]>, embeddings?: number[][][]): number[] {
    try {
      return textPairs.map((pair, index) => {
        const pairEmbeddings = embeddings ? embeddings[index] : undefined;
        return this.calculateSemanticSimilarity(pair[0], pair[1], pairEmbeddings);
      });
    } catch (error) {
      this.logger.warn('Error calculating batch semantic similarity', { error });
      return textPairs.map(() => 0.5);
    }
  }

  /**
   * Find most similar items from a collection
   */
  findMostSimilar(queryText: string, candidates: string[], embeddings?: number[][][]): Array<{
    text: string;
    similarity: number;
    index: number;
  }> {
    try {
      if (!queryText || !candidates.length) return [];

      const similarities = candidates.map((candidate, index) => {
        const pairEmbeddings = embeddings ? [embeddings[0], embeddings[index + 1]] : undefined;
        const similarity = this.calculateSemanticSimilarity(queryText, candidate, pairEmbeddings);
        return {
          text: candidate,
          similarity,
          index
        };
      });

      // Sort by similarity (descending)
      return similarities.sort((a, b) => b.similarity - a.similarity);

    } catch (error) {
      this.logger.warn('Error finding most similar items', { error });
      return [];
    }
  }

  /**
   * Calculate text similarity using various methods
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    try {
      // Normalize texts
      const normalized1 = this.normalizeText(text1);
      const normalized2 = this.normalizeText(text2);

      // Calculate multiple similarity metrics
      const jaccardSim = this.jaccardSimilarity(normalized1, normalized2);
      const levenshteinSim = this.levenshteinSimilarity(normalized1, normalized2);
      const ngramSim = this.ngramSimilarity(normalized1, normalized2, 2);

      // Weighted combination
      const similarity = (jaccardSim * 0.4) + (levenshteinSim * 0.3) + (ngramSim * 0.3);

      return Math.max(0, Math.min(1, similarity));

    } catch (error) {
      this.logger.warn('Error calculating text similarity', { error });
      return 0.5;
    }
  }

  /**
   * Cosine similarity between two embedding vectors
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    try {
      if (!vec1 || !vec2 || vec1.length !== vec2.length) return 0.5;

      let dotProduct = 0;
      let norm1 = 0;
      let norm2 = 0;

      for (let i = 0; i < vec1.length; i++) {
        dotProduct += vec1[i] * vec2[i];
        norm1 += vec1[i] * vec1[i];
        norm2 += vec2[i] * vec2[i];
      }

      if (norm1 === 0 || norm2 === 0) return 0.5;

      const cosine = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
      // Normalize to 0-1 range
      return (cosine + 1) / 2;

    } catch (error) {
      this.logger.warn('Error calculating cosine similarity', { error });
      return 0.5;
    }
  }

  /**
   * Normalize text for comparison
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
  private jaccardSimilarity(text1: string, text2: string): number {
    try {
      const words1 = new Set(text1.split(' ').filter(word => word.length > 0));
      const words2 = new Set(text2.split(' ').filter(word => word.length > 0));

      const intersection = new Set([...words1].filter(word => words2.has(word)));
      const union = new Set([...words1, ...words2]);

      return union.size > 0 ? intersection.size / union.size : 0;

    } catch (error) {
      this.logger.warn('Error calculating Jaccard similarity', { error });
      return 0;
    }
  }

  /**
   * Calculate Levenshtein similarity (normalized edit distance)
   */
  private levenshteinSimilarity(text1: string, text2: string): number {
    try {
      const maxLength = Math.max(text1.length, text2.length);
      if (maxLength === 0) return 1;

      const distance = this.levenshteinDistance(text1, text2);
      return 1 - (distance / maxLength);

    } catch (error) {
      this.logger.warn('Error calculating Levenshtein similarity', { error });
      return 0.5;
    }
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    // Initialize matrix
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate n-gram similarity
   */
  private ngramSimilarity(text1: string, text2: string, n: number): number {
    try {
      const ngrams1 = this.generateNgrams(text1, n);
      const ngrams2 = this.generateNgrams(text2, n);

      const intersection = new Set([...ngrams1].filter(ngram => ngrams2.has(ngram)));
      const union = new Set([...ngrams1, ...ngrams2]);

      return union.size > 0 ? intersection.size / union.size : 0;

    } catch (error) {
      this.logger.warn('Error calculating n-gram similarity', { error });
      return 0;
    }
  }

  /**
   * Generate n-grams from text
   */
  private generateNgrams(text: string, n: number): Set<string> {
    const ngrams = new Set<string>();
    const words = text.split(' ').filter(word => word.length > 0);

    for (let i = 0; i <= words.length - n; i++) {
      const ngram = words.slice(i, i + n).join(' ');
      ngrams.add(ngram);
    }

    return ngrams;
  }
}

/**
 * Ensemble Similarity Service
 * Combines multiple similarity methods for robust similarity calculation
 */
export class EnsembleSimilarityService {
  private logger: any;
  private semanticService: SemanticSimilarityService;
  private mlService: any; // MLBasedSimilarityService

  constructor(logger?: any) {
    this.logger = logger || createLogger('system', 'ensemble-similarity');
    this.semanticService = new SemanticSimilarityService(logger);
    // Note: ML service would be injected or imported
  }

  /**
   * Calculate ensemble similarity combining multiple methods
   */
  calculateEnsembleSimilarity(
    text1: string,
    text2: string,
    features1?: any,
    features2?: any,
    embeddings?: number[][]
  ): {
    overallSimilarity: number;
    componentSimilarities: {
      semantic: number;
      ml: number;
      weighted: number;
    };
    confidence: number;
  } {
    try {
      // Calculate semantic similarity
      const semanticSimilarity = this.semanticService.calculateSemanticSimilarity(text1, text2, embeddings);

      // Calculate ML-based similarity if features are available
      let mlSimilarity = 0.5;
      if (features1 && features2 && this.mlService) {
        // This would use the ML service to calculate similarity
        mlSimilarity = this.calculateMLSimilarity(features1, features2);
      }

      // Calculate weighted similarity
      const weightedSimilarity = this.calculateWeightedSimilarity(text1, text2, features1, features2);

      // Combine similarities with adaptive weights
      const weights = this.calculateAdaptiveWeights(text1, text2, features1, features2);
      const overallSimilarity = (
        semanticSimilarity * weights.semantic +
        mlSimilarity * weights.ml +
        weightedSimilarity * weights.weighted
      );

      // Calculate confidence based on agreement between methods
      const confidence = this.calculateConfidence([semanticSimilarity, mlSimilarity, weightedSimilarity]);

      return {
        overallSimilarity: Math.max(0, Math.min(1, overallSimilarity)),
        componentSimilarities: {
          semantic: semanticSimilarity,
          ml: mlSimilarity,
          weighted: weightedSimilarity
        },
        confidence
      };

    } catch (error) {
      this.logger.warn('Error calculating ensemble similarity', { error });
      return {
        overallSimilarity: 0.5,
        componentSimilarities: {
          semantic: 0.5,
          ml: 0.5,
          weighted: 0.5
        },
        confidence: 0.3
      };
    }
  }

  /**
   * Calculate ML-based similarity (placeholder for integration)
   */
  private calculateMLSimilarity(features1: any, features2: any): number {
    // This would integrate with MLBasedSimilarityService
    // For now, return a simple similarity based on available features
    try {
      if (!features1 || !features2) return 0.5;

      let similarity = 0;
      let count = 0;

      // Compare numerical features
      const numericalFeatures = ['success_rate', 'profit_loss', 'volatility', 'win_rate'];
      for (const feature of numericalFeatures) {
        if (features1[feature] !== undefined && features2[feature] !== undefined) {
          const diff = Math.abs(features1[feature] - features2[feature]);
          similarity += Math.max(0, 1 - diff); // Simple inverse distance
          count++;
        }
      }

      // Compare categorical features
      const categoricalFeatures = ['strategy_type', 'risk_profile'];
      for (const feature of categoricalFeatures) {
        if (features1[feature] && features2[feature]) {
          similarity += features1[feature] === features2[feature] ? 1 : 0.2;
          count++;
        }
      }

      return count > 0 ? similarity / count : 0.5;

    } catch (error) {
      this.logger.warn('Error calculating ML similarity', { error });
      return 0.5;
    }
  }

  /**
   * Calculate weighted similarity combining text and feature similarities
   */
  private calculateWeightedSimilarity(text1: string, text2: string, features1?: any, features2?: any): number {
    try {
      const textSimilarity = this.semanticService.calculateSemanticSimilarity(text1, text2);
      let featureSimilarity = 0.5;

      if (features1 && features2) {
        featureSimilarity = this.calculateMLSimilarity(features1, features2);
      }

      // Weight text similarity more heavily for semantic understanding
      return (textSimilarity * 0.6) + (featureSimilarity * 0.4);

    } catch (error) {
      this.logger.warn('Error calculating weighted similarity', { error });
      return 0.5;
    }
  }

  /**
   * Calculate adaptive weights based on content characteristics
   */
  private calculateAdaptiveWeights(text1: string, text2: string, features1?: any, features2?: any): {
    semantic: number;
    ml: number;
    weighted: number;
  } {
    try {
      // Base weights
      const weights = {
        semantic: 0.5,
        ml: 0.3,
        weighted: 0.2
      };

      // Adjust based on text length and complexity
      const avgTextLength = (text1.length + text2.length) / 2;
      if (avgTextLength > 200) {
        // Longer texts benefit more from semantic analysis
        weights.semantic += 0.1;
        weights.ml -= 0.05;
        weights.weighted -= 0.05;
      }

      // Adjust based on feature availability
      if (features1 && features2) {
        // More features available, increase ML weight
        weights.ml += 0.1;
        weights.semantic -= 0.05;
        weights.weighted -= 0.05;
      }

      // Normalize weights
      const total = weights.semantic + weights.ml + weights.weighted;
      weights.semantic /= total;
      weights.ml /= total;
      weights.weighted /= total;

      return weights;

    } catch (error) {
      this.logger.warn('Error calculating adaptive weights', { error });
      return { semantic: 0.5, ml: 0.3, weighted: 0.2 };
    }
  }

  /**
   * Calculate confidence based on agreement between similarity methods
   */
  private calculateConfidence(similarities: number[]): number {
    try {
      if (similarities.length < 2) return 0.5;

      // Calculate variance in similarities
      const mean = similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
      const variance = similarities.reduce((sum, sim) => sum + Math.pow(sim - mean, 2), 0) / similarities.length;
      const stdDev = Math.sqrt(variance);

      // Lower variance = higher confidence
      const confidence = Math.max(0.1, 1 - stdDev);

      return confidence;

    } catch (error) {
      this.logger.warn('Error calculating confidence', { error });
      return 0.5;
    }
  }

  /**
   * Find best matches using ensemble approach
   */
  findBestMatches(
    queryText: string,
    candidates: Array<{ text: string; features?: any }>,
    topK: number = 5
  ): Array<{
    candidate: { text: string; features?: any };
    similarity: number;
    confidence: number;
    index: number;
  }> {
    try {
      const results = candidates.map((candidate, index) => {
        const ensembleResult = this.calculateEnsembleSimilarity(
          queryText,
          candidate.text,
          undefined, // query features not available
          candidate.features
        );

        return {
          candidate,
          similarity: ensembleResult.overallSimilarity,
          confidence: ensembleResult.confidence,
          index
        };
      });

      // Sort by similarity and return top K
      return results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);

    } catch (error) {
      this.logger.warn('Error finding best matches', { error });
      return [];
    }
  }
}