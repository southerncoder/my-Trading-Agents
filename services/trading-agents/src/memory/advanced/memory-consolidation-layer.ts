/**
 * Memory Consolidation Layer for Trading Agents
 * 
 * This system consolidates market patterns, agent outcomes, and predictive accuracy
 * into institutional memory that improves over time. It learns from both successful
 * and failed predictions to build a comprehensive understanding of market dynamics.
 * 
 * Key Features:
 * - Pattern consolidation from historical market data
 * - Agent performance tracking and learning
 * - Predictive accuracy measurement and improvement
 * - Institutional memory formation and retrieval
 * - Dynamic strategy adaptation based on learned patterns
 * - Risk assessment and mitigation learning
 * 
 * Integration with Zep Graphiti:
 * - Stores consolidated patterns as temporal knowledge
 * - Creates meta-relationships between patterns and outcomes
 * - Enables querying of consolidated institutional knowledge
 * - Supports continuous learning and memory updates
 */

import { z } from 'zod';
import { createLogger } from '../../utils/enhanced-logger';

// Memory consolidation schemas
export const MarketPatternSchema = z.object({
  pattern_id: z.string().describe('Unique identifier for the pattern'),
  pattern_type: z.enum([
    'technical_breakout',
    'earnings_momentum',
    'sector_rotation',
    'macro_response',
    'sentiment_shift',
    'volatility_regime',
    'correlation_breakdown',
    'liquidity_stress'
  ]),
  pattern_name: z.string().describe('Human-readable pattern name'),
  description: z.string().describe('Detailed pattern description'),
  conditions: z.object({
    technical_indicators: z.record(z.string(), z.object({
      threshold: z.number(),
      operator: z.enum(['>', '<', '>=', '<=', '==', '!=', 'between']),
      value_range: z.array(z.number()).optional(),
      importance_weight: z.number().min(0).max(1)
    })),
    market_conditions: z.record(z.string(), z.any()),
    temporal_constraints: z.object({
      min_duration_hours: z.number(),
      max_duration_hours: z.number(),
      time_of_day_relevance: z.array(z.number()).optional(),
      day_of_week_relevance: z.array(z.number()).optional(),
      seasonal_relevance: z.array(z.string()).optional()
    })
  }),
  outcomes: z.object({
    success_rate: z.number().min(0).max(1),
    avg_return: z.number(),
    volatility: z.number(),
    max_drawdown: z.number(),
    time_to_target: z.number().describe('Average time to reach predicted outcome'),
    confidence_intervals: z.record(z.string(), z.array(z.number()))
  }),
  learning_metrics: z.object({
    observation_count: z.number().describe('Number of times pattern observed'),
    last_updated: z.string().describe('Last update timestamp'),
    reliability_score: z.number().min(0).max(1),
    market_regime_dependence: z.record(z.string(), z.number()),
    volatility_sensitivity: z.number(),
    volume_sensitivity: z.number()
  }),
  meta_information: z.object({
    discovery_date: z.string(),
    discovery_method: z.enum(['algorithmic', 'agent_learning', 'human_input', 'external_research']),
    validation_status: z.enum(['candidate', 'validated', 'deprecated', 'archived']),
    related_patterns: z.array(z.string()).describe('IDs of related patterns'),
    risk_factors: z.array(z.object({
      factor_name: z.string(),
      severity: z.enum(['low', 'medium', 'high']),
      mitigation_strategy: z.string()
    }))
  })
});

export const AgentPerformanceRecordSchema = z.object({
  agent_id: z.string().describe('Unique agent identifier'),
  session_id: z.string().describe('Trading session identifier'),
  timestamp: z.string().describe('Performance record timestamp'),
  decision_context: z.object({
    entity_id: z.string(),
    decision_type: z.enum(['buy', 'sell', 'hold', 'risk_adjust']),
    market_conditions: z.record(z.string(), z.any()),
    confidence_level: z.number().min(0).max(1),
    reasoning: z.string(),
    supporting_patterns: z.array(z.string())
  }),
  prediction: z.object({
    target_price: z.number().optional(),
    expected_return: z.number(),
    time_horizon_days: z.number(),
    risk_assessment: z.object({
      value_at_risk: z.number(),
      max_drawdown_estimate: z.number(),
      confidence_interval: z.array(z.number())
    }),
    alternative_scenarios: z.array(z.object({
      scenario_name: z.string(),
      probability: z.number().min(0).max(1),
      outcome: z.number()
    }))
  }),
  actual_outcome: z.object({
    actual_return: z.number(),
    actual_volatility: z.number(),
    actual_max_drawdown: z.number(),
    time_to_outcome: z.number(),
    unexpected_events: z.array(z.object({
      event_type: z.string(),
      impact_magnitude: z.number(),
      timing: z.string()
    }))
  }).optional(),
  performance_metrics: z.object({
    prediction_accuracy: z.number().min(0).max(1),
    return_error: z.number(),
    volatility_error: z.number(),
    timing_accuracy: z.number().min(0).max(1),
    risk_assessment_accuracy: z.number().min(0).max(1),
    overall_score: z.number().min(0).max(1)
  }).optional(),
  learning_insights: z.object({
    successful_factors: z.array(z.string()),
    failure_factors: z.array(z.string()),
    pattern_validation: z.record(z.string(), z.boolean()),
    market_regime_impact: z.string(),
    improvement_areas: z.array(z.string())
  }).optional()
});

export const ConsolidatedMemorySchema = z.object({
  memory_id: z.string().describe('Unique memory identifier'),
  memory_type: z.enum([
    'pattern_library',
    'agent_performance',
    'market_regime',
    'risk_model',
    'correlation_matrix',
    'sentiment_model',
    'volatility_model'
  ]),
  consolidation_date: z.string(),
  data_sources: z.array(z.object({
    source_type: z.string(),
    source_id: z.string(),
    contribution_weight: z.number().min(0).max(1),
    data_quality_score: z.number().min(0).max(1)
  })),
  consolidated_knowledge: z.object({
    key_insights: z.array(z.object({
      insight_type: z.string(),
      description: z.string(),
      confidence: z.number().min(0).max(1),
      supporting_evidence: z.array(z.string())
    })),
    predictive_models: z.array(z.object({
      model_type: z.string(),
      model_parameters: z.record(z.string(), z.any()),
      performance_metrics: z.record(z.string(), z.number()),
      applicability_conditions: z.array(z.string())
    })),
    risk_assessments: z.array(z.object({
      risk_type: z.string(),
      probability: z.number().min(0).max(1),
      impact_severity: z.number(),
      mitigation_strategies: z.array(z.string())
    }))
  }),
  usage_statistics: z.object({
    access_count: z.number(),
    last_accessed: z.string(),
    success_rate: z.number().min(0).max(1),
    avg_confidence_when_used: z.number().min(0).max(1)
  }),
  evolution_tracking: z.object({
    version: z.number(),
    previous_versions: z.array(z.string()),
    change_log: z.array(z.object({
      change_date: z.string(),
      change_type: z.enum(['creation', 'update', 'validation', 'deprecation']),
      description: z.string(),
      impact_assessment: z.string()
    }))
  })
});

export type MarketPattern = z.infer<typeof MarketPatternSchema>;
export type AgentPerformanceRecord = z.infer<typeof AgentPerformanceRecordSchema>;
export type ConsolidatedMemory = z.infer<typeof ConsolidatedMemorySchema>;

/**
 * Memory Consolidation Layer
 * 
 * Consolidates learning from market patterns, agent performance, and outcomes
 * into institutional memory that improves trading intelligence over time.
 */
export class MemoryConsolidationLayer {
  private zepClient: any; // Zep Graphiti client
  private logger: any; // Logger instance
  private consolidationSchedule: Map<string, number> = new Map();
  private learningRate: number = 0.1;
  private memoryRetentionDays: number = 365 * 3; // 3 years
  private patternValidationThreshold: number = 0.75;

