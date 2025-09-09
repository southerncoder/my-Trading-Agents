/**
 * Adaptive Learning Framework for Trading Agents
 *
 * This module implements adaptive learning capabilities that allow trading agents to
 * dynamically adjust their behavior based on performance feedback, market conditions,
 * and learning insights. It enables continuous optimization and adaptation.
 *
 * Key Features:
 * - Dynamic strategy adaptation based on performance feedback
 * - Market regime detection and adaptive responses
 * - Risk management parameter optimization
 * - Learning rate scheduling and curriculum learning
 * - Meta-learning for cross-domain knowledge transfer
 * - Adaptive exploration-exploitation balance
 *
 * Integration Capabilities:
 * - Works with performance analytics for feedback-driven adaptation
 * - Supports learning system for continuous model updates
 * - Enables portfolio optimization with adaptive constraints
 * - Provides adaptive insights for strategy refinement
 */

import { z } from 'zod';

// Adaptive learning schemas
export const AdaptationRuleSchema = z.object({
  rule_id: z.string(),
  trigger_condition: z.object({
    metric: z.string(),
    operator: z.enum(['>', '<', '>=', '<=', '==', '!=']),
    threshold: z.number(),
    time_window: z.string() // e.g., '1h', '1d', '1w'
  }),
  adaptation_action: z.object({
    parameter: z.string(),
    adjustment_type: z.enum(['multiply', 'add', 'set', 'interpolate']),
    adjustment_value: z.number(),
    cooldown_period: z.string() // e.g., '1h', '1d', '1w'
  }),
  priority: z.number().min(0).max(1),
  confidence_threshold: z.number().min(0).max(1),
  last_triggered: z.string().optional(),
  success_rate: z.number().min(0).max(1)
});

export const MarketRegimeSchema = z.object({
  regime_id: z.string(),
  regime_type: z.enum(['bull', 'bear', 'sideways', 'volatile', 'trending', 'ranging']),
  characteristics: z.object({
    volatility: z.number(),
    trend_strength: z.number(),
    volume_profile: z.string(),
    correlation_structure: z.string()
  }),
  detection_confidence: z.number().min(0).max(1),
  entry_timestamp: z.string(),
  duration: z.number(), // in minutes
  expected_duration: z.number(), // in minutes
  adaptation_strategies: z.array(z.string())
});

export const LearningCurriculumSchema = z.object({
  curriculum_id: z.string(),
  stages: z.array(z.object({
    stage_id: z.string(),
    difficulty_level: z.number().min(0).max(1),
    learning_objectives: z.array(z.string()),
    success_criteria: z.object({
      metric: z.string(),
      target_value: z.number(),
      time_limit: z.string()
    }),
    unlocked_at_performance: z.number().min(0).max(1)
  })),
  current_stage: z.string(),
  progress_tracking: z.record(z.string(), z.object({
    attempts: z.number(),
    successes: z.number(),
    best_performance: z.number(),
    time_spent: z.number()
  }))
});

export const ExplorationStrategySchema = z.object({
  strategy_id: z.string(),
  exploration_rate: z.number().min(0).max(1),
  decay_schedule: z.object({
    initial_rate: z.number(),
    decay_factor: z.number(),
    min_rate: z.number(),
    decay_steps: z.number()
  }),
  action_selection: z.enum(['epsilon_greedy', 'boltzmann', 'ucb', 'thompson']),
  reward_shaping: z.object({
    immediate_reward_weight: z.number(),
    future_reward_weight: z.number(),
    risk_penalty_weight: z.number(),
    novelty_bonus_weight: z.number()
  }),
  performance_adaptation: z.boolean()
});

export type AdaptationRule = z.infer<typeof AdaptationRuleSchema>;
export type MarketRegime = z.infer<typeof MarketRegimeSchema>;
export type LearningCurriculum = z.infer<typeof LearningCurriculumSchema>;
export type ExplorationStrategy = z.infer<typeof ExplorationStrategySchema>;

