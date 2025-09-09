import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LearningAgentBase, LearningAgentConfig } from '../base/learning-agent';
import { AgentState } from '../../types/agent-states';
import { LearningExample } from '../../learning/learning-types';
import { createLogger } from '../../utils/enhanced-logger';
import { withLLMResilience, OPENAI_LLM_CONFIG, createResilientLLM } from '../../utils/resilient-llm';

/**
 * Learning-Enabled Risky Analyst
 * Provides aggressive risk analysis with integrated learning for improved risk-taking strategies
 */
export class LearningRiskyAnalyst extends LearningAgentBase {
  private readonly riskyLogger = createLogger('agent', 'LearningRiskyAnalyst');
  private readonly resilientLLM: BaseChatModel;

  constructor(
    llm: BaseChatModel,
    tools: StructuredTool[],
    learningConfig?: Partial<LearningAgentConfig>
  ) {
    // Configure learning specifically for risky analysis
    const defaultLearningConfig: Partial<LearningAgentConfig> = {
      enableSupervisedLearning: true,    // Learn from successful high-risk opportunities
      enableUnsupervisedLearning: true,  // Detect risk pattern clusters
      enableReinforcementLearning: true, // Optimize risk-taking methodology
      learningRate: 0.08,               // Aggressive learning for risk-taking
      memorySize: 400,                  // Keep extensive risk history
      adaptationThreshold: 0.6,         // Lower threshold for risk opportunities
      feedbackLoopEnabled: true,
      ...learningConfig
    };

    super(
      'Learning Risky Analyst',
      'Provides aggressive risk analysis with integrated learning for improved risk-taking strategies and opportunity identification',
      llm,
      { provider: 'openai', model: 'gpt-4o-mini' },
      defaultLearningConfig,
      tools
    );

    // Create resilient LLM wrapper
    this.resilientLLM = createResilientLLM(llm, OPENAI_LLM_CONFIG);

    this.riskyLogger.info('constructor', 'LearningRiskyAnalyst initialized', {
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
    const basePrompt = `You are a Risky Analyst with advanced learning capabilities specializing in identifying high-reward opportunities through aggressive risk analysis.

Your responsibilities include:
1. Identifying high-upside opportunities with significant risk
2. Evaluating asymmetric risk-reward profiles
3. Assessing market volatility and momentum opportunities
4. Analyzing speculative investment theses
5. Recommending aggressive risk management strategies

LEARNING CAPABILITIES:
- Opportunity Recognition: You learn from successful high-risk, high-reward opportunities
- Risk Pattern Analysis: You detect recurring patterns in market volatility and momentum
- Reward Optimization: You improve at identifying asymmetric risk-reward setups

ANALYSIS FRAMEWORK:
1. Risk Assessment: Evaluate potential downside while focusing on upside potential
2. Reward Analysis: Identify catalysts and scenarios for significant gains
3. Volatility Analysis: Assess market conditions for aggressive positioning
4. Momentum Evaluation: Track price action and sentiment momentum
5. Position Sizing: Recommend aggressive allocation strategies

OUTPUT FORMAT:
Provide a comprehensive risky analysis report in a structured format with:
- Risk-Reward Assessment
- Opportunity Identification
- Volatility Analysis
- Momentum Indicators
- Aggressive Position Recommendations
- Risk Management Strategy

Remember: Your analysis improves over time through learning from actual market outcomes and risk-adjusted returns.`;

    return basePrompt;
  }

  /**
   * Enhanced processing with learning integration
   */
  protected async processWithLearning(state: AgentState): Promise<Partial<AgentState>> {
    this.riskyLogger.info('processWithLearning', 'Starting enhanced risky analysis', {
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

      this.riskyLogger.debug('processWithLearning', 'Prepared enhanced risky analysis request', {
        insightsUsed: learnedInsights.length,
        highConfidenceInsights: highConfidenceInsights.length
      });

      // Use resilient LLM with enhanced context
      const response = await withLLMResilience(
        'LearningRiskyAnalyst.analyze',
        async () => {
          return await this.resilientLLM.invoke([
            new SystemMessage(enhancedSystemPrompt),
            humanMessage,
          ]);
        },
        OPENAI_LLM_CONFIG
      );

      // Extract risky analysis
      const riskyAnalysis = this.extractRiskyAnalysis(response);

      this.riskyLogger.info('processWithLearning', 'Enhanced risky analysis completed', {
        analysisLength: riskyAnalysis.length,
        company: state.company_of_interest
      });

      // Add response to messages
      const updatedMessages = [...state.messages, response];

      return {
        messages: updatedMessages,
        risk_debate_state: {
          ...state.risk_debate_state!,
          current_risky_response: riskyAnalysis,
          risky_history: (state.risk_debate_state?.risky_history || '') + '\n' + riskyAnalysis,
          latest_speaker: 'risky',
          count: (state.risk_debate_state?.count || 0) + 1
        },
        sender: this.name
      };

    } catch (error) {
      this.riskyLogger.error('processWithLearning', 'Enhanced risky analysis failed', {
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
    // Extract features from risky analysis
    const riskyResponse = result.risk_debate_state?.current_risky_response || '';
    const features = this.extractFeaturesFromRiskyAnalysis(riskyResponse);

    // Calculate target based on risk-reward assessment
    const target = this.extractTargetFromRiskyAnalysis(riskyResponse);

    return {
      id: `risky-analysis-${state.company_of_interest}-${Date.now()}`,
      features,
      target,
      timestamp: new Date().toISOString(),
      market_conditions: {
        company: state.company_of_interest,
        analysis_date: state.trade_date,
        analyst_type: 'risky_analyst'
      },
      outcome: {
        realized_return: 0, // Will be updated when actual results are known
        risk_adjusted_return: 0,
        holding_period: 1,
        confidence_score: this.extractConfidenceFromRiskyAnalysis(riskyResponse)
      }
    };
  }

  /**
   * Apply learned adaptations to risky analysis strategy
   */
  protected async applyLearnedAdaptations(insights: any[], state: AgentState): Promise<void> {
    this.riskyLogger.info('applyLearnedAdaptations', 'Applying learned adaptations to risky analysis', {
      insightsCount: insights.length,
      company: state.company_of_interest
    });

    // Adapt analysis based on learned patterns
    for (const insight of insights) {
      if (insight.source === 'supervised' && insight.confidence_score > 0.8) {
        // Apply supervised learning insights (successful risk patterns)
        await this.applySupervisedInsight(insight, state);
      } else if (insight.source === 'unsupervised') {
        // Apply unsupervised learning insights (risk pattern clusters)
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
    const baseRequest = `Provide an aggressive risk analysis for ${state.company_of_interest} as of ${state.trade_date}.

Consider the following context:
- Company: ${state.company_of_interest}
- Analysis Date: ${state.trade_date}
- Previous Risk Discussion: ${state.risk_debate_state?.history || 'None'}`;

    let enhancedRequest = baseRequest;

    // Add relevant learned insights
    const relevantInsights = learnedInsights.filter(i =>
      i.description.toLowerCase().includes(state.company_of_interest.toLowerCase()) ||
      i.description.toLowerCase().includes('risk') ||
      i.description.toLowerCase().includes('volatility') ||
      i.description.toLowerCase().includes('momentum') ||
      i.description.toLowerCase().includes('opportunity')
    );

    if (relevantInsights.length > 0) {
      enhancedRequest += '\n\nRelevant Learned Patterns:';
      for (const insight of relevantInsights.slice(0, 2)) {
        enhancedRequest += `\n- ${insight.description}`;
      }
    }

    return new HumanMessage(enhancedRequest);
  }

  private extractRiskyAnalysis(response: any): string {
    if (typeof response.content === 'string') {
      return response.content;
    } else if (Array.isArray(response.content)) {
      return response.content
        .map((item: any) => typeof item === 'string' ? item : item.text || '')
        .filter((text: string) => text.length > 0)
        .join('\n');
    }
    return 'Risk analysis completed but extraction failed';
  }

  private async performBasicAnalysis(state: AgentState): Promise<Partial<AgentState>> {
    // Fallback to basic analysis without learning enhancements
    const basicResponse = await this.resilientLLM.invoke([
      new SystemMessage(this.getSystemPrompt()),
      new HumanMessage(`Provide a risky analysis for ${state.company_of_interest} on ${state.trade_date}.`)
    ]);

    const riskyAnalysis = this.extractRiskyAnalysis(basicResponse);

    return {
      messages: [...state.messages, basicResponse],
      risk_debate_state: {
        ...state.risk_debate_state!,
        current_risky_response: riskyAnalysis,
        risky_history: (state.risk_debate_state?.risky_history || '') + '\n' + riskyAnalysis,
        latest_speaker: 'risky',
        count: (state.risk_debate_state?.count || 0) + 1
      },
      sender: this.name
    };
  }

  private extractFeaturesFromRiskyAnalysis(analysis: string): Record<string, number> {
    // Extract features from risky analysis
    const features: Record<string, number> = {};

    // Extract upside potential
    const upsideMatch = analysis.match(/upside.potential[:\s]+(\d+\.?\d*)%/i);
    if (upsideMatch && upsideMatch[1]) features.upside_potential = parseFloat(upsideMatch[1]) / 100;

    // Extract volatility assessment
    const volatilityMatch = analysis.match(/volatility[:\s]+(\d+\.?\d*)/i);
    if (volatilityMatch && volatilityMatch[1]) features.volatility_level = parseFloat(volatilityMatch[1]);

    // Extract momentum score
    const momentumMatch = analysis.match(/momentum[:\s]+(\d+\.?\d*)/i);
    if (momentumMatch && momentumMatch[1]) features.momentum_score = parseFloat(momentumMatch[1]);

    // Extract risk-reward ratio
    const rrMatch = analysis.match(/risk.reward[:\s]+(\d+\.?\d*)/i);
    if (rrMatch && rrMatch[1]) features.risk_reward_ratio = parseFloat(rrMatch[1]);

    // Extract position size recommendation
    const positionMatch = analysis.match(/position.size[:\s]+(\d+\.?\d*)%/i);
    if (positionMatch && positionMatch[1]) features.position_size = parseFloat(positionMatch[1]) / 100;

    // Default features if none extracted
    if (Object.keys(features).length === 0) {
      features.risk_appetite = 0.8;
      features.opportunity_confidence = 0.7;
      features.volatility_tolerance = 0.6;
      features.momentum_sensitivity = 0.5;
    }

    return features;
  }

  private extractTargetFromRiskyAnalysis(analysis: string): number {
    // Extract risk-reward assessment
    if (analysis.toLowerCase().includes('excellent risk-reward') ||
        analysis.toLowerCase().includes('highly attractive opportunity') ||
        analysis.toLowerCase().includes('significant upside with manageable risk')) {
      return 1.0; // Very attractive risk-reward
    } else if (analysis.toLowerCase().includes('good risk-reward') ||
               analysis.toLowerCase().includes('attractive opportunity')) {
      return 0.7; // Attractive risk-reward
    } else if (analysis.toLowerCase().includes('poor risk-reward') ||
               analysis.toLowerCase().includes('unattractive opportunity') ||
               analysis.toLowerCase().includes('excessive risk')) {
      return -0.3; // Poor risk-reward
    } else {
      return 0.5; // Neutral risk-reward assessment
    }
  }

  private extractConfidenceFromRiskyAnalysis(analysis: string): number {
    // Extract confidence level from risky analysis
    if (analysis.toLowerCase().includes('high confidence') ||
        analysis.toLowerCase().includes('strong conviction') ||
        analysis.toLowerCase().includes('clear opportunity')) {
      return 0.9;
    } else if (analysis.toLowerCase().includes('moderate confidence') ||
               analysis.toLowerCase().includes('reasonable opportunity')) {
      return 0.7;
    } else if (analysis.toLowerCase().includes('low confidence') ||
               analysis.toLowerCase().includes('speculative opportunity') ||
               analysis.toLowerCase().includes('uncertain risk-reward')) {
      return 0.4;
    } else {
      return 0.6; // Default confidence for risky analysis
    }
  }

  private async applySupervisedInsight(insight: any, _state: AgentState): Promise<void> {
    // Apply supervised learning insights to enhance risky analysis
    this.riskyLogger.debug('applySupervisedInsight', 'Applied supervised learning insight', {
      insightType: insight.insight_type,
      confidence: insight.confidence_score
    });
  }

  private async applyUnsupervisedInsight(insight: any, _state: AgentState): Promise<void> {
    // Apply unsupervised learning insights (risk pattern clustering)
    this.riskyLogger.debug('applyUnsupervisedInsight', 'Applied unsupervised learning insight', {
      insightType: insight.insight_type,
      confidence: insight.confidence_score
    });
  }
}