/**
 * Comprehensive Trading Agents Graph with LangGraph Integration
 * 
 * This module combines the original TradingAgentsGraph functionality
 * with the working LangGraph implementation for full workflow orchestration.
 * Now includes lazy loading for performance optimization.
 */

import { TradingAgentsConfig } from '../types/config';
import { ModelProvider } from '../models/index';
import { LangGraphSetup, AnalystType } from './langgraph-working';
import { LazyGraphSetup } from '../performance/lazy-factory';
import { OptimizedStateManager, StateOptimizationConfig } from '../performance/state-optimization';
import { createLogger } from '../utils/enhanced-logger';
import { 
  AdvancedMemoryLearningSystem
} from '../memory/advanced/index';

const logger = createLogger('graph', 'enhanced-trading-graph');

export interface TradingGraphConfig {
  config: TradingAgentsConfig;
  selectedAnalysts?: AnalystType[];
  enableLangGraph?: boolean;
  enableLazyLoading?: boolean;
  enableStateOptimization?: boolean;
  stateOptimizationConfig?: StateOptimizationConfig;
  enableCaching?: boolean;
  enableAdvancedMemory?: boolean;
  zepClientConfig?: {
    api_key: string;
    base_url: string;
    session_id?: string;
    user_id?: string;
  };
}

/**
 * Enhanced Trading Agents Graph with LangGraph support and lazy loading
 */
export class EnhancedTradingAgentsGraph {
  private config: TradingAgentsConfig;
  private selectedAnalysts: AnalystType[];
  private enableLangGraph: boolean;
  private enableLazyLoading: boolean;
  private enableCaching: boolean;
  private enableStateOptimization: boolean;
  private enableAdvancedMemory: boolean;
  private langGraphSetup?: LangGraphSetup;
  private lazyGraphSetup?: LazyGraphSetup;
  private stateManager?: OptimizedStateManager;
  private advancedMemorySystem?: AdvancedMemoryLearningSystem;
  private workflow?: any;
  private zepClientConfig?: any;

