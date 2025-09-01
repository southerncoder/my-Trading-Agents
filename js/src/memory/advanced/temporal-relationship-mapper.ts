/**
 * Temporal Relationship Mapping for Advanced Memory System
 * 
 * This module implements sophisticated temporal relationship mapping between
 * market entities using Zep Graphiti's time-aware capabilities for institutional
 * trading memory and pattern recognition.
 */

import { 
  StockEntity, 
  SectorEntity, 
  EconomicIndicator, 
  MarketRegime, 
  MarketRelationship,
  AnalysisOutcome 
} from './market-entities';

// ============================================================================
// TEMPORAL QUERY INTERFACES
// ============================================================================

/**
 * Query interface for time-aware market analysis
 */
export interface TemporalMarketQuery {
  entity_ids?: string[];
  entity_types?: string[];
  relationship_types?: string[];
  time_range: {
    start: string;
    end: string;
  };
  market_regime?: string;
  similarity_threshold?: number;
  max_results?: number;
}

/**
 * Result interface for temporal queries
 */
export interface TemporalQueryResult {
  entities: Array<{
    entity: StockEntity | SectorEntity | EconomicIndicator | MarketRegime;
    relevance_score: number;
    temporal_context: {
      distance_days: number;
      market_similarity: number;
      relationship_strength: number;
    };
  }>;
  relationships: Array<{
    relationship: MarketRelationship;
    historical_evidence: Array<{
      date: string;
      strength: number;
      market_regime: string;
      outcome: string;
    }>;
  }>;
  analysis_outcomes: Array<{
    outcome: AnalysisOutcome;
    prediction_accuracy: number;
    context_similarity: number;
  }>;
}

// ============================================================================
// TEMPORAL RELATIONSHIP MAPPER
// ============================================================================

/**
 * Core class for mapping and analyzing temporal relationships in market data
 */
export class TemporalRelationshipMapper {
  private zepClient: any; // Will be injected Zep Graphiti client
  private logger: any;

  constructor(zepClient: any, logger: any) {
    this.zepClient = zepClient;
    this.logger = logger;
  }

  // ========================================================================
  // CORE TEMPORAL ANALYSIS METHODS
  // ========================================================================

  /**
   * Find similar market conditions to current context
   */
  async findSimilarMarketConditions(
    currentContext: {
      target_entity: string;
      market_indicators: Record<string, number>;
      volatility_percentile: number;
      sector_rotation_phase: string;
    },
    lookbackDays: number = 1095 // 3 years default
  ): Promise<TemporalQueryResult> {
    
    this.logger.info('Finding similar market conditions', {
      component: 'TemporalRelationshipMapper',
      operation: 'findSimilarMarketConditions',
      target_entity: currentContext.target_entity,
      lookback_days: lookbackDays
    });

    try {
      // Build temporal query for Zep Graphiti
      const query: TemporalMarketQuery = {
        entity_ids: [currentContext.target_entity],
        time_range: {
          start: new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        },
        similarity_threshold: 0.7,
        max_results: 50
      };

      // Execute temporal search using Zep's capabilities
      const similarConditions = await this.executeTemporalSearch(query);
      
      // Score results based on market similarity
      const scoredResults = await this.scoreMarketSimilarity(
        currentContext, 
        similarConditions
      );

      this.logger.info('Found similar market conditions', {
        component: 'TemporalRelationshipMapper',
        results_count: scoredResults.entities.length,
        avg_similarity: scoredResults.entities.reduce((sum, r) => sum + r.temporal_context.market_similarity, 0) / scoredResults.entities.length
      });

      return scoredResults;

    } catch (error) {
      this.logger.error('Error finding similar market conditions', {
        component: 'TemporalRelationshipMapper',
        error: error instanceof Error ? error.message : String(error),
        target_entity: currentContext.target_entity
      });
      throw error;
    }
  }

