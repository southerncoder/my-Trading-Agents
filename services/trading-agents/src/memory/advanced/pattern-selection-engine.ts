/**
 * Advanced Pattern Selection Engine
 *
 * Implements intelligent pattern selection algorithms for consolidating
 * multiple patterns based on relevance, reliability, and market context.
 * Provides sophisticated ranking and filtering capabilities for optimal
 * pattern selection in real-time trading scenarios.
 */

import { MemoryUtils } from './memory-utils';
import { MarketPattern } from './memory-consolidation-layer';

export class PatternSelectionEngine {
  private static readonly SELECTION_CRITERIA = {
    reliability_weight: 0.30,        // Pattern reliability score
    relevance_weight: 0.25,          // Current market relevance
    performance_weight: 0.20,        // Historical performance
    freshness_weight: 0.15,          // Recency of observations
    diversity_weight: 0.10           // Pattern diversity bonus
  };

  private static readonly CONSOLIDATION_THRESHOLDS = {
    min_similarity: 0.7,             // Minimum similarity for grouping
    max_group_size: 10,              // Maximum patterns per group
    min_observations: 5,             // Minimum observations for validity
    reliability_threshold: 0.6       // Minimum reliability for inclusion
  };

  /**
   * Select optimal patterns for current market context
   */
  static selectOptimalPatterns(
    availablePatterns: MarketPattern[],
    marketContext: {
      current_market_regime?: string;
      current_volatility?: number;
      target_timeframe?: string;
      risk_tolerance?: 'low' | 'medium' | 'high';
      asset_class?: string;
      max_patterns?: number;
    },
    selectionCriteria?: {
      prioritize_performance?: boolean;
      prioritize_reliability?: boolean;
      prioritize_recency?: boolean;
      diversity_bonus?: boolean;
    }
  ): {
    selected_patterns: MarketPattern[];
    selection_scores: Array<{
      pattern_id: string;
      overall_score: number;
      criteria_breakdown: Record<string, number>;
      selection_reason: string;
    }>;
    consolidation_groups: Array<{
      group_id: string;
      patterns: MarketPattern[];
      consolidated_pattern?: MarketPattern;
      group_coherence: number;
    }>;
    selection_metadata: {
      total_evaluated: number;
      filtered_count: number;
      consolidation_applied: boolean;
      selection_confidence: number;
    };
  } {
    const maxPatterns = marketContext.max_patterns || 5;
    const criteria = selectionCriteria || {};

    // Step 1: Filter patterns by basic criteria
    const filteredPatterns = this.filterPatternsByContext(availablePatterns, marketContext);

    // Step 2: Score patterns using multi-dimensional analysis
    const scoredPatterns = this.scorePatterns(filteredPatterns, marketContext, criteria);

    // Step 3: Group similar patterns for potential consolidation
    const consolidationGroups = this.groupSimilarPatterns(filteredPatterns);

    // Step 4: Apply consolidation to improve pattern quality
    const consolidatedGroups = this.applyIntelligentConsolidation(consolidationGroups);

    // Step 5: Select final patterns with diversity consideration
    const finalSelection = this.selectFinalPatterns(
      scoredPatterns,
      consolidatedGroups,
      maxPatterns,
      criteria
    );

    // Step 6: Calculate selection confidence
    const selectionConfidence = this.calculateSelectionConfidence(
      finalSelection.selected_patterns,
      scoredPatterns,
      consolidationGroups
    );

    return {
      selected_patterns: finalSelection.selected_patterns,
      selection_scores: finalSelection.selection_scores,
      consolidation_groups: consolidatedGroups,
      selection_metadata: {
        total_evaluated: availablePatterns.length,
        filtered_count: filteredPatterns.length,
        consolidation_applied: consolidatedGroups.some(g => g.consolidated_pattern),
        selection_confidence: selectionConfidence
      }
    };
  }

