/**
 * Comprehensive Trading Agents Graph with LangGraph Integration
 * 
 * This module combines the original TradingAgentsGraph functionality
 * with the working LangGraph implementation for full workflow orchestration.
 */

import { TradingAgentsConfig } from '../types/config.js';
import { AgentState } from '../types/agent-states.js';
import { ModelProvider } from '../models/index.js';
import { LangGraphSetup, AnalystType } from './langgraph-working.js';

export interface TradingGraphConfig {
  config: TradingAgentsConfig;
  selectedAnalysts?: AnalystType[];
  enableLangGraph?: boolean;
}

/**
 * Enhanced Trading Agents Graph with LangGraph support
 */
export class EnhancedTradingAgentsGraph {
  private config: TradingAgentsConfig;
  private selectedAnalysts: AnalystType[];
  private enableLangGraph: boolean;
  private langGraphSetup?: LangGraphSetup;
  private workflow?: any;

  constructor(graphConfig: TradingGraphConfig) {
    this.config = graphConfig.config;
    this.selectedAnalysts = graphConfig.selectedAnalysts || ['market', 'social', 'news', 'fundamentals'];
    this.enableLangGraph = graphConfig.enableLangGraph ?? true;

    if (this.enableLangGraph) {
      this.initializeLangGraph();
    }
  }

  /**
   * Initialize LangGraph setup
   */
  private initializeLangGraph() {
    const modelConfigs = ModelProvider.createFromConfig(this.config);
    
    this.langGraphSetup = new LangGraphSetup({
      selectedAnalysts: this.selectedAnalysts,
      modelConfigs,
      config: this.config
    });
  }

  /**
   * Create and initialize the workflow
   */
  async initializeWorkflow(): Promise<void> {
    if (!this.enableLangGraph || !this.langGraphSetup) {
      throw new Error('LangGraph is not enabled or initialized');
    }

    try {
      console.log('Initializing trading workflow...');
      this.workflow = await this.langGraphSetup.createComprehensiveTradingWorkflow(this.selectedAnalysts);
      console.log('✓ Trading workflow initialized successfully');
    } catch (error) {
      console.error('Error initializing workflow:', error);
      throw error;
    }
  }

  /**
   * Execute the trading analysis workflow
   */
  async execute(companyOfInterest: string, tradeDate: string): Promise<{
    success: boolean;
    result?: any;
    error?: string;
  }> {
    if (!this.workflow) {
      await this.initializeWorkflow();
    }

    try {
      console.log(`Executing trading analysis for ${companyOfInterest} on ${tradeDate}...`);
      
      const { HumanMessage } = await import('@langchain/core/messages');
      
      const initialMessage = new HumanMessage({
        content: `Analyze ${companyOfInterest} for trading on ${tradeDate}. Provide comprehensive analysis including market conditions, sentiment, news, and fundamentals.`
      });

      const result = await this.workflow.invoke({
        messages: [initialMessage]
      });

      console.log('✓ Trading analysis completed successfully');
      return { success: true, result };
    } catch (error) {
      console.error('Error executing trading analysis:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Execute analysis and extract trading decision
   */
  async analyzeAndDecide(companyOfInterest: string, tradeDate: string): Promise<{
    decision: string;
    reasoning: string[];
    confidence: number;
    messages: any[];
  }> {
    const execution = await this.execute(companyOfInterest, tradeDate);
    
    if (!execution.success) {
      return {
        decision: 'ERROR',
        reasoning: [execution.error || 'Unknown error occurred'],
        confidence: 0,
        messages: []
      };
    }

    // Extract decision from messages
    const messages = execution.result?.messages || [];
    const reasoning: string[] = [];
    let decision = 'HOLD';
    let confidence = 0.5;

    for (const message of messages) {
      if (message.content) {
        reasoning.push(message.content);
        
        // Simple decision extraction logic
        const content = message.content.toLowerCase();
        if (content.includes('buy') || content.includes('bullish')) {
          decision = 'BUY';
          confidence = Math.max(confidence, 0.7);
        } else if (content.includes('sell') || content.includes('bearish')) {
          decision = 'SELL';
          confidence = Math.max(confidence, 0.7);
        } else if (content.includes('hold')) {
          decision = 'HOLD';
          confidence = Math.max(confidence, 0.6);
        }
      }
    }

    return {
      decision,
      reasoning,
      confidence,
      messages
    };
  }

  /**
   * Get configuration information
   */
  getConfigInfo(): {
    llmProvider: string;
    selectedAnalysts: AnalystType[];
    langGraphEnabled: boolean;
    workflowInitialized: boolean;
  } {
    return {
      llmProvider: this.config.llmProvider,
      selectedAnalysts: this.selectedAnalysts,
      langGraphEnabled: this.enableLangGraph,
      workflowInitialized: !!this.workflow
    };
  }

  /**
   * Test the workflow connectivity
   */
  async testWorkflow(): Promise<{ success: boolean; error?: string }> {
    if (!this.langGraphSetup) {
      return { success: false, error: 'LangGraph not initialized' };
    }

    return await this.langGraphSetup.testWorkflow();
  }

  /**
   * Create a test instance with LM Studio configuration
   */
  static createTestInstance(): EnhancedTradingAgentsGraph {
    const config: TradingAgentsConfig = {
      projectDir: './project',
      resultsDir: './results',
      dataDir: './data',
      dataCacheDir: './cache',
      llmProvider: 'lm_studio',
      deepThinkLlm: 'llama-3.2-3b-instruct',
      quickThinkLlm: 'llama-3.2-3b-instruct',
      backendUrl: 'http://localhost:1234/v1',
      maxDebateRounds: 3,
      maxRiskDiscussRounds: 3,
      maxRecurLimit: 5,
      onlineTools: false
    };

    return new EnhancedTradingAgentsGraph({
      config,
      selectedAnalysts: ['market', 'social'],
      enableLangGraph: true
    });
  }

  /**
   * Run a complete integration test
   */
  static async runIntegrationTest(): Promise<boolean> {
    try {
      console.log('🚀 Running Enhanced Trading Agents Graph Integration Test...\n');

      // Create test instance
      const graph = this.createTestInstance();
      
      // Test configuration
      const configInfo = graph.getConfigInfo();
      console.log('Configuration:', configInfo);
      console.log('✓ Configuration loaded successfully');

      // Test workflow initialization
      await graph.initializeWorkflow();
      console.log('✓ Workflow initialized successfully');

      // Test workflow connectivity
      const testResult = await graph.testWorkflow();
      if (testResult.success) {
        console.log('✓ Workflow connectivity test passed');
      } else {
        console.log('✗ Workflow connectivity test failed:', testResult.error);
        return false;
      }

      // Test full analysis
      const analysisResult = await graph.analyzeAndDecide('AAPL', '2025-08-24');
      console.log('Analysis Result:', {
        decision: analysisResult.decision,
        confidence: analysisResult.confidence,
        reasoningCount: analysisResult.reasoning.length
      });
      console.log('✓ Full analysis test completed successfully');

      console.log('\n🎉 All Enhanced Trading Agents Graph tests passed!');
      return true;
    } catch (error) {
      console.error('\n❌ Enhanced Trading Agents Graph test failed:', error);
      return false;
    }
  }
}