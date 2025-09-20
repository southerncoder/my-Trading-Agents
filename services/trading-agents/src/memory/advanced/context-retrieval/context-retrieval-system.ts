/**
 * Advanced Context Retrieval System
 *
 * Finds and analyzes similar historical market scenarios to provide agents
 * with relevant context for decision-making. Uses sophisticated algorithms
 * to match current conditions with historical patterns and outcomes.
 */

import { createLogger } from '../../../utils/enhanced-logger';
import { ContextAnalysisUtils } from './analysis-utils';
import {
  MarketContextQuery,
  SimilarScenario,
  ContextRetrievalResult,
  MarketContextQuerySchema,
  ContextRetrievalResultSchema
} from './schemas';

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
  private logger = createLogger('system', 'ContextRetrievalSystem');

  constructor(zepClient: any) {
    this.zepClient = zepClient;
  }

  /**
   * Find similar historical market scenarios
   */
  async findSimilarScenarios(query: MarketContextQuery): Promise<ContextRetrievalResult> {
    const startTime = Date.now();

    try {
      // Validate input
      const validatedQuery = MarketContextQuerySchema.parse(query);

      // Generate cache key for query
      const cacheKey = this.generateCacheKey(validatedQuery);
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        this.logger.debug('cache-hit', 'Returning cached result', { cacheKey, queryTime: Date.now() - startTime });
        return cached;
      }

      // Multi-stage similarity search
      const candidateScenarios = await this.performMultiStageSearch(validatedQuery);

      // Score and rank scenarios
      const rankedScenarios = await this.scoreAndRankScenarios(validatedQuery, candidateScenarios);

      // Analyze patterns and insights
      const patternInsights = await this.analyzePatterns(rankedScenarios);

      // Perform regime analysis
      const regimeAnalysis = await this.analyzeRegimeContext(validatedQuery, rankedScenarios);

      // Generate recommendation context
      const recommendationContext = await this.generateRecommendationContext(
        validatedQuery,
        rankedScenarios,
        patternInsights
      );

      const result: ContextRetrievalResult = {
        query_summary: {
          entity_id: validatedQuery.entity_id,
          query_timestamp: new Date().toISOString(),
          conditions_fingerprint: this.generateConditionsFingerprint(validatedQuery.current_conditions),
          total_scenarios_analyzed: candidateScenarios.length,
          search_time_ms: Date.now() - startTime
        },
        similar_scenarios: rankedScenarios.slice(0, validatedQuery.query_parameters.max_results),
        pattern_insights: patternInsights,
        regime_analysis: regimeAnalysis,
        recommendation_context: recommendationContext
      };

      // Validate result
      ContextRetrievalResultSchema.parse(result);

      // Cache result
      this.cacheResult(cacheKey, result);

      this.logger.info('retrieval-complete', 'Context retrieval completed', {
        entityId: validatedQuery.entity_id,
        scenariosFound: rankedScenarios.length,
        searchTime: Date.now() - startTime
      });

      return result;

    } catch (error) {
      this.logger.error('retrieval-failed', 'Context retrieval failed', {
        entityId: query.entity_id,
        error: error instanceof Error ? error.message : 'Unknown error',
        searchTime: Date.now() - startTime
      });
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
    entityId: string,
    conditions: Record<string, number>,
    lookbackDays: number,
    searchType: 'technical' | 'macro' | 'sentiment'
  ): Promise<any[]> {
    if (!this.zepClient || typeof this.zepClient.vectorSearch !== 'function') {
      return [];
    }

    try {
      const res = await this.zepClient.vectorSearch({
        entity_id: entityId,
        vector: Object.values(conditions),
        lookback_days: lookbackDays,
        type: searchType
      });
      return res?.results || [];
    } catch (error) {
      this.logger.warn('vector-search-failed', 'Vector similarity search failed', { entityId, searchType, error: error instanceof Error ? error.message : 'Unknown' });
      return [];
    }
  }

  /**
   * Machine learning-based regime classification using clustering
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

  /**
   * Regime-based search with fuzzy logic and temporal analysis
   */
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
    } catch (error) {
      this.logger.warn('regime-search-failed', 'Regime-based search failed', { entityId, currentRegime, error: error instanceof Error ? error.message : 'Unknown' });
      return [];
    }
  }

  /**
   * Adaptive keyword generation based on regime characteristics
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

    const keywords = baseKeywords[regime] || baseKeywords['sideways']!;

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
   * Calculate similarity between regime characteristics using fuzzy logic
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
    } catch (error) {
      this.logger.warn('regime-similarity-failed', 'Regime similarity calculation failed', { currentRegime, error: error instanceof Error ? error.message : 'Unknown' });
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
   * Calculate temporal relevance based on time distance with exponential decay
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
    } catch (error) {
      this.logger.warn('temporal-relevance-failed', 'Temporal relevance calculation failed', { timestamp, error: error instanceof Error ? error.message : 'Unknown' });
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
    currentConditions: any,
    historicalConditions: any,
    _queryParams: any
  ): Promise<any> {
    // Use ContextAnalysisUtils for similarity calculations
    const technicalSimilarity = ContextAnalysisUtils.calculateConditionSimilarity(
      currentConditions.technical_indicators || {},
      historicalConditions.technical_indicators || {}
    );

    const macroSimilarity = ContextAnalysisUtils.calculateConditionSimilarity(
      currentConditions.economic_indicators || {},
      historicalConditions.economic_indicators || {}
    );

    const sectorSimilarity = ContextAnalysisUtils.calculateConditionSimilarity(
      currentConditions.sector_momentum || {},
      historicalConditions.sector_momentum || {}
    );

    const sentimentSimilarity = ContextAnalysisUtils.calculateConditionSimilarity(
      currentConditions.sentiment_scores || {},
      historicalConditions.sentiment_scores || {}
    );

    const volatilitySimilarity = ContextAnalysisUtils.calculateConditionSimilarity(
      { volatility: currentConditions.volatility || 0, volume: currentConditions.volume || 0 },
      { volatility: historicalConditions.volatility || 0, volume: historicalConditions.volume || 0 }
    );

    return {
      technical_similarity: technicalSimilarity,
      macro_similarity: macroSimilarity,
      sector_similarity: sectorSimilarity,
      sentiment_similarity: sentimentSimilarity,
      volatility_similarity: volatilitySimilarity
    };
  }

  /**
   * Extract outcomes for different time horizons
   */
  private async extractOutcomes(candidate: any, horizons: number[]): Promise<Record<string, any>> {
    // Implementation would extract price changes, volatility changes,
    // and other outcome metrics for specified time horizons

    const outcomes: Record<string, any> = {};
    for (const horizon of horizons) {
      outcomes[`${horizon}d`] = {
        price_change: 0.02 * horizon / 21, // Placeholder calculation
        volatility_change: 0.1 * horizon / 21,
        volume_change: 0.15 * horizon / 21,
        max_drawdown: -0.01 * horizon / 21,
        sharpe_ratio: 1.2,
        success_probability: Math.max(0.5, 0.8 - (horizon / 21) * 0.1)
      };
    }

    return outcomes;
  }

  /**
   * Get contextual events around the historical scenario
   */
  private async getContextualEvents(entityId: string, date: string): Promise<any[]> {
    // Implementation would query for significant events around the date
    this.logger.debug('contextual-events-query', 'Getting contextual events', { entityId, date });

    return [
      {
        event_type: 'earnings' as const,
        event_date: date,
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
  private calculateConfidenceScore(candidate: any, similarityBreakdown: any): number {
    // Implementation would assess data quality, completeness, and reliability
    const dataCompleteness = this.assessDataCompleteness(candidate);
    const similarityConsistency = this.assessSimilarityConsistency(similarityBreakdown);

    return Math.min(dataCompleteness * 0.6 + similarityConsistency * 0.4, 1.0);
  }

  /**
   * Calculate uniqueness score (how rare/unique the scenario was)
   */
  private async calculateUniquenessScore(candidate: any): Promise<number> {
    // Implementation would calculate how unique/rare this scenario was
    // For now, return a placeholder based on market conditions
    const volatility = candidate.historical_conditions?.volatility || 0.5;
    const volume = candidate.historical_conditions?.volume || 0.5;

    // More extreme conditions are considered more unique
    const extremity = Math.abs(volatility - 0.5) + Math.abs(volume - 0.5);
    return Math.min(extremity * 2, 1.0);
  }

  /**
   * Assess data completeness for confidence scoring
   */
  private assessDataCompleteness(candidate: any): number {
    const requiredFields = ['historical_conditions', 'date', 'entity_id'];
    const optionalFields = ['metadata', 'similarity_score'];

    let score = 0;
    let totalFields = 0;

    // Check required fields (weighted more heavily)
    for (const field of requiredFields) {
      totalFields += 2;
      if (candidate[field] !== undefined && candidate[field] !== null) {
        score += 2;
      }
    }

    // Check optional fields
    for (const field of optionalFields) {
      totalFields += 1;
      if (candidate[field] !== undefined && candidate[field] !== null) {
        score += 1;
      }
    }

    return totalFields > 0 ? score / totalFields : 0;
  }

  /**
   * Assess similarity consistency for confidence scoring
   */
  private assessSimilarityConsistency(similarityBreakdown: any): number {
    const similarities = Object.values(similarityBreakdown) as number[];
    if (similarities.length === 0) return 0;

    const mean = similarities.reduce((sum, val) => sum + val, 0) / similarities.length;
    const variance = similarities.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / similarities.length;
    const stdDev = Math.sqrt(variance);

    // Lower standard deviation indicates more consistent similarities (higher confidence)
    return Math.max(0, 1 - stdDev);
  }

  /**
   * Analyze patterns across similar scenarios
   */
  private async analyzePatterns(scenarios: SimilarScenario[]): Promise<any> {
    if (scenarios.length === 0) {
      return {
        dominant_patterns: [],
        risk_factors: [],
        opportunity_indicators: []
      };
    }

    // Implementation would identify dominant patterns, risk factors, and opportunities
    const avgSimilarity = scenarios.reduce((sum, s) => sum + s.similarity_score, 0) / scenarios.length;
    const highSimilarityScenarios = scenarios.filter(s => s.similarity_score > avgSimilarity);

    return {
      dominant_patterns: [
        {
          pattern_type: 'earnings_momentum',
          frequency: highSimilarityScenarios.length / scenarios.length,
          avg_outcome: highSimilarityScenarios.reduce((sum, s) => {
            const outcomes = Object.values(s.outcomes);
            return sum + outcomes.reduce((outcomeSum: number, outcome: any) =>
              outcomeSum + (outcome.price_change || 0), 0) / outcomes.length;
          }, 0) / Math.max(highSimilarityScenarios.length, 1),
          confidence: Math.min(highSimilarityScenarios.length / scenarios.length * 2, 1.0)
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
  private async analyzeRegimeContext(query: MarketContextQuery, scenarios: SimilarScenario[]): Promise<any> {
    // Implementation would analyze market regime stability and transition probabilities
    const regimeCounts: Record<string, number> = {};
    let totalScenarios = 0;

    for (const scenario of scenarios) {
      const regime = scenario.historical_conditions?.market_regime;
      if (regime) {
        regimeCounts[regime] = (regimeCounts[regime] || 0) + 1;
        totalScenarios++;
      }
    }

    const currentRegime = query.current_conditions.market_regime;
    const regimeTransitionProbability: Record<string, number> = {};

    // Calculate transition probabilities from current regime
    for (const [regime, count] of Object.entries(regimeCounts)) {
      regimeTransitionProbability[regime] = totalScenarios > 0 ? count / totalScenarios : 0;
    }

    // Add current regime with some persistence probability
    regimeTransitionProbability[currentRegime] = (regimeTransitionProbability[currentRegime] || 0) + 0.3;

    // Normalize probabilities
    const totalProb = Object.values(regimeTransitionProbability).reduce((sum, prob) => sum + (prob || 0), 0);
    if (totalProb > 0) {
      for (const regime in regimeTransitionProbability) {
        regimeTransitionProbability[regime] = (regimeTransitionProbability[regime] || 0) / totalProb;
      }
    }

    return {
      current_regime_stability: Math.min(scenarios.length / 10, 1.0), // More scenarios = more stable assessment
      regime_transition_probability: regimeTransitionProbability,
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
    query: MarketContextQuery,
    scenarios: SimilarScenario[],
    patterns: any
  ): Promise<any> {
    if (scenarios.length === 0) {
      return {
        base_case_scenario: {
          probability: 0.5,
          expected_return: 0.0,
          risk_metrics: { value_at_risk_5: 0.0, max_drawdown: 0.0, sharpe_ratio: 0.0 }
        },
        alternative_scenarios: [],
        stress_test_results: []
      };
    }

    // Calculate base case from top scenarios
    const topScenarios = scenarios.slice(0, Math.min(5, scenarios.length));
    const avgReturn = topScenarios.reduce((sum, s) => {
      const outcomes = Object.values(s.outcomes);
      return sum + outcomes.reduce((outcomeSum: number, outcome: any) =>
        outcomeSum + (outcome.price_change || 0), 0) / outcomes.length;
    }, 0) / topScenarios.length;

    const avgVolatility = topScenarios.reduce((sum, s) => {
      const outcomes = Object.values(s.outcomes);
      return sum + outcomes.reduce((outcomeSum: number, outcome: any) =>
        outcomeSum + Math.abs(outcome.volatility_change || 0), 0) / outcomes.length;
    }, 0) / topScenarios.length;

    const maxDrawdown = Math.min(...topScenarios.map(s => {
      const outcomes = Object.values(s.outcomes);
      return Math.min(...outcomes.map((outcome: any) => outcome.max_drawdown || 0));
    }));

    return {
      base_case_scenario: {
        probability: Math.min(topScenarios.length / 10, 0.8),
        expected_return: avgReturn,
        risk_metrics: {
          value_at_risk_5: -avgVolatility * 1.96, // Approximation using normal distribution
          max_drawdown: maxDrawdown,
          sharpe_ratio: avgReturn / Math.max(avgVolatility, 0.001)
        }
      },
      alternative_scenarios: patterns.opportunity_indicators?.map((indicator: any) => ({
        scenario_name: indicator.indicator_name,
        probability: indicator.signal_strength,
        expected_return: avgReturn * indicator.success_rate,
        key_triggers: ['volume_breakout', 'sector_rotation', 'earnings_surprise']
      })) || [],
      stress_test_results: [
        {
          stress_scenario: 'market_correction',
          probability: 0.15,
          impact_severity: Math.abs(maxDrawdown) * 2,
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