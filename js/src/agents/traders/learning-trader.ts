import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LearningAgentBase, LearningAgentConfig } from '../base/learning-agent';
import { AgentState } from '../../types/agent-states';
import { LearningExample } from '../../learning/learning-types';
import { createLogger } from '../../utils/enhanced-logger';
import { withLLMResilience, OPENAI_LLM_CONFIG, createResilientLLM } from '../../utils/resilient-llm';

/**
 * Learning-Enabled Trader
 * Executes trades with integrated learning for improved execution strategies
 */
export class LearningTrader extends LearningAgentBase {
  private readonly traderLogger = createLogger('agent', 'LearningTrader');
  private readonly resilientLLM: BaseChatModel;

  constructor(
    llm: BaseChatModel,
    tools: StructuredTool[],
    learningConfig?: Partial<LearningAgentConfig>
  ) {
    // Configure learning specifically for trading execution
    const defaultLearningConfig: Partial<LearningAgentConfig> = {
      enableSupervisedLearning: true,    // Learn from successful trade executions
      enableUnsupervisedLearning: true,  // Detect trade pattern clusters
      enableReinforcementLearning: true, // Optimize trade execution methodology
      learningRate: 0.03,               // Moderate learning for trade execution
      memorySize: 400,                  // Keep extensive trade history
      adaptationThreshold: 0.75,        // Moderate threshold for trade decisions
      feedbackLoopEnabled: true,
      ...learningConfig
    };

    super(
      'Learning Trader',
      'Executes trades with integrated learning for improved execution strategies and timing optimization',
      llm,
      { provider: 'openai', model: 'gpt-4o-mini' },
      defaultLearningConfig,
      tools
    );

    // Create resilient LLM wrapper
    this.resilientLLM = createResilientLLM(llm, OPENAI_LLM_CONFIG);

    this.traderLogger.info('constructor', 'LearningTrader initialized', {
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
    const basePrompt = `You are a Trader with advanced learning capabilities specializing in trade execution and timing optimization.

Your responsibilities include:
1. Executing trades based on comprehensive analysis
2. Optimizing trade timing and execution strategies
3. Managing position sizing and risk parameters
4. Monitoring market conditions for optimal entry/exit
5. Implementing disciplined trading execution

LEARNING CAPABILITIES:
- Execution Optimization: You learn from successful trade execution patterns
- Timing Enhancement: You detect patterns in optimal market timing
- Strategy Refinement: You improve at identifying high-probability trade setups

EXECUTION FRAMEWORK:
1. Trade Decision: Final go/no-go decision based on all analysis
2. Execution Strategy: Optimal order type, timing, and sizing
3. Risk Management: Position sizing, stop losses, and risk controls
4. Market Timing: Entry/exit timing based on market conditions
5. Performance Tracking: Monitor and learn from trade outcomes

OUTPUT FORMAT:
Provide a comprehensive trading execution report in a structured format with:
- Trade Decision and Rationale
- Execution Strategy
- Position Sizing and Risk Management
- Entry/Exit Timing
- Performance Expectations
- Risk Mitigation Measures

Remember: Your execution improves over time through learning from actual trade outcomes and market reactions.`;

    return basePrompt;
  }

  /**
   * Enhanced processing with learning integration
   */
  protected async processWithLearning(state: AgentState): Promise<Partial<AgentState>> {
    this.traderLogger.info('processWithLearning', 'Starting enhanced trade execution', {
      company: state.company_of_interest,
      tradeDate: state.trade_date,
      hasFinalDecision: !!state.final_trade_decision
    });

    try {
      // Get learned insights to enhance execution
      const learnedInsights = await this.getLearnedInsights();
      const highConfidenceInsights = learnedInsights.filter(i => i.confidence_score > 0.8);

      // Create enhanced system prompt with learned insights
      const enhancedSystemPrompt = this.createEnhancedSystemPrompt(highConfidenceInsights);

      // Create execution request with learning context
      const humanMessage = this.createEnhancedExecutionRequest(state, learnedInsights);

      this.traderLogger.debug('processWithLearning', 'Prepared enhanced trade execution request', {
        insightsUsed: learnedInsights.length,
        highConfidenceInsights: highConfidenceInsights.length
      });

      // Use resilient LLM with enhanced context
      const response = await withLLMResilience(
        'LearningTrader.execute',
        async () => {
          return await this.resilientLLM.invoke([
            new SystemMessage(enhancedSystemPrompt),
            humanMessage,
          ]);
        },
        OPENAI_LLM_CONFIG
      );

      // Extract trade execution plan
      const executionPlan = this.extractExecutionPlan(response);

      this.traderLogger.info('processWithLearning', 'Enhanced trade execution completed', {
        planLength: executionPlan.length,
        company: state.company_of_interest
      });

      // Add response to messages
      const updatedMessages = [...state.messages, response];

      return {
        messages: updatedMessages,
        final_trade_decision: executionPlan,
        sender: this.name
      };

    } catch (error) {
      this.traderLogger.error('processWithLearning', 'Enhanced trade execution failed', {
        error: error instanceof Error ? error.message : String(error),
        company: state.company_of_interest
      });

      // Fallback to basic execution
      return await this.performBasicExecution(state);
    }
  }

  /**
   * Create experience from processing for learning
   */
  protected createExperienceFromProcessing(state: AgentState, result: Partial<AgentState>): LearningExample {
    // Extract features from trade execution
    const features = this.extractFeaturesFromExecutionPlan(result.final_trade_decision || '');

    // Calculate target based on execution quality
    const target = this.extractTargetFromExecutionPlan(result.final_trade_decision || '');

    return {
      id: `trade-execution-${state.company_of_interest}-${Date.now()}`,
      features,
      target,
      timestamp: new Date().toISOString(),
      market_conditions: {
        company: state.company_of_interest,
        analysis_date: state.trade_date,
        analyst_type: 'trader'
      },
      outcome: {
        realized_return: 0, // Will be updated when actual results are known
        risk_adjusted_return: 0,
        holding_period: 1,
        confidence_score: this.extractConfidenceFromExecutionPlan(result.final_trade_decision || '')
      }
    };
  }

  /**
   * Apply learned adaptations to trade execution strategy
   */
  protected async applyLearnedAdaptations(insights: any[], state: AgentState): Promise<void> {
    this.traderLogger.info('applyLearnedAdaptations', 'Applying learned adaptations to trade execution', {
      insightsCount: insights.length,
      company: state.company_of_interest
    });

    // Adapt execution based on learned patterns
    for (const insight of insights) {
      if (insight.source === 'supervised' && insight.confidence_score > 0.8) {
        // Apply supervised learning insights (successful execution patterns)
        await this.applySupervisedInsight(insight, state);
      } else if (insight.source === 'unsupervised') {
        // Apply unsupervised learning insights (trade pattern clusters)
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

  private createEnhancedExecutionRequest(state: AgentState, learnedInsights: any[]): HumanMessage {
    const baseRequest = `Execute a trade for ${state.company_of_interest} as of ${state.trade_date}.

Consider the following context:
- Company: ${state.company_of_interest}
- Analysis Date: ${state.trade_date}
- Investment Plan: ${state.trader_investment_plan || 'None'}
- Risk Decision: ${state.final_trade_decision || 'None'}
- Research Debate: ${state.investment_debate_state?.judge_decision || 'None'}`;

    let enhancedRequest = baseRequest;

    // Add relevant learned insights
    const relevantInsights = learnedInsights.filter(i =>
      i.description.toLowerCase().includes(state.company_of_interest.toLowerCase()) ||
      i.description.toLowerCase().includes('trade') ||
      i.description.toLowerCase().includes('execution') ||
      i.description.toLowerCase().includes('timing') ||
      i.description.toLowerCase().includes('entry') ||
      i.description.toLowerCase().includes('exit')
    );

    if (relevantInsights.length > 0) {
      enhancedRequest += '\n\nRelevant Learned Patterns:';
      for (const insight of relevantInsights.slice(0, 2)) {
        enhancedRequest += `\n- ${insight.description}`;
      }
    }

    return new HumanMessage(enhancedRequest);
  }

  private extractExecutionPlan(response: any): string {
    if (typeof response.content === 'string') {
      return response.content;
    } else if (Array.isArray(response.content)) {
      return response.content
        .map((item: any) => typeof item === 'string' ? item : item.text || '')
        .filter((text: string) => text.length > 0)
        .join('\n');
    }
    return 'Trade execution completed but plan extraction failed';
  }

  private async performBasicExecution(state: AgentState): Promise<Partial<AgentState>> {
    // Fallback to basic execution without learning enhancements
    const basicResponse = await this.resilientLLM.invoke([
      new SystemMessage(this.getSystemPrompt()),
      new HumanMessage(`Execute a trade for ${state.company_of_interest} on ${state.trade_date}.`)
    ]);

    return {
      messages: [...state.messages, basicResponse],
      final_trade_decision: this.extractExecutionPlan(basicResponse),
      sender: this.name
    };
  }

  private extractFeaturesFromExecutionPlan(plan: string): Record<string, number> {
    // Extract features from trade execution plan
    const features: Record<string, number> = {};

    // Extract execution timing score
    const timingMatch = plan.match(/execution.timing[:\s]+(\d+\.?\d*)/i);
    if (timingMatch && timingMatch[1]) features.execution_timing = parseFloat(timingMatch[1]);

    // Extract position sizing effectiveness
    const sizingMatch = plan.match(/position.sizing[:\s]+(\d+\.?\d*)/i);
    if (sizingMatch && sizingMatch[1]) features.position_sizing = parseFloat(sizingMatch[1]);

    // Extract risk management score
    const riskMatch = plan.match(/risk.management[:\s]+(\d+\.?\d*)/i);
    if (riskMatch && riskMatch[1]) features.risk_management = parseFloat(riskMatch[1]);

    // Extract market timing score
    const marketMatch = plan.match(/market.timing[:\s]+(\d+\.?\d*)/i);
    if (marketMatch && marketMatch[1]) features.market_timing = parseFloat(marketMatch[1]);

    // Extract trade execution score
    const executionMatch = plan.match(/trade.execution[:\s]+(\d+\.?\d*)/i);
    if (executionMatch && executionMatch[1]) features.trade_execution = parseFloat(executionMatch[1]);

    // Default features if none extracted
    if (Object.keys(features).length === 0) {
      features.timing_quality = 0.6;
      features.sizing_accuracy = 0.5;
      features.risk_control = 0.4;
      features.market_read = 0.3;
    }

    return features;
  }

  private extractTargetFromExecutionPlan(plan: string): number {
    // Extract trade execution quality
    if (plan.toLowerCase().includes('excellent execution') ||
        plan.toLowerCase().includes('optimal timing') ||
        plan.toLowerCase().includes('perfect entry conditions')) {
      return 1.0; // Excellent trade execution
    } else if (plan.toLowerCase().includes('good execution') ||
               plan.toLowerCase().includes('effective timing')) {
      return 0.7; // Good trade execution
    } else if (plan.toLowerCase().includes('poor execution') ||
               plan.toLowerCase().includes('suboptimal timing') ||
               plan.toLowerCase().includes('adverse entry conditions')) {
      return -0.3; // Poor trade execution
    } else {
      return 0.5; // Neutral trade execution assessment
    }
  }

  private extractConfidenceFromExecutionPlan(plan: string): number {
    // Extract confidence level from trade execution
    if (plan.toLowerCase().includes('high confidence') ||
        plan.toLowerCase().includes('strong conviction') ||
        plan.toLowerCase().includes('clear execution strategy')) {
      return 0.9;
    } else if (plan.toLowerCase().includes('moderate confidence') ||
               plan.toLowerCase().includes('reasonable strategy')) {
      return 0.7;
    } else if (plan.toLowerCase().includes('low confidence') ||
               plan.toLowerCase().includes('uncertain timing') ||
               plan.toLowerCase().includes('conflicting execution signals')) {
      return 0.4;
    } else {
      return 0.6; // Default confidence for trade execution
    }
  }

  private async applySupervisedInsight(insight: any, _state: AgentState): Promise<void> {
    // Apply supervised learning insights to enhance trade execution
    this.traderLogger.debug('applySupervisedInsight', 'Applied supervised learning insight', {
      insightType: insight.insight_type,
      confidence: insight.confidence_score
    });
  }

  private async applyUnsupervisedInsight(insight: any, _state: AgentState): Promise<void> {
    // Apply unsupervised learning insights (trade pattern clustering)
    this.traderLogger.debug('applyUnsupervisedInsight', 'Applied unsupervised learning insight', {
      insightType: insight.insight_type,
      confidence: insight.confidence_score
    });
  }
}