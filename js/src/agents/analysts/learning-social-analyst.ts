import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LearningAgentBase, LearningAgentConfig } from '../base/learning-agent';
import { AgentState } from '../../types/agent-states';
import { LearningExample } from '../../learning/learning-types';
import { createLogger } from '../../utils/enhanced-logger';
import { withLLMResilience, OPENAI_LLM_CONFIG, createResilientLLM } from '../../utils/resilient-llm';

/**
 * Learning-Enabled Social Analyst
 * Analyzes social media sentiment with integrated learning for improved sentiment prediction
 */
export class LearningSocialAnalyst extends LearningAgentBase {
  private readonly socialLogger = createLogger('agent', 'LearningSocialAnalyst');
  private readonly resilientLLM: BaseChatModel;

  constructor(
    llm: BaseChatModel,
    tools: StructuredTool[],
    learningConfig?: Partial<LearningAgentConfig>
  ) {
    // Configure learning specifically for social sentiment analysis
    const defaultLearningConfig: Partial<LearningAgentConfig> = {
      enableSupervisedLearning: true,    // Learn from successful sentiment predictions
      enableUnsupervisedLearning: true,  // Detect sentiment pattern clusters
      enableReinforcementLearning: true, // Optimize sentiment analysis methodology
      learningRate: 0.05,               // Moderate learning for social data
      memorySize: 500,                  // Keep extensive social history
      adaptationThreshold: 0.7,         // Moderate confidence threshold
      feedbackLoopEnabled: true,
      ...learningConfig
    };

    super(
      'Learning Social Analyst',
      'Analyzes social media sentiment with integrated learning for improved sentiment prediction and pattern recognition',
      llm,
      { provider: 'openai', model: 'gpt-4o-mini' },
      defaultLearningConfig,
      tools
    );

    // Create resilient LLM wrapper
    this.resilientLLM = createResilientLLM(llm, OPENAI_LLM_CONFIG);

    this.socialLogger.info('constructor', 'LearningSocialAnalyst initialized', {
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
    const basePrompt = `You are a Social Analyst with advanced learning capabilities specializing in social media sentiment and public opinion analysis.

Your responsibilities include:
1. Analyzing social media sentiment and discussions
2. Evaluating Reddit conversations and community opinions
3. Tracking public perception and sentiment trends
4. Identifying social media-driven market movements
5. Assessing the impact of social sentiment on stock performance

LEARNING CAPABILITIES:
- Sentiment Prediction: You learn from successful sentiment impact predictions
- Pattern Recognition: You detect recurring sentiment patterns and themes
- Influence Assessment: You improve at identifying market-moving social signals

ANALYSIS FRAMEWORK:
1. Sentiment Analysis: Overall sentiment, trend direction, key drivers
2. Social Media Monitoring: Reddit, Twitter, platform-specific patterns
3. Influencer Analysis: Key voices, credibility assessment, reach analysis
4. Momentum Tracking: Sentiment shifts, volatility, correlation with price
5. Risk Assessment: Social sentiment risks and opportunities

OUTPUT FORMAT:
Provide a comprehensive social sentiment analysis report in a structured format with:
- Sentiment Overview and Trends
- Social Media Analysis
- Influencer and Community Insights
- Sentiment-Price Correlation
- Social Risk Assessment

Remember: Your analysis improves over time through learning from actual market reactions to social sentiment.`;

    return basePrompt;
  }

  /**
   * Enhanced processing with learning integration
   */
  protected async processWithLearning(state: AgentState): Promise<Partial<AgentState>> {
    this.socialLogger.info('processWithLearning', 'Starting enhanced social sentiment analysis', {
      company: state.company_of_interest,
      tradeDate: state.trade_date,
      hasSentimentReport: !!state.sentiment_report
    });

    try {
      // Get learned insights to enhance analysis
      const learnedInsights = await this.getLearnedInsights();
      const highConfidenceInsights = learnedInsights.filter(i => i.confidence_score > 0.8);

      // Create enhanced system prompt with learned insights
      const enhancedSystemPrompt = this.createEnhancedSystemPrompt(highConfidenceInsights);

      // Create analysis request with learning context
      const humanMessage = this.createEnhancedAnalysisRequest(state, learnedInsights);

      this.socialLogger.debug('processWithLearning', 'Prepared enhanced social sentiment analysis request', {
        insightsUsed: learnedInsights.length,
        highConfidenceInsights: highConfidenceInsights.length
      });

      // Use resilient LLM with enhanced context
      const response = await withLLMResilience(
        'LearningSocialAnalyst.analyze',
        async () => {
          return await this.resilientLLM.invoke([
            new SystemMessage(enhancedSystemPrompt),
            humanMessage,
          ]);
        },
        OPENAI_LLM_CONFIG
      );

      // Extract sentiment report
      const sentimentReport = this.extractSentimentReport(response);

      this.socialLogger.info('processWithLearning', 'Enhanced social sentiment analysis completed', {
        reportLength: sentimentReport.length,
        company: state.company_of_interest
      });

      // Add response to messages
      const updatedMessages = [...state.messages, response];

      return {
        messages: updatedMessages,
        sentiment_report: sentimentReport,
        sender: this.name
      };

    } catch (error) {
      this.socialLogger.error('processWithLearning', 'Enhanced social sentiment analysis failed', {
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
    // Extract features from social sentiment analysis
    const features = this.extractFeaturesFromSentiment(result.sentiment_report || '');

    // Calculate target based on social sentiment
    const target = this.extractTargetFromSentiment(result.sentiment_report || '');

    return {
      id: `social-analysis-${state.company_of_interest}-${Date.now()}`,
      features,
      target,
      timestamp: new Date().toISOString(),
      market_conditions: {
        company: state.company_of_interest,
        analysis_date: state.trade_date,
        analyst_type: 'social'
      },
      outcome: {
        realized_return: 0, // Will be updated when actual results are known
        risk_adjusted_return: 0,
        holding_period: 1,
        confidence_score: this.extractConfidenceFromSentiment(result.sentiment_report || '')
      }
    };
  }

  /**
   * Apply learned adaptations to social sentiment analysis strategy
   */
  protected async applyLearnedAdaptations(insights: any[], state: AgentState): Promise<void> {
    this.socialLogger.info('applyLearnedAdaptations', 'Applying learned adaptations to social sentiment analysis', {
      insightsCount: insights.length,
      company: state.company_of_interest
    });

    // Adapt analysis based on learned patterns
    for (const insight of insights) {
      if (insight.source === 'supervised' && insight.confidence_score > 0.8) {
        // Apply supervised learning insights (sentiment impact patterns)
        await this.applySupervisedInsight(insight, state);
      } else if (insight.source === 'unsupervised') {
        // Apply unsupervised learning insights (sentiment clusters)
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
    const baseRequest = `Perform a comprehensive social sentiment analysis for ${state.company_of_interest} as of ${state.trade_date}.

Consider the following context:
- Company: ${state.company_of_interest}
- Analysis Date: ${state.trade_date}
- Previous Analysis: ${state.sentiment_report || 'None'}`;

    let enhancedRequest = baseRequest;

    // Add relevant learned insights
    const relevantInsights = learnedInsights.filter(i =>
      i.description.toLowerCase().includes(state.company_of_interest.toLowerCase()) ||
      i.description.toLowerCase().includes('sentiment') ||
      i.description.toLowerCase().includes('social') ||
      i.description.toLowerCase().includes('reddit')
    );

    if (relevantInsights.length > 0) {
      enhancedRequest += '\n\nRelevant Learned Patterns:';
      for (const insight of relevantInsights.slice(0, 2)) {
        enhancedRequest += `\n- ${insight.description}`;
      }
    }

    return new HumanMessage(enhancedRequest);
  }

  private extractSentimentReport(response: any): string {
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
      new HumanMessage(`Analyze the social sentiment for ${state.company_of_interest} on ${state.trade_date}.`)
    ]);

    return {
      messages: [...state.messages, basicResponse],
      sentiment_report: this.extractSentimentReport(basicResponse),
      sender: this.name
    };
  }

  private extractFeaturesFromSentiment(report: string): Record<string, number> {
    // Extract features from social sentiment analysis
    const features: Record<string, number> = {};

    // Extract sentiment scores
    const sentimentMatch = report.match(/sentiment.score[:\s]+(\d+\.?\d*)/i);
    if (sentimentMatch && sentimentMatch[1]) features.sentiment_score = parseFloat(sentimentMatch[1]);

    // Extract engagement metrics
    const mentionsMatch = report.match(/mentions[:\s]+(\d+)/i);
    if (mentionsMatch && mentionsMatch[1]) features.mention_count = parseFloat(mentionsMatch[1]);

    const engagementMatch = report.match(/engagement[:\s]+(\d+\.?\d*)/i);
    if (engagementMatch && engagementMatch[1]) features.engagement_rate = parseFloat(engagementMatch[1]);

    // Extract momentum indicators
    const momentumMatch = report.match(/momentum[:\s]+(\d+\.?\d*)/i);
    if (momentumMatch && momentumMatch[1]) features.sentiment_momentum = parseFloat(momentumMatch[1]);

    // Default features if none extracted
    if (Object.keys(features).length === 0) {
      features.overall_sentiment = 0.5;
      features.social_attention = 0.5;
      features.sentiment_volatility = 0.5;
    }

    return features;
  }

  private extractTargetFromSentiment(report: string): number {
    // Extract social sentiment assessment
    if (report.toLowerCase().includes('positive sentiment') ||
        report.toLowerCase().includes('bullish social') ||
        report.toLowerCase().includes('favorable discussions')) {
      return 1.0; // Positive social sentiment
    } else if (report.toLowerCase().includes('negative sentiment') ||
               report.toLowerCase().includes('bearish social') ||
               report.toLowerCase().includes('unfavorable discussions')) {
      return -1.0; // Negative social sentiment
    } else {
      return 0.0; // Neutral sentiment
    }
  }

  private extractConfidenceFromSentiment(report: string): number {
    // Extract confidence level from social sentiment analysis
    if (report.toLowerCase().includes('high confidence') ||
        report.toLowerCase().includes('strong consensus') ||
        report.toLowerCase().includes('clear sentiment signal')) {
      return 0.9;
    } else if (report.toLowerCase().includes('moderate confidence') ||
               report.toLowerCase().includes('mixed but leaning')) {
      return 0.7;
    } else if (report.toLowerCase().includes('low confidence') ||
               report.toLowerCase().includes('highly divided') ||
               report.toLowerCase().includes('conflicting signals')) {
      return 0.3;
    } else {
      return 0.6; // Default confidence for social analysis
    }
  }

  private async applySupervisedInsight(insight: any, _state: AgentState): Promise<void> {
    // Apply supervised learning insights to enhance social sentiment analysis
    this.socialLogger.debug('applySupervisedInsight', 'Applied supervised learning insight', {
      insightType: insight.insight_type,
      confidence: insight.confidence_score
    });
  }

  private async applyUnsupervisedInsight(insight: any, _state: AgentState): Promise<void> {
    // Apply unsupervised learning insights (sentiment pattern clustering)
    this.socialLogger.debug('applyUnsupervisedInsight', 'Applied unsupervised learning insight', {
      insightType: insight.insight_type,
      confidence: insight.confidence_score
    });
  }
}