/**
 * Adaptive Learning Engine
 *
 * Manages adaptive learning processes including strategy adaptation,
 * market regime detection, and continuous optimization.
 */
export class AdaptiveLearningEngine {
  private adaptationRules: Map<string, AdaptationRule> = new Map();
  private marketRegimes: Map<string, MarketRegime> = new Map();
  private learningCurricula: Map<string, LearningCurriculum> = new Map();
  private explorationStrategies: Map<string, ExplorationStrategy> = new Map();
  private logger: any;

  constructor(logger?: any) {
    this.logger = logger || console;
  }

  /**
   * Add an adaptation rule
   */
  addAdaptationRule(agentId: string, rule: AdaptationRule): void {
    if (!this.adaptationRules.has(agentId)) {
      this.adaptationRules.set(agentId, rule);
    } else {
      // Update existing rule
      const existingRule = this.adaptationRules.get(agentId)!;
      this.adaptationRules.set(agentId, {
        ...existingRule,
        ...rule,
        success_rate: rule.success_rate !== undefined ? rule.success_rate : existingRule.success_rate
      });
    }

    this.logger.info('addAdaptationRule', 'Adaptation rule added/updated', {
      agentId,
      ruleId: rule.rule_id,
      priority: rule.priority
    });
  }

  /**
   * Evaluate and apply adaptation rules
   */
  async evaluateAdaptationRules(
    agentId: string,
    currentMetrics: Record<string, number>,
    currentParameters: Record<string, number>
  ): Promise<{
    adaptations: Array<{
      parameter: string;
      old_value: number;
      new_value: number;
      reason: string;
    }>;
    triggered_rules: string[];
  }> {

    const rule = this.adaptationRules.get(agentId);
    if (!rule) {
      return { adaptations: [], triggered_rules: [] };
    }

    const adaptations: Array<{
      parameter: string;
      old_value: number;
      new_value: number;
      reason: string;
    }> = [];

    const triggeredRules: string[] = [];

    // Check if rule should be triggered
    const shouldTrigger = this.evaluateTriggerCondition(rule.trigger_condition, currentMetrics);

    if (shouldTrigger) {
      // Check cooldown period
      const lastTriggered = rule.last_triggered;
      if (lastTriggered) {
        const cooldownMs = this.parseTimePeriod(rule.adaptation_action.cooldown_period);
        const timeSinceLastTrigger = Date.now() - new Date(lastTriggered).getTime();

        if (timeSinceLastTrigger < cooldownMs) {
          this.logger.debug('evaluateAdaptationRules', 'Rule in cooldown period', {
            agentId,
            ruleId: rule.rule_id,
            timeSinceLastTrigger,
            cooldownMs
          });
          return { adaptations, triggered_rules: triggeredRules };
        }
      }

      // Apply adaptation
      const oldValue = currentParameters[rule.adaptation_action.parameter] || 0;
      const newValue = this.applyAdaptationAction(
        rule.adaptation_action,
        oldValue,
        currentMetrics
      );

      adaptations.push({
        parameter: rule.adaptation_action.parameter,
        old_value: oldValue,
        new_value: newValue,
        reason: `Rule ${rule.rule_id} triggered: ${rule.trigger_condition.metric} ${rule.trigger_condition.operator} ${rule.trigger_condition.threshold}`
      });

      triggeredRules.push(rule.rule_id);

      // Update last triggered timestamp
      rule.last_triggered = new Date().toISOString();
      this.adaptationRules.set(agentId, rule);

      this.logger.info('evaluateAdaptationRules', 'Adaptation rule triggered', {
        agentId,
        ruleId: rule.rule_id,
        parameter: rule.adaptation_action.parameter,
        oldValue,
        newValue
      });
    }

    return { adaptations, triggered_rules: triggeredRules };
  }

