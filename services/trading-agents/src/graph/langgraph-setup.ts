/**
 * LangGraph Workflow Integration for Trading Agents
 * 
 * This module creates a LangGraph StateGraph workflow that orchestrates
 * the trading agents in a structured manner, similar to the Python implementation.
 */

import { StateGraph, MessagesAnnotation, Annotation } from '@langchain/langgraph';
import { START, END } from '@langchain/langgraph';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

import { AgentState } from '../types/agent-states';
import { ConditionalLogic } from './conditional-logic';
import { ModelProvider, ModelConfig } from '../models/index';
import { TradingAgentsConfig } from '../types/config';

// Import all agent creators
import {
  MarketAnalyst,
  SocialAnalyst,
  NewsAnalyst,
  FundamentalsAnalyst,
  BullResearcher,
  BearResearcher,
  ResearchManager,
  Trader,
  RiskyAnalyst,
  NeutralAnalyst,
  SafeAnalyst
} from '../agents';

export type AnalystType = 'market' | 'social' | 'news' | 'fundamentals';

export interface GraphSetupConfig {
  selectedAnalysts: AnalystType[];
  modelConfigs: {
    quickThinking: ModelConfig;
    deepThinking: ModelConfig;
  };
  config: TradingAgentsConfig;
}

// Define our custom state annotation for trading agents
const TradingAgentState = Annotation.Root({
  companyOfInterest: Annotation<string>(),
  tradeDate: Annotation<string>(),
  marketReport: Annotation<string>(),
  sentimentReport: Annotation<string>(),
  newsReport: Annotation<string>(),
  fundamentalsReport: Annotation<string>(),
  investmentDebateState: Annotation<any>(),
  traderInvestmentPlan: Annotation<string>(),
  riskDebateState: Annotation<any>(),
  investmentPlan: Annotation<string>(),
  finalTradeDecision: Annotation<string>(),
  messages: Annotation<any[]>()
});

/**
 * Handles the setup and configuration of the LangGraph agent workflow
 */
export class LangGraphSetup {
  private quickThinkingModel: BaseChatModel | undefined;
  private deepThinkingModel: BaseChatModel | undefined;
  private conditionalLogic: ConditionalLogic;
  private config: TradingAgentsConfig;
  private quickThinkingModelPromise: Promise<BaseChatModel>;
  private deepThinkingModelPromise: Promise<BaseChatModel>;

  constructor(setupConfig: GraphSetupConfig) {
    // Initialize models asynchronously
    this.quickThinkingModelPromise = ModelProvider.createModelAsync(setupConfig.modelConfigs.quickThinking);
    this.deepThinkingModelPromise = ModelProvider.createModelAsync(setupConfig.modelConfigs.deepThinking);
    this.conditionalLogic = new ConditionalLogic();
    this.config = setupConfig.config;
  }

  /**
   * Initialize the models asynchronously
   */
  async initializeModels(): Promise<void> {
    this.quickThinkingModel = await this.quickThinkingModelPromise;
    this.deepThinkingModel = await this.deepThinkingModelPromise;
  }

  /**
   * Get quick thinking model (with null check)
   */
  private getQuickThinkingModel(): BaseChatModel {
    if (!this.quickThinkingModel) {
      throw new Error('Quick thinking model not initialized. Call initializeModels() first.');
    }
    return this.quickThinkingModel;
  }

  /**
   * Get deep thinking model (with null check)
   */
  private getDeepThinkingModel(): BaseChatModel {
    if (!this.deepThinkingModel) {
      throw new Error('Deep thinking model not initialized. Call initializeModels() first.');
    }
    return this.deepThinkingModel;
  }

  /**
   * Set up and compile the agent workflow graph
   */
  async setupGraph(selectedAnalysts: AnalystType[] = ['market', 'social', 'news', 'fundamentals']) {
    if (selectedAnalysts.length === 0) {
      throw new Error('Trading Agents Graph Setup Error: no analysts selected!');
    }

    // Ensure models are initialized
    await this.initializeModels();

    // Create the state graph
    const workflow = new StateGraph(TradingAgentState);

    // Create and add analyst nodes
    this.addAnalystNodes(workflow, selectedAnalysts);

    // Create and add research nodes
    this.addResearchNodes(workflow);

    // Create and add risk analysis nodes
    this.addRiskAnalysisNodes(workflow);

    // Define the workflow edges
    this.addWorkflowEdges(workflow, selectedAnalysts);

    // Compile and return the graph
    return workflow.compile();
  }