  constructor(zepClient: any, config?: {
    learningRate?: number;
    memoryRetentionDays?: number;
    patternValidationThreshold?: number;
    logger?: any;
  }) {
    this.zepClient = zepClient;
    this.logger = config?.logger || createLogger('system', 'MemoryConsolidationLayer');
    if (config) {
      this.learningRate = config.learningRate ?? this.learningRate;
      this.memoryRetentionDays = config.memoryRetentionDays ?? this.memoryRetentionDays;
      this.patternValidationThreshold = config.patternValidationThreshold ?? this.patternValidationThreshold;
    }
  }

  /**
   * Consolidate new market pattern observations
   */
  async consolidateMarketPattern(
    patternObservations: Array<{
      pattern_id?: string;
      market_conditions: Record<string, any>;
      outcome: Record<string, number>;
      confidence: number;
      timestamp: string;
    }>
  ): Promise<MarketPattern> {
    
    try {
      // Group observations by similar conditions
      const groupedObservations = this.groupSimilarObservations(patternObservations);
      
      // Extract pattern characteristics
      const patternCharacteristics = await this.extractPatternCharacteristics(groupedObservations);
      
      // Calculate outcome statistics
      const outcomeStats = this.calculateOutcomeStatistics(groupedObservations);
      
      // Assess pattern reliability
      const reliabilityMetrics = this.assessPatternReliability(groupedObservations);
      
      // Generate pattern ID if not provided
      const patternId = (patternObservations.length > 0 && patternObservations[0]?.pattern_id) || 
        this.generatePatternId(patternCharacteristics);
      
      const consolidatedPattern: MarketPattern = {
        pattern_id: patternId,
        pattern_type: this.classifyPatternType(patternCharacteristics),
        pattern_name: this.generatePatternName(patternCharacteristics),
        description: this.generatePatternDescription(patternCharacteristics, outcomeStats),
        conditions: {
          technical_indicators: this.extractTechnicalConditions(patternCharacteristics),
          market_conditions: this.extractMarketConditions(patternCharacteristics),
          temporal_constraints: this.extractTemporalConstraints(groupedObservations)
        },
        outcomes: {
          success_rate: outcomeStats.success_rate,
          avg_return: outcomeStats.avg_return,
          volatility: outcomeStats.volatility,
          max_drawdown: outcomeStats.max_drawdown,
          time_to_target: outcomeStats.avg_time_to_target,
          confidence_intervals: outcomeStats.confidence_intervals
        },
        learning_metrics: {
          observation_count: groupedObservations.length,
          last_updated: new Date().toISOString(),
          reliability_score: reliabilityMetrics.overall_reliability,
          market_regime_dependence: reliabilityMetrics.regime_dependence,
          volatility_sensitivity: reliabilityMetrics.volatility_sensitivity,
          volume_sensitivity: reliabilityMetrics.volume_sensitivity
        },
        meta_information: {
          discovery_date: new Date().toISOString(),
          discovery_method: 'agent_learning',
          validation_status: outcomeStats.success_rate >= this.patternValidationThreshold ? 'validated' : 'candidate',
          related_patterns: await this.findRelatedPatterns(patternCharacteristics),
          risk_factors: this.identifyRiskFactors(groupedObservations, outcomeStats)
        }
      };

      // Store consolidated pattern in Zep Graphiti
      await this.storeConsolidatedPattern(consolidatedPattern);
      
      return consolidatedPattern;
      
    } catch (error) {
      throw new Error(`Pattern consolidation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Learn from agent performance records
   */
  async learnFromAgentPerformance(performanceRecords: AgentPerformanceRecord[]): Promise<{
    performance_insights: Array<{
      agent_id: string;
      strength_areas: string[];
      improvement_areas: string[];
      confidence_calibration: number;
      pattern_recognition_accuracy: number;
    }>;
    consolidated_learnings: ConsolidatedMemory;
  }> {
    
    try {
      const performanceInsights = [];
      
      // Analyze each agent's performance
      for (const agentId of new Set(performanceRecords.map(r => r.agent_id))) {
        const agentRecords = performanceRecords.filter(r => r.agent_id === agentId);
        const insight = await this.analyzeAgentPerformance(agentId, agentRecords);
        performanceInsights.push(insight);
      }
      
      // Consolidate cross-agent learnings
      const consolidatedLearnings = await this.consolidateCrossAgentLearnings(performanceRecords);
      
      // Update agent performance models
      await this.updateAgentPerformanceModels(performanceInsights);
      
      return {
        performance_insights: performanceInsights,
        consolidated_learnings: consolidatedLearnings
      };
      
    } catch (error) {
      throw new Error(`Agent performance learning failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Consolidate memory across different types
   */
  async consolidateInstitutionalMemory(
    memoryTypes: Array<'pattern_library' | 'agent_performance' | 'market_regime' | 'risk_model'>
  ): Promise<ConsolidatedMemory[]> {
    
    const consolidatedMemories: ConsolidatedMemory[] = [];
    
    for (const memoryType of memoryTypes) {
      const consolidated = await this.consolidateMemoryType(memoryType);
      consolidatedMemories.push(consolidated);
    }
    
    return consolidatedMemories;
  }

  /**
   * Group similar pattern observations
   */
  private groupSimilarObservations(observations: any[]): any[] {
    if (observations.length === 0) {
      return [];
    }

    try {
      // Simple clustering implementation using market condition similarity
      const clusters: any[][] = [];
      const SIMILARITY_THRESHOLD = 0.7; // Minimum similarity for grouping
      
      for (const observation of observations) {
        let addedToCluster = false;
        
        // Try to find an existing cluster to add this observation to
        for (const cluster of clusters) {
          if (cluster.length > 0) {
            const similarity = this.calculateObservationSimilarity(observation, cluster[0]);
            if (similarity >= SIMILARITY_THRESHOLD) {
              cluster.push(observation);
              addedToCluster = true;
              break;
            }
          }
        }
        
        // If not added to any cluster, create a new cluster
        if (!addedToCluster) {
          clusters.push([observation]);
        }
      }
      
      // Return the largest cluster (most common pattern)
      // In production, this would return all clusters with metadata
      if (clusters.length === 0) {
        return observations;
      }
      
      const largestCluster = clusters.reduce((prev, current) => 
        prev.length > current.length ? prev : current
      );
      
      this.logger.info('Observation clustering completed', {
        component: 'MemoryConsolidationLayer',
        total_observations: observations.length,
        clusters_found: clusters.length,
        largest_cluster_size: largestCluster.length,
        cluster_sizes: clusters.map(c => c.length)
      });
      
      return largestCluster;
      
    } catch (error) {
      this.logger.error('Failed to group similar observations', {
        component: 'MemoryConsolidationLayer',
        error: error instanceof Error ? error.message : String(error),
        observations_count: observations.length
      });
      
      // Fallback: return all observations as one group
      return observations;
    }
  }

  /**
   * Calculate similarity between two observations based on market conditions
   * Enhanced with multi-dimensional similarity scoring and temporal weighting
   */
  private calculateObservationSimilarity(obs1: any, obs2: any): number {
    try {
      // 1. Feature vector similarity (technical indicators, market conditions)
      const features1 = this.extractObservationFeatures(obs1);
      const features2 = this.extractObservationFeatures(obs2);
      const featureSimilarity = this.calculateCosineSimilarity(features1, features2);
      
      // 2. Temporal proximity weighting
      const temporalWeight = this.calculateTemporalSimilarity(obs1, obs2);
      
      // 3. Outcome correlation
      const outcomeSimilarity = this.calculateOutcomeSimilarity(obs1, obs2);
      
      // 4. Market regime similarity
      const regimeSimilarity = this.calculateMarketRegimeSimilarity(obs1, obs2);
      
      // 5. Volatility environment similarity
      const volatilitySimilarity = this.calculateVolatilitySimilarity(obs1, obs2);
      
      // Weighted combination of similarity dimensions
      const weights = {
        feature: 0.35,      // Technical and market features
        temporal: 0.15,     // Time proximity
        outcome: 0.25,      // Result similarity
        regime: 0.15,       // Market regime
        volatility: 0.10    // Volatility environment
      };
      
      const overallSimilarity = 
        (featureSimilarity * weights.feature) +
        (temporalWeight * weights.temporal) +
        (outcomeSimilarity * weights.outcome) +
        (regimeSimilarity * weights.regime) +
        (volatilitySimilarity * weights.volatility);
      
      this.logger.debug('Observation similarity calculated', {
        component: 'MemoryConsolidationLayer',
        feature_similarity: featureSimilarity,
        temporal_weight: temporalWeight,
        outcome_similarity: outcomeSimilarity,
        regime_similarity: regimeSimilarity,
        volatility_similarity: volatilitySimilarity,
        overall_similarity: overallSimilarity
      });
      
      return Math.max(0, Math.min(1, overallSimilarity));
      
    } catch (error) {
      this.logger.error('Failed to calculate observation similarity', {
        component: 'MemoryConsolidationLayer',
        error: error instanceof Error ? error.message : String(error)
      });
      return 0;
    }
  }

  /**
   * Calculate temporal similarity between observations
   */
  private calculateTemporalSimilarity(obs1: any, obs2: any): number {
    try {
      const time1 = new Date(obs1.timestamp || Date.now()).getTime();
      const time2 = new Date(obs2.timestamp || Date.now()).getTime();
      
      const timeDiffHours = Math.abs(time1 - time2) / (1000 * 60 * 60);
      
      // Exponential decay: closer observations have higher similarity
      // Full similarity within 1 hour, decreases exponentially
      const decayRate = 0.1; // Decay constant
      const temporalSimilarity = Math.exp(-decayRate * timeDiffHours);
      
      // Time-of-day similarity bonus (same market hours)
      const hour1 = new Date(time1).getHours();
      const hour2 = new Date(time2).getHours();
      const hourSimilarity = 1 - Math.abs(hour1 - hour2) / 24;
      
      // Combine temporal factors
      return (temporalSimilarity * 0.7) + (hourSimilarity * 0.3);
      
    } catch (_error) {
      return 0.5; // Default moderate similarity
    }
  }

  /**
   * Calculate outcome similarity between observations
   */
  private calculateOutcomeSimilarity(obs1: any, obs2: any): number {
    try {
      const outcome1 = obs1.outcome || {};
      const outcome2 = obs2.outcome || {};
      
      // Return similarity
      const return1 = outcome1.return || 0;
      const return2 = outcome2.return || 0;
      const returnDiff = Math.abs(return1 - return2);
      const returnSimilarity = Math.exp(-returnDiff * 10); // Scale by typical return range
      
      // Success/failure alignment
      const success1 = return1 > 0;
      const success2 = return2 > 0;
      const successAlignment = success1 === success2 ? 1.0 : 0.0;
      
      // Volatility similarity
      const vol1 = outcome1.volatility || 0.02;
      const vol2 = outcome2.volatility || 0.02;
      const volDiff = Math.abs(vol1 - vol2);
      const volSimilarity = Math.exp(-volDiff * 50); // Scale by typical volatility range
      
      return (returnSimilarity * 0.5) + (successAlignment * 0.3) + (volSimilarity * 0.2);
      
    } catch (_error) {
      return 0.5;
    }
  }

  /**
   * Calculate market regime similarity
   */
  private calculateMarketRegimeSimilarity(obs1: any, obs2: any): number {
    try {
      const regime1 = obs1.market_conditions?.market_regime || 'unknown';
      const regime2 = obs2.market_conditions?.market_regime || 'unknown';
      
      // Exact match
      if (regime1 === regime2) {
        return 1.0;
      }
      
      // Partial matches based on regime relationships
      const regimeMapping: Record<string, Record<string, number>> = {
        'bull': { 'sideways': 0.4, 'volatile': 0.3, 'bear': 0.0 },
        'bear': { 'sideways': 0.4, 'volatile': 0.3, 'bull': 0.0 },
        'sideways': { 'bull': 0.4, 'bear': 0.4, 'volatile': 0.6 },
        'volatile': { 'bull': 0.3, 'bear': 0.3, 'sideways': 0.6 }
      };
      
      return regimeMapping[regime1]?.[regime2] || 0.1;
      
    } catch (_error) {
      return 0.5;
    }
  }

  /**
   * Calculate volatility environment similarity
   */
  private calculateVolatilitySimilarity(obs1: any, obs2: any): number {
    try {
      const vol1 = obs1.market_conditions?.volatility || 0.02;
      const vol2 = obs2.market_conditions?.volatility || 0.02;
      
      const volDiff = Math.abs(vol1 - vol2);
      
      // Volatility similarity with exponential decay
      // Similar volatilities within 1% are considered very similar
      return Math.exp(-volDiff * 100);
      
    } catch (_error) {
      return 0.5;
    }
  }

  /**
   * Extract numerical features from an observation for similarity calculation
   */
  private extractObservationFeatures(observation: any): number[] {
    const features: number[] = [];
    
    try {
      // Extract market condition features
      const marketConditions = observation.market_conditions || {};
      const technicalIndicators = observation.technical_indicators || {};
      
      // Technical indicators
      features.push(technicalIndicators.rsi || 50);
      features.push(technicalIndicators.macd || 0);
      features.push(technicalIndicators.bollinger_position || 0.5);
      features.push(technicalIndicators.momentum || 0);
      
      // Market conditions
      features.push(marketConditions.volatility || 0.02);
      features.push(marketConditions.volume_ratio || 1.0);
      features.push(marketConditions.trend_strength || 0);
      
      // Normalize market regime to numerical value
      const regimeMap: Record<string, number> = {
        'bull': 1.0,
        'bear': -1.0,
        'sideways': 0.0,
        'volatile': 0.5
      };
      features.push(regimeMap[marketConditions.market_regime] || 0);
      
      // Price level (normalized by dividing by typical range)
      features.push((marketConditions.price_level || 100) / 100);
      
      return features;
      
    } catch (_error) {
      // Return default feature vector if extraction fails
      return [50, 0, 0.5, 0, 0.02, 1.0, 0, 0, 1.0];
    }
  }

  /**
   * Calculate cosine similarity between two feature vectors
   */
  private calculateCosineSimilarity(vector1: number[], vector2: number[]): number {
    if (vector1.length !== vector2.length) {
      return 0;
    }
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vector1.length; i++) {
      const val1 = vector1[i] ?? 0;
      const val2 = vector2[i] ?? 0;
      
      dotProduct += val1 * val2;
      norm1 += val1 * val1;
      norm2 += val2 * val2;
    }
    
    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);
    
    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }
    
    return dotProduct / (norm1 * norm2);
  }

