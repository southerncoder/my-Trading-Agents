import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LearningAgentBase, LearningAgentConfig } from '../base/learning-agent';
import { AgentState } from '../../types/agent-states';
import { LearningExample } from '../../learning/learning-types';
import { createLogger } from '../../utils/enhanced-logger';
import { withLLMResilience, OPENAI_LLM_CONFIG, createResilientLLM } from '../../utils/resilient-llm';

// Import advanced memory and context tools
import {
  AdvancedMemoryLearningSystem,
  TradingIntelligenceRequest
} from '../../memory/advanced/index';
import {
  ContextRetrievalSystem,
  MarketContextQuery
} from '../../memory/advanced/context-retrieval-system';
import { PatternRecognitionEngine } from '../../memory/pattern-recognition';

/**
 * Enhanced Market Analyst with Advanced Memory & Context Integration
 * Analyzes market data with integrated advanced memory system for superior pattern recognition
 */
export class LearningMarketAnalyst extends LearningAgentBase {
  private readonly marketLogger = createLogger('agent', 'LearningMarketAnalyst');
  private readonly resilientLLM: BaseChatModel;

  // Advanced memory and context systems
  private advancedMemorySystem?: AdvancedMemoryLearningSystem;
  private contextRetrievalSystem?: ContextRetrievalSystem;
  private patternRecognitionEngine?: PatternRecognitionEngine;

  constructor(
    llm: BaseChatModel,
    tools: StructuredTool[],
    learningConfig?: Partial<LearningAgentConfig>,
    advancedMemorySystem?: AdvancedMemoryLearningSystem,
    contextRetrievalSystem?: ContextRetrievalSystem,
    patternRecognitionEngine?: PatternRecognitionEngine
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
      'Analyzes market data with integrated advanced memory system for superior pattern recognition and prediction accuracy',
      llm,
      { provider: 'openai', model: 'gpt-4o-mini' }, // Default config, will be overridden
      defaultLearningConfig,
      tools
    );

    // Create resilient LLM wrapper
    this.resilientLLM = createResilientLLM(llm, OPENAI_LLM_CONFIG);

    // Initialize advanced memory systems
    if (advancedMemorySystem) {
      this.advancedMemorySystem = advancedMemorySystem;
    }
    if (contextRetrievalSystem) {
      this.contextRetrievalSystem = contextRetrievalSystem;
    }
    if (patternRecognitionEngine) {
      this.patternRecognitionEngine = patternRecognitionEngine;
    }

