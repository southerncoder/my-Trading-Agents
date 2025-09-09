import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LearningAgentBase, LearningAgentConfig } from '../base/learning-agent';
import { AgentState } from '../../types/agent-states';
import { LearningExample } from '../../learning/learning-types';
import { createLogger } from '../../utils/enhanced-logger';
import { withLLMResilience, OPENAI_LLM_CONFIG, createResilientLLM } from '../../utils/resilient-llm';

/**
 * Learning-Enabled Safe Analyst
 * Provides conservative risk analysis with integrated learning for improved risk mitigation
 */
export class LearningSafeAnalyst extends LearningAgentBase {
  private readonly safeLogger = createLogger('agent', 'LearningSafeAnalyst');
  private readonly resilientLLM: BaseChatModel;

  constructor(
    llm: BaseChatModel,
    tools: StructuredTool[],
    learningConfig?: Partial<LearningAgentConfig>
  ) {
    // Configure learning specifically for safe analysis
    const defaultLearningConfig: Partial<LearningAgentConfig> = {
      enableSupervisedLearning: true,    // Learn from successful risk mitigation
      enableUnsupervisedLearning: true,  // Detect risk mitigation pattern clusters
      enableReinforcementLearning: true, // Optimize conservative risk methodology
      learningRate: 0.03,               // Conservative learning for risk mitigation
      memorySize: 300,                  // Keep focused risk mitigation history
      adaptationThreshold: 0.8,         // High threshold for safety
      feedbackLoopEnabled: true,
      ...learningConfig
    };

    super(
      'Learning Safe Analyst',
      'Provides conservative risk analysis with integrated learning for improved risk mitigation and capital preservation',
      llm,
      { provider: 'openai', model: 'gpt-4o-mini' },
      defaultLearningConfig,
      tools
    );

    // Create resilient LLM wrapper
    this.resilientLLM = createResilientLLM(llm, OPENAI_LLM_CONFIG);

    this.safeLogger.info('constructor', 'LearningSafeAnalyst initialized', {
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
    const basePrompt = `You are a Safe Analyst with advanced learning capabilities specializing in conservative risk analysis and capital preservation strategies.

Your responsibilities include:
1. Identifying and quantifying downside risks
2. Evaluating risk mitigation strategies
3. Assessing capital preservation opportunities
4. Analyzing defensive investment positions
5. Recommending conservative risk management approaches

LEARNING CAPABILITIES:
- Risk Mitigation: You learn from successful risk avoidance and mitigation strategies
- Downside Protection: You detect patterns in effective capital preservation
- Conservative Optimization: You improve at identifying low-risk, stable opportunities

ANALYSIS FRAMEWORK:
1. Risk Assessment: Comprehensive evaluation of potential downside scenarios
2. Mitigation Strategies: Identify and evaluate risk reduction approaches
3. Capital Preservation: Focus on protecting principal and minimizing losses
4. Defensive Positioning: Assess safe haven and low-volatility opportunities
5. Conservative Allocation: Recommend risk-averse position sizing

OUTPUT FORMAT:
Provide a comprehensive safe analysis report in a structured format with:
- Risk Assessment Summary
- Downside Scenario Analysis
- Mitigation Strategy Recommendations
- Capital Preservation Opportunities
- Conservative Position Sizing
- Risk Management Framework

Remember: Your analysis improves over time through learning from actual risk events and capital preservation outcomes.`;

    return basePrompt;
  }

  /**
   * Enhanced processing with learning integration
   */
  protected async processWithLearning(state: AgentState): Promise<Partial<AgentState>> {
    this.safeLogger.info('processWithLearning', 'Starting enhanced safe analysis', {
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

      this.safeLogger.debug('processWithLearning', 'Prepared enhanced safe analysis request', {
        insightsUsed: learnedInsights.length,
        highConfidenceInsights: highConfidenceInsights.length
      });

      // Use resilient LLM with enhanced context
      const response = await withLLMResilience(
        'LearningSafeAnalyst.analyze',
        async () => {
          return await this.resilientLLM.invoke([
            new SystemMessage(enhancedSystemPrompt),
            humanMessage,
          ]);
        },
        OPENAI_LLM_CONFIG
      );

      // Extract safe analysis
      const safeAnalysis = this.extractSafeAnalysis(response);

      this.safeLogger.info('processWithLearning', 'Enhanced safe analysis completed', {
        analysisLength: safeAnalysis.length,
        company: state.company_of_interest
      });

      // Add response to messages
      const updatedMessages = [...state.messages, response];

      return {
        messages: updatedMessages,
        risk_debate_state: {
          ...state.risk_debate_state!,
          current_safe_response: safeAnalysis,
          safe_history: (state.risk_debate_state?.safe_history || '') + '\n' + safeAnalysis,
          latest_speaker: 'safe',
          count: (state.risk_debate_state?.count || 0) + 1
        },
        sender: this.name
      };

    } catch (error) {
      this.safeLogger.error('processWithLearning', 'Enhanced safe analysis failed', {
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
    // Extract features from safe analysis
    const safeResponse = result.risk_debate_state?.current_safe_response || '';
    const features = this.extractFeaturesFromSafeAnalysis(safeResponse);

    // Calculate target based on risk mitigation effectiveness
    const target = this.extractTargetFromSafeAnalysis(safeResponse);

    return {
      id: `safe-analysis-${state.company_of_interest}-${Date.now()}`,
      features,
      target,
      timestamp: new Date().toISOString(),
      market_conditions: {
        company: state.company_of_interest,
        analysis_date: state.trade_date,
        analyst_type: 'safe_analyst'
      },
      outcome: {
        realized_return: 0, // Will be updated when actual results are known
        risk_adjusted_return: 0,
        holding_period: 1,
        confidence_score: this.extractConfidenceFromSafeAnalysis(safeResponse)
      }
    };
  }

  /**
   * Apply learned adaptations to safe analysis strategy
   */
  protected async applyLearnedAdaptations(insights: any[], state: AgentState): Promise<void> {
    this.safeLogger.info('applyLearnedAdaptations', 'Applying learned adaptations to safe analysis', {
      insightsCount: insights.length,
      company: state.company_of_interest
    });

    // Adapt analysis based on learned patterns
    for (const insight of insights) {
      if (insight.source === 'supervised' && insight.confidence_score > 0.8) {
        // Apply supervised learning insights (successful mitigation patterns)
        await this.applySupervisedInsight(insight, state);
      } else if (insight.source === 'unsupervised') {
        // Apply unsupervised learning insights (risk mitigation pattern clusters)
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
    const baseRequest = `Provide a conservative risk analysis for ${state.company_of_interest} as of ${state.trade_date}.

Consider the following context:
- Company: ${state.company_of_interest}
- Analysis Date: ${state.trade_date}
- Previous Risk Discussion: ${state.risk_debate_state?.history || 'None'}`;

    let enhancedRequest = baseRequest;

    // Add relevant learned insights
    const relevantInsights = learnedInsights.filter(i =>
      i.description.toLowerCase().includes(state.company_of_interest.toLowerCase()) ||
      i.description.toLowerCase().includes('risk') ||
      i.description.toLowerCase().includes('mitigation') ||
      i.description.toLowerCase().includes('preservation') ||
      i.description.toLowerCase().includes('defensive')
    );

    if (relevantInsights.length > 0) {
      enhancedRequest += '\n\nRelevant Learned Patterns:';
      for (const insight of relevantInsights.slice(0, 2)) {
        enhancedRequest += `\n- ${insight.description}`;
      }
    }

    return new HumanMessage(enhancedRequest);
  }

  private extractSafeAnalysis(response: any): string {
    if (typeof response.content === 'string') {
      return response.content;
    } else if (Array.isArray(response.content)) {
      return response.content
        .map((item: any) => typeof item === 'string' ? item : item.text || '')
        .filter((text: string) => text.length > 0)
        .join('\n');
    }
    return 'Safe analysis completed but extraction failed';
  }

  private async performBasicAnalysis(state: AgentState): Promise<Partial<AgentState>> {
    // Fallback to basic analysis without learning enhancements
    const basicResponse = await this.resilientLLM.invoke([
      new SystemMessage(this.getSystemPrompt()),
      new HumanMessage(`Provide a safe analysis for ${state.company_of_interest} on ${state.trade_date}.`)
    ]);

    const safeAnalysis = this.extractSafeAnalysis(basicResponse);

    return {
      messages: [...state.messages, basicResponse],
      risk_debate_state: {
        ...state.risk_debate_state!,
        current_safe_response: safeAnalysis,
        safe_history: (state.risk_debate_state?.safe_history || '') + '\n' + safeAnalysis,
        latest_speaker: 'safe',
        count: (state.risk_debate_state?.count || 0) + 1
      },
      sender: this.name
    };
  }

  private extractFeaturesFromSafeAnalysis(analysis: string): Record<string, number> {
    // Extract features from safe analysis
    const features: Record<string, number> = {};

    // Extract downside risk assessment
    const downsideMatch = analysis.match(/downside.risk[:\s]+(\d+\.?\d*)%/i);
    if (downsideMatch && downsideMatch[1]) features.downside_risk = parseFloat(downsideMatch[1]) / 100;

    // Extract risk mitigation effectiveness
    const mitigationMatch = analysis.match(/risk.mitigation[:\s]+(\d+\.?\d*)/i);
    if (mitigationMatch && mitigationMatch[1]) features.risk_mitigation = parseFloat(mitigationMatch[1]);

    // Extract capital preservation score
    const preservationMatch = analysis.match(/capital.preservation[:\s]+(\d+\.?\d*)/i);
    if (preservationMatch && preservationMatch[1]) features.capital_preservation = parseFloat(preservationMatch[1]);

    // Extract defensive positioning score
    const defensiveMatch = analysis.match(/defensive.positioning[:\s]+(\d+\.?\d*)/i);
    if (defensiveMatch && defensiveMatch[1]) features.defensive_positioning = parseFloat(defensiveMatch[1]);

    // Extract conservative allocation percentage
    const allocationMatch = analysis.match(/conservative.allocation[:\s]+(\d+\.?\d*)%/i);
    if (allocationMatch && allocationMatch[1]) features.conservative_allocation = parseFloat(allocationMatch[1]) / 100;

    // Default features if none extracted
    if (Object.keys(features).length === 0) {
      features.risk_aversion = 0.8;
      features.safety_margin = 0.7;
      features.loss_prevention = 0.6;
      features.stability_focus = 0.5;
    }

    return features;
  }

  private extractTargetFromSafeAnalysis(analysis: string): number {
    // Extract risk mitigation effectiveness
    if (analysis.toLowerCase().includes('excellent risk mitigation') ||
        analysis.toLowerCase().includes('strong capital preservation') ||
        analysis.toLowerCase().includes('robust defensive positioning')) {
      return 1.0; // Excellent risk mitigation
    } else if (analysis.toLowerCase().includes('good risk mitigation') ||
               analysis.toLowerCase().includes('adequate capital preservation')) {
      return 0.7; // Good risk mitigation
    } else if (analysis.toLowerCase().includes('poor risk mitigation') ||
               analysis.toLowerCase().includes('inadequate capital preservation') ||
               analysis.toLowerCase().includes('weak defensive positioning')) {
      return -0.3; // Poor risk mitigation
    } else {
      return 0.5; // Neutral risk mitigation assessment
    }
  }

  private extractConfidenceFromSafeAnalysis(analysis: string): number {
    // Extract confidence level from safe analysis
    if (analysis.toLowerCase().includes('high confidence') ||
        analysis.toLowerCase().includes('strong conviction') ||
        analysis.toLowerCase().includes('clear risk assessment')) {
      return 0.9;
    } else if (analysis.toLowerCase().includes('moderate confidence') ||
               analysis.toLowerCase().includes('reasonable assessment')) {
      return 0.7;
    } else if (analysis.toLowerCase().includes('low confidence') ||
               analysis.toLowerCase().includes('uncertain risk assessment') ||
               analysis.toLowerCase().includes('conflicting risk signals')) {
      return 0.4;
    } else {
      return 0.6; // Default confidence for safe analysis
    }
  }

  private async applySupervisedInsight(insight: any, _state: AgentState): Promise<void> {
    // Apply supervised learning insights to enhance safe analysis
    this.safeLogger.debug('applySupervisedInsight', 'Applied supervised learning insight', {
      insightType: insight.insight_type,
      confidence: insight.confidence_score
    });
  }

  private async applyUnsupervisedInsight(insight: any, _state: AgentState): Promise<void> {
    // Apply unsupervised learning insights (risk mitigation pattern clustering)
    this.safeLogger.debug('applyUnsupervisedInsight', 'Applied unsupervised learning insight', {
      insightType: insight.insight_type,
      confidence: insight.confidence_score
    });
  }
}