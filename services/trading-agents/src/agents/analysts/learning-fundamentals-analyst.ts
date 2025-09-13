import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LearningAgentBase, LearningAgentConfig } from '../base/learning-agent';
import { AgentState } from '../../types/agent-states';
import { LearningExample } from '../../learning/learning-types';
import { createLogger } from '../../utils/enhanced-logger';
import { OPENAI_LLM_CONFIG, createResilientLLM } from '../../utils/resilient-llm';
import {
  FundamentalsAnalysisService,
  LearningInsightsService,
  PromptEngineeringService,
  FundamentalsLoggerService,
  createFundamentalsAnalysisService,
  createLearningInsightsService,
  createPromptEngineeringService,
  createFundamentalsLoggerService
} from './services/index';

/**
 * Learning-Enabled Fundamentals Analyst
 * Analyzes company fundamentals with integrated learning for improved valuation accuracy
 */
export class LearningFundamentalsAnalyst extends LearningAgentBase {
  private readonly fundamentalsLogger = createLogger('agent', 'LearningFundamentalsAnalyst');
  private readonly resilientLLM: BaseChatModel;

  // Service instances
  private analysisService: FundamentalsAnalysisService;
  private learningService: LearningInsightsService;
  private promptService: PromptEngineeringService;
  private loggerService: FundamentalsLoggerService;

  constructor(
    llm: BaseChatModel,
    tools: StructuredTool[],
    learningConfig?: Partial<LearningAgentConfig>
  ) {
    // Configure learning specifically for fundamentals analysis
    const defaultLearningConfig: Partial<LearningAgentConfig> = {
      enableSupervisedLearning: true,    // Learn from successful valuation predictions
      enableUnsupervisedLearning: true,  // Detect valuation patterns and anomalies
      enableReinforcementLearning: true, // Optimize analysis methodology
      learningRate: 0.03,               // Conservative learning for financial data
      memorySize: 300,                  // Keep extensive historical data
      adaptationThreshold: 0.8,         // High confidence threshold for adaptations
      feedbackLoopEnabled: true,
      ...learningConfig
    };

    super(
      'Learning Fundamentals Analyst',
      'Analyzes company fundamentals with integrated learning for improved valuation accuracy and pattern recognition',
      llm,
      { provider: 'openai', model: 'gpt-4o-mini' },
      defaultLearningConfig,
      tools
    );

    // Create resilient LLM wrapper
    this.resilientLLM = createResilientLLM(llm, OPENAI_LLM_CONFIG);

    // Initialize services
    this.analysisService = createFundamentalsAnalysisService(this.resilientLLM);
    this.learningService = createLearningInsightsService();
    this.promptService = createPromptEngineeringService();
    this.loggerService = createFundamentalsLoggerService();

    this.loggerService.logConstructorInitialization(
      this.learningEnabled,
      this.learningConfig.enableSupervisedLearning,
      this.learningConfig.enableUnsupervisedLearning,
      this.learningConfig.enableReinforcementLearning
    );
  }

  /**
   * Get enhanced system prompt with learning context
   */
  getSystemPrompt(): string {
    return this.promptService.getSystemPrompt();
  }

  /**
   * Enhanced processing with learning integration
   */
  protected async processWithLearning(state: AgentState): Promise<Partial<AgentState>> {
    this.loggerService.logProcessingStart(
      state.company_of_interest,
      state.trade_date,
      !!state.fundamentals_report
    );

    try {
      // Get learned insights to enhance analysis
      const learnedInsights = await this.getLearnedInsights();
      const highConfidenceInsights = learnedInsights.filter(i => i.confidence_score > 0.8);

      // Create enhanced system prompt with learned insights
      const enhancedSystemPrompt = this.promptService.createEnhancedSystemPrompt(highConfidenceInsights);

      // Create analysis request with learning context
      const humanMessage = this.promptService.createEnhancedAnalysisRequest(state, learnedInsights);

      this.loggerService.logProcessingPreparation(learnedInsights.length, highConfidenceInsights.length);

      // Execute enhanced analysis using analysis service
      const result = await this.analysisService.executeEnhancedAnalysis(
        state,
        enhancedSystemPrompt,
        humanMessage,
        this.name
      );

      this.loggerService.logProcessingCompletion(
        result.fundamentals_report?.length || 0,
        state.company_of_interest
      );

      return result;

    } catch (error) {
      this.loggerService.logProcessingError(
        error instanceof Error ? error.message : String(error),
        state.company_of_interest
      );

      // Fallback to basic analysis
      return await this.analysisService.performBasicAnalysis(
        state,
        this.getSystemPrompt(),
        this.name
      );
    }
  }

  /**
   * Create experience from processing for learning
   */
  protected createExperienceFromProcessing(state: AgentState, result: Partial<AgentState>): LearningExample {
    return this.learningService.createExperienceFromProcessing(state, result, this.name);
  }

  /**
   * Apply learned adaptations to fundamentals analysis strategy
   */
  protected async applyLearnedAdaptations(insights: any[], state: AgentState): Promise<void> {
    await this.learningService.applyLearnedAdaptations(insights, state);
  }

  // Helper methods moved to services
}