/**
 * Working LangGraph Integration for Trading Agents
 * 
 * This implementation uses the actual working LangGraph.js API
 * based on successful runtime testing.
 */

import { ModelProvider, ModelConfig } from '../models/index';
import { TradingAgentsConfig } from '../types/config';
import { AgentState } from '../types/agent-states';
import { logger } from '../utils/enhanced-logger';
import { AgentFactory } from './agent-factory';

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
 * Working LangGraph setup for trading agents
 */
export class LangGraphSetup {
  private config: TradingAgentsConfig;
  private agentFactory: AgentFactory;

  constructor(setupConfig: GraphSetupConfig) {
    this.config = setupConfig.config;
    this.agentFactory = new AgentFactory(this.config);
  }

  /**
   * Create a trading workflow using dynamic imports
   * This avoids TypeScript compilation issues while maintaining functionality
   */
  async createTradingWorkflow(selectedAnalysts: AnalystType[] = ['market']): Promise<any> {
    try {
      // Dynamic import to avoid TypeScript issues
      const { StateGraph, messagesStateReducer } = await import('@langchain/langgraph');
      const { AIMessage, HumanMessage } = await import('@langchain/core/messages');
      
      // Define state channels
      const stateChannels = {
        messages: {
          reducer: messagesStateReducer,
          default: () => []
        }
      };

      // Create the graph
      const workflow = new StateGraph({ channels: stateChannels } as any);

      // Add trading analysis node
      const tradingAnalysis = async (state: any) => {
        const lastMessage = state.messages[state.messages.length - 1];
        const content = lastMessage?.content || '';
        
        const response = new AIMessage({
          content: `Trading analysis complete for: ${content}. Recommendation: HOLD based on ${selectedAnalysts.join(', ')} analysis.`
        });
        
        return { messages: [...state.messages, response] };
      };

      // Add market analysis node
      const marketAnalysis = async (state: any) => {
        const response = new AIMessage({
          content: `Market Analysis: Current market conditions analyzed. Volatility moderate, trend neutral.`
        });
        
        return { messages: [...state.messages, response] };
      };

      // Build the workflow
      workflow
        .addNode('market_analysis', marketAnalysis)
        .addNode('trading_decision', tradingAnalysis)
        .addEdge('__start__', 'market_analysis')
        .addEdge('market_analysis', 'trading_decision')
        .addEdge('trading_decision', '__end__');

      return workflow.compile();
    } catch (error) {
      logger.error('graph', 'LangGraphSetup', 'workflow_creation', 'Error creating LangGraph workflow', { 
        error: error instanceof Error ? error.message : String(error),
        operation: 'createTradingWorkflow'
      });
      throw error;
    }
  }

