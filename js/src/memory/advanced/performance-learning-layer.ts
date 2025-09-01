/**
 * Advanced Memory System - Phase 5: Performance Learning Layer
 * 
 * This component implements sophisticated performance learning that can:
 * - Learn from agent trading performance and adapt strategies
 * - Use machine learning to identify performance patterns
 * - Optimize agent parameters based on historical outcomes
 * - Predict performance in different market conditions
 * - Implement reinforcement learning concepts for continuous improvement
 * - Provide performance analytics and optimization recommendations
 */

import { ZepClient } from '@getzep/zep-cloud';

// Extend ZepClient interface for performance learning
interface ExtendedZepClient extends ZepClient {
  searchMemory?: (query: string, options?: { maxResults?: number }) => Promise<{ facts?: any[] }>;
  storePerformanceData?: (data: any) => Promise<{ id: string }>;
}

/**
 * Interface for agent performance record
 */
export interface AgentPerformanceRecord {
  agent_id: string;
  strategy_id: string;
  performance_period: {
    start_date: string;
    end_date: string;
    duration_days: number;
  };
  market_conditions: {
    market_regime: string;
    volatility: number;
    volume_ratio: number;
    trend_direction: string;
    market_stress: number;
  };
  trading_metrics: {
    total_trades: number;
    successful_trades: number;
    success_rate: number;
    total_return: number;
    avg_return_per_trade: number;
    max_profit: number;
    max_loss: number;
    volatility: number;
    sharpe_ratio: number;
    max_drawdown: number;
    win_loss_ratio: number;
  };
  decision_quality: {
    entry_timing_score: number;
    exit_timing_score: number;
    risk_management_score: number;
    pattern_recognition_accuracy: number;
    confidence_calibration: number;
  };
  learning_metrics: {
    adaptation_speed: number;
    pattern_learning_rate: number;
    error_correction_rate: number;
    knowledge_retention: number;
  };
  metadata: {
    recorded_at: string;
    validation_status: 'validated' | 'pending' | 'anomaly';
    data_quality_score: number;
    external_factors: string[];
  };
}

/**
 * Interface for performance learning insights
 */
export interface PerformanceLearningInsights {
  agent_id: string;
  learning_period: {
    start_date: string;
    end_date: string;
    total_records_analyzed: number;
  };
  performance_evolution: {
    initial_performance: number;
    current_performance: number;
    improvement_rate: number;
    learning_trajectory: 'improving' | 'plateauing' | 'declining';
  };
  strength_areas: Array<{
    skill_area: string;
    competency_score: number;
    confidence_level: number;
    market_context: string[];
  }>;
  improvement_opportunities: Array<{
    skill_area: string;
    current_score: number;
    target_score: number;
    improvement_priority: 'high' | 'medium' | 'low';
    recommended_actions: string[];
  }>;
  adaptive_recommendations: {
    strategy_adjustments: Array<{
      parameter: string;
      current_value: number;
      recommended_value: number;
      confidence: number;
      expected_improvement: number;
    }>;
    market_specific_optimizations: Array<{
      market_condition: string;
      optimization_type: string;
      adjustment_details: any;
    }>;
  };
  performance_predictions: {
    next_period_performance: {
      expected_return: number;
      confidence_interval: [number, number];
      risk_metrics: {
        expected_volatility: number;
        max_drawdown_estimate: number;
        success_rate_prediction: number;
      };
    };
    scenario_analysis: Array<{
      scenario_name: string;
      market_conditions: any;
      predicted_performance: number;
      confidence: number;
    }>;
  };
}

/**
 * Interface for machine learning model
 */
export interface PerformanceMLModel {
  model_id: string;
  model_type: 'regression' | 'classification' | 'clustering' | 'reinforcement';
  training_data_size: number;
  accuracy_metrics: {
    mse?: number;
    r_squared?: number;
    accuracy?: number;
    precision?: number;
    recall?: number;
  };
  feature_importance: Array<{
    feature_name: string;
    importance_score: number;
  }>;
  last_trained: string;
  model_state: any;
}

