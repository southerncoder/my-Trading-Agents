import { MarketPattern } from './memory-consolidation-layer';

/**
 * Advanced Pattern Scoring Engine
 *
 * Implements sophisticated multi-dimensional pattern scoring algorithms
 * for evaluating market patterns based on feature similarity, temporal
 * proximity, outcome correlation, market regime alignment, volatility
 * environment, and weighted scoring with normalization factors.
 *
 * Provides confidence intervals, batch processing capabilities, and
 * intelligent top pattern selection for optimal trading decisions.
 */
export class PatternScoringEngine {
  private static readonly SCORING_WEIGHTS = {
    feature_similarity: 0.25,        // Pattern feature similarity
    temporal_proximity: 0.20,        // Temporal alignment
    outcome_correlation: 0.20,       // Outcome correlation
    market_regime_alignment: 0.15,   // Market regime compatibility
    volatility_environment: 0.10,    // Volatility environment match
    confidence_adjustment: 0.10      // Statistical confidence bonus
  };

  private static readonly SCORING_THRESHOLDS = {
    min_similarity_score: 0.1,       // Minimum acceptable similarity
    max_temporal_distance_days: 30,  // Maximum temporal distance
    min_observation_count: 5,        // Minimum observations for validity
    confidence_interval_width: 0.2,  // Confidence interval width
    batch_size_limit: 1000           // Maximum batch size
  };

  private static readonly NORMALIZATION_FACTORS = {
    feature_similarity_range: [0, 1] as [number, number],
    temporal_proximity_range: [0, 1] as [number, number],
    outcome_correlation_range: [-1, 1] as [number, number],
    market_regime_range: [0, 1] as [number, number],
    volatility_range: [0, 1] as [number, number]
  };

  /**
   * Calculate comprehensive pattern score with multi-dimensional analysis
   */
  static calculatePatternScore(
    pattern: MarketPattern,
    context: {
      current_market_regime?: string;
      current_volatility?: number;
      target_timeframe?: string;
      risk_tolerance?: 'low' | 'medium' | 'high';
      asset_class?: string;
      temporal_context?: {
        reference_timestamp?: number;
        max_temporal_distance_days?: number;
      };
    }
  ): {
    overall_score: number;
    dimension_scores: {
      feature_similarity: number;
      temporal_proximity: number;
      outcome_correlation: number;
      market_regime_alignment: number;
      volatility_environment: number;
    };
    confidence_intervals: {
      lower: number;
      upper: number;
      confidence_level: number;
    };
    scoring_metadata: {
      calculation_timestamp: number;
      observation_count: number;
      reliability_score: number;
      scoring_version: string;
    };
  } {
    // Calculate individual dimension scores
    const featureSimilarity = this.calculateFeatureSimilarity(pattern, context);
    const temporalProximity = this.calculateTemporalProximity(pattern, context);
    const outcomeCorrelation = this.calculateOutcomeCorrelation(pattern, context);
    const marketRegimeAlignment = this.calculateMarketRegimeAlignment(pattern, context);
    const volatilityEnvironment = this.calculateVolatilityEnvironment(pattern, context);

    // Apply normalization factors
    const normalizedScores = this.applyNormalizationFactors({
      feature_similarity: featureSimilarity,
      temporal_proximity: temporalProximity,
      outcome_correlation: outcomeCorrelation,
      market_regime_alignment: marketRegimeAlignment,
      volatility_environment: volatilityEnvironment
    });

    // Calculate weighted overall score
    const overallScore = this.calculateWeightedScore(normalizedScores);

    // Calculate confidence intervals
    const confidenceIntervals = this.calculateConfidenceIntervals(
      normalizedScores,
      pattern.learning_metrics.observation_count
    );

    return {
      overall_score: overallScore,
      dimension_scores: normalizedScores,
      confidence_intervals: confidenceIntervals,
      scoring_metadata: {
        calculation_timestamp: Date.now(),
        observation_count: pattern.learning_metrics.observation_count,
        reliability_score: pattern.learning_metrics.reliability_score,
        scoring_version: '2.0.0'
      }
    };
  }

