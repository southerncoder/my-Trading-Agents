/**
 * Trading Agents Graph - Main Orchestration Class
 * 
 * This is the main class that orchestrates the entire trading agents framework,
 * converting the Python TradingAgentsGraph to TypeScript.
 * 
 * Key responsibilities:
 * - Initialize LLM providers and configuration
 * - Set up all graph components (agents, memories, tools)
 * - Execute the complete trading analysis workflow
 * - Handle state logging and result processing
 * - Provide reflection and learning capabilities
 */

import * as fs from 'fs';
import * as path from 'path';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { TradingAgentsConfig, createConfig } from '../config/index';
import { enhancedConfigLoader } from '../config/enhanced-loader';
import { Toolkit } from '../dataflows/interface';
import { AgentState } from '../types/agent-states';
import { resolveLLMProviderConfig } from '../utils/llm-provider-utils';
import { FinancialSituationMemory } from '../agents/utils/memory';
import { LLMProviderFactory } from '../providers/llm-factory';
import { AgentLLMConfig } from '../types/agent-config';

// Graph components
import { ConditionalLogic, createConditionalLogic } from './conditional-logic';
import { Propagator, createPropagator } from './propagation';
import { Reflector, createReflector } from './reflection';
import { SignalProcessor, createSignalProcessor } from './signal-processing';
import { GraphSetup, createGraphSetup, AgentNode } from './setup';
import { createLogger } from '../utils/enhanced-logger';

export type LLMProvider = BaseChatModel;

export interface TradingAgentsGraphConfig {
  selectedAnalysts?: string[];
  debug?: boolean;
  config?: TradingAgentsConfig;
}

export interface ExecutionResult {
  finalState: AgentState;
  processedSignal: string;
  executionTime: number;
  agentsExecuted: string[];
}

/**
 * Main class that orchestrates the trading agents framework
 */
export class TradingAgentsGraph {
  private debug: boolean;
  private config: TradingAgentsConfig;
  private selectedAnalysts: string[];
  private logger = createLogger('graph', 'trading-graph');

  // LLM instances
  private deepThinkingLLM!: LLMProvider;
  private quickThinkingLLM!: LLMProvider;

  // Core components
  private toolkit!: Toolkit;
  private conditionalLogic!: ConditionalLogic;
  private graphSetup!: GraphSetup;
  private propagator!: Propagator;
  private reflector!: Reflector;
  private signalProcessor!: SignalProcessor;

  // Memory systems
  private bullMemory!: FinancialSituationMemory;
  private bearMemory!: FinancialSituationMemory;
  private traderMemory!: FinancialSituationMemory;
  private investJudgeMemory!: FinancialSituationMemory;
  private riskManagerMemory!: FinancialSituationMemory;

  // State tracking
  private currentState: AgentState | null = null;
  private ticker: string | null = null;
  private logStatesDict: Record<string, any> = {};

  constructor(options: TradingAgentsGraphConfig = {}) {
    this.debug = options.debug || false;
    this.config = options.config || createConfig();
    this.selectedAnalysts = options.selectedAnalysts || ['market', 'social', 'news', 'fundamentals'];

    // Create necessary directories
    this.createDirectories();

    // Initialize toolkit
    this.toolkit = new Toolkit(this.config);

    // Initialize memories
    this.initializeMemories();

    // Note: LLMs, components, and graph setup will be initialized asynchronously
    // via the initializeAsync() method that must be called after construction
  }

  /**
   * Async initialization of LLMs and dependent components
   * This must be called after construction and before using the graph
   */
  public async initializeAsync(): Promise<void> {
    try {
      await this.initializeLLMs();
      this.initializeComponents();
      this.setupGraph();
      this.logger.info('initializeAsync', 'TradingAgentsGraph fully initialized');
    } catch (error) {
      this.logger.error('initializeAsync', 'Failed to initialize TradingAgentsGraph', { error });
      throw error;
    }
  }

