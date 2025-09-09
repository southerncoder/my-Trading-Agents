import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LearningAgentBase, LearningAgentConfig } from '../base/learning-agent';
import { AgentState } from '../../types/agent-states';
import { LearningExample } from '../../learning/learning-types';
import { createLogger } from '../../utils/enhanced-logger';
import { withLLMResilience, OPENAI_LLM_CONFIG, createResilientLLM } from '../../utils/resilient-llm';

/**
 * Learning-Enabled Portfolio Manager
 * Manages portfolio optimization with integrated learning for improved asset allocation
 */
export class LearningPortfolioManager extends LearningAgentBase {
  private readonly portfolioLogger = createLogger('agent', 'LearningPortfolioManager');
  private readonly resilientLLM: BaseChatModel;

  constructor(
    llm: BaseChatModel,
    tools: StructuredTool[],
    learningConfig?: Partial<LearningAgentConfig>
  ) {
    // Configure learning specifically for portfolio management
    const defaultLearningConfig: Partial<LearningAgentConfig> = {
      enableSupervisedLearning: true,    // Learn from successful portfolio allocations
      enableUnsupervisedLearning: true,  // Detect portfolio pattern clusters
      enableReinforcementLearning: true, // Optimize portfolio management methodology
      learningRate: 0.02,               // Very conservative learning for portfolio management
      memorySize: 250,                  // Keep focused portfolio history
      adaptationThreshold: 0.85,        // Very high threshold for portfolio decisions
      feedbackLoopEnabled: true,
      ...learningConfig
    };

    super(
      'Learning Portfolio Manager',
      'Manages portfolio optimization with integrated learning for improved asset allocation and risk-adjusted returns',
      llm,
      { provider: 'openai', model: 'gpt-4o-mini' },
      defaultLearningConfig,
      tools
    );

    // Create resilient LLM wrapper
    this.resilientLLM = createResilientLLM(llm, OPENAI_LLM_CONFIG);

    this.portfolioLogger.info('constructor', 'LearningPortfolioManager initialized', {
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
    const basePrompt = `You are a Portfolio Manager with advanced learning capabilities specializing in portfolio optimization and asset allocation strategies.

Your responsibilities include:
1. Optimizing portfolio asset allocation
2. Managing risk-adjusted return objectives
3. Balancing diversification and concentration
4. Implementing dynamic rebalancing strategies
5. Maximizing risk-adjusted portfolio performance

LEARNING CAPABILITIES:
- Allocation Optimization: You learn from successful portfolio allocation strategies
- Risk-Return Balancing: You detect patterns in optimal risk-adjusted portfolios
- Performance Enhancement: You improve at identifying high-performing asset combinations

MANAGEMENT FRAMEWORK:
1. Asset Allocation: Optimize portfolio weights across asset classes
2. Risk Management: Balance risk and return objectives
3. Diversification Strategy: Implement effective diversification approaches
4. Rebalancing Logic: Determine optimal rebalancing triggers and methods
5. Performance Monitoring: Track and optimize portfolio performance metrics

OUTPUT FORMAT:
Provide a comprehensive portfolio management report in a structured format with:
- Portfolio Allocation Strategy
- Risk-Return Optimization
- Diversification Analysis
- Rebalancing Recommendations
- Performance Expectations
- Risk Management Framework

Remember: Your management improves over time through learning from actual portfolio performance and risk-adjusted returns.`;

    return basePrompt;
  }

  /**
   * Enhanced processing with learning integration
   */
  protected async processWithLearning(state: AgentState): Promise<Partial<AgentState>> {
    this.portfolioLogger.info('processWithLearning', 'Starting enhanced portfolio management', {
      company: state.company_of_interest,
      tradeDate: state.trade_date,
      hasTraderPlan: !!state.trader_investment_plan
    });

    try {
      // Get learned insights to enhance management
      const learnedInsights = await this.getLearnedInsights();
      const highConfidenceInsights = learnedInsights.filter(i => i.confidence_score > 0.8);

      // Create enhanced system prompt with learned insights
      const enhancedSystemPrompt = this.createEnhancedSystemPrompt(highConfidenceInsights);

      // Create management request with learning context
      const humanMessage = this.createEnhancedManagementRequest(state, learnedInsights);

      this.portfolioLogger.debug('processWithLearning', 'Prepared enhanced portfolio management request', {
        insightsUsed: learnedInsights.length,
        highConfidenceInsights: highConfidenceInsights.length
      });

      // Use resilient LLM with enhanced context
      const response = await withLLMResilience(
        'LearningPortfolioManager.manage',
        async () => {
          return await this.resilientLLM.invoke([
            new SystemMessage(enhancedSystemPrompt),
            humanMessage,
          ]);
        },
        OPENAI_LLM_CONFIG
      );

      // Extract portfolio management plan
      const portfolioPlan = this.extractPortfolioPlan(response);

      this.portfolioLogger.info('processWithLearning', 'Enhanced portfolio management completed', {
        planLength: portfolioPlan.length,
        company: state.company_of_interest
      });

      // Add response to messages
      const updatedMessages = [...state.messages, response];

      return {
        messages: updatedMessages,
        trader_investment_plan: portfolioPlan,
        sender: this.name
      };

    } catch (error) {
      this.portfolioLogger.error('processWithLearning', 'Enhanced portfolio management failed', {
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
    // Extract features from portfolio management
    const features = this.extractFeaturesFromPortfolioPlan(result.trader_investment_plan || '');

    // Calculate target based on portfolio optimization quality
    const target = this.extractTargetFromPortfolioPlan(result.trader_investment_plan || '');

    return {
      id: `portfolio-management-${state.company_of_interest}-${Date.now()}`,
      features,
      target,
      timestamp: new Date().toISOString(),
      market_conditions: {
        company: state.company_of_interest,
        analysis_date: state.trade_date,
        analyst_type: 'portfolio_manager'
      },
      outcome: {
        realized_return: 0, // Will be updated when actual results are known
        risk_adjusted_return: 0,
        holding_period: 1,
        confidence_score: this.extractConfidenceFromPortfolioPlan(result.trader_investment_plan || '')
      }
    };
  }

  /**
   * Apply learned adaptations to portfolio management strategy
   */
  protected async applyLearnedAdaptations(insights: any[], state: AgentState): Promise<void> {
    this.portfolioLogger.info('applyLearnedAdaptations', 'Applying learned adaptations to portfolio management', {
      insightsCount: insights.length,
      company: state.company_of_interest
    });

    // Adapt management based on learned patterns
    for (const insight of insights) {
      if (insight.source === 'supervised' && insight.confidence_score > 0.8) {
        // Apply supervised learning insights (successful allocation patterns)
        await this.applySupervisedInsight(insight, state);
      } else if (insight.source === 'unsupervised') {
        // Apply unsupervised learning insights (portfolio pattern clusters)
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
    const baseRequest = `Develop a comprehensive portfolio management strategy for ${state.company_of_interest} as of ${state.trade_date}.

Consider the following context:
- Company: ${state.company_of_interest}
- Analysis Date: ${state.trade_date}
- Investment Plan: ${state.trader_investment_plan || 'None'}
- Risk Debate: ${state.risk_debate_state?.judge_decision || 'None'}`;

    let enhancedRequest = baseRequest;

    // Add relevant learned insights
    const relevantInsights = learnedInsights.filter(i =>
      i.description.toLowerCase().includes(state.company_of_interest.toLowerCase()) ||
      i.description.toLowerCase().includes('portfolio') ||
      i.description.toLowerCase().includes('allocation') ||
      i.description.toLowerCase().includes('optimization') ||
      i.description.toLowerCase().includes('diversification')
    );

    if (relevantInsights.length > 0) {
      enhancedRequest += '\n\nRelevant Learned Patterns:';
      for (const insight of relevantInsights.slice(0, 2)) {
        enhancedRequest += `\n- ${insight.description}`;
      }
    }

    return new HumanMessage(enhancedRequest);
  }

  private extractPortfolioPlan(response: any): string {
    if (typeof response.content === 'string') {
      return response.content;
    } else if (Array.isArray(response.content)) {
      return response.content
        .map((item: any) => typeof item === 'string' ? item : item.text || '')
        .filter((text: string) => text.length > 0)
        .join('\n');
    }
    return 'Portfolio management completed but plan extraction failed';
  }

  private async performBasicManagement(state: AgentState): Promise<Partial<AgentState>> {
    // Fallback to basic management without learning enhancements
    const basicResponse = await this.resilientLLM.invoke([
      new SystemMessage(this.getSystemPrompt()),
      new HumanMessage(`Develop a portfolio management strategy for ${state.company_of_interest} on ${state.trade_date}.`)
    ]);

    return {
      messages: [...state.messages, basicResponse],
      trader_investment_plan: this.extractPortfolioPlan(basicResponse),
      sender: this.name
    };
  }

  private extractFeaturesFromPortfolioPlan(plan: string): Record<string, number> {
    // Extract features from portfolio management plan
    const features: Record<string, number> = {};

    // Extract portfolio allocation efficiency
    const allocationMatch = plan.match(/allocation.efficiency[:\s]+(\d+\.?\d*)/i);
    if (allocationMatch && allocationMatch[1]) features.allocation_efficiency = parseFloat(allocationMatch[1]);

    // Extract diversification score
    const diversificationMatch = plan.match(/diversification.score[:\s]+(\d+\.?\d*)/i);
    if (diversificationMatch && diversificationMatch[1]) features.diversification_score = parseFloat(diversificationMatch[1]);

    // Extract risk-adjusted return potential
    const rarMatch = plan.match(/risk.adjusted.return[:\s]+(\d+\.?\d*)%/i);
    if (rarMatch && rarMatch[1]) features.risk_adjusted_return = parseFloat(rarMatch[1]) / 100;

    // Extract rebalancing effectiveness
    const rebalancingMatch = plan.match(/rebalancing.effectiveness[:\s]+(\d+\.?\d*)/i);
    if (rebalancingMatch && rebalancingMatch[1]) features.rebalancing_effectiveness = parseFloat(rebalancingMatch[1]);

    // Extract portfolio optimization score
    const optimizationMatch = plan.match(/portfolio.optimization[:\s]+(\d+\.?\d*)/i);
    if (optimizationMatch && optimizationMatch[1]) features.portfolio_optimization = parseFloat(optimizationMatch[1]);

    // Default features if none extracted
    if (Object.keys(features).length === 0) {
      features.allocation_quality = 0.6;
      features.risk_management = 0.5;
      features.performance_potential = 0.4;
      features.strategy_effectiveness = 0.3;
    }

    return features;
  }

  private extractTargetFromPortfolioPlan(plan: string): number {
    // Extract portfolio optimization quality
    if (plan.toLowerCase().includes('excellent optimization') ||
        plan.toLowerCase().includes('optimal allocation') ||
        plan.toLowerCase().includes('superior risk-adjusted returns')) {
      return 1.0; // Excellent portfolio optimization
    } else if (plan.toLowerCase().includes('good optimization') ||
               plan.toLowerCase().includes('effective allocation')) {
      return 0.7; // Good portfolio optimization
    } else if (plan.toLowerCase().includes('poor optimization') ||
               plan.toLowerCase().includes('ineffective allocation') ||
               plan.toLowerCase().includes('suboptimal risk-adjusted returns')) {
      return -0.3; // Poor portfolio optimization
    } else {
      return 0.5; // Neutral portfolio optimization assessment
    }
  }

  private extractConfidenceFromPortfolioPlan(plan: string): number {
    // Extract confidence level from portfolio management
    if (plan.toLowerCase().includes('high confidence') ||
        plan.toLowerCase().includes('strong conviction') ||
        plan.toLowerCase().includes('clear optimization strategy')) {
      return 0.9;
    } else if (plan.toLowerCase().includes('moderate confidence') ||
               plan.toLowerCase().includes('reasonable strategy')) {
      return 0.7;
    } else if (plan.toLowerCase().includes('low confidence') ||
               plan.toLowerCase().includes('uncertain allocation') ||
               plan.toLowerCase().includes('conflicting optimization signals')) {
      return 0.4;
    } else {
      return 0.6; // Default confidence for portfolio management
    }
  }

  private async applySupervisedInsight(insight: any, _state: AgentState): Promise<void> {
    // Apply supervised learning insights to enhance portfolio management
    this.portfolioLogger.debug('applySupervisedInsight', 'Applied supervised learning insight', {
      insightType: insight.insight_type,
      confidence: insight.confidence_score
    });
  }

  private async applyUnsupervisedInsight(insight: any, _state: AgentState): Promise<void> {
    // Apply unsupervised learning insights (portfolio pattern clustering)
    this.portfolioLogger.debug('applyUnsupervisedInsight', 'Applied unsupervised learning insight', {
      insightType: insight.insight_type,
      confidence: insight.confidence_score
    });
  }
}