  /**
   * Detect current market regime
   */
  async detectMarketRegime(
    marketData: Array<{
      timestamp: string;
      price: number;
      volume: number;
      volatility: number;
    }>,
    lookbackPeriod: number = 100
  ): Promise<MarketRegime> {

    this.logger.info('detectMarketRegime', 'Starting regime detection', {
      dataPoints: marketData.length,
      lookbackPeriod
    });

    // Calculate regime characteristics
    const recentData = marketData.slice(-lookbackPeriod);
    const volatility = this.calculateAverageVolatility(recentData);
    const trendStrength = this.calculateTrendStrength(recentData);
    const volumeProfile = this.classifyVolumeProfile(recentData);
    const correlationStructure = this.analyzeCorrelationStructure(recentData);

    // Determine regime type
    const regimeType = this.classifyRegimeType(volatility, trendStrength, volumeProfile);

    // Calculate detection confidence
    const detectionConfidence = this.calculateRegimeConfidence(
      volatility,
      trendStrength,
      volumeProfile,
      correlationStructure
    );

    // Estimate duration and expected duration
    const currentRegime = Array.from(this.marketRegimes.values())
      .find(r => r.regime_type === regimeType);

    const duration = currentRegime ?
      (Date.now() - new Date(currentRegime.entry_timestamp).getTime()) / (1000 * 60) : 0;

    const expectedDuration = this.estimateRegimeDuration(regimeType, volatility, trendStrength);

    const regime: MarketRegime = {
      regime_id: `regime_${Date.now()}`,
      regime_type: regimeType,
      characteristics: {
        volatility,
        trend_strength: trendStrength,
        volume_profile: volumeProfile,
        correlation_structure: correlationStructure
      },
      detection_confidence: detectionConfidence,
      entry_timestamp: currentRegime?.entry_timestamp || new Date().toISOString(),
      duration,
      expected_duration: expectedDuration,
      adaptation_strategies: this.getRegimeAdaptationStrategies(regimeType)
    };

    this.marketRegimes.set('current', regime);

    this.logger.info('detectMarketRegime', 'Regime detected', {
      regimeType,
      detectionConfidence,
      duration,
      expectedDuration
    });

    return regime;
  }

  /**
   * Update learning curriculum progress
   */
  async updateCurriculumProgress(
    agentId: string,
    curriculumId: string,
    performanceMetrics: Record<string, number>,
    timeSpent: number
  ): Promise<{
    current_stage: string;
    progress: number;
    next_stage_unlocked: boolean;
    recommendations: string[];
  }> {

    let curriculum = this.learningCurricula.get(agentId);
    if (!curriculum || curriculum.curriculum_id !== curriculumId) {
      // Create default curriculum if not exists
      curriculum = this.createDefaultCurriculum(curriculumId);
      this.learningCurricula.set(agentId, curriculum);
    }

    const currentStage = curriculum.stages.find(s => s.stage_id === curriculum.current_stage);
    if (!currentStage) {
      return {
        current_stage: curriculum.current_stage,
        progress: 0,
        next_stage_unlocked: false,
        recommendations: ['Invalid curriculum stage']
      };
    }

    // Update progress tracking
    if (!curriculum.progress_tracking[currentStage.stage_id]) {
      curriculum.progress_tracking[currentStage.stage_id] = {
        attempts: 0,
        successes: 0,
        best_performance: 0,
        time_spent: 0
      };
    }

    const progress = curriculum.progress_tracking[currentStage.stage_id];
    if (!progress) return {
      current_stage: curriculum.current_stage,
      progress: 0,
      next_stage_unlocked: false,
      recommendations: ['Progress tracking error']
    };

    progress.attempts += 1;
    progress.time_spent += timeSpent;

    // Check success criteria
    const successMetric = performanceMetrics[currentStage.success_criteria.metric];
    if (successMetric === undefined) {
      return {
        current_stage: curriculum.current_stage,
        progress: 0,
        next_stage_unlocked: false,
        recommendations: ['Success metric not available']
      };
    }

    const targetValue = currentStage.success_criteria.target_value;

    if (successMetric >= targetValue) {
      progress.successes += 1;
      progress.best_performance = Math.max(progress.best_performance, successMetric);
    }

    // Calculate overall progress
    const stageProgress = progress.successes / Math.max(progress.attempts, 1);

    // Check if next stage should be unlocked
    let nextStageUnlocked = false;
    const currentStageIndex = curriculum.stages.findIndex(s => s.stage_id === curriculum.current_stage);
    const nextStage = curriculum.stages[currentStageIndex + 1];

    if (nextStage && stageProgress >= nextStage.unlocked_at_performance) {
      curriculum.current_stage = nextStage.stage_id;
      nextStageUnlocked = true;

      this.logger.info('updateCurriculumProgress', 'Next stage unlocked', {
        agentId,
        curriculumId,
        newStage: nextStage.stage_id,
        progress: stageProgress
      });
    }

    this.learningCurricula.set(agentId, curriculum);

    const recommendations = this.generateCurriculumRecommendations(curriculum, stageProgress);

    return {
      current_stage: curriculum.current_stage,
      progress: stageProgress,
      next_stage_unlocked: nextStageUnlocked,
      recommendations
    };
  }

