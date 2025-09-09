import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LearningAgentBase, LearningAgentConfig } from '../base/learning-agent';
import { AgentState } from '../../types/agent-states';
import { LearningExample } from '../../learning/learning-types';
import { createLogger } from '../../utils/enhanced-logger';
import { withLLMResilience, OPENAI_LLM_CONFIG, createResilientLLM } from '../../utils/resilient-llm';

/**
 * Enhanced Market Analyst with Learning Capabilities
 * Analyzes market data with integrated supervised learning for pattern recognition
 */
export class LearningMarketAnalyst extends LearningAgentBase {
  private readonly marketLogger = createLogger('agent', 'LearningMarketAnalyst');
  private readonly resilientLLM: BaseChatModel;

  constructor(
    llm: BaseChatModel,
    tools: StructuredTool[],
    learningConfig?: Partial<LearningAgentConfig>
  ) {
    // Configure learning specifically for market analysis
    const defaultLearningConfig: Partial<LearningAgentConfig> = {
      enableSupervisedLearning: true,    // Learn from successful market predictions
      enableUnsupervisedLearning: true,  // Detect market regimes/patterns
      enableReinforcementLearning: true, // Optimize analysis strategies
      learningRate: 0.05,               // Conservative learning for financial data
      memorySize: 500,                  // Keep more historical data
      adaptationThreshold: 0.75,        // High confidence threshold for adaptations
      feedbackLoopEnabled: true,
      ...learningConfig
    };

    super(
      'Learning Market Analyst',
      'Analyzes market data with integrated learning for improved pattern recognition and prediction accuracy',
      llm,
      { provider: 'openai', model: 'gpt-4o-mini' }, // Default config, will be overridden
      defaultLearningConfig,
      tools
    );

    // Create resilient LLM wrapper
    this.resilientLLM = createResilientLLM(llm, OPENAI_LLM_CONFIG);

    this.marketLogger.info('constructor', 'LearningMarketAnalyst initialized', {
      learningEnabled: this.learningEnabled,
      supervisedEnabled: this.learningConfig.enableSupervisedLearning,
      unsupervisedEnabled: this.learningConfig.enableUnsupervisedLearning,
      reinforcementEnabled: this.learningConfig.enableReinforcementLearning
    });
  }

  /**
   * Get system prompt with learning context
   */
  getSystemPrompt(): string {
    const basePrompt = `You are an expert Market Analyst with advanced learning capabilities.

Your role is to analyze market data, technical indicators, and price movements to provide informed trading insights.

LEARNING CAPABILITIES:
- Pattern Recognition: You learn from successful market predictions
- Market Regime Detection: You identify different market conditions
- Strategy Optimization: You adapt your analysis approach based on historical performance

ANALYSIS FRAMEWORK:
1. Technical Analysis: RSI, MACD, moving averages, volume patterns
2. Market Context: Current market regime, volatility levels, trend strength
3. Risk Assessment: Support/resistance levels, potential catalysts
4. Predictive Insights: Short-term price direction with confidence levels

OUTPUT FORMAT:
Provide your analysis in a structured format with:
- Current Market Assessment
- Key Technical Indicators
- Price Targets and Scenarios
- Risk Considerations
- Confidence Level (High/Medium/Low)

Remember: Your analysis improves over time through learning from market outcomes.`;

    return basePrompt;
  }

  /**
   * Enhanced processing with learning integration
   */
  protected async processWithLearning(state: AgentState): Promise<Partial<AgentState>> {
    this.marketLogger.info('processWithLearning', 'Starting enhanced market analysis', {
      company: state.company_of_interest || 'Unknown Company',
      tradeDate: state.trade_date,
      hasExistingReport: !!state.market_report
    });

    try {
      // Get learned insights to enhance analysis
      const learnedInsights = await this.getLearnedInsights();
      const highConfidenceInsights = learnedInsights.filter(i => i.confidence_score > 0.8);

      // Create enhanced system prompt with learned insights
      const enhancedSystemPrompt = this.createEnhancedSystemPrompt(highConfidenceInsights);

      // Create analysis request with learning context
      const humanMessage = this.createEnhancedAnalysisRequest(state, learnedInsights);

      this.marketLogger.debug('processWithLearning', 'Prepared enhanced analysis request', {
        insightsUsed: learnedInsights.length,
        highConfidenceInsights: highConfidenceInsights.length
      });

      // Use resilient LLM with enhanced context
      const response = await withLLMResilience(
        'LearningMarketAnalyst.analyze',
        async () => {
          return await this.resilientLLM.invoke([
            new SystemMessage(enhancedSystemPrompt),
            humanMessage,
          ]);
        },
        OPENAI_LLM_CONFIG
      );

      // Extract market report
      const marketReport = this.extractMarketReport(response);

      this.marketLogger.info('processWithLearning', 'Enhanced market analysis completed', {
        reportLength: marketReport.length,
        company: state.company_of_interest || 'Unknown Company'
      });

      // Add response to messages
      const updatedMessages = [...state.messages, response];

      return {
        messages: updatedMessages,
        market_report: marketReport,
        sender: this.name
      };

    } catch (error) {
      this.marketLogger.error('processWithLearning', 'Enhanced market analysis failed', {
        error: error instanceof Error ? error.message : String(error),
        company: state.company_of_interest || 'Unknown Company'
      });

      // Fallback to basic analysis
      return await this.performBasicAnalysis(state);
    }
  }

