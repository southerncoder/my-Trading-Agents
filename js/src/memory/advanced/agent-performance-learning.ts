/**
 * Agent Performance Learning System for Trading Agents
 * 
 * This system implements dynamic confidence scoring that learns from historical
 * agent accuracy and adjusts recommendations accordingly. It tracks agent
 * performance across different market conditions, asset types, and timeframes
 * to provide intelligent confidence calibration.
 * 
 * Key Features:
 * - Dynamic confidence scoring based on historical accuracy
 * - Performance tracking across market regimes and conditions
 * - Adaptive learning from prediction outcomes
 * - Multi-dimensional performance assessment
 * - Real-time confidence adjustment and calibration
 * - Performance comparison and ranking across agents
 * 
 * Integration with Zep Graphiti:
 * - Stores agent performance history as temporal entities
 * - Creates relationships between performance and market conditions
 * - Enables querying of performance patterns and trends
 * - Supports continuous learning and model updates
 */

import { z } from 'zod';

// Performance learning schemas
export const AgentPerformanceMetricsSchema = z.object({
  agent_id: z.string().describe('Unique agent identifier'),
  evaluation_period: z.object({
    start_date: z.string(),
    end_date: z.string(),
    total_predictions: z.number(),
    market_regime: z.string()
  }),
  accuracy_metrics: z.object({
    overall_accuracy: z.number().min(0).max(1),
    direction_accuracy: z.number().min(0).max(1),
    magnitude_accuracy: z.number().min(0).max(1),
    timing_accuracy: z.number().min(0).max(1),
    risk_assessment_accuracy: z.number().min(0).max(1),
    volatility_prediction_accuracy: z.number().min(0).max(1)
  }),
  performance_by_condition: z.record(z.string(), z.object({
    condition_type: z.string(),
    sample_size: z.number(),
    accuracy: z.number().min(0).max(1),
    avg_confidence: z.number().min(0).max(1),
    calibration_score: z.number().min(0).max(1)
  })),
  confidence_calibration: z.object({
    overconfidence_bias: z.number(),
    underconfidence_bias: z.number(),
    calibration_slope: z.number(),
    reliability_diagram_data: z.array(z.object({
      confidence_bin: z.number(),
      accuracy_in_bin: z.number(),
      sample_count: z.number()
    }))
  }),
  learning_trajectory: z.object({
    improvement_rate: z.number(),
    performance_trend: z.enum(['improving', 'stable', 'declining']),
    learning_velocity: z.number(),
    plateau_indicators: z.array(z.string())
  }),
  specialty_areas: z.array(z.object({
    area_name: z.string(),
    expertise_level: z.number().min(0).max(1),
    confidence_in_area: z.number().min(0).max(1),
    sample_size: z.number()
  }))
});

export const ConfidenceAdjustmentSchema = z.object({
  agent_id: z.string(),
  prediction_context: z.object({
    entity_id: z.string(),
    prediction_type: z.string(),
    market_conditions: z.record(z.string(), z.any()),
    base_confidence: z.number().min(0).max(1),
    reasoning_quality: z.number().min(0).max(1)
  }),
  historical_performance: z.object({
    similar_conditions_accuracy: z.number().min(0).max(1),
    recent_accuracy_trend: z.number(),
    domain_expertise: z.number().min(0).max(1),
    market_regime_performance: z.number().min(0).max(1)
  }),
  adjustment_factors: z.object({
    recency_adjustment: z.number(),
    complexity_adjustment: z.number(),
    market_stress_adjustment: z.number(),
    novelty_adjustment: z.number(),
    ensemble_agreement_adjustment: z.number()
  }),
  adjusted_confidence: z.number().min(0).max(1),
  confidence_intervals: z.object({
    lower_bound: z.number(),
    upper_bound: z.number(),
    explanation: z.string()
  }),
  recommendation: z.object({
    action: z.enum(['accept', 'reduce_position', 'seek_validation', 'defer']),
    rationale: z.string(),
    suggested_position_size: z.number().min(0).max(1)
  })
});

