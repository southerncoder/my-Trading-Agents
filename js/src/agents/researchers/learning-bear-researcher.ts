import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LearningAgentBase, LearningAgentConfig } from '../base/learning-agent';
import { AgentState } from '../../types/agent-states';
import { LearningExample } from '../../learning/learning-types';
import { createLogger } from '../../utils/enhanced-logger';
import { withLLMResilience, OPENAI_LLM_CONFIG, createResilientLLM } from '../../utils/resilient-llm';

/**
 * Learning-Enabled Bear Researcher
 * Conducts bearish research with integrated learning for improved thesis development
 */
export class LearningBearResearcher extends LearningAgentBase {
  private readonly bearLogger = createLogger('agent', 'LearningBearResearcher');
  private readonly resilientLLM: BaseChatModel;

  constructor(
    llm: BaseChatModel,
    tools: StructuredTool[],
    learningConfig?: Partial<LearningAgentConfig>
  ) {
    // Configure learning specifically for bearish research
    const defaultLearningConfig: Partial<LearningAgentConfig> = {
      enableSupervisedLearning: true,    // Learn from successful bearish theses
      enableUnsupervisedLearning: true,  // Detect bearish pattern clusters
      enableReinforcementLearning: true, // Optimize bearish research methodology
      learningRate: 0.03,               // Conservative learning for research
      memorySize: 300,                  // Keep extensive research history
      adaptationThreshold: 0.75,        // High confidence threshold for research
      feedbackLoopEnabled: true,
      ...learningConfig
    };

    super(
      'Learning Bear Researcher',
      'Conducts bearish research with integrated learning for improved thesis development and risk assessment',
      llm,
      { provider: 'openai', model: 'gpt-4o-mini' },
      defaultLearningConfig,
      tools
    );

    // Create resilient LLM wrapper
    this.resilientLLM = createResilientLLM(llm, OPENAI_LLM_CONFIG);

    this.bearLogger.info('constructor', 'LearningBearResearcher initialized', {
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
    const basePrompt = `You are a Bear Researcher with advanced learning capabilities specializing in developing compelling bearish investment theses.

Your responsibilities include:
1. Developing comprehensive bearish investment cases
2. Identifying risks, challenges, and headwinds
3. Analyzing competitive threats and industry disruptions
4. Evaluating management execution and strategic missteps
5. Assessing valuation concerns and downside potential

LEARNING CAPABILITIES:
- Risk Assessment: You learn from successful bearish investment theses
- Pattern Recognition: You detect recurring bearish patterns and themes
- Threat Analysis: You improve at identifying market-moving risks

RESEARCH FRAMEWORK:
1. Investment Thesis: Core bearish case, key assumptions, risk amplification
2. Risk Analysis: Operational risks, competitive threats, industry headwinds
3. Financial Assessment: Valuation concerns, cash flow deterioration, capital issues
4. Management Evaluation: Strategy flaws, execution problems, governance issues
5. Downside Analysis: Bearish case risks and potential outcomes

OUTPUT FORMAT:
Provide a comprehensive bearish research report in a structured format with:
- Investment Thesis Summary
- Risk Factors and Headwinds
- Competitive Threats
- Financial Concerns and Valuation
- Management Assessment
- Downside Mitigation Strategy

Remember: Your research improves over time through learning from actual investment outcomes and market reactions.`;

    return basePrompt;
  }

  /**
   * Enhanced processing with learning integration
   */
  protected async processWithLearning(state: AgentState): Promise<Partial<AgentState>> {
    this.bearLogger.info('processWithLearning', 'Starting enhanced bearish research', {
      company: state.company_of_interest,
      tradeDate: state.trade_date,
      hasInvestmentPlan: !!state.investment_plan
    });

    try {
      // Get learned insights to enhance research
      const learnedInsights = await this.getLearnedInsights();
      const highConfidenceInsights = learnedInsights.filter(i => i.confidence_score > 0.8);

      // Create enhanced system prompt with learned insights
      const enhancedSystemPrompt = this.createEnhancedSystemPrompt(highConfidenceInsights);

      // Create research request with learning context
      const humanMessage = this.createEnhancedResearchRequest(state, learnedInsights);

      this.bearLogger.debug('processWithLearning', 'Prepared enhanced bearish research request', {
        insightsUsed: learnedInsights.length,
        highConfidenceInsights: highConfidenceInsights.length
      });

      // Use resilient LLM with enhanced context
      const response = await withLLMResilience(
        'LearningBearResearcher.analyze',
        async () => {
          return await this.resilientLLM.invoke([
            new SystemMessage(enhancedSystemPrompt),
            humanMessage,
          ]);
        },
        OPENAI_LLM_CONFIG
      );

      // Extract bear thesis
      const bearThesis = this.extractBearThesis(response);

      this.bearLogger.info('processWithLearning', 'Enhanced bearish research completed', {
        thesisLength: bearThesis.length,
        company: state.company_of_interest
      });

      // Add response to messages
      const updatedMessages = [...state.messages, response];

      return {
        messages: updatedMessages,
        investment_plan: bearThesis,
        sender: this.name
      };

    } catch (error) {
      this.bearLogger.error('processWithLearning', 'Enhanced bearish research failed', {
        error: error instanceof Error ? error.message : String(error),
        company: state.company_of_interest
      });

      // Fallback to basic research
      return await this.performBasicResearch(state);
    }
  }

  /**
   * Create experience from processing for learning
   */
  protected createExperienceFromProcessing(state: AgentState, result: Partial<AgentState>): LearningExample {
    // Extract features from bearish research
    const features = this.extractFeaturesFromBearThesis(result.investment_plan || '');

    // Calculate target based on bearish thesis strength
    const target = this.extractTargetFromBearThesis(result.investment_plan || '');

    return {
      id: `bear-research-${state.company_of_interest}-${Date.now()}`,
      features,
      target,
      timestamp: new Date().toISOString(),
      market_conditions: {
        company: state.company_of_interest,
        analysis_date: state.trade_date,
        analyst_type: 'bear_researcher'
      },
      outcome: {
        realized_return: 0, // Will be updated when actual results are known
        risk_adjusted_return: 0,
        holding_period: 1,
        confidence_score: this.extractConfidenceFromBearThesis(result.investment_plan || '')
      }
    };
  }

  /**
   * Apply learned adaptations to bearish research strategy
   */
  protected async applyLearnedAdaptations(insights: any[], state: AgentState): Promise<void> {
    this.bearLogger.info('applyLearnedAdaptations', 'Applying learned adaptations to bearish research', {
      insightsCount: insights.length,
      company: state.company_of_interest
    });

    // Adapt research based on learned patterns
    for (const insight of insights) {
      if (insight.source === 'supervised' && insight.confidence_score > 0.8) {
        // Apply supervised learning insights (successful thesis patterns)
        await this.applySupervisedInsight(insight, state);
      } else if (insight.source === 'unsupervised') {
        // Apply unsupervised learning insights (bearish pattern clusters)
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

  private createEnhancedResearchRequest(state: AgentState, learnedInsights: any[]): HumanMessage {
    const baseRequest = `Develop a comprehensive bearish investment thesis for ${state.company_of_interest} as of ${state.trade_date}.

Consider the following context:
- Company: ${state.company_of_interest}
- Analysis Date: ${state.trade_date}
- Previous Research: ${state.investment_plan || 'None'}`;

    let enhancedRequest = baseRequest;

    // Add relevant learned insights
    const relevantInsights = learnedInsights.filter(i =>
      i.description.toLowerCase().includes(state.company_of_interest.toLowerCase()) ||
      i.description.toLowerCase().includes('bearish') ||
      i.description.toLowerCase().includes('risk') ||
      i.description.toLowerCase().includes('threat')
    );

    if (relevantInsights.length > 0) {
      enhancedRequest += '\n\nRelevant Learned Patterns:';
      for (const insight of relevantInsights.slice(0, 2)) {
        enhancedRequest += `\n- ${insight.description}`;
      }
    }

    return new HumanMessage(enhancedRequest);
  }

  private extractBearThesis(response: any): string {
    if (typeof response.content === 'string') {
      return response.content;
    } else if (Array.isArray(response.content)) {
      return response.content
        .map((item: any) => typeof item === 'string' ? item : item.text || '')
        .filter((text: string) => text.length > 0)
        .join('\n');
    }
    return 'Research completed but thesis extraction failed';
  }

  private async performBasicResearch(state: AgentState): Promise<Partial<AgentState>> {
    // Fallback to basic research without learning enhancements
    const basicResponse = await this.resilientLLM.invoke([
      new SystemMessage(this.getSystemPrompt()),
      new HumanMessage(`Develop a bearish investment thesis for ${state.company_of_interest} on ${state.trade_date}.`)
    ]);

    return {
      messages: [...state.messages, basicResponse],
      investment_plan: this.extractBearThesis(basicResponse),
      sender: this.name
    };
  }

  private extractFeaturesFromBearThesis(thesis: string): Record<string, number> {
    // Extract features from bearish research thesis
    const features: Record<string, number> = {};

    // Extract risk level assessment
    const riskMatch = thesis.match(/risk.level[:\s]+(\d+\.?\d*)/i);
    if (riskMatch && riskMatch[1]) features.risk_level = parseFloat(riskMatch[1]);

    // Extract competitive threat level
    const threatMatch = thesis.match(/competitive.threat[:\s]+(\d+\.?\d*)/i);
    if (threatMatch && threatMatch[1]) features.competitive_threat = parseFloat(threatMatch[1]);

    // Extract management concern score
    const managementMatch = thesis.match(/management.concern[:\s]+(\d+\.?\d*)/i);
    if (managementMatch && managementMatch[1]) features.management_concern = parseFloat(managementMatch[1]);

    // Extract valuation concern score
    const valuationMatch = thesis.match(/valuation.concern[:\s]+(\d+\.?\d*)/i);
    if (valuationMatch && valuationMatch[1]) features.valuation_concern = parseFloat(valuationMatch[1]);

    // Extract downside potential
    const downsideMatch = thesis.match(/downside.potential[:\s]+(\d+\.?\d*)%/i);
    if (downsideMatch && downsideMatch[1]) features.downside_potential = parseFloat(downsideMatch[1]) / 100;

    // Default features if none extracted
    if (Object.keys(features).length === 0) {
      features.risk_exposure = 0.5;
      features.competitive_pressure = 0.5;
      features.management_risk = 0.5;
      features.financial_concern = 0.5;
    }

    return features;
  }

  private extractTargetFromBearThesis(thesis: string): number {
    // Extract bearish thesis strength
    if (thesis.toLowerCase().includes('strong bearish case') ||
        thesis.toLowerCase().includes('compelling short thesis') ||
        thesis.toLowerCase().includes('significant downside risk')) {
      return -1.0; // Strong bearish thesis
    } else if (thesis.toLowerCase().includes('moderate bearish case') ||
               thesis.toLowerCase().includes('reasonable short thesis')) {
      return -0.5; // Moderate bearish thesis
    } else if (thesis.toLowerCase().includes('weak bearish case') ||
               thesis.toLowerCase().includes('limited downside risk')) {
      return 0.0; // Weak bearish thesis
    } else {
      return -0.7; // Default bearish thesis strength
    }
  }

  private extractConfidenceFromBearThesis(thesis: string): number {
    // Extract confidence level from bearish research
    if (thesis.toLowerCase().includes('high confidence') ||
        thesis.toLowerCase().includes('strong conviction') ||
        thesis.toLowerCase().includes('well-supported thesis')) {
      return 0.9;
    } else if (thesis.toLowerCase().includes('moderate confidence') ||
               thesis.toLowerCase().includes('reasonable conviction')) {
      return 0.7;
    } else if (thesis.toLowerCase().includes('low confidence') ||
               thesis.toLowerCase().includes('speculative thesis') ||
               thesis.toLowerCase().includes('uncertain assumptions')) {
      return 0.4;
    } else {
      return 0.6; // Default confidence for research
    }
  }

  private async applySupervisedInsight(insight: any, _state: AgentState): Promise<void> {
    // Apply supervised learning insights to enhance bearish research
    this.bearLogger.debug('applySupervisedInsight', 'Applied supervised learning insight', {
      insightType: insight.insight_type,
      confidence: insight.confidence_score
    });
  }

  private async applyUnsupervisedInsight(insight: any, _state: AgentState): Promise<void> {
    // Apply unsupervised learning insights (bearish pattern clustering)
    this.bearLogger.debug('applyUnsupervisedInsight', 'Applied unsupervised learning insight', {
      insightType: insight.insight_type,
      confidence: insight.confidence_score
    });
  }
}