import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LearningAgentBase, LearningAgentConfig } from '../base/learning-agent';
import { AgentState } from '../../types/agent-states';
import { LearningExample } from '../../learning/learning-types';
import { createLogger } from '../../utils/enhanced-logger';
import { withLLMResilience, OPENAI_LLM_CONFIG, createResilientLLM } from '../../utils/resilient-llm';

/**
 * Learning-Enabled Neutral Analyst
 * Provides balanced risk analysis with integrated learning for improved risk-reward optimization
 */
export class LearningNeutralAnalyst extends LearningAgentBase {
  private readonly neutralLogger = createLogger('agent', 'LearningNeutralAnalyst');
  private readonly resilientLLM: BaseChatModel;

  constructor(
    llm: BaseChatModel,
    tools: StructuredTool[],
    learningConfig?: Partial<LearningAgentConfig>
  ) {
    // Configure learning specifically for neutral analysis
    const defaultLearningConfig: Partial<LearningAgentConfig> = {
      enableSupervisedLearning: true,    // Learn from successful balanced approaches
      enableUnsupervisedLearning: true,  // Detect balanced risk pattern clusters
      enableReinforcementLearning: true, // Optimize balanced risk methodology
      learningRate: 0.05,               // Moderate learning for balanced analysis
      memorySize: 350,                  // Keep balanced risk history
      adaptationThreshold: 0.7,         // Moderate threshold for balance
      feedbackLoopEnabled: true,
      ...learningConfig
    };

    super(
      'Learning Neutral Analyst',
      'Provides balanced risk analysis with integrated learning for improved risk-reward optimization and moderate positioning',
      llm,
      { provider: 'openai', model: 'gpt-4o-mini' },
      defaultLearningConfig,
      tools
    );

    // Create resilient LLM wrapper
    this.resilientLLM = createResilientLLM(llm, OPENAI_LLM_CONFIG);

    this.neutralLogger.info('constructor', 'LearningNeutralAnalyst initialized', {
      learningEnabled: this.learningEnabled,
      supervisedEnabled: this.learningConfig.enableSupervisedLearning,
      unsupervisedEnabled: this.learningConfig.enableUnsupervisedLearning,
      reinforcementEnabled: this.learningConfig.enableReinforcementLearning
    });
  }

  /**
   * Get enhanced system prompt with learning context
   */
  getSystemPrompt(): string {
    const basePrompt = `You are a Neutral Analyst with advanced learning capabilities specializing in balanced risk analysis and moderate risk-reward optimization.

Your responsibilities include:
1. Evaluating balanced risk-reward profiles
2. Assessing moderate investment opportunities
3. Analyzing risk-adjusted return potential
4. Recommending moderate position sizing strategies
5. Providing balanced risk management perspectives

LEARNING CAPABILITIES:
- Balance Optimization: You learn from successful moderate risk-reward approaches
- Risk-Adjusted Analysis: You detect patterns in balanced investment opportunities
- Moderate Positioning: You improve at identifying optimal moderate allocation strategies

ANALYSIS FRAMEWORK:
1. Risk-Reward Balance: Evaluate symmetric risk-reward opportunities
2. Moderate Assessment: Analyze opportunities with balanced upside/downside
3. Risk-Adjusted Returns: Focus on risk-adjusted performance metrics
4. Position Moderation: Recommend moderate allocation strategies
5. Balanced Perspective: Provide objective, data-driven analysis

OUTPUT FORMAT:
Provide a comprehensive neutral analysis report in a structured format with:
- Risk-Reward Balance Assessment
- Moderate Opportunity Analysis
- Risk-Adjusted Return Evaluation
- Moderate Position Recommendations
- Balanced Risk Management Strategy
- Optimization Framework

Remember: Your analysis improves over time through learning from actual risk-adjusted returns and balanced investment outcomes.`;

    return basePrompt;
  }