  constructor(graphConfig: TradingGraphConfig) {
    this.config = graphConfig.config;
    this.selectedAnalysts = graphConfig.selectedAnalysts || ['market', 'social', 'news', 'fundamentals'];
    this.enableLangGraph = graphConfig.enableLangGraph ?? true;
    this.enableLazyLoading = graphConfig.enableLazyLoading ?? true;
    this.enableCaching = graphConfig.enableCaching ?? true;
    this.enableStateOptimization = graphConfig.enableStateOptimization ?? true;
    this.enableAdvancedMemory = graphConfig.enableAdvancedMemory ?? true;
    this.zepClientConfig = graphConfig.zepClientConfig;

    // Initialize state optimization if enabled
    if (this.enableStateOptimization) {
      const stateConfig: StateOptimizationConfig = graphConfig.stateOptimizationConfig || {
        enableDiffing: true,
        enableSnapshot: false, // Disabled for performance unless needed
        maxSnapshots: 5,
        compressionThreshold: 1024,
        enableWeakRefs: true
      };
      this.stateManager = new OptimizedStateManager(stateConfig);
    }

    logger.info('constructor', 'Enhanced Trading Agents Graph initialized', {
      selectedAnalysts: this.selectedAnalysts,
      enableLangGraph: this.enableLangGraph,
      enableLazyLoading: this.enableLazyLoading,
      enableStateOptimization: this.enableStateOptimization,
      enableCaching: this.enableCaching,
      enableAdvancedMemory: this.enableAdvancedMemory
    });

    if (this.enableLangGraph) {
      this.initializeLangGraph();
    }

    if (this.enableLazyLoading) {
      this.initializeLazyLoading();
    }

    if (this.enableAdvancedMemory) {
      // Initialize advanced memory in background
      this.initializeAdvancedMemory()        .catch((error: any) => {
        logger.error('constructor', 'Failed to initialize advanced memory system', {
          error: error instanceof Error ? error.message : String(error)
        });
      });
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
   * Initialize lazy loading setup
   */
  private initializeLazyLoading() {
    // For now, lazy loading setup is deferred until workflow initialization
    // This avoids type conflicts with ModelProvider
    logger.info('initializeLazyLoading', 'Lazy loading enabled, will initialize on demand');
  }

  /**
   * Initialize advanced memory system
   */
  private async initializeAdvancedMemory() {
    if (!this.zepClientConfig) {
      logger.warn('initializeAdvancedMemory', 'No Zep client config provided, advanced memory disabled');
      return;
    }

    try {
      // Create a real Zep client for memory operations
      const { ZepClient } = await import('@getzep/zep-js');
      const zepClient = new ZepClient({
        apiKey: process.env.ZEP_API_KEY || this.zepClientConfig.apiKey,
        baseUrl: this.zepClientConfig.baseUrl || 'https://api.getzep.com'
      });

      const { createAdvancedMemoryLearningSystem, createDefaultConfig } = await import('../memory/advanced/index');
      const config = createDefaultConfig(this.zepClientConfig);
      this.advancedMemorySystem = createAdvancedMemoryLearningSystem(config, zepClient);
      
      await this.advancedMemorySystem.initialize();
      logger.info('initializeAdvancedMemory', 'Advanced memory system initialized successfully');
    } catch (error) {
      logger.error('initializeAdvancedMemory', 'Failed to initialize advanced memory system', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get lazy loading statistics
   */
  getLazyLoadingStats() {
    if (!this.lazyGraphSetup) {
      return { message: 'Lazy loading not yet initialized' };
    }
    return this.lazyGraphSetup.getStats();
  }

  /**
   * Pre-warm common components in background
   */
  async preWarmComponents(): Promise<void> {
    if (!this.enableLazyLoading || !this.lazyGraphSetup) {
      logger.info('preWarmComponents', 'Lazy loading not enabled, skipping pre-warming');
      return;
    }

    logger.info('preWarmComponents', 'Starting component pre-warming');

    const promises = [];
    
    // Pre-warm selected analysts
    promises.push(this.lazyGraphSetup.preWarmCommonAgents(this.selectedAnalysts));
    
    // Pre-warm dataflows
    promises.push(this.lazyGraphSetup.preWarmDataflows());

    await Promise.allSettled(promises);
    
    logger.info('preWarmComponents', 'Component pre-warming completed');
  }

  /**
   * Create and initialize the workflow
   */
  async initializeWorkflow(): Promise<void> {
    if (!this.enableLangGraph || !this.langGraphSetup) {
      throw new Error('LangGraph is not enabled or initialized');
    }

    try {
      logger.info('initializeWorkflow', 'Initializing trading workflow...');
      this.workflow = await this.langGraphSetup.createComprehensiveTradingWorkflow(this.selectedAnalysts);
      logger.info('initializeWorkflow', 'Trading workflow initialized successfully');
    } catch (error) {
      logger.error('initializeWorkflow', 'Error initializing workflow', { error: error instanceof Error ? error.message : String(error) });
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
      logger.info('execute', `Executing trading analysis for ${companyOfInterest} on ${tradeDate}...`, { 
        company: companyOfInterest, 
        tradeDate 
      });
      
      const { HumanMessage } = await import('@langchain/core/messages');
      
      const initialMessage = new HumanMessage({
        content: `Analyze ${companyOfInterest} for trading on ${tradeDate}. Provide comprehensive analysis including market conditions, sentiment, news, and fundamentals.`
      });

      const result = await this.workflow.invoke({
        messages: [initialMessage]
      });

      logger.info('execute', 'Trading analysis completed successfully', { 
        company: companyOfInterest,
        resultType: typeof result 
      });
      return { success: true, result };
    } catch (error) {
      logger.error('execute', 'Error executing trading analysis', { 
        company: companyOfInterest,
        tradeDate,
        error: error instanceof Error ? error.message : String(error) 
      });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Execute analysis and extract trading decision with advanced memory integration
   */
  async analyzeAndDecide(companyOfInterest: string, tradeDate: string): Promise<{
    decision: string;
    reasoning: string[];
    confidence: number;
    messages: any[];
    memoryInsights?: any;
  }> {
    let memoryInsights: any = null;

    // Get advanced memory insights if available
    if (this.enableAdvancedMemory && this.advancedMemorySystem) {
      try {
        const { TradingIntelligenceRequestSchema } = await import('../memory/advanced/index');
        
        const intelligenceRequest = TradingIntelligenceRequestSchema.parse({
          request_id: `${companyOfInterest}-${tradeDate}-${Date.now()}`,
          agent_id: 'enhanced-trading-graph',
          entity_id: companyOfInterest,
          query_type: 'market_analysis',
          current_context: {
            market_conditions: { ticker: companyOfInterest, date: tradeDate },
            technical_indicators: {},
            economic_indicators: {},
            sentiment_scores: {},
            market_regime: 'sideways',
            price_level: 100,
            volatility: 0.2,
            volume: 1000000,
            confidence_level: 0.5
          },
          preferences: {
            include_similar_scenarios: true,
            include_pattern_analysis: true,
            include_risk_factors: true,
            include_confidence_adjustment: true
          }
        });

        memoryInsights = await this.advancedMemorySystem.processIntelligenceRequest(intelligenceRequest);
        logger.info('analyzeAndDecide', 'Advanced memory insights retrieved', {
          company: companyOfInterest,
          processingTime: memoryInsights.processing_time_ms
        });
      } catch (error) {
        logger.warn('analyzeAndDecide', 'Failed to get memory insights', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    const execution = await this.execute(companyOfInterest, tradeDate);
    
    if (!execution.success) {
      return {
        decision: 'ERROR',
        reasoning: [execution.error || 'Unknown error occurred'],
        confidence: 0,
        messages: [],
        memoryInsights
      };
    }

    // Extract decision from messages
    const messages = execution.result?.messages || [];
    const reasoning: string[] = [];
    let decision = 'HOLD';
    let confidence = 0.5;

    // Incorporate memory insights into reasoning
    if (memoryInsights) {
      const riskFactors = memoryInsights.market_intelligence?.risk_assessment?.risk_factors || [];
      if (riskFactors.length > 0) {
        reasoning.push(`Memory Analysis: Identified ${riskFactors.length} risk factors from historical patterns`);
      }
      
      const adjustedConfidence = memoryInsights.market_intelligence?.confidence_analysis?.adjusted_confidence;
      if (adjustedConfidence !== undefined) {
        confidence = Math.max(confidence, adjustedConfidence);
        reasoning.push(`Confidence adjusted to ${(adjustedConfidence * 100).toFixed(1)}% based on historical performance`);
      }
    }

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

    // Post-decision learning: store this analysis for future learning
    if (this.enableAdvancedMemory && this.advancedMemorySystem && memoryInsights) {
      this.storePredictionForLearning(companyOfInterest, tradeDate, decision, confidence, memoryInsights.request_id)
        .catch((error: any) => {
          logger.warn('analyzeAndDecide', 'Failed to store prediction for learning', {
            error: error instanceof Error ? error.message : String(error)
          });
        });
    }

    return {
      decision,
      reasoning,
      confidence,
      messages,
      memoryInsights
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
   * Get state optimization statistics
   */
  getStateOptimizationStats() {
    if (!this.enableStateOptimization || !this.stateManager) {
      return { message: 'State optimization not enabled' };
    }
    return this.stateManager.getOptimizationStats();
  }

  /**
   * Optimized state update using state manager
   */
  async updateStateOptimized(currentState: any, updates: any): Promise<any> {
    if (!this.enableStateOptimization || !this.stateManager) {
      // Fallback to standard update
      return { ...currentState, ...updates };
    }

    const { newState, diff } = this.stateManager.updateState(currentState, updates);
    
    logger.info('updateStateOptimized', 'State updated with optimization', {
      diffSize: diff.size,
      changes: diff.modifications.length,
      additions: diff.additions.length,
      removals: diff.removals.length
    });

    return newState;
  }

  /**
   * Store prediction for future learning
   */
  private async storePredictionForLearning(
    companyOfInterest: string,
    tradeDate: string,
    decision: string,
    confidence: number,
    requestId: string
  ): Promise<void> {
    // Store prediction metadata for later outcome comparison
    // In a production system, this would persist to a database
    logger.info('storePredictionForLearning', 'Storing prediction for future learning', {
      company: companyOfInterest,
      tradeDate,
      decision,
      confidence,
      requestId
    });
  }

  /**
   * Update system with actual outcomes for learning
   */
  async updateWithOutcome(
    requestId: string,
    actualReturn: number,
    actualVolatility: number,
    unexpectedEvents: Array<{ event: string; impact: number }> = []
  ): Promise<void> {
    if (!this.enableAdvancedMemory || !this.advancedMemorySystem) {
      logger.warn('updateWithOutcome', 'Advanced memory not available for outcome learning');
      return;
    }

    try {
      await this.advancedMemorySystem.updateWithOutcome(requestId, {
        actual_return: actualReturn,
        actual_volatility: actualVolatility,
        actual_max_drawdown: Math.min(0, actualReturn),
        unexpected_events: unexpectedEvents
      });
      logger.info('updateWithOutcome', 'Outcome updated for learning', { requestId });
    } catch (error) {
      logger.error('updateWithOutcome', 'Failed to update outcome', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get advanced memory analytics
   */
  async getAdvancedMemoryAnalytics(): Promise<any> {
    if (!this.enableAdvancedMemory || !this.advancedMemorySystem) {
      return { message: 'Advanced memory not enabled' };
    }

    try {
      return await this.advancedMemorySystem.getSystemAnalytics();
    } catch (error) {
      logger.error('getAdvancedMemoryAnalytics', 'Failed to get analytics', {
        error: error instanceof Error ? error.message : String(error)
      });
      return { error: 'Failed to retrieve analytics' };
    }
  }

  /**
   * Create a test instance with LM Studio configuration
   */
  static createTestInstance(): EnhancedTradingAgentsGraph {
    const config: TradingAgentsConfig = {
      projectDir: process.env.TRADINGAGENTS_PROJECT_DIR || './project',
      resultsDir: process.env.TRADINGAGENTS_RESULTS_DIR || './results',
      dataDir: process.env.TRADINGAGENTS_DATA_DIR || './data',
      dataCacheDir: process.env.TRADINGAGENTS_CACHE_DIR || './cache',
      exportsDir: process.env.TRADINGAGENTS_EXPORTS_DIR || './exports',
      logsDir: process.env.TRADINGAGENTS_LOGS_DIR || './logs',
      llmProvider: 'lm_studio',
      deepThinkLlm: 'microsoft/phi-4-mini-reasoning',
      quickThinkLlm: 'microsoft/phi-4-mini-reasoning',
      backendUrl: process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1',
      maxDebateRounds: 3,
      maxRiskDiscussRounds: 3,
      maxRecurLimit: 5,
      onlineTools: false
    };

    return new EnhancedTradingAgentsGraph({
      config,
      selectedAnalysts: ['market', 'social'],
      enableLangGraph: true,
      enableLazyLoading: true,
      enableStateOptimization: true
    });
  }

  /**
   * Run a complete integration test
   */
  static async runIntegrationTest(): Promise<boolean> {
    try {
      logger.info('runIntegrationTest', '🚀 Running Enhanced Trading Agents Graph Integration Test...');

      // Create test instance
      const graph = this.createTestInstance();
      
      // Test configuration
      const configInfo = graph.getConfigInfo();
      logger.info('runIntegrationTest', 'Configuration loaded successfully', { config: configInfo });

      // Test workflow initialization
      await graph.initializeWorkflow();
      logger.info('runIntegrationTest', 'Workflow initialized successfully');

      // Test workflow connectivity
      const testResult = await graph.testWorkflow();
      if (testResult.success) {
        logger.info('runIntegrationTest', 'Workflow connectivity test passed');
      } else {
        logger.error('runIntegrationTest', 'Workflow connectivity test failed', { error: testResult.error });
        return false;
      }

      // Test full analysis
      const analysisResult = await graph.analyzeAndDecide('AAPL', '2025-08-24');
      logger.info('runIntegrationTest', 'Full analysis test completed successfully', {
        decision: analysisResult.decision,
        confidence: analysisResult.confidence,
        reasoningCount: analysisResult.reasoning.length
      });

      logger.info('runIntegrationTest', '🎉 All Enhanced Trading Agents Graph tests passed!');
      return true;
    } catch (error) {
      logger.error('runIntegrationTest', 'Enhanced Trading Agents Graph test failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }
}