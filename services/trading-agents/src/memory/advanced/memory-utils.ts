/**
 * Memory Utilities
 *
 * Utility functions for memory operations including pattern similarity calculation,
 * pattern merging, memory validation, and consolidation operations.
 */

import { MarketPattern, ConsolidatedMemory } from './memory-consolidation-layer';

/**
 * Utility functions for memory operations
 */
export class MemoryUtils {
  /**
   * Calculate pattern similarity
   */
  static calculatePatternSimilarity(pattern1: MarketPattern, pattern2: MarketPattern): number {
    try {
      // Calculate similarity across multiple dimensions
      let totalSimilarity = 0;
      let dimensionCount = 0;

      // 1. Pattern type similarity
      const typeScore = pattern1.pattern_type === pattern2.pattern_type ? 1.0 : 0.0;
      totalSimilarity += typeScore;
      dimensionCount++;

      // 2. Technical indicators similarity
      const techSimilarity = this.calculateTechnicalIndicatorsSimilarity(
        pattern1.conditions.technical_indicators,
        pattern2.conditions.technical_indicators
      );
      totalSimilarity += techSimilarity;
      dimensionCount++;

      // 3. Market conditions similarity
      const marketSimilarity = this.calculateMarketConditionsSimilarity(
        pattern1.conditions.market_conditions,
        pattern2.conditions.market_conditions
      );
      totalSimilarity += marketSimilarity;
      dimensionCount++;

      // 4. Outcome similarity (performance characteristics)
      const outcomeSimilarity = this.calculateOutcomeSimilarity(
        pattern1.outcomes,
        pattern2.outcomes
      );
      totalSimilarity += outcomeSimilarity;
      dimensionCount++;

      // 5. Reliability score similarity
      const reliabilityDiff = Math.abs(
        pattern1.learning_metrics.reliability_score - pattern2.learning_metrics.reliability_score
      );
      const reliabilityScore = 1.0 - reliabilityDiff;
      totalSimilarity += reliabilityScore;
      dimensionCount++;

      return totalSimilarity / dimensionCount;

    } catch (_error) {
      // Return default similarity on error
      return 0.0;
    }
  }

  /**
   * Calculate similarity between technical indicators
   */
  private static calculateTechnicalIndicatorsSimilarity(tech1: any, tech2: any): number {
    if (!tech1 || !tech2) return 0;

    const indicators = ['rsi', 'macd', 'bollinger_position', 'momentum', 'volume_ratio'];
    let totalSimilarity = 0;
    let validIndicators = 0;

    for (const indicator of indicators) {
      const val1 = tech1[indicator];
      const val2 = tech2[indicator];

      if (val1 !== undefined && val2 !== undefined) {
        // Normalize differences based on typical ranges
        let normalizedDiff = 0;
        if (indicator === 'rsi') {
          normalizedDiff = Math.abs(val1 - val2) / 100; // RSI range 0-100
        } else if (indicator === 'bollinger_position') {
          normalizedDiff = Math.abs(val1 - val2) / 1; // Range 0-1
        } else {
          normalizedDiff = Math.abs(val1 - val2) / Math.max(Math.abs(val1), Math.abs(val2), 1);
        }

        totalSimilarity += 1.0 - normalizedDiff;
        validIndicators++;
      }
    }

    return validIndicators > 0 ? totalSimilarity / validIndicators : 0;
  }

  /**
   * Calculate similarity between market conditions
   */
  private static calculateMarketConditionsSimilarity(market1: any, market2: any): number {
    if (!market1 || !market2) return 0;

    let similarity = 0;
    let factors = 0;

    // Market regime similarity
    if (market1.market_regime && market2.market_regime) {
      similarity += market1.market_regime === market2.market_regime ? 1.0 : 0.0;
      factors++;
    }

    // Volatility similarity
    if (market1.volatility !== undefined && market2.volatility !== undefined) {
      const volDiff = Math.abs(market1.volatility - market2.volatility);
      similarity += 1.0 - Math.min(volDiff / 0.1, 1.0); // Normalize by 10% volatility
      factors++;
    }

    // Volume similarity
    if (market1.volume_ratio !== undefined && market2.volume_ratio !== undefined) {
      const volumeDiff = Math.abs(market1.volume_ratio - market2.volume_ratio);
      similarity += 1.0 - Math.min(volumeDiff / 2.0, 1.0); // Normalize by 2x volume
      factors++;
    }

    return factors > 0 ? similarity / factors : 0;
  }