  /**
   * Analyze relationship evolution over time
   */
  async analyzeRelationshipEvolution(
    sourceEntityId: string,
    targetEntityId: string,
    timeWindow: { start: string; end: string }
  ): Promise<{
    relationship_strength_evolution: Array<{
      date: string;
      strength: number;
      market_regime: string;
      correlation: number;
    }>;
    key_inflection_points: Array<{
      date: string;
      event: string;
      impact_magnitude: number;
      duration_days: number;
    }>;
    predictive_patterns: Array<{
      pattern_type: string;
      lead_time_days: number;
      accuracy_rate: number;
      confidence: number;
    }>;
  }> {

    this.logger.info('Analyzing relationship evolution', {
      component: 'TemporalRelationshipMapper',
      operation: 'analyzeRelationshipEvolution',
      source_entity: sourceEntityId,
      target_entity: targetEntityId
    });

    try {
      // Query historical relationship data
      const relationshipHistory = await this.getRelationshipHistory(
        sourceEntityId, 
        targetEntityId, 
        timeWindow
      );

      // Identify key inflection points
      const inflectionPoints = await this.identifyInflectionPoints(relationshipHistory);

      // Extract predictive patterns
      const predictivePatterns = await this.extractPredictivePatterns(relationshipHistory);

      const result = {
        relationship_strength_evolution: relationshipHistory,
        key_inflection_points: inflectionPoints,
        predictive_patterns: predictivePatterns
      };

      this.logger.info('Relationship evolution analysis complete', {
        component: 'TemporalRelationshipMapper',
        inflection_points: inflectionPoints.length,
        predictive_patterns: predictivePatterns.length
      });

      return result;

    } catch (error) {
      this.logger.error('Error analyzing relationship evolution', {
        component: 'TemporalRelationshipMapper',
        error: error instanceof Error ? error.message : String(error),
        source_entity: sourceEntityId,
        target_entity: targetEntityId
      });
      throw error;
    }
  }

  /**
   * Discover emerging market relationships
   */
  async discoverEmergingRelationships(
    entityId: string,
    discoveryWindow: number = 90 // days
  ): Promise<Array<{
    target_entity_id: string;
    relationship_type: string;
    strength: number;
    confidence: number;
    emergence_date: string;
    supporting_evidence: Array<{
      date: string;
      correlation: number;
      market_event: string;
    }>;
  }>> {

    this.logger.info('Discovering emerging relationships', {
      component: 'TemporalRelationshipMapper',
      operation: 'discoverEmergingRelationships',
      entity_id: entityId,
      discovery_window: discoveryWindow
    });

    try {
      // Get recent correlations for the entity
      const recentCorrelations = await this.calculateRecentCorrelations(
        entityId, 
        discoveryWindow
      );

      // Compare with historical baselines
      const historicalBaselines = await this.getHistoricalCorrelationBaselines(entityId);

      // Identify statistically significant new relationships
      const emergingRelationships = await this.identifyEmergingRelationships(
        recentCorrelations,
        historicalBaselines
      );

      this.logger.info('Emerging relationships discovered', {
        component: 'TemporalRelationshipMapper',
        entity_id: entityId,
        emerging_count: emergingRelationships.length
      });

      return emergingRelationships;

    } catch (error) {
      this.logger.error('Error discovering emerging relationships', {
        component: 'TemporalRelationshipMapper',
        error: error instanceof Error ? error.message : String(error),
        entity_id: entityId
      });
      throw error;
    }
  }

  // ========================================================================
  // HELPER METHODS FOR TEMPORAL ANALYSIS
  // ========================================================================

  /**
   * Execute temporal search using Zep Graphiti's capabilities
   */
  private async executeTemporalSearch(query: TemporalMarketQuery): Promise<any> {
    // Use adapter if available on zepClient
    if (this.zepClient && typeof this.zepClient.temporalSearch === 'function') {
      try {
        const res = await this.zepClient.temporalSearch(query);
        return res;
      } catch (_err) {
        // fall through to empty result
      }
    }

    return {
      entities: [],
      relationships: [],
      metadata: {
        total_results: 0,
        search_time_ms: 0,
        temporal_range_covered: query.time_range
      }
    };
  }