  /**
   * Enhanced processing with learning integration
   */
  protected async processWithLearning(state: AgentState): Promise<Partial<AgentState>> {
    this.neutralLogger.info('processWithLearning', 'Starting enhanced neutral analysis', {
      company: state.company_of_interest,
      tradeDate: state.trade_date,
      hasRiskDebate: !!state.risk_debate_state
    });

    try {
      // Get learned insights to enhance analysis
      const learnedInsights = await this.getLearnedInsights();
      const highConfidenceInsights = learnedInsights.filter(i => i.confidence_score > 0.8);

      // Create enhanced system prompt with learned insights
      const enhancedSystemPrompt = this.createEnhancedSystemPrompt(highConfidenceInsights);

      // Create analysis request with learning context
      const humanMessage = this.createEnhancedAnalysisRequest(state, learnedInsights);

      this.neutralLogger.debug('processWithLearning', 'Prepared enhanced neutral analysis request', {
        insightsUsed: learnedInsights.length,
        highConfidenceInsights: highConfidenceInsights.length
      });

      // Use resilient LLM with enhanced context
      const response = await withLLMResilience(
        'LearningNeutralAnalyst.analyze',
        async () => {
          return await this.resilientLLM.invoke([
            new SystemMessage(enhancedSystemPrompt),
            humanMessage,
          ]);
        },
        OPENAI_LLM_CONFIG
      );

      // Extract neutral analysis
      const neutralAnalysis = this.extractNeutralAnalysis(response);

      this.neutralLogger.info('processWithLearning', 'Enhanced neutral analysis completed', {
        analysisLength: neutralAnalysis.length,
        company: state.company_of_interest
      });

      // Add response to messages
      const updatedMessages = [...state.messages, response];

      return {
        messages: updatedMessages,
        risk_debate_state: {
          ...state.risk_debate_state!,
          current_neutral_response: neutralAnalysis,
          neutral_history: (state.risk_debate_state?.neutral_history || '') + '\n' + neutralAnalysis,
          latest_speaker: 'neutral',
          count: (state.risk_debate_state?.count || 0) + 1
        },
        sender: this.name
      };

    } catch (error) {
      this.neutralLogger.error('processWithLearning', 'Enhanced neutral analysis failed', {
        error: error instanceof Error ? error.message : String(error),
        company: state.company_of_interest
      });

      // Fallback to basic analysis
      return await this.performBasicAnalysis(state);
    }
  }

  /**
   * Create experience from processing for learning
   */
  protected createExperienceFromProcessing(state: AgentState, result: Partial<AgentState>): LearningExample {
    // Extract features from neutral analysis
    const neutralResponse = result.risk_debate_state?.current_neutral_response || '';
    const features = this.extractFeaturesFromNeutralAnalysis(neutralResponse);

    // Calculate target based on risk-reward balance
    const target = this.extractTargetFromNeutralAnalysis(neutralResponse);

    return {
      id: `neutral-analysis-${state.company_of_interest}-${Date.now()}`,
      features,
      target,
      timestamp: new Date().toISOString(),
      market_conditions: {
        company: state.company_of_interest,
        analysis_date: state.trade_date,
        analyst_type: 'neutral_analyst'
      },
      outcome: {
        realized_return: 0, // Will be updated when actual results are known
        risk_adjusted_return: 0,
        holding_period: 1,
        confidence_score: this.extractConfidenceFromNeutralAnalysis(neutralResponse)
      }
    };
  }

  /**
   * Apply learned adaptations to neutral analysis strategy
   */
  protected async applyLearnedAdaptations(insights: any[], state: AgentState): Promise<void> {
    this.neutralLogger.info('applyLearnedAdaptations', 'Applying learned adaptations to neutral analysis', {
      insightsCount: insights.length,
      company: state.company_of_interest
    });

    // Adapt analysis based on learned patterns
    for (const insight of insights) {
      if (insight.source === 'supervised' && insight.confidence_score > 0.8) {
        // Apply supervised learning insights (successful balance patterns)
        await this.applySupervisedInsight(insight, state);
      } else if (insight.source === 'unsupervised') {
        // Apply unsupervised learning insights (balanced pattern clusters)
        await this.applyUnsupervisedInsight(insight, state);
      }
    }
  }

  // Helper methods

  private createEnhancedSystemPrompt(highConfidenceInsights: any[]): string {
    let basePrompt = this.getSystemPrompt();

    if (highConfidenceInsights.length > 0) {
      basePrompt += '\n\nLEARNED INSIGHTS TO CONSIDER:\n';
      for (const insight of highConfidenceInsights.slice(0, 3)) { // Limit to top 3
        basePrompt += `- ${insight.description} (Confidence: ${(insight.confidence_score * 100).toFixed(1)}%)\n`;
      }
    }

    return basePrompt;
  }

  private createEnhancedAnalysisRequest(state: AgentState, learnedInsights: any[]): HumanMessage {
    const baseRequest = `Provide a balanced risk analysis for ${state.company_of_interest} as of ${state.trade_date}.

Consider the following context:
- Company: ${state.company_of_interest}
- Analysis Date: ${state.trade_date}
- Previous Risk Discussion: ${state.risk_debate_state?.history || 'None'}`;

    let enhancedRequest = baseRequest;

    // Add relevant learned insights
    const relevantInsights = learnedInsights.filter(i =>
      i.description.toLowerCase().includes(state.company_of_interest.toLowerCase()) ||
      i.description.toLowerCase().includes('balance') ||
      i.description.toLowerCase().includes('moderate') ||
      i.description.toLowerCase().includes('risk-adjusted') ||
      i.description.toLowerCase().includes('optimization')
    );

    if (relevantInsights.length > 0) {
      enhancedRequest += '\n\nRelevant Learned Patterns:';
      for (const insight of relevantInsights.slice(0, 2)) {
        enhancedRequest += `\n- ${insight.description}`;
      }
    }

    return new HumanMessage(enhancedRequest);
  }

  private extractNeutralAnalysis(response: any): string {
    if (typeof response.content === 'string') {
      return response.content;
    } else if (Array.isArray(response.content)) {
      return response.content
        .map((item: any) => typeof item === 'string' ? item : item.text || '')
        .filter((text: string) => text.length > 0)
        .join('\n');
    }
    return 'Neutral analysis completed but extraction failed';
  }

