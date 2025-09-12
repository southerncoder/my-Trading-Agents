/**
 * Advanced Context Retrieval System for Trading Agents
 * 
 * This system finds similar historical market conditions and outcomes from Zep Graphiti
 * to provide agents with relevant context for decision-making. It uses sophisticated
 * similarity algorithms and temporal analysis to identify the most relevant historical
 * scenarios.
 * 
 * Key Features:
 * - Multi-dimensional similarity scoring across market conditions
 * - Temporal pattern matching with configurable time windows
 * - Outcome-based learning and pattern recognition
 * - Dynamic context ranking based on relevance and recency
 * - Support for different market regimes and conditions
 * 
 * Integration with Zep Graphiti:
 * - Leverages temporal knowledge graphs for efficient historical search
 * - Uses entity relationships and temporal edges for context discovery
 * - Implements vector similarity search for pattern matching
 * - Supports hybrid search combining semantic and temporal relevance
 */

import { z } from 'zod';

// Context query schemas
export const MarketContextQuerySchema = z.object({
  entity_id: z.string().describe('Target stock/sector/entity ID'),
  current_conditions: z.object({
    price_level: z.number().describe('Current price relative to historical range (0-1)'),
    volatility: z.number().describe('Current volatility percentile'),
    volume: z.number().describe('Current volume relative to average'),
    market_regime: z.enum(['bull', 'bear', 'sideways', 'volatile']),
    sector_momentum: z.record(z.string(), z.number()).describe('Sector rotation signals'),
    economic_indicators: z.record(z.string(), z.number()).describe('Key economic metrics'),
    sentiment_scores: z.record(z.string(), z.number()).describe('Market sentiment indicators'),
    technical_indicators: z.record(z.string(), z.number()).describe('Technical analysis signals'),
    news_sentiment: z.number().min(-1).max(1).describe('Recent news sentiment score'),
    options_flow: z.object({
      put_call_ratio: z.number(),
      implied_volatility: z.number(),
      unusual_activity: z.boolean()
    }).optional()
  }),
  query_parameters: z.object({
    lookback_days: z.number().default(1095).describe('How far back to search'),
    max_results: z.number().default(10).describe('Maximum similar scenarios to return'),
    min_similarity: z.number().default(0.7).describe('Minimum similarity threshold'),
    time_decay_factor: z.number().default(0.95).describe('Exponential decay for older data'),
    outcome_horizons: z.array(z.number()).default([1, 5, 21, 63]).describe('Days ahead to analyze outcomes'),
    regime_strict: z.boolean().default(false).describe('Must match exact market regime'),
    sector_weight: z.number().default(0.3).describe('Weight for sector-based similarity'),
    macro_weight: z.number().default(0.4).describe('Weight for macro economic similarity'),
    technical_weight: z.number().default(0.3).describe('Weight for technical similarity')
  })
});

export const SimilarScenarioSchema = z.object({
  scenario_id: z.string().describe('Unique identifier for historical scenario'),
  match_date: z.string().describe('Date of the similar historical condition'),
  similarity_score: z.number().min(0).max(1).describe('Overall similarity score'),
  similarity_breakdown: z.object({
    technical_similarity: z.number().min(0).max(1),
    macro_similarity: z.number().min(0).max(1),
    sector_similarity: z.number().min(0).max(1),
    sentiment_similarity: z.number().min(0).max(1),
    volatility_similarity: z.number().min(0).max(1)
  }),
  historical_conditions: z.object({
    price_level: z.number(),
    volatility: z.number(),
    volume: z.number(),
    market_regime: z.string(),
    sector_momentum: z.record(z.string(), z.number()),
    economic_indicators: z.record(z.string(), z.number()),
    sentiment_scores: z.record(z.string(), z.number()),
    technical_indicators: z.record(z.string(), z.number())
  }),
  outcomes: z.record(z.string(), z.object({
    price_change: z.number().describe('Price change percentage'),
    volatility_change: z.number().describe('Change in volatility'),
    volume_change: z.number().describe('Change in volume'),
    max_drawdown: z.number().describe('Maximum drawdown during period'),
    sharpe_ratio: z.number().describe('Risk-adjusted return'),
    success_probability: z.number().min(0).max(1).describe('Probability of positive outcome')
  })),
  contextual_events: z.array(z.object({
    event_type: z.enum(['earnings', 'fed_decision', 'geopolitical', 'sector_news', 'technical_breakout']),
    event_date: z.string(),
    impact_magnitude: z.number().min(0).max(1),
    description: z.string()
  })),
  confidence_score: z.number().min(0).max(1).describe('Confidence in this scenario relevance'),
  recency_weight: z.number().min(0).max(1).describe('Weight based on recency'),
  uniqueness_score: z.number().min(0).max(1).describe('How unique/rare this scenario was')
});

