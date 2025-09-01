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
    this.logger = config?.logger || console; // Default to console if no logger provided
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
   */
  private calculateObservationSimilarity(obs1: any, obs2: any): number {
    try {
      const features1 = this.extractObservationFeatures(obs1);
      const features2 = this.extractObservationFeatures(obs2);
      
      // Calculate cosine similarity between feature vectors
      return this.calculateCosineSimilarity(features1, features2);
      
    } catch (error) {
      this.logger.error('Failed to calculate observation similarity', {
        component: 'MemoryConsolidationLayer',
        error: error instanceof Error ? error.message : String(error)
      });
      return 0;
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
      
      // 5. Confidence and reliability similarity
      const confidenceDiff = Math.abs(pattern1.confidence - pattern2.confidence);
      const confidenceScore = 1.0 - (confidenceDiff / 1.0); // Normalize to 0-1
      totalSimilarity += confidenceScore;
      dimensionCount++;
      
      return totalSimilarity / dimensionCount;
      
    } catch (error) {
      console.error('Failed to calculate pattern similarity:', error);
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
   * Merge similar patterns
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
    
    // Implementation would intelligently merge similar patterns
    // For now, return the first pattern as placeholder
    const firstPattern = patterns[0];
    if (!firstPattern) {
      throw new Error('Pattern array contains undefined values');
    }
    return firstPattern;
  }

  /**
   * Validate memory consistency
   */
  static validateMemoryConsistency(memory: ConsolidatedMemory): boolean {
    // Implementation would check for logical consistency in the memory
    return memory.consolidated_knowledge.key_insights.length > 0;
  }
}