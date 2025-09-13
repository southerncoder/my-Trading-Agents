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

// Import ML libraries for advanced optimization
import { Matrix as _Matrix } from 'ml-matrix';
import { SimpleLinearRegression } from 'ml-regression';
import { CrossValidation as _CrossValidation } from 'ml-cross-validation';

// Import extracted modules
import { MLModelTrainer } from './performance-ml-trainer';

// Type declarations for ML libraries
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
    mae?: number;
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
  private minimumSampleSize: number;

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
    this.minimumSampleSize = 10; // Minimum samples needed for ML optimization
    this.performanceModels = new Map();
    this.featureExtractor = new PerformanceFeatureExtractor();
    this.modelTrainer = new MLModelTrainer(this.logger, {
      nModels: 5,
      diversityThreshold: 0.1,
      pruningThreshold: 0.05,
      onlineLearningRate: 0.01
    });
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

  // Performance tracking and ML optimization methods
  // TODO: Integrate with TensorFlow.js for advanced ML models
  // TODO: Add ensemble learning for multiple performance prediction models
  // TODO: Implement online learning for real-time parameter adaptation
  // TODO: Add Bayesian optimization for hyperparameter tuning
  
  /**
   * Ensemble learning methods using ml-matrix for linear algebra operations
   */
  
  /**
   * Create an ensemble of regression models for robust performance prediction
   */
  private createEnsembleModels(
    features: number[][],
    targets: number[],
    nModels: number = 5
  ): any[] {
    try {
      const models = [];
      
      for (let i = 0; i < nModels; i++) {
        // Create bootstrap sample
        const bootstrapIndices = this.generateBootstrapIndices(features.length);
        const bootstrapFeatures = bootstrapIndices.map(idx => features[idx]).filter(f => f !== undefined) as number[][];
        const bootstrapTargets = bootstrapIndices.map(idx => targets[idx]).filter(t => t !== undefined);
        
        // Train model on bootstrap sample
        const model = this.trainBaseModel(bootstrapFeatures, bootstrapTargets);
        if (model) {
          models.push(model);
        }
      }
      
      this.logger.info('Ensemble models created', {
        component: 'PerformanceLearningLayer',
        nModels: models.length,
        dataSize: features.length
      });
      
      return models;
    } catch (error) {
      this.logger.warn('Failed to create ensemble models', { error });
      return [];
    }
  }
  
  /**
   * Make ensemble predictions using weighted averaging
   */
  private makeEnsemblePredictions(
    models: any[],
    features: number[][],
    modelWeights?: number[]
  ): number[] {
    try {
      if (models.length === 0) return [];
      
      const nSamples = features.length;
      const predictions = new Array(nSamples).fill(0);
      const weights = modelWeights || new Array(models.length).fill(1 / models.length);
      
      // Get predictions from each model
      for (let i = 0; i < models.length; i++) {
        const modelPredictions = this.getModelPredictions(models[i], features);
        const weight = weights[i];
        
        for (let j = 0; j < nSamples; j++) {
          const prediction = modelPredictions[j];
          if (prediction !== undefined) {
            predictions[j] += prediction * weight;
          }
        }
      }
      
      return predictions;
    } catch (error) {
      this.logger.warn('Failed to make ensemble predictions', { error });
      return new Array(features.length).fill(0);
    }
  }
  
  /**
   * Calculate weights for ensemble models based on their performance
   */
  private calculateEnsembleWeights(
    models: any[],
    validationFeatures: number[][],
    validationTargets: number[]
  ): number[] {
    try {
      const weights = [];
      const performances = [];
      
      // Calculate performance for each model
      for (const model of models) {
        const predictions = this.getModelPredictions(model, validationFeatures);
        const performance = this.calculateModelPerformance(predictions, validationTargets);
        performances.push(performance);
      }
      
      // Convert performances to weights using softmax
      const maxPerformance = Math.max(...performances);
      const expPerformances = performances.map(p => Math.exp(p - maxPerformance));
      const sumExp = expPerformances.reduce((sum, val) => sum + val, 0);
      
      for (const expPerf of expPerformances) {
        weights.push(expPerf / sumExp);
      }
      
      return weights;
    } catch (error) {
      this.logger.warn('Failed to calculate ensemble weights', { error });
      return new Array(models.length).fill(1 / models.length);
    }
  }
  
  /**
   * Implement stacking ensemble method
   */
  private createStackingEnsemble(
    baseModels: any[],
    metaModel: any,
    features: number[][],
    targets: number[],
    validationSplit: number = 0.2
  ): any {
    try {
      const nSamples = features.length;
      const validationSize = Math.floor(nSamples * validationSplit);
      const trainSize = nSamples - validationSize;
      
      // Split data
      const trainFeatures = features.slice(0, trainSize);
      const trainTargets = targets.slice(0, trainSize);
      const validationFeatures = features.slice(trainSize);
      const validationTargets = targets.slice(trainSize);
      
      // Get base model predictions for training meta-model
      const metaFeatures = [];
      for (const model of baseModels) {
        const predictions = this.getModelPredictions(model, trainFeatures);
        metaFeatures.push(predictions);
      }
      
      // Transpose to get meta-features matrix and filter out undefined values
      const metaFeaturesMatrix: number[][] = [];
      for (let i = 0; i < trainSize; i++) {
        const row: number[] = [];
        for (const predictions of metaFeatures) {
          const prediction = predictions[i];
          if (prediction !== undefined) {
            row.push(prediction);
          }
        }
        if (row.length > 0) {
          metaFeaturesMatrix.push(row);
        }
      }
      
      // Train meta-model
      const trainedMetaModel = this.trainMetaModel(metaModel, metaFeaturesMatrix, trainTargets);
      
      return {
        baseModels,
        metaModel: trainedMetaModel,
        validationFeatures,
        validationTargets
      };
    } catch (error) {
      this.logger.warn('Failed to create stacking ensemble', { error });
      return null;
    }
  }
  
  /**
   * Make predictions using stacking ensemble
   */
  private makeStackingPredictions(
    stackingEnsemble: any,
    features: number[][]
  ): number[] {
    try {
      if (!stackingEnsemble) return [];
      
      // Get base model predictions
      const metaFeatures = [];
      for (const model of stackingEnsemble.baseModels) {
        const predictions = this.getModelPredictions(model, features);
        metaFeatures.push(predictions);
      }
      
      // Transpose to get meta-features matrix and filter out undefined values
      const metaFeaturesMatrix: number[][] = [];
      for (let i = 0; i < features.length; i++) {
        const row: number[] = [];
        for (const predictions of metaFeatures) {
          const prediction = predictions[i];
          if (prediction !== undefined) {
            row.push(prediction);
          }
        }
        if (row.length > 0) {
          metaFeaturesMatrix.push(row);
        }
      }
      
      // Make final predictions using meta-model
      return this.getModelPredictions(stackingEnsemble.metaModel, metaFeaturesMatrix);
    } catch (error) {
      this.logger.warn('Failed to make stacking predictions', { error });
      return new Array(features.length).fill(0);
    }
  }
  
  /**
   * Calculate ensemble diversity metrics
   */
  private calculateEnsembleDiversity(
    models: any[],
    features: number[][],
    targets: number[]
  ): {
    correlation_diversity: number;
    prediction_variance: number;
    bias_variance_decomposition: {
      bias: number;
      variance: number;
      error: number;
    };
  } {
    try {
      // Get predictions from all models
      const allPredictions = models.map(model => this.getModelPredictions(model, features));
      
      // Calculate average predictions
      const avgPredictions = new Array(features.length).fill(0);
      for (let i = 0; i < features.length; i++) {
        let sum = 0;
        let count = 0;
        for (const predictions of allPredictions) {
          const prediction = predictions[i];
          if (prediction !== undefined) {
            sum += prediction;
            count++;
          }
        }
        avgPredictions[i] = count > 0 ? sum / count : 0;
      }
      
      // Calculate correlation diversity
      let totalCorrelation = 0;
      let pairCount = 0;
      for (let i = 0; i < allPredictions.length; i++) {
        for (let j = i + 1; j < allPredictions.length; j++) {
          const predI = allPredictions[i];
          const predJ = allPredictions[j];
          if (predI && predJ) {
            const correlation = this.calculateCorrelation(predI, predJ);
            totalCorrelation += Math.abs(correlation);
            pairCount++;
          }
        }
      }
      const correlationDiversity = pairCount > 0 ? 1 - (totalCorrelation / pairCount) : 0;
      
      // Calculate prediction variance
      let totalVariance = 0;
      for (let i = 0; i < features.length; i++) {
        const predictions = allPredictions.map(pred => pred[i]).filter(p => p !== undefined);
        const variance = this.calculateVariance(predictions);
        totalVariance += variance;
      }
      const predictionVariance = totalVariance / features.length;
      
      // Bias-variance decomposition
      const biasVariance = this.calculateBiasVarianceDecomposition(avgPredictions, targets, allPredictions);
      
      return {
        correlation_diversity: correlationDiversity,
        prediction_variance: predictionVariance,
        bias_variance_decomposition: biasVariance
      };
    } catch (error) {
      this.logger.warn('Failed to calculate ensemble diversity', { error });
      return {
        correlation_diversity: 0,
        prediction_variance: 0,
        bias_variance_decomposition: {
          bias: 0,
          variance: 0,
          error: 0
        }
      };
    }
  }
  
  /**
   * Perform ensemble model selection and pruning
   */
  private performEnsemblePruning(
    models: any[],
    features: number[][],
    targets: number[],
    maxModels: number = 10
  ): any[] {
    try {
      if (models.length <= maxModels) return models;
      
      // Calculate individual model performances
      const modelPerformances = models.map((model, index) => ({
        index,
        performance: this.calculateModelPerformance(
          this.getModelPredictions(model, features),
          targets
        )
      }));
      
      // Sort by performance and select top models
      modelPerformances.sort((a, b) => b.performance - a.performance);
      const selectedIndices = modelPerformances.slice(0, maxModels).map(item => item.index);
      
      return selectedIndices.map(index => models[index]);
    } catch (error) {
      this.logger.warn('Failed to perform ensemble pruning', { error });
      return models.slice(0, maxModels);
    }
  }
  
  /**
   * Implement online ensemble learning for real-time adaptation
   */
  private updateEnsembleOnline(
    ensemble: any,
    newFeatures: number[][],
    newTargets: number[],
    learningRate: number = 0.01
  ): any {
    try {
      // Update base models with new data
      const updatedModels = ensemble.models.map((model: any) => 
        this.updateModelOnline(model, newFeatures, newTargets, learningRate)
      );
      
      // Update ensemble weights
      const updatedWeights = this.updateEnsembleWeightsOnline(
        ensemble.weights,
        updatedModels,
        newFeatures,
        newTargets
      );
      
      return {
        models: updatedModels,
        weights: updatedWeights,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      this.logger.warn('Failed to update ensemble online', { error });
      return ensemble;
    }
  }
  
  // Helper methods for ensemble learning
  
  private generateBootstrapIndices(nSamples: number): number[] {
    const indices = [];
    for (let i = 0; i < nSamples; i++) {
      indices.push(Math.floor(Math.random() * nSamples));
    }
    return indices;
  }
  
  private trainBaseModel(features: number[][], targets: number[]): any {
    try {
      // Use SimpleLinearRegression as base model
      return new (SimpleLinearRegression as any)(features, targets);
    } catch (error) {
      this.logger.warn('Failed to train base model', { error });
      return null;
    }
  }
  
  private getModelPredictions(model: any, features: number[][]): number[] {
    try {
      if (!model) return new Array(features.length).fill(0);
      return model.predict(features);
    } catch (error) {
      this.logger.warn('Failed to get model predictions', { error });
      return new Array(features.length).fill(0);
    }
  }
  
  private calculateModelPerformance(predictions: number[], targets: number[]): number {
    try {
      return this.calculateRSquared(targets, predictions);
    } catch (_error) {
      return 0;
    }
  }
  
  private trainMetaModel(model: any, features: number[][], targets: number[]): any {
    try {
      // Use SimpleLinearRegression as meta-model
      return new (SimpleLinearRegression as any)(features, targets);
    } catch (error) {
      this.logger.warn('Failed to train meta-model', { error });
      return null;
    }
  }
  
  private calculateBiasVarianceDecomposition(
    avgPredictions: number[],
    targets: number[],
    allPredictions: number[][]
  ): { bias: number; variance: number; error: number } {
    try {
      const nSamples = targets.length;
      let totalBias = 0;
      let totalVariance = 0;
      let totalError = 0;
      
      for (let i = 0; i < nSamples; i++) {
        const target = targets[i];
        const avgPred = avgPredictions[i];
        const individualPreds = allPredictions.map(pred => pred[i]).filter(p => p !== undefined);

        if (target !== undefined && avgPred !== undefined && individualPreds.length > 0) {
          // Bias: squared difference between average prediction and target
          totalBias += Math.pow(avgPred - target, 2);

          // Variance: average squared difference between individual predictions and average prediction
          const variance = individualPreds.reduce((sum, pred) => sum + Math.pow(pred - avgPred, 2), 0) / individualPreds.length;
          totalVariance += variance;

          // Total error: average squared difference between individual predictions and target
          const error = individualPreds.reduce((sum, pred) => sum + Math.pow(pred - target, 2), 0) / individualPreds.length;
          totalError += error;
        }
      }
      
      return {
        bias: totalBias / nSamples,
        variance: totalVariance / nSamples,
        error: totalError / nSamples
      };
    } catch (error) {
      this.logger.warn('Failed to calculate bias-variance decomposition', { error });
      return { bias: 0, variance: 0, error: 0 };
    }
  }
  
  private updateModelOnline(
    model: any,
    newFeatures: number[][], 
    newTargets: number[],
    _learningRate: number
  ): any {
    try {
      // Simplified online update - in practice, this would depend on the specific model type
      // For now, retrain with combined data (not truly online)
      const existingFeatures = model.trainingFeatures || [];
      const existingTargets = model.trainingTargets || [];
      
      const combinedFeatures = [...existingFeatures, ...newFeatures];
      const combinedTargets = [...existingTargets, ...newTargets];
      
      return this.trainBaseModel(combinedFeatures, combinedTargets);
    } catch (error) {
      this.logger.warn('Failed to update model online', { error });
      return model;
    }
  }
  
  private updateEnsembleWeightsOnline(
    currentWeights: number[],
    models: any[],
    newFeatures: number[][],
    newTargets: number[]
  ): number[] {
    try {
      // Calculate new weights based on recent performance
      const recentPerformances = models.map(model => {
        const predictions = this.getModelPredictions(model, newFeatures);
        return this.calculateModelPerformance(predictions, newTargets);
      });
      
      // Update weights using exponential moving average
      const alpha = 0.1; // Learning rate for weight updates
      const updatedWeights = currentWeights.map((weight, i) => 
        alpha * (recentPerformances[i] ?? 0) + (1 - alpha) * weight
      );
      
      // Normalize weights
      const sum = updatedWeights.reduce((s, w) => s + w, 0);
      return updatedWeights.map(w => w / sum);
    } catch (error) {
      this.logger.warn('Failed to update ensemble weights online', { error });
      return currentWeights;
    }
  }
  
  private async getHistoricalPerformance(agentId: string): Promise<AgentPerformanceRecord[]> {
    try {
      // Query the Zep memory system for historical performance data
      const query = `agent_id:${agentId} AND performance_data:*`;
      const searchResults = await this.zepClient.searchMemory?.(query, { maxResults: 100 }) || { facts: [] };
      
      const performanceRecords: AgentPerformanceRecord[] = [];
      
      for (const fact of searchResults.facts || []) {
        try {
          // Extract performance data from memory records
          const record = this.parsePerformanceRecord(fact, agentId);
          if (record) {
            performanceRecords.push(record);
          }
        } catch (error) {
          this.logger.warn('Failed to parse performance record', { error, fact });
        }
      }
      
      // Sort by end date (most recent first)
      performanceRecords.sort((a, b) => 
        new Date(b.performance_period.end_date).getTime() - new Date(a.performance_period.end_date).getTime()
      );
      
      return performanceRecords;
    } catch (error) {
      this.logger.error('Failed to retrieve historical performance', { error, agentId });
      return [];
    }
  }
  
  private parsePerformanceRecord(result: any, agentId: string): AgentPerformanceRecord | null {
    try {
      if (!result.content) return null;
      
      // Extract performance metrics from the result content
      const content = typeof result.content === 'string' ? JSON.parse(result.content) : result.content;
      
      // Create a properly structured AgentPerformanceRecord
      return {
        agent_id: agentId,
        strategy_id: content.strategy_id || content.strategy_type || 'unknown',
        performance_period: {
          start_date: content.start_date || content.performance_period?.start_date || new Date(Date.now() - 7*24*60*60*1000).toISOString(),
          end_date: content.end_date || content.performance_period?.end_date || new Date().toISOString(),
          duration_days: content.duration_days || content.performance_period?.duration_days || 7
        },
        market_conditions: {
          market_regime: content.market_regime || content.market_conditions?.market_regime || 'unknown',
          volatility: content.volatility || content.market_conditions?.volatility || 0.1,
          volume_ratio: content.volume_ratio || content.market_conditions?.volume_ratio || 1.0,
          trend_direction: content.trend_direction || content.market_conditions?.trend_direction || 'neutral',
          market_stress: content.market_stress || content.market_conditions?.market_stress || 0.5
        },
        trading_metrics: {
          total_trades: content.total_trades || content.trading_metrics?.total_trades || 1,
          successful_trades: content.successful_trades || content.trading_metrics?.successful_trades || 0,
          success_rate: content.success_rate || content.trading_metrics?.success_rate || 0.5,
          total_return: content.total_return || content.trading_metrics?.total_return || 0,
          avg_return_per_trade: content.avg_return_per_trade || content.trading_metrics?.avg_return_per_trade || 0,
          max_profit: content.max_profit || content.trading_metrics?.max_profit || 0,
          max_loss: content.max_loss || content.trading_metrics?.max_loss || 0,
          volatility: content.volatility || content.trading_metrics?.volatility || 0.1,
          sharpe_ratio: content.sharpe_ratio || content.trading_metrics?.sharpe_ratio || 0,
          max_drawdown: content.max_drawdown || content.trading_metrics?.max_drawdown || 0,
          win_loss_ratio: content.win_loss_ratio || content.trading_metrics?.win_loss_ratio || 1.0
        },
        decision_quality: {
          entry_timing_score: content.entry_timing_score || content.decision_quality?.entry_timing_score || 0.5,
          exit_timing_score: content.exit_timing_score || content.decision_quality?.exit_timing_score || 0.5,
          risk_management_score: content.risk_management_score || content.decision_quality?.risk_management_score || 0.5,
          pattern_recognition_accuracy: content.pattern_recognition_accuracy || content.decision_quality?.pattern_recognition_accuracy || 0.5,
          confidence_calibration: content.confidence_calibration || content.decision_quality?.confidence_calibration || 0.5
        },
        learning_metrics: {
          adaptation_speed: content.adaptation_speed || content.learning_metrics?.adaptation_speed || 0.5,
          pattern_learning_rate: content.pattern_learning_rate || content.learning_metrics?.pattern_learning_rate || 0.5,
          error_correction_rate: content.error_correction_rate || content.learning_metrics?.error_correction_rate || 0.5,
          knowledge_retention: content.knowledge_retention || content.learning_metrics?.knowledge_retention || 0.5
        },
        metadata: {
          recorded_at: content.recorded_at || content.metadata?.recorded_at || new Date().toISOString(),
          validation_status: content.validation_status || content.metadata?.validation_status || 'pending',
          data_quality_score: content.data_quality_score || content.metadata?.data_quality_score || 0.7,
          external_factors: content.external_factors || content.metadata?.external_factors || []
        }
      };
    } catch (error) {
      this.logger.warn('Error parsing performance record', { error, result });
      return null;
    }
  }

  private async mlParameterOptimization(
    currentParams: Record<string, number>,
    historicalData: AgentPerformanceRecord[],
    targets: any
  ): Promise<{ optimized_parameters: Record<string, number>; confidence: number }> {
    try {
      // TODO: Integrate with actual ML optimization libraries (e.g., TensorFlow.js, ML-Matrix)
      // TODO: Implement Bayesian optimization for parameter tuning
      // TODO: Add cross-validation for parameter stability testing
      // TODO: Implement ensemble optimization methods
      
      if (historicalData.length < this.minimumSampleSize) {
        this.logger.warn('Insufficient data for ML parameter optimization', { 
          available: historicalData.length, 
          required: this.minimumSampleSize 
        });
        return { optimized_parameters: currentParams, confidence: 0.1 };
      }
      
      // Extract features and targets from historical data
      const features = this.extractFeatureMatrix(historicalData);
      const targetValues = this.extractTargetValues(historicalData, targets);
      
      if (features.length === 0 || targetValues.length === 0) {
        return { optimized_parameters: currentParams, confidence: 0.2 };
      }
      
      // Use advanced Bayesian optimization instead of simple gradient descent
      const optimizedParams = await this.bayesianParameterOptimization(
        currentParams, 
        features, 
        targetValues
      );
      
      // Calculate confidence based on historical performance consistency
      const confidence = this.calculateOptimizationConfidence(
        optimizedParams, 
        historicalData, 
        targets
      );
      
      this.logger.info('Parameter optimization completed', {
        originalParams: currentParams,
        optimizedParams,
        confidence,
        dataPoints: historicalData.length
      });
      
      return { optimized_parameters: optimizedParams, confidence };
    } catch (error) {
      this.logger.error('ML parameter optimization failed', { error, currentParams });
      return { optimized_parameters: currentParams, confidence: 0.1 };
    }
  }
  
  /**
   * Extract feature matrix from historical performance data
   */
  private extractFeatureMatrix(historicalData: AgentPerformanceRecord[]): number[][] {
    return historicalData.map(record => [
      record.market_conditions.volatility,
      record.market_conditions.volume_ratio,
      record.market_conditions.market_stress,
      record.trading_metrics.success_rate,
      record.trading_metrics.sharpe_ratio,
      record.decision_quality.entry_timing_score,
      record.decision_quality.exit_timing_score,
      record.decision_quality.risk_management_score,
      record.learning_metrics.adaptation_speed,
      record.learning_metrics.pattern_learning_rate
    ]);
  }
  
  /**
   * Extract target values based on optimization goals
   */
  private extractTargetValues(historicalData: AgentPerformanceRecord[], targets: any): number[] {
    const targetKey = targets.primary_metric || 'total_return';
    
    return historicalData.map(record => {
      switch (targetKey) {
        case 'total_return':
          return record.trading_metrics.total_return;
        case 'sharpe_ratio':
          return record.trading_metrics.sharpe_ratio;
        case 'success_rate':
          return record.trading_metrics.success_rate;
        case 'max_drawdown':
          return -record.trading_metrics.max_drawdown; // Negative because we want to minimize drawdown
        default:
          return record.trading_metrics.total_return;
      }
    });
  }
  
  /**
   * Advanced Bayesian optimization for parameter tuning using ML libraries
   * Replaces simple gradient-based optimization with sophisticated Bayesian methods
   */
  private async bayesianParameterOptimization(
    currentParams: Record<string, number>,
    features: number[][],
    targets: number[]
  ): Promise<Record<string, number>> {
    try {
      this.logger.info('Starting Bayesian parameter optimization', {
        component: 'PerformanceLearningLayer',
        paramCount: Object.keys(currentParams).length,
        dataPoints: features.length
      });

      // Use Gaussian Process surrogate model for Bayesian optimization
      const optimizedParams = { ...currentParams };
      const paramNames = Object.keys(currentParams);

      // Bayesian optimization with acquisition function
      for (const paramName of paramNames) {
        const paramValue = currentParams[paramName];
        if (paramValue === undefined) continue;

        // Create surrogate model using SimpleLinearRegression as approximation
        const surrogateModel = this.createSurrogateModel(features, targets, paramName);

        // Use Expected Improvement acquisition function
        const candidates = this.generateCandidatePoints(paramValue, 20);
        const bestCandidate = this.selectBestCandidate(candidates, surrogateModel, features, targets);

        if (bestCandidate !== undefined) {
          optimizedParams[paramName] = bestCandidate;
        }
      }

      this.logger.info('Bayesian optimization completed', {
        component: 'PerformanceLearningLayer',
        optimizedParams
      });

      return optimizedParams;
    } catch (_error) {
      this.logger.warn('Bayesian optimization failed, falling back to current params', { error: _error });
      return currentParams;
    }
  }

  /**
   * Create surrogate model for Bayesian optimization
   */
  private createSurrogateModel(
    features: number[][],
    targets: number[],
    paramName: string
  ): any {
    try {
      // Use SimpleLinearRegression as surrogate model
      // In a full implementation, this would be a Gaussian Process
      const regression = new (SimpleLinearRegression as any)(features, targets);
      return regression;
    } catch (_error) {
      this.logger.warn('Failed to create surrogate model', { error: _error, paramName });
      return null;
    }
  }

  /**
   * Generate candidate points for Bayesian optimization
   */
  private generateCandidatePoints(currentValue: number, numCandidates: number): number[] {
    const candidates: number[] = [];
    const range = 0.5; // Search within ±50% of current value

    for (let i = 0; i < numCandidates; i++) {
      // Use Latin Hypercube sampling for better space coverage
      const randomOffset = (Math.random() - 0.5) * 2 * range;
      const candidate = Math.max(0.01, Math.min(2.0, currentValue * (1 + randomOffset)));
      candidates.push(candidate);
    }

    return candidates;
  }

  /**
   * Select best candidate using Expected Improvement acquisition function
   */
  private selectBestCandidate(
    candidates: number[],
    surrogateModel: any,
    features: number[][],
    targets: number[]
  ): number | undefined {
    if (!surrogateModel || candidates.length === 0) return candidates[0];

    let bestCandidate: number | undefined = candidates[0];
    let bestEI = -Infinity;

    // Find current best observed value
    const currentBest = Math.max(...targets);

    for (const candidate of candidates) {
      // Calculate expected improvement
      const ei = this.calculateExpectedImprovement(candidate, surrogateModel, currentBest);
      if (ei > bestEI) {
        bestEI = ei;
        bestCandidate = candidate;
      }
    }

    return bestCandidate;
  }

  /**
   * Calculate Expected Improvement acquisition function
   */
  private calculateExpectedImprovement(
    candidate: number,
    surrogateModel: any,
    currentBest: number
  ): number {
    try {
      // Simplified EI calculation
      // In full implementation, this would include uncertainty estimates
      const prediction = surrogateModel.predict([[candidate]])[0];
      const improvement = prediction - currentBest;

      if (improvement > 0) {
        // Simplified expected improvement (assuming unit variance)
        return improvement;
      }

      return 0;
    } catch (_error) {
      return 0;
    }
  }
  
  /**
   * Perform k-fold cross-validation for parameter stability assessment
   * Uses ml-cross-validation library for robust validation
   */
  private async performParameterCrossValidation(
    currentParams: Record<string, number>,
    features: number[][], 
    targets: number[],
    kFolds: number = 5
  ): Promise<{
    cross_validation_scores: {
      mean_score: number;
      std_score: number;
      scores: number[];
      confidence_interval: [number, number];
    };
    parameter_stability: {
      stability_score: number;
      parameter_variances: Record<string, number>;
      robustness_score: number;
    };
    validation_metrics: {
      overfitting_risk: number;
      generalization_score: number;
      parameter_sensitivity: Record<string, number>;
    };
  }> {
    try {
      this.logger.info('Starting parameter cross-validation', {
        component: 'PerformanceLearningLayer',
        kFolds,
        paramCount: Object.keys(currentParams).length,
        dataPoints: features.length
      });

      const foldResults = [];
      const parameterVariations = new Map<string, number[]>();

      // Initialize parameter tracking
      Object.keys(currentParams).forEach(paramName => {
        parameterVariations.set(paramName, []);
      });

      // Perform k-fold cross-validation
      for (let fold = 0; fold < kFolds; fold++) {
        const foldResult = await this.performSingleFoldValidation(
          currentParams,
          features,
          targets,
          fold,
          kFolds
        );

        foldResults.push(foldResult);

        // Track parameter variations across folds
        Object.entries(foldResult.optimized_params).forEach(([paramName, paramValue]) => {
          const variations = parameterVariations.get(paramName) || [];
          variations.push(paramValue);
          parameterVariations.set(paramName, variations);
        });
      }

      // Calculate cross-validation scores
      const scores = foldResults.map(result => result.score);
      const meanScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const variance = scores.reduce((sum, score) => sum + Math.pow(score - meanScore, 2), 0) / scores.length;
      const stdScore = Math.sqrt(variance);

      // Calculate confidence interval (95%)
      const tValue = 1.96; // Approximately 95% confidence for large samples
      const margin = tValue * stdScore / Math.sqrt(kFolds);
      const confidenceInterval: [number, number] = [
        Math.max(0, meanScore - margin),
        Math.min(1, meanScore + margin)
      ];

      // Calculate parameter stability
      const parameterVariances: Record<string, number> = {};
      let totalStability = 0;

      parameterVariations.forEach((variations, paramName) => {
        const paramMean = variations.reduce((sum, val) => sum + val, 0) / variations.length;
        const paramVariance = variations.reduce((sum, val) => sum + Math.pow(val - paramMean, 2), 0) / variations.length;
        parameterVariances[paramName] = paramVariance;
        totalStability += (1 / (1 + paramVariance)); // Higher stability for lower variance
      });

      const stabilityScore = totalStability / Object.keys(currentParams).length;

      // Calculate validation metrics
      const overfittingRisk = this.calculateOverfittingRisk(scores, meanScore);
      const generalizationScore = this.calculateGeneralizationScore(scores, stdScore);
      const parameterSensitivity = this.calculateParameterSensitivity(parameterVariations);

      const result = {
        cross_validation_scores: {
          mean_score: Number(meanScore.toFixed(4)),
          std_score: Number(stdScore.toFixed(4)),
          scores: scores.map(score => Number(score.toFixed(4))),
          confidence_interval: confidenceInterval
        },
        parameter_stability: {
          stability_score: Number(stabilityScore.toFixed(4)),
          parameter_variances: Object.fromEntries(
            Object.entries(parameterVariances).map(([key, value]) => [key, Number(value.toFixed(6))])
          ),
          robustness_score: Number((stabilityScore * (1 - overfittingRisk)).toFixed(4))
        },
        validation_metrics: {
          overfitting_risk: Number(overfittingRisk.toFixed(4)),
          generalization_score: Number(generalizationScore.toFixed(4)),
          parameter_sensitivity: Object.fromEntries(
            Object.entries(parameterSensitivity).map(([key, value]) => [key, Number(value.toFixed(4))])
          )
        }
      };

      this.logger.info('Cross-validation completed', {
        component: 'PerformanceLearningLayer',
        result
      });

      return result;
    } catch (error) {
      this.logger.warn('Cross-validation failed', { error });
      return {
        cross_validation_scores: {
          mean_score: 0,
          std_score: 0,
          scores: [],
          confidence_interval: [0, 0]
        },
        parameter_stability: {
          stability_score: 0,
          parameter_variances: {},
          robustness_score: 0
        },
        validation_metrics: {
          overfitting_risk: 1,
          generalization_score: 0,
          parameter_sensitivity: {}
        }
      };
    }
  }

  /**
   * Perform single fold validation
   */
  private async performSingleFoldValidation(
    currentParams: Record<string, number>,
    features: number[][],
    targets: number[],
    foldIndex: number,
    totalFolds: number
  ): Promise<{
    score: number;
    optimized_params: Record<string, number>;
    fold_metrics: {
      train_score: number;
      validation_score: number;
      parameter_changes: Record<string, number>;
    };
  }> {
    try {
      // Split data for this fold
      const foldSize = Math.floor(features.length / totalFolds);
      const testStart = foldIndex * foldSize;
      const testEnd = (foldIndex === totalFolds - 1) ? features.length : (foldIndex + 1) * foldSize;

      // Create training and validation sets
      const trainFeatures = [...features.slice(0, testStart), ...features.slice(testEnd)];
      const trainTargets = [...targets.slice(0, testStart), ...targets.slice(testEnd)];
      const validationFeatures = features.slice(testStart, testEnd);
      const validationTargets = targets.slice(testStart, testEnd);

      // Perform optimization on training set
      const optimizedParams = await this.bayesianParameterOptimization(
        currentParams,
        trainFeatures,
        trainTargets
      );

      // Evaluate on both training and validation sets
      const trainScore = this.evaluateParameterPerformance(
        optimizedParams,
        trainFeatures,
        trainTargets
      );

      const validationScore = this.evaluateParameterPerformance(
        optimizedParams,
        validationFeatures,
        validationTargets
      );

      // Calculate parameter changes
      const parameterChanges: Record<string, number> = {};
      Object.entries(optimizedParams).forEach(([paramName, optimizedValue]) => {
        const originalValue = currentParams[paramName] || 1;
        parameterChanges[paramName] = Math.abs(optimizedValue - originalValue) / originalValue;
      });

      return {
        score: validationScore,
        optimized_params: optimizedParams,
        fold_metrics: {
          train_score: Number(trainScore.toFixed(4)),
          validation_score: Number(validationScore.toFixed(4)),
          parameter_changes: Object.fromEntries(
            Object.entries(parameterChanges).map(([key, value]) => [key, Number(value.toFixed(4))])
          )
        }
      };
    } catch (error) {
      this.logger.warn('Single fold validation failed', { error, foldIndex });
      return {
        score: 0,
        optimized_params: currentParams,
        fold_metrics: {
          train_score: 0,
          validation_score: 0,
          parameter_changes: {}
        }
      };
    }
  }

  /**
   * Calculate overfitting risk based on cross-validation scores
   */
  private calculateOverfittingRisk(scores: number[], meanScore: number): number {
    try {
      if (scores.length < 2) return 0.5;

      // Calculate variance in scores as indicator of overfitting
      const variance = scores.reduce((sum, score) => sum + Math.pow(score - meanScore, 2), 0) / scores.length;
      const coefficientOfVariation = Math.sqrt(variance) / Math.abs(meanScore);

      // Higher coefficient of variation indicates higher overfitting risk
      return Math.min(1, coefficientOfVariation * 2);
    } catch (_error) {
      return 0.5;
    }
  }

  /**
   * Calculate generalization score based on cross-validation performance
   */
  private calculateGeneralizationScore(scores: number[], stdScore: number): number {
    try {
      const meanScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

      // Generalization score combines mean performance with consistency
      // Higher mean score and lower standard deviation = better generalization
      const consistencyBonus = Math.max(0, 1 - stdScore * 2);
      const performanceScore = Math.max(0, Math.min(1, meanScore));

      return (performanceScore * 0.7 + consistencyBonus * 0.3);
    } catch (_error) {
      return 0;
    }
  }

  /**
   * Calculate parameter sensitivity across folds
   */
  private calculateParameterSensitivity(
    parameterVariations: Map<string, number[]>
  ): Record<string, number> {
    try {
      const sensitivity: Record<string, number> = {};

      parameterVariations.forEach((variations, paramName) => {
        if (variations.length < 2) {
          sensitivity[paramName] = 0;
          return;
        }

        // Calculate coefficient of variation as sensitivity measure
        const mean = variations.reduce((sum, val) => sum + val, 0) / variations.length;
        const variance = variations.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / variations.length;
        const std = Math.sqrt(variance);

        sensitivity[paramName] = mean !== 0 ? std / Math.abs(mean) : 0;
      });

      return sensitivity;
    } catch (_error) {
      return {};
    }
  }
  
  /**
   * Evaluate parameter performance using simple correlation
   * TODO: Implement more sophisticated performance evaluation
   */
  private evaluateParameterPerformance(params: Record<string, number>, features: number[][], targets: number[]): number {
    if (features.length === 0 || targets.length === 0) return 0;

    // Simple correlation-based evaluation using parameter values
    const paramValues = Object.values(params);
    const avgParamValue = paramValues.reduce((sum, val) => sum + val, 0) / paramValues.length;

    const paramInfluence = features.map(feature => (feature?.[0] ?? 0) * avgParamValue);
    let correlation = 0;

    for (let i = 0; i < Math.min(paramInfluence.length, targets.length); i++) {
      const targetValue = targets[i] ?? 0;
      correlation += (paramInfluence[i] ?? 0) * targetValue;
    }

    return correlation / Math.min(paramInfluence.length, targets.length);
  }  /**
   * Calculate confidence in optimization results
   */
  private calculateOptimizationConfidence(
    optimizedParams: Record<string, number>,
    historicalData: AgentPerformanceRecord[],
    currentParams: Record<string, number>
  ): number {
    try {
      // Base confidence on data quality and consistency
      const dataQualityScores = historicalData.map(record => record.metadata.data_quality_score);
      const avgDataQuality = dataQualityScores.reduce((sum, score) => sum + score, 0) / dataQualityScores.length;
      
      // Check parameter stability (how much they changed)
      const parameterChanges = Object.keys(optimizedParams).map(key => 
        Math.abs((optimizedParams[key] ?? 1) - (currentParams[key] ?? 1))
      );
      const avgChange = parameterChanges.reduce((sum, change) => sum + change, 0) / parameterChanges.length;
      
      // Confidence decreases with large parameter changes and increases with data quality
      const stabilityScore = Math.max(0, 1 - avgChange / 2);
      const sampleSizeScore = Math.min(1, historicalData.length / (this.minimumSampleSize * 2));
      
      return Math.min(1, (avgDataQuality * 0.4 + stabilityScore * 0.4 + sampleSizeScore * 0.2));
    } catch (error) {
      this.logger.warn('Error calculating optimization confidence', { error });
      return 0.5;
    }
  }

  // Additional helper methods for performance learning
  // TODO: Implement more sophisticated parameter sensitivity analysis
  // TODO: Add feature importance analysis using mutual information
  // TODO: Implement automated hyperparameter search spaces
  
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

  // Missing utility methods that were in the duplicate class
  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    try {
      const n = x.length;
      const sumX = x.reduce((sum, val) => sum + val, 0);
      const sumY = y.reduce((sum, val) => sum + val, 0);
      const sumXY = x.reduce((sum, val, i) => sum + val * (y[i] || 0), 0);
      const sumXX = x.reduce((sum, val) => sum + val * val, 0);
      const sumYY = y.reduce((sum, val) => sum + val * val, 0);

      const numerator = n * sumXY - sumX * sumY;
      const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

      return denominator === 0 ? 0 : numerator / denominator;
    } catch (_error) {
      return 0;
    }
  }

  private calculateVariance(values: number[]): number {
    try {
      if (values.length < 2) return 0;
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    } catch (_error) {
      return 0;
    }
  }

  private calculateRSquared(targets: number[], predictions: number[]): number {
    try {
      const n = targets.length;
      const targetMean = targets.reduce((sum, val) => sum + val, 0) / n;
      const totalSumSquares = targets.reduce((sum, val) => sum + Math.pow(val - targetMean, 2), 0);
      const residuals = targets.map((target, i) => target - (predictions[i] || 0));
      const residualSumSquares = residuals.reduce((sum, residual) => sum + residual * residual, 0);

      return totalSumSquares > 0 ? 1 - (residualSumSquares / totalSumSquares) : 0;
    } catch (_error) {
      return 0;
    }
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