  /**
   * Calculate similarity between outcomes
   */
  private static calculateOutcomeSimilarity(outcome1: any, outcome2: any): number {
    if (!outcome1 || !outcome2) return 0;

    let similarity = 0;
    let factors = 0;

    // Success rate similarity
    if (outcome1.success_rate !== undefined && outcome2.success_rate !== undefined) {
      const successDiff = Math.abs(outcome1.success_rate - outcome2.success_rate);
      similarity += 1.0 - successDiff; // Already normalized 0-1
      factors++;
    }

    // Average return similarity
    if (outcome1.avg_return !== undefined && outcome2.avg_return !== undefined) {
      const returnDiff = Math.abs(outcome1.avg_return - outcome2.avg_return);
      similarity += 1.0 - Math.min(returnDiff / 0.5, 1.0); // Normalize by 50% return
      factors++;
    }

    // Volatility similarity
    if (outcome1.volatility !== undefined && outcome2.volatility !== undefined) {
      const volDiff = Math.abs(outcome1.volatility - outcome2.volatility);
      similarity += 1.0 - Math.min(volDiff / 0.3, 1.0); // Normalize by 30% volatility
      factors++;
    }

    return factors > 0 ? similarity / factors : 0;
  }

  /**
   * Merge similar patterns using intelligent pattern consolidation
   */
  static mergePatterns(patterns: MarketPattern[]): MarketPattern {
    if (patterns.length === 0) {
      throw new Error('Cannot merge empty pattern array');
    }

    if (patterns.length === 1) {
      const firstPattern = patterns[0];
      if (!firstPattern) {
        throw new Error('Pattern array contains undefined values');
      }
      return firstPattern;
    }

    // Intelligent pattern merging with weighted averaging
    try {
      // Calculate pattern frequencies and weights
      const patternStats = this.calculatePatternStatistics(patterns);

      // Find the most representative base pattern
      const basePattern = this.selectBasePattern(patterns, patternStats);

      // Merge characteristics from all patterns
      const mergedCharacteristics = this.mergePatternCharacteristics(patterns, patternStats);

      // Calculate consolidated outcomes
      const consolidatedOutcomes = this.consolidateOutcomes(patterns);

      // Create merged pattern
      const mergedPattern: MarketPattern = {
        pattern_id: `merged_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        pattern_type: basePattern.pattern_type,
        pattern_name: `Consolidated ${basePattern.pattern_name}`,
        description: `Merged pattern from ${patterns.length} observations`,
        conditions: {
          technical_indicators: mergedCharacteristics.technicalIndicators,
          market_conditions: mergedCharacteristics.marketConditions,
          temporal_constraints: this.mergeTemporalConstraints(patterns)
        },
        outcomes: consolidatedOutcomes,
        learning_metrics: {
          observation_count: patterns.reduce((sum, p) => sum + p.learning_metrics.observation_count, 0),
          last_updated: new Date().toISOString(),
          reliability_score: this.calculateConsolidatedReliability(patterns),
          market_regime_dependence: this.mergeMarketRegimeDependence(patterns),
          volatility_sensitivity: this.calculateAverageMetric(patterns, 'volatility_sensitivity'),
          volume_sensitivity: this.calculateAverageMetric(patterns, 'volume_sensitivity')
        },
        meta_information: {
          discovery_date: basePattern.meta_information.discovery_date,
          discovery_method: 'agent_learning',
          validation_status: consolidatedOutcomes.success_rate >= 0.7 ? 'validated' : 'candidate',
          related_patterns: this.mergeRelatedPatterns(patterns),
          risk_factors: this.mergeRiskFactors(patterns)
        }
      };

      return mergedPattern;
    } catch (_error) {
      // Fallback to highest reliability pattern
      const sortedByReliability = patterns
        .filter(p => p !== undefined && p !== null)
        .sort((a, b) => (b.learning_metrics.reliability_score || 0) - (a.learning_metrics.reliability_score || 0));

      if (sortedByReliability.length === 0) {
        throw new Error('No valid patterns to merge');
      }

      const bestPattern = sortedByReliability[0];
      if (!bestPattern) {
        throw new Error('No valid patterns found');
      }

      return bestPattern;
    }
  }

  /**
   * Calculate statistical properties of pattern collection
   */
  private static calculatePatternStatistics(patterns: MarketPattern[]): any {
    const typeFrequency = new Map<string, number>();
    const reliabilitySum = patterns.reduce((sum, pattern) => {
      const type = pattern.pattern_type || 'unknown';
      typeFrequency.set(type, (typeFrequency.get(type) || 0) + 1);
      return sum + (pattern.learning_metrics.reliability_score || 0);
    }, 0);

    return {
      typeFrequency,
      averageReliability: reliabilitySum / patterns.length,
      totalPatterns: patterns.length,
      mostCommonType: Array.from(typeFrequency.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown'
    };
  }

  /**
   * Select the most representative pattern as base for merging
   */
  private static selectBasePattern(patterns: MarketPattern[], stats: any): MarketPattern {
    // Score patterns based on reliability, frequency, and representativeness
    const scoredPatterns = patterns.map(pattern => {
      let score = pattern.learning_metrics.reliability_score || 0;

      // Bonus for matching most common type
      if (pattern.pattern_type === stats.mostCommonType) {
        score += 0.2;
      }

      // Bonus for higher observation count
      score += Math.min(0.3, (pattern.learning_metrics.observation_count || 1) / 100);

      // Bonus for recent patterns
      if (pattern.learning_metrics.last_updated) {
        const daysSinceUpdate = (Date.now() - new Date(pattern.learning_metrics.last_updated).getTime()) / (1000 * 60 * 60 * 24);
        score += Math.max(0, 0.1 * (1 - daysSinceUpdate / 30)); // Decay over 30 days
      }

      return { pattern, score };
    });

    const bestPattern = scoredPatterns.sort((a, b) => b.score - a.score)[0];
    if (!bestPattern) {
      throw new Error('No patterns available for selection');
    }

    return bestPattern.pattern;
  }

  /**
   * Merge characteristics from multiple patterns
   */
  private static mergePatternCharacteristics(patterns: MarketPattern[], _stats: any): any {
    // Merge technical indicators
    const technicalIndicators: Record<string, any> = {};
    const marketConditions: Record<string, any> = {};

    // Collect all technical indicators
    for (const pattern of patterns) {
      for (const [key, value] of Object.entries(pattern.conditions.technical_indicators)) {
        if (!technicalIndicators[key]) {
          technicalIndicators[key] = [];
        }
        technicalIndicators[key].push(value);
      }

      // Merge market conditions
      for (const [key, value] of Object.entries(pattern.conditions.market_conditions)) {
        if (!marketConditions[key]) {
          marketConditions[key] = [];
        }
        marketConditions[key].push(value);
      }
    }

    // Average numerical values, take most common for categorical
    for (const [key, values] of Object.entries(technicalIndicators)) {
      const valueArray = values as any[];
      if (valueArray.length > 0 && typeof valueArray[0] === 'object') {
        // For objects like thresholds, average the numerical properties
        const merged = { ...valueArray[0] };
        if (typeof merged.threshold === 'number') {
          merged.threshold = valueArray.reduce((sum, v) => sum + (v.threshold || 0), 0) / valueArray.length;
        }
        technicalIndicators[key] = merged;
      }
    }

    // For market conditions, take most frequent values
    for (const [key, values] of Object.entries(marketConditions)) {
      const valueArray = values as any[];
      if (valueArray.length > 0) {
        // If numerical, average; if categorical, take most frequent
        if (typeof valueArray[0] === 'number') {
          marketConditions[key] = valueArray.reduce((sum, v) => sum + v, 0) / valueArray.length;
        } else {
          const frequency = new Map();
          valueArray.forEach(val => {
            frequency.set(val, (frequency.get(val) || 0) + 1);
          });
          marketConditions[key] = Array.from(frequency.entries())
            .sort((a, b) => b[1] - a[1])[0]?.[0] || valueArray[0];
        }
      }
    }

    return {
      technicalIndicators,
      marketConditions
    };
  }

  /**
   * Consolidate outcomes from multiple patterns
   */
  private static consolidateOutcomes(patterns: MarketPattern[]): any {
    if (patterns.length === 0) {
      throw new Error('Cannot consolidate outcomes from empty pattern array');
    }

    const totalWeight = patterns.reduce((sum, p) => sum + (p.learning_metrics.reliability_score || 0.5), 0);

    // Weighted averages
    const successRate = patterns.reduce((sum, pattern) => {
      const weight = pattern.learning_metrics.reliability_score || 0.5;
      return sum + (pattern.outcomes.success_rate * weight);
    }, 0) / totalWeight;

    const avgReturn = patterns.reduce((sum, pattern) => {
      const weight = pattern.learning_metrics.reliability_score || 0.5;
      return sum + (pattern.outcomes.avg_return * weight);
    }, 0) / totalWeight;

    const volatility = patterns.reduce((sum, pattern) => {
      const weight = pattern.learning_metrics.reliability_score || 0.5;
      return sum + (pattern.outcomes.volatility * weight);
    }, 0) / totalWeight;

    const maxDrawdown = Math.min(...patterns.map(p => p.outcomes.max_drawdown));
    const timeToTarget = patterns.reduce((sum, pattern) => {
      const weight = pattern.learning_metrics.reliability_score || 0.5;
      return sum + (pattern.outcomes.time_to_target * weight);
    }, 0) / totalWeight;

    // Merge confidence intervals
    const confidenceIntervals: Record<string, number[]> = {};
    for (const pattern of patterns) {
      for (const [level, interval] of Object.entries(pattern.outcomes.confidence_intervals)) {
        if (!confidenceIntervals[level]) {
          confidenceIntervals[level] = [];
        }
        confidenceIntervals[level].push(...interval);
      }
    }

    // Calculate consolidated confidence intervals
    for (const [level, values] of Object.entries(confidenceIntervals)) {
      const sorted = values.sort((a, b) => a - b);
      const lowerIdx = Math.floor(sorted.length * 0.025);
      const upperIdx = Math.floor(sorted.length * 0.975);
      confidenceIntervals[level] = [sorted[lowerIdx] || 0, sorted[upperIdx] || 0];
    }

    return {
      success_rate: Math.max(0, Math.min(1, successRate)),
      avg_return: avgReturn,
      volatility: Math.max(0, volatility),
      max_drawdown: maxDrawdown,
      time_to_target: Math.max(0, timeToTarget),
      confidence_intervals: confidenceIntervals
    };
  }

  /**
   * Merge temporal constraints from multiple patterns
   */
  private static mergeTemporalConstraints(patterns: MarketPattern[]): any {
    const constraints = patterns.map(p => p.conditions.temporal_constraints);

    // Filter out undefined arrays before merging
    const timeOfDayRelevance = constraints
      .map(c => c.time_of_day_relevance)
      .filter((arr): arr is number[] => Array.isArray(arr));

    const dayOfWeekRelevance = constraints
      .map(c => c.day_of_week_relevance)
      .filter((arr): arr is number[] => Array.isArray(arr));

    const seasonalRelevance = constraints
      .map(c => c.seasonal_relevance)
      .filter((arr): arr is string[] => Array.isArray(arr));

    return {
      min_duration_hours: Math.min(...constraints.map(c => c.min_duration_hours)),
      max_duration_hours: Math.max(...constraints.map(c => c.max_duration_hours)),
      time_of_day_relevance: this.mergeArrays(timeOfDayRelevance),
      day_of_week_relevance: this.mergeArrays(dayOfWeekRelevance),
      seasonal_relevance: this.mergeArrays(seasonalRelevance)
    };
  }

  /**
   * Calculate consolidated reliability score
   */
  private static calculateConsolidatedReliability(patterns: MarketPattern[]): number {
    if (patterns.length === 0) return 0;

    const reliabilities = patterns.map(p => p.learning_metrics.reliability_score);
    const averageReliability = reliabilities.reduce((sum, r) => sum + r, 0) / reliabilities.length;

    // Bonus for pattern consistency (more patterns = higher confidence)
    const consistencyBonus = Math.min(0.2, patterns.length * 0.02);

    return Math.max(0.1, Math.min(0.95, averageReliability + consistencyBonus));
  }

  /**
   * Merge market regime dependence
   */
  private static mergeMarketRegimeDependence(patterns: MarketPattern[]): Record<string, number> {
    const merged: Record<string, number[]> = {};

    for (const pattern of patterns) {
      for (const [regime, score] of Object.entries(pattern.learning_metrics.market_regime_dependence)) {
        if (!merged[regime]) {
          merged[regime] = [];
        }
        merged[regime].push(score);
      }
    }

    const result: Record<string, number> = {};
    for (const [regime, scores] of Object.entries(merged)) {
      result[regime] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    }

    return result;
  }

  /**
   * Calculate average metric across patterns
   */
  private static calculateAverageMetric(patterns: MarketPattern[], metric: keyof MarketPattern['learning_metrics']): number {
    const values = patterns.map(p => p.learning_metrics[metric] as number).filter(v => typeof v === 'number');
    return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
  }

  /**
   * Merge related patterns
   */
  private static mergeRelatedPatterns(patterns: MarketPattern[]): string[] {
    const allRelated = new Set<string>();

    for (const pattern of patterns) {
      pattern.meta_information.related_patterns.forEach(id => {
        if (id && id.trim()) {
          allRelated.add(id.trim());
        }
      });
    }

    return Array.from(allRelated).sort();
  }

  /**
   * Merge risk factors
   */
  private static mergeRiskFactors(patterns: MarketPattern[]): Array<{
    factor_name: string;
    severity: 'low' | 'medium' | 'high';
    mitigation_strategy: string;
  }> {
    const riskMap = new Map<string, any>();

    for (const pattern of patterns) {
      for (const risk of pattern.meta_information.risk_factors) {
        const existing = riskMap.get(risk.factor_name);
        if (!existing || this.compareSeverity(risk.severity, existing.severity) > 0) {
          riskMap.set(risk.factor_name, risk);
        }
      }
    }

    return Array.from(riskMap.values());
  }

  /**
   * Compare severity levels
   */
  private static compareSeverity(severity1: string, severity2: string): number {
    const levels = { 'low': 1, 'medium': 2, 'high': 3 };
    return (levels[severity1 as keyof typeof levels] || 0) - (levels[severity2 as keyof typeof levels] || 0);
  }

  /**
   * Merge arrays and return unique values
   */
  private static mergeArrays<T>(arrays: T[][]): T[] {
    const merged = new Set<T>();
    for (const array of arrays) {
      if (Array.isArray(array)) {
        array.forEach(item => merged.add(item));
      }
    }
    return Array.from(merged);
  }

  /**
   * Validate memory consistency
   */
  static validateMemoryConsistency(memory: ConsolidatedMemory): boolean {
    // Implementation would check for logical consistency in the memory
    return memory.consolidated_knowledge.key_insights.length > 0;
  }
}