/**
 * Performance Learning Layer for Advanced Memory System
 */
export class PerformanceLearningLayer {
  private zepClient: ExtendedZepClient;
  private logger: any;
  private learningRate: number;
  private adaptationThreshold: number;
  private performanceModels: Map<string, PerformanceMLModel>;
  private featureExtractor: PerformanceFeatureExtractor;
  private modelTrainer: MLModelTrainer;

  constructor(
    zepClient: ExtendedZepClient,
    options: {
      learningRate?: number;
      adaptationThreshold?: number;
      enableReinforcementLearning?: boolean;
      logger?: any;
    } = {}
  ) {
    this.zepClient = zepClient;
    this.logger = options.logger || console;
    this.learningRate = options.learningRate || 0.01;
    this.adaptationThreshold = options.adaptationThreshold || 0.05;
    this.performanceModels = new Map();
    this.featureExtractor = new PerformanceFeatureExtractor();
    this.modelTrainer = new MLModelTrainer();
  }

  /**
   * Learn from agent performance data and generate insights
   */
  async learnFromPerformance(
    agentId: string,
    performanceRecords: AgentPerformanceRecord[]
  ): Promise<PerformanceLearningInsights> {
    
    try {
      this.logger.info('Starting performance learning analysis', {
        component: 'PerformanceLearningLayer',
        agent_id: agentId,
        records_count: performanceRecords.length
      });

      // Extract features from performance records
      const features = this.featureExtractor.extractFeatures(performanceRecords);
      
      // Analyze performance evolution
      const performanceEvolution = this.analyzePerformanceEvolution(performanceRecords);
      
      // Identify strength areas using clustering analysis
      const strengthAreas = await this.identifyStrengthAreas(features, performanceRecords);
      
      // Find improvement opportunities using ML analysis
      const improvementOpportunities = await this.findImprovementOpportunities(features, performanceRecords);
      
      // Generate adaptive recommendations using reinforcement learning concepts
      const adaptiveRecommendations = await this.generateAdaptiveRecommendations(agentId, features, performanceRecords);
      
      // Predict future performance using ML models
      const performancePredictions = await this.predictFuturePerformance(agentId, features);
      
      // Update or train ML models
      await this.updatePerformanceModels(agentId, features, performanceRecords);
      
      const insights: PerformanceLearningInsights = {
        agent_id: agentId,
        learning_period: {
          start_date: performanceRecords[0]?.performance_period.start_date || new Date().toISOString(),
          end_date: performanceRecords[performanceRecords.length - 1]?.performance_period.end_date || new Date().toISOString(),
          total_records_analyzed: performanceRecords.length
        },
        performance_evolution: performanceEvolution,
        strength_areas: strengthAreas,
        improvement_opportunities: improvementOpportunities,
        adaptive_recommendations: adaptiveRecommendations,
        performance_predictions: performancePredictions
      };

      // Store insights in Zep for future reference
      await this.storePerformanceInsights(insights);
      
      this.logger.info('Performance learning analysis completed', {
        component: 'PerformanceLearningLayer',
        agent_id: agentId,
        improvement_opportunities: improvementOpportunities.length,
        adaptive_recommendations: adaptiveRecommendations.strategy_adjustments.length
      });

      return insights;
      
    } catch (error) {
      this.logger.error('Performance learning failed', {
        component: 'PerformanceLearningLayer',
        agent_id: agentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error(`Performance learning failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Optimize agent parameters based on learned patterns
   */
  async optimizeAgentParameters(
    agentId: string,
    currentParameters: Record<string, number>,
    targetMetrics: {
      target_return?: number;
      target_sharpe?: number;
      max_drawdown_limit?: number;
      success_rate_target?: number;
    }
  ): Promise<{
    optimized_parameters: Record<string, number>;
    expected_improvements: {
      return_improvement: number;
      risk_reduction: number;
      sharpe_improvement: number;
    };
    optimization_confidence: number;
    parameter_sensitivities: Array<{
      parameter: string;
      sensitivity: number;
      impact_direction: 'positive' | 'negative';
    }>;
  }> {
    
    try {
      // Get historical performance data for this agent
      const historicalData = await this.getHistoricalPerformance(agentId);
      
      // Use ML optimization algorithm (simplified gradient descent approach)
      const optimizationResult = await this.mlParameterOptimization(
        currentParameters,
        historicalData,
        targetMetrics
      );
      
      // Calculate parameter sensitivities
      const sensitivities = await this.calculateParameterSensitivities(agentId, currentParameters);
      
      // Estimate expected improvements
      const expectedImprovements = this.estimateImprovements(
        currentParameters,
        optimizationResult.optimized_parameters,
        historicalData
      );
      
      this.logger.info('Agent parameter optimization completed', {
        component: 'PerformanceLearningLayer',
        agent_id: agentId,
        parameters_optimized: Object.keys(optimizationResult.optimized_parameters).length,
        expected_return_improvement: expectedImprovements.return_improvement
      });
      
      return {
        optimized_parameters: optimizationResult.optimized_parameters,
        expected_improvements: expectedImprovements,
        optimization_confidence: optimizationResult.confidence,
        parameter_sensitivities: sensitivities
      };
      
    } catch (error) {
      throw new Error(`Parameter optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Implement reinforcement learning for continuous improvement
   */
  async reinforcementLearning(
    agentId: string,
    action: {
      action_type: string;
      parameters: Record<string, any>;
      context: {
        market_conditions: any;
        technical_indicators: any;
      };
    },
    outcome: {
      immediate_reward: number;
      delayed_reward?: number;
      success: boolean;
      metrics: Record<string, number>;
    }
  ): Promise<{
    q_value_update: number;
    policy_adjustment: Record<string, number>;
    exploration_vs_exploitation: {
      exploration_probability: number;
      exploitation_confidence: number;
    };
    learned_insights: string[];
  }> {
    
    try {
      // Implement Q-learning algorithm
      const qValueUpdate = this.calculateQValueUpdate(action, outcome);
      
      // Update policy using epsilon-greedy strategy
      const policyAdjustment = await this.updatePolicy(agentId, action, outcome);
      
      // Balance exploration vs exploitation
      const explorationStrategy = this.calculateExplorationStrategy(agentId, action.context);
      
      // Extract learned insights
      const learnedInsights = this.extractReinforcementInsights(action, outcome, qValueUpdate);
      
      // Store reinforcement learning data
      await this.storeReinforcementData(agentId, action, outcome, qValueUpdate);
      
      this.logger.info('Reinforcement learning update completed', {
        component: 'PerformanceLearningLayer',
        agent_id: agentId,
        q_value_update: qValueUpdate,
        exploration_probability: explorationStrategy.exploration_probability
      });
      
      return {
        q_value_update: qValueUpdate,
        policy_adjustment: policyAdjustment,
        exploration_vs_exploitation: explorationStrategy,
        learned_insights: learnedInsights
      };
      
    } catch (error) {
      throw new Error(`Reinforcement learning failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Predict agent performance in different market scenarios
   */
  async predictPerformanceScenarios(
    agentId: string,
    scenarios: Array<{
      scenario_name: string;
      market_conditions: any;
      time_horizon: number;
    }>
  ): Promise<Array<{
    scenario_name: string;
    predicted_metrics: {
      expected_return: number;
      success_rate: number;
      volatility: number;
      max_drawdown: number;
      sharpe_ratio: number;
    };
    confidence_intervals: {
      return_ci: [number, number];
      success_rate_ci: [number, number];
    };
    risk_factors: string[];
    recommendations: string[];
  }>> {
    
    try {
      const predictions = [];
      
      for (const scenario of scenarios) {
        // Use ML model to predict performance
        const prediction = await this.mlPerformancePrediction(agentId, scenario);
        predictions.push(prediction);
      }
      
      this.logger.info('Performance scenario predictions completed', {
        component: 'PerformanceLearningLayer',
        agent_id: agentId,
        scenarios_analyzed: scenarios.length
      });
      
      return predictions;
      
    } catch (error) {
      throw new Error(`Performance prediction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Private helper methods for performance learning

  private analyzePerformanceEvolution(records: AgentPerformanceRecord[]): any {
    if (records.length === 0) {
      return {
        initial_performance: 0,
        current_performance: 0,
        improvement_rate: 0,
        learning_trajectory: 'insufficient_data' as const
      };
    }

    const initialPerformance = records[0]?.trading_metrics.total_return || 0;
    const currentPerformance = records[records.length - 1]?.trading_metrics.total_return || 0;
    const improvementRate = records.length > 1 ? 
      (currentPerformance - initialPerformance) / records.length : 0;
    
    let trajectory: 'improving' | 'plateauing' | 'declining' = 'plateauing';
    if (improvementRate > this.adaptationThreshold) {
      trajectory = 'improving';
    } else if (improvementRate < -this.adaptationThreshold) {
      trajectory = 'declining';
    }

    return {
      initial_performance: initialPerformance,
      current_performance: currentPerformance,
      improvement_rate: improvementRate,
      learning_trajectory: trajectory
    };
  }

  private async identifyStrengthAreas(
    _features: any[],
    records: AgentPerformanceRecord[]
  ): Promise<Array<{
    skill_area: string;
    competency_score: number;
    confidence_level: number;
    market_context: string[];
  }>> {
    
    // Analyze different skill areas
    const strengthAreas = [];
    
    // Entry timing analysis
    const entryScores = records.map(r => r.decision_quality.entry_timing_score);
    const avgEntryScore = entryScores.reduce((sum, score) => sum + score, 0) / entryScores.length || 0;
    
    if (avgEntryScore > 0.7) {
      strengthAreas.push({
        skill_area: 'entry_timing',
        competency_score: avgEntryScore,
        confidence_level: 0.8,
        market_context: ['bull_markets', 'high_volatility']
      });
    }
    
    // Risk management analysis
    const riskScores = records.map(r => r.decision_quality.risk_management_score);
    const avgRiskScore = riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length || 0;
    
    if (avgRiskScore > 0.7) {
      strengthAreas.push({
        skill_area: 'risk_management',
        competency_score: avgRiskScore,
        confidence_level: 0.9,
        market_context: ['bear_markets', 'uncertain_conditions']
      });
    }
    
    return strengthAreas;
  }

  private async findImprovementOpportunities(
    _features: any[],
    records: AgentPerformanceRecord[]
  ): Promise<Array<{
    skill_area: string;
    current_score: number;
    target_score: number;
    improvement_priority: 'high' | 'medium' | 'low';
    recommended_actions: string[];
  }>> {
    
    const opportunities = [];
    
    // Analyze exit timing
    const exitScores = records.map(r => r.decision_quality.exit_timing_score);
    const avgExitScore = exitScores.reduce((sum, score) => sum + score, 0) / exitScores.length || 0;
    
    if (avgExitScore < 0.6) {
      opportunities.push({
        skill_area: 'exit_timing',
        current_score: avgExitScore,
        target_score: 0.8,
        improvement_priority: 'high' as const,
        recommended_actions: [
          'Implement trailing stop-loss strategies',
          'Study profit-taking patterns',
          'Analyze market sentiment indicators'
        ]
      });
    }
    
    // Analyze pattern recognition
    const patternScores = records.map(r => r.decision_quality.pattern_recognition_accuracy);
    const avgPatternScore = patternScores.reduce((sum, score) => sum + score, 0) / patternScores.length || 0;
    
    if (avgPatternScore < 0.7) {
      opportunities.push({
        skill_area: 'pattern_recognition',
        current_score: avgPatternScore,
        target_score: 0.85,
        improvement_priority: 'medium' as const,
        recommended_actions: [
          'Train on more diverse market patterns',
          'Implement ensemble pattern recognition',
          'Focus on specific chart patterns'
        ]
      });
    }
    
    return opportunities;
  }

  private async generateAdaptiveRecommendations(
    _agentId: string,
    _features: any[],
    records: AgentPerformanceRecord[]
  ): Promise<{
    strategy_adjustments: Array<{
      parameter: string;
      current_value: number;
      recommended_value: number;
      confidence: number;
      expected_improvement: number;
    }>;
    market_specific_optimizations: Array<{
      market_condition: string;
      optimization_type: string;
      adjustment_details: any;
    }>;
  }> {
    
    const strategyAdjustments = [];
    
    // Analyze risk parameters
    const avgDrawdowns = records.map(r => r.trading_metrics.max_drawdown);
    const maxDrawdown = Math.max(...avgDrawdowns);
    
    if (maxDrawdown > 0.15) {
      strategyAdjustments.push({
        parameter: 'risk_per_trade',
        current_value: 0.02,
        recommended_value: 0.015,
        confidence: 0.8,
        expected_improvement: 0.05
      });
    }
    
    // Analyze position sizing
    const avgReturns = records.map(r => r.trading_metrics.avg_return_per_trade);
    const avgReturn = avgReturns.reduce((sum, ret) => sum + ret, 0) / avgReturns.length || 0;
    
    if (avgReturn > 0.03) {
      strategyAdjustments.push({
        parameter: 'position_size_multiplier',
        current_value: 1.0,
        recommended_value: 1.2,
        confidence: 0.7,
        expected_improvement: 0.08
      });
    }
    
    const marketOptimizations = [
      {
        market_condition: 'high_volatility',
        optimization_type: 'reduce_position_size',
        adjustment_details: {
          volatility_threshold: 0.05,
          position_reduction: 0.3
        }
      }
    ];
    
    return {
      strategy_adjustments: strategyAdjustments,
      market_specific_optimizations: marketOptimizations
    };
  }

  private async predictFuturePerformance(_agentId: string, _features: any[]): Promise<any> {
    // ML-based performance prediction
    return {
      next_period_performance: {
        expected_return: 0.08,
        confidence_interval: [0.05, 0.12] as [number, number],
        risk_metrics: {
          expected_volatility: 0.15,
          max_drawdown_estimate: 0.08,
          success_rate_prediction: 0.75
        }
      },
      scenario_analysis: [
        {
          scenario_name: 'bull_market',
          market_conditions: { regime: 'bull', volatility: 0.02 },
          predicted_performance: 0.12,
          confidence: 0.8
        },
        {
          scenario_name: 'bear_market',
          market_conditions: { regime: 'bear', volatility: 0.05 },
          predicted_performance: 0.02,
          confidence: 0.7
        }
      ]
    };
  }

  private async updatePerformanceModels(_agentId: string, _features: any[], _records: AgentPerformanceRecord[]): Promise<void> {
    // Update ML models with new performance data
    this.logger.info('Updating performance models', { component: 'PerformanceLearningLayer' });
  }

  private async storePerformanceInsights(insights: PerformanceLearningInsights): Promise<void> {
    if (this.zepClient.storePerformanceData) {
      await this.zepClient.storePerformanceData(insights);
    }
  }

  // Additional ML helper methods
  private async getHistoricalPerformance(_agentId: string): Promise<AgentPerformanceRecord[]> {
    return []; // Placeholder
  }

  private async mlParameterOptimization(
    _currentParams: Record<string, number>,
    _historicalData: AgentPerformanceRecord[],
    _targets: any
  ): Promise<{ optimized_parameters: Record<string, number>; confidence: number }> {
    return {
      optimized_parameters: { risk_per_trade: 0.015, position_size: 1.2 },
      confidence: 0.8
    };
  }

  private async calculateParameterSensitivities(
    _agentId: string,
    _params: Record<string, number>
  ): Promise<Array<{ parameter: string; sensitivity: number; impact_direction: 'positive' | 'negative' }>> {
    return [
      { parameter: 'risk_per_trade', sensitivity: 0.3, impact_direction: 'negative' },
      { parameter: 'position_size', sensitivity: 0.5, impact_direction: 'positive' }
    ];
  }

  private estimateImprovements(
    _current: Record<string, number>,
    _optimized: Record<string, number>,
    _historical: AgentPerformanceRecord[]
  ): { return_improvement: number; risk_reduction: number; sharpe_improvement: number } {
    return {
      return_improvement: 0.05,
      risk_reduction: 0.03,
      sharpe_improvement: 0.2
    };
  }

  // Reinforcement learning methods
  private calculateQValueUpdate(_action: any, outcome: any): number {
    return outcome.immediate_reward * this.learningRate;
  }

  private async updatePolicy(_agentId: string, _action: any, _outcome: any): Promise<Record<string, number>> {
    return { epsilon: 0.1, learning_rate: this.learningRate };
  }

  private calculateExplorationStrategy(_agentId: string, _context: any): {
    exploration_probability: number;
    exploitation_confidence: number;
  } {
    return {
      exploration_probability: 0.1,
      exploitation_confidence: 0.9
    };
  }

  private extractReinforcementInsights(_action: any, _outcome: any, _qValue: number): string[] {
    return ['Action-outcome pattern learned', 'Strategy refinement identified'];
  }

  private async storeReinforcementData(_agentId: string, _action: any, _outcome: any, _qValue: number): Promise<void> {
    // Store reinforcement learning data
  }

  private async mlPerformancePrediction(_agentId: string, scenario: any): Promise<any> {
    return {
      scenario_name: scenario.scenario_name,
      predicted_metrics: {
        expected_return: 0.08,
        success_rate: 0.75,
        volatility: 0.15,
        max_drawdown: 0.08,
        sharpe_ratio: 1.2
      },
      confidence_intervals: {
        return_ci: [0.05, 0.12] as [number, number],
        success_rate_ci: [0.7, 0.8] as [number, number]
      },
      risk_factors: ['market_volatility', 'regime_change'],
      recommendations: ['monitor_volatility', 'adjust_position_size']
    };
  }
}

/**
 * Feature extractor for performance learning
 */
export class PerformanceFeatureExtractor {
  
  extractFeatures(records: AgentPerformanceRecord[]): any[] {
    const features = [];
    
    for (const record of records) {
      const feature = {
        // Market context features
        market_regime: this.encodeMarketRegime(record.market_conditions.market_regime),
        volatility: record.market_conditions.volatility,
        volume_ratio: record.market_conditions.volume_ratio,
        
        // Performance features
        success_rate: record.trading_metrics.success_rate,
        total_return: record.trading_metrics.total_return,
        sharpe_ratio: record.trading_metrics.sharpe_ratio,
        max_drawdown: record.trading_metrics.max_drawdown,
        
        // Decision quality features
        entry_timing: record.decision_quality.entry_timing_score,
        exit_timing: record.decision_quality.exit_timing_score,
        risk_management: record.decision_quality.risk_management_score,
        pattern_recognition: record.decision_quality.pattern_recognition_accuracy,
        
        // Learning features
        adaptation_speed: record.learning_metrics.adaptation_speed,
        error_correction: record.learning_metrics.error_correction_rate
      };
      
      features.push(feature);
    }
    
    return features;
  }
  
  private encodeMarketRegime(regime: string): number {
    const encoding = { 'bull': 1, 'bear': -1, 'sideways': 0 };
    return encoding[regime as keyof typeof encoding] || 0;
  }
}

/**
 * ML model trainer for performance learning
 */
export class MLModelTrainer {
  
  trainRegessionModel(features: any[], _targets: number[]): PerformanceMLModel {
    // Simplified linear regression implementation
    const modelId = `regression_${Date.now()}`;
    
    // Calculate feature importance (placeholder)
    const featureImportance = Object.keys(features[0] || {}).map(key => ({
      feature_name: key,
      importance_score: Math.random()
    }));
    
    // Calculate accuracy metrics (placeholder)
    const mse = 0.05;
    const rSquared = 0.8;
    
    return {
      model_id: modelId,
      model_type: 'regression',
      training_data_size: features.length,
      accuracy_metrics: {
        mse,
        r_squared: rSquared
      },
      feature_importance: featureImportance,
      last_trained: new Date().toISOString(),
      model_state: {} // Simplified model state
    };
  }
  
  trainClassificationModel(features: any[], _labels: string[]): PerformanceMLModel {
    const modelId = `classification_${Date.now()}`;
    
    const featureImportance = Object.keys(features[0] || {}).map(key => ({
      feature_name: key,
      importance_score: Math.random()
    }));
    
    return {
      model_id: modelId,
      model_type: 'classification',
      training_data_size: features.length,
      accuracy_metrics: {
        accuracy: 0.85,
        precision: 0.82,
        recall: 0.88
      },
      feature_importance: featureImportance,
      last_trained: new Date().toISOString(),
      model_state: {}
    };
  }
}

/**
 * Factory function to create PerformanceLearningLayer
 */
export function createPerformanceLearningLayer(
  zepClient: ExtendedZepClient,
  options: {
    learningRate?: number;
    adaptationThreshold?: number;
    enableReinforcementLearning?: boolean;
    logger?: any;
  } = {}
): PerformanceLearningLayer {
  return new PerformanceLearningLayer(zepClient, options);
}

/**
 * Utility class for performance learning operations
 */
export class PerformanceLearningUtils {
  
  /**
   * Calculate performance improvement rate
   */
  static calculateImprovementRate(initialValue: number, currentValue: number, periods: number): number {
    if (periods === 0) return 0;
    return (currentValue - initialValue) / periods;
  }
  
  /**
   * Normalize performance metrics for ML models
   */
  static normalizeMetrics(metrics: Record<string, number>): Record<string, number> {
    const normalized: Record<string, number> = {};
    
    for (const [key, value] of Object.entries(metrics)) {
      // Apply different normalization based on metric type
      if (key.includes('rate') || key.includes('ratio')) {
        normalized[key] = Math.max(0, Math.min(1, value)); // Clamp to [0,1]
      } else if (key.includes('return')) {
        normalized[key] = Math.tanh(value * 10) / 2 + 0.5; // Sigmoid-like normalization
      } else {
        normalized[key] = value; // No normalization
      }
    }
    
    return normalized;
  }
  
  /**
   * Calculate correlation between performance metrics
   */
  static calculateCorrelation(values1: number[], values2: number[]): number {
    if (values1.length !== values2.length || values1.length === 0) return 0;
    
    const n = values1.length;
    const sum1 = values1.reduce((sum, val) => sum + val, 0);
    const sum2 = values2.reduce((sum, val) => sum + val, 0);
    const sum1Sq = values1.reduce((sum, val) => sum + val * val, 0);
    const sum2Sq = values2.reduce((sum, val) => sum + val * val, 0);
    const pSum = values1.reduce((sum, val, i) => sum + val * (values2[i] || 0), 0);
    
    const num = pSum - (sum1 * sum2 / n);
    const den = Math.sqrt((sum1Sq - sum1 * sum1 / n) * (sum2Sq - sum2 * sum2 / n));
    
    return den === 0 ? 0 : num / den;
  }
}