  /**
   * Adapt exploration strategy based on performance
   */
  async adaptExplorationStrategy(
    agentId: string,
    performanceMetrics: Record<string, number>,
    episodeCount: number
  ): Promise<{
    new_exploration_rate: number;
    strategy_changes: string[];
  }> {

    let strategy = this.explorationStrategies.get(agentId);
    if (!strategy) {
      // Create default exploration strategy
      strategy = {
        strategy_id: `strategy_${agentId}`,
        exploration_rate: 1.0,
        decay_schedule: {
          initial_rate: 1.0,
          decay_factor: 0.995,
          min_rate: 0.01,
          decay_steps: 1000
        },
        action_selection: 'epsilon_greedy',
        reward_shaping: {
          immediate_reward_weight: 0.8,
          future_reward_weight: 0.2,
          risk_penalty_weight: 0.1,
          novelty_bonus_weight: 0.05
        },
        performance_adaptation: true
      };
      this.explorationStrategies.set(agentId, strategy);
    }

    if (!strategy.performance_adaptation) {
      return {
        new_exploration_rate: strategy.exploration_rate,
        strategy_changes: []
      };
    }

    const changes: string[] = [];
    let newExplorationRate = strategy.exploration_rate;

    // Decay exploration rate based on episode count
    const _decayProgress = Math.min(episodeCount / strategy.decay_schedule.decay_steps, 1);
    newExplorationRate = strategy.decay_schedule.initial_rate *
      Math.pow(strategy.decay_schedule.decay_factor, episodeCount);
    newExplorationRate = Math.max(newExplorationRate, strategy.decay_schedule.min_rate);

    if (Math.abs(newExplorationRate - strategy.exploration_rate) > 0.01) {
      changes.push(`Exploration rate decayed from ${strategy.exploration_rate.toFixed(3)} to ${newExplorationRate.toFixed(3)}`);
    }

    // Adapt based on performance
    const winRate = performanceMetrics.win_rate || 0;
    const volatility = performanceMetrics.volatility || 0;

    if (winRate < 0.4) {
      // Poor performance - increase exploration
      newExplorationRate = Math.min(newExplorationRate * 1.2, 0.5);
      changes.push('Increased exploration due to poor performance');
    } else if (winRate > 0.7 && volatility < 0.1) {
      // Good performance with low volatility - decrease exploration
      newExplorationRate = Math.max(newExplorationRate * 0.8, strategy.decay_schedule.min_rate);
      changes.push('Decreased exploration due to consistent good performance');
    }

    strategy.exploration_rate = newExplorationRate;
    this.explorationStrategies.set(agentId, strategy);

    this.logger.debug('adaptExplorationStrategy', 'Exploration strategy adapted', {
      agentId,
      newExplorationRate,
      changes: changes.length
    });

    return {
      new_exploration_rate: newExplorationRate,
      strategy_changes: changes
    };
  }

