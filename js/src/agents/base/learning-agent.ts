import { AbstractAgent, BaseAgent } from './agent';
import { AgentState } from '../../types/agent-states';
import { AgentLLMConfig } from '../../types/agent-config';
import {
  SupervisedLearningEngine
} from '../../learning/supervised-engine';
import {
  UnsupervisedLearningEngine
} from '../../learning/unsupervised-engine';
import {
  ReinforcementLearningEngine
} from '../../learning/reinforcement-engine';
import { LearningExample, LearningInsight, ReinforcementLearningState } from '../../learning/learning-types';
import { createLogger } from '../../utils/enhanced-logger';

/**
 * Enhanced agent interface with learning capabilities
 */
export interface LearningAgent extends BaseAgent {
  // Learning engines
  supervisedEngine?: SupervisedLearningEngine;
  unsupervisedEngine?: UnsupervisedLearningEngine;
  reinforcementEngine?: ReinforcementLearningEngine;

  // Learning methods
  learnFromExperience(experience: LearningExample): Promise<void>;
  getLearnedInsights(): Promise<any[]>;
  adaptStrategy(state: AgentState): Promise<void>;

  // Learning configuration
  learningEnabled: boolean;
  learningConfig: LearningAgentConfig;
}

/**
 * Configuration for learning-enabled agents
 */
export interface LearningAgentConfig {
  enableSupervisedLearning: boolean;
  enableUnsupervisedLearning: boolean;
  enableReinforcementLearning: boolean;
  learningRate: number;
  memorySize: number;
  adaptationThreshold: number;
  feedbackLoopEnabled: boolean;
}

/**
 * Base class for agents with integrated learning capabilities
 */
export abstract class LearningAgentBase extends AbstractAgent implements LearningAgent {
  // Learning engines
  public supervisedEngine?: SupervisedLearningEngine;
  public unsupervisedEngine?: UnsupervisedLearningEngine;
  public reinforcementEngine?: ReinforcementLearningEngine;

  // Learning configuration
  public learningEnabled: boolean;
  public learningConfig: LearningAgentConfig;

  // Learning state
  private experienceBuffer: LearningExample[] = [];
  private logger: any;

  constructor(
    name: string,
    description: string,
    llm: any,
    config: AgentLLMConfig,
    learningConfig: Partial<LearningAgentConfig> = {},
    tools?: any[]
  ) {
    super(name, description, llm, tools);

    this.logger = createLogger('agent', name);

    // Initialize learning configuration with defaults
    this.learningConfig = {
      enableSupervisedLearning: true,
      enableUnsupervisedLearning: true,
      enableReinforcementLearning: true,
      learningRate: 0.1,
      memorySize: 1000,
      adaptationThreshold: 0.7,
      feedbackLoopEnabled: true,
      ...learningConfig
    };

    this.learningEnabled = this.learningConfig.enableSupervisedLearning ||
                          this.learningConfig.enableUnsupervisedLearning ||
                          this.learningConfig.enableReinforcementLearning;

    // Initialize learning engines if enabled
    this.initializeLearningEngines();
  }

  /**
   * Initialize learning engines based on configuration
   */
  private initializeLearningEngines(): void {
    if (!this.learningEnabled) return;

    try {
      if (this.learningConfig.enableSupervisedLearning) {
        this.supervisedEngine = new SupervisedLearningEngine(this.logger);
        this.logger.info('initializeLearningEngines', 'Supervised learning engine initialized');
      }

      if (this.learningConfig.enableUnsupervisedLearning) {
        this.unsupervisedEngine = new UnsupervisedLearningEngine(this.logger);
        this.logger.info('initializeLearningEngines', 'Unsupervised learning engine initialized');
      }

      if (this.learningConfig.enableReinforcementLearning) {
        this.reinforcementEngine = new ReinforcementLearningEngine({
          learningRate: this.learningConfig.learningRate,
          explorationRate: 0.8,
          discountFactor: 0.95
        }, this.logger);
        this.logger.info('initializeLearningEngines', 'Reinforcement learning engine initialized');
      }
    } catch (error) {
      this.logger.error('initializeLearningEngines', 'Failed to initialize learning engines', {
        error: error instanceof Error ? error.message : String(error)
      });
      this.learningEnabled = false;
    }
  }