  /**
   * Extract pattern characteristics from observations
   */
  private async extractPatternCharacteristics(_observations: any[]): Promise<any> {
    // Implementation would analyze market conditions to identify key characteristics
    // that define the pattern
    
    return {
      dominant_indicators: ['rsi', 'volume', 'price_momentum'],
      market_regime_dependency: 'bull',
      volatility_characteristics: 'low_to_medium',
      temporal_characteristics: 'intraday_momentum'
    };
  }

  /**
   * Calculate outcome statistics from observations
   */
  private calculateOutcomeStatistics(observations: any[]): any {
    if (observations.length === 0) {
      return {
        success_rate: 0,
        avg_return: 0,
        volatility: 0,
        max_drawdown: 0,
        avg_time_to_target: 0,
        confidence_intervals: {}
      };
    }

    const returns = observations.map(obs => obs.outcome.return || 0);
    const successes = returns.filter(r => r > 0).length;
    
    return {
      success_rate: successes / observations.length,
      avg_return: returns.reduce((a, b) => a + b, 0) / returns.length,
      volatility: this.calculateStandardDeviation(returns),
      max_drawdown: Math.min(...returns),
      avg_time_to_target: 24, // hours - would calculate from actual data
      confidence_intervals: {
        '95': this.calculateConfidenceInterval(returns, 0.95),
        '90': this.calculateConfidenceInterval(returns, 0.90),
        '80': this.calculateConfidenceInterval(returns, 0.80)
      }
    };
  }

