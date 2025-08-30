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
  private quickThinkingModel: BaseChatModel;
  private deepThinkingModel: BaseChatModel;
  private conditionalLogic: ConditionalLogic;
  private config: TradingAgentsConfig;

  constructor(setupConfig: GraphSetupConfig) {
    this.quickThinkingModel = ModelProvider.createModel(setupConfig.modelConfigs.quickThinking);
    this.deepThinkingModel = ModelProvider.createModel(setupConfig.modelConfigs.deepThinking);
    this.conditionalLogic = new ConditionalLogic();
    this.config = setupConfig.config;
  }

  /**
   * Set up and compile the agent workflow graph
   */
  setupGraph(selectedAnalysts: AnalystType[] = ['market', 'social', 'news', 'fundamentals']) {
    if (selectedAnalysts.length === 0) {
      throw new Error('Trading Agents Graph Setup Error: no analysts selected!');
    }

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
      const marketAnalyst = new MarketAnalyst(this.quickThinkingModel, []);
      workflow.addNode('MarketAnalyst', async (state: typeof TradingAgentState.State) => {
        const result = await marketAnalyst.process(state as AgentState);
        return result;
      });
      workflow.addNode('ClearMarketMessages', this.createMessageClear());
    }

    if (selectedAnalysts.includes('social')) {
      const socialAnalyst = new SocialAnalyst(this.quickThinkingModel, []);
      workflow.addNode('SocialAnalyst', async (state: typeof TradingAgentState.State) => {
        const result = await socialAnalyst.process(state as AgentState);
        return result;
      });
      workflow.addNode('ClearSocialMessages', this.createMessageClear());
    }

    if (selectedAnalysts.includes('news')) {
      const newsAnalyst = new NewsAnalyst(this.quickThinkingModel, []);
      workflow.addNode('NewsAnalyst', async (state: typeof TradingAgentState.State) => {
        const result = await newsAnalyst.process(state as AgentState);
        return result;
      });
      workflow.addNode('ClearNewsMessages', this.createMessageClear());
    }

    if (selectedAnalysts.includes('fundamentals')) {
      const fundamentalsAnalyst = new FundamentalsAnalyst(this.quickThinkingModel, []);
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
    const bullResearcher = new BullResearcher(this.quickThinkingModel, []);
    const bearResearcher = new BearResearcher(this.quickThinkingModel, []);
    const researchManager = new ResearchManager(this.deepThinkingModel, []);

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

    const trader = new Trader(this.quickThinkingModel, []);
    workflow.addNode('Trader', async (state: typeof TradingAgentState.State) => {
      const result = await trader.process(state as AgentState);
      return result;
    });
  }

  /**
   * Add risk analysis nodes to the workflow
   */
  private addRiskAnalysisNodes(workflow: StateGraph<typeof TradingAgentState>) {
    const riskyAnalyst = new RiskyAnalyst(this.quickThinkingModel, []);
    const neutralAnalyst = new NeutralAnalyst(this.quickThinkingModel, []);
    const safeAnalyst = new SafeAnalyst(this.quickThinkingModel, []);

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

    // Note: RiskManager is not exported from the agents module, so we'll create a placeholder
    workflow.addNode('RiskJudge', async (state: typeof TradingAgentState.State) => {
      // Placeholder for risk manager - implement when RiskManager is available
      return { ...state, finalTradeDecision: 'HOLD - Risk analysis complete' };
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
}