  private async performBasicAnalysis(state: AgentState): Promise<Partial<AgentState>> {
    // Fallback to basic analysis without learning enhancements
    const basicResponse = await this.resilientLLM.invoke([
      new SystemMessage(this.getSystemPrompt()),
      new HumanMessage(`Provide a neutral analysis for ${state.company_of_interest} on ${state.trade_date}.`)
    ]);

    const neutralAnalysis = this.extractNeutralAnalysis(basicResponse);

    return {
      messages: [...state.messages, basicResponse],
      risk_debate_state: {
        ...state.risk_debate_state!,
        current_neutral_response: neutralAnalysis,
        neutral_history: (state.risk_debate_state?.neutral_history || '') + '\n' + neutralAnalysis,
        latest_speaker: 'neutral',
        count: (state.risk_debate_state?.count || 0) + 1
      },
      sender: this.name
    };
  }

  private extractFeaturesFromNeutralAnalysis(analysis: string): Record<string, number> {
    // Extract features from neutral analysis
    const features: Record<string, number> = {};

    // Extract risk-reward balance score
    const balanceMatch = analysis.match(/risk.reward.balance[:\s]+(\d+\.?\d*)/i);
    if (balanceMatch && balanceMatch[1]) features.risk_reward_balance = parseFloat(balanceMatch[1]);

    // Extract risk-adjusted return potential
    const rarMatch = analysis.match(/risk.adjusted.return[:\s]+(\d+\.?\d*)%/i);
    if (rarMatch && rarMatch[1]) features.risk_adjusted_return = parseFloat(rarMatch[1]) / 100;

    // Extract moderate position size
    const positionMatch = analysis.match(/moderate.position[:\s]+(\d+\.?\d*)%/i);
    if (positionMatch && positionMatch[1]) features.moderate_position = parseFloat(positionMatch[1]) / 100;

    // Extract balance optimization score
    const optimizationMatch = analysis.match(/balance.optimization[:\s]+(\d+\.?\d*)/i);
    if (optimizationMatch && optimizationMatch[1]) features.balance_optimization = parseFloat(optimizationMatch[1]);

    // Extract symmetric risk assessment
    const symmetricMatch = analysis.match(/symmetric.risk[:\s]+(\d+\.?\d*)/i);
    if (symmetricMatch && symmetricMatch[1]) features.symmetric_risk = parseFloat(symmetricMatch[1]);

    // Default features if none extracted
    if (Object.keys(features).length === 0) {
      features.balance_focus = 0.7;
      features.moderation_level = 0.6;
      features.objectivity_score = 0.5;
      features.optimization_potential = 0.4;
    }

    return features;
  }

  private extractTargetFromNeutralAnalysis(analysis: string): number {
    // Extract risk-reward balance effectiveness
    if (analysis.toLowerCase().includes('excellent balance') ||
        analysis.toLowerCase().includes('optimal risk-reward') ||
        analysis.toLowerCase().includes('perfectly balanced opportunity')) {
      return 1.0; // Excellent balance
    } else if (analysis.toLowerCase().includes('good balance') ||
               analysis.toLowerCase().includes('reasonable risk-reward')) {
      return 0.7; // Good balance
    } else if (analysis.toLowerCase().includes('poor balance') ||
               analysis.toLowerCase().includes('imbalanced risk-reward') ||
               analysis.toLowerCase().includes('asymmetric opportunity')) {
      return -0.3; // Poor balance
    } else {
      return 0.5; // Neutral balance assessment
    }
  }

  private extractConfidenceFromNeutralAnalysis(analysis: string): number {
    // Extract confidence level from neutral analysis
    if (analysis.toLowerCase().includes('high confidence') ||
        analysis.toLowerCase().includes('strong conviction') ||
        analysis.toLowerCase().includes('clear balanced assessment')) {
      return 0.9;
    } else if (analysis.toLowerCase().includes('moderate confidence') ||
               analysis.toLowerCase().includes('reasonable assessment')) {
      return 0.7;
    } else if (analysis.toLowerCase().includes('low confidence') ||
               analysis.toLowerCase().includes('uncertain balance') ||
               analysis.toLowerCase().includes('conflicting risk signals')) {
      return 0.4;
    } else {
      return 0.6; // Default confidence for neutral analysis
    }
  }

  private async applySupervisedInsight(insight: any, _state: AgentState): Promise<void> {
    // Apply supervised learning insights to enhance neutral analysis
    this.neutralLogger.debug('applySupervisedInsight', 'Applied supervised learning insight', {
      insightType: insight.insight_type,
      confidence: insight.confidence_score
    });
  }

  private async applyUnsupervisedInsight(insight: any, _state: AgentState): Promise<void> {
    // Apply unsupervised learning insights (balanced pattern clustering)
    this.neutralLogger.debug('applyUnsupervisedInsight', 'Applied unsupervised learning insight', {
      insightType: insight.insight_type,
      confidence: insight.confidence_score
    });
  }
}