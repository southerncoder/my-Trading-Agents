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

// Enhanced components integration
import { BacktestEngine } from '../backtesting/backtest-engine';
import { RiskManagementEngine } from '../utils/risk-management-utils';
import { StrategyEnsemble } from '../strategies/strategy-ensemble';
import { PositionSizer } from '../portfolio/position-sizer';
import { DataProviderFailover } from '../resilience/data-provider-failover';
import { PerformanceMonitor } from '../monitoring/performance-monitor';
import { DatabaseManager } from '../database/database-manager';
import { AgentMemoryManager } from '../memory/agent-memory-manager';
import { GovernmentDataClient } from '../clients/government-data-client';

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
  enableBacktesting?: boolean;
  enableRiskManagement?: boolean;
  enableStrategyEnsemble?: boolean;
  enablePositionSizing?: boolean;
  enableDataResilience?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableGovernmentData?: boolean;
  zepClientConfig?: {
    api_key: string;
    base_url: string;
    session_id?: string;
    user_id?: string;
  };
  databaseConfig?: {
    postgresql: {
      host: string;
      port: number;
      database: string;
      username: string;
      password: string;
      ssl: boolean;
      poolSize: number;
    };
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
  private enableBacktesting: boolean;
  private enableRiskManagement: boolean;
  private enableStrategyEnsemble: boolean;
  private enablePositionSizing: boolean;
  private enableDataResilience: boolean;
  private enablePerformanceMonitoring: boolean;
  private enableGovernmentData: boolean;
  private zepClientConfig?: any;
  private databaseConfig?: any;
  private langGraphEnforcement: 'forced' | 'explicit';

  // Service instances
  private memoryService: MemoryManagementService;
  private workflowService: WorkflowManagementService;
  private stateService: StateOptimizationService;
  private analyticsService: AnalyticsService;
  private configurationService: ConfigurationService;
  private testingService: TestingService;

  // Enhanced component instances
  private backtestEngine?: BacktestEngine;
  private riskManagementEngine?: RiskManagementEngine;
  private strategyEnsemble?: StrategyEnsemble;
  private positionSizer?: PositionSizer;
  private dataProviderFailover?: DataProviderFailover;
  private performanceMonitor?: PerformanceMonitor;
  private databaseManager?: DatabaseManager;
  private agentMemoryManager?: AgentMemoryManager;
  private governmentDataClient?: GovernmentDataClient;

  constructor(graphConfig: TradingGraphConfig) {
    this.config = graphConfig.config;
    this.selectedAnalysts = graphConfig.selectedAnalysts || ['market', 'social', 'news', 'fundamentals'];
    const requestedLangGraph = graphConfig.enableLangGraph ?? true;
    if (requestedLangGraph === false) {
      this.enableLangGraph = true;
      this.langGraphEnforcement = 'forced';
      logger.warn('constructor', 'LangGraph was requested disabled; enforcement re-enabled to comply with project policy');
    } else {
      this.enableLangGraph = true;
      this.langGraphEnforcement = 'explicit';
    }
    this.enableLazyLoading = graphConfig.enableLazyLoading ?? true;
    this.enableCaching = graphConfig.enableCaching ?? true;
    this.enableStateOptimization = graphConfig.enableStateOptimization ?? true;
    this.enableAdvancedMemory = graphConfig.enableAdvancedMemory ?? true;
    this.enableBacktesting = graphConfig.enableBacktesting ?? true;
    this.enableRiskManagement = graphConfig.enableRiskManagement ?? true;
    this.enableStrategyEnsemble = graphConfig.enableStrategyEnsemble ?? true;
    this.enablePositionSizing = graphConfig.enablePositionSizing ?? true;
    this.enableDataResilience = graphConfig.enableDataResilience ?? true;
    this.enablePerformanceMonitoring = graphConfig.enablePerformanceMonitoring ?? true;
    this.enableGovernmentData = graphConfig.enableGovernmentData ?? true;
    this.zepClientConfig = graphConfig.zepClientConfig;
    this.databaseConfig = graphConfig.databaseConfig;

    // Initialize services
    this.memoryService = createMemoryManagementService({
      enableAdvancedMemory: this.enableAdvancedMemory,
      zepClientConfig: this.zepClientConfig
    });

    // Derive provider if missing (non-mocking, config-driven): prefer REMOTE_LM_STUDIO, then LOCAL_LM_STUDIO, else openai as last resort
    const derivedProvider = (this.config as any).llmProvider ||
      (process.env.REMOTE_LM_STUDIO_BASE_URL ? 'remote_lmstudio' : '') ||
      (process.env.LOCAL_LM_STUDIO_BASE_URL ? 'local_lmstudio' : '') ||
      ((process.env.EMBEDDING_LLM_URL || process.env.OPENAI_BASE_URL) && process.env.OPENAI_API_KEY ? 'openai' : '');
    if (!derivedProvider) {
      logger.warn('constructor', 'No resolvable LLM provider from environment; downstream model creation may skip functionality');
    } else {
      (this.config as any).llmProvider = derivedProvider;
    }

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
      langGraphEnforcement: this.langGraphEnforcement,
      enableLazyLoading: this.enableLazyLoading,
      enableStateOptimization: this.enableStateOptimization,
      enableCaching: this.enableCaching,
      enableAdvancedMemory: this.enableAdvancedMemory,
      enableBacktesting: this.enableBacktesting,
      enableRiskManagement: this.enableRiskManagement,
      enableStrategyEnsemble: this.enableStrategyEnsemble,
      enablePositionSizing: this.enablePositionSizing,
      enableDataResilience: this.enableDataResilience,
      enablePerformanceMonitoring: this.enablePerformanceMonitoring,
      enableGovernmentData: this.enableGovernmentData
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

      // Initialize enhanced components
      await this.initializeEnhancedComponents();
    } catch (error) {
      logger.error('initializeComponents', 'Failed to initialize components', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Initialize enhanced trading components
   */
  private async initializeEnhancedComponents(): Promise<void> {
    try {
      // Initialize database manager first (required by other components)
      if (this.databaseConfig) {
        this.databaseManager = new DatabaseManager(this.databaseConfig);
        await this.databaseManager.initializeConnections();
        
        // Initialize agent memory manager with database
        this.agentMemoryManager = new AgentMemoryManager();
        await this.agentMemoryManager.initialize(this.databaseManager.getPostgreSQLPool());
      }

      // Initialize backtesting engine
      if (this.enableBacktesting) {
        this.backtestEngine = new BacktestEngine(this.config);
      }

      // Initialize risk management engine
      if (this.enableRiskManagement) {
        this.riskManagementEngine = new RiskManagementEngine(this.config);
      }

      // Initialize strategy ensemble
      if (this.enableStrategyEnsemble) {
        this.strategyEnsemble = new StrategyEnsemble(this.config);
      }

      // Initialize position sizer
      if (this.enablePositionSizing) {
        this.positionSizer = new PositionSizer(this.config);
      }

      // Initialize data provider failover
      if (this.enableDataResilience) {
        this.dataProviderFailover = new DataProviderFailover(this.config);
      }

      // Initialize performance monitor
      if (this.enablePerformanceMonitoring && this.databaseManager) {
        this.performanceMonitor = new PerformanceMonitor(this.databaseManager);
      }

      // Initialize government data client
      if (this.enableGovernmentData) {
        this.governmentDataClient = new GovernmentDataClient();
      }

      logger.info('initializeEnhancedComponents', 'Enhanced components initialized successfully', {
        backtesting: !!this.backtestEngine,
        riskManagement: !!this.riskManagementEngine,
        strategyEnsemble: !!this.strategyEnsemble,
        positionSizing: !!this.positionSizer,
        dataResilience: !!this.dataProviderFailover,
        performanceMonitoring: !!this.performanceMonitor,
        governmentData: !!this.governmentDataClient,
        database: !!this.databaseManager,
        agentMemory: !!this.agentMemoryManager
      });
    } catch (error) {
      logger.error('initializeEnhancedComponents', 'Failed to initialize enhanced components', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
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
   * Execute analysis and extract trading decision with enhanced components integration
   */
  async analyzeAndDecide(companyOfInterest: string, tradeDate: string): Promise<{
    decision: string;
    reasoning: string[];
    confidence: number;
    messages: any[];
    memoryInsights?: any;
    riskAssessment?: any;
    ensembleSignal?: any;
    positionSize?: any;
    governmentData?: any;
  }> {
    let memoryInsights: any = null;
    let riskAssessment: any = null;
    let ensembleSignal: any = null;
    let positionSize: any = null;
    let governmentData: any = null;

    // Get government data insights first (for fundamental analysis)
    if (this.governmentDataClient) {
      try {
        governmentData = await this.governmentDataClient.getCompanyProfile(companyOfInterest);
        logger.info('analyzeAndDecide', 'Government data retrieved', {
          company: companyOfInterest,
          hasSecFilings: !!governmentData.secFilings,
          hasEconomicData: !!governmentData.economicIndicators
        });
      } catch (error) {
        logger.warn('analyzeAndDecide', 'Failed to get government data', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

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
        memoryInsights,
        riskAssessment,
        ensembleSignal,
        positionSize,
        governmentData
      };
    }

    // Enhanced risk assessment using risk management engine
    if (this.riskManagementEngine) {
      try {
        riskAssessment = await this.riskManagementEngine.assessComprehensiveRisk(companyOfInterest, {
          includeGovernmentData: !!governmentData,
          governmentData: governmentData
        });
        logger.info('analyzeAndDecide', 'Risk assessment completed', {
          company: companyOfInterest,
          overallRiskScore: riskAssessment.overallRiskScore
        });
      } catch (error) {
        logger.warn('analyzeAndDecide', 'Failed to get risk assessment', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Extract decision from messages
    const messages = execution.result?.messages || [];
    const reasoning: string[] = [];
    let decision = 'HOLD';
    let confidence = 0.5;

    // Generate ensemble signal if strategy ensemble is available
    if (this.strategyEnsemble) {
      try {
        // Create basic trading signals from analysis results
        const signals = this.extractTradingSignalsFromMessages(messages);
        if (signals.length > 0) {
          ensembleSignal = await this.strategyEnsemble.aggregateSignals(signals);
          decision = ensembleSignal.type;
          confidence = ensembleSignal.strength;
          reasoning.push(`Ensemble Decision: ${decision} with ${(confidence * 100).toFixed(1)}% confidence from ${signals.length} strategies`);
        }
      } catch (error) {
        logger.warn('analyzeAndDecide', 'Failed to generate ensemble signal', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Incorporate enhanced analysis into reasoning
    if (governmentData) {
      reasoning.push(`Government Data: Analyzed SEC filings and economic indicators for ${companyOfInterest}`);
    }

    if (riskAssessment) {
      reasoning.push(`Risk Assessment: Overall risk score ${riskAssessment.overallRiskScore.toFixed(2)} (${riskAssessment.riskLevel})`);
      
      // Adjust confidence based on risk assessment
      if (riskAssessment.riskLevel === 'HIGH') {
        confidence *= 0.7; // Reduce confidence for high-risk positions
      } else if (riskAssessment.riskLevel === 'LOW') {
        confidence *= 1.1; // Increase confidence for low-risk positions
      }
    }

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

    // Extract decision from messages if ensemble signal not available
    if (!ensembleSignal) {
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
    }

    // Calculate position size if position sizer is available
    if (this.positionSizer && decision !== 'HOLD') {
      try {
        const mockPortfolio = { totalValue: 100000, positions: [] }; // Mock portfolio for demo
        const signal = { type: decision, strength: confidence, symbol: companyOfInterest };
        positionSize = await this.positionSizer.calculateOptimalSize(signal, mockPortfolio, riskAssessment);
        reasoning.push(`Position Size: ${positionSize.shares} shares (${(positionSize.portfolioPercentage * 100).toFixed(1)}% of portfolio)`);
      } catch (error) {
        logger.warn('analyzeAndDecide', 'Failed to calculate position size', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Store analysis in agent memory for episodic learning
    if (this.agentMemoryManager) {
      try {
        await this.agentMemoryManager.storeEpisodicMemory({
          id: `${companyOfInterest}-${tradeDate}-${Date.now()}`,
          sessionId: `trading-session-${Date.now()}`,
          userId: 'system',
          agentId: 'enhanced-trading-graph',
          timestamp: new Date(),
          interactionType: 'analysis_request',
          context: {
            symbol: companyOfInterest,
            tradeDate,
            governmentData: !!governmentData,
            riskAssessment: !!riskAssessment,
            ensembleSignal: !!ensembleSignal
          },
          input: `Analyze ${companyOfInterest} for ${tradeDate}`,
          output: `Decision: ${decision}, Confidence: ${confidence}`,
          metadata: {
            confidence,
            executionTime: Date.now(),
            riskLevel: riskAssessment?.riskLevel,
            positionSize: positionSize?.portfolioPercentage
          }
        });
      } catch (error) {
        logger.warn('analyzeAndDecide', 'Failed to store episodic memory', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Post-decision learning: store this analysis for future learning
    if (this.memoryService.isAdvancedMemoryAvailable() && memoryInsights) {
      await this.memoryService.storePredictionForLearning(companyOfInterest, tradeDate, decision, confidence, memoryInsights.request_id);
    }

    // Track performance metrics
    if (this.performanceMonitor) {
      try {
        await this.performanceMonitor.trackDecision(companyOfInterest, {
          decision,
          confidence,
          timestamp: new Date(),
          riskScore: riskAssessment?.overallRiskScore,
          ensembleStrength: ensembleSignal?.strength,
          positionSize: positionSize?.portfolioPercentage
        });
      } catch (error) {
        logger.warn('analyzeAndDecide', 'Failed to track performance metrics', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return {
      decision,
      reasoning,
      confidence,
      messages,
      memoryInsights,
      riskAssessment,
      ensembleSignal,
      positionSize,
      governmentData
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
    langGraphEnforcement: 'forced' | 'explicit';
  } {
    const base = this.configurationService.getConfigInfo();
    return { ...base, langGraphEnforcement: this.langGraphEnforcement };
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
   * Extract trading signals from analysis messages for ensemble processing
   */
  private extractTradingSignalsFromMessages(messages: any[]): any[] {
    const signals: any[] = [];
    
    for (const message of messages) {
      if (message.content) {
        const content = message.content.toLowerCase();
        let signal = null;
        
        if (content.includes('buy') || content.includes('bullish')) {
          signal = {
            type: 'BUY',
            strength: this.extractConfidenceFromContent(content),
            strategy: message.agentName || 'unknown',
            reasoning: message.content
          };
        } else if (content.includes('sell') || content.includes('bearish')) {
          signal = {
            type: 'SELL',
            strength: this.extractConfidenceFromContent(content),
            strategy: message.agentName || 'unknown',
            reasoning: message.content
          };
        } else if (content.includes('hold') || content.includes('neutral')) {
          signal = {
            type: 'HOLD',
            strength: this.extractConfidenceFromContent(content),
            strategy: message.agentName || 'unknown',
            reasoning: message.content
          };
        }
        
        if (signal) {
          signals.push(signal);
        }
      }
    }
    
    return signals;
  }

  /**
   * Extract confidence level from message content
   */
  private extractConfidenceFromContent(content: string): number {
    // Look for confidence indicators in the text
    if (content.includes('strong') || content.includes('high confidence')) {
      return 0.8;
    } else if (content.includes('moderate') || content.includes('medium confidence')) {
      return 0.6;
    } else if (content.includes('weak') || content.includes('low confidence')) {
      return 0.4;
    } else if (content.includes('very strong') || content.includes('extremely')) {
      return 0.9;
    }
    
    // Default confidence
    return 0.5;
  }

  /**
   * Run backtesting on a strategy
   */
  async runBacktest(strategyConfig: any, symbol: string, startDate: string, endDate: string): Promise<any> {
    if (!this.backtestEngine) {
      throw new Error('Backtesting engine not initialized');
    }
    
    return this.backtestEngine.runBacktest({
      strategy: strategyConfig,
      symbols: [symbol],
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      initialCapital: 100000,
      commission: 0.001,
      slippage: 0.0005,
      marketImpact: true
    });
  }

  /**
   * Get comprehensive system status
   */
  getSystemStatus(): {
    components: Record<string, boolean>;
    database: boolean;
    memory: boolean;
    performance: any;
  } {
    return {
      components: {
        backtesting: !!this.backtestEngine,
        riskManagement: !!this.riskManagementEngine,
        strategyEnsemble: !!this.strategyEnsemble,
        positionSizing: !!this.positionSizer,
        dataResilience: !!this.dataProviderFailover,
        performanceMonitoring: !!this.performanceMonitor,
        governmentData: !!this.governmentDataClient
      },
      database: !!this.databaseManager,
      memory: !!this.agentMemoryManager,
      performance: this.performanceMonitor ? 'active' : 'inactive'
    };
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
      deepThinkLlm: 'microsoft/phi-4-mini-reasoning',
      quickThinkLlm: 'microsoft/phi-4-mini-reasoning',
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