  /**
   * Generate adaptive insights and recommendations
   */
  generateAdaptiveInsights(agentId: string): {
    regime_adaptations: string[];
    curriculum_progress: string[];
    exploration_recommendations: string[];
    performance_adaptations: string[];
  } {

    const regime = this.marketRegimes.get('current');
    const curriculum = this.learningCurricula.get(agentId);
    const explorationStrategy = this.explorationStrategies.get(agentId);

    const regimeAdaptations = regime ? this.generateRegimeAdaptations(regime) : [];
    const curriculumProgress = curriculum ? this.generateCurriculumProgress(curriculum) : [];
    const explorationRecommendations = explorationStrategy ?
      this.generateExplorationRecommendations(explorationStrategy) : [];
    const performanceAdaptations = this.generatePerformanceAdaptations(agentId);

    return {
      regime_adaptations: regimeAdaptations,
      curriculum_progress: curriculumProgress,
      exploration_recommendations: explorationRecommendations,
      performance_adaptations: performanceAdaptations
    };
  }

  // Private helper methods

  private evaluateTriggerCondition(
    condition: AdaptationRule['trigger_condition'],
    metrics: Record<string, number>
  ): boolean {

    const metricValue = metrics[condition.metric];
    if (metricValue === undefined) return false;

    switch (condition.operator) {
      case '>': return metricValue > condition.threshold;
      case '<': return metricValue < condition.threshold;
      case '>=': return metricValue >= condition.threshold;
      case '<=': return metricValue <= condition.threshold;
      case '==': return metricValue === condition.threshold;
      case '!=': return metricValue !== condition.threshold;
      default: return false;
    }
  }

  private applyAdaptationAction(
    action: AdaptationRule['adaptation_action'],
    currentValue: number,
    metrics: Record<string, number>
  ): number {

    switch (action.adjustment_type) {
      case 'multiply':
        return currentValue * action.adjustment_value;
      case 'add':
        return currentValue + action.adjustment_value;
      case 'set':
        return action.adjustment_value;
      case 'interpolate': {
        // Interpolate between current value and target based on some metric
        const targetMetric = metrics['target_metric'] || 0;
        const interpolationFactor = Math.min(targetMetric / 100, 1); // Assume target is percentage
        return currentValue + (action.adjustment_value - currentValue) * interpolationFactor;
      }
      default:
        return currentValue;
    }
  }