  /**
   * Calculate feature similarity score
   */
  private static calculateFeatureSimilarity(
    pattern: MarketPattern,
    context: any
  ): number {
    // Extract pattern features
    const patternFeatures = this.extractPatternFeatures(pattern);

    // Calculate similarity based on feature vectors
    // This is a simplified implementation - in practice, you'd use
    // more sophisticated similarity measures like cosine similarity
    let totalSimilarity = 0;
    let featureCount = 0;

    // Compare technical indicators
    if (patternFeatures.technical_indicators && context.technical_indicators) {
      const techSimilarity = this.compareTechnicalIndicators(
        patternFeatures.technical_indicators,
        context.technical_indicators
      );
      totalSimilarity += techSimilarity;
      featureCount++;
    }

    // Compare price patterns
    if (patternFeatures.price_pattern && context.price_pattern) {
      const priceSimilarity = this.comparePricePatterns(
        patternFeatures.price_pattern,
        context.price_pattern
      );
      totalSimilarity += priceSimilarity;
      featureCount++;
    }

    // Compare volume patterns
    if (patternFeatures.volume_pattern && context.volume_pattern) {
      const volumeSimilarity = this.compareVolumePatterns(
        patternFeatures.volume_pattern,
        context.volume_pattern
      );
      totalSimilarity += volumeSimilarity;
      featureCount++;
    }

    return featureCount > 0 ? totalSimilarity / featureCount : 0.5;
  }

  /**
   * Calculate temporal proximity score
   */
  private static calculateTemporalProximity(
    pattern: MarketPattern,
    context: any
  ): number {
    const referenceTime = context.temporal_context?.reference_timestamp || Date.now();
    const maxDistance = context.temporal_context?.max_temporal_distance_days ||
                       this.SCORING_THRESHOLDS.max_temporal_distance_days;

    // Calculate time difference in days
    const patternTime = new Date(pattern.learning_metrics.last_updated).getTime();
    const timeDiffDays = Math.abs(referenceTime - patternTime) / (1000 * 60 * 60 * 24);

    // Apply exponential decay based on temporal distance
    const temporalScore = Math.exp(-0.1 * timeDiffDays);

    // Apply maximum distance cutoff
    return timeDiffDays <= maxDistance ? temporalScore : 0;
  }

  /**
   * Calculate outcome correlation score
   */
  private static calculateOutcomeCorrelation(
    pattern: MarketPattern,
    context: any
  ): number {
    const patternOutcomes = pattern.outcomes;

    // Calculate correlation with expected outcomes
    let correlationScore = 0;

    // Success rate correlation
    if (context.expected_success_rate !== undefined) {
      const successDiff = Math.abs(patternOutcomes.success_rate - context.expected_success_rate);
      correlationScore += (1 - successDiff) * 0.4;
    }

    // Return correlation
    if (context.expected_return !== undefined) {
      const returnDiff = Math.abs(patternOutcomes.avg_return - context.expected_return);
      const normalizedReturnDiff = Math.min(returnDiff / 0.1, 1); // Normalize to 10% return range
      correlationScore += (1 - normalizedReturnDiff) * 0.3;
    }

    // Risk correlation (volatility)
    if (context.expected_volatility !== undefined) {
      const volDiff = Math.abs(patternOutcomes.volatility - context.expected_volatility);
      const normalizedVolDiff = Math.min(volDiff / 0.2, 1); // Normalize to 20% vol range
      correlationScore += (1 - normalizedVolDiff) * 0.3;
    }

    return Math.max(0, Math.min(1, correlationScore));
  }

  /**
   * Calculate market regime alignment score
   */
  private static calculateMarketRegimeAlignment(
    pattern: MarketPattern,
    context: any
  ): number {
    if (!context.current_market_regime) {
      return 0.5; // Neutral score if no regime specified
    }

    const regimeDependence = pattern.learning_metrics.market_regime_dependence;
    const currentRegimeScore = regimeDependence[context.current_market_regime] || 0;

    // Apply regime-specific adjustments
    let alignmentScore = currentRegimeScore;

    // Boost score for patterns with strong regime specialization
    const maxRegimeScore = Math.max(...Object.values(regimeDependence));
    if (maxRegimeScore > 0.7) {
      alignmentScore *= 1.2; // 20% bonus for specialized patterns
    }

    return Math.min(1.0, alignmentScore);
  }