  /**
   * Add analyst nodes to the workflow
   */
  private addAnalystNodes(workflow: StateGraph<typeof TradingAgentState>, selectedAnalysts: AnalystType[]) {
    if (selectedAnalysts.includes('market')) {
      const marketAnalyst = new MarketAnalyst(this.getQuickThinkingModel(), []);
      workflow.addNode('MarketAnalyst', async (state: typeof TradingAgentState.State) => {
        const result = await marketAnalyst.process(state as AgentState);
        return result;
      });
      workflow.addNode('ClearMarketMessages', this.createMessageClear());
    }

    if (selectedAnalysts.includes('social')) {
      const socialAnalyst = new SocialAnalyst(this.getQuickThinkingModel(), []);
      workflow.addNode('SocialAnalyst', async (state: typeof TradingAgentState.State) => {
        const result = await socialAnalyst.process(state as AgentState);
        return result;
      });
      workflow.addNode('ClearSocialMessages', this.createMessageClear());
    }

    if (selectedAnalysts.includes('news')) {
      const newsAnalyst = new NewsAnalyst(this.getQuickThinkingModel(), []);
      workflow.addNode('NewsAnalyst', async (state: typeof TradingAgentState.State) => {
        const result = await newsAnalyst.process(state as AgentState);
        return result;
      });
      workflow.addNode('ClearNewsMessages', this.createMessageClear());
    }

    if (selectedAnalysts.includes('fundamentals')) {
      const fundamentalsAnalyst = new FundamentalsAnalyst(this.getQuickThinkingModel(), []);
      workflow.addNode('FundamentalsAnalyst', async (state: typeof TradingAgentState.State) => {
        const result = await fundamentalsAnalyst.process(state as AgentState);
        return result;
      });
      workflow.addNode('ClearFundamentalsMessages', this.createMessageClear());
    }
  }

  /**
   * Add research nodes to the workflow
   */
  private addResearchNodes(workflow: StateGraph<typeof TradingAgentState>) {
    const bullResearcher = new BullResearcher(this.getQuickThinkingModel(), []);
    const bearResearcher = new BearResearcher(this.getQuickThinkingModel(), []);
    const researchManager = new ResearchManager(this.getDeepThinkingModel(), []);

    workflow.addNode('BullResearcher', async (state: typeof TradingAgentState.State) => {
      const result = await bullResearcher.process(state as AgentState);
      return result;
    });

    workflow.addNode('BearResearcher', async (state: typeof TradingAgentState.State) => {
      const result = await bearResearcher.process(state as AgentState);
      return result;
    });

    workflow.addNode('ResearchManager', async (state: typeof TradingAgentState.State) => {
      const result = await researchManager.process(state as AgentState);
      return result;
    });

    const trader = new Trader(this.getQuickThinkingModel(), []);
    workflow.addNode('Trader', async (state: typeof TradingAgentState.State) => {
      const result = await trader.process(state as AgentState);
      return result;
    });
  }

  /**
   * Add risk analysis nodes to the workflow
   */
  private addRiskAnalysisNodes(workflow: StateGraph<typeof TradingAgentState>) {
    const riskyAnalyst = new RiskyAnalyst(this.getQuickThinkingModel(), []);
    const neutralAnalyst = new NeutralAnalyst(this.getQuickThinkingModel(), []);
    const safeAnalyst = new SafeAnalyst(this.getQuickThinkingModel(), []);

    workflow.addNode('RiskyAnalyst', async (state: typeof TradingAgentState.State) => {
      const result = await riskyAnalyst.process(state as AgentState);
      return result;
    });

    workflow.addNode('NeutralAnalyst', async (state: typeof TradingAgentState.State) => {
      const result = await neutralAnalyst.process(state as AgentState);
      return result;
    });

    workflow.addNode('SafeAnalyst', async (state: typeof TradingAgentState.State) => {
      const result = await safeAnalyst.process(state as AgentState);
      return result;
    });

    // Risk Management Node with comprehensive risk assessment
    // TODO: Integrate with proper RiskManager class when available
    // TODO: Implement portfolio-level risk constraints
    // TODO: Add real-time market risk monitoring
    workflow.addNode('RiskJudge', async (state: typeof TradingAgentState.State) => {
      try {
        const riskAssessment = await this.performComprehensiveRiskAssessment(state as AgentState);
        const finalDecision = this.determineTradeDecision(state as AgentState, riskAssessment);
        
        return { 
          ...state, 
          finalTradeDecision: finalDecision,
          riskMetrics: riskAssessment,
          riskAssessmentTimestamp: new Date().toISOString()
        };
      } catch (error) {
        // Fallback to conservative decision on risk assessment failure
        return { 
          ...state, 
          finalTradeDecision: 'HOLD - Risk assessment failed, defaulting to conservative stance',
          riskMetrics: { overallRisk: 'HIGH', confidence: 0.1 }
        };
      }
    });
  }