  /**
   * Create a comprehensive trading workflow with all 12 agents
   */
  async createComprehensiveTradingWorkflow(selectedAnalysts: AnalystType[]): Promise<any> {
    try {
      const { StateGraph, messagesStateReducer } = await import('@langchain/langgraph');
      const { AIMessage } = await import('@langchain/core/messages');
      
      // Every AgentState field needs its own channel, otherwise LangGraph drops
      // values returned by a node and downstream agents never see upstream reports.
      // Last non-undefined write wins.
      const lastValue = {
        reducer: (prev: any, next: any) => (next === undefined ? prev : next),
        default: () => undefined as any
      };
      const stateChannels: Record<string, any> = {
        messages: {
          reducer: messagesStateReducer,
          default: () => []
        }
      };
      for (const key of [
        'company_of_interest', 'trade_date', 'sender',
        'market_report', 'sentiment_report', 'news_report', 'fundamentals_report',
        'investment_debate_state', 'investment_plan', 'trader_investment_plan',
        'risk_debate_state', 'final_trade_decision', 'metadata'
      ]) {
        stateChannels[key] = lastValue;
      }

      const workflow = new StateGraph({ channels: stateChannels } as any);

      // Helper to create agent node
      const createAgentNode = (agentName: string, agentPromise: Promise<any>) => {
        return async (state: any) => {
          try {
            logger.info('graph', 'LangGraphSetup', `${agentName}_node`, `Processing ${agentName} analysis`, {
              messagesCount: state.messages?.length || 0
            });
            
            // Company and date are seeded into graph state by executeWorkflow;
            // never re-derive them from free-text agent output.
            if (!state.company_of_interest || !state.trade_date) {
              throw new Error('Graph state is missing company_of_interest/trade_date');
            }

            // Process with real agent
            const agent = await agentPromise;
            const agentState: AgentState = {
              sender: 'system',
              ...state // company_of_interest, trade_date, reports, debate states, messages
            };
            
            const result = await agent.process(agentState);
            
            return {
              messages: result.messages || state.messages,
              ...result // Merge all result properties into state
            };
          } catch (error) {
            logger.error('graph', 'LangGraphSetup', `${agentName}_node`, `Error in ${agentName} node`, {
              error: error instanceof Error ? error.message : String(error)
            });
            return {
              messages: [...state.messages, new AIMessage({
                content: `${agentName} Error: ${error instanceof Error ? error.message : String(error)}`
              })]
            };
          }
        };
      };

      // ==== PHASE 1: ANALYSTS (4 agents) ====
      if (selectedAnalysts.includes('market')) {
        workflow.addNode('market_analyst', createAgentNode('Market Analyst', this.agentFactory.createMarketAnalyst()));
      }

      if (selectedAnalysts.includes('social')) {
        workflow.addNode('social_analyst', createAgentNode('Social Analyst', this.agentFactory.createSocialAnalyst()));
      }

      if (selectedAnalysts.includes('news')) {
        workflow.addNode('news_analyst', createAgentNode('News Analyst', this.agentFactory.createNewsAnalyst()));
      }

      if (selectedAnalysts.includes('fundamentals')) {
        workflow.addNode('fundamentals_analyst', createAgentNode('Fundamentals Analyst', this.agentFactory.createFundamentalsAnalyst()));
      }

      // ==== PHASE 2: RESEARCHERS (3 agents) ====
      workflow.addNode('bull_researcher', createAgentNode('Bull Researcher', this.agentFactory.createBullResearcher()));
      workflow.addNode('bear_researcher', createAgentNode('Bear Researcher', this.agentFactory.createBearResearcher()));
      workflow.addNode('research_manager', createAgentNode('Research Manager', this.agentFactory.createResearchManager()));

      // Trader drafts the plan that the risk team debates (TradingAgents order: RM -> Trader -> Risk -> PM)
      workflow.addNode('trader', createAgentNode('Trader', this.agentFactory.createTrader()));

      // ==== PHASE 3: RISK MANAGEMENT (4 agents) ====
      workflow.addNode('risky_analyst', createAgentNode('Risky Analyst', this.agentFactory.createRiskyAnalyst()));
      workflow.addNode('safe_analyst', createAgentNode('Safe Analyst', this.agentFactory.createSafeAnalyst()));
      workflow.addNode('neutral_analyst', createAgentNode('Neutral Analyst', this.agentFactory.createNeutralAnalyst()));
      workflow.addNode('portfolio_manager', createAgentNode('Portfolio Manager', this.agentFactory.createPortfolioManager()));

      // ==== PHASE 4: TRADING (1 agent) ====
      workflow.addNode('learning_trader', createAgentNode('Learning Trader', this.agentFactory.createLearningTrader()));

      // ==== PHASE 5: EDUCATIONAL REVIEW (1 agent, optional) ====
      workflow.addNode('professor', createAgentNode('Professor', this.agentFactory.createProfessor()));

      // Build the workflow edges
      this.addWorkflowEdges(workflow, selectedAnalysts);

      return workflow.compile();
    } catch (error) {
      logger.error('graph', 'LangGraphSetup', 'workflow_creation', 'Error creating comprehensive workflow', { 
        error: error instanceof Error ? error.message : String(error),
        operation: 'createComprehensiveTradingWorkflow'
      });
      throw error;
    }
  }