  /**
   * Calculate volatility environment score
   */
  private static calculateVolatilityEnvironment(
    pattern: MarketPattern,
    context: any
  ): number {
    if (context.current_volatility === undefined) {
      return 0.5; // Neutral score if no volatility specified
    }

    const patternVolatility = pattern.outcomes.volatility;
    const contextVolatility = context.current_volatility;

    // Calculate volatility compatibility
    const volDiff = Math.abs(patternVolatility - contextVolatility);
    const volSimilarity = Math.max(0, 1 - (volDiff / 0.2)); // Normalize to 20% vol range

    // Apply volatility regime adjustments
    let environmentScore = volSimilarity;

    // Patterns perform better in similar volatility environments
    if (volDiff < 0.05) { // Within 5% volatility
      environmentScore *= 1.1; // 10% bonus
    }

    return Math.min(1.0, environmentScore);
  }

  /**
   * Apply normalization factors to dimension scores
   */
  private static applyNormalizationFactors(scores: {
    feature_similarity: number;
    temporal_proximity: number;
    outcome_correlation: number;
    market_regime_alignment: number;
    volatility_environment: number;
  }): {
    feature_similarity: number;
    temporal_proximity: number;
    outcome_correlation: number;
    market_regime_alignment: number;
    volatility_environment: number;
  } {
    return {
      feature_similarity: this.normalizeScore(
        scores.feature_similarity,
        this.NORMALIZATION_FACTORS.feature_similarity_range
      ),
      temporal_proximity: this.normalizeScore(
        scores.temporal_proximity,
        this.NORMALIZATION_FACTORS.temporal_proximity_range
      ),
      outcome_correlation: this.normalizeScore(
        scores.outcome_correlation,
        this.NORMALIZATION_FACTORS.outcome_correlation_range
      ),
      market_regime_alignment: this.normalizeScore(
        scores.market_regime_alignment,
        this.NORMALIZATION_FACTORS.market_regime_range
      ),
      volatility_environment: this.normalizeScore(
        scores.volatility_environment,
        this.NORMALIZATION_FACTORS.volatility_range
      )
    };
  }

  /**
   * Calculate weighted overall score
   */
  private static calculateWeightedScore(normalizedScores: {
    feature_similarity: number;
    temporal_proximity: number;
    outcome_correlation: number;
    market_regime_alignment: number;
    volatility_environment: number;
  }): number {
    const weights = this.SCORING_WEIGHTS;

    return (
      normalizedScores.feature_similarity * weights.feature_similarity +
      normalizedScores.temporal_proximity * weights.temporal_proximity +
      normalizedScores.outcome_correlation * weights.outcome_correlation +
      normalizedScores.market_regime_alignment * weights.market_regime_alignment +
      normalizedScores.volatility_environment * weights.volatility_environment
    );
  }

  /**
   * Calculate confidence intervals for scoring
   */
  private static calculateConfidenceIntervals(
    scores: any,
    observationCount: number
  ): {
    lower: number;
    upper: number;
    confidence_level: number;
  } {
    // Calculate standard error based on observation count
    const standardError = Math.sqrt(1 / Math.max(observationCount, 1));

    // Calculate weighted score variance estimate
    const scoreVariance = this.estimateScoreVariance(scores);

    // Calculate confidence interval using t-distribution approximation
    const confidenceLevel = 0.95;
    const tValue = 1.96; // Approximate t-value for 95% confidence
    const marginOfError = tValue * Math.sqrt(scoreVariance + standardError ** 2);

    // Calculate weighted overall score for bounds
    const overallScore = this.calculateWeightedScore(scores);

    return {
      lower: Math.max(0, overallScore - marginOfError),
      upper: Math.min(1, overallScore + marginOfError),
      confidence_level: confidenceLevel
    };
  }

  /**
   * Batch score multiple patterns efficiently
   */
  static batchScorePatterns(
    patterns: MarketPattern[],
    context: any,
    options?: {
      batch_size?: number;
      parallel_processing?: boolean;
      progress_callback?: (processed: number, total: number) => void;
    }
  ): Array<{
    pattern_id: string;
    score_result: ReturnType<typeof PatternScoringEngine.calculatePatternScore>;
  }> {
    const batchSize = Math.min(
      options?.batch_size || 50,
      this.SCORING_THRESHOLDS.batch_size_limit
    );

    const results: Array<{
      pattern_id: string;
      score_result: ReturnType<typeof PatternScoringEngine.calculatePatternScore>;
    }> = [];

    // Process in batches for memory efficiency
    for (let i = 0; i < patterns.length; i += batchSize) {
      const batch = patterns.slice(i, i + batchSize);

      for (const pattern of batch) {
        if (pattern) {
          const scoreResult = this.calculatePatternScore(pattern, context);
          results.push({
            pattern_id: pattern.pattern_id,
            score_result: scoreResult
          });
        }
      }

      // Report progress
      options?.progress_callback?.(Math.min(i + batchSize, patterns.length), patterns.length);
    }

    return results;
  }