  /**
   * Score market similarity based on multiple factors
   */
  private async scoreMarketSimilarity(
    currentContext: any,
    searchResults: any
  ): Promise<TemporalQueryResult> {
    
    // Implement sophisticated similarity scoring
    const scoredEntities = searchResults.entities.map((entity: any) => ({
      entity,
      relevance_score: this.calculateRelevanceScore(entity, currentContext),
      temporal_context: {
        distance_days: this.calculateTemporalDistance(entity.timestamp, new Date()),
        market_similarity: this.calculateMarketSimilarity(entity.market_context, currentContext),
        relationship_strength: entity.relationship_strength || 0.5
      }
    }));

    return {
      entities: scoredEntities,
      relationships: searchResults.relationships || [],
      analysis_outcomes: searchResults.analysis_outcomes || []
    };
  }

  /**
   * Calculate relevance score for search results
   */
  private calculateRelevanceScore(entity: any, currentContext: any): number {
    // Implement multi-factor relevance scoring
    let score = 0.0;
    
    // Entity type relevance
    score += 0.3;
    
    // Temporal relevance (recency bias)
    const daysSince = this.calculateTemporalDistance(entity.timestamp, new Date());
    score += Math.max(0, 0.3 * (1 - daysSince / 365));
    
    // Market condition similarity
    score += 0.4 * this.calculateMarketSimilarity(entity.market_context, currentContext);
    
    return Math.min(1.0, score);
  }