  /**
   * Add edges to the workflow graph
   */
  private addWorkflowEdges(workflow: StateGraph<typeof TradingAgentState>, selectedAnalysts: AnalystType[]) {
    // Start with the first analyst
    const firstAnalyst = this.capitalizeFirst(selectedAnalysts[0]) + 'Analyst';
    workflow.addEdge(START, firstAnalyst);

    // Connect analysts in sequence
    for (let i = 0; i < selectedAnalysts.length; i++) {
      const analystType = selectedAnalysts[i];
      const currentAnalyst = this.capitalizeFirst(analystType) + 'Analyst';
      const currentClear = 'Clear' + this.capitalizeFirst(analystType) + 'Messages';

      // Simple edge from analyst to message clear
      workflow.addEdge(currentAnalyst, currentClear);

      // Connect to next analyst or to Bull Researcher if this is the last analyst
      if (i < selectedAnalysts.length - 1) {
        const nextAnalyst = this.capitalizeFirst(selectedAnalysts[i + 1]) + 'Analyst';
        workflow.addEdge(currentClear, nextAnalyst);
      } else {
        workflow.addEdge(currentClear, 'BullResearcher');
      }
    }

    // Add remaining edges for debate and risk analysis
    // Simplified for initial implementation - can be enhanced with conditional logic later
    workflow.addEdge('BullResearcher', 'BearResearcher');
    workflow.addEdge('BearResearcher', 'ResearchManager');
    workflow.addEdge('ResearchManager', 'Trader');
    workflow.addEdge('Trader', 'RiskyAnalyst');
    workflow.addEdge('RiskyAnalyst', 'SafeAnalyst');
    workflow.addEdge('SafeAnalyst', 'NeutralAnalyst');
    workflow.addEdge('NeutralAnalyst', 'RiskJudge');
    workflow.addEdge('RiskJudge', END);
  }

  /**
   * Create a message clearing function
   */
  private createMessageClear() {
    return (state: typeof TradingAgentState.State): Partial<typeof TradingAgentState.State> => {
      return {
        ...state,
        messages: [] // Clear messages to prevent context overflow
      };
    };
  }

  /**
   * Capitalize the first letter of a string
   */
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Create a simple LangGraph workflow for development
   */
  static createSimpleWorkflow(config: GraphSetupConfig): any {
    const setup = new LangGraphSetup(config);
    return setup.setupGraph(config.selectedAnalysts);
  }

  /**
   * Create model configurations from TradingAgentsConfig
   */
  static createModelConfigs(config: TradingAgentsConfig): GraphSetupConfig['modelConfigs'] {
    return ModelProvider.createFromConfig(config);
  }

  /**
   * Get default LM Studio configuration for development
   */
  static getDefaultLMStudioConfig(): GraphSetupConfig['modelConfigs'] {
    const lmStudioConfig = ModelProvider.getLMStudioConfig();
    return {
      quickThinking: lmStudioConfig,
      deepThinking: lmStudioConfig
    };
  }

  /**
   * Validate that required models are available
   */
  static async validateModels(modelConfigs: GraphSetupConfig['modelConfigs']): Promise<{
    quickThinking: { success: boolean; error?: string };
    deepThinking: { success: boolean; error?: string };
  }> {
    const [quickResult, deepResult] = await Promise.all([
      ModelProvider.testConnection(modelConfigs.quickThinking),
      ModelProvider.testConnection(modelConfigs.deepThinking)
    ]);

    return {
      quickThinking: quickResult,
      deepThinking: deepResult
    };
  }

