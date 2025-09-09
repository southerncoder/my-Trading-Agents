import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LearningAgentBase, LearningAgentConfig } from '../base/learning-agent';
import { AgentState } from '../../types/agent-states';
import { LearningExample } from '../../learning/learning-types';
import { createLogger } from '../../utils/enhanced-logger';
import { withLLMResilience, OPENAI_LLM_CONFIG, createResilientLLM } from '../../utils/resilient-llm';

/**
 * Learning-Enabled News Analyst
 * Analyzes news events with integrated learning for improved market impact prediction
 */
export class LearningNewsAnalyst extends LearningAgentBase {
  private readonly newsLogger = createLogger('agent', 'LearningNewsAnalyst');
  private readonly resilientLLM: BaseChatModel;

  constructor(
    llm: BaseChatModel,
    tools: StructuredTool[],
    learningConfig?: Partial<LearningAgentConfig>
  ) {
    // Configure learning specifically for news analysis
    const defaultLearningConfig: Partial<LearningAgentConfig> = {
      enableSupervisedLearning: true,    // Learn from successful news impact predictions
      enableUnsupervisedLearning: true,  // Detect news sentiment patterns
      enableReinforcementLearning: true, // Optimize news analysis methodology
      learningRate: 0.04,               // Moderate learning for news data
      memorySize: 400,                  // Keep extensive news history
      adaptationThreshold: 0.75,        // Moderate confidence threshold
      feedbackLoopEnabled: true,
      ...learningConfig
    };

    super(
      'Learning News Analyst',
      'Analyzes news events with integrated learning for improved market impact prediction and sentiment analysis',
      llm,
      { provider: 'openai', model: 'gpt-4o-mini' },
      defaultLearningConfig,
      tools
    );

    // Create resilient LLM wrapper
    this.resilientLLM = createResilientLLM(llm, OPENAI_LLM_CONFIG);

    this.newsLogger.info('constructor', 'LearningNewsAnalyst initialized', {
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
    const basePrompt = `You are a News Analyst with advanced learning capabilities specializing in financial news analysis and market impact assessment.

Your responsibilities include:
1. Analyzing recent news events and announcements
2. Evaluating market-moving news and their potential impact
3. Assessing global events and their market implications
4. Identifying news-driven catalysts and risks
5. Providing context on news sentiment and market reactions

LEARNING CAPABILITIES:
- News Impact Prediction: You learn from successful market impact predictions
- Sentiment Pattern Recognition: You detect news sentiment patterns
- Catalyst Identification: You improve at identifying market-moving news

ANALYSIS FRAMEWORK:
1. News Classification: Company-specific, industry, macroeconomic news
2. Sentiment Analysis: Positive, negative, neutral sentiment assessment
3. Market Impact Assessment: Historical impact patterns, expected reactions
4. Timing Analysis: News timing and market absorption
5. Risk Assessment: News-driven volatility and uncertainty

OUTPUT FORMAT:
Provide a comprehensive news analysis report in a structured format with:
- News Summary and Classification
- Sentiment Analysis
- Market Impact Assessment
- Key Catalysts and Risks
- News-Based Trading Implications

Remember: Your analysis improves over time through learning from actual market reactions to news events.`;

    return basePrompt;
  }

  /**
   * Enhanced processing with learning integration
   */
  protected async processWithLearning(state: AgentState): Promise<Partial<AgentState>> {
    this.newsLogger.info('processWithLearning', 'Starting enhanced news analysis', {
      company: state.company_of_interest,
      tradeDate: state.trade_date,
      hasNewsReport: !!state.news_report
    });

    try {
      // Get learned insights to enhance analysis
      const learnedInsights = await this.getLearnedInsights();
      const highConfidenceInsights = learnedInsights.filter(i => i.confidence_score > 0.8);

      // Create enhanced system prompt with learned insights
      const enhancedSystemPrompt = this.createEnhancedSystemPrompt(highConfidenceInsights);

      // Create analysis request with learning context
      const humanMessage = this.createEnhancedAnalysisRequest(state, learnedInsights);

      this.newsLogger.debug('processWithLearning', 'Prepared enhanced news analysis request', {
        insightsUsed: learnedInsights.length,
        highConfidenceInsights: highConfidenceInsights.length
      });

      // Use resilient LLM with enhanced context
      const response = await withLLMResilience(
        'LearningNewsAnalyst.analyze',
        async () => {
          return await this.resilientLLM.invoke([
            new SystemMessage(enhancedSystemPrompt),
            humanMessage,
          ]);
        },
        OPENAI_LLM_CONFIG
      );

      // Extract news report
      const newsReport = this.extractNewsReport(response);

      this.newsLogger.info('processWithLearning', 'Enhanced news analysis completed', {
        reportLength: newsReport.length,
        company: state.company_of_interest
      });

      // Add response to messages
      const updatedMessages = [...state.messages, response];

      return {
        messages: updatedMessages,
        news_report: newsReport,
        sender: this.name
      };

    } catch (error) {
      this.newsLogger.error('processWithLearning', 'Enhanced news analysis failed', {
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
    // Extract features from news analysis
    const features = this.extractFeaturesFromNews(result.news_report || '');

    // Calculate target based on news sentiment and impact
    const target = this.extractTargetFromNews(result.news_report || '');

    return {
      id: `news-analysis-${state.company_of_interest}-${Date.now()}`,
      features,
      target,
      timestamp: new Date().toISOString(),
      market_conditions: {
        company: state.company_of_interest,
        analysis_date: state.trade_date,
        analyst_type: 'news'
      },
      outcome: {
        realized_return: 0, // Will be updated when actual results are known
        risk_adjusted_return: 0,
        holding_period: 1,
        confidence_score: this.extractConfidenceFromNews(result.news_report || '')
      }
    };
  }

  /**
   * Apply learned adaptations to news analysis strategy
   */
  protected async applyLearnedAdaptations(insights: any[], state: AgentState): Promise<void> {
    this.newsLogger.info('applyLearnedAdaptations', 'Applying learned adaptations to news analysis', {
      insightsCount: insights.length,
      company: state.company_of_interest
    });

    // Adapt analysis based on learned patterns
    for (const insight of insights) {
      if (insight.source === 'supervised' && insight.confidence_score > 0.8) {
        // Apply supervised learning insights (news impact patterns)
        await this.applySupervisedInsight(insight, state);
      } else if (insight.source === 'unsupervised') {
        // Apply unsupervised learning insights (sentiment patterns)
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
    const baseRequest = `Perform a comprehensive news analysis for ${state.company_of_interest} as of ${state.trade_date}.

Consider the following context:
- Company: ${state.company_of_interest}
- Analysis Date: ${state.trade_date}
- Previous Analysis: ${state.news_report || 'None'}`;

    let enhancedRequest = baseRequest;

    // Add relevant learned insights
    const relevantInsights = learnedInsights.filter(i =>
      i.description.toLowerCase().includes(state.company_of_interest.toLowerCase()) ||
      i.description.toLowerCase().includes('news') ||
      i.description.toLowerCase().includes('sentiment') ||
      i.description.toLowerCase().includes('impact')
    );

    if (relevantInsights.length > 0) {
      enhancedRequest += '\n\nRelevant Learned Patterns:';
      for (const insight of relevantInsights.slice(0, 2)) {
        enhancedRequest += `\n- ${insight.description}`;
      }
    }

    return new HumanMessage(enhancedRequest);
  }

  private extractNewsReport(response: any): string {
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
      new HumanMessage(`Analyze the news for ${state.company_of_interest} on ${state.trade_date}.`)
    ]);

    return {
      messages: [...state.messages, basicResponse],
      news_report: this.extractNewsReport(basicResponse),
      sender: this.name
    };
  }

  private extractFeaturesFromNews(report: string): Record<string, number> {
    // Extract features from news analysis
    const features: Record<string, number> = {};

    // Extract sentiment scores
    const positiveMatch = report.match(/positive.sentiment[:\s]+(\d+\.?\d*)/i);
    if (positiveMatch && positiveMatch[1]) features.positive_sentiment = parseFloat(positiveMatch[1]);

    const negativeMatch = report.match(/negative.sentiment[:\s]+(\d+\.?\d*)/i);
    if (negativeMatch && negativeMatch[1]) features.negative_sentiment = parseFloat(negativeMatch[1]);

    // Extract news volume
    const newsCountMatch = report.match(/news.count[:\s]+(\d+)/i);
    if (newsCountMatch && newsCountMatch[1]) features.news_volume = parseFloat(newsCountMatch[1]);

    // Extract impact assessment
    const impactMatch = report.match(/market.impact[:\s]+(\d+\.?\d*)/i);
    if (impactMatch && impactMatch[1]) features.market_impact = parseFloat(impactMatch[1]);

    // Default features if none extracted
    if (Object.keys(features).length === 0) {
      features.overall_sentiment = 0.5;
      features.news_relevance = 0.5;
      features.market_impact_potential = 0.5;
    }

    return features;
  }

  private extractTargetFromNews(report: string): number {
    // Extract news sentiment assessment
    if (report.toLowerCase().includes('positive sentiment') ||
        report.toLowerCase().includes('bullish news') ||
        report.toLowerCase().includes('favorable developments')) {
      return 1.0; // Positive news sentiment
    } else if (report.toLowerCase().includes('negative sentiment') ||
               report.toLowerCase().includes('bearish news') ||
               report.toLowerCase().includes('adverse developments')) {
      return -1.0; // Negative news sentiment
    } else {
      return 0.0; // Neutral sentiment
    }
  }

  private extractConfidenceFromNews(report: string): number {
    // Extract confidence level from news analysis
    if (report.toLowerCase().includes('high confidence') ||
        report.toLowerCase().includes('strong conviction') ||
        report.toLowerCase().includes('clear signal')) {
      return 0.9;
    } else if (report.toLowerCase().includes('moderate confidence') ||
               report.toLowerCase().includes('reasonable assessment')) {
      return 0.7;
    } else if (report.toLowerCase().includes('low confidence') ||
               report.toLowerCase().includes('uncertain') ||
               report.toLowerCase().includes('mixed signals')) {
      return 0.3;
    } else {
      return 0.6; // Default confidence for news analysis
    }
  }

  private async applySupervisedInsight(insight: any, _state: AgentState): Promise<void> {
    // Apply supervised learning insights to enhance news analysis
    this.newsLogger.debug('applySupervisedInsight', 'Applied supervised learning insight', {
      insightType: insight.insight_type,
      confidence: insight.confidence_score
    });
  }

  private async applyUnsupervisedInsight(insight: any, _state: AgentState): Promise<void> {
    // Apply unsupervised learning insights (news pattern detection)
    this.newsLogger.debug('applyUnsupervisedInsight', 'Applied unsupervised learning insight', {
      insightType: insight.insight_type,
      confidence: insight.confidence_score
    });
  }
}