  /**
   * Initialize LLM providers using environment variable resolution
   */
  private async initializeLLMs(): Promise<void> {
    // Use provider and model from config.analysis.models
    const models = (this.config as any).analysis?.models;
    const flow = (this.config as any).flow || {};
    const quickModelConfig = models?.quickThinking || {};
    const deepModelConfig = models?.deepThinking || {};
    const providerQuick = quickModelConfig.provider;
    const providerDeep = deepModelConfig.provider;
  const providerConfigQuick = resolveLLMProviderConfig(providerQuick);
  const providerConfigDeep = resolveLLMProviderConfig(providerDeep);

    // Use flow config for agent/flow control
    const temperature = typeof flow.temperature === 'number' ? flow.temperature : undefined;
    const maxTokens = typeof flow.maxTokens === 'number' ? flow.maxTokens : undefined;
    const timeout = typeof flow.timeout === 'number' ? flow.timeout : undefined;
    const parallelism = typeof flow.parallelism === 'number' ? flow.parallelism : undefined;
    const runMode = flow.runMode || undefined;

    // Create deep thinking LLM config
    const deepThinkConfig: AgentLLMConfig = {
      provider: providerDeep,
      model: deepModelConfig.model,
      temperature,
      maxTokens,
      timeout,
      parallelism,
      runMode,
      baseUrl: providerConfigDeep.baseUrl,
      apiKey: providerConfigDeep.apiKey
    };

    // Create quick thinking LLM config
    const quickThinkConfig: AgentLLMConfig = {
      provider: providerQuick,
      model: quickModelConfig.model,
      temperature,
      maxTokens,
      timeout,
      parallelism,
      runMode,
      baseUrl: providerConfigQuick.baseUrl,
      apiKey: providerConfigQuick.apiKey
    };

    // Create LLMs using factory
    this.deepThinkingLLM = await LLMProviderFactory.createLLM(deepThinkConfig);
    this.quickThinkingLLM = await LLMProviderFactory.createLLM(quickThinkConfig);
  }

  /**
   * Create necessary directories
   */
  private createDirectories(): void {
    const dataflowsDir = path.join(this.config.projectDir, 'dataflows', 'data_cache');
    fs.mkdirSync(dataflowsDir, { recursive: true });
  }

  /**
   * Initialize memory systems
   * Uses agent-specific configurations for optimal memory provider selection
   */
  private initializeMemories(): void {
    // Use agent-specific configurations for memory systems
    const bullConfig = enhancedConfigLoader.getAgentConfig('bull_researcher');
    const bearConfig = enhancedConfigLoader.getAgentConfig('bear_researcher');
    const traderConfig = enhancedConfigLoader.getAgentConfig('trader');
    const portfolioManagerConfig = enhancedConfigLoader.getAgentConfig('portfolio_manager');
    const riskManagerConfig = enhancedConfigLoader.getAgentConfig('portfolio_manager'); // Use portfolio manager for risk
    
    this.bullMemory = new FinancialSituationMemory('bull_memory', bullConfig);
    this.bearMemory = new FinancialSituationMemory('bear_memory', bearConfig);
    this.traderMemory = new FinancialSituationMemory('trader_memory', traderConfig);
    this.investJudgeMemory = new FinancialSituationMemory('invest_judge_memory', portfolioManagerConfig);
    this.riskManagerMemory = new FinancialSituationMemory('risk_manager_memory', riskManagerConfig);
  }

  /**
   * Initialize all graph components
   */
  private initializeComponents(): void {
    this.conditionalLogic = createConditionalLogic();
    this.propagator = createPropagator();
    this.reflector = createReflector(this.quickThinkingLLM);
    this.signalProcessor = createSignalProcessor(this.quickThinkingLLM);
  }

  /**
   * Set up the graph with all components
   */
  private setupGraph(): void {
    this.graphSetup = createGraphSetup({
      selectedAnalysts: this.selectedAnalysts,
      toolkit: this.toolkit,
      quickThinkingLLM: this.quickThinkingLLM,
      deepThinkingLLM: this.deepThinkingLLM,
      memories: {
        bullMemory: this.bullMemory,
        bearMemory: this.bearMemory,
        traderMemory: this.traderMemory,
        investJudgeMemory: this.investJudgeMemory,
        riskManagerMemory: this.riskManagerMemory
      },
      conditionalLogic: this.conditionalLogic
    });
  }