  private parseTimePeriod(period: string): number {
    const match = period.match(/^(\d+)([smhdw])$/);
    if (!match || !match[1]) return 0;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'w': return value * 7 * 24 * 60 * 60 * 1000;
      default: return 0;
    }
  }

  private calculateAverageVolatility(data: Array<{ volatility: number }>): number {
    if (data.length === 0) return 0;
    return data.reduce((sum, d) => sum + d.volatility, 0) / data.length;
  }

  private calculateTrendStrength(data: Array<{ price: number }>): number {
    if (data.length < 2) return 0;

    const prices = data.map(d => d.price);
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];

    if (firstPrice === undefined || lastPrice === undefined) return 0;

    const trend = (lastPrice - firstPrice) / firstPrice;
    const volatility = this.calculatePriceVolatility(prices);

    return volatility > 0 ? Math.abs(trend) / volatility : 0;
  }

  private calculatePriceVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      const currentPrice = prices[i];
      const previousPrice = prices[i - 1];

      if (currentPrice !== undefined && previousPrice !== undefined) {
        returns.push((currentPrice - previousPrice) / previousPrice);
      }
    }

    if (returns.length === 0) return 0;

    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;

    return Math.sqrt(variance);
  }

  private classifyVolumeProfile(data: Array<{ volume: number }>): string {
    if (data.length === 0) return 'unknown';

    const volumes = data.map(d => d.volume);
    const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
    const recentVolume = volumes.slice(-10).reduce((sum, v) => sum + v, 0) / 10;

    if (recentVolume > avgVolume * 1.5) return 'high';
    if (recentVolume < avgVolume * 0.7) return 'low';
    return 'normal';
  }

  private analyzeCorrelationStructure(_data: any[]): string {
    // Simplified correlation analysis
    return 'moderate';
  }

  private classifyRegimeType(
    volatility: number,
    trendStrength: number,
    volumeProfile: string
  ): MarketRegime['regime_type'] {

    if (volatility > 0.05) {
      return 'volatile';
    } else if (trendStrength > 0.02) {
      return volumeProfile === 'high' ? 'bull' : 'trending';
    } else if (trendStrength < -0.02) {
      return 'bear';
    } else {
      return volumeProfile === 'low' ? 'sideways' : 'ranging';
    }
  }

  private calculateRegimeConfidence(
    volatility: number,
    trendStrength: number,
    volumeProfile: string,
    correlationStructure: string
  ): number {

    let confidence = 0.5; // Base confidence

    // Adjust based on factors
    if (volatility > 0.03) confidence += 0.2;
    if (trendStrength > 0.015) confidence += 0.15;
    if (volumeProfile === 'high') confidence += 0.1;
    if (correlationStructure === 'strong') confidence += 0.1;

    return Math.min(confidence, 0.95);
  }

  private estimateRegimeDuration(
    regimeType: MarketRegime['regime_type'],
    volatility: number,
    trendStrength: number
  ): number {

    const baseDurations: Record<MarketRegime['regime_type'], number> = {
      bull: 1440, // 24 hours in minutes
      bear: 1440,
      sideways: 720, // 12 hours
      volatile: 360, // 6 hours
      trending: 1080, // 18 hours
      ranging: 720
    };

    const baseDuration = baseDurations[regimeType] || 720;

    // Adjust based on current conditions
    let adjustment = 1;
    if (volatility > 0.03) adjustment *= 0.7; // Shorter duration for high volatility
    if (trendStrength > 0.02) adjustment *= 1.3; // Longer duration for strong trends

    return baseDuration * adjustment;
  }

  private getRegimeAdaptationStrategies(regimeType: MarketRegime['regime_type']): string[] {

    const strategies: Record<MarketRegime['regime_type'], string[]> = {
      bull: [
        'Increase position sizes',
        'Use momentum strategies',
        'Reduce stop loss distances',
        'Focus on high-beta assets'
      ],
      bear: [
        'Reduce position sizes',
        'Use defensive strategies',
        'Widen stop loss distances',
        'Focus on low-beta assets'
      ],
      sideways: [
        'Use mean-reversion strategies',
        'Reduce position sizes',
        'Tighten stop losses',
        'Focus on range-bound assets'
      ],
      volatile: [
        'Reduce position sizes significantly',
        'Use wider stop losses',
        'Implement hedging strategies',
        'Focus on volatility products'
      ],
      trending: [
        'Use trend-following strategies',
        'Increase position sizes gradually',
        'Use trailing stops',
        'Focus on trending assets'
      ],
      ranging: [
        'Use breakout strategies',
        'Monitor support/resistance levels',
        'Use tighter stops',
        'Focus on range-bound assets'
      ]
    };

    return strategies[regimeType] || [];
  }

  private createDefaultCurriculum(curriculumId: string): LearningCurriculum {

    return {
      curriculum_id: curriculumId,
      stages: [
        {
          stage_id: 'beginner',
          difficulty_level: 0.2,
          learning_objectives: [
            'Learn basic market patterns',
            'Understand risk management',
            'Practice simple strategies'
          ],
          success_criteria: {
            metric: 'win_rate',
            target_value: 0.5,
            time_limit: '1w'
          },
          unlocked_at_performance: 0
        },
        {
          stage_id: 'intermediate',
          difficulty_level: 0.5,
          learning_objectives: [
            'Master technical analysis',
            'Implement portfolio diversification',
            'Handle market volatility'
          ],
          success_criteria: {
            metric: 'sharpe_ratio',
            target_value: 1.0,
            time_limit: '2w'
          },
          unlocked_at_performance: 0.6
        },
        {
          stage_id: 'advanced',
          difficulty_level: 0.8,
          learning_objectives: [
            'Develop complex strategies',
            'Optimize portfolio allocation',
            'Manage advanced risk scenarios'
          ],
          success_criteria: {
            metric: 'max_drawdown',
            target_value: 0.15,
            time_limit: '4w'
          },
          unlocked_at_performance: 0.75
        }
      ],
      current_stage: 'beginner',
      progress_tracking: {}
    };
  }

  private generateCurriculumRecommendations(
    curriculum: LearningCurriculum,
    progress: number
  ): string[] {

    const recommendations: string[] = [];
    const currentStage = curriculum.stages.find(s => s.stage_id === curriculum.current_stage);

    if (currentStage) {
      if (progress < 0.5) {
        recommendations.push(`Focus on mastering ${currentStage.learning_objectives[0]}`);
        recommendations.push('Consider reducing position sizes while learning');
      } else if (progress >= currentStage.unlocked_at_performance) {
        recommendations.push('Ready to progress to next difficulty level');
        recommendations.push('Consider increasing complexity of strategies');
      }
    }

    return recommendations;
  }

  private generateRegimeAdaptations(regime: MarketRegime): string[] {
    return regime.adaptation_strategies.map(strategy =>
      `Market regime (${regime.regime_type}): ${strategy}`
    );
  }

  private generateCurriculumProgress(curriculum: LearningCurriculum): string[] {
    const progress: string[] = [];
    const currentStage = curriculum.stages.find(s => s.stage_id === curriculum.current_stage);

    if (currentStage) {
      progress.push(`Current learning stage: ${currentStage.stage_id} (difficulty: ${(currentStage.difficulty_level * 100).toFixed(0)}%)`);

      const stageProgress = curriculum.progress_tracking[currentStage.stage_id];
      if (stageProgress) {
        const successRate = stageProgress.attempts > 0 ?
          (stageProgress.successes / stageProgress.attempts * 100).toFixed(1) : '0.0';
        progress.push(`Stage progress: ${successRate}% success rate (${stageProgress.successes}/${stageProgress.attempts} attempts)`);
      }
    }

    return progress;
  }

  private generateExplorationRecommendations(strategy: ExplorationStrategy): string[] {
    const recommendations: string[] = [];

    recommendations.push(`Current exploration rate: ${(strategy.exploration_rate * 100).toFixed(1)}%`);

    if (strategy.exploration_rate > 0.3) {
      recommendations.push('High exploration rate - consider focusing on exploitation of known strategies');
    } else if (strategy.exploration_rate < 0.05) {
      recommendations.push('Low exploration rate - consider exploring new strategies to avoid overfitting');
    }

    return recommendations;
  }

  private generatePerformanceAdaptations(agentId: string): string[] {
    const adaptations: string[] = [];

    // Check if there are recent adaptation rules triggered
    const rule = this.adaptationRules.get(agentId);
    if (rule?.last_triggered) {
      const lastTriggered = new Date(rule.last_triggered);
      const hoursSince = (Date.now() - lastTriggered.getTime()) / (1000 * 60 * 60);

      if (hoursSince < 24) {
        adaptations.push(`Recent adaptation: ${rule.adaptation_action.parameter} adjusted ${hoursSince.toFixed(1)} hours ago`);
      }
    }

    if (adaptations.length === 0) {
      adaptations.push('No recent performance adaptations - system is stable');
    }

    return adaptations;
  }
}

/**
 * Factory function for creating adaptive learning engine
 */
export function createAdaptiveLearningEngine(logger?: any): AdaptiveLearningEngine {
  return new AdaptiveLearningEngine(logger);
}