  /**
   * Filter patterns by market context and basic criteria
   */
  private static filterPatternsByContext(
    patterns: MarketPattern[],
    context: any
  ): MarketPattern[] {
    return patterns.filter(pattern => {
      // Reliability threshold
      if (pattern.learning_metrics.reliability_score < this.CONSOLIDATION_THRESHOLDS.reliability_threshold) {
        return false;
      }

      // Minimum observations
      if (pattern.learning_metrics.observation_count < this.CONSOLIDATION_THRESHOLDS.min_observations) {
        return false;
      }

      // Market regime compatibility
      if (context.current_market_regime) {
        const regimeDependence = pattern.learning_metrics.market_regime_dependence;
        const currentRegimeScore = regimeDependence[context.current_market_regime] || 0;
        if (currentRegimeScore < 0.3) {
          return false;
        }
      }

      // Risk tolerance alignment
      if (context.risk_tolerance) {
        const riskLevel = this.assessPatternRiskLevel(pattern);
        if (!this.isRiskCompatible(riskLevel, context.risk_tolerance)) {
          return false;
        }
      }

      // Temporal constraints
      if (context.target_timeframe) {
        const targetHours = this.parseTimeframe(context.target_timeframe);
        const constraints = pattern.conditions.temporal_constraints;
        if (targetHours < constraints.min_duration_hours ||
            targetHours > constraints.max_duration_hours) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Score patterns using multi-dimensional analysis
   */
  private static scorePatterns(
    patterns: MarketPattern[],
    context: any,
    criteria: any
  ): Array<{
    pattern: MarketPattern;
    overall_score: number;
    criteria_breakdown: Record<string, number>;
    selection_reason: string;
  }> {
    return patterns.map(pattern => {
      const scores = {
        reliability: this.calculateReliabilityScore(pattern),
        relevance: this.calculateRelevanceScore(pattern, context),
        performance: this.calculatePerformanceScore(pattern),
        freshness: this.calculateFreshnessScore(pattern),
        diversity: 0 // Will be calculated later in context of other patterns
      };

      // Apply criteria weights
      const weights = this.calculateDynamicWeights(criteria);
      const overallScore = Object.entries(scores).reduce((sum, [key, score]) => {
        const weight = weights[key as keyof typeof weights] || 0;
        return sum + (score * weight);
      }, 0);

      // Generate selection reason
      const selectionReason = this.generateSelectionReason(scores, weights);

      return {
        pattern,
        overall_score: overallScore,
        criteria_breakdown: scores,
        selection_reason: selectionReason
      };
    });
  }

  /**
   * Group similar patterns for consolidation
   */
  private static groupSimilarPatterns(
    patterns: MarketPattern[]
  ): Array<{
    group_id: string;
    patterns: MarketPattern[];
    group_coherence: number;
  }> {
    const groups: Array<{
      group_id: string;
      patterns: MarketPattern[];
      group_coherence: number;
    }> = [];

    const processed = new Set<string>();

    for (const pattern of patterns) {
      if (processed.has(pattern.pattern_id)) continue;

      const similarPatterns = [pattern];
      processed.add(pattern.pattern_id);

      // Find similar patterns
      for (const otherPattern of patterns) {
        if (processed.has(otherPattern.pattern_id)) continue;

        const similarity = MemoryUtils.calculatePatternSimilarity(pattern, otherPattern);
        if (similarity >= this.CONSOLIDATION_THRESHOLDS.min_similarity &&
            similarPatterns.length < this.CONSOLIDATION_THRESHOLDS.max_group_size) {
          similarPatterns.push(otherPattern);
          processed.add(otherPattern.pattern_id);
        }
      }

      // Calculate group coherence
      const groupCoherence = this.calculateGroupCoherence(similarPatterns);

      groups.push({
        group_id: `group_${groups.length + 1}_${Date.now()}`,
        patterns: similarPatterns,
        group_coherence: groupCoherence
      });
    }

    return groups;
  }

  /**
   * Apply intelligent consolidation to pattern groups
   */
  private static applyIntelligentConsolidation(
    groups: Array<{
      group_id: string;
      patterns: MarketPattern[];
      group_coherence: number;
    }>
  ): Array<{
    group_id: string;
    patterns: MarketPattern[];
    consolidated_pattern?: MarketPattern;
    group_coherence: number;
  }> {
    return groups.map(group => {
      // Only consolidate if group has multiple patterns and good coherence
      if (group.patterns.length > 1 && group.group_coherence > 0.7) {
        try {
          const consolidatedPattern = MemoryUtils.mergePatterns(group.patterns);

          // Enhance consolidated pattern with group insights
          const enhancedPattern = this.enhanceConsolidatedPattern(
            consolidatedPattern,
            group.patterns,
            group.group_coherence
          );

          return {
            ...group,
            consolidated_pattern: enhancedPattern
          };
        } catch (_error) {
          // If consolidation fails, return original group
          return group;
        }
      }

      return group;
    });
  }

  /**
   * Select final patterns with diversity consideration
   */
  private static selectFinalPatterns(
    scoredPatterns: Array<{
      pattern: MarketPattern;
      overall_score: number;
      criteria_breakdown: Record<string, number>;
      selection_reason: string;
    }>,
    consolidationGroups: Array<{
      group_id: string;
      patterns: MarketPattern[];
      consolidated_pattern?: MarketPattern;
      group_coherence: number;
    }>,
    maxPatterns: number,
    criteria: any
  ): {
    selected_patterns: MarketPattern[];
    selection_scores: Array<{
      pattern_id: string;
      overall_score: number;
      criteria_breakdown: Record<string, number>;
      selection_reason: string;
    }>;
  } {
    const candidatePatterns: Array<{
      pattern: MarketPattern;
      score_info: any;
      source: 'individual' | 'consolidated';
    }> = [];

    // Add individual patterns
    scoredPatterns.forEach(scored => {
      candidatePatterns.push({
        pattern: scored.pattern,
        score_info: scored,
        source: 'individual'
      });
    });

    // Add consolidated patterns (with bonus)
    consolidationGroups.forEach(group => {
      if (group.consolidated_pattern) {
        // Find base score from group patterns
        const groupScores = group.patterns.map(p =>
          scoredPatterns.find(s => s.pattern.pattern_id === p.pattern_id)
        ).filter(Boolean);

        const avgScore = groupScores.reduce((sum, s) => sum + (s?.overall_score || 0), 0) / groupScores.length;
        const consolidationBonus = 0.1 * group.group_coherence; // Bonus for good consolidation

        candidatePatterns.push({
          pattern: group.consolidated_pattern,
          score_info: {
            pattern: group.consolidated_pattern,
            overall_score: avgScore + consolidationBonus,
            criteria_breakdown: this.estimateConsolidatedCriteria(groupScores),
            selection_reason: `Consolidated from ${group.patterns.length} similar patterns`
          },
          source: 'consolidated'
        });
      }
    });

    // Apply diversity scoring
    this.applyDiversityScoring(candidatePatterns, criteria);

    // Sort by final score and select top patterns
    const sortedCandidates = candidatePatterns
      .sort((a, b) => b.score_info.overall_score - a.score_info.overall_score)
      .slice(0, maxPatterns);

    return {
      selected_patterns: sortedCandidates.map(c => c.pattern),
      selection_scores: sortedCandidates.map(c => ({
        pattern_id: c.pattern.pattern_id,
        overall_score: c.score_info.overall_score,
        criteria_breakdown: c.score_info.criteria_breakdown,
        selection_reason: c.score_info.selection_reason
      }))
    };
  }

  /**
   * Calculate reliability score for a pattern
   */
  private static calculateReliabilityScore(pattern: MarketPattern): number {
    const baseReliability = pattern.learning_metrics.reliability_score;
    const observationBonus = Math.min(0.2, pattern.learning_metrics.observation_count / 100);
    const successRateBonus = Math.max(0, (pattern.outcomes.success_rate - 0.5) * 0.3);

    return Math.min(1.0, baseReliability + observationBonus + successRateBonus);
  }

  /**
   * Calculate market relevance score
   */
  private static calculateRelevanceScore(pattern: MarketPattern, context: any): number {
    let relevanceScore = 0.5; // Base score

    // Market regime relevance
    if (context.current_market_regime) {
      const regimeScore = pattern.learning_metrics.market_regime_dependence[context.current_market_regime] || 0.3;
      relevanceScore += regimeScore * 0.4;
    }

    // Volatility relevance
    if (context.current_volatility) {
      const volDiff = Math.abs(pattern.outcomes.volatility - context.current_volatility);
      const volSimilarity = Math.max(0, 1 - (volDiff / 0.2)); // Normalize to 20% vol range
      relevanceScore += volSimilarity * 0.3;
    }

    // Temporal relevance
    const daysSinceUpdate = (Date.now() - new Date(pattern.learning_metrics.last_updated).getTime()) / (1000 * 60 * 60 * 24);
    const temporalRelevance = Math.exp(-0.01 * daysSinceUpdate); // 1% decay per day
    relevanceScore += temporalRelevance * 0.3;

    return Math.min(1.0, relevanceScore);
  }

  /**
   * Calculate performance score
   */
  private static calculatePerformanceScore(pattern: MarketPattern): number {
    const successRate = pattern.outcomes.success_rate;
    const riskAdjustedReturn = pattern.outcomes.avg_return / Math.max(0.01, pattern.outcomes.volatility);
    const drawdownPenalty = Math.abs(pattern.outcomes.max_drawdown) / 0.1; // Normalize to 10% drawdown

    const performanceScore = (successRate * 0.4) +
                           (Math.min(1.0, riskAdjustedReturn / 2) * 0.4) +
                           (Math.max(0, 1 - drawdownPenalty) * 0.2);

    return Math.max(0.1, Math.min(1.0, performanceScore));
  }

  /**
   * Calculate freshness score based on recency
   */
  private static calculateFreshnessScore(pattern: MarketPattern): number {
    const daysSinceUpdate = (Date.now() - new Date(pattern.learning_metrics.last_updated).getTime()) / (1000 * 60 * 60 * 24);
    return Math.exp(-0.05 * daysSinceUpdate); // 5% decay per day
  }

  /**
   * Calculate dynamic weights based on criteria
   */
  private static calculateDynamicWeights(criteria: any): Record<string, number> {
    const baseWeights = { ...this.SELECTION_CRITERIA };

    if (criteria.prioritize_performance) {
      baseWeights.performance_weight *= 1.5;
      baseWeights.reliability_weight *= 0.8;
    }

    if (criteria.prioritize_reliability) {
      baseWeights.reliability_weight *= 1.5;
      baseWeights.performance_weight *= 0.8;
    }

    if (criteria.prioritize_recency) {
      baseWeights.freshness_weight *= 2.0;
      baseWeights.relevance_weight *= 0.7;
    }

    if (criteria.diversity_bonus) {
      baseWeights.diversity_weight *= 2.0;
    }

    // Normalize weights to sum to 1.0
    const totalWeight = Object.values(baseWeights).reduce((sum, w) => sum + w, 0);
    Object.keys(baseWeights).forEach(key => {
      baseWeights[key as keyof typeof baseWeights] /= totalWeight;
    });

    return baseWeights;
  }

  /**
   * Generate selection reason based on scores
   */
  private static generateSelectionReason(scores: Record<string, number>, weights: Record<string, number>): string {
    const entries = Object.entries(scores)
      .map(([key, score]) => ({ key, score, weight: weights[key] || 0, weighted: score * (weights[key] || 0) }))
      .sort((a, b) => b.weighted - a.weighted);

    const topCriterion = entries[0];

    if (!topCriterion) {
      return 'Selected based on multi-criteria analysis';
    }

    const reasons = {
      reliability: 'High reliability and consistent performance',
      relevance: 'Strong relevance to current market conditions',
      performance: 'Excellent historical performance metrics',
      freshness: 'Recent observations with up-to-date insights',
      diversity: 'Provides pattern diversity to the selection'
    };

    return reasons[topCriterion.key as keyof typeof reasons] || 'Selected based on multi-criteria analysis';
  }

  /**
   * Assess pattern risk level
   */
  private static assessPatternRiskLevel(pattern: MarketPattern): 'low' | 'medium' | 'high' {
    const volatility = pattern.outcomes.volatility;
    const maxDrawdown = Math.abs(pattern.outcomes.max_drawdown);

    if (volatility < 0.15 && maxDrawdown < 0.05) return 'low';
    if (volatility > 0.25 || maxDrawdown > 0.15) return 'high';
    return 'medium';
  }

  /**
   * Check if risk levels are compatible
   */
  private static isRiskCompatible(patternRisk: string, tolerance: string): boolean {
    const riskLevels = { low: 1, medium: 2, high: 3 };
    const toleranceLevels = { low: 1, medium: 2, high: 3 };

    return riskLevels[patternRisk as keyof typeof riskLevels] <=
           toleranceLevels[tolerance as keyof typeof toleranceLevels];
  }

  /**
   * Parse timeframe string to hours
   */
  private static parseTimeframe(timeframe: string): number {
    const match = timeframe.match(/(\d+)([hdwmy])/i);
    if (!match || !match[1] || !match[2]) return 24;

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 'h': return value;
      case 'd': return value * 24;
      case 'w': return value * 24 * 7;
      case 'm': return value * 24 * 30;
      case 'y': return value * 24 * 365;
      default: return value;
    }
  }

  /**
   * Calculate group coherence
   */
  private static calculateGroupCoherence(patterns: MarketPattern[]): number {
    if (patterns.length <= 1) return 1.0;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < patterns.length; i++) {
      for (let j = i + 1; j < patterns.length; j++) {
        const pattern1 = patterns[i];
        const pattern2 = patterns[j];
        if (pattern1 && pattern2) {
          totalSimilarity += MemoryUtils.calculatePatternSimilarity(pattern1, pattern2);
          comparisons++;
        }
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  /**
   * Enhance consolidated pattern with group insights
   */
  private static enhanceConsolidatedPattern(
    consolidatedPattern: MarketPattern,
    originalPatterns: MarketPattern[],
    groupCoherence: number
  ): MarketPattern {
    // Add consolidation metadata
    const enhanced = { ...consolidatedPattern };

    // Update reliability score with consolidation bonus
    enhanced.learning_metrics.reliability_score = Math.min(1.0,
      enhanced.learning_metrics.reliability_score + (0.1 * groupCoherence)
    );

    // Update description to reflect consolidation
    enhanced.description = `${enhanced.description} (Consolidated from ${originalPatterns.length} patterns with ${(groupCoherence * 100).toFixed(1)}% coherence)`;

    // Add related patterns
    enhanced.meta_information.related_patterns = originalPatterns.map(p => p.pattern_id);

    return enhanced;
  }

  /**
   * Estimate criteria breakdown for consolidated patterns
   */
  private static estimateConsolidatedCriteria(groupScores: any[]): Record<string, number> {
    const criteria = ['reliability', 'relevance', 'performance', 'freshness', 'diversity'];
    const estimatedCriteria: Record<string, number> = {};

    criteria.forEach(criterion => {
      const values = groupScores.map(s => s?.criteria_breakdown[criterion] || 0);
      estimatedCriteria[criterion] = values.reduce((sum, v) => sum + v, 0) / values.length;
    });

    return estimatedCriteria;
  }

  /**
   * Apply diversity scoring to candidates
   */
  private static applyDiversityScoring(candidates: any[], criteria: any): void {
    if (!criteria.diversity_bonus) return;

    candidates.forEach((candidate, index) => {
      let diversityScore = 0;

      // Calculate diversity relative to other candidates
      candidates.forEach((other, otherIndex) => {
        if (index !== otherIndex) {
          const similarity = MemoryUtils.calculatePatternSimilarity(candidate.pattern, other.pattern);
          diversityScore += (1 - similarity); // Higher score for less similarity
        }
      });

      if (candidates.length > 1) {
        diversityScore /= (candidates.length - 1);
      }

      // Update diversity score in criteria breakdown
      candidate.score_info.criteria_breakdown.diversity = diversityScore;

      // Recalculate overall score with diversity
      const weights = this.calculateDynamicWeights(criteria);
      candidate.score_info.overall_score = Object.entries(candidate.score_info.criteria_breakdown)
        .reduce((sum: number, [key, score]: [string, any]) => {
          const weight = weights[key as keyof typeof weights] || 0;
          return sum + (score * weight);
        }, 0);
    });
  }

  /**
   * Calculate selection confidence
   */
  private static calculateSelectionConfidence(
    selectedPatterns: MarketPattern[],
    allScoredPatterns: any[],
    consolidationGroups: any[]
  ): number {
    if (selectedPatterns.length === 0) return 0;

    // Base confidence from selected pattern reliability
    const avgReliability = selectedPatterns.reduce((sum, p) =>
      sum + p.learning_metrics.reliability_score, 0) / selectedPatterns.length;

    // Score separation bonus (higher confidence if clear winners)
    const allScores = allScoredPatterns.map(s => s.overall_score);
    const scoreVariance = this.calculateVariance(allScores);
    const separationBonus = Math.min(0.2, scoreVariance * 2);

    // Consolidation quality bonus
    const consolidationBonus = consolidationGroups.length > 0 ?
      consolidationGroups.reduce((sum, g) => sum + g.group_coherence, 0) / consolidationGroups.length * 0.1 : 0;

    return Math.min(1.0, avgReliability + separationBonus + consolidationBonus);
  }

  /**
   * Calculate variance helper method
   */
  private static calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }
}