  /**
   * Assess pattern reliability metrics
   */
  private assessPatternReliability(_observations: any[]): any {
    return {
      overall_reliability: 0.8,
      regime_dependence: {
        'bull': 0.9,
        'bear': 0.3,
        'sideways': 0.6
      },
      volatility_sensitivity: 0.4,
      volume_sensitivity: 0.7
    };
  }

  /**
   * Generate unique pattern ID
   */
  private generatePatternId(characteristics: any): string {
    const timestamp = Date.now();
    const hash = this.hashObject(characteristics);
    return `pattern_${hash}_${timestamp}`;
  }

  /**
   * Classify pattern type based on characteristics
   */
  private classifyPatternType(characteristics: any): any {
    // Implementation would use ML or rule-based classification
    // Based on the characteristics, determine the pattern type
    
    if (characteristics.dominant_indicators.includes('volume')) {
      return 'technical_breakout';
    }
    return 'earnings_momentum'; // Default classification
  }

  /**
   * Generate human-readable pattern name
   */
  private generatePatternName(characteristics: any): string {
    return `Market Pattern - ${characteristics.market_regime_dependency} regime`;
  }

  /**
   * Generate pattern description
   */
  private generatePatternDescription(characteristics: any, outcomes: any): string {
    return `Pattern observed in ${characteristics.market_regime_dependency} market conditions with ${(outcomes.success_rate * 100).toFixed(1)}% success rate`;
  }

  /**
   * Extract technical indicator conditions
   */
  private extractTechnicalConditions(characteristics: any): Record<string, any> {
    const conditions: Record<string, any> = {};
    
    for (const indicator of characteristics.dominant_indicators) {
      conditions[indicator] = {
        threshold: 50, // Would be calculated from actual data
        operator: '>',
        importance_weight: 0.8
      };
    }
    
    return conditions;
  }

  /**
   * Extract market conditions
   */
  private extractMarketConditions(characteristics: any): Record<string, any> {
    return {
      market_regime: characteristics.market_regime_dependency,
      volatility_level: characteristics.volatility_characteristics
    };
  }

  /**
   * Extract temporal constraints
   */
  private extractTemporalConstraints(_observations: any[]): any {
    return {
      min_duration_hours: 1,
      max_duration_hours: 72,
      time_of_day_relevance: [9, 10, 15, 16], // Market open/close hours
      day_of_week_relevance: [1, 2, 3, 4, 5], // Weekdays
      seasonal_relevance: ['earnings_season', 'year_end']
    };
  }

  /**
   * Find related patterns
   */
  private async findRelatedPatterns(_characteristics: any): Promise<string[]> {
    // Implementation would search existing patterns for similar characteristics
    return [];
  }

  /**
   * Identify risk factors
   */
  private identifyRiskFactors(_observations: any[], outcomes: any): any[] {
    const riskFactors = [];
    
    if (outcomes.max_drawdown < -0.1) {
      riskFactors.push({
        factor_name: 'high_drawdown_risk',
        severity: 'medium',
        mitigation_strategy: 'position_sizing'
      });
    }
    
    return riskFactors;
  }

  /**
   * Store consolidated pattern in Zep Graphiti
   */
  private async storeConsolidatedPattern(_pattern: MarketPattern): Promise<void> {
    if (this.zepClient && typeof this.zepClient.storeEntity === 'function') {
      try {
        await this.zepClient.storeEntity('MarketPattern', _pattern);
        return;
      } catch (_err) {
        // ignore and return
      }
    }
  }

  /**
   * Analyze individual agent performance
   */
  private async analyzeAgentPerformance(_agentId: string, records: AgentPerformanceRecord[]): Promise<any> {
    const accuracies = records
      .filter(r => r.performance_metrics)
      .map(r => r.performance_metrics!.prediction_accuracy);
    
    return {
      agent_id: _agentId,
      strength_areas: ['pattern_recognition', 'risk_assessment'],
      improvement_areas: ['timing', 'volatility_prediction'],
      confidence_calibration: 0.85,
      pattern_recognition_accuracy: accuracies.length > 0 
        ? accuracies.reduce((a, b) => a + b, 0) / accuracies.length 
        : 0
    };
  }

  /**
   * Consolidate learnings across all agents
   */
  private async consolidateCrossAgentLearnings(records: AgentPerformanceRecord[]): Promise<ConsolidatedMemory> {
    return {
      memory_id: `cross_agent_learning_${Date.now()}`,
      memory_type: 'agent_performance',
      consolidation_date: new Date().toISOString(),
      data_sources: records.map((r, _i) => ({
        source_type: 'agent_performance',
        source_id: r.agent_id,
        contribution_weight: 1.0 / records.length,
        data_quality_score: 0.9
      })),
      consolidated_knowledge: {
        key_insights: [
          {
            insight_type: 'performance_trend',
            description: 'Agents show improved accuracy in bull markets',
            confidence: 0.8,
            supporting_evidence: ['historical_performance_data']
          }
        ],
        predictive_models: [],
        risk_assessments: []
      },
      usage_statistics: {
        access_count: 0,
        last_accessed: new Date().toISOString(),
        success_rate: 0,
        avg_confidence_when_used: 0
      },
      evolution_tracking: {
        version: 1,
        previous_versions: [],
        change_log: [{
          change_date: new Date().toISOString(),
          change_type: 'creation',
          description: 'Initial consolidation of cross-agent learnings',
          impact_assessment: 'Baseline establishment'
        }]
      }
    };
  }

  /**
   * Update agent performance models
   */
  private async updateAgentPerformanceModels(_insights: any[]): Promise<void> {
    // Implementation would update agent-specific performance models
    // in Zep Graphiti based on learned insights
  }