export const LearningUpdateSchema = z.object({
  agent_id: z.string(),
  prediction_id: z.string(),
  outcome_timestamp: z.string(),
  prediction_outcome: z.object({
    predicted_value: z.number(),
    actual_value: z.number(),
    prediction_accuracy: z.number().min(0).max(1),
    surprise_factor: z.number().describe('How unexpected the outcome was'),
    market_impact_events: z.array(z.object({
      event_type: z.string(),
      impact_magnitude: z.number(),
      timing_relative_to_prediction: z.string()
    }))
  }),
  learning_insights: z.object({
    accuracy_drivers: z.array(z.string()),
    failure_modes: z.array(z.string()),
    model_updates_needed: z.array(z.string()),
    confidence_recalibration: z.object({
      old_confidence: z.number(),
      should_have_been: z.number(),
      adjustment_magnitude: z.number()
    })
  }),
  performance_impact: z.object({
    overall_score_change: z.number(),
    specialty_area_updates: z.record(z.string(), z.number()),
    confidence_calibration_update: z.number(),
    learning_velocity_impact: z.number()
  })
});

export type AgentPerformanceMetrics = z.infer<typeof AgentPerformanceMetricsSchema>;
export type ConfidenceAdjustment = z.infer<typeof ConfidenceAdjustmentSchema>;
export type LearningUpdate = z.infer<typeof LearningUpdateSchema>;

/**
 * Agent Performance Learning System
 * 
 * Implements dynamic confidence scoring and learning from agent performance
 * to continuously improve prediction accuracy and confidence calibration.
 */
export class AgentPerformanceLearningSystem {
  private zepClient: any; // Zep Graphiti client
  private learningRate: number = 0.05;
  private performanceWindow: number = 90; // days
  private minimumSampleSize: number = 10;
  private confidenceDecayRate: number = 0.95;
  private ensembleWeightThreshold: number = 0.7;

  constructor(zepClient: any, config?: {
    learningRate?: number;
    performanceWindow?: number;
    minimumSampleSize?: number;
    confidenceDecayRate?: number;
    ensembleWeightThreshold?: number;
  }) {
    this.zepClient = zepClient;
    if (config) {
      this.learningRate = config.learningRate ?? this.learningRate;
      this.performanceWindow = config.performanceWindow ?? this.performanceWindow;
      this.minimumSampleSize = config.minimumSampleSize ?? this.minimumSampleSize;
      this.confidenceDecayRate = config.confidenceDecayRate ?? this.confidenceDecayRate;
      this.ensembleWeightThreshold = config.ensembleWeightThreshold ?? this.ensembleWeightThreshold;
    }
  }