  /**
   * Find top patterns based on scoring results
   */
  static findTopPatterns(
    scoredPatterns: Array<{
      pattern_id: string;
      score_result: ReturnType<typeof PatternScoringEngine.calculatePatternScore>;
    }>,
    criteria: {
      top_n?: number;
      min_score_threshold?: number;
      prioritize_confidence?: boolean;
      diversity_weight?: number;
    }
  ): {
    top_patterns: Array<{
      pattern_id: string;
      overall_score: number;
      confidence_interval: { lower: number; upper: number };
      rank: number;
    }>;
    selection_metadata: {
      total_evaluated: number;
      selected_count: number;
      average_score: number;
      score_distribution: {
        min: number;
        max: number;
        median: number;
        std_dev: number;
      };
    };
  } {
    const topN = criteria.top_n || 10;
    const minThreshold = criteria.min_score_threshold || 0.3;

    // Filter by minimum threshold
    const filteredPatterns = scoredPatterns.filter(item =>
      item.score_result.overall_score >= minThreshold
    );

    // Sort by score (prioritize confidence if requested)
    const sortedPatterns = filteredPatterns.sort((a, b) => {
      if (criteria.prioritize_confidence) {
        // Use confidence interval width as tiebreaker
        const aConfidence = a.score_result.confidence_intervals.upper - a.score_result.confidence_intervals.lower;
        const bConfidence = b.score_result.confidence_intervals.upper - b.score_result.confidence_intervals.lower;

        if (Math.abs(a.score_result.overall_score - b.score_result.overall_score) < 0.01) {
          return aConfidence - bConfidence; // Prefer narrower confidence intervals
        }
      }

      return b.score_result.overall_score - a.score_result.overall_score;
    });

    // Apply diversity weighting if requested
    let finalPatterns = sortedPatterns;
    if (criteria.diversity_weight && criteria.diversity_weight > 0) {
      finalPatterns = this.applyDiversityWeighting(sortedPatterns, criteria.diversity_weight);
    }

    // Select top N patterns
    const topPatterns = finalPatterns.slice(0, topN).map((item, index) => ({
      pattern_id: item.pattern_id,
      overall_score: item.score_result.overall_score,
      confidence_interval: {
        lower: item.score_result.confidence_intervals.lower,
        upper: item.score_result.confidence_intervals.upper
      },
      rank: index + 1
    }));

    // Calculate selection metadata
    const scores = topPatterns.map(p => p.overall_score);
    const selectionMetadata = {
      total_evaluated: scoredPatterns.length,
      selected_count: topPatterns.length,
      average_score: scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0,
      score_distribution: this.calculateScoreDistribution(scores)
    };

    return {
      top_patterns: topPatterns,
      selection_metadata: selectionMetadata
    };
  }

  /**
   * Private helper methods
   */
  private static extractPatternFeatures(pattern: MarketPattern): any {
    // Extract features from pattern conditions and outcomes
    return {
      technical_indicators: pattern.conditions.technical_indicators,
      market_conditions: pattern.conditions.market_conditions,
      temporal_constraints: pattern.conditions.temporal_constraints
    };
  }

  private static compareTechnicalIndicators(indicators1: any, indicators2: any): number {
    // Simplified technical indicator comparison
    // In practice, this would use more sophisticated comparison methods
    let similarity = 0;
    let comparisons = 0;

    const compareIndicator = (key: string) => {
      if (indicators1[key] !== undefined && indicators2[key] !== undefined) {
        const diff = Math.abs(indicators1[key] - indicators2[key]);
        const normalizedDiff = Math.min(diff / Math.abs(indicators1[key] || 1), 1);
        similarity += (1 - normalizedDiff);
        comparisons++;
      }
    };

    // Compare common technical indicators
    ['rsi', 'macd', 'bollinger_bands', 'moving_averages'].forEach(compareIndicator);

    return comparisons > 0 ? similarity / comparisons : 0.5;
  }