  /**
   * Execute the trading agents analysis workflow with optimized parallel execution
   */
  async propagate(companyName: string, tradeDate: string): Promise<ExecutionResult> {
    const startTime = Date.now();
    this.ticker = companyName;

    try {
      // Initialize state
      const initialState = this.propagator.createInitialState(companyName, tradeDate);
      
      // Set up agents
      const agentNodes = this.graphSetup.setupAgents(this.selectedAnalysts);

      // Execute workflow with parallel optimization
      let currentState = initialState;
      const agentsExecuted: string[] = [];

      if (this.debug) {
        this.logger.info('execute', `Starting trading analysis for ${companyName} on ${tradeDate}`, {
          company: companyName,
          tradeDate,
          analystsCount: this.selectedAnalysts.length,
          optimizationMode: 'parallel'
        });
      }

      // Execute workflow in optimized phases
      currentState = await this.executeWorkflowPhases(
        currentState, 
        agentNodes, 
        agentsExecuted
      );

      // Store current state for reflection
      this.currentState = currentState;

      // Log state
      await this.logState(tradeDate, currentState);

      // Process signal
      const processedSignal = await this.processSignal(currentState.final_trade_decision || '');

      const executionTime = Date.now() - startTime;

      return {
        finalState: currentState,
        processedSignal,
        executionTime,
        agentsExecuted
      };

    } catch (error) {
      this.logger.error('execute', 'Error during workflow execution', {
        error: error instanceof Error ? error.message : String(error),
        company: companyName
      });
      throw error;
    }
  }

  /**
   * Execute workflow in optimized phases with parallel analyst execution
   */
  private async executeWorkflowPhases(
    initialState: AgentState, 
    agentNodes: Record<string, AgentNode>, 
    agentsExecuted: string[]
  ): Promise<AgentState> {
    let currentState = initialState;

    // Phase 1: Execute analysts in parallel (biggest performance gain)
    const analystKeys = this.selectedAnalysts.filter(analyst => 
      ['market', 'social', 'news', 'fundamentals'].includes(analyst)
    );

    if (analystKeys.length > 0) {
      if (this.debug) {
        this.logger.info('execute', `Phase 1: Executing ${analystKeys.length} analysts in parallel`, {
          analysts: analystKeys,
          phase: 'analysts_parallel'
        });
      }

      const analystStartTime = Date.now();
      currentState = await this.executeAnalystsInParallel(
        currentState, 
        agentNodes, 
        analystKeys, 
        agentsExecuted
      );
      const analystDuration = Date.now() - analystStartTime;

      if (this.debug) {
        this.logger.info('execute', `Phase 1 completed: Analysts executed in parallel`, {
          duration: analystDuration,
          analystsExecuted: analystKeys.length,
          totalAgentsExecuted: agentsExecuted.length
        });
      }
    }

    // Phase 2: Execute research team sequentially (depends on analysts)
    const researchKeys = ['bull_researcher', 'bear_researcher', 'research_manager'];
    const researchStartTime = Date.now();
    
    if (this.debug) {
      this.logger.info('execute', `Phase 2: Executing research team sequentially`, {
        researchers: researchKeys,
        phase: 'research_sequential'
      });
    }

    currentState = await this.executeAgentsSequentially(
      currentState, 
      agentNodes, 
      researchKeys, 
      agentsExecuted
    );

    if (this.debug) {
      const researchDuration = Date.now() - researchStartTime;
      this.logger.info('execute', `Phase 2 completed: Research team executed`, {
        duration: researchDuration,
        researchersExecuted: researchKeys.length
      });
    }

    // Phase 3: Execute trader (depends on research)
    const traderKeys = ['trader'];
    currentState = await this.executeAgentsSequentially(
      currentState, 
      agentNodes, 
      traderKeys, 
      agentsExecuted
    );

    // Phase 4: Execute risk management team sequentially (depends on trader)
    const riskKeys = ['risky_analyst', 'safe_analyst', 'neutral_analyst', 'portfolio_manager'];
    const riskStartTime = Date.now();
    
    if (this.debug) {
      this.logger.info('execute', `Phase 4: Executing risk management team sequentially`, {
        riskAnalysts: riskKeys,
        phase: 'risk_sequential'
      });
    }

    currentState = await this.executeAgentsSequentially(
      currentState, 
      agentNodes, 
      riskKeys, 
      agentsExecuted
    );

    if (this.debug) {
      const riskDuration = Date.now() - riskStartTime;
      this.logger.info('execute', `Phase 4 completed: Risk management team executed`, {
        duration: riskDuration,
        riskAnalystsExecuted: riskKeys.length,
        totalWorkflowComplete: true
      });
    }

    return currentState;
  }

