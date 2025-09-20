/**
 * Trading Agents Configuration Types
 *
 * SECURITY NOTICE:
 * These interfaces should NOT contain sensitive information like API keys, secrets, or credentials.
 * All sensitive data MUST be handled through environment variables only.
 */

export interface TradingAgentsConfig {
  // Directory settings
  projectDir: string;
  resultsDir: string;
  dataDir: string;
  dataCacheDir: string;
  exportsDir: string;
  logsDir: string;

  // LLM settings - provider and model are now specified in config.json
  // Provider may be derived at runtime when absent (enforcement adds provider)
  llmProvider?: string; // optional, resolved later
  deepThinkLlm: string;
  quickThinkLlm: string;

  // Debate and discussion settings
  maxDebateRounds: number;
  maxRiskDiscussRounds: number;
  maxRecurLimit: number;

  // Tool settings
  onlineTools: boolean;

  // Data source paths
  simfinDataPath?: string | undefined;
}

export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'ollama' | 'openrouter' | 'local_lmstudio' | 'remote_lmstudio';

export interface AnalystConfig {
  type: AnalystType;
  enabled: boolean;
}

export type AnalystType = 'market' | 'social' | 'news' | 'fundamentals';

export interface DebateState {
  bullHistory: string[];
  bearHistory: string[];
  history: string[];
  currentResponse: string;
  judgeDecision: string;
}

export interface RiskDebateState {
  riskyHistory: string[];
  safeHistory: string[];
  neutralHistory: string[];
  history: string[];
  judgeDecision: string;
}

export interface AgentState {
  companyOfInterest: string;
  tradeDate: string;
  marketReport: string;
  sentimentReport: string;
  newsReport: string;
  fundamentalsReport: string;
  investmentDebateState: DebateState;
  traderInvestmentPlan: string;
  riskDebateState: RiskDebateState;
  investmentPlan: string;
  finalTradeDecision: string;
  messages: any[];
}

export interface InvestDebateState extends DebateState {
  // Specific to investment debate
}

export interface MemoryConfig {
  name: string;
  config: TradingAgentsConfig;
}

/**
 * CLI Configuration File Types
 * Configuration file structure for tradingagents CLI
 *
 * SECURITY NOTICE:
 * This config file contains ONLY non-sensitive configuration.
 * All API keys, secrets, URLs, and credentials MUST remain in environment variables.
 * DO NOT add sensitive information to config.json files.
 */
export interface TradingAgentsCLIConfig {
  // Version of the configuration format
  version: string;

  // Analysis configuration
  analysis: {
    // Default ticker for analysis
    defaultTicker?: string;

    // Default analysis date (YYYY-MM-DD)
    defaultAnalysisDate?: string;

    // Default analysts to enable
    defaultAnalysts?: AnalystType[];

    // Default research depth
    defaultResearchDepth?: number;

    // Default LLM provider - DEPRECATED: Use models section instead
    defaultLLMProvider?: LLMProvider;

    // Model configurations for different agent types
    models: {
      // Quick thinking models (for fast analysis, market scanning)
      quickThinking: {
        provider: LLMProvider;
        model: string;
      };

      // Deep thinking models (for detailed analysis, research)
      deepThinking: {
        provider: LLMProvider;
        model: string;
      };

      // Agent-specific model overrides
      agentOverrides?: {
        marketAnalyst?: {
          provider: LLMProvider;
          model: string;
        };
        socialAnalyst?: {
          provider: LLMProvider;
          model: string;
        };
        newsAnalyst?: {
          provider: LLMProvider;
          model: string;
        };
        fundamentalsAnalyst?: {
          provider: LLMProvider;
          model: string;
        };
        researchManager?: {
          provider: LLMProvider;
          model: string;
        };
        riskManager?: {
          provider: LLMProvider;
          model: string;
        };
        trader?: {
          provider: LLMProvider;
          model: string;
        };
      };

      // Embedding model configuration (for memory and vector operations)
      embedding?: {
        provider: LLMProvider;
        model: string;
      };
    };
  };

  // Flow control settings
  flow: {
    // Debate and discussion rounds
    maxDebateRounds: number;
    maxRiskDiscussRounds: number;
    maxRecursionLimit: number;

    // Tool and data source settings
    enableOnlineTools: boolean;

    // Performance settings
    enableConnectionPooling?: boolean;
    enableIntelligentCaching?: boolean;
    enableLazyLoading?: boolean;
    enableStateOptimization?: boolean;

    // Memory and learning settings
    enableAdvancedMemory?: boolean;
    enableLearningSystem?: boolean;
    enableTemporalReasoning?: boolean;

    // Agent execution settings
    runMode?: 'standard' | 'fast' | 'safe';
    timeout?: number; // ms
    parallelism?: number;
    maxTokens?: number;
    temperature?: number; // 0-2
  };

  // Logging configuration
  logging: {
    // Default log level
    defaultLogLevel: 'debug' | 'info' | 'warn' | 'error' | 'critical';
    logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'critical';

    // Logging destinations
    enableFileLogging: boolean;
    enableConsoleLogging: boolean;

    // Verbose logging settings
    enableVerboseLogging: boolean;

    // Log file settings
    maxLogFiles?: number;
    maxLogSize?: string; // e.g., "10m", "100m"
  };

  // Export and reporting settings
  export: {
    // Default export format
    defaultFormat: 'json' | 'csv' | 'markdown' | 'html';

    // Export options
    includeReports: boolean;
    includeMetadata: boolean;
    includeRawData: boolean;
  };

  // Data source configurations (non-sensitive settings only)
  dataSources: {
    // Yahoo Finance settings
    yahooFinance: {
      enabled: boolean;
      cacheTimeout?: number; // in minutes
    };

    // Finnhub settings
    finnhub: {
      enabled: boolean;
      cacheTimeout?: number; // in minutes
    };

    // Reddit settings
    reddit: {
      enabled: boolean;
      cacheTimeout?: number; // in minutes
    };

    // Google News settings
    googleNews: {
      enabled: boolean;
      cacheTimeout?: number; // in minutes
    };

    // Technical indicators settings
    technicalIndicators: {
      enabled: boolean;
      indicators?: string[]; // RSI, MACD, etc.
    };
  };

  // Performance tuning
  performance?: {
    // Connection pool settings
    connectionPool?: {
      maxConnections?: number;
      idleTimeout?: number;
      acquireTimeout?: number;
    };

    // Cache settings
    cache?: {
      maxSize?: number;
      ttl?: number; // in seconds
      strategy?: 'lru' | 'lfu' | 'fifo';
    };

    // Memory optimization
    memory?: {
      enableGarbageCollection?: boolean;
      maxHeapSize?: string; // e.g., "1gb", "2gb"
    };
  };

  // Experimental features
  experimental?: {
    // Enable experimental features
    enableExperimentalFeatures: boolean;

    // Specific experimental features
    features?: {
      advancedPortfolioOptimization?: boolean;
      realTimeDataStreaming?: boolean;
      multiModalAnalysis?: boolean;
      quantumOptimization?: boolean;
    };
  };
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Configuration file loader options
 */
export interface ConfigLoadOptions {
  // Path to config file
  configPath?: string;

  // Whether to validate the configuration
  validate?: boolean;

  // Whether to merge with environment variables
  mergeWithEnv?: boolean;

  // Whether to create default config if file doesn't exist
  createDefaultIfMissing?: boolean;
}