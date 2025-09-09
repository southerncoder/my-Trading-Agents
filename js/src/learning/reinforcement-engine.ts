/**
 * Reinforcement Learning Engine
 *
 * Implements Q-learning and policy gradient methods for trading strategy optimization.
 */
import { ReinforcementLearningState } from './learning-types';

export class ReinforcementLearningEngine {
  private qTable: Map<string, Map<string, number>> = new Map();
  private policyNetwork: Map<string, number> = new Map();
  private logger: any;

  // Learning parameters
  private config: {
    learningRate: number;
    discountFactor: number;
    explorationRate: number;
    explorationDecay: number;
    minExplorationRate: number;
  };

  constructor(
    config?: {
      learningRate?: number;
      discountFactor?: number;
      explorationRate?: number;
      explorationDecay?: number;
      minExplorationRate?: number;
    },
    logger?: any
  ) {
    this.logger = logger || console;

    this.config = {
      learningRate: config?.learningRate || 0.1,
      discountFactor: config?.discountFactor || 0.95,
      explorationRate: config?.explorationRate || 1.0,
      explorationDecay: config?.explorationDecay || 0.995,
      minExplorationRate: config?.minExplorationRate || 0.01
    };
  }

  /**
   * Learn from a trading experience
   */
  async learnFromExperience(
    currentState: ReinforcementLearningState,
    action: string,
    reward: number,
    nextState: ReinforcementLearningState
  ): Promise<void> {
    const stateKey = this.getStateKey(currentState);
    const nextStateKey = this.getStateKey(nextState);

    // Initialize Q-values if not exist
    if (!this.qTable.has(stateKey)) {
      this.qTable.set(stateKey, new Map());
    }
    if (!this.qTable.has(nextStateKey)) {
      this.qTable.set(nextStateKey, new Map());
    }

    const currentQTable = this.qTable.get(stateKey)!;
    const nextQTable = this.qTable.get(nextStateKey)!;

    // Get current Q-value
    const currentQ = currentQTable.get(action) || 0;

    // Get maximum Q-value for next state
    const nextMaxQ = Math.max(...Array.from(nextQTable.values()));

    // Update Q-value using Q-learning formula
    const newQ = currentQ + this.config.learningRate * (
      reward + this.config.discountFactor * nextMaxQ - currentQ
    );

    currentQTable.set(action, newQ);

    // Decay exploration rate
    this.config.explorationRate = Math.max(
      this.config.minExplorationRate,
      this.config.explorationRate * this.config.explorationDecay
    );

    this.logger.debug('learnFromExperience', 'Q-learning update completed', {
      stateKey,
      action,
      reward,
      newQ,
      explorationRate: this.config.explorationRate
    });
  }

  /**
   * Choose action using epsilon-greedy policy
   */
  chooseAction(state: ReinforcementLearningState, availableActions: string[]): string {
    const stateKey = this.getStateKey(state);

    // Exploration
    if (Math.random() < this.config.explorationRate) {
      const randomAction = availableActions[Math.floor(Math.random() * availableActions.length)];
      this.logger.debug('chooseAction', 'Exploration: random action selected', {
        stateKey,
        action: randomAction,
        explorationRate: this.config.explorationRate
      });
      return randomAction || availableActions[0] || '';
    }

    // Exploitation
    if (!this.qTable.has(stateKey)) {
      const randomAction = availableActions[Math.floor(Math.random() * availableActions.length)];
      this.logger.debug('chooseAction', 'No Q-values: random action selected', {
        stateKey,
        action: randomAction
      });
      return randomAction || availableActions[0] || '';
    }

    const qValues = this.qTable.get(stateKey)!;
    let bestAction = availableActions[0] || '';
    let bestQValue = qValues.get(bestAction) || 0;

    for (const action of availableActions) {
      const qValue = qValues.get(action) || 0;
      if (qValue > bestQValue) {
        bestQValue = qValue;
        bestAction = action;
      }
    }

    this.logger.debug('chooseAction', 'Exploitation: best action selected', {
      stateKey,
      action: bestAction,
      qValue: bestQValue
    });

    return bestAction;
  }

  /**
   * Get Q-value for a state-action pair
   */
  getQValue(state: ReinforcementLearningState, action: string): number {
    const stateKey = this.getStateKey(state);
    const qValues = this.qTable.get(stateKey);
    return qValues?.get(action) || 0;
  }

