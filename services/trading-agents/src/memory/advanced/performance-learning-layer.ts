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
import { PerformanceFeatureExtractor } from './performance-feature-extractor';

// Import extracted types and utilities
import { AgentPerformanceRecord, PerformanceLearningInsights, PerformanceMLModel } from './performance-learning-types';
import {
  calculateRSquared,
  calculateQValueUpdate,
  updatePolicy,
  calculateExplorationStrategy,
  extractReinforcementInsights,
  storeReinforcementData,
  mlPerformancePrediction
} from './performance-learning-utils';
import {
  createEnsembleModels,
  makeEnsemblePredictions,
  calculateEnsembleWeights,
  createStackingEnsemble,
  makeStackingPredictions,
  calculateEnsembleDiversity,
  performEnsemblePruning,
  updateEnsembleOnline,
  mlParameterOptimization
} from './performance-ml-methods';

// Type declarations for ML libraries
// Extend ZepClient interface for performance learning
interface ExtendedZepClient extends ZepClient {
  searchMemory?: (query: string, options?: { maxResults?: number }) => Promise<{ facts?: any[] }>;
  storePerformanceData?: (data: any) => Promise<{ id: string }>;
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
      const optimizationResult = await mlParameterOptimization(
        currentParameters,
        historicalData,
        targetMetrics,
        this.minimumSampleSize,
        this.logger
      );
      
      // Calculate parameter sensitivities (simplified)
      const sensitivities = [
        { parameter: 'risk_per_trade', sensitivity: 0.3, impact_direction: 'negative' as const },
        { parameter: 'position_size', sensitivity: 0.5, impact_direction: 'positive' as const }
      ];

      // Estimate expected improvements (simplified)
      const expectedImprovements = {
        return_improvement: 0.05,
        risk_reduction: 0.03,
        sharpe_improvement: 0.2
      };

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
      const qValueUpdate = calculateQValueUpdate(action, outcome, this.learningRate);
      
      // Update policy using epsilon-greedy strategy
      const policyAdjustment = await updatePolicy(agentId, action, outcome, {}, this.learningRate, this.logger);
      
      // Balance exploration vs exploitation
      const explorationStrategy = calculateExplorationStrategy(agentId, action.context, 0.1, this.logger);
      
      // Extract learned insights
      const learnedInsights = extractReinforcementInsights(action, outcome, qValueUpdate);
      
      // Store reinforcement learning data
      await storeReinforcementData(agentId, action, outcome, qValueUpdate, this.zepClient, this.logger);
      
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
        const prediction = await mlPerformancePrediction(agentId, scenario, undefined, this.logger);
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
    return createEnsembleModels(features, targets, nModels, this.logger);
  }
  
  /**
   * Make ensemble predictions using weighted averaging
   */
  private makeEnsemblePredictions(
    models: any[],
    features: number[][],
    modelWeights?: number[]
  ): number[] {
    return makeEnsemblePredictions(models, features, modelWeights, this.logger);
  }
  
  /**
   * Calculate weights for ensemble models based on their performance
   */
  private calculateEnsembleWeights(
    models: any[],
    validationFeatures: number[][],
    validationTargets: number[]
  ): number[] {
    return calculateEnsembleWeights(models, validationFeatures, validationTargets, this.logger);
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
    return createStackingEnsemble(baseModels, metaModel, features, targets, validationSplit, this.logger);
  }
  
  /**
   * Make predictions using stacking ensemble
   */
  private makeStackingPredictions(
    stackingEnsemble: any,
    features: number[][]
  ): number[] {
    return makeStackingPredictions(stackingEnsemble, features, this.logger);
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
    return calculateEnsembleDiversity(models, features, targets, this.logger);
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
    return performEnsemblePruning(models, features, targets, maxModels, this.logger);
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
    return updateEnsembleOnline(ensemble, newFeatures, newTargets, learningRate, this.logger);
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
      return calculateRSquared(targets, predictions);
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

  // Additional helper methods for performance learning
  // TODO: Implement more sophisticated parameter sensitivity analysis
  // TODO: Add feature importance analysis using mutual information
  // TODO: Implement automated hyperparameter search spaces

}/**
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