  private static comparePricePatterns(pattern1: any, pattern2: any): number {
    // Compare price action patterns
    if (!pattern1 || !pattern2) return 0.5;

    // Simple pattern type matching
    if (pattern1.type === pattern2.type) {
      return 0.8; // Same pattern type gets high similarity
    }

    // Different pattern types get lower similarity
    return 0.3;
  }

  private static compareVolumePatterns(pattern1: any, pattern2: any): number {
    // Compare volume profile patterns
    if (!pattern1 || !pattern2) return 0.5;

    // Compare volume characteristics
    const volumeDiff = Math.abs((pattern1.volume || 0) - (pattern2.volume || 0));
    const normalizedDiff = Math.min(volumeDiff / Math.max(pattern1.volume || 1, 1), 1);

    return 1 - normalizedDiff;
  }

  private static normalizeScore(score: number, range: [number, number]): number {
    const [min, max] = range;
    const clampedScore = Math.max(min, Math.min(max, score));

    // Normalize to [0, 1] range
    if (max === min) return 0.5;
    return (clampedScore - min) / (max - min);
  }

  private static estimateScoreVariance(scores: any): number {
    // Estimate variance from individual dimension scores
    const dimensionValues = Object.values(scores) as number[];
    const mean = dimensionValues.reduce((sum, val) => sum + val, 0) / dimensionValues.length;
    const squaredDiffs = dimensionValues.map(val => Math.pow(val - mean, 2));

    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / dimensionValues.length;
  }

  private static applyDiversityWeighting(
    patterns: Array<{
      pattern_id: string;
      score_result: ReturnType<typeof PatternScoringEngine.calculatePatternScore>;
    }>,
    diversityWeight: number
  ): Array<{
    pattern_id: string;
    score_result: ReturnType<typeof PatternScoringEngine.calculatePatternScore>;
  }> {
    // Apply diversity penalty to similar patterns
    return patterns.map((pattern, index) => {
      let diversityPenalty = 0;

      // Calculate similarity to already selected patterns
      for (let i = 0; i < index; i++) {
        const otherPattern = patterns[i];
        if (otherPattern) {
          // Simplified similarity check (in practice, use proper pattern similarity)
          const similarity = this.calculateSimplifiedSimilarity(pattern, otherPattern);
          diversityPenalty += similarity * diversityWeight;
        }
      }

      // Apply penalty to score
      const adjustedScore = { ...pattern.score_result };
      adjustedScore.overall_score = Math.max(0, adjustedScore.overall_score - diversityPenalty);

      return {
        ...pattern,
        score_result: adjustedScore
      };
    });
  }

  private static calculateSimplifiedSimilarity(
    pattern1: {
      pattern_id: string;
      score_result: ReturnType<typeof PatternScoringEngine.calculatePatternScore>;
    },
    pattern2: {
      pattern_id: string;
      score_result: ReturnType<typeof PatternScoringEngine.calculatePatternScore>;
    }
  ): number {
    // Simplified similarity calculation for diversity weighting
    const score1 = pattern1.score_result.overall_score;
    const score2 = pattern2.score_result.overall_score;

    return 1 - Math.abs(score1 - score2); // Higher similarity for closer scores
  }

  private static calculateScoreDistribution(scores: number[]): {
    min: number;
    max: number;
    median: number;
    std_dev: number;
  } {
    if (scores.length === 0) {
      return { min: 0, max: 0, median: 0, std_dev: 0 };
    }

    const sortedScores = [...scores].sort((a, b) => a - b);
    const min = sortedScores[0] ?? 0;
    const max = sortedScores[sortedScores.length - 1] ?? 0;
    const median = sortedScores[Math.floor(sortedScores.length / 2)] ?? 0;

    // Calculate standard deviation
    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const squaredDiffs = scores.map(s => Math.pow(s - mean, 2));
    const stdDev = Math.sqrt(squaredDiffs.reduce((sum, diff) => sum + diff, 0) / scores.length);

    return {
      min,
      max,
      median,
      std_dev: stdDev
    };
  }
}