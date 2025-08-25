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
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

import { TradingAgentsConfig, createConfig } from '../config/index';
import { Toolkit } from '../dataflows/interface';
import { AgentState } from '../types/agent-states';
import { FinancialSituationMemory } from '../agents/utils/memory';

// Graph components
import { ConditionalLogic, createConditionalLogic } from './conditional-logic';
import { Propagator, createPropagator } from './propagation';
import { Reflector, createReflector } from './reflection';
import { SignalProcessor, createSignalProcessor } from './signal-processing';
import { GraphSetup, createGraphSetup, AgentNode } from './setup';

export type LLMProvider = ChatOpenAI | ChatAnthropic | ChatGoogleGenerativeAI;

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

    // Initialize LLMs
    this.initializeLLMs();

    // Create necessary directories
    this.createDirectories();

    // Initialize toolkit
    this.toolkit = new Toolkit(this.config);

    // Initialize memories
    this.initializeMemories();

    // Initialize components
    this.initializeComponents();

    // Set up the graph
    this.setupGraph();
  }

  /**
   * Initialize LLM providers based on configuration
   */
  private initializeLLMs(): void {
    const provider = this.config.llmProvider.toLowerCase();

    switch (provider) {
      case 'openai':
      case 'ollama':
      case 'openrouter':
        if (!this.config.openaiApiKey) {
          throw new Error('OpenAI API key is required for OpenAI provider');
        }
        this.deepThinkingLLM = new ChatOpenAI({
          modelName: this.config.deepThinkLlm,
          openAIApiKey: this.config.openaiApiKey,
          configuration: {
            baseURL: this.config.backendUrl
          }
        });
        this.quickThinkingLLM = new ChatOpenAI({
          modelName: this.config.quickThinkLlm,
          openAIApiKey: this.config.openaiApiKey,
          configuration: {
            baseURL: this.config.backendUrl
          }
        });
        break;

      case 'anthropic':
        if (!this.config.anthropicApiKey) {
          throw new Error('Anthropic API key is required for Anthropic provider');
        }
        this.deepThinkingLLM = new ChatAnthropic({
          modelName: this.config.deepThinkLlm,
          anthropicApiKey: this.config.anthropicApiKey,
          clientOptions: {
            baseURL: this.config.backendUrl
          }
        });
        this.quickThinkingLLM = new ChatAnthropic({
          modelName: this.config.quickThinkLlm,
          anthropicApiKey: this.config.anthropicApiKey,
          clientOptions: {
            baseURL: this.config.backendUrl
          }
        });
        break;

      case 'google':
        if (!this.config.googleApiKey) {
          throw new Error('Google API key is required for Google provider');
        }
        this.deepThinkingLLM = new ChatGoogleGenerativeAI({
          modelName: this.config.deepThinkLlm,
          apiKey: this.config.googleApiKey
        });
        this.quickThinkingLLM = new ChatGoogleGenerativeAI({
          modelName: this.config.quickThinkLlm,
          apiKey: this.config.googleApiKey
        });
        break;

      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
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
   */
  private initializeMemories(): void {
    this.bullMemory = new FinancialSituationMemory('bull_memory', this.config);
    this.bearMemory = new FinancialSituationMemory('bear_memory', this.config);
    this.traderMemory = new FinancialSituationMemory('trader_memory', this.config);
    this.investJudgeMemory = new FinancialSituationMemory('invest_judge_memory', this.config);
    this.riskManagerMemory = new FinancialSituationMemory('risk_manager_memory', this.config);
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
   * Execute the trading agents analysis workflow
   */
  async propagate(companyName: string, tradeDate: string): Promise<ExecutionResult> {
    const startTime = Date.now();
    this.ticker = companyName;

    try {
      // Initialize state
      const initialState = this.propagator.createInitialState(companyName, tradeDate);
      
      // Set up agents
      const agentNodes = this.graphSetup.setupAgents(this.selectedAnalysts);
      const executionOrder = this.graphSetup.getExecutionOrder(this.selectedAnalysts);

      // Execute workflow
      let currentState = initialState;
      const agentsExecuted: string[] = [];

      if (this.debug) {
        console.log(`Starting trading analysis for ${companyName} on ${tradeDate}`);
        console.log(`Execution order: ${executionOrder.join(' -> ')}`);
      }

      // Execute agents sequentially (simplified approach for now)
      for (const agentKey of executionOrder) {
        const agentNode = agentNodes[agentKey];
        if (!agentNode) {
          console.warn(`Agent not found: ${agentKey}`);
          continue;
        }

        try {
          if (this.debug) {
            console.log(`Executing: ${agentNode.name}`);
          }

          // Execute agent
          const agentResult = await agentNode.agent.process(currentState);
          
          // Update state
          currentState = this.propagator.updateState(currentState, agentResult);
          agentsExecuted.push(agentNode.name);

          if (this.debug) {
            console.log(`Completed: ${agentNode.name}`);
          }
        } catch (error) {
          console.error(`Error executing ${agentNode.name}:`, error);
          // Continue with other agents on error
        }
      }

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
      console.error('Error during workflow execution:', error);
      throw error;
    }
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
        console.log(`State logged to: ${logFile}`);
      }
    } catch (error) {
      console.error('Error logging state:', error);
    }
  }

  /**
   * Reflect on decisions and update memory based on returns
   */
  async reflectAndRemember(returnsLosses: number | string): Promise<void> {
    if (!this.currentState) {
      console.warn('No current state available for reflection');
      return;
    }

    try {
      await this.reflector.reflectAndRemember(this.currentState, returnsLosses, {
        bullMemory: this.bullMemory,
        bearMemory: this.bearMemory,
        traderMemory: this.traderMemory,
        investJudgeMemory: this.investJudgeMemory,
        riskManagerMemory: this.riskManagerMemory
      });

      if (this.debug) {
        console.log('Reflection completed and memories updated');
      }
    } catch (error) {
      console.error('Error during reflection:', error);
    }
  }

  /**
   * Process a signal to extract the core decision
   */
  async processSignal(fullSignal: string): Promise<string> {
    try {
      return await this.signalProcessor.processSignal(fullSignal);
    } catch (error) {
      console.error('Error processing signal:', error);
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
    llmProvider: string;
    debug: boolean;
    projectDir: string;
  } {
    return {
      selectedAnalysts: this.selectedAnalysts,
      llmProvider: this.config.llmProvider,
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
      console.log('TradingAgentsGraph cleanup completed');
    }
  }
}

/**
 * Create a new TradingAgentsGraph instance
 */
export function createTradingAgentsGraph(options?: TradingAgentsGraphConfig): TradingAgentsGraph {
  return new TradingAgentsGraph(options);
}