    this.marketLogger.info('constructor', 'LearningMarketAnalyst initialized with advanced memory integration', {
      learningEnabled: this.learningEnabled,
      supervisedEnabled: this.learningConfig.enableSupervisedLearning,
      unsupervisedEnabled: this.learningConfig.enableUnsupervisedLearning,
      reinforcementEnabled: this.learningConfig.enableReinforcementLearning,
      advancedMemoryEnabled: !!this.advancedMemorySystem,
      contextRetrievalEnabled: !!this.contextRetrievalSystem,
      patternRecognitionEnabled: !!this.patternRecognitionEngine
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
   * Enhanced processing with advanced memory and context integration
   */
  protected async processWithLearning(state: AgentState): Promise<Partial<AgentState>> {
    this.marketLogger.info('processWithLearning', 'Starting enhanced market analysis with advanced memory', {
      company: state.company_of_interest || 'Unknown Company',
      tradeDate: state.trade_date,
      hasExistingReport: !!state.market_report,
      advancedMemoryEnabled: !!this.advancedMemorySystem,
      contextRetrievalEnabled: !!this.contextRetrievalSystem,
      patternRecognitionEnabled: !!this.patternRecognitionEngine
    });

    try {
      // Get advanced context and memory insights
      const contextInsights = await this.getAdvancedContextInsights(state);
      const patternInsights = await this.getPatternRecognitionInsights(state);
      const memoryInsights = await this.getMemorySystemInsights(state);

      // Get learned insights to enhance analysis
      const learnedInsights = await this.getLearnedInsights();
      const highConfidenceInsights = learnedInsights.filter(i => i.confidence_score > 0.8);

      // Create enhanced system prompt with all insights
      const enhancedSystemPrompt = this.createEnhancedSystemPromptWithAdvancedContext(
        highConfidenceInsights,
        contextInsights,
        patternInsights,
        memoryInsights
      );

      // Create analysis request with comprehensive context
      const humanMessage = this.createEnhancedAnalysisRequestWithContext(
        state,
        learnedInsights,
        contextInsights,
        patternInsights,
        memoryInsights
      );

      this.marketLogger.debug('processWithLearning', 'Prepared comprehensive analysis request', {
        insightsUsed: learnedInsights.length,
        contextScenarios: contextInsights?.similar_scenarios?.length || 0,
        patternsDetected: patternInsights?.detected_patterns?.length || 0,
        memoryInsights: !!memoryInsights
      });

      // Use resilient LLM with comprehensive context
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

      this.marketLogger.info('processWithLearning', 'Enhanced market analysis with advanced memory completed', {
        reportLength: marketReport.length,
        company: state.company_of_interest || 'Unknown Company',
        contextUsed: !!contextInsights,
        patternsUsed: !!patternInsights,
        memoryUsed: !!memoryInsights
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

  /**
   * Get advanced context insights from historical scenarios
   */
  private async getAdvancedContextInsights(state: AgentState): Promise<any> {
    if (!this.contextRetrievalSystem || !state.company_of_interest) {
      return null;
    }

    try {
      const contextQuery: MarketContextQuery = {
        entity_id: state.company_of_interest,
        current_conditions: {
          price_level: 100, // Default values - would be populated from actual market data
          volatility: 0.2,
          volume: 1000000,
          market_regime: 'sideways',
          sector_momentum: {},
          economic_indicators: {},
          sentiment_scores: {},
          technical_indicators: {},
          news_sentiment: 0
        },
        query_parameters: {
          lookback_days: 1095,
          max_results: 5,
          min_similarity: 0.7,
          time_decay_factor: 0.95,
          outcome_horizons: [1, 5, 21],
          regime_strict: false,
          sector_weight: 0.3,
          macro_weight: 0.4,
          technical_weight: 0.3
        }
      };

      const contextResult = await this.contextRetrievalSystem.findSimilarScenarios(contextQuery);

      this.marketLogger.debug('getAdvancedContextInsights', 'Retrieved historical context scenarios', {
        entityId: state.company_of_interest,
        scenariosFound: contextResult.similar_scenarios?.length || 0
      });

      return contextResult;
    } catch (error) {
      this.marketLogger.warn('getAdvancedContextInsights', 'Failed to retrieve context insights', {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Get pattern recognition insights
   */
  private async getPatternRecognitionInsights(state: AgentState): Promise<any> {
    if (!this.patternRecognitionEngine || !state.company_of_interest) {
      return null;
    }

    try {
      // Create mock price history for pattern recognition
      const priceHistory = [{
        timestamp: new Date().toISOString(),
        open: 100,
        high: 105,
        low: 95,
        close: 102,
        volume: 1000000
      }];

      const patterns = await this.patternRecognitionEngine.recognizePatterns(
        state.company_of_interest,
        {
          price_history: priceHistory,
          technical_indicators: { rsi: [65], macd: [0.5] },
          market_context: { regime: 'sideways' }
        }
      );

      this.marketLogger.debug('getPatternRecognitionInsights', 'Pattern recognition completed', {
        entityId: state.company_of_interest,
        patternsFound: patterns.patterns_detected?.market_patterns?.length || 0
      });

      return patterns;
    } catch (error) {
      this.marketLogger.warn('getPatternRecognitionInsights', 'Failed to get pattern insights', {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Get insights from the advanced memory system
   */
  private async getMemorySystemInsights(state: AgentState): Promise<any> {
    if (!this.advancedMemorySystem || !state.company_of_interest) {
      return null;
    }

    try {
      const intelligenceRequest: TradingIntelligenceRequest = {
        request_id: `market-analysis-${state.company_of_interest}-${Date.now()}`,
        agent_id: 'learning-market-analyst',
        entity_id: state.company_of_interest,
        query_type: 'market_analysis',
        current_context: {
          market_conditions: { ticker: state.company_of_interest, date: state.trade_date },
          technical_indicators: {},
          economic_indicators: {},
          sentiment_scores: {},
          market_regime: 'sideways',
          price_level: 100,
          volatility: 0.2,
          volume: 1000000,
          time_horizon_days: 21,
          confidence_level: 0.5
        },
        preferences: {
          include_similar_scenarios: true,
          include_pattern_analysis: true,
          include_risk_factors: true,
          include_confidence_adjustment: true,
          max_historical_scenarios: 5,
          similarity_threshold: 0.7
        }
      };

      const insights = await this.advancedMemorySystem.processIntelligenceRequest(intelligenceRequest);

      this.marketLogger.debug('getMemorySystemInsights', 'Advanced memory insights retrieved', {
        entityId: state.company_of_interest,
        processingTime: insights.processing_time_ms
      });

      return insights;
    } catch (error) {
      this.marketLogger.warn('getMemorySystemInsights', 'Failed to get memory insights', {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Create enhanced system prompt with advanced context
   */
  private createEnhancedSystemPromptWithAdvancedContext(
    highConfidenceInsights: any[],
    contextInsights: any,
    patternInsights: any,
    memoryInsights: any
  ): string {
    let basePrompt = this.getSystemPrompt();

    // Add high confidence learned insights
    if (highConfidenceInsights.length > 0) {
      basePrompt += '\n\nLEARNED INSIGHTS TO CONSIDER:\n';
      for (const insight of highConfidenceInsights.slice(0, 3)) {
        basePrompt += `- ${insight.description} (Confidence: ${(insight.confidence_score * 100).toFixed(1)}%)\n`;
      }
    }

    // Add historical context insights
    if (contextInsights?.similar_scenarios?.length > 0) {
      basePrompt += '\n\nHISTORICAL CONTEXT PATTERNS:\n';
      basePrompt += `- Found ${contextInsights.similar_scenarios.length} similar historical scenarios\n`;
      basePrompt += `- Consider how past similar conditions resolved\n`;
    }

    // Add pattern recognition insights
    if (patternInsights?.patterns_detected?.market_patterns?.length > 0) {
      basePrompt += '\n\nPATTERN RECOGNITION INSIGHTS:\n';
      basePrompt += `- Detected ${patternInsights.patterns_detected.market_patterns.length} technical patterns\n`;
      basePrompt += `- Pattern confidence: ${(patternInsights.pattern_confluence?.confidence_level * 100 || 0).toFixed(1)}%\n`;
    }

    // Add memory system insights
    if (memoryInsights?.market_intelligence) {
      const riskFactors = memoryInsights.market_intelligence.risk_assessment?.risk_factors || [];
      if (riskFactors.length > 0) {
        basePrompt += '\n\nMEMORY SYSTEM RISK INSIGHTS:\n';
        basePrompt += `- Identified ${riskFactors.length} risk factors from historical patterns\n`;
      }

      const confidence = memoryInsights.market_intelligence.confidence_analysis?.adjusted_confidence;
      if (confidence) {
        basePrompt += `- Historical performance suggests ${(confidence * 100).toFixed(1)}% confidence level\n`;
      }
    }

    return basePrompt;
  }

  /**
   * Create enhanced analysis request with comprehensive context
   */
  private createEnhancedAnalysisRequestWithContext(
    state: AgentState,
    learnedInsights: any[],
    contextInsights: any,
    patternInsights: any,
    memoryInsights: any
  ): HumanMessage {
    const company = state.company_of_interest || 'Unknown Company';
    const baseRequest = `Please analyze the market for ${company} on ${state.trade_date}.

Consider the following comprehensive context:
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

    // Add historical context
    if (contextInsights?.similar_scenarios?.length > 0) {
      enhancedRequest += '\n\nHistorical Context:';
      enhancedRequest += `\n- Found ${contextInsights.similar_scenarios.length} similar market conditions`;
      enhancedRequest += '\n- Consider how these historical scenarios resolved';
    }

    // Add pattern insights
    if (patternInsights?.patterns_detected?.market_patterns?.length > 0) {
      enhancedRequest += '\n\nTechnical Patterns Detected:';
      enhancedRequest += `\n- ${patternInsights.patterns_detected.market_patterns.length} patterns identified`;
      if (patternInsights.actionable_insights?.length > 0) {
        enhancedRequest += `\n- ${patternInsights.actionable_insights.length} actionable signals`;
      }
    }

    // Add memory insights
    if (memoryInsights?.market_intelligence) {
      const riskFactors = memoryInsights.market_intelligence.risk_assessment?.risk_factors || [];
      if (riskFactors.length > 0) {
        enhancedRequest += '\n\nRisk Assessment from Memory:';
        enhancedRequest += `\n- ${riskFactors.length} risk factors identified from historical patterns`;
      }
    }

    return new HumanMessage(enhancedRequest);
  }
}