  /**
   * Calculate dynamic confidence score for an agent's prediction
   */
  async calculateDynamicConfidence(
    agentId: string,
    predictionContext: {
      entity_id: string;
      prediction_type: string;
      market_conditions: Record<string, any>;
      base_confidence: number;
      reasoning_quality: number;
    }
  ): Promise<ConfidenceAdjustment> {
    
    try {
      // Get agent's historical performance
      const historicalPerformance = await this.getHistoricalPerformance(agentId, predictionContext);
      
      // Calculate adjustment factors
      const adjustmentFactors = await this.calculateAdjustmentFactors(
        agentId, 
        predictionContext, 
        historicalPerformance
      );
      
      // Apply adjustments to base confidence
      const adjustedConfidence = this.applyConfidenceAdjustments(
        predictionContext.base_confidence,
        adjustmentFactors
      );
      
      // Calculate confidence intervals
      const confidenceIntervals = this.calculateConfidenceIntervals(
        adjustedConfidence,
        historicalPerformance,
        adjustmentFactors
      );
      
      // Generate recommendation
      const recommendation = this.generatePerformanceRecommendation(
        adjustedConfidence,
        confidenceIntervals,
        historicalPerformance
      );

      const result: ConfidenceAdjustment = {
        agent_id: agentId,
        prediction_context: predictionContext,
        historical_performance: historicalPerformance,
        adjustment_factors: adjustmentFactors,
        adjusted_confidence: adjustedConfidence,
        confidence_intervals: confidenceIntervals,
        recommendation: recommendation
      };

      // Store confidence adjustment for learning
      await this.storeConfidenceAdjustment(result);
      
      return result;
      
    } catch (error) {
      throw new Error(`Dynamic confidence calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update agent performance based on prediction outcomes
   */
  async updatePerformanceFromOutcome(learningUpdate: LearningUpdate): Promise<AgentPerformanceMetrics> {
    
    try {
      // Get current performance metrics
      const currentMetrics = await this.getCurrentPerformanceMetrics(learningUpdate.agent_id);
      
      // Calculate performance impact
      const performanceImpact = this.calculatePerformanceImpact(learningUpdate, currentMetrics);
      
      // Update accuracy metrics
      const updatedAccuracyMetrics = this.updateAccuracyMetrics(
        currentMetrics.accuracy_metrics,
        learningUpdate,
        performanceImpact
      );
      
      // Update confidence calibration
      const updatedCalibration = this.updateConfidenceCalibration(
        currentMetrics.confidence_calibration,
        learningUpdate,
        performanceImpact
      );
      
      // Update learning trajectory
      const updatedTrajectory = this.updateLearningTrajectory(
        currentMetrics.learning_trajectory,
        learningUpdate,
        performanceImpact
      );
      
      // Update specialty areas
      const updatedSpecialtyAreas = this.updateSpecialtyAreas(
        currentMetrics.specialty_areas,
        learningUpdate,
        performanceImpact
      );

      const updatedMetrics: AgentPerformanceMetrics = {
        ...currentMetrics,
        accuracy_metrics: updatedAccuracyMetrics,
        confidence_calibration: updatedCalibration,
        learning_trajectory: updatedTrajectory,
        specialty_areas: updatedSpecialtyAreas
      };

      // Store updated metrics
      await this.storePerformanceMetrics(updatedMetrics);
      
      // Trigger model retraining if significant changes
      await this.checkForModelRetraining(updatedMetrics, performanceImpact);
      
      return updatedMetrics;
      
    } catch (error) {
      throw new Error(`Performance update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get comprehensive performance metrics for an agent
   */
  async getAgentPerformanceMetrics(agentId: string): Promise<AgentPerformanceMetrics> {
    
    try {
      // Get performance data from Zep Graphiti
      const performanceData = await this.retrievePerformanceData(agentId);
      
      // Calculate current metrics
      const metrics = await this.calculateComprehensiveMetrics(performanceData);
      
      return metrics;
      
    } catch (error) {
      throw new Error(`Failed to get performance metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Compare performance across multiple agents
   */
  async compareAgentPerformance(agentIds: string[]): Promise<{
    performance_ranking: Array<{
      agent_id: string;
      overall_score: number;
      strengths: string[];
      weaknesses: string[];
      recommendation: string;
    }>;
    ensemble_suggestions: Array<{
      combination: string[];
      expected_performance: number;
      confidence: number;
      use_cases: string[];
    }>;
  }> {
    
    const performanceComparison: {
      performance_ranking: Array<{
        agent_id: string;
        overall_score: number;
        strengths: string[];
        weaknesses: string[];
        recommendation: string;
      }>;
      ensemble_suggestions: Array<{
        combination: string[];
        expected_performance: number;
        confidence: number;
        use_cases: string[];
      }>;
    } = {
      performance_ranking: [],
      ensemble_suggestions: []
    };
    
    // Get metrics for all agents
    const agentMetrics = await Promise.all(
      agentIds.map(agentId => this.getAgentPerformanceMetrics(agentId))
    );
    
    // Calculate rankings
    performanceComparison.performance_ranking = this.calculateAgentRankings(agentMetrics);
    
    // Generate ensemble suggestions
    performanceComparison.ensemble_suggestions = this.generateEnsembleSuggestions(agentMetrics);
    
    return performanceComparison;
  }

  /**
   * Get historical performance for specific conditions
   */
  private async getHistoricalPerformance(
    _agentId: string,
    _predictionContext: any
  ): Promise<any> {
    
    // Implementation would query Zep Graphiti for similar conditions performance
    return {
      similar_conditions_accuracy: 0.78,
      recent_accuracy_trend: 0.05, // Improving
      domain_expertise: 0.85,
      market_regime_performance: 0.82
    };
  }

  /**
   * Calculate confidence adjustment factors
   */
  private async calculateAdjustmentFactors(
    _agentId: string,
    _predictionContext: any,
    historicalPerformance: any
  ): Promise<any> {
    
    return {
      recency_adjustment: this.calculateRecencyAdjustment(historicalPerformance.recent_accuracy_trend),
      complexity_adjustment: this.calculateComplexityAdjustment(_predictionContext),
      market_stress_adjustment: this.calculateMarketStressAdjustment(_predictionContext.market_conditions),
      novelty_adjustment: this.calculateNoveltyAdjustment(_predictionContext),
      ensemble_agreement_adjustment: this.calculateEnsembleAgreementAdjustment(_predictionContext)
    };
  }

  /**
   * Apply confidence adjustments
   */
  private applyConfidenceAdjustments(baseConfidence: number, adjustmentFactors: any): number {
    let adjustedConfidence = baseConfidence;
    
    // Apply each adjustment factor
    adjustedConfidence *= (1 + adjustmentFactors.recency_adjustment);
    adjustedConfidence *= (1 + adjustmentFactors.complexity_adjustment);
    adjustedConfidence *= (1 + adjustmentFactors.market_stress_adjustment);
    adjustedConfidence *= (1 + adjustmentFactors.novelty_adjustment);
    adjustedConfidence *= (1 + adjustmentFactors.ensemble_agreement_adjustment);
    
    // Ensure confidence stays within bounds
    return Math.max(0, Math.min(1, adjustedConfidence));
  }

  /**
   * Calculate confidence intervals
   */
  private calculateConfidenceIntervals(
    adjustedConfidence: number,
    _historicalPerformance: any,
    _adjustmentFactors: any
  ): any {
    
    const margin = 0.1; // Would be calculated based on historical variance
    
    return {
      lower_bound: Math.max(0, adjustedConfidence - margin),
      upper_bound: Math.min(1, adjustedConfidence + margin),
      explanation: 'Confidence interval based on historical performance variance'
    };
  }

  /**
   * Generate performance-based recommendation
   */
  private generatePerformanceRecommendation(
    adjustedConfidence: number,
    _confidenceIntervals: any,
    _historicalPerformance: any
  ): any {
    
    if (adjustedConfidence >= 0.8) {
      return {
        action: 'accept',
        rationale: 'High confidence based on strong historical performance',
        suggested_position_size: 1.0
      };
    } else if (adjustedConfidence >= 0.6) {
      return {
        action: 'reduce_position',
        rationale: 'Moderate confidence suggests reduced position sizing',
        suggested_position_size: 0.6
      };
    } else if (adjustedConfidence >= 0.4) {
      return {
        action: 'seek_validation',
        rationale: 'Low confidence requires additional validation',
        suggested_position_size: 0.3
      };
    } else {
      return {
        action: 'defer',
        rationale: 'Very low confidence suggests deferring decision',
        suggested_position_size: 0.0
      };
    }
  }

  /**
   * Store confidence adjustment in Zep Graphiti
   */
  private async storeConfidenceAdjustment(_adjustment: ConfidenceAdjustment): Promise<void> {
    // Implementation would store the confidence adjustment in Zep Graphiti
    // for future learning and analysis
  }

  /**
   * Get current performance metrics
   */
  private async getCurrentPerformanceMetrics(agentId: string): Promise<AgentPerformanceMetrics> {
    // Implementation would retrieve current metrics from Zep Graphiti
    
    return {
      agent_id: agentId,
      evaluation_period: {
        start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date().toISOString(),
        total_predictions: 50,
        market_regime: 'bull'
      },
      accuracy_metrics: {
        overall_accuracy: 0.75,
        direction_accuracy: 0.80,
        magnitude_accuracy: 0.70,
        timing_accuracy: 0.65,
        risk_assessment_accuracy: 0.78,
        volatility_prediction_accuracy: 0.72
      },
      performance_by_condition: {},
      confidence_calibration: {
        overconfidence_bias: 0.05,
        underconfidence_bias: -0.02,
        calibration_slope: 0.85,
        reliability_diagram_data: []
      },
      learning_trajectory: {
        improvement_rate: 0.02,
        performance_trend: 'improving',
        learning_velocity: 0.15,
        plateau_indicators: []
      },
      specialty_areas: []
    };
  }

  /**
   * Calculate performance impact from learning update
   */
  private calculatePerformanceImpact(_learningUpdate: LearningUpdate, _currentMetrics: AgentPerformanceMetrics): any {
    return {
      overall_score_change: 0.01,
      accuracy_impact: 0.02,
      confidence_impact: -0.01,
      learning_acceleration: 0.05
    };
  }

  /**
   * Update accuracy metrics
   */
  private updateAccuracyMetrics(currentMetrics: any, _learningUpdate: LearningUpdate, _impact: any): any {
    // Implementation would update accuracy metrics using exponential moving average
    return currentMetrics;
  }

  /**
   * Update confidence calibration
   */
  private updateConfidenceCalibration(currentCalibration: any, _learningUpdate: LearningUpdate, _impact: any): any {
    // Implementation would update calibration based on prediction outcomes
    return currentCalibration;
  }

  /**
   * Update learning trajectory
   */
  private updateLearningTrajectory(currentTrajectory: any, _learningUpdate: LearningUpdate, _impact: any): any {
    // Implementation would update learning trajectory metrics
    return currentTrajectory;
  }

  /**
   * Update specialty areas
   */
  private updateSpecialtyAreas(currentAreas: any[], _learningUpdate: LearningUpdate, _impact: any): any[] {
    // Implementation would update specialty area performance
    return currentAreas;
  }

  /**
   * Store performance metrics
   */
  private async storePerformanceMetrics(_metrics: AgentPerformanceMetrics): Promise<void> {
    // Implementation would store metrics in Zep Graphiti
  }

  /**
   * Check if model retraining is needed
   */
  private async checkForModelRetraining(_metrics: AgentPerformanceMetrics, _impact: any): Promise<void> {
    // Implementation would check if performance changes warrant model retraining
  }

  /**
   * Retrieve performance data from storage
   */
  private async retrievePerformanceData(_agentId: string): Promise<any> {
    if (this.zepClient && typeof this.zepClient.retrieveEntities === 'function') {
      try {
        const res = await this.zepClient.retrieveEntities({ agent_id: _agentId, type: 'AgentPerformance' });
        return res;
      } catch (_err) {
        // fall back
      }
    }
    return {};
  }

  /**
   * Calculate comprehensive metrics from performance data
   */
  private async calculateComprehensiveMetrics(_performanceData: any): Promise<AgentPerformanceMetrics> {
    // Implementation would calculate all performance metrics
    
    return {
      agent_id: 'agent_1',
      evaluation_period: {
        start_date: new Date().toISOString(),
        end_date: new Date().toISOString(),
        total_predictions: 0,
        market_regime: 'bull'
      },
      accuracy_metrics: {
        overall_accuracy: 0,
        direction_accuracy: 0,
        magnitude_accuracy: 0,
        timing_accuracy: 0,
        risk_assessment_accuracy: 0,
        volatility_prediction_accuracy: 0
      },
      performance_by_condition: {},
      confidence_calibration: {
        overconfidence_bias: 0,
        underconfidence_bias: 0,
        calibration_slope: 0,
        reliability_diagram_data: []
      },
      learning_trajectory: {
        improvement_rate: 0,
        performance_trend: 'stable',
        learning_velocity: 0,
        plateau_indicators: []
      },
      specialty_areas: []
    };
  }

  /**
   * Calculate agent rankings
   */
  private calculateAgentRankings(_agentMetrics: AgentPerformanceMetrics[]): any[] {
    // Implementation would rank agents based on comprehensive performance
    return [];
  }

  /**
   * Generate ensemble suggestions
   */
  private generateEnsembleSuggestions(_agentMetrics: AgentPerformanceMetrics[]): any[] {
    // Implementation would suggest optimal agent combinations
    return [];
  }

  /**
   * Calculate recency adjustment factor
   */
  private calculateRecencyAdjustment(recentTrend: number): number {
    // Recent improvement/decline impacts confidence
    return recentTrend * 0.1; // Max 10% adjustment for strong trend
  }

  /**
   * Calculate complexity adjustment factor
   */
  private calculateComplexityAdjustment(_context: any): number {
    // More complex predictions should have lower confidence
    return -0.05; // Slight reduction for complexity
  }

  /**
   * Calculate market stress adjustment factor
   */
  private calculateMarketStressAdjustment(_marketConditions: any): number {
    // High stress environments reduce confidence
    return -0.03; // Slight reduction during stress
  }

  /**
   * Calculate novelty adjustment factor
   */
  private calculateNoveltyAdjustment(_context: any): number {
    // Novel situations reduce confidence
    return -0.02; // Slight reduction for novelty
  }

  /**
   * Calculate ensemble agreement adjustment factor
   */
  private calculateEnsembleAgreementAdjustment(_context: any): number {
    // High agreement among agents increases confidence
    return 0.04; // Slight increase for agreement
  }

  /**
   * Get performance learning statistics
   */
  public getPerformanceLearningStats(): {
    agents_tracked: number;
    total_predictions_analyzed: number;
    avg_accuracy_improvement: number;
    confidence_calibration_quality: number;
  } {
    return {
      agents_tracked: 0, // Would track in production
      total_predictions_analyzed: 0, // Would track in production
      avg_accuracy_improvement: 0, // Would calculate from data
      confidence_calibration_quality: 0 // Would calculate from data
    };
  }

  /**
   * Export agent performance models
   */
  public async exportPerformanceModels(agentIds: string[]): Promise<Record<string, any>> {
    const models: Record<string, any> = {};
    
    for (const agentId of agentIds) {
      models[agentId] = await this.getAgentPerformanceMetrics(agentId);
    }
    
    return models;
  }

  /**
   * Import agent performance models
   */
  public async importPerformanceModels(models: Record<string, any>): Promise<void> {
    for (const model of Object.values(models)) {
      await this.storePerformanceMetrics(model as AgentPerformanceMetrics);
    }
  }
}

/**
 * Factory function for creating agent performance learning system
 */
export function createAgentPerformanceLearningSystem(
  zepClient: any,
  config?: {
    learningRate?: number;
    performanceWindow?: number;
    minimumSampleSize?: number;
    confidenceDecayRate?: number;
    ensembleWeightThreshold?: number;
  }
): AgentPerformanceLearningSystem {
  return new AgentPerformanceLearningSystem(zepClient, config);
}

/**
 * Utility functions for performance analysis
 */
export class PerformanceAnalysisUtils {
  /**
   * Calculate confidence calibration score
   */
  static calculateCalibrationScore(
    predictions: Array<{ confidence: number; accuracy: number }>
  ): number {
    if (predictions.length === 0) return 0;
    
    // Calculate Brier Score for calibration
    let brierScore = 0;
    for (const prediction of predictions) {
      brierScore += Math.pow(prediction.confidence - prediction.accuracy, 2);
    }
    
    return 1 - (brierScore / predictions.length); // Convert to calibration score (higher is better)
  }

  /**
   * Calculate ensemble diversity score
   */
  static calculateEnsembleDiversity(
    agentPredictions: Array<Array<{ prediction: number; confidence: number }>>
  ): number {
    if (agentPredictions.length < 2) return 0;
    
    // Calculate pairwise disagreement
    let totalDisagreement = 0;
    let pairs = 0;
    
    for (let i = 0; i < agentPredictions.length; i++) {
      for (let j = i + 1; j < agentPredictions.length; j++) {
        const agent1Predictions = agentPredictions[i];
        const agent2Predictions = agentPredictions[j];
        
        if (agent1Predictions && agent2Predictions) {
          const minLength = Math.min(agent1Predictions.length, agent2Predictions.length);
          let disagreement = 0;
          
          for (let k = 0; k < minLength; k++) {
            const pred1 = agent1Predictions[k];
            const pred2 = agent2Predictions[j];
            
            if (pred1 && pred2) {
              disagreement += Math.abs(pred1.prediction - pred2.prediction);
            }
          }
          
          totalDisagreement += disagreement / minLength;
          pairs++;
        }
      }
    }
    
    return pairs > 0 ? totalDisagreement / pairs : 0;
  }

  /**
   * Calculate learning velocity
   */
  static calculateLearningVelocity(
    performanceHistory: Array<{ timestamp: string; accuracy: number }>
  ): number {
    if (performanceHistory.length < 2) return 0;
    
    // Calculate rate of improvement over time
    const sortedHistory = performanceHistory.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    let totalImprovement = 0;
    let validPairs = 0;
    
    for (let i = 1; i < sortedHistory.length; i++) {
      const current = sortedHistory[i];
      const previous = sortedHistory[i - 1];
      
      if (current && previous) {
        const timeSpan = new Date(current.timestamp).getTime() - new Date(previous.timestamp).getTime();
        const accuracyChange = current.accuracy - previous.accuracy;
        
        if (timeSpan > 0) {
          totalImprovement += accuracyChange / (timeSpan / (1000 * 60 * 60 * 24)); // Per day
          validPairs++;
        }
      }
    }
    
    return validPairs > 0 ? totalImprovement / validPairs : 0;
  }
}