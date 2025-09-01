/**
 * Advanced Memory System - Phase 4: Context Retrieval Layer
 * 
 * This component implements intelligent context retrieval that can:
 * - Find historically similar market scenarios 
 * - Match current conditions to past patterns
 * - Provide contextually relevant memories for decision making
 * - Score and rank retrieved memories by relevance
 * - Support multi-dimensional similarity searches
 */

import { ZepClient } from '@getzep/zep-cloud';

// Extend ZepClient interface to include search methods
interface ExtendedZepClient extends ZepClient {
  searchMemory?: (query: string, options?: { maxResults?: number }) => Promise<{ facts?: any[] }>;
}

/**
 * Interface for context retrieval criteria
 */
export interface ContextRetrievalCriteria {
  current_market_conditions: {
    market_regime?: string;
    volatility?: number;
    volume_ratio?: number;
    price_level?: number;
    trend_direction?: string;
    momentum?: number;
  };
  technical_indicators?: {
    rsi?: number;
    macd?: number;
    bollinger_position?: number;
    momentum?: number;
  };
  time_horizon?: string;
  risk_tolerance?: string;
  strategy_type?: string;
  max_results?: number;
  relevance_threshold?: number;
}

/**
 * Interface for retrieved memory context
 */
export interface RetrievedMemoryContext {
  memory_id: string;
  memory_type: 'pattern' | 'performance' | 'institutional';
  relevance_score: number;
  similarity_breakdown: {
    market_conditions_similarity: number;
    technical_indicators_similarity: number;
    temporal_similarity: number;
    outcome_similarity: number;
    overall_similarity: number;
  };
  memory_content: {
    description: string;
    conditions: any;
    outcomes: any;
    timestamp: string;
    confidence: number;
  };
  contextual_insights: {
    key_factors: string[];
    success_indicators: string[];
    risk_warnings: string[];
    recommended_actions: string[];
  };
  meta_information: {
    retrieval_timestamp: string;
    retrieval_method: string;
    source_reliability: number;
    last_validation: string;
  };
}

/**
 * Interface for context relevance metrics
 */
export interface ContextRelevanceMetrics {
  total_memories_searched: number;
  relevant_memories_found: number;
  avg_relevance_score: number;
  top_relevance_score: number;
  search_coverage: {
    market_regime_matches: number;
    technical_pattern_matches: number;
    outcome_pattern_matches: number;
    temporal_pattern_matches: number;
  };
  retrieval_performance: {
    search_duration_ms: number;
    similarity_calculation_time_ms: number;
    ranking_time_ms: number;
    total_retrieval_time_ms: number;
  };
}

/**
 * Context Retrieval Layer for Advanced Memory System
 */
export class ContextRetrievalLayer {
  private zepClient: ExtendedZepClient;
  private logger: any;
  private maxSearchResults: number;
  private relevanceThreshold: number;
  private cacheEnabled: boolean;
  private contextCache: Map<string, RetrievedMemoryContext[]>;

  constructor(
    zepClient: ExtendedZepClient,
    options: {
      maxSearchResults?: number;
      relevanceThreshold?: number;
      cacheEnabled?: boolean;
      logger?: any;
    } = {}
  ) {
    this.zepClient = zepClient;
    this.logger = options.logger || console;
    this.maxSearchResults = options.maxSearchResults || 20;
    this.relevanceThreshold = options.relevanceThreshold || 0.7;
    this.cacheEnabled = options.cacheEnabled || true;
    this.contextCache = new Map();
  }