  /**
   * Create initial state for the trading graph
   */
  static createInitialState(companyOfInterest: string, tradeDate: string): typeof TradingAgentState.State {
    return {
      companyOfInterest,
      tradeDate,
      marketReport: '',
      sentimentReport: '',
      newsReport: '',
      fundamentalsReport: '',
      investmentDebateState: {
        bullHistory: [],
        bearHistory: [],
        history: [],
        currentResponse: '',
        judgeDecision: ''
      },
      traderInvestmentPlan: '',
      riskDebateState: {
        riskyHistory: [],
        safeHistory: [],
        neutralHistory: [],
        history: [],
        judgeDecision: ''
      },
      investmentPlan: '',
      finalTradeDecision: '',
      messages: []
    };
  }

  /**
   * Perform comprehensive risk assessment for trading decisions
   * TODO: Integrate with external risk management APIs
   * TODO: Implement sector-specific risk models
   * TODO: Add real-time volatility monitoring
   */
  private async performComprehensiveRiskAssessment(state: any): Promise<any> {
    try {
      // Extract relevant state information for risk analysis
      const marketReport = state.marketReport || '';
      const sentimentReport = state.sentimentReport || '';
      const newsReport = state.newsReport || '';
      const fundamentalsReport = state.fundamentalsReport || '';
      const traderPlan = state.traderInvestmentPlan || '';

      // Calculate individual risk components
      const marketRisk = this.assessMarketRisk(marketReport);
      const sentimentRisk = this.assessSentimentRisk(sentimentReport);
      const newsRisk = this.assessNewsRisk(newsReport);
      const fundamentalRisk = this.assessFundamentalRisk(fundamentalsReport);
      const executionRisk = this.assessExecutionRisk(traderPlan);

      // Calculate weighted overall risk score
      const overallRiskScore = (
        marketRisk.score * 0.25 +
        sentimentRisk.score * 0.20 +
        newsRisk.score * 0.20 +
        fundamentalRisk.score * 0.25 +
        executionRisk.score * 0.10
      );

      // Determine risk level based on score
      let riskLevel = 'MEDIUM';
      if (overallRiskScore < 0.3) riskLevel = 'LOW';
      else if (overallRiskScore > 0.7) riskLevel = 'HIGH';

      // Calculate confidence in risk assessment
      const confidence = this.calculateRiskConfidence([
        marketRisk, sentimentRisk, newsRisk, fundamentalRisk, executionRisk
      ]);

      return {
        overallRisk: riskLevel,
        overallScore: Number(overallRiskScore.toFixed(3)),
        confidence: Number(confidence.toFixed(3)),
        components: {
          market: marketRisk,
          sentiment: sentimentRisk,
          news: newsRisk,
          fundamental: fundamentalRisk,
          execution: executionRisk
        },
        timestamp: new Date().toISOString(),
        recommendations: this.generateRiskRecommendations(riskLevel, overallRiskScore)
      };
    } catch (error) {
      // Fallback to high risk assessment on error
      return {
        overallRisk: 'HIGH',
        overallScore: 0.9,
        confidence: 0.1,
        components: {},
        timestamp: new Date().toISOString(),
        error: 'Risk assessment failed'
      };
    }
  }

  /**
   * Determine final trade decision based on state and risk assessment
   * TODO: Implement machine learning-based decision weighting
   * TODO: Add portfolio-level constraint checking
   */
  private determineTradeDecision(state: any, riskAssessment: any): string {
    try {
      const traderPlan = state.traderInvestmentPlan || '';
      const riskLevel = riskAssessment.overallRisk || 'HIGH';
      const riskScore = riskAssessment.overallScore || 0.9;
      const confidence = riskAssessment.confidence || 0.1;

      // Extract trader sentiment from plan
      const planLowerCase = traderPlan.toLowerCase();
      let traderSentiment = 'NEUTRAL';
      
      if (planLowerCase.includes('buy') || planLowerCase.includes('long') || planLowerCase.includes('bullish')) {
        traderSentiment = 'BULLISH';
      } else if (planLowerCase.includes('sell') || planLowerCase.includes('short') || planLowerCase.includes('bearish')) {
        traderSentiment = 'BEARISH';
      }

      // Decision logic based on risk assessment and trader sentiment
      if (riskLevel === 'HIGH' || riskScore > 0.8) {
        return 'HOLD - High risk detected, avoiding exposure until conditions improve';
      }

      if (confidence < 0.3) {
        return 'HOLD - Insufficient confidence in analysis, requiring additional data';
      }

      // Apply trader sentiment with risk-adjusted position sizing
      if (traderSentiment === 'BULLISH' && riskLevel === 'LOW') {
        return 'BUY - Strong bullish signal with acceptable risk profile';
      } else if (traderSentiment === 'BULLISH' && riskLevel === 'MEDIUM') {
        return 'BUY_SMALL - Bullish signal but reducing position size due to moderate risk';
      } else if (traderSentiment === 'BEARISH' && riskLevel === 'LOW') {
        return 'SELL - Bearish signal with low risk environment for short position';
      } else if (traderSentiment === 'BEARISH' && riskLevel === 'MEDIUM') {
        return 'SELL_SMALL - Bearish signal but reducing position size due to moderate risk';
      }

      // Default to hold for unclear signals
      return 'HOLD - Mixed signals or insufficient conviction for directional trade';
    } catch (error) {
      return 'HOLD - Error in decision logic, defaulting to conservative stance';
    }
  }

