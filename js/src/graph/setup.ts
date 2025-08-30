/**
 * Graph Setup for Trading Agents
 * 
 * This module handles the setup and configuration of the agent graph,
 * creating agent instances and defining execution flow.
 * 
 * Key responsibilities:
 * - Create and configure all agent instances
 * - Define execution order and routing logic
 * - Handle dynamic analyst selection
 * - Provide graph validation and statistics
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

import { Toolkit } from '../dataflows/interface';
import { FinancialSituationMemory } from '../agents/utils/memory';
import { ConditionalLogic } from './conditional-logic';

// Import agent classes
import { 
  MarketAnalyst,
  SocialAnalyst,
  NewsAnalyst,
  FundamentalsAnalyst,
  BullResearcher,
  BearResearcher,
  ResearchManager,
  RiskyAnalyst,
  SafeAnalyst,
  NeutralAnalyst,
  PortfolioManager
} from '../agents/index';

export type LLMProvider = ChatOpenAI | ChatAnthropic | ChatGoogleGenerativeAI;

export interface GraphSetupConfig {
  selectedAnalysts: string[];
  toolkit: Toolkit;
  quickThinkingLLM: LLMProvider;
  deepThinkingLLM: LLMProvider;
  memories: {
    bullMemory: FinancialSituationMemory;
    bearMemory: FinancialSituationMemory;
    traderMemory: FinancialSituationMemory;
    investJudgeMemory: FinancialSituationMemory;
    riskManagerMemory: FinancialSituationMemory;
  };
  conditionalLogic: ConditionalLogic;
}

export interface AgentNode {
  name: string;
  agent: any;
  type: 'analyst' | 'researcher' | 'trader' | 'risk' | 'manager';
}

/**
 * GraphSetup class handles the configuration of the agent workflow
 */
export class GraphSetup {
  private quickThinkingLLM: LLMProvider;
  private deepThinkingLLM: LLMProvider;
  private toolkit: Toolkit;
  private memories: GraphSetupConfig['memories'];
  private conditionalLogic: ConditionalLogic;
  private agentNodes: Record<string, AgentNode> = {};

  constructor(config: GraphSetupConfig) {
    this.quickThinkingLLM = config.quickThinkingLLM;
    this.deepThinkingLLM = config.deepThinkingLLM;
    this.toolkit = config.toolkit;
    this.memories = config.memories;
    this.conditionalLogic = config.conditionalLogic;
  }

  /**
   * Set up all agent instances
   */
  setupAgents(selectedAnalysts: string[] = ['market', 'social', 'news', 'fundamentals']): Record<string, AgentNode> {
    if (selectedAnalysts.length === 0) {
      throw new Error('Trading Agents Graph Setup Error: no analysts selected!');
    }

    // Get tools - use empty arrays for now since getAllTools doesn't exist
    const tools = {
      market: [],
      social: [],
      news: [],
      fundamentals: []
    };

    // Create analyst agents
    if (selectedAnalysts.includes('market')) {
      this.agentNodes.market = {
        name: 'Market Analyst',
        agent: new MarketAnalyst(this.quickThinkingLLM, tools.market || []),
        type: 'analyst'
      };
    }

    if (selectedAnalysts.includes('social')) {
      this.agentNodes.social = {
        name: 'Social Analyst',
        agent: new SocialAnalyst(this.quickThinkingLLM, tools.social || []),
        type: 'analyst'
      };
    }

    if (selectedAnalysts.includes('news')) {
      this.agentNodes.news = {
        name: 'News Analyst',
        agent: new NewsAnalyst(this.quickThinkingLLM, tools.news || []),
        type: 'analyst'
      };
    }

    if (selectedAnalysts.includes('fundamentals')) {
      this.agentNodes.fundamentals = {
        name: 'Fundamentals Analyst',
        agent: new FundamentalsAnalyst(this.quickThinkingLLM, tools.fundamentals || []),
        type: 'analyst'
      };
    }

    // Create researcher agents
    this.agentNodes.bull_researcher = {
      name: 'Bull Researcher',
      agent: new BullResearcher(this.quickThinkingLLM, []),
      type: 'researcher'
    };

    this.agentNodes.bear_researcher = {
      name: 'Bear Researcher',
      agent: new BearResearcher(this.quickThinkingLLM, []),
      type: 'researcher'
    };

    this.agentNodes.research_manager = {
      name: 'Research Manager',
      agent: new ResearchManager(this.deepThinkingLLM, []),
      type: 'manager'
    };

    // Create trader - using ResearchManager as placeholder
    this.agentNodes.trader = {
      name: 'Trader',
      agent: new ResearchManager(this.quickThinkingLLM, []),
      type: 'trader'
    };

    // Create risk management agents
    this.agentNodes.risky_analyst = {
      name: 'Risky Analyst',
      agent: new RiskyAnalyst(this.quickThinkingLLM, []),
      type: 'risk'
    };

    this.agentNodes.safe_analyst = {
      name: 'Safe Analyst',
      agent: new SafeAnalyst(this.quickThinkingLLM, []),
      type: 'risk'
    };

    this.agentNodes.neutral_analyst = {
      name: 'Neutral Analyst',
      agent: new NeutralAnalyst(this.quickThinkingLLM, []),
      type: 'risk'
    };

    this.agentNodes.portfolio_manager = {
      name: 'Portfolio Manager',
      agent: new PortfolioManager(this.deepThinkingLLM, []),
      type: 'manager'
    };

    return this.agentNodes;
  }