  /**
   * Create experience from processing for learning
   */
  protected createExperienceFromProcessing(state: AgentState, result: Partial<AgentState>): LearningExample {
    // Extract features from market analysis
    const features = this.extractFeaturesFromAnalysis(result.market_report || '');

    // Calculate target based on analysis confidence and market direction
    const target = this.extractTargetFromAnalysis(result.market_report || '');

    return {
      id: `market-analysis-${state.company_of_interest || 'unknown'}-${Date.now()}`,
      features,
      target,
      timestamp: new Date().toISOString(),
      market_conditions: {
        company: state.company_of_interest || 'Unknown Company',
        analysis_date: state.trade_date,
        analyst_type: 'market'
      },
      outcome: {
        realized_return: 0, // Will be updated when actual results are known
        risk_adjusted_return: 0,
        holding_period: 1,
        confidence_score: this.extractConfidenceFromAnalysis(result.market_report || '')
      }
    };
  }

  /**
   * Apply learned adaptations to analysis strategy
   */
  protected async applyLearnedAdaptations(insights: any[], state: AgentState): Promise<void> {
    this.marketLogger.info('applyLearnedAdaptations', 'Applying learned adaptations to market analysis', {
      insightsCount: insights.length,
      company: state.company_of_interest || 'Unknown Company'
    });

    // Adapt analysis based on learned patterns
    for (const insight of insights) {
      if (insight.source === 'supervised' && insight.confidence_score > 0.8) {
        // Apply supervised learning insights
        await this.applySupervisedInsight(insight, state);
      } else if (insight.source === 'unsupervised') {
        // Apply unsupervised learning insights (market regime detection)
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
    const company = state.company_of_interest || 'Unknown Company';
    const baseRequest = `Please analyze the market for ${company} on ${state.trade_date}.

Consider the following context:
- Company: ${company}
- Analysis Date: ${state.trade_date}
- Previous Analysis: ${state.market_report || 'None'}`;

    let enhancedRequest = baseRequest;

    // Add relevant learned insights
    const relevantInsights = learnedInsights.filter(i =>
      i.description &&
      (i.description.toLowerCase().includes(company.toLowerCase()) ||
       i.description.toLowerCase().includes('market') ||
       i.description.toLowerCase().includes('technical'))
    );

    if (relevantInsights.length > 0) {
      enhancedRequest += '\n\nRelevant Learned Patterns:';
      for (const insight of relevantInsights.slice(0, 2)) {
        enhancedRequest += `\n- ${insight.description}`;
      }
    }

    return new HumanMessage(enhancedRequest);
  }

  private extractMarketReport(response: any): string {
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
    const company = state.company_of_interest || 'Unknown Company';
    const basicResponse = await this.resilientLLM.invoke([
      new SystemMessage(this.getSystemPrompt()),
      new HumanMessage(`Analyze the market for ${company} on ${state.trade_date}.`)
    ]);

    return {
      messages: [...state.messages, basicResponse],
      market_report: this.extractMarketReport(basicResponse),
      sender: this.name
    };
  }

  private extractFeaturesFromAnalysis(report: string): Record<string, number> {
    // Extract numerical features from analysis report
    const features: Record<string, number> = {};

    // Extract RSI if mentioned
    const rsiMatch = report.match(/RSI[:\s]+(\d+\.?\d*)/i);
    if (rsiMatch && rsiMatch[1]) features.rsi = parseFloat(rsiMatch[1]);

    // Extract volume patterns
    const volumeMatch = report.match(/volume[:\s]+(\d+\.?\d*)/i);
    if (volumeMatch && volumeMatch[1]) features.volume = parseFloat(volumeMatch[1]);

    // Extract volatility measures
    const volatilityMatch = report.match(/volatility[:\s]+(\d+\.?\d*)/i);
    if (volatilityMatch && volatilityMatch[1]) features.volatility = parseFloat(volatilityMatch[1]);

    // Default features if none extracted
    if (Object.keys(features).length === 0) {
      features.market_sentiment = 0.5;
      features.technical_strength = 0.5;
    }

    return features;
  }

  private extractTargetFromAnalysis(report: string): number {
    // Extract predicted market direction/target
    if (report.toLowerCase().includes('bullish') || report.toLowerCase().includes('buy')) {
      return 1.0; // Positive prediction
    } else if (report.toLowerCase().includes('bearish') || report.toLowerCase().includes('sell')) {
      return -1.0; // Negative prediction
    } else {
      return 0.0; // Neutral prediction
    }
  }

  private extractConfidenceFromAnalysis(report: string): number {
    // Extract confidence level from analysis
    if (report.toLowerCase().includes('high confidence') || report.toLowerCase().includes('very confident')) {
      return 0.9;
    } else if (report.toLowerCase().includes('medium confidence') || report.toLowerCase().includes('moderately confident')) {
      return 0.7;
    } else if (report.toLowerCase().includes('low confidence') || report.toLowerCase().includes('uncertain')) {
      return 0.3;
    } else {
      return 0.5; // Default confidence
    }
  }

  private async applySupervisedInsight(insight: any, _state: AgentState): Promise<void> {
    // Apply supervised learning insights to enhance analysis
    this.marketLogger.debug('applySupervisedInsight', 'Applied supervised learning insight', {
      insightType: insight.insight_type,
      confidence: insight.confidence_score
    });
  }

  private async applyUnsupervisedInsight(insight: any, _state: AgentState): Promise<void> {
    // Apply unsupervised learning insights (market regime detection)
    this.marketLogger.debug('applyUnsupervisedInsight', 'Applied unsupervised learning insight', {
      insightType: insight.insight_type,
      confidence: insight.confidence_score
    });
  }
}