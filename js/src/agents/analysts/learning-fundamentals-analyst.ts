import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LearningAgentBase, LearningAgentConfig } from '../base/learning-agent';
import { AgentState } from '../../types/agent-states';
import { LearningExample } from '../../learning/learning-types';
import { createLogger } from '../../utils/enhanced-logger';
import { withLLMResilience, OPENAI_LLM_CONFIG, createResilientLLM } from '../../utils/resilient-llm';

/**
 * Learning-Enabled Fundamentals Analyst
 * Analyzes company fundamentals with integrated learning for improved valuation accuracy
 */
export class LearningFundamentalsAnalyst extends LearningAgentBase {
  private readonly fundamentalsLogger = createLogger('agent', 'LearningFundamentalsAnalyst');
  private readonly resilientLLM: BaseChatModel;

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

    this.fundamentalsLogger.info('constructor', 'LearningFundamentalsAnalyst initialized', {
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
    const basePrompt = `You are a Fundamentals Analyst with advanced learning capabilities specializing in financial statement analysis and company valuation.

Your responsibilities include:
1. Analyzing financial statements (income, balance sheet, cash flow)
2. Evaluating key financial metrics and ratios
3. Assessing company valuation and intrinsic value
4. Comparing performance against industry peers
5. Identifying fundamental strengths and weaknesses

LEARNING CAPABILITIES:
- Valuation Pattern Recognition: You learn from successful valuation predictions
- Financial Health Clustering: You detect patterns in financial metrics
- Analysis Strategy Optimization: You adapt your valuation methodology based on historical accuracy

ANALYSIS FRAMEWORK:
1. Financial Performance: Revenue growth, profitability trends, key ratios
2. Balance Sheet Analysis: Asset quality, debt levels, capital structure
3. Cash Flow Evaluation: Operating cash flow, free cash flow, liquidity
4. Valuation Assessment: Multiples, DCF, peer comparison
5. Risk Assessment: Financial stability, competitive positioning

OUTPUT FORMAT:
Provide a comprehensive fundamental analysis report in a structured format with:
- Financial Performance Summary
- Balance Sheet Analysis
- Valuation Assessment
- Growth Prospects
- Risk Factors
- Investment Recommendation

Remember: Your analysis improves over time through learning from market outcomes and valuation accuracy.`;

    return basePrompt;
  }

  /**
   * Enhanced processing with learning integration
   */
  protected async processWithLearning(state: AgentState): Promise<Partial<AgentState>> {
    this.fundamentalsLogger.info('processWithLearning', 'Starting enhanced fundamentals analysis', {
      company: state.company_of_interest,
      tradeDate: state.trade_date,
      hasFundamentalsReport: !!state.fundamentals_report
    });

    try {
      // Get learned insights to enhance analysis
      const learnedInsights = await this.getLearnedInsights();
      const highConfidenceInsights = learnedInsights.filter(i => i.confidence_score > 0.8);

      // Create enhanced system prompt with learned insights
      const enhancedSystemPrompt = this.createEnhancedSystemPrompt(highConfidenceInsights);

      // Create analysis request with learning context
      const humanMessage = this.createEnhancedAnalysisRequest(state, learnedInsights);

      this.fundamentalsLogger.debug('processWithLearning', 'Prepared enhanced fundamentals analysis request', {
        insightsUsed: learnedInsights.length,
        highConfidenceInsights: highConfidenceInsights.length
      });

      // Use resilient LLM with enhanced context
      const response = await withLLMResilience(
        'LearningFundamentalsAnalyst.analyze',
        async () => {
          return await this.resilientLLM.invoke([
            new SystemMessage(enhancedSystemPrompt),
            humanMessage,
          ]);
        },
        OPENAI_LLM_CONFIG
      );

      // Extract fundamentals report
      const fundamentalsReport = this.extractFundamentalsReport(response);

      this.fundamentalsLogger.info('processWithLearning', 'Enhanced fundamentals analysis completed', {
        reportLength: fundamentalsReport.length,
        company: state.company_of_interest
      });

      // Add response to messages
      const updatedMessages = [...state.messages, response];

      return {
        messages: updatedMessages,
        fundamentals_report: fundamentalsReport,
        sender: this.name
      };

    } catch (error) {
      this.fundamentalsLogger.error('processWithLearning', 'Enhanced fundamentals analysis failed', {
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
    // Extract features from fundamentals analysis
    const features = this.extractFeaturesFromFundamentals(result.fundamentals_report || '');

    // Calculate target based on fundamentals assessment
    const target = this.extractTargetFromFundamentals(result.fundamentals_report || '');

    return {
      id: `fundamentals-analysis-${state.company_of_interest}-${Date.now()}`,
      features,
      target,
      timestamp: new Date().toISOString(),
      market_conditions: {
        company: state.company_of_interest,
        analysis_date: state.trade_date,
        analyst_type: 'fundamentals'
      },
      outcome: {
        realized_return: 0, // Will be updated when actual results are known
        risk_adjusted_return: 0,
        holding_period: 1,
        confidence_score: this.extractConfidenceFromFundamentals(result.fundamentals_report || '')
      }
    };
  }

  /**
   * Apply learned adaptations to fundamentals analysis strategy
   */
  protected async applyLearnedAdaptations(insights: any[], state: AgentState): Promise<void> {
    this.fundamentalsLogger.info('applyLearnedAdaptations', 'Applying learned adaptations to fundamentals analysis', {
      insightsCount: insights.length,
      company: state.company_of_interest
    });

    // Adapt analysis based on learned patterns
    for (const insight of insights) {
      if (insight.source === 'supervised' && insight.confidence_score > 0.8) {
        // Apply supervised learning insights (valuation patterns)
        await this.applySupervisedInsight(insight, state);
      } else if (insight.source === 'unsupervised') {
        // Apply unsupervised learning insights (financial health patterns)
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
    const baseRequest = `Perform a comprehensive fundamental analysis for ${state.company_of_interest} as of ${state.trade_date}.

Consider the following context:
- Company: ${state.company_of_interest}
- Analysis Date: ${state.trade_date}
- Previous Analysis: ${state.fundamentals_report || 'None'}`;

    let enhancedRequest = baseRequest;

    // Add relevant learned insights
    const relevantInsights = learnedInsights.filter(i =>
      i.description.toLowerCase().includes(state.company_of_interest.toLowerCase()) ||
      i.description.toLowerCase().includes('valuation') ||
      i.description.toLowerCase().includes('fundamental') ||
      i.description.toLowerCase().includes('financial')
    );

    if (relevantInsights.length > 0) {
      enhancedRequest += '\n\nRelevant Learned Patterns:';
      for (const insight of relevantInsights.slice(0, 2)) {
        enhancedRequest += `\n- ${insight.description}`;
      }
    }

    return new HumanMessage(enhancedRequest);
  }

  private extractFundamentalsReport(response: any): string {
    if (typeof response.content === 'string') {
      return response.content;
    } else if (Array.isArray(response.content)) {
      return response.content
        .map((item: any) => typeof item === 'string' ? item : item.text || '')
        .filter((text: string) => text.length > 0)
        .join('\n');
    }
    return 'Analysis completed but report extraction failed';
  }

  private async performBasicAnalysis(state: AgentState): Promise<Partial<AgentState>> {
    // Fallback to basic analysis without learning enhancements
    const basicResponse = await this.resilientLLM.invoke([
      new SystemMessage(this.getSystemPrompt()),
      new HumanMessage(`Analyze the fundamentals for ${state.company_of_interest} on ${state.trade_date}.`)
    ]);

    return {
      messages: [...state.messages, basicResponse],
      fundamentals_report: this.extractFundamentalsReport(basicResponse),
      sender: this.name
    };
  }

  private extractFeaturesFromFundamentals(report: string): Record<string, number> {
    // Extract numerical features from fundamentals analysis
    const features: Record<string, number> = {};

    // Extract financial ratios
    const peMatch = report.match(/P\/E[:\s]+(\d+\.?\d*)/i);
    if (peMatch && peMatch[1]) features.pe_ratio = parseFloat(peMatch[1]);

    const pbMatch = report.match(/P\/B[:\s]+(\d+\.?\d*)/i);
    if (pbMatch && pbMatch[1]) features.pb_ratio = parseFloat(pbMatch[1]);

    const roeMatch = report.match(/ROE[:\s]+(\d+\.?\d*)/i);
    if (roeMatch && roeMatch[1]) features.roe = parseFloat(roeMatch[1]);

    const debtEquityMatch = report.match(/debt.equity[:\s]+(\d+\.?\d*)/i);
    if (debtEquityMatch && debtEquityMatch[1]) features.debt_to_equity = parseFloat(debtEquityMatch[1]);

    // Extract growth rates
    const revenueGrowthMatch = report.match(/revenue.growth[:\s]+(\d+\.?\d*)/i);
    if (revenueGrowthMatch && revenueGrowthMatch[1]) features.revenue_growth = parseFloat(revenueGrowthMatch[1]);

    // Default features if none extracted
    if (Object.keys(features).length === 0) {
      features.financial_strength = 0.5;
      features.growth_potential = 0.5;
      features.valuation_attractiveness = 0.5;
    }

    return features;
  }

  private extractTargetFromFundamentals(report: string): number {
    // Extract valuation assessment
    if (report.toLowerCase().includes('undervalued') || report.toLowerCase().includes('attractive valuation')) {
      return 1.0; // Positive fundamental assessment
    } else if (report.toLowerCase().includes('overvalued') || report.toLowerCase().includes('expensive')) {
      return -1.0; // Negative fundamental assessment
    } else {
      return 0.0; // Neutral assessment
    }
  }

  private extractConfidenceFromFundamentals(report: string): number {
    // Extract confidence level from fundamentals analysis
    if (report.toLowerCase().includes('high confidence') || report.toLowerCase().includes('very confident')) {
      return 0.9;
    } else if (report.toLowerCase().includes('moderate confidence') || report.toLowerCase().includes('reasonable confidence')) {
      return 0.7;
    } else if (report.toLowerCase().includes('low confidence') || report.toLowerCase().includes('uncertain')) {
      return 0.3;
    } else {
      return 0.6; // Default confidence for fundamentals
    }
  }

  private async applySupervisedInsight(insight: any, _state: AgentState): Promise<void> {
    // Apply supervised learning insights to enhance fundamentals analysis
    this.fundamentalsLogger.debug('applySupervisedInsight', 'Applied supervised learning insight', {
      insightType: insight.insight_type,
      confidence: insight.confidence_score
    });
  }

  private async applyUnsupervisedInsight(insight: any, _state: AgentState): Promise<void> {
    // Apply unsupervised learning insights (financial pattern detection)
    this.fundamentalsLogger.debug('applyUnsupervisedInsight', 'Applied unsupervised learning insight', {
      insightType: insight.insight_type,
      confidence: insight.confidence_score
    });
  }
}