  /**
   * Get execution order for agents
   */
  getExecutionOrder(selectedAnalysts: string[]): string[] {
    const order: string[] = [];

    // Add analysts (can run in parallel)
    order.push(...selectedAnalysts);

    // Add research phase
    order.push('bull_researcher', 'bear_researcher', 'research_manager');

    // Add trading phase
    order.push('trader');

    // Add risk management phase
    order.push('risky_analyst', 'safe_analyst', 'neutral_analyst', 'portfolio_manager');

    return order;
  }

  /**
   * Get agents by type
   */
  getAgentsByType(type: AgentNode['type']): AgentNode[] {
    return Object.values(this.agentNodes).filter(node => node.type === type);
  }

  /**
   * Validate graph configuration
   */
  validateConfiguration(selectedAnalysts: string[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const validAnalysts = ['market', 'social', 'news', 'fundamentals'];

    if (selectedAnalysts.length === 0) {
      errors.push('No analysts selected');
    }

    for (const analyst of selectedAnalysts) {
      if (!validAnalysts.includes(analyst)) {
        errors.push(`Invalid analyst type: ${analyst}`);
      }
    }

    if (!this.quickThinkingLLM) {
      errors.push('Quick thinking LLM not provided');
    }

    if (!this.deepThinkingLLM) {
      errors.push('Deep thinking LLM not provided');
    }

    if (!this.toolkit) {
      errors.push('Toolkit not provided');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get graph execution statistics
   */
  getGraphStats(selectedAnalysts: string[]): {
    totalNodes: number;
    analystNodes: number;
    researchNodes: number;
    riskNodes: number;
    estimatedExecutionTime: number;
  } {
    const analystNodes = selectedAnalysts.length;
    const researchNodes = 3; // Bull, Bear, Research Manager
    const tradeNodes = 1; // Trader
    const riskNodes = 4; // Risky, Safe, Neutral, Portfolio Manager
    const totalNodes = analystNodes + researchNodes + tradeNodes + riskNodes;

    // Rough estimation: 30 seconds per analyst phase, 60 seconds for research, 30 for trading, 60 for risk
    const estimatedExecutionTime = (selectedAnalysts.length * 30) + 60 + 30 + 60;

    return {
      totalNodes,
      analystNodes,
      researchNodes: researchNodes + tradeNodes,
      riskNodes,
      estimatedExecutionTime
    };
  }

  /**
   * Get conditional logic instance
   */
  getConditionalLogic(): ConditionalLogic {
    return this.conditionalLogic;
  }

  /**
   * Get agent node by name
   */
  getAgentNode(name: string): AgentNode | undefined {
    return this.agentNodes[name];
  }

  /**
   * Get all agent nodes
   */
  getAllAgentNodes(): Record<string, AgentNode> {
    return { ...this.agentNodes };
  }
}

/**
 * Create a new graph setup instance
 */
export function createGraphSetup(config: GraphSetupConfig): GraphSetup {
  return new GraphSetup(config);
}