import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LearningAgentBase, LearningAgentConfig } from '../base/learning-agent';
import { AgentState } from '../../types/agent-states';
import { LearningExample } from '../../learning/learning-types';
import { createLogger } from '../../utils/enhanced-logger';
import { withLLMResilience, OPENAI_LLM_CONFIG, createResilientLLM } from '../../utils/resilient-llm';

/**
 * Learning-Enabled Risk Manager
 * Manages comprehensive risk assessment with integrated learning for improved risk control
 */
export class LearningRiskManager extends LearningAgentBase {
  private readonly riskManagerLogger = createLogger('agent', 'LearningRiskManager');
  private readonly resilientLLM: BaseChatModel;

  constructor(
    llm: BaseChatModel,
    tools: StructuredTool[],
    learningConfig?: Partial<LearningAgentConfig>
  ) {
    // Configure learning specifically for risk management
    const defaultLearningConfig: Partial<LearningAgentConfig> = {
      enableSupervisedLearning: true,    // Learn from successful risk control outcomes
      enableUnsupervisedLearning: true,  // Detect risk pattern clusters
      enableReinforcementLearning: true, // Optimize risk management methodology
      learningRate: 0.02,               // Very conservative learning for risk management
      memorySize: 250,                  // Keep focused risk management history
      adaptationThreshold: 0.85,        // Very high threshold for risk decisions
      feedbackLoopEnabled: true,
      ...learningConfig
    };

    super(
      'Learning Risk Manager',
      'Manages comprehensive risk assessment with integrated learning for improved risk control and mitigation strategies',
      llm,
      { provider: 'openai', model: 'gpt-4o-mini' },
      defaultLearningConfig,
      tools
    );

    // Create resilient LLM wrapper
    this.resilientLLM = createResilientLLM(llm, OPENAI_LLM_CONFIG);

    this.riskManagerLogger.info('constructor', 'LearningRiskManager initialized', {
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
    const basePrompt = `You are a Risk Manager with advanced learning capabilities specializing in comprehensive risk assessment and mitigation strategies.

Your responsibilities include:
1. Conducting comprehensive risk assessments
2. Developing risk mitigation strategies
3. Monitoring risk exposure levels
4. Implementing risk control measures
5. Managing risk-adjusted decision making

LEARNING CAPABILITIES:
- Risk Assessment: You learn from successful risk identification and mitigation
- Control Optimization: You detect patterns in effective risk control strategies
- Mitigation Enhancement: You improve at developing comprehensive risk mitigation plans

MANAGEMENT FRAMEWORK:
1. Risk Identification: Comprehensive risk factor analysis
2. Risk Measurement: Quantitative risk assessment and metrics
3. Risk Mitigation: Development of risk control strategies
4. Risk Monitoring: Continuous risk exposure tracking
5. Risk Reporting: Clear risk assessment and mitigation reporting

OUTPUT FORMAT:
Provide a comprehensive risk management report in a structured format with:
- Risk Assessment Summary
- Risk Factor Analysis
- Mitigation Strategy Recommendations
- Risk Control Measures
- Monitoring Framework
- Risk Management Effectiveness

Remember: Your management improves over time through learning from actual risk events and mitigation effectiveness.`;

    return basePrompt;
  }

  /**
   * Enhanced processing with learning integration
   */
  protected async processWithLearning(state: AgentState): Promise<Partial<AgentState>> {
    this.riskManagerLogger.info('processWithLearning', 'Starting enhanced risk management', {
      company: state.company_of_interest,
      tradeDate: state.trade_date,
      hasRiskDebate: !!state.risk_debate_state
    });

    try {
      // Get learned insights to enhance management
      const learnedInsights = await this.getLearnedInsights();
      const highConfidenceInsights = learnedInsights.filter(i => i.confidence_score > 0.8);

      // Create enhanced system prompt with learned insights
      const enhancedSystemPrompt = this.createEnhancedSystemPrompt(highConfidenceInsights);

      // Create management request with learning context
      const humanMessage = this.createEnhancedManagementRequest(state, learnedInsights);

      this.riskManagerLogger.debug('processWithLearning', 'Prepared enhanced risk management request', {
        insightsUsed: learnedInsights.length,
        highConfidenceInsights: highConfidenceInsights.length
      });

      // Use resilient LLM with enhanced context
      const response = await withLLMResilience(
        'LearningRiskManager.manage',
        async () => {
          return await this.resilientLLM.invoke([
            new SystemMessage(enhancedSystemPrompt),
            humanMessage,
          ]);
        },
        OPENAI_LLM_CONFIG
      );

      // Extract risk management decision
      const riskDecision = this.extractRiskDecision(response);

      this.riskManagerLogger.info('processWithLearning', 'Enhanced risk management completed', {
        decisionLength: riskDecision.length,
        company: state.company_of_interest
      });

      // Update risk debate state
      const updatedRiskDebateState = {
        ...state.risk_debate_state!,
        judge_decision: riskDecision,
        count: (state.risk_debate_state?.count || 0) + 1
      };

      // Add response to messages
      const updatedMessages = [...state.messages, response];

      return {
        messages: updatedMessages,
        risk_debate_state: updatedRiskDebateState,
        final_trade_decision: riskDecision,
        sender: this.name
      };

    } catch (error) {
      this.riskManagerLogger.error('processWithLearning', 'Enhanced risk management failed', {
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
    // Extract features from risk management
    const features = this.extractFeaturesFromRiskDecision(result.final_trade_decision || '');

    // Calculate target based on risk management effectiveness
    const target = this.extractTargetFromRiskDecision(result.final_trade_decision || '');

    return {
      id: `risk-management-${state.company_of_interest}-${Date.now()}`,
      features,
      target,
      timestamp: new Date().toISOString(),
      market_conditions: {
        company: state.company_of_interest,
        analysis_date: state.trade_date,
        analyst_type: 'risk_manager'
      },
      outcome: {
        realized_return: 0, // Will be updated when actual results are known
        risk_adjusted_return: 0,
        holding_period: 1,
        confidence_score: this.extractConfidenceFromRiskDecision(result.final_trade_decision || '')
      }
    };
  }

  /**
   * Apply learned adaptations to risk management strategy
   */
  protected async applyLearnedAdaptations(insights: any[], state: AgentState): Promise<void> {
    this.riskManagerLogger.info('applyLearnedAdaptations', 'Applying learned adaptations to risk management', {
      insightsCount: insights.length,
      company: state.company_of_interest
    });

    // Adapt management based on learned patterns
    for (const insight of insights) {
      if (insight.source === 'supervised' && insight.confidence_score > 0.8) {
        // Apply supervised learning insights (successful risk control patterns)
        await this.applySupervisedInsight(insight, state);
      } else if (insight.source === 'unsupervised') {
        // Apply unsupervised learning insights (risk pattern clusters)
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
    const riskDebate = state.risk_debate_state;
    const riskyHistory = riskDebate?.risky_history || 'No risky analysis provided';
    const safeHistory = riskDebate?.safe_history || 'No safe analysis provided';
    const neutralHistory = riskDebate?.neutral_history || 'No neutral analysis provided';

    const baseRequest = `Conduct comprehensive risk management for ${state.company_of_interest} as of ${state.trade_date}.

Risk Debate Context:
- Risky Analysis: ${riskyHistory}
- Safe Analysis: ${safeHistory}
- Neutral Analysis: ${neutralHistory}
- Debate Length: ${riskDebate?.count || 0} exchanges

Please evaluate all risk perspectives, assess overall risk exposure, and provide a final risk management decision.`;

    let enhancedRequest = baseRequest;

    // Add relevant learned insights
    const relevantInsights = learnedInsights.filter(i =>
      i.description.toLowerCase().includes(state.company_of_interest.toLowerCase()) ||
      i.description.toLowerCase().includes('risk') ||
      i.description.toLowerCase().includes('mitigation') ||
      i.description.toLowerCase().includes('control') ||
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

  private extractRiskDecision(response: any): string {
    if (typeof response.content === 'string') {
      return response.content;
    } else if (Array.isArray(response.content)) {
      return response.content
        .map((item: any) => typeof item === 'string' ? item : item.text || '')
        .filter((text: string) => text.length > 0)
        .join('\n');
    }
    return 'Risk management completed but decision extraction failed';
  }

  private async performBasicManagement(state: AgentState): Promise<Partial<AgentState>> {
    // Fallback to basic management without learning enhancements
    const basicResponse = await this.resilientLLM.invoke([
      new SystemMessage(this.getSystemPrompt()),
      new HumanMessage(`Conduct risk management assessment for ${state.company_of_interest} on ${state.trade_date}.`)
    ]);

    const riskDecision = this.extractRiskDecision(basicResponse);

    // Update risk debate state
    const updatedRiskDebateState = {
      ...state.risk_debate_state!,
      judge_decision: riskDecision,
      count: (state.risk_debate_state?.count || 0) + 1
    };

    return {
      messages: [...state.messages, basicResponse],
      risk_debate_state: updatedRiskDebateState,
      final_trade_decision: riskDecision,
      sender: this.name
    };
  }

  private extractFeaturesFromRiskDecision(decision: string): Record<string, number> {
    // Extract features from risk management decision
    const features: Record<string, number> = {};

    // Extract risk exposure assessment
    const exposureMatch = decision.match(/risk.exposure[:\s]+(\d+\.?\d*)/i);
    if (exposureMatch && exposureMatch[1]) features.risk_exposure = parseFloat(exposureMatch[1]);

    // Extract mitigation effectiveness
    const mitigationMatch = decision.match(/mitigation.effectiveness[:\s]+(\d+\.?\d*)/i);
    if (mitigationMatch && mitigationMatch[1]) features.mitigation_effectiveness = parseFloat(mitigationMatch[1]);

    // Extract control measure strength
    const controlMatch = decision.match(/control.strength[:\s]+(\d+\.?\d*)/i);
    if (controlMatch && controlMatch[1]) features.control_strength = parseFloat(controlMatch[1]);

    // Extract monitoring effectiveness
    const monitoringMatch = decision.match(/monitoring.effectiveness[:\s]+(\d+\.?\d*)/i);
    if (monitoringMatch && monitoringMatch[1]) features.monitoring_effectiveness = parseFloat(monitoringMatch[1]);

    // Extract risk management score
    const managementMatch = decision.match(/risk.management.score[:\s]+(\d+\.?\d*)/i);
    if (managementMatch && managementMatch[1]) features.risk_management_score = parseFloat(managementMatch[1]);

    // Default features if none extracted
    if (Object.keys(features).length === 0) {
      features.risk_assessment = 0.6;
      features.mitigation_quality = 0.5;
      features.control_effectiveness = 0.4;
      features.monitoring_coverage = 0.3;
    }

    return features;
  }

  private extractTargetFromRiskDecision(decision: string): number {
    // Extract risk management effectiveness
    if (decision.toLowerCase().includes('excellent risk management') ||
        decision.toLowerCase().includes('comprehensive mitigation') ||
        decision.toLowerCase().includes('robust risk controls')) {
      return 1.0; // Excellent risk management
    } else if (decision.toLowerCase().includes('good risk management') ||
               decision.toLowerCase().includes('effective mitigation')) {
      return 0.7; // Good risk management
    } else if (decision.toLowerCase().includes('poor risk management') ||
               decision.toLowerCase().includes('inadequate mitigation') ||
               decision.toLowerCase().includes('weak risk controls')) {
      return -0.3; // Poor risk management
    } else {
      return 0.5; // Neutral risk management assessment
    }
  }

  private extractConfidenceFromRiskDecision(decision: string): number {
    // Extract confidence level from risk management
    if (decision.toLowerCase().includes('high confidence') ||
        decision.toLowerCase().includes('strong conviction') ||
        decision.toLowerCase().includes('clear risk assessment')) {
      return 0.9;
    } else if (decision.toLowerCase().includes('moderate confidence') ||
               decision.toLowerCase().includes('reasonable assessment')) {
      return 0.7;
    } else if (decision.toLowerCase().includes('low confidence') ||
               decision.toLowerCase().includes('uncertain risk assessment') ||
               decision.toLowerCase().includes('conflicting risk signals')) {
      return 0.4;
    } else {
      return 0.6; // Default confidence for risk management
    }
  }

  private async applySupervisedInsight(insight: any, _state: AgentState): Promise<void> {
    // Apply supervised learning insights to enhance risk management
    this.riskManagerLogger.debug('applySupervisedInsight', 'Applied supervised learning insight', {
      insightType: insight.insight_type,
      confidence: insight.confidence_score
    });
  }

  private async applyUnsupervisedInsight(insight: any, _state: AgentState): Promise<void> {
    // Apply unsupervised learning insights (risk pattern clustering)
    this.riskManagerLogger.debug('applyUnsupervisedInsight', 'Applied unsupervised learning insight', {
      insightType: insight.insight_type,
      confidence: insight.confidence_score
    });
  }
}