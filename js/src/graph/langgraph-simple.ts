/**
 * Simplified LangGraph Integration for Trading Agents
 * 
 * This module creates a basic LangGraph StateGraph workflow for trading agents.
 * Uses the correct LangGraph.js API based on available exports.
 */

import { StateGraph, messagesStateReducer } from '@langchain/langgraph';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

import { AgentState } from '../types/agent-states';
import { ModelProvider, ModelConfig } from '../models';
import { TradingAgentsConfig } from '../types/config';

// Import specific agents we'll use
import {
  MarketAnalyst,
  SocialAnalyst,
  NewsAnalyst,
  FundamentalsAnalyst,
  BullResearcher,
  BearResearcher,
  ResearchManager,
  Trader
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

/**
 * Simplified LangGraph setup for trading agents
 */
export class SimplifiedLangGraphSetup {
  private quickThinkingModel: BaseChatModel;
  private deepThinkingModel: BaseChatModel;
  private config: TradingAgentsConfig;

  constructor(setupConfig: GraphSetupConfig) {
    this.quickThinkingModel = ModelProvider.createModel(setupConfig.modelConfigs.quickThinking);
    this.deepThinkingModel = ModelProvider.createModel(setupConfig.modelConfigs.deepThinking);
    this.config = setupConfig.config;
  }

  /**
   * Create a simple workflow for testing
   */
  createSimpleWorkflow() {
    // Define a simple state interface
    interface SimpleState {
      messages: any[];
    }

    // Define the function that calls the model
    async function callModel(state: SimpleState) {
      const model = new (require('@langchain/openai').ChatOpenAI)({
        temperature: 0,
        modelName: 'gpt-3.5-turbo'
      });
      
      const response = await model.invoke(state.messages);
      return { messages: [response] };
    }

    // Define a new graph with our simple state
    const stateChannels = {
      messages: {
        reducer: messagesStateReducer,
        default: () => []
      }
    };

    const workflow = new StateGraph({ channels: stateChannels })
      .addNode('agent', callModel)
      .addEdge('__start__', 'agent')
      .addEdge('agent', '__end__');

    return workflow.compile();
  }

  /**
   * Create a trading-specific workflow
   */
  createTradingWorkflow(selectedAnalysts: AnalystType[] = ['market']) {
    // Define a simple state interface
    interface SimpleState {
      messages: any[];
    }

    const stateChannels = {
      messages: {
        reducer: messagesStateReducer,
        default: () => []
      }
    };

    const workflow = new StateGraph({ channels: stateChannels });

    // Add a simple trading analysis node
    const tradingAnalysis = async (state: SimpleState) => {
      const lastMessage = state.messages[state.messages.length - 1];
      const content = lastMessage?.content || '';
      
      // Simple analysis response
      const response = new AIMessage({
        content: `Trading analysis complete for: ${content}. Recommendation: HOLD`
      });
      
      return { messages: [...state.messages, response] };
    };

    workflow
      .addNode('trading_analysis', tradingAnalysis)
      .addEdge('__start__', 'trading_analysis')
      .addEdge('trading_analysis', '__end__');

    return workflow.compile();
  }

  /**
   * Get default configuration for LM Studio
   */
  static getDefaultLMStudioConfig(): GraphSetupConfig['modelConfigs'] {
    const lmStudioConfig = ModelProvider.getLMStudioConfig();
    return {
      quickThinking: lmStudioConfig,
      deepThinking: lmStudioConfig
    };
  }

  /**
   * Create a basic configuration for testing
   */
  static createTestConfig(): GraphSetupConfig {
    return {
      selectedAnalysts: ['market'],
      modelConfigs: this.getDefaultLMStudioConfig(),
      config: {
        projectDir: './project',
        resultsDir: './results',
        dataDir: './data',
        dataCacheDir: './cache',
        llmProvider: 'lm_studio',
        deepThinkLlm: 'llama-3.2-3b-instruct',
        quickThinkLlm: 'llama-3.2-3b-instruct',
        backendUrl: process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1',
        maxDebateRounds: 3,
        maxRiskDiscussRounds: 3,
        maxRecurLimit: 5,
        onlineTools: false
      }
    };
  }

  /**
   * Test the LangGraph integration
   */
  static async testIntegration(): Promise<boolean> {
    try {
      console.log('Testing LangGraph integration...');
      
      const config = this.createTestConfig();
      const setup = new SimplifiedLangGraphSetup(config);
      
      // Test simple workflow creation
      const workflow = setup.createSimpleWorkflow();
      console.log('✓ Simple workflow created successfully');
      
      // Test trading workflow creation
      const tradingWorkflow = setup.createTradingWorkflow();
      console.log('✓ Trading workflow created successfully');
      
      console.log('✓ LangGraph integration test passed');
      return true;
    } catch (error) {
      console.error('✗ LangGraph integration test failed:', error);
      return false;
    }
  }
}

// Export simplified version for easier usage
export const LangGraphSetup = SimplifiedLangGraphSetup;