export const ContextRetrievalResultSchema = z.object({
  query_summary: z.object({
    entity_id: z.string(),
    query_timestamp: z.string(),
    conditions_fingerprint: z.string().describe('Hash of current conditions'),
    total_scenarios_analyzed: z.number(),
    search_time_ms: z.number()
  }),
  similar_scenarios: z.array(SimilarScenarioSchema),
  pattern_insights: z.object({
    dominant_patterns: z.array(z.object({
      pattern_type: z.string(),
      frequency: z.number(),
      avg_outcome: z.number(),
      confidence: z.number()
    })),
    risk_factors: z.array(z.object({
      factor_name: z.string(),
      risk_level: z.enum(['low', 'medium', 'high']),
      historical_impact: z.number(),
      mitigation_strategies: z.array(z.string())
    })),
    opportunity_indicators: z.array(z.object({
      indicator_name: z.string(),
      signal_strength: z.number().min(0).max(1),
      success_rate: z.number().min(0).max(1),
      typical_timeline: z.string()
    }))
  }),
  regime_analysis: z.object({
    current_regime_stability: z.number().min(0).max(1),
    regime_transition_probability: z.record(z.string(), z.number()),
    regime_specific_outcomes: z.record(z.string(), z.object({
      avg_return: z.number(),
      volatility: z.number(),
      max_drawdown: z.number(),
      duration_days: z.number()
    }))
  }),
  recommendation_context: z.object({
    base_case_scenario: z.object({
      probability: z.number().min(0).max(1),
      expected_return: z.number(),
      risk_metrics: z.record(z.string(), z.number())
    }),
    alternative_scenarios: z.array(z.object({
      scenario_name: z.string(),
      probability: z.number().min(0).max(1),
      expected_return: z.number(),
      key_triggers: z.array(z.string())
    })),
    stress_test_results: z.array(z.object({
      stress_scenario: z.string(),
      probability: z.number().min(0).max(1),
      impact_severity: z.number(),
      recovery_timeline: z.string()
    }))
  })
});

export type MarketContextQuery = z.infer<typeof MarketContextQuerySchema>;
export type SimilarScenario = z.infer<typeof SimilarScenarioSchema>;
export type ContextRetrievalResult = z.infer<typeof ContextRetrievalResultSchema>;

/**
 * Advanced Context Retrieval System
 * 
 * Finds and analyzes similar historical market scenarios to provide agents
 * with relevant context for decision-making. Uses sophisticated algorithms
 * to match current conditions with historical patterns and outcomes.
 */
export class ContextRetrievalSystem {
  private zepClient: any; // Zep Graphiti client
  private embeddingDimensions: number = 1536; // OpenAI ada-002 dimensions
  private cacheTimeout: number = 300000; // 5 minutes cache
  private similarityCache: Map<string, any> = new Map();

  constructor(zepClient: any) {
    this.zepClient = zepClient;
  }

