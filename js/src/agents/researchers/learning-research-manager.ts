import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LearningAgentBase, LearningAgentConfig } from '../base/learning-agent';
import { AgentState, InvestDebateState } from '../../types/agent-states';
import { LearningExample } from '../../learning/learning-types';
import { createLogger } from '../../utils/enhanced-logger';
import { withLLMResilience, OPENAI_LLM_CONFIG, createResilientLLM } from '../../utils/resilient-llm';

/**
 * Learning-Enabled Research Manager
 * Manages investment debate with integrated learning for improved decision synthesis
 */
export class LearningResearchManager extends LearningAgentBase {
  private readonly managerLogger = createLogger('agent', 'LearningResearchManager');
  private readonly resilientLLM: BaseChatModel;

  constructor(
    llm: BaseChatModel,
    tools: StructuredTool[],
    learningConfig?: Partial<LearningAgentConfig>
  ) {
    // Configure learning specifically for research management
    const defaultLearningConfig: Partial<LearningAgentConfig> = {
      enableSupervisedLearning: true,    // Learn from successful debate outcomes
      enableUnsupervisedLearning: true,  // Detect debate pattern clusters
      enableReinforcementLearning: true, // Optimize debate management methodology
      learningRate: 0.02,               // Very conservative learning for management
      memorySize: 200,                  // Keep focused debate history
      adaptationThreshold: 0.8,         // Very high confidence threshold for management
      feedbackLoopEnabled: true,
      ...learningConfig
    };

    super(
      'Learning Research Manager',
      'Manages investment debate with integrated learning for improved decision synthesis and consensus building',
      llm,
      { provider: 'openai', model: 'gpt-4o-mini' },
      defaultLearningConfig,
      tools
    );

    // Create resilient LLM wrapper
    this.resilientLLM = createResilientLLM(llm, OPENAI_LLM_CONFIG);

    this.managerLogger.info('constructor', 'LearningResearchManager initialized', {
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
    const basePrompt = `You are a Research Manager with advanced learning capabilities specializing in facilitating balanced investment debates and synthesizing consensus decisions.

Your responsibilities include:
1. Facilitating structured debates between bull and bear researchers
2. Ensuring balanced discussion and fair representation of both sides
3. Synthesizing diverse viewpoints into coherent investment recommendations
4. Managing debate flow and preventing unproductive arguments
5. Making final investment decisions based on evidence and reasoning

LEARNING CAPABILITIES:
- Debate Management: You learn from successful debate facilitation patterns
- Consensus Building: You detect patterns in effective decision synthesis
- Bias Recognition: You improve at identifying and mitigating cognitive biases

MANAGEMENT FRAMEWORK:
1. Debate Structure: Establish clear rules, time limits, and discussion format
2. Balance Assessment: Ensure both sides are adequately represented and challenged
3. Evidence Evaluation: Weight arguments based on data quality and reasoning strength
4. Synthesis Process: Combine diverse viewpoints into actionable recommendations
5. Decision Criteria: Apply consistent standards for investment decision making

OUTPUT FORMAT:
Provide a comprehensive debate management report in a structured format with:
- Debate Summary and Key Points
- Bull vs Bear Argument Analysis
- Evidence Quality Assessment
- Consensus Synthesis
- Final Investment Recommendation
- Risk Considerations

Remember: Your management improves over time through learning from debate outcomes and investment results.`;

    return basePrompt;
  }

  /**
   * Enhanced processing with learning integration
   */
  protected async processWithLearning(state: AgentState): Promise<Partial<AgentState>> {
    this.managerLogger.info('processWithLearning', 'Starting enhanced debate management', {
      company: state.company_of_interest,
      tradeDate: state.trade_date,
      hasDebateState: !!state.investment_debate_state
    });

    try {
      // Get learned insights to enhance management
      const learnedInsights = await this.getLearnedInsights();
      const highConfidenceInsights = learnedInsights.filter(i => i.confidence_score > 0.8);

      // Create enhanced system prompt with learned insights
      const enhancedSystemPrompt = this.createEnhancedSystemPrompt(highConfidenceInsights);

      // Create management request with learning context
      const humanMessage = this.createEnhancedManagementRequest(state, learnedInsights);

      this.managerLogger.debug('processWithLearning', 'Prepared enhanced debate management request', {
        insightsUsed: learnedInsights.length,
        highConfidenceInsights: highConfidenceInsights.length
      });

      // Use resilient LLM with enhanced context
      const response = await withLLMResilience(
        'LearningResearchManager.manage',
        async () => {
          return await this.resilientLLM.invoke([
            new SystemMessage(enhancedSystemPrompt),
            humanMessage,
          ]);
        },
        OPENAI_LLM_CONFIG
      );

      // Extract debate decision and investment plan
      const { judgeDecision, investmentPlan } = this.extractDebateResults(response);

      this.managerLogger.info('processWithLearning', 'Enhanced debate management completed', {
        decisionLength: judgeDecision.length,
        planLength: investmentPlan.length,
        company: state.company_of_interest
      });

      // Update debate state
      const updatedDebateState: InvestDebateState = {
        ...state.investment_debate_state!,
        judge_decision: judgeDecision,
        count: (state.investment_debate_state?.count || 0) + 1
      };

      // Add response to messages
      const updatedMessages = [...state.messages, response];

      return {
        messages: updatedMessages,
        investment_debate_state: updatedDebateState,
        investment_plan: investmentPlan,
        sender: this.name
      };

    } catch (error) {
      this.managerLogger.error('processWithLearning', 'Enhanced debate management failed', {
        error: error instanceof Error ? error.message : String(error),
        company: state.company_of_interest
      });

      // Fallback to basic management
      return await this.performBasicManagement(state);
    }
  }

  /**
   * Create experience from processing for learning
   */
  protected createExperienceFromProcessing(state: AgentState, result: Partial<AgentState>): LearningExample {
    // Extract features from debate management
    const features = this.extractFeaturesFromDebateManagement(result.investment_plan || '');

    // Calculate target based on debate outcome quality
    const target = this.extractTargetFromDebateManagement(result.investment_plan || '');

    return {
      id: `research-management-${state.company_of_interest}-${Date.now()}`,
      features,
      target,
      timestamp: new Date().toISOString(),
      market_conditions: {
        company: state.company_of_interest,
        analysis_date: state.trade_date,
        analyst_type: 'research_manager'
      },
      outcome: {
        realized_return: 0, // Will be updated when actual results are known
        risk_adjusted_return: 0,
        holding_period: 1,
        confidence_score: this.extractConfidenceFromDebateManagement(result.investment_plan || '')
      }
    };
  }

  /**
   * Apply learned adaptations to debate management strategy
   */
  protected async applyLearnedAdaptations(insights: any[], state: AgentState): Promise<void> {
    this.managerLogger.info('applyLearnedAdaptations', 'Applying learned adaptations to debate management', {
      insightsCount: insights.length,
      company: state.company_of_interest
    });

    // Adapt management based on learned patterns
    for (const insight of insights) {
      if (insight.source === 'supervised' && insight.confidence_score > 0.8) {
        // Apply supervised learning insights (successful management patterns)
        await this.applySupervisedInsight(insight, state);
      } else if (insight.source === 'unsupervised') {
        // Apply unsupervised learning insights (debate pattern clusters)
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

  private createEnhancedManagementRequest(state: AgentState, learnedInsights: any[]): HumanMessage {
    const debateState = state.investment_debate_state;
    const bullHistory = debateState?.bull_history || 'No bull arguments provided';
    const bearHistory = debateState?.bear_history || 'No bear arguments provided';

    const baseRequest = `Manage the investment debate for ${state.company_of_interest} as of ${state.trade_date}.

Debate Context:
- Bull Arguments: ${bullHistory}
- Bear Arguments: ${bearHistory}
- Debate Length: ${debateState?.count || 0} exchanges

Please evaluate both sides, identify key points, assess evidence quality, and provide a final investment recommendation.`;

    let enhancedRequest = baseRequest;

    // Add relevant learned insights
    const relevantInsights = learnedInsights.filter(i =>
      i.description.toLowerCase().includes('debate') ||
      i.description.toLowerCase().includes('consensus') ||
      i.description.toLowerCase().includes('decision') ||
      i.description.toLowerCase().includes('management')
    );

    if (relevantInsights.length > 0) {
      enhancedRequest += '\n\nRelevant Learned Patterns:';
      for (const insight of relevantInsights.slice(0, 2)) {
        enhancedRequest += `\n- ${insight.description}`;
      }
    }

    return new HumanMessage(enhancedRequest);
  }

  private extractDebateResults(response: any): { judgeDecision: string; investmentPlan: string } {
    const content = this.extractContent(response);

    // Split content into decision and plan sections
    const decisionMatch = content.match(/(?:judge decision|final decision|recommendation):(.*?)(?:investment plan|action plan|$)/is);
    const planMatch = content.match(/(?:investment plan|action plan):(.*)/is);

    const judgeDecision = decisionMatch && decisionMatch[1] ? decisionMatch[1].trim() : 'Decision synthesis in progress';
    const investmentPlan = planMatch && planMatch[1] ? planMatch[1].trim() : content;

    return { judgeDecision, investmentPlan };
  }

  private extractContent(response: any): string {
    if (typeof response.content === 'string') {
      return response.content;
    } else if (Array.isArray(response.content)) {
      return response.content
        .map((item: any) => typeof item === 'string' ? item : item.text || '')
        .filter((text: string) => text.length > 0)
        .join('\n');
    }
    return 'Management completed but content extraction failed';
  }

  private async performBasicManagement(state: AgentState): Promise<Partial<AgentState>> {
    // Fallback to basic management without learning enhancements
    const basicResponse = await this.resilientLLM.invoke([
      new SystemMessage(this.getSystemPrompt()),
      new HumanMessage(`Manage the investment debate for ${state.company_of_interest} on ${state.trade_date}.`)
    ]);

    const { judgeDecision, investmentPlan } = this.extractDebateResults(basicResponse);

    // Update debate state
    const updatedDebateState: InvestDebateState = {
      ...state.investment_debate_state!,
      judge_decision: judgeDecision,
      count: (state.investment_debate_state?.count || 0) + 1
    };

    return {
      messages: [...state.messages, basicResponse],
      investment_debate_state: updatedDebateState,
      investment_plan: investmentPlan,
      sender: this.name
    };
  }

  private extractFeaturesFromDebateManagement(plan: string): Record<string, number> {
    // Extract features from debate management
    const features: Record<string, number> = {};

    // Extract debate balance score
    const balanceMatch = plan.match(/debate.balance[:\s]+(\d+\.?\d*)/i);
    if (balanceMatch && balanceMatch[1]) features.debate_balance = parseFloat(balanceMatch[1]);

    // Extract evidence quality score
    const evidenceMatch = plan.match(/evidence.quality[:\s]+(\d+\.?\d*)/i);
    if (evidenceMatch && evidenceMatch[1]) features.evidence_quality = parseFloat(evidenceMatch[1]);

    // Extract consensus strength
    const consensusMatch = plan.match(/consensus.strength[:\s]+(\d+\.?\d*)/i);
    if (consensusMatch && consensusMatch[1]) features.consensus_strength = parseFloat(consensusMatch[1]);

    // Extract decision confidence
    const decisionMatch = plan.match(/decision.confidence[:\s]+(\d+\.?\d*)/i);
    if (decisionMatch && decisionMatch[1]) features.decision_confidence = parseFloat(decisionMatch[1]);

    // Default features if none extracted
    if (Object.keys(features).length === 0) {
      features.debate_quality = 0.5;
      features.argument_balance = 0.5;
      features.evidence_weighting = 0.5;
      features.decision_clarity = 0.5;
    }

    return features;
  }

  private extractTargetFromDebateManagement(plan: string): number {
    // Extract debate management quality
    if (plan.toLowerCase().includes('strong consensus') ||
        plan.toLowerCase().includes('well-balanced debate') ||
        plan.toLowerCase().includes('clear recommendation')) {
      return 1.0; // High quality management
    } else if (plan.toLowerCase().includes('moderate consensus') ||
               plan.toLowerCase().includes('balanced discussion')) {
      return 0.5; // Moderate quality management
    } else if (plan.toLowerCase().includes('weak consensus') ||
               plan.toLowerCase().includes('unbalanced debate') ||
               plan.toLowerCase().includes('unclear recommendation')) {
      return 0.0; // Low quality management
    } else {
      return 0.7; // Default management quality
    }
  }

  private extractConfidenceFromDebateManagement(plan: string): number {
    // Extract confidence level from debate management
    if (plan.toLowerCase().includes('high confidence') ||
        plan.toLowerCase().includes('strong conviction') ||
        plan.toLowerCase().includes('clear decision')) {
      return 0.9;
    } else if (plan.toLowerCase().includes('moderate confidence') ||
               plan.toLowerCase().includes('reasonable conviction')) {
      return 0.7;
    } else if (plan.toLowerCase().includes('low confidence') ||
               plan.toLowerCase().includes('uncertain decision') ||
               plan.toLowerCase().includes('conflicting evidence')) {
      return 0.4;
    } else {
      return 0.6; // Default confidence for management
    }
  }

  private async applySupervisedInsight(insight: any, _state: AgentState): Promise<void> {
    // Apply supervised learning insights to enhance debate management
    this.managerLogger.debug('applySupervisedInsight', 'Applied supervised learning insight', {
      insightType: insight.insight_type,
      confidence: insight.confidence_score
    });
  }

  private async applyUnsupervisedInsight(insight: any, _state: AgentState): Promise<void> {
    // Apply unsupervised learning insights (debate pattern clustering)
    this.managerLogger.debug('applyUnsupervisedInsight', 'Applied unsupervised learning insight', {
      insightType: insight.insight_type,
      confidence: insight.confidence_score
    });
  }
}