  /**
   * Learn from agent experience
   */
  async learnFromExperience(experience: LearningExample): Promise<void> {
    if (!this.learningEnabled) return;

    try {
      // Add to experience buffer
      this.experienceBuffer.push(experience);

      // Keep buffer size manageable
      if (this.experienceBuffer.length > this.learningConfig.memorySize) {
        this.experienceBuffer = this.experienceBuffer.slice(-this.learningConfig.memorySize);
      }

      // Train supervised learning if available
      if (this.supervisedEngine && this.experienceBuffer.length >= 10) {
        await this.trainSupervisedModel();
      }

      // Perform unsupervised learning if available
      if (this.unsupervisedEngine && this.experienceBuffer.length >= 5) {
        await this.performUnsupervisedAnalysis();
      }

      // Update reinforcement learning if available
      if (this.reinforcementEngine) {
        await this.updateReinforcementLearning(experience);
      }

      this.logger.debug('learnFromExperience', 'Experience processed', {
        bufferSize: this.experienceBuffer.length,
        experienceId: experience.id
      });

    } catch (error) {
      this.logger.error('learnFromExperience', 'Failed to learn from experience', {
        error: error instanceof Error ? error.message : String(error),
        experienceId: experience.id
      });
    }
  }

  /**
   * Get insights learned by the agent
   */
  async getLearnedInsights(): Promise<any[]> {
    if (!this.learningEnabled) return [];

    const insights: any[] = [];

    try {
      // Get supervised learning insights
      if (this.supervisedEngine) {
        const supervisedInsights = await this.supervisedEngine.getInsights(this.experienceBuffer);
        insights.push(...supervisedInsights.map(i => ({ ...i, source: 'supervised' })));
      }

      // Get unsupervised learning insights
      if (this.unsupervisedEngine) {
        // Unsupervised insights would come from anomaly detection results
        const unsupervisedInsights = await this.getUnsupervisedInsights();
        insights.push(...unsupervisedInsights);
      }

      // Get reinforcement learning insights
      if (this.reinforcementEngine) {
        // Convert learning examples to reinforcement states for insights
        const reinforcementStates = this.experienceBuffer.map(exp => ({
          state_id: exp.id,
          market_features: exp.features,
          portfolio_state: { cash: 10000, positions: 1 },
          timestamp: exp.timestamp,
          reward: exp.outcome.realized_return
        }));

        const reinforcementInsights = await this.reinforcementEngine.getInsights(reinforcementStates);
        insights.push(...reinforcementInsights.map((i: any) => ({ ...i, source: 'reinforcement' })));
      }

      this.logger.info('getLearnedInsights', 'Retrieved learned insights', {
        totalInsights: insights.length,
        supervised: insights.filter(i => i.source === 'supervised').length,
        unsupervised: insights.filter(i => i.source === 'unsupervised').length,
        reinforcement: insights.filter(i => i.source === 'reinforcement').length
      });

      return insights;

    } catch (error) {
      this.logger.error('getLearnedInsights', 'Failed to get learned insights', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Adapt agent strategy based on learned insights
   */
  async adaptStrategy(state: AgentState): Promise<void> {
    if (!this.learningEnabled || !this.learningConfig.feedbackLoopEnabled) return;

    try {
      const insights = await this.getLearnedInsights();

      // Only adapt if we have significant insights
      const highConfidenceInsights = insights.filter(i => i.confidence_score > this.learningConfig.adaptationThreshold);

      if (highConfidenceInsights.length > 0) {
        await this.applyLearnedAdaptations(highConfidenceInsights, state);
        this.logger.info('adaptStrategy', 'Strategy adapted based on learning', {
          insightsApplied: highConfidenceInsights.length,
          company: state.company_of_interest
        });
      }

    } catch (error) {
      this.logger.error('adaptStrategy', 'Failed to adapt strategy', {
        error: error instanceof Error ? error.message : String(error),
        company: state.company_of_interest
      });
    }
  }

  /**
   * Enhanced process method with learning integration
   */
  async process(state: AgentState): Promise<Partial<AgentState>> {
    try {
      // Adapt strategy based on learning before processing
      await this.adaptStrategy(state);

      // Perform normal agent processing
      const result = await this.processWithLearning(state);

      // Learn from this experience
      if (this.learningEnabled && result) {
        await this.createAndLearnFromExperience(state, result);
      }

      return result;

    } catch (error) {
      this.logger.error('process', 'Agent processing failed', {
        error: error instanceof Error ? error.message : String(error),
        company: state.company_of_interest
      });
      throw error;
    }
  }

  // Abstract methods that concrete agents must implement
  protected abstract processWithLearning(state: AgentState): Promise<Partial<AgentState>>;
  protected abstract createExperienceFromProcessing(state: AgentState, result: Partial<AgentState>): LearningExample;
  protected abstract applyLearnedAdaptations(insights: any[], state: AgentState): Promise<void>;

  // Helper methods
  private async trainSupervisedModel(): Promise<void> {
    if (!this.supervisedEngine) return;

    try {
      const modelId = `${this.name}-model-${Date.now()}`;
      await this.supervisedEngine.trainModel(
        modelId,
        'gradient-boost',
        this.experienceBuffer,
        { learningRate: this.learningConfig.learningRate }
      );
    } catch (error) {
      this.logger.warn('trainSupervisedModel', 'Supervised training failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async performUnsupervisedAnalysis(): Promise<void> {
    if (!this.unsupervisedEngine) return;

    try {
      const examples = this.experienceBuffer.map(exp => ({
        ...exp,
        features: exp.features,
        target: exp.target
      }));

      await this.unsupervisedEngine.performClustering(examples, 3, 'kmeans');
    } catch (error) {
      this.logger.warn('performUnsupervisedAnalysis', 'Unsupervised analysis failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async updateReinforcementLearning(experience: LearningExample): Promise<void> {
    if (!this.reinforcementEngine) return;

    try {
      const currentState: ReinforcementLearningState = {
        state_id: experience.id,
        market_features: experience.features,
        portfolio_state: { cash: 10000, positions: 1 }, // Default values
        timestamp: experience.timestamp,
        reward: experience.outcome.realized_return
      };

      await this.reinforcementEngine.learnFromExperience(
        currentState,
        'HOLD', // Default action
        experience.outcome.realized_return,
        currentState
      );
    } catch (error) {
      this.logger.warn('updateReinforcementLearning', 'Reinforcement learning update failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async getUnsupervisedInsights(): Promise<any[]> {
    // This would integrate with unsupervised engine results
    // For now, return empty array
    return [];
  }

  private async createAndLearnFromExperience(state: AgentState, result: Partial<AgentState>): Promise<void> {
    try {
      const experience = this.createExperienceFromProcessing(state, result);
      await this.learnFromExperience(experience);
    } catch (error) {
      this.logger.warn('createAndLearnFromExperience', 'Failed to create learning experience', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get learning system health
   */
  getLearningHealth(): {
    enabled: boolean;
    supervised: boolean;
    unsupervised: boolean;
    reinforcement: boolean;
    experienceCount: number;
  } {
    return {
      enabled: this.learningEnabled,
      supervised: !!this.supervisedEngine?.getHealth(),
      unsupervised: !!this.unsupervisedEngine?.getHealth(),
      reinforcement: !!this.reinforcementEngine?.getHealth(),
      experienceCount: this.experienceBuffer.length
    };
  }
}