  /**
   * Assess market-related risks from market report
   * TODO: Implement technical indicator-based risk scoring
   */
  private assessMarketRisk(marketReport: string): { score: number; factors: string[] } {
    if (!marketReport) return { score: 0.5, factors: ['No market data available'] };

    const factors: string[] = [];
    let riskScore = 0.3; // Base market risk

    const reportLower = marketReport.toLowerCase();

    // Check for high volatility indicators
    if (reportLower.includes('volatility') || reportLower.includes('volatile')) {
      riskScore += 0.2;
      factors.push('High volatility environment');
    }

    // Check for negative market sentiment
    if (reportLower.includes('decline') || reportLower.includes('drop') || reportLower.includes('fall')) {
      riskScore += 0.15;
      factors.push('Market decline indicators');
    }

    // Check for positive market sentiment
    if (reportLower.includes('rally') || reportLower.includes('surge') || reportLower.includes('gain')) {
      riskScore -= 0.1;
      factors.push('Market rally indicators');
    }

    // Check for uncertainty indicators
    if (reportLower.includes('uncertain') || reportLower.includes('unclear')) {
      riskScore += 0.1;
      factors.push('Market uncertainty');
    }

    return { score: Math.max(0, Math.min(1, riskScore)), factors };
  }

  /**
   * Assess sentiment-related risks
   * TODO: Implement NLP-based sentiment scoring
   */
  private assessSentimentRisk(sentimentReport: string): { score: number; factors: string[] } {
    if (!sentimentReport) return { score: 0.5, factors: ['No sentiment data available'] };

    const factors: string[] = [];
    let riskScore = 0.3;

    const reportLower = sentimentReport.toLowerCase();

    // Check for extreme sentiment
    if (reportLower.includes('extremely') || reportLower.includes('panic') || reportLower.includes('euphoria')) {
      riskScore += 0.3;
      factors.push('Extreme sentiment detected');
    }

    // Check for negative sentiment
    if (reportLower.includes('negative') || reportLower.includes('bearish') || reportLower.includes('pessimistic')) {
      riskScore += 0.15;
      factors.push('Negative market sentiment');
    }

    // Check for positive sentiment
    if (reportLower.includes('positive') || reportLower.includes('bullish') || reportLower.includes('optimistic')) {
      riskScore -= 0.1;
      factors.push('Positive market sentiment');
    }

    return { score: Math.max(0, Math.min(1, riskScore)), factors };
  }

  /**
   * Assess news-related risks
   * TODO: Implement real-time news impact scoring
   */
  private assessNewsRisk(newsReport: string): { score: number; factors: string[] } {
    if (!newsReport) return { score: 0.4, factors: ['No news data available'] };

    const factors: string[] = [];
    let riskScore = 0.3;

    const reportLower = newsReport.toLowerCase();

    // Check for regulatory risks
    if (reportLower.includes('regulation') || reportLower.includes('lawsuit') || reportLower.includes('investigation')) {
      riskScore += 0.25;
      factors.push('Regulatory or legal risks');
    }

    // Check for operational risks
    if (reportLower.includes('breach') || reportLower.includes('hack') || reportLower.includes('scandal')) {
      riskScore += 0.3;
      factors.push('Operational risk events');
    }

    // Check for positive news
    if (reportLower.includes('approval') || reportLower.includes('partnership') || reportLower.includes('growth')) {
      riskScore -= 0.15;
      factors.push('Positive news developments');
    }

    return { score: Math.max(0, Math.min(1, riskScore)), factors };
  }