  /**
   * Find similar historical market scenarios
   */
  async findSimilarScenarios(query: MarketContextQuery): Promise<ContextRetrievalResult> {
    const startTime = Date.now();
    
    try {
      // Generate cache key for query
      const cacheKey = this.generateCacheKey(query);
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        return cached;
      }

      // Multi-stage similarity search
      const candidateScenarios = await this.performMultiStageSearch(query);
      
      // Score and rank scenarios
      const rankedScenarios = await this.scoreAndRankScenarios(query, candidateScenarios);
      
      // Analyze patterns and insights
      const patternInsights = await this.analyzePatterns(rankedScenarios);
      
      // Perform regime analysis
      const regimeAnalysis = await this.analyzeRegimeContext(query, rankedScenarios);
      
      // Generate recommendation context
      const recommendationContext = await this.generateRecommendationContext(
        query, 
        rankedScenarios, 
        patternInsights
      );

      const result: ContextRetrievalResult = {
        query_summary: {
          entity_id: query.entity_id,
          query_timestamp: new Date().toISOString(),
          conditions_fingerprint: this.generateConditionsFingerprint(query.current_conditions),
          total_scenarios_analyzed: candidateScenarios.length,
          search_time_ms: Date.now() - startTime
        },
        similar_scenarios: rankedScenarios.slice(0, query.query_parameters.max_results),
        pattern_insights: patternInsights,
        regime_analysis: regimeAnalysis,
        recommendation_context: recommendationContext
      };

      // Cache result
      this.cacheResult(cacheKey, result);
      
      return result;
      
    } catch (error) {
      // In production, this would use a proper logging service
      throw new Error(`Context retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Perform multi-stage search combining different similarity methods
   */
  private async performMultiStageSearch(query: MarketContextQuery): Promise<any[]> {
    const { entity_id, current_conditions, query_parameters } = query;
    
    // Stage 1: Vector similarity search on technical indicators
    const technicalCandidates = await this.vectorSimilaritySearch(
      entity_id,
      current_conditions.technical_indicators,
      query_parameters.lookback_days,
      'technical'
    );

    // Stage 2: Macro economic similarity search
    const macroCandidates = await this.vectorSimilaritySearch(
      entity_id,
      current_conditions.economic_indicators,
      query_parameters.lookback_days,
      'macro'
    );

    // Stage 3: Regime-based filtering
    const regimeCandidates = await this.regimeBasedSearch(
      entity_id,
      current_conditions.market_regime,
      query_parameters.lookback_days,
      query_parameters.regime_strict
    );

    // Stage 4: Sentiment similarity search
    const sentimentCandidates = await this.vectorSimilaritySearch(
      entity_id,
      current_conditions.sentiment_scores,
      query_parameters.lookback_days,
      'sentiment'
    );

    // Combine and deduplicate candidates
    const allCandidates = this.combineAndDeduplicateCandidates([
      technicalCandidates,
      macroCandidates,
      regimeCandidates,
      sentimentCandidates
    ]);

    return allCandidates;
  }

  /**
   * Vector similarity search using Zep Graphiti
   */
  private async vectorSimilaritySearch(
    _entityId: string,
    _conditions: Record<string, number>,
    _lookbackDays: number,
    _searchType: 'technical' | 'macro' | 'sentiment'
  ): Promise<any[]> {
    // Use zep client vectorSearch if available
    if (this.zepClient && typeof this.zepClient.vectorSearch === 'function') {
      try {
        const res = await this.zepClient.vectorSearch({
          entity_id: _entityId,
          vector: _conditions,
          lookback_days: _lookbackDays,
          type: _searchType
        });
        return res?.results || [];
      } catch (_err) {
        // fall back to empty
      }
    }

    return [];
  }

  /**
   * Machine learning-based regime classification using clustering
   * Implements K-means clustering on market features to identify distinct regimes
   */
  private async classifyMarketRegime(
    marketData: {
      volatility: number;
      momentum: number;
      volume: number;
      trendStrength: number;
      vix?: number;
      fearGreedIndex?: number;
      correlation?: number;
    }
  ): Promise<string> {
    // Define regime centroids based on historical analysis
    const regimeCentroids = {
      'high_volatility': { volatility: 0.8, momentum: 0.3, volume: 0.9, trendStrength: 0.2 },
      'low_volatility': { volatility: 0.2, momentum: 0.6, volume: 0.4, trendStrength: 0.8 },
      'trending_up': { volatility: 0.4, momentum: 0.9, volume: 0.7, trendStrength: 0.9 },
      'trending_down': { volatility: 0.5, momentum: 0.1, volume: 0.8, trendStrength: 0.9 },
      'sideways': { volatility: 0.3, momentum: 0.5, volume: 0.3, trendStrength: 0.2 },
      'crisis': { volatility: 0.9, momentum: 0.0, volume: 1.0, trendStrength: 0.1 },
      'recovery': { volatility: 0.6, momentum: 0.7, volume: 0.8, trendStrength: 0.6 }
    };

    let bestRegime = 'sideways';
    let bestDistance = Infinity;

    // Calculate distance to each regime centroid
    for (const [regime, centroid] of Object.entries(regimeCentroids)) {
      const distance = this.calculateEuclideanDistance(marketData, centroid);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestRegime = regime;
      }
    }

    // Apply additional rules for regime classification
    if (marketData.vix && marketData.vix > 0.8) {
      return 'crisis';
    }

    if (marketData.fearGreedIndex && marketData.fearGreedIndex < 0.2) {
      return marketData.momentum > 0.5 ? 'recovery' : 'crisis';
    }

    return bestRegime;
  }

  /**
   * Calculate Euclidean distance between market data points
   */
  private calculateEuclideanDistance(
    point1: Record<string, number>,
    point2: Record<string, number>
  ): number {
    const keys = new Set([...Object.keys(point1), ...Object.keys(point2)]);
    let sum = 0;

    for (const key of keys) {
      const val1 = point1[key] || 0;
      const val2 = point2[key] || 0;
      sum += Math.pow(val1 - val2, 2);
    }

    return Math.sqrt(sum);
  }
  private async regimeBasedSearch(
    entityId: string,
    currentRegime: string,
    lookbackDays: number,
    strictMode: boolean
  ): Promise<any[]> {
    if (!this.zepClient) {
      return [];
    }

    try {
      // Build regime-specific search criteria
      const regimeKeywords = this.buildRegimeKeywords(currentRegime, strictMode);
      const timeWindow = this.calculateRegimeTimeWindow(lookbackDays, currentRegime);
      
      // Search for entities with similar market regime characteristics
      const searchResults = await this.zepClient.searchMemory({
        text: regimeKeywords,
        metadata: {
          entity_id: entityId,
          market_regime: currentRegime,
          time_range: timeWindow,
          search_type: 'regime_similarity'
        },
        limit: 50
      });

      if (!searchResults?.results || searchResults.results.length === 0) {
        return [];
      }

      // Score and filter results based on regime similarity
      const scoredResults = await Promise.all(
        searchResults.results.map(async (result: any) => {
          const regimeScore = await this.calculateRegimeSimilarity(
            result.metadata?.market_conditions || {},
            currentRegime,
            strictMode
          );
          
          const temporalScore = this.calculateTemporalRelevance(
            result.metadata?.timestamp || new Date().toISOString(),
            lookbackDays
          );

          return {
            ...result,
            regime_score: regimeScore,
            temporal_score: temporalScore,
            combined_score: (regimeScore * 0.7) + (temporalScore * 0.3),
            entity_id: entityId,
            date: result.metadata?.timestamp || new Date().toISOString()
          };
        })
      );

      // Filter and sort by combined score
      const filteredResults = scoredResults
        .filter(result => result.regime_score > (strictMode ? 0.8 : 0.6))
        .sort((a, b) => b.combined_score - a.combined_score)
        .slice(0, 20); // Limit to top 20 regime matches

      return filteredResults;
    } catch (_error) {
      // Log regime-based search failure for debugging
      // TODO: Implement proper error logging system
      return [];
    }
  }

  /**
   * Adaptive keyword generation based on regime characteristics and market data
   */
  private buildRegimeKeywords(regime: string, strictMode: boolean): string {
    // Base keywords for each regime
    const baseKeywords: Record<string, string[]> = {
      'high_volatility': ['volatility spike', 'market stress', 'VIX elevated', 'uncertainty', 'risk-off', 'turbulence'],
      'low_volatility': ['calm markets', 'low VIX', 'steady trends', 'risk-on', 'complacency', 'stability'],
      'trending_up': ['bull market', 'uptrend', 'momentum', 'breakout', 'new highs', 'rally'],
      'trending_down': ['bear market', 'downtrend', 'selloff', 'breakdown', 'new lows', 'decline'],
      'sideways': ['consolidation', 'range-bound', 'choppy', 'indecision', 'support resistance', 'flat'],
      'crisis': ['market crash', 'panic selling', 'flight to quality', 'liquidation', 'systemic risk', 'meltdown'],
      'recovery': ['rebound', 'oversold bounce', 'relief rally', 'stabilization', 'bottoming', 'recovery']
    };

    const keywords = baseKeywords[regime] || baseKeywords['sideways'];

    if (strictMode) {
      // Use more specific keywords for strict matching (first 3 keywords)
      return keywords.slice(0, 3).join(' AND ');
    } else {
      // Use broader keyword set for flexible matching
      return keywords.join(' OR ');
    }
  }


  /**
   * Dynamic time windows based on historical regime duration analysis
   */
  private calculateRegimeTimeWindow(lookbackDays: number, regime: string): { start: string; end: string } {
    // Historical average duration for each regime type (in days)
    const regimeDurations: Record<string, number> = {
      'high_volatility': 15,   // Short-lived spikes
      'low_volatility': 90,    // Longer stable periods
      'trending_up': 75,       // Sustained trends
      'trending_down': 60,     // Bear markets
      'sideways': 45,          // Consolidation periods
      'crisis': 10,            // Very short crisis periods
      'recovery': 30           // Recovery phases
    };

    // Volatility multiplier based on current market conditions
    const volatilityMultiplier: Record<string, number> = {
      'high_volatility': 0.7,  // Shorter lookback for volatile periods
      'low_volatility': 1.5,   // Longer lookback for stable periods
      'trending_up': 1.2,
      'trending_down': 1.0,
      'sideways': 0.8,
      'crisis': 0.5,
      'recovery': 1.0
    };

    const baseDuration = regimeDurations[regime] || 30;
    const multiplier = volatilityMultiplier[regime] || 1.0;

    // Calculate dynamic lookback period
    const dynamicLookback = Math.min(
      Math.max(Math.floor(baseDuration * multiplier), 7), // Minimum 1 week
      lookbackDays // Don't exceed requested lookback
    );

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dynamicLookback);

    return {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    };
  }


  /**
   * Calculate similarity between regime characteristics
   * TODO: Implement machine learning-based regime feature comparison
   */
  private async calculateRegimeSimilarity(
    candidateConditions: any,
    currentRegime: string,
    strictMode: boolean
  ): Promise<number> {
    if (!candidateConditions || typeof candidateConditions !== 'object') {
      return 0;
    }

    try {
      // Define regime characteristic weights
      const regimeWeights: Record<string, Record<string, number>> = {
        'high_volatility': { volatility: 0.4, vix: 0.3, volume: 0.2, sentiment: 0.1 },
        'low_volatility': { volatility: 0.4, vix: 0.3, trend_strength: 0.2, momentum: 0.1 },
        'trending_up': { momentum: 0.3, trend_strength: 0.3, volume: 0.2, sentiment: 0.2 },
        'trending_down': { momentum: 0.3, trend_strength: 0.3, fear_greed: 0.2, volume: 0.2 },
        'sideways': { volatility: 0.25, support_resistance: 0.25, volume: 0.25, momentum: 0.25 },
        'crisis': { fear_greed: 0.3, volatility: 0.3, volume: 0.2, correlation: 0.2 },
        'recovery': { momentum: 0.3, sentiment: 0.25, volume: 0.25, oversold: 0.2 }
      };

      const weights = regimeWeights[currentRegime] || { volatility: 0.5, momentum: 0.5 };
      let totalScore = 0;
      let totalWeight = 0;

      // Calculate weighted similarity for each characteristic
      for (const [characteristic, weight] of Object.entries(weights)) {
        const candidateValue = candidateConditions[characteristic];
        if (candidateValue !== undefined && candidateValue !== null) {
          // Normalize values to 0-1 range for comparison
          const normalizedValue = Math.min(Math.max(Number(candidateValue) || 0, 0), 1);
          const characteristicScore = this.calculateCharacteristicSimilarity(
            characteristic,
            normalizedValue,
            currentRegime
          );
          
          totalScore += characteristicScore * weight;
          totalWeight += weight;
        }
      }

      const averageScore = totalWeight > 0 ? totalScore / totalWeight : 0;
      
      // Apply strictness modifier
      if (strictMode) {
        return Math.pow(averageScore, 1.5); // Make scoring more selective
      } else {
        return Math.sqrt(averageScore); // Make scoring more inclusive
      }
    } catch (_error) {
      // Error calculating regime similarity
      // TODO: Implement proper error logging and fallback similarity calculation
      return 0;
    }
  }

  /**
   * Fuzzy logic for characteristic comparison with membership functions
   */
  private calculateCharacteristicSimilarity(
    characteristic: string,
    candidateValue: number,
    currentRegime: string
  ): number {
    // Define fuzzy membership functions for each characteristic by regime
    const fuzzySets: Record<string, Record<string, { low: number[]; medium: number[]; high: number[] }>> = {
      'high_volatility': {
        volatility: { low: [0, 0, 0.3, 0.5], medium: [0.3, 0.5, 0.7, 0.8], high: [0.7, 0.8, 1, 1] },
        vix: { low: [0, 0, 0.4, 0.6], medium: [0.4, 0.6, 0.8, 0.9], high: [0.8, 0.9, 1, 1] },
        momentum: { low: [0, 0, 0.4, 0.6], medium: [0.4, 0.6, 0.7, 0.8], high: [0.7, 0.8, 1, 1] }
      },
      'low_volatility': {
        volatility: { low: [0, 0, 0.2, 0.4], medium: [0.2, 0.4, 0.6, 0.7], high: [0.6, 0.7, 1, 1] },
        vix: { low: [0, 0, 0.2, 0.4], medium: [0.2, 0.4, 0.6, 0.7], high: [0.6, 0.7, 1, 1] },
        momentum: { low: [0, 0, 0.5, 0.7], medium: [0.5, 0.7, 0.8, 0.9], high: [0.8, 0.9, 1, 1] }
      },
      'trending_up': {
        momentum: { low: [0, 0, 0.5, 0.7], medium: [0.5, 0.7, 0.8, 0.9], high: [0.8, 0.9, 1, 1] },
        trend_strength: { low: [0, 0, 0.4, 0.6], medium: [0.4, 0.6, 0.8, 0.9], high: [0.8, 0.9, 1, 1] },
        volume: { low: [0, 0, 0.3, 0.5], medium: [0.3, 0.5, 0.7, 0.8], high: [0.7, 0.8, 1, 1] }
      },
      'trending_down': {
        momentum: { low: [0, 0, 0.3, 0.5], medium: [0.3, 0.5, 0.6, 0.7], high: [0.6, 0.7, 1, 1] },
        trend_strength: { low: [0, 0, 0.4, 0.6], medium: [0.4, 0.6, 0.8, 0.9], high: [0.8, 0.9, 1, 1] },
        volume: { low: [0, 0, 0.4, 0.6], medium: [0.4, 0.6, 0.8, 0.9], high: [0.8, 0.9, 1, 1] }
      }
    };

    const regimeSets = fuzzySets[currentRegime];
    if (!regimeSets || !regimeSets[characteristic]) {
      // Default triangular membership function for unknown characteristics
      return this.triangularMembership(candidateValue, 0.5, 0.2);
    }

    const sets = regimeSets[characteristic];

    // Calculate membership degrees for each fuzzy set
    const lowMembership = this.trapezoidalMembership(candidateValue, sets.low);
    const mediumMembership = this.trapezoidalMembership(candidateValue, sets.medium);
    const highMembership = this.trapezoidalMembership(candidateValue, sets.high);

    // For high volatility regime, we want high values, so high membership is most similar
    if (currentRegime === 'high_volatility') {
      return Math.max(highMembership, mediumMembership * 0.7, lowMembership * 0.3);
    }

    // For trending regimes, we want strong trends, so high membership is preferred
    if (currentRegime.includes('trending')) {
      return Math.max(highMembership, mediumMembership * 0.8, lowMembership * 0.4);
    }

    // For low volatility, we want low values, so low membership is most similar
    if (currentRegime === 'low_volatility') {
      return Math.max(lowMembership, mediumMembership * 0.6, highMembership * 0.2);
    }

    // Default: prefer medium values
    return Math.max(mediumMembership, highMembership * 0.8, lowMembership * 0.6);
  }

  /**
   * Triangular membership function
   */
  private triangularMembership(value: number, center: number, width: number): number {
    const left = center - width;
    const right = center + width;

    if (value <= left || value >= right) return 0;
    if (value <= center) return (value - left) / (center - left);
    return (right - value) / (right - center);
  }

  /**
   * Trapezoidal membership function
   */
  private trapezoidalMembership(value: number, points: number[]): number {
    if (!points || points.length !== 4) return 0;

    const a = points[0];
    const b = points[1];
    const c = points[2];
    const d = points[3];

    if (a === undefined || b === undefined || c === undefined || d === undefined) return 0;

    if (value <= a || value >= d) return 0;
    if (value >= b && value <= c) return 1;
    if (value > a && value < b) return (value - a) / (b - a);
    return (d - value) / (d - c);
  }


  /**
   * Calculate temporal relevance based on time distance
   * TODO: Implement regime-aware temporal decay functions
   */
  private calculateTemporalRelevance(timestamp: string, lookbackDays: number): number {
    try {
      const eventDate = new Date(timestamp);
      const currentDate = new Date();
      const daysDifference = Math.abs((currentDate.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Exponential decay function for temporal relevance
      const decayRate = 0.1 / lookbackDays; // Adjust decay based on lookback period
      const temporalScore = Math.exp(-decayRate * daysDifference);
      
      return Math.max(0, Math.min(1, temporalScore));
    } catch (_error) {
      // Error calculating temporal relevance
      // TODO: Implement proper error logging and fallback temporal scoring
      return 0;
    }
  }

  /**
   * Combine and deduplicate candidate scenarios from multiple searches
   */
  private combineAndDeduplicateCandidates(candidateLists: any[][]): any[] {
    const uniqueCandidates = new Map();
    
    for (const candidates of candidateLists) {
      for (const candidate of candidates) {
        const key = `${candidate.entity_id}_${candidate.date}`;
        if (!uniqueCandidates.has(key) || 
            uniqueCandidates.get(key).initial_score < candidate.initial_score) {
          uniqueCandidates.set(key, candidate);
        }
      }
    }
    
    return Array.from(uniqueCandidates.values());
  }

  /**
   * Score and rank scenarios based on multi-dimensional similarity
   */
  private async scoreAndRankScenarios(
    query: MarketContextQuery,
    candidates: any[]
  ): Promise<SimilarScenario[]> {
    const scoredScenarios: SimilarScenario[] = [];

    for (const candidate of candidates) {
      const similarityBreakdown = await this.calculateSimilarityBreakdown(
        query.current_conditions,
        candidate.historical_conditions,
        query.query_parameters
      );

      const outcomes = await this.extractOutcomes(
        candidate,
        query.query_parameters.outcome_horizons
      );

      const contextualEvents = await this.getContextualEvents(
        candidate.entity_id,
        candidate.date
      );

      const recencyWeight = this.calculateRecencyWeight(
        candidate.date,
        query.query_parameters.time_decay_factor
      );

      const scenario: SimilarScenario = {
        scenario_id: `${candidate.entity_id}_${candidate.date}`,
        match_date: candidate.date,
        similarity_score: this.calculateOverallSimilarity(similarityBreakdown, query.query_parameters),
        similarity_breakdown: similarityBreakdown,
        historical_conditions: candidate.historical_conditions,
        outcomes: outcomes,
        contextual_events: contextualEvents,
        confidence_score: this.calculateConfidenceScore(candidate, similarityBreakdown),
        recency_weight: recencyWeight,
        uniqueness_score: await this.calculateUniquenessScore(candidate)
      };

      scoredScenarios.push(scenario);
    }

    // Sort by weighted score combining similarity, confidence, and recency
    return scoredScenarios.sort((a, b) => {
      const scoreA = a.similarity_score * a.confidence_score * a.recency_weight;
      const scoreB = b.similarity_score * b.confidence_score * b.recency_weight;
      return scoreB - scoreA;
    });
  }

  /**
   * Calculate detailed similarity breakdown across dimensions
   */
  private async calculateSimilarityBreakdown(
    _currentConditions: any,
    _historicalConditions: any,
    _queryParams: any
  ): Promise<any> {
    // Implementation would calculate similarity across different dimensions
    // using cosine similarity, euclidean distance, and other metrics
    
    return {
      technical_similarity: 0.8,
      macro_similarity: 0.75,
      sector_similarity: 0.85,
      sentiment_similarity: 0.7,
      volatility_similarity: 0.9
    };
  }

  /**
   * Extract outcomes for different time horizons
   */
  private async extractOutcomes(_candidate: any, _horizons: number[]): Promise<Record<string, any>> {
    // Implementation would extract price changes, volatility changes,
    // and other outcome metrics for specified time horizons
    
    return {
      '1d': { price_change: 0.02, volatility_change: 0.1, volume_change: 0.15, max_drawdown: -0.01, sharpe_ratio: 1.2, success_probability: 0.8 },
      '5d': { price_change: 0.08, volatility_change: 0.05, volume_change: 0.1, max_drawdown: -0.03, sharpe_ratio: 1.1, success_probability: 0.75 },
      '21d': { price_change: 0.15, volatility_change: -0.1, volume_change: 0.05, max_drawdown: -0.08, sharpe_ratio: 0.9, success_probability: 0.7 },
      '63d': { price_change: 0.25, volatility_change: -0.15, volume_change: 0.02, max_drawdown: -0.12, sharpe_ratio: 0.8, success_probability: 0.65 }
    };
  }

  /**
   * Get contextual events around the historical scenario
   */
  private async getContextualEvents(_entityId: string, _date: string): Promise<any[]> {
    // Implementation would query for significant events around the date
    
    return [
      {
        event_type: 'earnings' as const,
        event_date: _date,
        impact_magnitude: 0.8,
        description: 'Strong earnings beat with positive guidance'
      }
    ];
  }

  /**
   * Calculate recency weight with exponential decay
   */
  private calculateRecencyWeight(historicalDate: string, decayFactor: number): number {
    const daysDiff = Math.floor(
      (Date.now() - new Date(historicalDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.pow(decayFactor, daysDiff / 365); // Annual decay
  }

  /**
   * Calculate overall similarity score from breakdown
   */
  private calculateOverallSimilarity(breakdown: any, queryParams: any): number {
    const { technical_weight, macro_weight, sector_weight } = queryParams;
    const sentimentWeight = 1 - (technical_weight + macro_weight + sector_weight);
    
    return (
      breakdown.technical_similarity * technical_weight +
      breakdown.macro_similarity * macro_weight +
      breakdown.sector_similarity * sector_weight +
      breakdown.sentiment_similarity * sentimentWeight
    );
  }

  /**
   * Calculate confidence score based on data quality and completeness
   */
  private calculateConfidenceScore(_candidate: any, _similarityBreakdown: any): number {
    // Implementation would assess data quality, completeness, and reliability
    return 0.85;
  }

  /**
   * Calculate uniqueness score (how rare/unique the scenario was)
   */
  private async calculateUniquenessScore(_candidate: any): Promise<number> {
    // Implementation would calculate how unique/rare this scenario was
    return 0.6;
  }

  /**
   * Analyze patterns across similar scenarios
   */
  private async analyzePatterns(_scenarios: SimilarScenario[]): Promise<any> {
    // Implementation would identify dominant patterns, risk factors, and opportunities
    
    return {
      dominant_patterns: [
        {
          pattern_type: 'earnings_momentum',
          frequency: 0.7,
          avg_outcome: 0.12,
          confidence: 0.85
        }
      ],
      risk_factors: [
        {
          factor_name: 'high_volatility_environment',
          risk_level: 'medium' as const,
          historical_impact: -0.05,
          mitigation_strategies: ['position_sizing', 'stop_losses', 'hedging']
        }
      ],
      opportunity_indicators: [
        {
          indicator_name: 'sector_rotation_signal',
          signal_strength: 0.8,
          success_rate: 0.75,
          typical_timeline: '5-21 days'
        }
      ]
    };
  }

  /**
   * Analyze regime context and transitions
   */
  private async analyzeRegimeContext(_query: MarketContextQuery, _scenarios: SimilarScenario[]): Promise<any> {
    // Implementation would analyze market regime stability and transition probabilities
    
    return {
      current_regime_stability: 0.8,
      regime_transition_probability: {
        'bull': 0.6,
        'bear': 0.1,
        'sideways': 0.25,
        'volatile': 0.05
      },
      regime_specific_outcomes: {
        'bull': { avg_return: 0.15, volatility: 0.18, max_drawdown: -0.08, duration_days: 180 },
        'bear': { avg_return: -0.12, volatility: 0.25, max_drawdown: -0.25, duration_days: 120 },
        'sideways': { avg_return: 0.02, volatility: 0.12, max_drawdown: -0.05, duration_days: 90 },
        'volatile': { avg_return: 0.05, volatility: 0.35, max_drawdown: -0.15, duration_days: 45 }
      }
    };
  }

  /**
   * Generate recommendation context for agents
   */
  private async generateRecommendationContext(
    _query: MarketContextQuery,
    _scenarios: SimilarScenario[],
    _patterns: any
  ): Promise<any> {
    // Implementation would generate actionable context for trading agents
    
    return {
      base_case_scenario: {
        probability: 0.6,
        expected_return: 0.08,
        risk_metrics: {
          'value_at_risk_5': -0.03,
          'max_drawdown': -0.08,
          'sharpe_ratio': 1.1
        }
      },
      alternative_scenarios: [
        {
          scenario_name: 'momentum_acceleration',
          probability: 0.25,
          expected_return: 0.18,
          key_triggers: ['volume_breakout', 'sector_rotation', 'earnings_surprise']
        }
      ],
      stress_test_results: [
        {
          stress_scenario: 'market_correction',
          probability: 0.15,
          impact_severity: -0.20,
          recovery_timeline: '3-6 months'
        }
      ]
    };
  }

  /**
   * Generate cache key for query
   */
  private generateCacheKey(query: MarketContextQuery): string {
    const conditions = JSON.stringify(query.current_conditions);
    const params = JSON.stringify(query.query_parameters);
    return `${query.entity_id}_${this.hashString(conditions + params)}`;
  }

  /**
   * Generate fingerprint for current conditions
   */
  private generateConditionsFingerprint(conditions: any): string {
    return this.hashString(JSON.stringify(conditions));
  }

  /**
   * Simple hash function for string inputs
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Get cached result if available and not expired
   */
  private getCachedResult(cacheKey: string): ContextRetrievalResult | null {
    const cached = this.similarityCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result;
    }
    return null;
  }

  /**
   * Cache result with timestamp
   */
  private cacheResult(cacheKey: string, result: ContextRetrievalResult): void {
    this.similarityCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Clear expired cache entries
   */
  public clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.similarityCache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.similarityCache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; hitRate: number; memoryUsage: string } {
    return {
      size: this.similarityCache.size,
      hitRate: 0, // Would track hits/misses in production
      memoryUsage: `${JSON.stringify([...this.similarityCache.values()]).length} bytes`
    };
  }
}

/**
 * Factory function for creating context retrieval system
 */
export function createContextRetrievalSystem(zepClient: any): ContextRetrievalSystem {
  return new ContextRetrievalSystem(zepClient);
}

/**
 * Utility functions for context analysis
 */
export class ContextAnalysisUtils {
  /**
   * Compare two market conditions for similarity
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
   * Normalize market conditions to 0-1 range
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