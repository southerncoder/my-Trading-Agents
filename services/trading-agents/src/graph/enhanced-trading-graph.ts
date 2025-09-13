/**
 * Comprehensive Trading Agents Graph with LangGraph Integration
 * 
 * This module combines the original TradingAgentsGraph functionality
 * with the working LangGraph implementation for full workflow orchestration.
 * Now includes lazy loading for performance optimization.
 */

import { TradingAgentsConfig } from '../types/config';
import { ModelProvider } from '../models/index';
import { AnalystType } from './langgraph-working';
import { createLogger } from '../utils/enhanced-logger';
import { StateOptimizationConfig } from '../performance/state-optimization';
import {
  MemoryManagementService,
  WorkflowManagementService,
  StateOptimizationService,
  AnalyticsService,
  ConfigurationService,
  TestingService,
  createMemoryManagementService,
  createWorkflowManagementService,
  createStateOptimizationService,
  createAnalyticsService,
  createConfigurationService,
  createTestingService
} from './services/index';

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
  private zepClientConfig?: any;

  // Service instances
  private memoryService: MemoryManagementService;
  private workflowService: WorkflowManagementService;
  private stateService: StateOptimizationService;
  private analyticsService: AnalyticsService;
  private configurationService: ConfigurationService;
  private testingService: TestingService;

  constructor(graphConfig: TradingGraphConfig) {
    this.config = graphConfig.config;
    this.selectedAnalysts = graphConfig.selectedAnalysts || ['market', 'social', 'news', 'fundamentals'];
    this.enableLangGraph = graphConfig.enableLangGraph ?? true;
    this.enableLazyLoading = graphConfig.enableLazyLoading ?? true;
    this.enableCaching = graphConfig.enableCaching ?? true;
    this.enableStateOptimization = graphConfig.enableStateOptimization ?? true;
    this.enableAdvancedMemory = graphConfig.enableAdvancedMemory ?? true;
    this.zepClientConfig = graphConfig.zepClientConfig;

    // Initialize services
    this.memoryService = createMemoryManagementService({
      enableAdvancedMemory: this.enableAdvancedMemory,
      zepClientConfig: this.zepClientConfig
    });

    this.workflowService = createWorkflowManagementService({
      enableLangGraph: this.enableLangGraph,
      enableLazyLoading: this.enableLazyLoading,
      selectedAnalysts: this.selectedAnalysts,
      modelConfigs: ModelProvider.createFromConfig(this.config),
      config: this.config
    });

    this.stateService = createStateOptimizationService({
      enableStateOptimization: this.enableStateOptimization,
      stateOptimizationConfig: graphConfig.stateOptimizationConfig
    });

    this.analyticsService = createAnalyticsService({
      enableAnalytics: true // Always enable analytics for monitoring
    });

    this.configurationService = createConfigurationService({
      config: this.config,
      selectedAnalysts: this.selectedAnalysts,
      enableLangGraph: this.enableLangGraph,
      workflowInitialized: false
    });

    this.testingService = createTestingService({
      enableTesting: true // Always enable testing capabilities
    });

    logger.info('constructor', 'Enhanced Trading Agents Graph initialized with services', {
      selectedAnalysts: this.selectedAnalysts,
      enableLangGraph: this.enableLangGraph,
      enableLazyLoading: this.enableLazyLoading,
      enableStateOptimization: this.enableStateOptimization,
      enableCaching: this.enableCaching,
      enableAdvancedMemory: this.enableAdvancedMemory
    });

    // Initialize components asynchronously
    this.initializeComponents();
  }

  /**
   * Initialize components asynchronously
   */
  private async initializeComponents(): Promise<void> {
    try {
      // Initialize workflow service components
      if (this.enableLangGraph) {
        this.workflowService.initializeLangGraph();
      }

      if (this.enableLazyLoading) {
        this.workflowService.initializeLazyLoading();
      }

      // Initialize advanced memory in background
      if (this.enableAdvancedMemory) {
        await this.memoryService.initializeAdvancedMemory();
      }
    } catch (error) {
      logger.error('initializeComponents', 'Failed to initialize components', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get lazy loading statistics
   */
  getLazyLoadingStats() {
    return this.workflowService.getLazyLoadingStats();
  }

  /**
   * Pre-warm common components in background
   */
  async preWarmComponents(): Promise<void> {
    return this.workflowService.preWarmComponents();
  }

  /**
   * Create and initialize the workflow
   */
  async initializeWorkflow(): Promise<void> {
    await this.workflowService.initializeWorkflow();
    this.configurationService.setWorkflowInitialized(true);
  }

  /**
   * Execute the trading analysis workflow
   */
  async execute(companyOfInterest: string, tradeDate: string): Promise<{
    success: boolean;
    result?: any;
    error?: string;
  }> {
    return this.workflowService.executeWorkflow(companyOfInterest, tradeDate);
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
    if (this.memoryService.isAdvancedMemoryAvailable()) {
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

        memoryInsights = await this.memoryService.processIntelligenceRequest(intelligenceRequest);
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
    if (this.memoryService.isAdvancedMemoryAvailable() && memoryInsights) {
      await this.memoryService.storePredictionForLearning(companyOfInterest, tradeDate, decision, confidence, memoryInsights.request_id);
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
    return this.configurationService.getConfigInfo();
  }

  /**
   * Test the workflow connectivity
   */
  async testWorkflow(): Promise<{ success: boolean; error?: string }> {
    return this.workflowService.testWorkflow();
  }

  /**
   * Get state optimization statistics
   */
  getStateOptimizationStats() {
    return this.stateService.getStateOptimizationStats();
  }

  /**
   * Optimized state update using state manager
   */
  async updateStateOptimized(currentState: any, updates: any): Promise<any> {
    return this.stateService.updateStateOptimized(currentState, updates);
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
    await this.memoryService.storePredictionForLearning(companyOfInterest, tradeDate, decision, confidence, requestId);
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
    await this.memoryService.updateWithOutcome(requestId, actualReturn, actualVolatility, unexpectedEvents);
  }

  /**
   * Get advanced memory analytics
   */
  async getAdvancedMemoryAnalytics(): Promise<any> {
    return this.memoryService.getAdvancedMemoryAnalytics();
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
    const testingService = createTestingService({ enableTesting: true });
    return testingService.runIntegrationTest();
  }
}