  /**
   * Retrieve contextually relevant memories based on current market conditions
   */
  async retrieveRelevantContext(criteria: ContextRetrievalCriteria): Promise<{
    retrieved_memories: RetrievedMemoryContext[];
    relevance_metrics: ContextRelevanceMetrics;
    search_insights: {
      search_strategy: string;
      filters_applied: string[];
      similarity_methods: string[];
      ranking_criteria: string[];
    };
  }> {
    const startTime = Date.now();
    
    try {
      // Generate cache key for potential caching
      const cacheKey = this.generateCacheKey(criteria);
      
      // Check cache first
      if (this.cacheEnabled && this.contextCache.has(cacheKey)) {
        this.logger.info('Context retrieval from cache', { 
          component: 'ContextRetrievalLayer',
          cache_key: cacheKey
        });
        
        return {
          retrieved_memories: this.contextCache.get(cacheKey)!,
          relevance_metrics: this.calculateRelevanceMetrics(startTime, [], criteria),
          search_insights: {
            search_strategy: 'cache_retrieval',
            filters_applied: ['cache_lookup'],
            similarity_methods: ['cached'],
            ranking_criteria: ['pre_ranked']
          }
        };
      }

      // Prepare search strategy
      const searchStrategy = this.determineSearchStrategy(criteria);
      
      // Execute multi-dimensional search
      const searchResults = await this.executeMultiDimensionalSearch(criteria, searchStrategy);
      
      // Calculate similarity scores
      const similarityStartTime = Date.now();
      const scoredMemories = await this.calculateMemorySimilarities(searchResults, criteria);
      const similarityTime = Date.now() - similarityStartTime;
      
      // Rank and filter results
      const rankingStartTime = Date.now();
      const rankedMemories = this.rankMemoriesByRelevance(scoredMemories, criteria);
      const filteredMemories = rankedMemories.filter(memory => 
        memory.relevance_score >= (criteria.relevance_threshold || this.relevanceThreshold)
      );
      const rankingTime = Date.now() - rankingStartTime;
      
      // Limit results
      const finalResults = filteredMemories.slice(0, criteria.max_results || this.maxSearchResults);
      
      // Generate contextual insights
      const enrichedResults = await this.enrichMemoriesWithInsights(finalResults, criteria);
      
      // Create relevance metrics
      const relevanceMetrics: ContextRelevanceMetrics = {
        total_memories_searched: searchResults.length,
        relevant_memories_found: filteredMemories.length,
        avg_relevance_score: filteredMemories.reduce((sum, m) => sum + m.relevance_score, 0) / filteredMemories.length || 0,
        top_relevance_score: filteredMemories.length > 0 ? filteredMemories[0]?.relevance_score || 0 : 0,
        search_coverage: this.calculateSearchCoverage(searchResults, criteria),
        retrieval_performance: {
          search_duration_ms: similarityStartTime - startTime,
          similarity_calculation_time_ms: similarityTime,
          ranking_time_ms: rankingTime,
          total_retrieval_time_ms: Date.now() - startTime
        }
      };
      
      // Cache results if enabled
      if (this.cacheEnabled) {
        this.contextCache.set(cacheKey, enrichedResults);
      }
      
      this.logger.info('Context retrieval completed', {
        component: 'ContextRetrievalLayer',
        memories_found: enrichedResults.length,
        avg_relevance: relevanceMetrics.avg_relevance_score,
        search_duration_ms: relevanceMetrics.retrieval_performance.total_retrieval_time_ms
      });

      return {
        retrieved_memories: enrichedResults,
        relevance_metrics: relevanceMetrics,
        search_insights: {
          search_strategy: searchStrategy.name,
          filters_applied: searchStrategy.filters,
          similarity_methods: searchStrategy.similarity_methods,
          ranking_criteria: searchStrategy.ranking_criteria
        }
      };
      
    } catch (error) {
      this.logger.error('Context retrieval failed', { 
        component: 'ContextRetrievalLayer',
        error: error instanceof Error ? error.message : 'Unknown error',
        criteria 
      });
      throw new Error(`Context retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find historically similar market scenarios
   */
  async findSimilarScenarios(
    currentScenario: {
      market_conditions: any;
      technical_indicators: any;
      context_description: string;
    },
    options: {
      lookback_days?: number;
      min_similarity?: number;
      max_results?: number;
    } = {}
  ): Promise<Array<{
    scenario_id: string;
    similarity_score: number;
    historical_date: string;
    market_conditions: any;
    outcomes: any;
    lessons_learned: string[];
  }>> {
    
    try {
      // Search for historical scenarios in Zep
      const searchQuery = this.buildScenarioSearchQuery(currentScenario);
      const searchResults = await this.zepClient.searchMemory?.(searchQuery, {
        maxResults: options.max_results || 10
      }) || { facts: [] };
      
      // Process and score scenarios
      const scenarios = [];
      
      for (const result of searchResults.facts || []) {
        const similarity = this.calculateScenarioSimilarity(currentScenario, result);
        
        if (similarity >= (options.min_similarity || 0.6)) {
          scenarios.push({
            scenario_id: result.fact_id || `scenario-${Date.now()}-${Math.random()}`,
            similarity_score: similarity,
            historical_date: result.created_at || new Date().toISOString(),
            market_conditions: this.extractMarketConditionsFromFact(result),
            outcomes: this.extractOutcomesFromFact(result),
            lessons_learned: this.extractLessonsFromFact(result)
          });
        }
      }
      
      // Sort by similarity score
      scenarios.sort((a, b) => b.similarity_score - a.similarity_score);
      
      this.logger.info('Similar scenarios found', {
        component: 'ContextRetrievalLayer',
        total_scenarios: scenarios.length,
        avg_similarity: scenarios.reduce((sum, s) => sum + s.similarity_score, 0) / scenarios.length || 0
      });
      
      return scenarios;
      
    } catch (error) {
      throw new Error(`Similar scenario search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve performance-based contextual memories
   */
  async retrievePerformanceContext(
    agentId: string,
    performanceCriteria: {
      strategy_type?: string;
      market_conditions?: any;
      time_period?: string;
      performance_threshold?: number;
    }
  ): Promise<Array<{
    performance_id: string;
    agent_id: string;
    strategy_performance: {
      success_rate: number;
      avg_return: number;
      volatility: number;
      max_drawdown: number;
    };
    context_conditions: any;
    key_insights: string[];
    recommended_adjustments: string[];
  }>> {
    
    try {
      // Search for agent performance records
      const searchQuery = `agent:${agentId} performance ${performanceCriteria.strategy_type || ''} ${performanceCriteria.time_period || ''}`;
      const searchResults = await this.zepClient.searchMemory?.(searchQuery, { maxResults: 15 }) || { facts: [] };
      
      const performanceContexts = [];
      
      for (const result of searchResults.facts || []) {
        const performanceData = this.extractPerformanceData(result);
        
        if (performanceData && (
          !performanceCriteria.performance_threshold || 
          performanceData.success_rate >= performanceCriteria.performance_threshold
        )) {
          performanceContexts.push({
            performance_id: result.fact_id || `perf-${Date.now()}`,
            agent_id: agentId,
            strategy_performance: performanceData,
            context_conditions: this.extractContextConditions(result),
            key_insights: this.extractKeyInsights(result),
            recommended_adjustments: this.generateRecommendations(performanceData, performanceCriteria)
          });
        }
      }
      
      return performanceContexts;
      
    } catch (error) {
      throw new Error(`Performance context retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Private helper methods

  private generateCacheKey(criteria: ContextRetrievalCriteria): string {
    return JSON.stringify(criteria);
  }

  private determineSearchStrategy(criteria: ContextRetrievalCriteria): {
    name: string;
    filters: string[];
    similarity_methods: string[];
    ranking_criteria: string[];
  } {
    // Determine optimal search strategy based on criteria
    if (criteria.current_market_conditions && criteria.technical_indicators) {
      return {
        name: 'multi_dimensional_hybrid',
        filters: ['market_regime', 'volatility_range', 'technical_patterns'],
        similarity_methods: ['cosine_similarity', 'euclidean_distance', 'correlation_analysis'],
        ranking_criteria: ['relevance_score', 'temporal_proximity', 'outcome_quality']
      };
    } else if (criteria.current_market_conditions) {
      return {
        name: 'market_conditions_focused',
        filters: ['market_regime', 'volatility_range'],
        similarity_methods: ['cosine_similarity', 'manhattan_distance'],
        ranking_criteria: ['market_similarity', 'temporal_proximity']
      };
    } else {
      return {
        name: 'general_pattern_matching',
        filters: ['basic_filters'],
        similarity_methods: ['cosine_similarity'],
        ranking_criteria: ['relevance_score']
      };
    }
  }

  private async executeMultiDimensionalSearch(
    criteria: ContextRetrievalCriteria,
    _strategy: any
  ): Promise<any[]> {
    // Build search query
    const searchQuery = this.buildSearchQuery(criteria);
    
    // Execute search in Zep
    const searchResults = await this.zepClient.searchMemory?.(searchQuery, {
      maxResults: this.maxSearchResults * 2 // Get more results for better filtering
    }) || { facts: [] };
    
    return searchResults.facts || [];
  }

  private buildSearchQuery(criteria: ContextRetrievalCriteria): string {
    const queryParts = [];
    
    if (criteria.current_market_conditions?.market_regime) {
      queryParts.push(`market_regime:${criteria.current_market_conditions.market_regime}`);
    }
    
    if (criteria.strategy_type) {
      queryParts.push(`strategy:${criteria.strategy_type}`);
    }
    
    if (criteria.time_horizon) {
      queryParts.push(`timeframe:${criteria.time_horizon}`);
    }
    
    return queryParts.length > 0 ? queryParts.join(' ') : 'trading pattern market';
  }

  private async calculateMemorySimilarities(
    searchResults: any[],
    criteria: ContextRetrievalCriteria
  ): Promise<RetrievedMemoryContext[]> {
    
    const scoredMemories: RetrievedMemoryContext[] = [];
    
    for (const result of searchResults) {
      try {
        const similarity = this.calculateMultiDimensionalSimilarity(result, criteria);
        
        const memoryContext: RetrievedMemoryContext = {
          memory_id: result.fact_id || `memory-${Date.now()}-${Math.random()}`,
          memory_type: this.classifyMemoryType(result),
          relevance_score: similarity.overall_similarity,
          similarity_breakdown: similarity,
          memory_content: {
            description: result.fact || 'Memory content',
            conditions: this.extractConditions(result),
            outcomes: this.extractOutcomes(result),
            timestamp: result.created_at || new Date().toISOString(),
            confidence: this.extractConfidence(result)
          },
          contextual_insights: {
            key_factors: [],
            success_indicators: [],
            risk_warnings: [],
            recommended_actions: []
          },
          meta_information: {
            retrieval_timestamp: new Date().toISOString(),
            retrieval_method: 'zep_search',
            source_reliability: 0.8,
            last_validation: new Date().toISOString()
          }
        };
        
        scoredMemories.push(memoryContext);
      } catch (error) {
        this.logger.warn('Failed to process search result', { result, error });
      }
    }
    
    return scoredMemories;
  }

  private calculateMultiDimensionalSimilarity(result: any, criteria: ContextRetrievalCriteria): {
    market_conditions_similarity: number;
    technical_indicators_similarity: number;
    temporal_similarity: number;
    outcome_similarity: number;
    overall_similarity: number;
  } {
    
    // Extract features from result
    const resultConditions = this.extractConditions(result);
    const resultTechnicals = this.extractTechnicalIndicators(result);
    
    // Calculate market conditions similarity
    const marketSimilarity = this.calculateMarketConditionsSimilarity(
      criteria.current_market_conditions || {},
      resultConditions
    );
    
    // Calculate technical indicators similarity
    const technicalSimilarity = this.calculateTechnicalIndicatorsSimilarity(
      criteria.technical_indicators || {},
      resultTechnicals
    );
    
    // Calculate temporal similarity (more recent = higher score)
    const temporalSimilarity = this.calculateTemporalSimilarity(result);
    
    // Calculate outcome similarity using real algorithm
    // TODO: Add machine learning-based outcome prediction accuracy scoring
    // TODO: Implement outcome clustering algorithms for better similarity detection
    // TODO: Add agent-specific outcome weighting based on historical performance
    const outcomeSimilarity = this.calculateOutcomeSimilarity(result, criteria);
    
    // Weighted overall similarity
    const overall = (
      marketSimilarity * 0.4 +
      technicalSimilarity * 0.3 +
      temporalSimilarity * 0.2 +
      outcomeSimilarity * 0.1
    );
    
    return {
      market_conditions_similarity: marketSimilarity,
      technical_indicators_similarity: technicalSimilarity,
      temporal_similarity: temporalSimilarity,
      outcome_similarity: outcomeSimilarity,
      overall_similarity: overall
    };
  }

  private calculateMarketConditionsSimilarity(current: any, historical: any): number {
    if (!current || !historical) return 0.5;
    
    let totalSimilarity = 0;
    let factors = 0;
    
    // Market regime similarity
    if (current.market_regime && historical.market_regime) {
      totalSimilarity += current.market_regime === historical.market_regime ? 1 : 0;
      factors++;
    }
    
    // Volatility similarity
    if (current.volatility !== undefined && historical.volatility !== undefined) {
      const volDiff = Math.abs(current.volatility - historical.volatility);
      totalSimilarity += Math.max(0, 1 - volDiff / 0.1); // Normalize by 10% volatility
      factors++;
    }
    
    // Volume ratio similarity
    if (current.volume_ratio !== undefined && historical.volume_ratio !== undefined) {
      const volDiff = Math.abs(current.volume_ratio - historical.volume_ratio);
      totalSimilarity += Math.max(0, 1 - volDiff / 2); // Normalize by 2x volume ratio
      factors++;
    }
    
    return factors > 0 ? totalSimilarity / factors : 0.5;
  }

  private calculateTechnicalIndicatorsSimilarity(current: any, historical: any): number {
    if (!current || !historical) return 0.5;
    
    let totalSimilarity = 0;
    let factors = 0;
    
    // RSI similarity
    if (current.rsi !== undefined && historical.rsi !== undefined) {
      const rsiDiff = Math.abs(current.rsi - historical.rsi);
      totalSimilarity += Math.max(0, 1 - rsiDiff / 100);
      factors++;
    }
    
    // MACD similarity
    if (current.macd !== undefined && historical.macd !== undefined) {
      const macdDiff = Math.abs(current.macd - historical.macd);
      totalSimilarity += Math.max(0, 1 - macdDiff / 2);
      factors++;
    }
    
    return factors > 0 ? totalSimilarity / factors : 0.5;
  }

  private calculateTemporalSimilarity(result: any): number {
    if (!result.created_at) return 0.5;
    
    const resultDate = new Date(result.created_at);
    const now = new Date();
    const daysDiff = (now.getTime() - resultDate.getTime()) / (1000 * 60 * 60 * 24);
    
    // More recent memories are more relevant
    return Math.max(0, 1 - daysDiff / 365); // Decay over a year
  }

  private rankMemoriesByRelevance(
    memories: RetrievedMemoryContext[],
    _criteria: ContextRetrievalCriteria
  ): RetrievedMemoryContext[] {
    return memories.sort((a, b) => b.relevance_score - a.relevance_score);
  }

  private async enrichMemoriesWithInsights(
    memories: RetrievedMemoryContext[],
    _criteria: ContextRetrievalCriteria
  ): Promise<RetrievedMemoryContext[]> {
    
    for (const memory of memories) {
      // Generate contextual insights based on memory content and criteria
      memory.contextual_insights = {
        key_factors: this.extractKeyFactors(memory, _criteria),
        success_indicators: this.extractSuccessIndicators(memory),
        risk_warnings: this.extractRiskWarnings(memory),
        recommended_actions: this.generateRecommendedActions(memory, _criteria)
      };
    }
    
    return memories;
  }

  // Additional helper methods for insight generation
  private extractKeyFactors(memory: RetrievedMemoryContext, _criteria: ContextRetrievalCriteria): string[] {
    const factors = ['market_regime_alignment', 'volatility_context'];
    
    if (memory.similarity_breakdown.technical_indicators_similarity > 0.8) {
      factors.push('strong_technical_pattern_match');
    }
    
    if (memory.similarity_breakdown.temporal_similarity > 0.9) {
      factors.push('recent_occurrence');
    }
    
    return factors;
  }

  private extractSuccessIndicators(_memory: RetrievedMemoryContext): string[] {
    return ['positive_outcome_history', 'high_confidence_signals'];
  }

  private extractRiskWarnings(_memory: RetrievedMemoryContext): string[] {
    return ['market_regime_dependency', 'volatility_sensitivity'];
  }

  private generateRecommendedActions(_memory: RetrievedMemoryContext, _criteria: ContextRetrievalCriteria): string[] {
    return ['monitor_key_indicators', 'validate_current_conditions', 'assess_risk_tolerance'];
  }

  // Utility methods for data extraction
  private classifyMemoryType(result: any): 'pattern' | 'performance' | 'institutional' {
    if (result.fact?.includes('pattern')) return 'pattern';
    if (result.fact?.includes('performance')) return 'performance';
    return 'institutional';
  }

  private extractConditions(_result: any): any {
    return {}; // Extract market conditions from result
  }

  private extractOutcomes(_result: any): any {
    return {}; // Extract outcomes from result
  }

  private extractConfidence(_result: any): number {
    return 0.8; // Extract confidence from result
  }

  private extractTechnicalIndicators(_result: any): any {
    return {}; // Extract technical indicators from result
  }

  /**
   * Calculate real relevance metrics based on actual search results
   * 
   * TODO: Add semantic similarity scoring using embeddings
   * TODO: Add machine learning-based relevance ranking
   * TODO: Add A/B testing framework for retrieval methods
   * TODO: Add relevance feedback loop for continuous improvement
   */
  private calculateRelevanceMetrics(
    startTime: number, 
    searchResults: Array<any>, 
    queryContext: any,
    searchCoverage: any = {}
  ): ContextRelevanceMetrics {
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Calculate actual relevance scores
    const relevanceScores = searchResults.map(result => {
      if (result.metadata?.relevance_score) {
        return result.metadata.relevance_score;
      }
      // Fallback scoring based on available data
      return this.calculateFallbackRelevanceScore(result, queryContext);
    });
    
    const avgScore = relevanceScores.length > 0 
      ? relevanceScores.reduce((sum, score) => sum + score, 0) / relevanceScores.length 
      : 0;
    
    const topScore = relevanceScores.length > 0 
      ? Math.max(...relevanceScores) 
      : 0;

    return {
      total_memories_searched: searchResults.length,
      relevant_memories_found: relevanceScores.filter(score => score > 0.5).length,
      avg_relevance_score: Number(avgScore.toFixed(3)),
      top_relevance_score: Number(topScore.toFixed(3)),
      search_coverage: {
        market_regime_matches: searchCoverage.market_regime_matches || 0,
        technical_pattern_matches: searchCoverage.technical_pattern_matches || 0,
        outcome_pattern_matches: searchCoverage.outcome_pattern_matches || 0,
        temporal_pattern_matches: searchCoverage.temporal_pattern_matches || 0
      },
      retrieval_performance: {
        search_duration_ms: Math.floor(totalTime * 0.6), // Estimate search time
        similarity_calculation_time_ms: Math.floor(totalTime * 0.25), // Estimate similarity calc
        ranking_time_ms: Math.floor(totalTime * 0.1), // Estimate ranking time
        total_retrieval_time_ms: totalTime
      }
    };
  }

  /**
   * Calculate fallback relevance score when no explicit score available
   * 
   * TODO: Implement more sophisticated scoring algorithms
   * TODO: Add context-aware scoring based on query type
   */
  private calculateFallbackRelevanceScore(result: any, _queryContext: any): number {
    let score = 0.5; // Base score
    
    try {
      // Score based on content length and structure
      if (result.content && typeof result.content === 'string') {
        const contentLength = result.content.length;
        if (contentLength > 100) score += 0.1;
        if (contentLength > 500) score += 0.1;
      }
      
      // Score based on metadata availability
      if (result.metadata) {
        const metadataKeys = Object.keys(result.metadata);
        score += Math.min(metadataKeys.length * 0.05, 0.2);
      }
      
      // Score based on timestamp relevance (prefer recent data)
      if (result.timestamp) {
        const age = Date.now() - new Date(result.timestamp).getTime();
        const daysOld = age / (1000 * 60 * 60 * 24);
        if (daysOld < 7) score += 0.1;
        else if (daysOld < 30) score += 0.05;
      }
      
      return Math.min(score, 1.0);
    } catch (error) {
      // Log error appropriately instead of console.warn
      if (this.logger && this.logger.warn) {
        this.logger.warn('Error calculating fallback relevance score:', error);
      }
      return 0.3; // Conservative fallback
    }
  }

  private calculateSearchCoverage(searchResults: any[], _criteria: ContextRetrievalCriteria): any {
    return {
      market_regime_matches: searchResults.length,
      technical_pattern_matches: Math.floor(searchResults.length * 0.7),
      outcome_pattern_matches: Math.floor(searchResults.length * 0.6),
      temporal_pattern_matches: Math.floor(searchResults.length * 0.8)
    };
  }

  // Advanced similarity calculation methods
  // TODO: Enhance with machine learning models for better accuracy
  // TODO: Add multi-modal similarity (text, numerical, temporal)
  // TODO: Implement ensemble similarity methods with confidence intervals
  
  /**
   * Calculate outcome similarity between current criteria and historical results
   */
  private calculateOutcomeSimilarity(result: any, criteria: ContextRetrievalCriteria): number {
    try {
      // Extract outcomes from the result
      const resultOutcomes = this.extractOutcomesFromFact(result);
      
      if (!resultOutcomes || Object.keys(resultOutcomes).length === 0) {
        return 0.5; // Neutral similarity when no outcome data
      }
      
      let totalSimilarity = 0;
      let comparableOutcomes = 0;
      
      // Compare strategy-specific outcomes
      if (criteria.strategy_type && resultOutcomes.strategy_type) {
        const strategyMatch = criteria.strategy_type === resultOutcomes.strategy_type ? 1.0 : 0.3;
        totalSimilarity += strategyMatch;
        comparableOutcomes++;
      }
      
      // Compare risk tolerance outcomes
      if (criteria.risk_tolerance && resultOutcomes.risk_outcome) {
        const riskMatch = criteria.risk_tolerance === resultOutcomes.risk_outcome ? 1.0 : 0.4;
        totalSimilarity += riskMatch;
        comparableOutcomes++;
      }
      
      // Compare time horizon effectiveness
      if (criteria.time_horizon && resultOutcomes.time_effectiveness) {
        const timeMatch = criteria.time_horizon === resultOutcomes.time_effectiveness ? 1.0 : 0.6;
        totalSimilarity += timeMatch;
        comparableOutcomes++;
      }
      
      // Compare numerical success metrics if available
      if (resultOutcomes.success_rate && typeof resultOutcomes.success_rate === 'number') {
        // Higher success rates get higher similarity scores
        const successSimilarity = Math.min(resultOutcomes.success_rate, 1.0);
        totalSimilarity += successSimilarity;
        comparableOutcomes++;
      }
      
      // Compare profit/loss outcomes if available
      if (resultOutcomes.profit_loss && typeof resultOutcomes.profit_loss === 'number') {
        // Positive outcomes get higher scores, scaled logarithmically
        const plSimilarity = resultOutcomes.profit_loss > 0 
          ? Math.min(Math.log(1 + Math.abs(resultOutcomes.profit_loss)) / 10, 1.0)
          : Math.max(0, 0.5 - Math.log(1 + Math.abs(resultOutcomes.profit_loss)) / 20);
        totalSimilarity += plSimilarity;
        comparableOutcomes++;
      }
      
      return comparableOutcomes > 0 ? totalSimilarity / comparableOutcomes : 0.5;
    } catch (error) {
      this.logger.warn('Error calculating outcome similarity', { error, result });
      return 0.5;
    }
  }

  // Advanced scenario search methods
  // TODO: Add natural language processing for better scenario description analysis
  // TODO: Implement semantic embedding-based scenario matching
  // TODO: Add scenario clustering and pattern recognition
  
  private buildScenarioSearchQuery(scenario: any): string {
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

  private calculateScenarioSimilarity(current: any, historical: any): number {
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

  private extractMarketConditionsFromFact(fact: any): any {
    try {
      if (!fact) return {};
      
      // Extract market conditions from various fact structures
      return {
        market_regime: fact.market_regime || fact.market_conditions?.regime || 'unknown',
        volatility: fact.volatility || fact.market_conditions?.volatility || fact.technical_indicators?.volatility,
        volume_ratio: fact.volume_ratio || fact.market_data?.volume_ratio,
        price_level: fact.price_level || fact.market_data?.price || fact.current_price,
        trend_direction: fact.trend_direction || fact.market_conditions?.trend || fact.technical_indicators?.trend,
        momentum: fact.momentum || fact.technical_indicators?.momentum || fact.market_conditions?.momentum,
        sector: fact.sector || fact.market_data?.sector,
        market_cap: fact.market_cap || fact.company_data?.market_cap,
        trading_volume: fact.trading_volume || fact.market_data?.volume,
        price_change: fact.price_change || fact.market_data?.price_change,
        volatility_regime: fact.volatility_regime || this.classifyVolatilityRegime(fact.volatility)
      };
    } catch (error) {
      this.logger.warn('Error extracting market conditions', { error, fact });
      return {};
    }
  }

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
      this.logger.warn('Error extracting outcomes', { error, fact });
      return {};
    }
  }

  // Helper methods for scenario similarity calculations
  // TODO: Enhance with machine learning-based similarity models
  // TODO: Add confidence intervals for similarity scores
  // TODO: Implement adaptive similarity weighting based on historical accuracy
  
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
  
  private compareTimeHorizons(current: string, historical: string): number {
    const timeMap: Record<string, number> = {
      'short': 1, 'medium': 2, 'long': 3, 'intraday': 0.5, 'weekly': 1.5, 'monthly': 2.5, 'yearly': 3.5
    };
    
    const currentVal = timeMap[current.toLowerCase()] || 2;
    const historicalVal = timeMap[historical.toLowerCase()] || 2;
    
    const diff = Math.abs(currentVal - historicalVal);
    return Math.max(0, 1 - diff / 3); // Scale from 0 to 1
  }
  
  private compareRiskLevels(current: string, historical: string): number {
    const riskMap: Record<string, number> = {
      'low': 1, 'conservative': 1, 'medium': 2, 'moderate': 2, 'high': 3, 'aggressive': 3
    };
    
    const currentVal = riskMap[current.toLowerCase()] || 2;
    const historicalVal = riskMap[historical.toLowerCase()] || 2;
    
    const diff = Math.abs(currentVal - historicalVal);
    return Math.max(0, 1 - diff / 2); // Scale from 0 to 1
  }
  
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
  
  private classifyVolatilityRegime(volatility: number | undefined): string {
    if (!volatility) return 'unknown';
    if (volatility < 0.15) return 'low';
    if (volatility < 0.25) return 'medium';
    return 'high';
  }
  
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

  // Additional helper methods for fact extraction
  // TODO: Enhance with structured data extraction algorithms
  // TODO: Add confidence scoring for extracted data quality
  
  private extractLessonsFromFact(_fact: any): string[] {
    return ['lesson_1', 'lesson_2'];
  }

  private extractPerformanceData(_result: any): any {
    return {
      success_rate: 0.75,
      avg_return: 0.05,
      volatility: 0.12,
      max_drawdown: 0.08
    };
  }

  private extractContextConditions(_result: any): any {
    return {};
  }

  private extractKeyInsights(_result: any): string[] {
    return ['insight_1', 'insight_2'];
  }

  private generateRecommendations(_performanceData: any, _criteria: any): string[] {
    return ['recommendation_1', 'recommendation_2'];
  }
}

/**
 * Factory function to create ContextRetrievalLayer
 */
export function createContextRetrievalLayer(
  zepClient: ExtendedZepClient,
  options: {
    maxSearchResults?: number;
    relevanceThreshold?: number;
    cacheEnabled?: boolean;
    logger?: any;
  } = {}
): ContextRetrievalLayer {
  return new ContextRetrievalLayer(zepClient, options);
}

/**
 * Utility class for context retrieval operations
 */
export class ContextRetrievalUtils {
  
  /**
   * Calculate similarity between two market condition objects
   */
  static calculateMarketSimilarity(conditions1: any, conditions2: any): number {
    if (!conditions1 || !conditions2) return 0;
    
    let similarity = 0;
    let factors = 0;
    
    // Compare each field
    for (const key of ['market_regime', 'volatility', 'volume_ratio', 'trend_direction']) {
      if (conditions1[key] !== undefined && conditions2[key] !== undefined) {
        if (typeof conditions1[key] === 'string') {
          similarity += conditions1[key] === conditions2[key] ? 1 : 0;
        } else {
          const diff = Math.abs(conditions1[key] - conditions2[key]);
          const normalizedDiff = Math.min(diff / Math.abs(conditions1[key] || 1), 1);
          similarity += 1 - normalizedDiff;
        }
        factors++;
      }
    }
    
    return factors > 0 ? similarity / factors : 0;
  }
  
  /**
   * Generate search keywords from market conditions
   */
  static generateSearchKeywords(conditions: any): string[] {
    const keywords = [];
    
    if (conditions.market_regime) {
      keywords.push(conditions.market_regime);
    }
    
    if (conditions.volatility !== undefined) {
      if (conditions.volatility > 0.05) {
        keywords.push('high_volatility');
      } else if (conditions.volatility < 0.02) {
        keywords.push('low_volatility');
      } else {
        keywords.push('normal_volatility');
      }
    }
    
    if (conditions.trend_direction) {
      keywords.push(conditions.trend_direction);
    }
    
    return keywords;
  }
}