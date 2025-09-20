/**
 * Context Analysis Utilities
 *
 * Utility functions for analyzing market conditions, calculating similarities,
 * and processing context data for the trading agents' memory system.
 */

/**
 * Utility functions for context analysis
 */
export class ContextAnalysisUtils {
  /**
   * Compare two market conditions for similarity using cosine similarity
   */
  static calculateConditionSimilarity(
    conditions1: Record<string, number>,
    conditions2: Record<string, number>
  ): number {
    const keys = new Set([...Object.keys(conditions1), ...Object.keys(conditions2)]);
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (const key of keys) {
      const val1 = conditions1[key] || 0;
      const val2 = conditions2[key] || 0;
      dotProduct += val1 * val2;
      norm1 += val1 * val1;
      norm2 += val2 * val2;
    }

    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Normalize market conditions to 0-1 range using historical ranges
   */
  static normalizeConditions(
    conditions: Record<string, number>,
    historicalRanges: Record<string, { min: number; max: number }>
  ): Record<string, number> {
    const normalized: Record<string, number> = {};

    for (const [key, value] of Object.entries(conditions)) {
      const range = historicalRanges[key];
      if (range && range.max !== range.min) {
        normalized[key] = (value - range.min) / (range.max - range.min);
      } else {
        normalized[key] = value;
      }
    }

    return normalized;
  }

  /**
   * Calculate weighted similarity across multiple dimensions
   */
  static calculateWeightedSimilarity(
    similarities: Record<string, number>,
    weights: Record<string, number>
  ): number {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const [dimension, similarity] of Object.entries(similarities)) {
      const weight = weights[dimension] || 0;
      weightedSum += similarity * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }
}