  /**
   * Assess fundamental analysis risks
   * TODO: Implement quantitative fundamental risk models
   */
  private assessFundamentalRisk(fundamentalsReport: string): { score: number; factors: string[] } {
    if (!fundamentalsReport) return { score: 0.5, factors: ['No fundamental data available'] };

    const factors: string[] = [];
    let riskScore = 0.3;

    const reportLower = fundamentalsReport.toLowerCase();

    // Check for valuation risks
    if (reportLower.includes('overvalued') || reportLower.includes('expensive') || reportLower.includes('high pe')) {
      riskScore += 0.2;
      factors.push('Valuation concerns');
    }

    // Check for earnings risks
    if (reportLower.includes('loss') || reportLower.includes('declining') || reportLower.includes('weak earnings')) {
      riskScore += 0.25;
      factors.push('Earnings quality issues');
    }

    // Check for financial strength
    if (reportLower.includes('strong balance sheet') || reportLower.includes('profitable') || reportLower.includes('growing revenue')) {
      riskScore -= 0.15;
      factors.push('Strong fundamentals');
    }

    return { score: Math.max(0, Math.min(1, riskScore)), factors };
  }

  /**
   * Assess execution-related risks from trader plan
   * TODO: Implement position sizing risk models
   */
  private assessExecutionRisk(traderPlan: string): { score: number; factors: string[] } {
    if (!traderPlan) return { score: 0.6, factors: ['No trading plan available'] };

    const factors: string[] = [];
    let riskScore = 0.2; // Base execution risk

    const planLower = traderPlan.toLowerCase();

    // Check for leverage or margin usage
    if (planLower.includes('leverage') || planLower.includes('margin') || planLower.includes('options')) {
      riskScore += 0.3;
      factors.push('Leveraged or derivative instruments');
    }

    // Check for position sizing
    if (planLower.includes('all in') || planLower.includes('maximum') || planLower.includes('full position')) {
      riskScore += 0.25;
      factors.push('Large position size concentration');
    }

    // Check for risk management
    if (planLower.includes('stop loss') || planLower.includes('risk management') || planLower.includes('position size')) {
      riskScore -= 0.1;
      factors.push('Risk management controls in place');
    }

    return { score: Math.max(0, Math.min(1, riskScore)), factors };
  }

  /**
   * Calculate confidence in risk assessment based on component reliability
   * TODO: Implement Bayesian confidence estimation
   */
  private calculateRiskConfidence(riskComponents: any[]): number {
    if (!riskComponents || riskComponents.length === 0) return 0.1;

    // Calculate confidence based on data availability and factor consistency
    let totalFactors = 0;
    let reliableFactors = 0;

    for (const component of riskComponents) {
      if (component && component.factors) {
        totalFactors += component.factors.length;
        // Consider factors reliable if they provide specific risk indicators
        reliableFactors += component.factors.filter((factor: string) => 
          !factor.includes('No ') && !factor.includes('available')
        ).length;
      }
    }

    // Base confidence on data completeness
    const dataCompleteness = totalFactors > 0 ? reliableFactors / totalFactors : 0;
    
    // Minimum confidence of 0.2, maximum of 0.9
    return Math.max(0.2, Math.min(0.9, 0.3 + (dataCompleteness * 0.6)));
  }

  /**
   * Generate risk-based recommendations
   * TODO: Implement personalized recommendation engine
   */
  private generateRiskRecommendations(riskLevel: string, riskScore: number): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'HIGH' || riskScore > 0.7) {
      recommendations.push('Consider reducing position size or avoiding trade');
      recommendations.push('Wait for risk conditions to improve');
      recommendations.push('Implement strict stop-loss orders if position taken');
    } else if (riskLevel === 'MEDIUM' || riskScore > 0.4) {
      recommendations.push('Use conservative position sizing');
      recommendations.push('Monitor position closely for risk changes');
      recommendations.push('Consider partial profit-taking on favorable moves');
    } else {
      recommendations.push('Normal position sizing appropriate');
      recommendations.push('Standard risk management protocols');
      recommendations.push('Monitor for risk escalation signals');
    }

    return recommendations;
  }
}