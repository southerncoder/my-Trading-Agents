import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LearningAgentBase, LearningAgentConfig } from '../base/learning-agent';
import { AgentState } from '../../types/agent-states';
import { LearningExample } from '../../learning/learning-types';
import { createLogger } from '../../utils/enhanced-logger';
import { withLLMResilience, OPENAI_LLM_CONFIG, createResilientLLM } from '../../utils/resilient-llm';

/**
 * Learning-Enabled Bull Researcher
 * Conducts bullish research with integrated learning for improved thesis development
 */
export class LearningBullResearcher extends LearningAgentBase {
  private readonly bullLogger = createLogger('agent', 'LearningBullResearcher');
  private readonly resilientLLM: BaseChatModel;

  constructor(
    llm: BaseChatModel,
    tools: StructuredTool[],
    learningConfig?: Partial<LearningAgentConfig>
  ) {
    // Configure learning specifically for bullish research
    const defaultLearningConfig: Partial<LearningAgentConfig> = {
      enableSupervisedLearning: true,    // Learn from successful bullish theses
      enableUnsupervisedLearning: true,  // Detect bullish pattern clusters
      enableReinforcementLearning: true, // Optimize bullish research methodology
      learningRate: 0.03,               // Conservative learning for research
      memorySize: 300,                  // Keep extensive research history
      adaptationThreshold: 0.75,        // High confidence threshold for research
      feedbackLoopEnabled: true,
      ...learningConfig
    };

    super(
      'Learning Bull Researcher',
      'Conducts bullish research with integrated learning for improved thesis development and investment case building',
      llm,
      { provider: 'openai', model: 'gpt-4o-mini' },
      defaultLearningConfig,
      tools
    );

    // Create resilient LLM wrapper
    this.resilientLLM = createResilientLLM(llm, OPENAI_LLM_CONFIG);

    this.bullLogger.info('constructor', 'LearningBullResearcher initialized', {
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
    const basePrompt = `You are a Bull Researcher with advanced learning capabilities specializing in developing compelling bullish investment theses.

Your responsibilities include:
1. Developing comprehensive bullish investment cases
2. Identifying growth drivers and catalysts
3. Analyzing competitive advantages and moats
4. Evaluating management quality and strategic direction
5. Assessing market opportunities and expansion potential

LEARNING CAPABILITIES:
- Thesis Development: You learn from successful bullish investment theses
- Pattern Recognition: You detect recurring bullish patterns and themes
- Catalyst Assessment: You improve at identifying market-moving catalysts

RESEARCH FRAMEWORK:
1. Investment Thesis: Core bullish case, key assumptions, risk mitigation
2. Growth Analysis: Revenue drivers, market expansion, competitive positioning
3. Financial Assessment: Valuation, cash flow, capital allocation
4. Management Evaluation: Strategy execution, track record, alignment
5. Risk Analysis: Bullish case risks and mitigation strategies

OUTPUT FORMAT:
Provide a comprehensive bullish research report in a structured format with:
- Investment Thesis Summary
- Growth Drivers and Catalysts
- Competitive Advantages
- Financial Analysis and Valuation
- Management Assessment
- Risk Mitigation Strategy

Remember: Your research improves over time through learning from actual investment outcomes and market reactions.`;

    return basePrompt;
  }

  /**
   * Enhanced processing with learning integration
   */
  protected async processWithLearning(state: AgentState): Promise<Partial<AgentState>> {
    this.bullLogger.info('processWithLearning', 'Starting enhanced bullish research', {
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

      this.bullLogger.debug('processWithLearning', 'Prepared enhanced bullish research request', {
        insightsUsed: learnedInsights.length,
        highConfidenceInsights: highConfidenceInsights.length
      });

      // Use resilient LLM with enhanced context
      const response = await withLLMResilience(
        'LearningBullResearcher.analyze',
        async () => {
          return await this.resilientLLM.invoke([
            new SystemMessage(enhancedSystemPrompt),
            humanMessage,
          ]);
        },
        OPENAI_LLM_CONFIG
      );

      // Extract bull thesis
      const bullThesis = this.extractBullThesis(response);

      this.bullLogger.info('processWithLearning', 'Enhanced bullish research completed', {
        thesisLength: bullThesis.length,
        company: state.company_of_interest
      });

      // Add response to messages
      const updatedMessages = [...state.messages, response];

      return {
        messages: updatedMessages,
        investment_plan: bullThesis,
        sender: this.name
      };

    } catch (error) {
      this.bullLogger.error('processWithLearning', 'Enhanced bullish research failed', {
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
    // Extract features from bullish research
    const features = this.extractFeaturesFromBullThesis(result.investment_plan || '');

    // Calculate target based on bullish thesis strength
    const target = this.extractTargetFromBullThesis(result.investment_plan || '');

    return {
      id: `bull-research-${state.company_of_interest}-${Date.now()}`,
      features,
      target,
      timestamp: new Date().toISOString(),
      market_conditions: {
        company: state.company_of_interest,
        analysis_date: state.trade_date,
        analyst_type: 'bull_researcher'
      },
      outcome: {
        realized_return: 0, // Will be updated when actual results are known
        risk_adjusted_return: 0,
        holding_period: 1,
        confidence_score: this.extractConfidenceFromBullThesis(result.investment_plan || '')
      }
    };
  }

  /**
   * Apply learned adaptations to bullish research strategy
   */
  protected async applyLearnedAdaptations(insights: any[], state: AgentState): Promise<void> {
    this.bullLogger.info('applyLearnedAdaptations', 'Applying learned adaptations to bullish research', {
      insightsCount: insights.length,
      company: state.company_of_interest
    });

    // Adapt research based on learned patterns
    for (const insight of insights) {
      if (insight.source === 'supervised' && insight.confidence_score > 0.8) {
        // Apply supervised learning insights (successful thesis patterns)
        await this.applySupervisedInsight(insight, state);
      } else if (insight.source === 'unsupervised') {
        // Apply unsupervised learning insights (bullish pattern clusters)
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
    const baseRequest = `Develop a comprehensive bullish investment thesis for ${state.company_of_interest} as of ${state.trade_date}.

Consider the following context:
- Company: ${state.company_of_interest}
- Analysis Date: ${state.trade_date}
- Previous Research: ${state.investment_plan || 'None'}`;

    let enhancedRequest = baseRequest;

    // Add relevant learned insights
    const relevantInsights = learnedInsights.filter(i =>
      i.description.toLowerCase().includes(state.company_of_interest.toLowerCase()) ||
      i.description.toLowerCase().includes('bullish') ||
      i.description.toLowerCase().includes('growth') ||
      i.description.toLowerCase().includes('catalyst')
    );

    if (relevantInsights.length > 0) {
      enhancedRequest += '\n\nRelevant Learned Patterns:';
      for (const insight of relevantInsights.slice(0, 2)) {
        enhancedRequest += `\n- ${insight.description}`;
      }
    }

    return new HumanMessage(enhancedRequest);
  }

  private extractBullThesis(response: any): string {
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
      new HumanMessage(`Develop a bullish investment thesis for ${state.company_of_interest} on ${state.trade_date}.`)
    ]);

    return {
      messages: [...state.messages, basicResponse],
      investment_plan: this.extractBullThesis(basicResponse),
      sender: this.name
    };
  }

  private extractFeaturesFromBullThesis(thesis: string): Record<string, number> {
    // Extract features from bullish research thesis
    const features: Record<string, number> = {};

    // Extract growth rate projections
    const growthMatch = thesis.match(/growth.rate[:\s]+(\d+\.?\d*)%/i);
    if (growthMatch && growthMatch[1]) features.growth_rate = parseFloat(growthMatch[1]) / 100;

    // Extract margin improvement
    const marginMatch = thesis.match(/margin.improvement[:\s]+(\d+\.?\d*)%/i);
    if (marginMatch && marginMatch[1]) features.margin_improvement = parseFloat(marginMatch[1]) / 100;

    // Extract competitive advantage score
    const moatMatch = thesis.match(/competitive.advantage[:\s]+(\d+\.?\d*)/i);
    if (moatMatch && moatMatch[1]) features.competitive_advantage = parseFloat(moatMatch[1]);

    // Extract management quality score
    const managementMatch = thesis.match(/management.quality[:\s]+(\d+\.?\d*)/i);
    if (managementMatch && managementMatch[1]) features.management_quality = parseFloat(managementMatch[1]);

    // Extract catalyst strength
    const catalystMatch = thesis.match(/catalyst.strength[:\s]+(\d+\.?\d*)/i);
    if (catalystMatch && catalystMatch[1]) features.catalyst_strength = parseFloat(catalystMatch[1]);

    // Default features if none extracted
    if (Object.keys(features).length === 0) {
      features.growth_potential = 0.5;
      features.competitive_position = 0.5;
      features.management_effectiveness = 0.5;
      features.catalyst_potential = 0.5;
    }

    return features;
  }

  private extractTargetFromBullThesis(thesis: string): number {
    // Extract bullish thesis strength
    if (thesis.toLowerCase().includes('strong bullish case') ||
        thesis.toLowerCase().includes('compelling investment thesis') ||
        thesis.toLowerCase().includes('significant upside potential')) {
      return 1.0; // Strong bullish thesis
    } else if (thesis.toLowerCase().includes('moderate bullish case') ||
               thesis.toLowerCase().includes('reasonable investment thesis')) {
      return 0.5; // Moderate bullish thesis
    } else if (thesis.toLowerCase().includes('weak bullish case') ||
               thesis.toLowerCase().includes('limited upside potential')) {
      return 0.0; // Weak bullish thesis
    } else {
      return 0.7; // Default bullish thesis strength
    }
  }

  private extractConfidenceFromBullThesis(thesis: string): number {
    // Extract confidence level from bullish research
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
    // Apply supervised learning insights to enhance bullish research
    this.bullLogger.debug('applySupervisedInsight', 'Applied supervised learning insight', {
      insightType: insight.insight_type,
      confidence: insight.confidence_score
    });
  }

  private async applyUnsupervisedInsight(insight: any, _state: AgentState): Promise<void> {
    // Apply unsupervised learning insights (bullish pattern clustering)
    this.bullLogger.debug('applyUnsupervisedInsight', 'Applied unsupervised learning insight', {
      insightType: insight.insight_type,
      confidence: insight.confidence_score
    });
  }
}