  /**
   * Execute analysts in parallel for maximum performance gain
   */
  private async executeAnalystsInParallel(
    currentState: AgentState, 
    agentNodes: Record<string, AgentNode>, 
    analystKeys: string[], 
    agentsExecuted: string[]
  ): Promise<AgentState> {
    // Create promises for all analyst executions
    const analystPromises = analystKeys.map(async (agentKey) => {
      const agentNode = agentNodes[agentKey];
      if (!agentNode) {
        this.logger.warn('execute', `Analyst not found: ${agentKey}`, { 
          agentKey, 
          availableAgents: Object.keys(agentNodes) 
        });
        return { agentKey, result: null, error: null };
      }

      try {
        if (this.debug) {
          this.logger.info('execute', `Starting parallel execution: ${agentNode.name}`, {
            agentName: agentNode.name,
            agentKey,
            phase: 'parallel_analyst'
          });
        }

        const agentResult = await agentNode.agent.process(currentState);

        if (this.debug) {
          this.logger.info('execute', `Completed parallel execution: ${agentNode.name}`, {
            agentName: agentNode.name,
            agentKey,
            hasResult: !!agentResult
          });
        }

        return { agentKey, result: agentResult, error: null, agentName: agentNode.name || agentKey };
      } catch (error) {
        this.logger.error('execute', `Error in parallel execution: ${agentNode.name}`, {
          agentName: agentNode.name,
          agentKey,
          error: error instanceof Error ? error.message : String(error)
        });
        return { agentKey, result: null, error, agentName: agentNode.name || agentKey };
      }
    });

    // Wait for all analysts to complete
    const analystResults = await Promise.allSettled(analystPromises);
    
    // Process results and merge into state
    let updatedState = currentState;
    
    for (const promiseResult of analystResults) {
      if (promiseResult.status === 'fulfilled') {
        const { agentKey, result, error, agentName } = promiseResult.value;
        
        if (result && !error && agentName) {
          // Merge analyst result into state
          updatedState = this.propagator.updateState(updatedState, result);
          agentsExecuted.push(agentName);
          
          if (this.debug) {
            this.logger.info('execute', `Merged parallel result: ${agentName}`, {
              agentName,
              agentKey,
              totalExecuted: agentsExecuted.length
            });
          }
        } else if (error) {
          this.logger.warn('execute', `Skipping failed parallel agent: ${agentName}`, {
            agentName,
            agentKey,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      } else {
        this.logger.error('execute', `Promise rejection in parallel execution`, {
          reason: promiseResult.reason instanceof Error ? promiseResult.reason.message : String(promiseResult.reason)
        });
      }
    }

    return updatedState;
  }

  /**
   * Execute agents sequentially (for phases that require dependency order)
   */
  private async executeAgentsSequentially(
    currentState: AgentState, 
    agentNodes: Record<string, AgentNode>, 
    agentKeys: string[], 
    agentsExecuted: string[]
  ): Promise<AgentState> {
    let updatedState = currentState;

    for (const agentKey of agentKeys) {
      const agentNode = agentNodes[agentKey];
      if (!agentNode) {
        this.logger.warn('execute', `Agent not found: ${agentKey}`, { 
          agentKey, 
          availableAgents: Object.keys(agentNodes) 
        });
        continue;
      }

      try {
        if (this.debug) {
          this.logger.info('execute', `Executing sequential agent: ${agentNode.name}`, {
            agentName: agentNode.name,
            agentKey,
            executionStep: agentsExecuted.length + 1
          });
        }

        const agentResult = await agentNode.agent.process(updatedState);
        updatedState = this.propagator.updateState(updatedState, agentResult);
        agentsExecuted.push(agentNode.name);

        if (this.debug) {
          this.logger.info('execute', `Completed sequential agent: ${agentNode.name}`, {
            agentName: agentNode.name,
            agentKey,
            totalExecuted: agentsExecuted.length
          });
        }
      } catch (error) {
        this.logger.error('execute', `Error executing sequential agent: ${agentNode.name}`, {
          agentName: agentNode.name,
          agentKey,
          error: error instanceof Error ? error.message : String(error)
        });
        // Continue with other agents on error
      }
    }

    return updatedState;
  }

  /**
   * Log the final state to a JSON file
   */
  private async logState(tradeDate: string, finalState: AgentState): Promise<void> {
    try {
      const loggableState = this.propagator.extractLoggableState(finalState);
      this.logStatesDict[tradeDate] = loggableState;

      // Create directory
      const logDir = path.join('eval_results', this.ticker || 'unknown', 'TradingAgentsStrategy_logs');
      fs.mkdirSync(logDir, { recursive: true });

      // Save to file
      const logFile = path.join(logDir, `full_states_log_${tradeDate}.json`);
      fs.writeFileSync(logFile, JSON.stringify(this.logStatesDict, null, 4));

      if (this.debug) {
        this.logger.info('logState', `State logged to: ${logFile}`, {
          logFile,
          tradeDate,
          ticker: this.ticker
        });
      }
    } catch (error) {
      this.logger.error('logState', 'Error logging state', {
        error: error instanceof Error ? error.message : String(error),
        tradeDate
      });
    }
  }

  /**
   * Reflect on decisions and update memory based on returns
   */
  async reflectAndRemember(_returnsLosses: number | string): Promise<void> {
    if (!this.currentState) {
      this.logger.warn('reflectAndRemember', 'No current state available for reflection', {
        hasCurrentState: false
      });
      return;
    }
    // ...reflection logic would go here...
  }

  /**
   * Process a signal to extract the core decision
   */
  async processSignal(fullSignal: string): Promise<string> {
    try {
      return await this.signalProcessor.processSignal(fullSignal);
    } catch (error) {
      this.logger.error('processSignal', 'Error processing signal', {
        error: error instanceof Error ? error.message : String(error),
        signalLength: fullSignal.length
      });
      return 'HOLD';
    }
  }

  /**
   * Get current state
   */
  getCurrentState(): AgentState | null {
    return this.currentState;
  }

  /**
   * Get execution statistics
   */
  getExecutionStats(): any {
    return this.graphSetup.getGraphStats(this.selectedAnalysts);
  }

  /**
   * Validate configuration
   */
  validateConfiguration(): { isValid: boolean; errors: string[] } {
    return this.graphSetup.validateConfiguration(this.selectedAnalysts);
  }

  /**
   * Get configuration information
   */
  getConfigInfo(): {
    selectedAnalysts: string[];
    debug: boolean;
    projectDir: string;
  } {
    return {
      selectedAnalysts: this.selectedAnalysts,
      debug: this.debug,
      projectDir: this.config.projectDir
    };
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    // Clean up memories if needed
    // Clean up file handles if needed
    // Other cleanup tasks
    if (this.debug) {
      this.logger.info('cleanup', 'TradingAgentsGraph cleanup completed', {
        hasCurrentState: !!this.currentState,
        ticker: this.ticker
      });
    }
  }
}

/**
 * Create a new TradingAgentsGraph instance with async initialization
 */
export async function createTradingAgentsGraph(options?: TradingAgentsGraphConfig): Promise<TradingAgentsGraph> {
  const graph = new TradingAgentsGraph(options);
  await graph.initializeAsync();
  return graph;
}

/**
 * Create a new TradingAgentsGraph instance (synchronous constructor only)
 * Note: You must call initializeAsync() before using the graph
 */
export function createTradingAgentsGraphSync(options?: TradingAgentsGraphConfig): TradingAgentsGraph {
  return new TradingAgentsGraph(options);
}