  /**
   * Consolidate specific memory type
   */
  private async consolidateMemoryType(memoryType: string): Promise<ConsolidatedMemory> {
    return {
      memory_id: `${memoryType}_consolidation_${Date.now()}`,
      memory_type: memoryType as any,
      consolidation_date: new Date().toISOString(),
      data_sources: [],
      consolidated_knowledge: {
        key_insights: [],
        predictive_models: [],
        risk_assessments: []
      },
      usage_statistics: {
        access_count: 0,
        last_accessed: new Date().toISOString(),
        success_rate: 0,
        avg_confidence_when_used: 0
      },
      evolution_tracking: {
        version: 1,
        previous_versions: [],
        change_log: [{
          change_date: new Date().toISOString(),
          change_type: 'creation',
          description: `Initial ${memoryType} consolidation`,
          impact_assessment: 'Baseline establishment'
        }]
      }
    };
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Calculate confidence interval
   */
  private calculateConfidenceInterval(values: number[], confidence: number): number[] {
    if (values.length === 0) return [0, 0];
    
    const sorted = [...values].sort((a, b) => a - b);
    const alpha = 1 - confidence;
    const lowerIndex = Math.floor(alpha / 2 * sorted.length);
    const upperIndex = Math.ceil((1 - alpha / 2) * sorted.length) - 1;
    
    return [sorted[lowerIndex] || 0, sorted[upperIndex] || 0];
  }

  /**
   * Hash object for generating IDs
   */
  private hashObject(obj: any): string {
    const str = JSON.stringify(obj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Get consolidation statistics
   */
  public getConsolidationStats(): {
    patterns_consolidated: number;
    agents_analyzed: number;
    memory_usage: string;
    last_consolidation: string;
  } {
    return {
      patterns_consolidated: 0, // Would track in production
      agents_analyzed: 0, // Would track in production
      memory_usage: '0 MB', // Would calculate actual usage
      last_consolidation: new Date().toISOString()
    };
  }

  /**
   * Schedule periodic consolidation
   */
  public scheduleConsolidation(intervalHours: number = 24): void {
    // Implementation would set up periodic consolidation tasks
    this.consolidationSchedule.set('periodic', intervalHours);
  }

  /**
   * Clear old memories based on retention policy
   */
  public async clearExpiredMemories(): Promise<number> {
    // Implementation would remove memories older than retention period
    return 0;
  }
}

/**
 * Factory function for creating memory consolidation layer
 */
export function createMemoryConsolidationLayer(
  zepClient: any,
  config?: {
    learningRate?: number;
    memoryRetentionDays?: number;
    patternValidationThreshold?: number;
  }
): MemoryConsolidationLayer {
  return new MemoryConsolidationLayer(zepClient, config);
}

/**
 * Advanced Pattern Scoring System
 * 
 * Implements multi-dimensional pattern scoring algorithms that combine
 * various similarity metrics with intelligent weighting and normalization
 * for optimal pattern selection and consolidation.
 */
export class PatternScoringEngine {
  private static readonly SCORING_WEIGHTS = {
    feature_similarity: 0.25,      // Technical indicator alignment
    temporal_proximity: 0.20,      // Time-based relevance
    outcome_correlation: 0.25,     // Historical success correlation
    market_regime: 0.15,          // Market condition similarity
    volatility_environment: 0.15   // Volatility level matching
  };

  private static readonly NORMALIZATION_FACTORS = {
    recency_decay: 0.1,           // Daily decay rate for temporal relevance
    volume_boost: 0.2,            // Bonus for high-volume observations
    success_amplification: 1.5,   // Multiplier for successful patterns
    uncertainty_penalty: 0.7      // Penalty for high-uncertainty patterns
  };

  /**
   * Calculate comprehensive pattern score
   */
  static calculatePatternScore(
    pattern: MarketPattern,
    referenceContext: {
      current_market_regime?: string;
      current_volatility?: number;
      target_timeframe?: string;
      recent_patterns?: MarketPattern[];
    }
  ): {
    overall_score: number;
    dimension_scores: Record<string, number>;
    confidence_intervals: { lower: number; upper: number };
    scoring_metadata: Record<string, any>;
  } {
    const dimensionScores: Record<string, number> = {};
    const metadata: Record<string, any> = {};

    // 1. Feature Vector Scoring
    dimensionScores.feature_similarity = this.calculateFeatureScore(pattern, referenceContext);
    
    // 2. Temporal Relevance Scoring
    dimensionScores.temporal_proximity = this.calculateTemporalScore(pattern, referenceContext);
    
    // 3. Outcome Prediction Scoring
    dimensionScores.outcome_correlation = this.calculateOutcomeScore(pattern, referenceContext);
    
    // 4. Market Regime Alignment Scoring
    dimensionScores.market_regime = this.calculateMarketRegimeScore(pattern, referenceContext);
    
    // 5. Volatility Environment Scoring
    dimensionScores.volatility_environment = this.calculateVolatilityScore(pattern, referenceContext);

    // Calculate weighted overall score
    const overallScore = this.calculateWeightedScore(dimensionScores);
    
    // Apply normalization factors
    const normalizedScore = this.applyNormalizationFactors(overallScore, pattern, referenceContext, metadata);
    
    // Calculate confidence intervals using pattern reliability and variance
    const confidenceIntervals = this.calculateConfidenceIntervals(normalizedScore, pattern, dimensionScores);

    return {
      overall_score: normalizedScore,
      dimension_scores: dimensionScores,
      confidence_intervals: confidenceIntervals,
      scoring_metadata: metadata
    };
  }

  /**
   * Score feature vector similarity
   */
  private static calculateFeatureScore(
    pattern: MarketPattern, 
    context: any
  ): number {
    if (!context.target_indicators) {
      return 0.5; // Neutral score when no reference indicators
    }

    const technicalIndicators = pattern.conditions.technical_indicators;
    const targetIndicators = context.target_indicators;
    
    let totalSimilarity = 0;
    let indicatorCount = 0;

    // Compare each technical indicator
    for (const [indicator, patternValue] of Object.entries(technicalIndicators)) {
      if (targetIndicators[indicator]) {
        const targetValue = targetIndicators[indicator];
        
        // Calculate similarity based on threshold alignment
        const thresholdSim = this.calculateThresholdSimilarity(patternValue, targetValue);
        const weightSim = Math.abs(patternValue.importance_weight - (targetValue.importance_weight || 0.5));
        
        const indicatorSimilarity = (thresholdSim * 0.7) + ((1 - weightSim) * 0.3);
        totalSimilarity += indicatorSimilarity;
        indicatorCount++;
      }
    }

    return indicatorCount > 0 ? totalSimilarity / indicatorCount : 0.3;
  }

  /**
   * Calculate threshold similarity between indicators
   */
  private static calculateThresholdSimilarity(indicator1: any, indicator2: any): number {
    if (indicator1.operator !== indicator2.operator) {
      return 0.2; // Low similarity for different operators
    }

    const threshold1 = indicator1.threshold;
    const threshold2 = indicator2.threshold;
    
    if (typeof threshold1 !== 'number' || typeof threshold2 !== 'number') {
      return 0.1;
    }

    // Calculate relative difference
    const maxThreshold = Math.max(Math.abs(threshold1), Math.abs(threshold2));
    if (maxThreshold === 0) return 1.0;
    
    const relativeDiff = Math.abs(threshold1 - threshold2) / maxThreshold;
    return Math.max(0, 1 - relativeDiff);
  }

  /**
   * Score temporal relevance with decay
   */
  private static calculateTemporalScore(
    pattern: MarketPattern,
    context: any
  ): number {
    const now = Date.now();
    const lastUpdated = new Date(pattern.learning_metrics.last_updated).getTime();
    const daysSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60 * 24);
    
    // Exponential decay based on recency
    const recencyScore = Math.exp(-this.NORMALIZATION_FACTORS.recency_decay * daysSinceUpdate);
    
    // Temporal constraints alignment
    const temporalConstraints = pattern.conditions.temporal_constraints;
    let constraintScore = 1.0;
    
    if (context.target_timeframe) {
      const targetHours = this.parseTimeframe(context.target_timeframe);
      const patternMinHours = temporalConstraints.min_duration_hours;
      const patternMaxHours = temporalConstraints.max_duration_hours;
      
      if (targetHours >= patternMinHours && targetHours <= patternMaxHours) {
        constraintScore = 1.0;
      } else {
        // Penalize if outside the pattern's time constraints
        const distanceFromRange = Math.min(
          Math.abs(targetHours - patternMinHours),
          Math.abs(targetHours - patternMaxHours)
        );
        constraintScore = Math.max(0.1, 1 - (distanceFromRange / targetHours));
      }
    }

    return (recencyScore * 0.6) + (constraintScore * 0.4);
  }

  /**
   * Parse timeframe string to hours
   */
  private static parseTimeframe(timeframe: string): number {
    const match = timeframe.match(/(\d+)([hdwmy])/i);
    if (!match || !match[1] || !match[2]) return 24; // Default to 1 day
    
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
   * Score outcome prediction capability
   */
  private static calculateOutcomeScore(
    pattern: MarketPattern,
    _context: any
  ): number {
    const outcomes = pattern.outcomes;
    
    // Base score from success rate
    const successScore = outcomes.success_rate;
    
    // Risk-adjusted return score
    const returnScore = outcomes.avg_return > 0 ? 
      Math.min(1.0, outcomes.avg_return / 0.1) : // Normalize to 10% return
      Math.max(0.0, 1 + (outcomes.avg_return / 0.05)); // Penalize negative returns
    
    // Volatility adjustment (prefer lower volatility for same returns)
    const volatilityPenalty = Math.min(0.3, outcomes.volatility / 0.2); // Normalize to 20% vol
    const volatilityScore = Math.max(0.1, 1 - volatilityPenalty);
    
    // Drawdown penalty
    const drawdownPenalty = Math.min(0.4, Math.abs(outcomes.max_drawdown) / 0.1); // Normalize to 10% drawdown
    const drawdownScore = Math.max(0.1, 1 - drawdownPenalty);
    
    // Time efficiency score
    const timeEfficiencyScore = outcomes.time_to_target > 0 ? 
      Math.max(0.1, 1 - (outcomes.time_to_target / (24 * 7))) : // Prefer patterns that resolve within a week
      0.5;

    return (successScore * 0.3) + (returnScore * 0.25) + (volatilityScore * 0.2) + 
           (drawdownScore * 0.15) + (timeEfficiencyScore * 0.1);
  }

  /**
   * Score market regime alignment
   */
  private static calculateMarketRegimeScore(
    pattern: MarketPattern,
    context: any
  ): number {
    if (!context.current_market_regime) {
      return 0.5; // Neutral score when regime unknown
    }

    const regimeDependence = pattern.learning_metrics.market_regime_dependence;
    const currentRegime = context.current_market_regime;
    
    // Direct regime score
    const directScore = regimeDependence[currentRegime] || 0.3;
    
    // Cross-regime adaptability (how well pattern works across regimes)
    const regimeValues = Object.values(regimeDependence);
    const regimeVariance = this.calculateVariance(regimeValues);
    const adaptabilityScore = Math.max(0.1, 1 - regimeVariance); // Lower variance = better adaptability
    
    return (directScore * 0.7) + (adaptabilityScore * 0.3);
  }

  /**
   * Score volatility environment alignment
   */
  private static calculateVolatilityScore(
    pattern: MarketPattern,
    context: any
  ): number {
    if (!context.current_volatility) {
      return 0.5; // Neutral score when volatility unknown
    }

    const patternVolatility = pattern.outcomes.volatility;
    const currentVolatility = context.current_volatility;
    
    // Volatility similarity score
    const volDifference = Math.abs(patternVolatility - currentVolatility);
    const maxVol = Math.max(patternVolatility, currentVolatility);
    const similarityScore = maxVol > 0 ? Math.max(0.1, 1 - (volDifference / maxVol)) : 1.0;
    
    // Volatility regime performance
    const volRegimeScore = this.getVolatilityRegimeScore(patternVolatility, currentVolatility, pattern);
    
    return (similarityScore * 0.6) + (volRegimeScore * 0.4);
  }

  /**
   * Calculate volatility regime performance score
   */
  private static getVolatilityRegimeScore(
    patternVol: number, 
    currentVol: number, 
    _pattern: MarketPattern
  ): number {
    const lowVolThreshold = 0.15;   // 15% annual volatility
    const highVolThreshold = 0.30;  // 30% annual volatility
    
    const patternRegime = this.classifyVolatilityRegime(patternVol, lowVolThreshold, highVolThreshold);
    const currentRegime = this.classifyVolatilityRegime(currentVol, lowVolThreshold, highVolThreshold);
    
    if (patternRegime === currentRegime) {
      return 1.0; // Perfect match
    } else if (Math.abs(patternRegime - currentRegime) === 1) {
      return 0.6; // Adjacent regime
    } else {
      return 0.2; // Opposite regime
    }
  }

  /**
   * Classify volatility into regime (0=low, 1=medium, 2=high)
   */
  private static classifyVolatilityRegime(vol: number, lowThreshold: number, highThreshold: number): number {
    if (vol < lowThreshold) return 0;
    if (vol > highThreshold) return 2;
    return 1;
  }

  /**
   * Calculate weighted overall score
   */
  private static calculateWeightedScore(dimensionScores: Record<string, number>): number {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const [dimension, score] of Object.entries(dimensionScores)) {
      const weight = this.SCORING_WEIGHTS[dimension as keyof typeof this.SCORING_WEIGHTS] || 0.1;
      weightedSum += score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  }

  /**
   * Apply normalization factors
   */
  private static applyNormalizationFactors(
    baseScore: number,
    pattern: MarketPattern,
    context: any,
    metadata: Record<string, any>
  ): number {
    let normalizedScore = baseScore;
    
    // Volume boost for high-volume patterns
    const observationCount = pattern.learning_metrics.observation_count;
    if (observationCount > 50) {
      const volumeBoost = Math.min(this.NORMALIZATION_FACTORS.volume_boost, 
                                   (observationCount - 50) / 200 * this.NORMALIZATION_FACTORS.volume_boost);
      normalizedScore += volumeBoost;
      metadata.volume_boost_applied = volumeBoost;
    }

    // Success amplification for reliable patterns
    const successRate = pattern.outcomes.success_rate;
    if (successRate > 0.7) {
      const amplification = (successRate - 0.7) * this.NORMALIZATION_FACTORS.success_amplification;
      normalizedScore *= (1 + amplification);
      metadata.success_amplification_applied = amplification;
    }

    // Uncertainty penalty for low-confidence patterns
    const reliability = pattern.learning_metrics.reliability_score;
    if (reliability < 0.6) {
      const penalty = (0.6 - reliability) * this.NORMALIZATION_FACTORS.uncertainty_penalty;
      normalizedScore *= (1 - penalty);
      metadata.uncertainty_penalty_applied = penalty;
    }

    return Math.max(0.01, Math.min(1.0, normalizedScore));
  }

  /**
   * Calculate confidence intervals for the score
   */
  private static calculateConfidenceIntervals(
    score: number,
    pattern: MarketPattern,
    dimensionScores: Record<string, number>
  ): { lower: number; upper: number } {
    // Calculate variance from dimension scores
    const scores = Object.values(dimensionScores);
    const variance = this.calculateVariance(scores);
    
    // Adjust confidence based on pattern reliability and observation count
    const reliability = pattern.learning_metrics.reliability_score;
    const observationCount = pattern.learning_metrics.observation_count;
    
    // Higher reliability and more observations = tighter confidence intervals
    const reliabilityFactor = Math.max(0.5, reliability);
    const observationFactor = Math.min(1.0, observationCount / 100);
    
    const confidenceAdjustment = Math.sqrt(variance) * (1 - reliabilityFactor) * (1 - observationFactor) * 0.2;
    
    return {
      lower: Math.max(0.01, score - confidenceAdjustment),
      upper: Math.min(1.0, score + confidenceAdjustment)
    };
  }

  /**
   * Calculate variance of an array of numbers
   */
  private static calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  /**
   * Batch score multiple patterns efficiently
   */
  static batchScorePatterns(
    patterns: MarketPattern[],
    referenceContext: any
  ): Array<{
    pattern_id: string;
    score_result: any;
  }> {
    return patterns.map(pattern => ({
      pattern_id: pattern.pattern_id,
      score_result: this.calculatePatternScore(pattern, referenceContext)
    }));
  }

  /**
   * Find top-scoring patterns based on multi-dimensional analysis
   */
  static findTopPatterns(
    patterns: MarketPattern[],
    referenceContext: any,
    topK: number = 10,
    minScore: number = 0.3
  ): Array<{
    pattern: MarketPattern;
    score_result: any;
    rank: number;
  }> {
    const scoredPatterns = this.batchScorePatterns(patterns, referenceContext)
      .map(scored => ({
        pattern: patterns.find(p => p.pattern_id === scored.pattern_id)!,
        score_result: scored.score_result
      }))
      .filter(item => item.score_result.overall_score >= minScore)
      .sort((a, b) => b.score_result.overall_score - a.score_result.overall_score)
      .slice(0, topK);

    return scoredPatterns.map((item, index) => ({
      ...item,
      rank: index + 1
    }));
  }
}

/**
 * Advanced Pattern Selection Engine
 * 
 * Implements intelligent pattern selection algorithms for consolidating
 * multiple patterns based on relevance, reliability, and market context.
 * Provides sophisticated ranking and filtering capabilities for optimal
 * pattern selection in real-time trading scenarios.
 */
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

/**
 * Memory Performance Optimization Engine
 * 
 * Implements advanced caching, memoization, and computational optimization
 * strategies for real-time trading operations. Provides significant performance
 * improvements for large pattern datasets while maintaining accuracy.
 */
export class MemoryOptimizationEngine {
  private static readonly CACHE_CONFIG = {
    similarity_cache_size: 10000,      // Maximum cached similarity calculations
    pattern_cache_ttl: 300000,         // Pattern cache TTL (5 minutes)
    score_cache_size: 5000,            // Maximum cached pattern scores
    consolidation_cache_size: 1000,    // Maximum cached consolidations
    cleanup_interval: 60000            // Cache cleanup interval (1 minute)
  };

  private static readonly OPTIMIZATION_SETTINGS = {
    batch_size: 100,                   // Optimal batch size for processing
    parallel_threshold: 50,            // Minimum patterns for parallel processing
    similarity_precision: 0.001,      // Similarity calculation precision
    early_termination_threshold: 0.95, // Early termination for high similarity
    memory_limit_mb: 500              // Memory usage limit
  };

  // Performance caches with LRU eviction
  private static similarityCache = new Map<string, { similarity: number; timestamp: number }>();
  private static patternScoreCache = new Map<string, { score: any; timestamp: number }>();
  private static consolidationCache = new Map<string, { result: MarketPattern; timestamp: number }>();
  
  // Performance metrics
  private static performanceMetrics = {
    cache_hits: 0,
    cache_misses: 0,
    total_calculations: 0,
    avg_calculation_time: 0,
    memory_usage_mb: 0
  };

  // Periodic cleanup timer
  private static cleanupTimer: NodeJS.Timeout | null = null;

  /**
   * Initialize optimization engine with periodic cleanup
   */
  static initializeOptimization(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cleanupTimer = setInterval(() => {
      this.performCacheCleanup();
    }, this.CACHE_CONFIG.cleanup_interval);
  }

  /**
   * Shutdown optimization engine
   */
  static shutdownOptimization(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clearAllCaches();
  }

  /**
   * Optimized pattern similarity calculation with caching
   */
  static calculateOptimizedSimilarity(pattern1: MarketPattern, pattern2: MarketPattern): number {
    const startTime = performance.now();
    
    // Create cache key (order-independent)
    const cacheKey = this.createSimilarityCacheKey(pattern1.pattern_id, pattern2.pattern_id);
    
    // Check cache first
    const cached = this.similarityCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_CONFIG.pattern_cache_ttl) {
      this.performanceMetrics.cache_hits++;
      return cached.similarity;
    }

    // Calculate similarity with optimizations
    const similarity = this.computeOptimizedSimilarity(pattern1, pattern2);
    
    // Cache result with LRU eviction
    this.cacheSimilarityResult(cacheKey, similarity);
    
    // Update performance metrics
    this.updatePerformanceMetrics(startTime);
    this.performanceMetrics.cache_misses++;
    
    return similarity;
  }

  /**
   * Batch process patterns with optimized performance
   */
  static batchProcessPatternsOptimized<T>(
    patterns: MarketPattern[],
    processor: (batch: MarketPattern[]) => T[],
    options?: {
      batch_size?: number;
      parallel?: boolean;
      progress_callback?: (processed: number, total: number) => void;
    }
  ): T[] {
    const batchSize = options?.batch_size || this.OPTIMIZATION_SETTINGS.batch_size;
    const useParallel = options?.parallel && patterns.length >= this.OPTIMIZATION_SETTINGS.parallel_threshold;
    
    const results: T[] = [];
    const batches: MarketPattern[][] = [];
    
    // Create batches
    for (let i = 0; i < patterns.length; i += batchSize) {
      batches.push(patterns.slice(i, i + batchSize));
    }

    if (useParallel) {
      // Parallel processing for large datasets
      // Note: In a real implementation, you'd use Worker threads or similar
      // For now, we'll process sequentially but with optimizations
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        if (batch) {
          const batchResults = processor(batch);
          results.push(...batchResults);
          options?.progress_callback?.((i + 1) * batchSize, patterns.length);
        }
      }
    } else {
      // Sequential processing with optimizations
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        if (batch) {
          const batchResults = processor(batch);
          results.push(...batchResults);
          options?.progress_callback?.((i + 1) * batchSize, patterns.length);
        }
      }
    }

    return results;
  }