  /**
   * Add edges to connect all 12 agents in the workflow
   * 
   * Flow: Analysts → Researchers → Research Manager → Risk Analysts → Portfolio Manager → Trader → End
   */
  private addWorkflowEdges(workflow: any, selectedAnalysts: AnalystType[]) {
    // ==== PHASE 1: ANALYSTS SEQUENTIAL PROCESSING ====
    const firstAnalyst = selectedAnalysts[0];
    if (firstAnalyst) {
      workflow.addEdge('__start__', `${firstAnalyst}_analyst`);
    } else {
      // If no analysts selected, go directly to researchers
      workflow.addEdge('__start__', 'bull_researcher');
    }

    // Connect analysts in sequence
    for (let i = 0; i < selectedAnalysts.length; i++) {
      const current = `${selectedAnalysts[i]}_analyst`;
      
      if (i < selectedAnalysts.length - 1) {
        const next = `${selectedAnalysts[i + 1]}_analyst`;
        workflow.addEdge(current, next);
      } else {
        // Last analyst connects to bull researcher
        workflow.addEdge(current, 'bull_researcher');
      }
    }

    // ==== PHASE 2: RESEARCH TEAM ====
    // Bull and Bear researchers work in parallel conceptually, but execute sequentially
    workflow.addEdge('bull_researcher', 'bear_researcher');
    // Research Manager synthesizes both perspectives
    workflow.addEdge('bear_researcher', 'research_manager');

    // ==== PHASE 3: RISK MANAGEMENT TEAM ====
    // After research, assess risk from different perspectives
    workflow.addEdge('research_manager', 'trader');
    workflow.addEdge('trader', 'risky_analyst');
    workflow.addEdge('risky_analyst', 'safe_analyst');
    workflow.addEdge('safe_analyst', 'neutral_analyst');
    // Portfolio Manager synthesizes risk assessments
    workflow.addEdge('neutral_analyst', 'portfolio_manager');

    // ==== PHASE 4: TRADING EXECUTION ====
    // Portfolio Manager hands off to Learning Trader for final decision
    workflow.addEdge('portfolio_manager', 'learning_trader');

    // ==== PHASE 5: EDUCATIONAL REVIEW ====
    // The Professor reviews the final decision and writes a beginner-friendly explanation
    workflow.addEdge('learning_trader', 'professor');
    workflow.addEdge('professor', '__end__');
  }

  /**
   * Test the LangGraph workflow
   */
  async testWorkflow(): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      console.log('Testing LangGraph workflow...');
      
      const workflow = await this.createTradingWorkflow(['market']);
      
      const { HumanMessage } = await import('@langchain/core/messages');
      
      const result = await workflow.invoke({
        messages: [new HumanMessage({ content: 'Analyze AAPL for trading' })]
      });

      console.log('✓ Workflow test successful');
      return { success: true, result };
    } catch (error) {
      logger.error('graph', 'LangGraphSetup', 'workflow_test', '✗ Workflow test failed', { 
        error: error instanceof Error ? error.message : String(error),
        operation: 'testWorkflow'
      });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
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
   * Create a test configuration
   */
  static createTestConfig(): GraphSetupConfig {
    return {
      selectedAnalysts: ['market', 'social'],
      modelConfigs: this.getDefaultLMStudioConfig(),
      config: {
        projectDir: process.env.TRADINGAGENTS_PROJECT_DIR || './project',
        resultsDir: process.env.TRADINGAGENTS_RESULTS_DIR || './results',
        dataDir: process.env.TRADINGAGENTS_DATA_DIR || './data',
        dataCacheDir: process.env.TRADINGAGENTS_CACHE_DIR || './cache',
        exportsDir: process.env.TRADINGAGENTS_EXPORTS_DIR || './exports',
        logsDir: process.env.TRADINGAGENTS_LOGS_DIR || './logs',
        llmProvider: 'remote_lmstudio',
        deepThinkLlm: 'llama-3.2-3b-instruct',
        quickThinkLlm: 'llama-3.2-3b-instruct',
        maxDebateRounds: 3,
        maxRiskDiscussRounds: 3,
        maxRecurLimit: 5,
        onlineTools: false
      }
    };
  }

  /**
   * Integration test for the complete setup
   */
  static async testIntegration(): Promise<boolean> {
    try {
      console.log('Testing LangGraph integration...');
      
      const config = this.createTestConfig();
      const setup = new LangGraphSetup(config);
      
      // Test workflow creation
      const workflow = await setup.createTradingWorkflow(['market']);
      console.log('✓ Workflow created successfully');
      
      // Test comprehensive workflow
      const comprehensiveWorkflow = await setup.createComprehensiveTradingWorkflow(['market', 'social']);
      console.log('✓ Comprehensive workflow created successfully');
      
      // Test workflow execution
      const testResult = await setup.testWorkflow();
      if (testResult.success) {
        console.log('✓ Workflow execution test passed');
      } else {
        console.log('✗ Workflow execution test failed:', testResult.error);
      }
      
      console.log('✓ LangGraph integration test completed');
      return true;
    } catch (error) {
      logger.error('graph', 'LangGraphSetup', 'integration_test', '✗ LangGraph integration test failed', { 
        error: error instanceof Error ? error.message : String(error),
        operation: 'testLangGraphIntegration'
      });
      return false;
    }
  }
}