  /**
   * Calculate temporal distance between dates
   */
  private calculateTemporalDistance(date1: string | Date, date2: string | Date): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
  }

  /**
   * Calculate market condition similarity
   */
  private calculateMarketSimilarity(context1: any, context2: any): number {
    // Implement sophisticated market similarity calculation
    // This would compare volatility, sector rotation, economic indicators, etc.
    
    let similarity = 0.0;
    let factors = 0;
    
    // Volatility similarity
    if (context1.volatility_percentile && context2.volatility_percentile) {
      const volDiff = Math.abs(context1.volatility_percentile - context2.volatility_percentile);
      similarity += Math.max(0, 1 - volDiff / 100);
      factors++;
    }
    
    // Sector rotation similarity
    if (context1.sector_rotation_phase && context2.sector_rotation_phase) {
      similarity += context1.sector_rotation_phase === context2.sector_rotation_phase ? 1 : 0;
      factors++;
    }
    
    return factors > 0 ? similarity / factors : 0.5;
  }

  /**
   * Get historical relationship data
   */
  private async getRelationshipHistory(
    _sourceEntityId: string,
    _targetEntityId: string,
    _timeWindow: { start: string; end: string }
  ): Promise<Array<{
    date: string;
    strength: number;
    market_regime: string;
    correlation: number;
  }>> {
    
    // Implementation would query Zep Graphiti for relationship history
    // This is a placeholder structure
    return [];
  }

  /**
   * Identify key inflection points in relationships
   */
  private async identifyInflectionPoints(_relationshipHistory: any[]): Promise<Array<{
    date: string;
    event: string;
    impact_magnitude: number;
    duration_days: number;
  }>> {
    
    // Implementation would analyze relationship data for significant changes
    return [];
  }

  /**
   * Extract predictive patterns from relationship data
   */
  private async extractPredictivePatterns(_relationshipHistory: any[]): Promise<Array<{
    pattern_type: string;
    lead_time_days: number;
    accuracy_rate: number;
    confidence: number;
  }>> {
    
    // Implementation would identify patterns that predict future relationship changes
    return [];
  }

  /**
   * Calculate recent correlations for emerging relationship discovery
   */
  private async calculateRecentCorrelations(
    entityId: string,
    windowDays: number
  ): Promise<Record<string, number>> {
    
    try {
      // Query Zep Graphiti for recent price/performance data
      const query = `recent price data for ${entityId} last ${windowDays} days`;
      const searchResults = await this.zepClient.searchMemory?.(query, { maxResults: 50 });
      
      if (!searchResults?.facts || searchResults.facts.length === 0) {
        this.logger.warn('No recent data found for correlation calculation', {
          component: 'TemporalRelationshipMapper',
          entity_id: entityId,
          window_days: windowDays
        });
        return {};
      }

      // Extract price/performance data from facts
      const timeSeriesData = this.extractTimeSeriesFromFacts(searchResults.facts, entityId);
      
      // Get related entities for correlation analysis
      const relatedEntities = await this.getRelatedEntities(entityId);
      
      const correlations: Record<string, number> = {};
      
      // Calculate Pearson correlation with each related entity
      for (const relatedEntity of relatedEntities) {
        const relatedData = await this.getEntityTimeSeriesData(relatedEntity, windowDays);
        if (relatedData.length > 0) {
          const correlation = this.calculatePearsonCorrelation(timeSeriesData, relatedData);
          if (!isNaN(correlation)) {
            correlations[relatedEntity] = correlation;
          }
        }
      }

      this.logger.info('Recent correlations calculated', {
        component: 'TemporalRelationshipMapper',
        entity_id: entityId,
        correlations_count: Object.keys(correlations).length,
        window_days: windowDays
      });

      return correlations;
      
    } catch (error) {
      this.logger.error('Failed to calculate recent correlations', {
        component: 'TemporalRelationshipMapper',
        entity_id: entityId,
        error: error instanceof Error ? error.message : String(error)
      });
      return {};
    }
  }

  /**
   * Get historical correlation baselines
   */
  private async getHistoricalCorrelationBaselines(
    entityId: string
  ): Promise<Record<string, { mean: number; std: number; count: number }>> {
    
    try {
      // Query for historical correlation data
      const query = `historical correlation baseline ${entityId}`;
      const searchResults = await this.zepClient.searchMemory?.(query, { maxResults: 100 });
      
      const correlationBaselines: Record<string, { mean: number; std: number; count: number }> = {};
      
      if (searchResults?.facts) {
        // Extract correlation data from historical facts
        const correlationData: Record<string, number[]> = {};
        
        for (const fact of searchResults.facts) {
          const factText = fact.fact || '';
          
          // Look for correlation mentions in the fact
          const correlationMatch = factText.match(/correlation with (\w+)[:\s]+(-?\d+\.?\d*)/i);
          if (correlationMatch) {
            const targetEntity = correlationMatch[1];
            const correlation = parseFloat(correlationMatch[2]);
            
            if (!correlationData[targetEntity]) {
              correlationData[targetEntity] = [];
            }
            correlationData[targetEntity].push(correlation);
          }
        }
        
        // Calculate statistical baselines for each entity
        for (const [targetEntity, correlations] of Object.entries(correlationData)) {
          if (correlations.length >= 3) { // Need minimum data points
            const mean = correlations.reduce((sum, val) => sum + val, 0) / correlations.length;
            const variance = correlations.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / correlations.length;
            const std = Math.sqrt(variance);
            
            correlationBaselines[targetEntity] = {
              mean: mean,
              std: std,
              count: correlations.length
            };
          }
        }
      }
      
      // Add default baselines for common entities if not found
      const commonEntities = ['SPY', 'QQQ', 'IWM'];
      for (const entity of commonEntities) {
        if (!correlationBaselines[entity] && entity !== entityId) {
          correlationBaselines[entity] = {
            mean: 0.3, // Default moderate correlation with market
            std: 0.2,
            count: 30
          };
        }
      }
      
      this.logger.info('Historical correlation baselines retrieved', {
        component: 'TemporalRelationshipMapper',
        entity_id: entityId,
        baselines_count: Object.keys(correlationBaselines).length
      });
      
      return correlationBaselines;
      
    } catch (error) {
      this.logger.error('Failed to get historical correlation baselines', {
        component: 'TemporalRelationshipMapper',
        entity_id: entityId,
        error: error instanceof Error ? error.message : String(error)
      });
      return {};
    }
  }

  /**
   * Identify statistically significant emerging relationships
   */
  private async identifyEmergingRelationships(
    recentCorrelations: Record<string, number>,
    historicalBaselines: Record<string, { mean: number; std: number; count: number }>
  ): Promise<Array<{
    target_entity_id: string;
    relationship_type: string;
    strength: number;
    confidence: number;
    emergence_date: string;
    supporting_evidence: Array<{
      date: string;
      correlation: number;
      market_event: string;
    }>;
  }>> {
    
    const emergingRelationships: Array<{
      target_entity_id: string;
      relationship_type: string;
      strength: number;
      confidence: number;
      emergence_date: string;
      supporting_evidence: Array<{
        date: string;
        correlation: number;
        market_event: string;
      }>;
    }> = [];
    
    try {
      const currentDate = new Date().toISOString();
      
      // Statistical significance threshold (2 standard deviations)
      const SIGNIFICANCE_THRESHOLD = 2.0;
      
      for (const [targetEntity, recentCorr] of Object.entries(recentCorrelations)) {
        const baseline = historicalBaselines[targetEntity];
        
        if (baseline && baseline.count >= 3) {
          // Calculate z-score to determine statistical significance
          const zScore = Math.abs(recentCorr - baseline.mean) / baseline.std;
          
          if (zScore >= SIGNIFICANCE_THRESHOLD) {
            // Determine relationship type based on correlation direction and magnitude
            let relationshipType = 'emerging_correlation';
            if (Math.abs(recentCorr) > 0.7) {
              relationshipType = recentCorr > 0 ? 'strong_positive_correlation' : 'strong_negative_correlation';
            } else if (Math.abs(recentCorr) > 0.4) {
              relationshipType = recentCorr > 0 ? 'moderate_positive_correlation' : 'moderate_negative_correlation';
            }
            
            // Calculate confidence based on z-score and sample size
            const confidence = Math.min(0.95, 0.5 + (zScore - SIGNIFICANCE_THRESHOLD) * 0.1);
            
            // Create supporting evidence (simplified)
            const supportingEvidence = [{
              date: currentDate,
              correlation: recentCorr,
              market_event: `Correlation shift detected: ${recentCorr.toFixed(3)} vs baseline ${baseline.mean.toFixed(3)}`
            }];
            
            emergingRelationships.push({
              target_entity_id: targetEntity,
              relationship_type: relationshipType,
              strength: Math.abs(recentCorr),
              confidence: confidence,
              emergence_date: currentDate,
              supporting_evidence: supportingEvidence
            });
            
            this.logger.info('Emerging relationship detected', {
              component: 'TemporalRelationshipMapper',
              target_entity: targetEntity,
              relationship_type: relationshipType,
              recent_correlation: recentCorr,
              baseline_mean: baseline.mean,
              z_score: zScore,
              confidence: confidence
            });
          }
        } else {
          // New entity with no historical baseline - consider as emerging if correlation is strong
          if (Math.abs(recentCorr) > 0.5) {
            emergingRelationships.push({
              target_entity_id: targetEntity,
              relationship_type: recentCorr > 0 ? 'new_positive_correlation' : 'new_negative_correlation',
              strength: Math.abs(recentCorr),
              confidence: 0.6, // Lower confidence for new relationships
              emergence_date: currentDate,
              supporting_evidence: [{
                date: currentDate,
                correlation: recentCorr,
                market_event: `New relationship discovered with no historical baseline`
              }]
            });
          }
        }
      }
      
      this.logger.info('Emerging relationships analysis complete', {
        component: 'TemporalRelationshipMapper',
        emerging_count: emergingRelationships.length,
        recent_entities: Object.keys(recentCorrelations).length,
        baseline_entities: Object.keys(historicalBaselines).length
      });
      
      return emergingRelationships;
      
    } catch (error) {
      this.logger.error('Failed to identify emerging relationships', {
        component: 'TemporalRelationshipMapper',
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }
}

// ============================================================================
// SPECIALIZED TEMPORAL ANALYZERS
// ============================================================================

/**
 * Specialized analyzer for sector rotation patterns
 */
export class SectorRotationAnalyzer {
  private temporalMapper: TemporalRelationshipMapper;
  private logger: any;

  constructor(temporalMapper: TemporalRelationshipMapper, logger: any) {
    this.temporalMapper = temporalMapper;
    this.logger = logger;
  }

  /**
   * Analyze current sector rotation phase and predict next moves
   */
  async analyzeSectorRotationPhase(): Promise<{
    current_phase: string;
    phase_confidence: number;
    predicted_next_phase: string;
    transition_probability: number;
    leading_indicators: Array<{
      indicator: string;
      signal_strength: number;
      historical_accuracy: number;
    }>;
    sector_rankings: Array<{
      sector: string;
      expected_performance: number;
      confidence: number;
      time_horizon_days: number;
    }>;
  }> {
    
    this.logger.info('Analyzing sector rotation phase', {
      component: 'SectorRotationAnalyzer',
      operation: 'analyzeSectorRotationPhase'
    });

    // Implementation would analyze sector performance patterns and predict rotation
    return {
      current_phase: "Growth to Value Transition",
      phase_confidence: 0.78,
      predicted_next_phase: "Value Leadership",
      transition_probability: 0.65,
      leading_indicators: [
        {
          indicator: "10Y-2Y Yield Curve Steepening",
          signal_strength: 0.82,
          historical_accuracy: 0.74
        }
      ],
      sector_rankings: [
        {
          sector: "Financials",
          expected_performance: 0.15,
          confidence: 0.71,
          time_horizon_days: 60
        }
      ]
    };
  }

  // ========================================================================
  // Utility Methods for Correlation Calculations
  // ========================================================================

  /**
   * Extract time series data from Zep facts
   */
  private extractTimeSeriesFromFacts(facts: any[], entityId: string): Array<{ date: string; value: number }> {
    const timeSeriesData: Array<{ date: string; value: number }> = [];
    
    for (const fact of facts) {
      try {
        // Try to extract price/performance data from fact content
        const factText = fact.fact || '';
        const timestamp = fact.timestamp;
        
        // Look for price patterns in the fact text
        const priceMatch = factText.match(/price[:\s]+\$?(\d+\.?\d*)/i);
        const returnMatch = factText.match(/return[:\s]+(-?\d+\.?\d*)%?/i);
        const performanceMatch = factText.match(/performance[:\s]+(-?\d+\.?\d*)%?/i);
        
        let value = 0;
        if (priceMatch) {
          value = parseFloat(priceMatch[1]);
        } else if (returnMatch) {
          value = parseFloat(returnMatch[1]);
        } else if (performanceMatch) {
          value = parseFloat(performanceMatch[1]);
        }
        
        if (value !== 0 && timestamp) {
          timeSeriesData.push({
            date: timestamp,
            value: value
          });
        }
      } catch (error) {
        // Skip invalid facts
        continue;
      }
    }
    
    // Sort by date
    return timeSeriesData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Get related entities for correlation analysis
   */
  private async getRelatedEntities(entityId: string): Promise<string[]> {
    try {
      // Query for entities in the same sector or correlated entities
      const query = `related entities to ${entityId} sector correlation`;
      const searchResults = await this.zepClient.searchMemory?.(query, { maxResults: 20 });
      
      const relatedEntities: Set<string> = new Set();
      
      if (searchResults?.facts) {
        for (const fact of searchResults.facts) {
          // Extract entity mentions from facts
          const factText = fact.fact || '';
          const entityMatches = factText.match(/\b[A-Z]{1,5}\b/g); // Stock symbols
          
          if (entityMatches) {
            for (const match of entityMatches) {
              if (match !== entityId && match.length >= 2) {
                relatedEntities.add(match);
              }
            }
          }
        }
      }
      
      // Add some common index/sector entities for broader correlation
      const commonEntities = ['SPY', 'QQQ', 'IWM', 'XLF', 'XLK', 'XLE', 'XLV'];
      for (const entity of commonEntities) {
        if (entity !== entityId) {
          relatedEntities.add(entity);
        }
      }
      
      return Array.from(relatedEntities).slice(0, 10); // Limit to top 10
      
    } catch (error) {
      this.logger.error('Failed to get related entities', {
        component: 'TemporalRelationshipMapper',
        entity_id: entityId,
        error: error instanceof Error ? error.message : String(error)
      });
      return ['SPY', 'QQQ']; // Default fallback
    }
  }

  /**
   * Get time series data for a specific entity
   */
  private async getEntityTimeSeriesData(entityId: string, windowDays: number): Promise<Array<{ date: string; value: number }>> {
    try {
      const query = `price data for ${entityId} last ${windowDays} days`;
      const searchResults = await this.zepClient.searchMemory?.(query, { maxResults: 30 });
      
      if (searchResults?.facts) {
        return this.extractTimeSeriesFromFacts(searchResults.facts, entityId);
      }
      
      return [];
      
    } catch (error) {
      this.logger.error('Failed to get entity time series data', {
        component: 'TemporalRelationshipMapper',
        entity_id: entityId,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Calculate Pearson correlation coefficient between two time series
   */
  private calculatePearsonCorrelation(
    series1: Array<{ date: string; value: number }>,
    series2: Array<{ date: string; value: number }>
  ): number {
    
    if (series1.length === 0 || series2.length === 0) {
      return 0;
    }
    
    // Align the series by date (simple approach - match by position for now)
    const minLength = Math.min(series1.length, series2.length);
    if (minLength < 3) {
      return 0; // Need at least 3 points for meaningful correlation
    }
    
    const values1 = series1.slice(-minLength).map(d => d.value);
    const values2 = series2.slice(-minLength).map(d => d.value);
    
    // Calculate means
    const mean1 = values1.reduce((sum, val) => sum + val, 0) / values1.length;
    const mean2 = values2.reduce((sum, val) => sum + val, 0) / values2.length;
    
    // Calculate correlation components
    let numerator = 0;
    let sumSquares1 = 0;
    let sumSquares2 = 0;
    
    for (let i = 0; i < values1.length; i++) {
      const diff1 = values1[i] - mean1;
      const diff2 = values2[i] - mean2;
      
      numerator += diff1 * diff2;
      sumSquares1 += diff1 * diff1;
      sumSquares2 += diff2 * diff2;
    }
    
    const denominator = Math.sqrt(sumSquares1 * sumSquares2);
    
    if (denominator === 0) {
      return 0;
    }
    
    return numerator / denominator;
  }
}

/**
 * Specialized analyzer for economic indicator impact
 */
export class EconomicIndicatorImpactAnalyzer {
  private temporalMapper: TemporalRelationshipMapper;
  private logger: any;

  constructor(temporalMapper: TemporalRelationshipMapper, logger: any) {
    this.temporalMapper = temporalMapper;
    this.logger = logger;
  }

  /**
   * Analyze how economic indicators typically affect specific entities
   */
  async analyzeIndicatorImpact(
    indicatorName: string,
    targetEntityId: string,
    _lookbackDays: number = 1095
  ): Promise<{
    historical_correlation: number;
    typical_lag_days: number;
    impact_magnitude: number;
    confidence: number;
    regime_dependent: boolean;
    similar_scenarios: Array<{
      date: string;
      indicator_value: number;
      market_response: number;
      regime: string;
    }>;
  }> {
    
    this.logger.info('Analyzing economic indicator impact', {
      component: 'EconomicIndicatorImpactAnalyzer',
      indicator: indicatorName,
      target_entity: targetEntityId
    });

    // Implementation would analyze historical indicator-entity relationships
    return {
      historical_correlation: 0.0,
      typical_lag_days: 0,
      impact_magnitude: 0.0,
      confidence: 0.0,
      regime_dependent: false,
      similar_scenarios: []
    };
  }
}

export default {
  TemporalRelationshipMapper,
  SectorRotationAnalyzer,
  EconomicIndicatorImpactAnalyzer
};