  /**
   * Optimized pattern scoring with caching and early termination
   */
  static scorePatternOptimized(
    pattern: MarketPattern,
    context: any,
    criteria: any
  ): any {
    const cacheKey = this.createScoreCacheKey(pattern.pattern_id, context, criteria);
    
    // Check score cache
    const cached = this.patternScoreCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_CONFIG.pattern_cache_ttl) {
      this.performanceMetrics.cache_hits++;
      return cached.score;
    }

    // Calculate score with optimizations
    const scoreResult = PatternScoringEngine.calculatePatternScore(pattern, context);
    
    // Apply early termination for obviously poor patterns
    if (scoreResult.overall_score < 0.1) {
      const earlyResult = {
        overall_score: scoreResult.overall_score,
        dimension_scores: { early_terminated: true },
        confidence_intervals: { lower: 0, upper: 0.2 },
        scoring_metadata: { early_termination: true }
      };
      
      this.cacheScoreResult(cacheKey, earlyResult);
      return earlyResult;
    }

    // Cache full result
    this.cacheScoreResult(cacheKey, scoreResult);
    this.performanceMetrics.cache_misses++;
    
    return scoreResult;
  }

  /**
   * Optimized pattern consolidation with intelligent caching
   */
  static consolidatePatternsOptimized(patterns: MarketPattern[]): MarketPattern {
    if (patterns.length === 0) {
      throw new Error('Cannot consolidate empty pattern array');
    }
    
    if (patterns.length === 1) {
      const firstPattern = patterns[0];
      if (!firstPattern) {
        throw new Error('Pattern array contains undefined values');
      }
      return firstPattern;
    }

    // Create consolidation cache key
    const cacheKey = this.createConsolidationCacheKey(patterns);
    
    // Check consolidation cache
    const cached = this.consolidationCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_CONFIG.pattern_cache_ttl) {
      this.performanceMetrics.cache_hits++;
      return cached.result;
    }

    // Perform optimized consolidation
    const startTime = performance.now();
    
    // Pre-filter patterns for efficiency
    const filteredPatterns = patterns.filter(p => 
      p && p.learning_metrics.reliability_score >= 0.3 && 
      p.learning_metrics.observation_count >= 3
    );

    if (filteredPatterns.length === 0) {
      const firstPattern = patterns[0];
      if (!firstPattern) {
        throw new Error('No valid patterns for consolidation');
      }
      return firstPattern; // Fallback to first pattern
    }

    // Use optimized merging
    const consolidated = MemoryUtils.mergePatterns(filteredPatterns);
    
    // Cache result
    this.cacheConsolidationResult(cacheKey, consolidated);
    this.updatePerformanceMetrics(startTime);
    
    return consolidated;
  }

  /**
   * Memory-efficient similarity matrix calculation
   */
  static calculateSimilarityMatrixOptimized(
    patterns: MarketPattern[],
    options?: {
      symmetric?: boolean;
      sparse_threshold?: number;
      max_comparisons?: number;
    }
  ): Map<string, Map<string, number>> {
    const symmetric = options?.symmetric ?? true;
    const sparseThreshold = options?.sparse_threshold ?? 0.1;
    const maxComparisons = options?.max_comparisons ?? 50000;
    
    const matrix = new Map<string, Map<string, number>>();
    let comparisons = 0;

    for (let i = 0; i < patterns.length && comparisons < maxComparisons; i++) {
      const pattern1 = patterns[i];
      if (!pattern1) continue;
      
      const row = new Map<string, number>();
      matrix.set(pattern1.pattern_id, row);

      const startJ = symmetric ? i + 1 : 0;
      for (let j = startJ; j < patterns.length && comparisons < maxComparisons; j++) {
        const pattern2 = patterns[j];
        if (!pattern2 || i === j) continue;

        const similarity = this.calculateOptimizedSimilarity(pattern1, pattern2);
        comparisons++;

        // Only store if above sparse threshold
        if (similarity >= sparseThreshold) {
          row.set(pattern2.pattern_id, similarity);
          
          // Store symmetric entry if needed
          if (symmetric) {
            let symmetricRow = matrix.get(pattern2.pattern_id);
            if (!symmetricRow) {
              symmetricRow = new Map();
              matrix.set(pattern2.pattern_id, symmetricRow);
            }
            symmetricRow.set(pattern1.pattern_id, similarity);
          }
        }
      }
    }

    return matrix;
  }

  /**
   * Get performance statistics
   */
  static getPerformanceStats(): {
    cache_hit_ratio: number;
    total_calculations: number;
    avg_calculation_time_ms: number;
    memory_usage_mb: number;
    cache_sizes: Record<string, number>;
  } {
    const totalRequests = this.performanceMetrics.cache_hits + this.performanceMetrics.cache_misses;
    const hitRatio = totalRequests > 0 ? this.performanceMetrics.cache_hits / totalRequests : 0;

    return {
      cache_hit_ratio: hitRatio,
      total_calculations: this.performanceMetrics.total_calculations,
      avg_calculation_time_ms: this.performanceMetrics.avg_calculation_time,
      memory_usage_mb: this.estimateMemoryUsage(),
      cache_sizes: {
        similarity_cache: this.similarityCache.size,
        score_cache: this.patternScoreCache.size,
        consolidation_cache: this.consolidationCache.size
      }
    };
  }

  /**
   * Private helper methods
   */
  private static createSimilarityCacheKey(id1: string, id2: string): string {
    // Create order-independent cache key
    return id1 < id2 ? `${id1}:${id2}` : `${id2}:${id1}`;
  }

  private static createScoreCacheKey(patternId: string, context: any, criteria: any): string {
    const contextHash = this.hashObject(context);
    const criteriaHash = this.hashObject(criteria);
    return `score:${patternId}:${contextHash}:${criteriaHash}`;
  }

  private static createConsolidationCacheKey(patterns: MarketPattern[]): string {
    const sortedIds = patterns.map(p => p.pattern_id).sort();
    return `consolidation:${sortedIds.join(':')}`;
  }

  private static hashObject(obj: any): string {
    // Simple hash function for objects
    const str = JSON.stringify(obj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private static computeOptimizedSimilarity(pattern1: MarketPattern, pattern2: MarketPattern): number {
    // Use the existing similarity calculation but with optimizations
    try {
      // Fast pre-screening
      if (pattern1.pattern_type !== pattern2.pattern_type) {
        return 0.0; // Different types are automatically dissimilar
      }

      // Check for obvious high similarity cases
      if (pattern1.pattern_id === pattern2.pattern_id) {
        return 1.0;
      }

      // Use the standard calculation with precision limit
      const similarity = MemoryUtils.calculatePatternSimilarity(pattern1, pattern2);
      
      // Round to precision to improve cache efficiency
      return Math.round(similarity / this.OPTIMIZATION_SETTINGS.similarity_precision) * this.OPTIMIZATION_SETTINGS.similarity_precision;
      
    } catch (_error) {
      return 0.0;
    }
  }

  private static cacheSimilarityResult(cacheKey: string, similarity: number): void {
    // Implement LRU eviction
    if (this.similarityCache.size >= this.CACHE_CONFIG.similarity_cache_size) {
      this.evictOldestCacheEntry(this.similarityCache);
    }
    
    this.similarityCache.set(cacheKey, {
      similarity,
      timestamp: Date.now()
    });
  }

  private static cacheScoreResult(cacheKey: string, score: any): void {
    if (this.patternScoreCache.size >= this.CACHE_CONFIG.score_cache_size) {
      this.evictOldestCacheEntry(this.patternScoreCache);
    }
    
    this.patternScoreCache.set(cacheKey, {
      score,
      timestamp: Date.now()
    });
  }

  private static cacheConsolidationResult(cacheKey: string, result: MarketPattern): void {
    if (this.consolidationCache.size >= this.CACHE_CONFIG.consolidation_cache_size) {
      this.evictOldestCacheEntry(this.consolidationCache);
    }
    
    this.consolidationCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
  }

  private static evictOldestCacheEntry(cache: Map<string, { timestamp: number; [key: string]: any }>): void {
    let oldestKey = '';
    let oldestTimestamp = Date.now();
    
    for (const [key, value] of cache.entries()) {
      if (value.timestamp < oldestTimestamp) {
        oldestTimestamp = value.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }

  private static performCacheCleanup(): void {
    const now = Date.now();
    const ttl = this.CACHE_CONFIG.pattern_cache_ttl;
    
    // Clean similarity cache
    for (const [key, value] of this.similarityCache.entries()) {
      if (now - value.timestamp > ttl) {
        this.similarityCache.delete(key);
      }
    }
    
    // Clean score cache
    for (const [key, value] of this.patternScoreCache.entries()) {
      if (now - value.timestamp > ttl) {
        this.patternScoreCache.delete(key);
      }
    }
    
    // Clean consolidation cache
    for (const [key, value] of this.consolidationCache.entries()) {
      if (now - value.timestamp > ttl) {
        this.consolidationCache.delete(key);
      }
    }
  }

  private static clearAllCaches(): void {
    this.similarityCache.clear();
    this.patternScoreCache.clear();
    this.consolidationCache.clear();
    
    // Reset performance metrics
    this.performanceMetrics = {
      cache_hits: 0,
      cache_misses: 0,
      total_calculations: 0,
      avg_calculation_time: 0,
      memory_usage_mb: 0
    };
  }

  private static updatePerformanceMetrics(startTime: number): void {
    const duration = performance.now() - startTime;
    this.performanceMetrics.total_calculations++;
    
    // Update rolling average
    const currentAvg = this.performanceMetrics.avg_calculation_time;
    const count = this.performanceMetrics.total_calculations;
    this.performanceMetrics.avg_calculation_time = ((currentAvg * (count - 1)) + duration) / count;
  }

  private static estimateMemoryUsage(): number {
    // Rough estimation of cache memory usage
    const similarityCacheSize = this.similarityCache.size * 100; // ~100 bytes per entry
    const scoreCacheSize = this.patternScoreCache.size * 500; // ~500 bytes per entry
    const consolidationCacheSize = this.consolidationCache.size * 2000; // ~2KB per entry
    
    return (similarityCacheSize + scoreCacheSize + consolidationCacheSize) / (1024 * 1024); // Convert to MB
  }
}

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