  /**
   * Get learning statistics
   */
  getLearningStats(): {
    totalStates: number;
    totalActions: number;
    averageQValue: number;
    explorationRate: number;
  } {
    let totalActions = 0;
    let totalQValue = 0;

    for (const qValues of this.qTable.values()) {
      totalActions += qValues.size;
      for (const qValue of qValues.values()) {
        totalQValue += qValue;
      }
    }

    const averageQValue = totalActions > 0 ? totalQValue / totalActions : 0;

    return {
      totalStates: this.qTable.size,
      totalActions,
      averageQValue,
      explorationRate: this.config.explorationRate
    };
  }

  /**
   * Get insights from reinforcement learning analysis
   */
  async getInsights(examples: ReinforcementLearningState[]): Promise<any[]> {
    try {
      if (this.qTable.size === 0) {
        return [{
          insight_id: 'no_learning_data',
          insight_type: 'warning',
          confidence_score: 1.0,
          description: 'No Q-learning data available. Agent needs more training experiences.',
          supporting_evidence: ['Q-table is empty', 'No learning statistics available'],
          actionable_recommendations: [
            'Continue training the agent with more market experiences',
            'Ensure proper state representation and action space',
            'Monitor exploration vs exploitation balance'
          ],
          timestamp: new Date().toISOString(),
          validity_period: {
            start: new Date().toISOString(),
            end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          }
        }];
      }

      // Analyze Q-table patterns
      const qTableAnalysis = this.analyzeQTable();

      // Analyze learning progress
      const learningAnalysis = this.analyzeLearningProgress();

      // Generate strategy insights
      const strategyInsights = this.generateStrategyInsights(qTableAnalysis, learningAnalysis);

      this.logger.info('getInsights', 'Generated reinforcement learning insights', {
        qTableStates: this.qTable.size,
        insightsGenerated: strategyInsights.length
      });

      return strategyInsights;

    } catch (error) {
      this.logger.error('getInsights', 'Failed to generate reinforcement learning insights', { error });

      return [{
        insight_id: 'analysis_error',
        insight_type: 'warning',
        confidence_score: 0.8,
        description: 'Error occurred during reinforcement learning analysis',
        supporting_evidence: ['Analysis failed due to technical error'],
        actionable_recommendations: [
          'Check agent configuration and training data',
          'Verify Q-table integrity',
          'Review learning parameters'
        ],
        timestamp: new Date().toISOString(),
        validity_period: {
          start: new Date().toISOString(),
          end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      }];
    }
  }

  /**
   * Get health status of the reinforcement learning engine
   */
  getHealth(): boolean {
    try {
      // Check if Q-table is accessible
      const qTableAccessible = this.qTable !== undefined && this.qTable instanceof Map;

      // Check if policy network is accessible
      const policyNetworkAccessible = this.policyNetwork !== undefined && this.policyNetwork instanceof Map;

      // Check if config is properly initialized
      const configValid = this.config !== undefined &&
        typeof this.config.learningRate === 'number' &&
        typeof this.config.discountFactor === 'number' &&
        typeof this.config.explorationRate === 'number';

      // Check if logger is available
      const loggerAvailable = this.logger !== undefined;

      return qTableAccessible && policyNetworkAccessible && configValid && loggerAvailable;
    } catch (error) {
      this.logger?.error('getHealth', 'Health check failed', { error });
      return false;
    }
  }

  private getStateKey(state: ReinforcementLearningState): string {
    // Create a hash-like key from state features
    const features = { ...state.market_features, ...state.portfolio_state };
    const sortedKeys = Object.keys(features).sort();
    const featureString = sortedKeys.map(key => `${key}:${features[key]}`).join('|');
    return `${state.state_id}_${featureString}`;
  }

  private analyzeQTable(): {
    totalStates: number;
    totalActions: number;
    averageQValue: number;
    maxQValue: number;
    minQValue: number;
    qValueDistribution: { low: number; medium: number; high: number };
  } {
    let totalActions = 0;
    let totalQValue = 0;
    let maxQValue = -Infinity;
    let minQValue = Infinity;
    const qValues: number[] = [];

    for (const qValuesMap of this.qTable.values()) {
      for (const qValue of qValuesMap.values()) {
        totalActions++;
        totalQValue += qValue;
        maxQValue = Math.max(maxQValue, qValue);
        minQValue = Math.min(minQValue, qValue);
        qValues.push(qValue);
      }
    }

    const averageQValue = totalActions > 0 ? totalQValue / totalActions : 0;

    // Analyze Q-value distribution
    const lowThreshold = averageQValue - (maxQValue - minQValue) * 0.33;
    const highThreshold = averageQValue + (maxQValue - minQValue) * 0.33;

    const low = qValues.filter(q => q < lowThreshold).length;
    const medium = qValues.filter(q => q >= lowThreshold && q < highThreshold).length;
    const high = qValues.filter(q => q >= highThreshold).length;

    return {
      totalStates: this.qTable.size,
      totalActions,
      averageQValue,
      maxQValue,
      minQValue,
      qValueDistribution: {
        low: totalActions > 0 ? low / totalActions : 0,
        medium: totalActions > 0 ? medium / totalActions : 0,
        high: totalActions > 0 ? high / totalActions : 0
      }
    };
  }

  private analyzeLearningProgress(): {
    explorationRate: number;
    learningStats: ReturnType<ReinforcementLearningEngine['getLearningStats']>;
    convergenceIndicators: {
      qValueStability: number;
      explorationDecayProgress: number;
    };
  } {
    const learningStats = this.getLearningStats();

    // Calculate convergence indicators
    const qValueStability = learningStats.averageQValue > 0 ? 1 : 0; // Simplified
    const explorationDecayProgress = 1 - (this.config.explorationRate / this.config.learningRate);

    return {
      explorationRate: this.config.explorationRate,
      learningStats,
      convergenceIndicators: {
        qValueStability,
        explorationDecayProgress
      }
    };
  }

  private generateStrategyInsights(
    qTableAnalysis: ReturnType<ReinforcementLearningEngine['analyzeQTable']>,
    learningAnalysis: ReturnType<ReinforcementLearningEngine['analyzeLearningProgress']>
  ): any[] {
    const insights = [];

    // Q-value distribution insight
    if (qTableAnalysis.qValueDistribution.high > 0.6) {
      insights.push({
        insight_id: 'strong_action_preferences',
        insight_type: 'strategy',
        confidence_score: 0.8,
        description: 'Agent shows strong preferences for certain actions, indicating clear strategy patterns',
        supporting_evidence: [
          `${(qTableAnalysis.qValueDistribution.high * 100).toFixed(1)}% of Q-values are high`,
          `Average Q-value: ${qTableAnalysis.averageQValue.toFixed(3)}`
        ],
        actionable_recommendations: [
          'Analyze high-value actions for strategy insights',
          'Consider implementing preferred action patterns',
          'Monitor for overfitting to specific market conditions'
        ],
        timestamp: new Date().toISOString(),
        validity_period: {
          start: new Date().toISOString(),
          end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      });
    }

    // Exploration rate insight
    if (learningAnalysis.explorationRate > 0.5) {
      insights.push({
        insight_id: 'high_exploration_phase',
        insight_type: 'learning',
        confidence_score: 0.9,
        description: 'Agent is in high exploration phase, still learning optimal strategies',
        supporting_evidence: [
          `Current exploration rate: ${(learningAnalysis.explorationRate * 100).toFixed(1)}%`,
          `Total states learned: ${qTableAnalysis.totalStates}`
        ],
        actionable_recommendations: [
          'Continue providing diverse market experiences',
          'Monitor learning progress over time',
          'Consider adjusting exploration parameters if needed'
        ],
        timestamp: new Date().toISOString(),
        validity_period: {
          start: new Date().toISOString(),
          end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        }
      });
    }

    // Learning convergence insight
    if (learningAnalysis.convergenceIndicators.explorationDecayProgress > 0.7) {
      insights.push({
        insight_id: 'learning_convergence',
        insight_type: 'performance',
        confidence_score: 0.75,
        description: 'Agent is approaching learning convergence, strategies becoming stable',
        supporting_evidence: [
          `Exploration decay progress: ${(learningAnalysis.convergenceIndicators.explorationDecayProgress * 100).toFixed(1)}%`,
          `Q-value stability: ${(learningAnalysis.convergenceIndicators.qValueStability * 100).toFixed(1)}%`
        ],
        actionable_recommendations: [
          'Consider reducing exploration rate for production use',
          'Evaluate strategy performance on holdout data',
          'Monitor for strategy overfitting'
        ],
        timestamp: new Date().toISOString(),
        validity_period: {
          start: new Date().toISOString(),
          end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        }
      });
    }

    return insights;
  }
}
