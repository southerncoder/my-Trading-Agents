import { LLMProvider } from './config';

/**
 * Configuration for individual agent LLM settings
 */
export interface AgentLLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

/**
 * Configuration for different agent types
 */
export interface AgentTypeConfigs {
  // Analysts
  marketAnalyst?: AgentLLMConfig;
  socialAnalyst?: AgentLLMConfig;
  newsAnalyst?: AgentLLMConfig;
  fundamentalsAnalyst?: AgentLLMConfig;
  
  // Researchers
  bullResearcher?: AgentLLMConfig;
  bearResearcher?: AgentLLMConfig;
  researchManager?: AgentLLMConfig;
  
  // Risk Management
  riskyAnalyst?: AgentLLMConfig;
  safeAnalyst?: AgentLLMConfig;
  neutralAnalyst?: AgentLLMConfig;
  portfolioManager?: AgentLLMConfig;
  
  // Trader
  trader?: AgentLLMConfig;
  
  // Default fallback configuration
  default: AgentLLMConfig;
}

/**
 * Enhanced configuration that supports per-agent LLM providers
 */
export interface EnhancedTradingAgentsConfig {
  // Original config fields
  projectDir: string;
  resultsDir: string;
  dataDir: string;
  dataCacheDir: string;
  
  // Enhanced LLM configuration
  agents: AgentTypeConfigs;
  
  // Debate and discussion settings
  maxDebateRounds: number;
  maxRiskDiscussRounds: number;
  maxRecurLimit: number;
  
  // Tool settings
  onlineTools: boolean;
  
  // API Keys for data providers
  finnhubApiKey?: string;
  redditClientId?: string;
  redditClientSecret?: string;
  redditUsername?: string;
  redditPassword?: string;
  newsApiKey?: string;
  alphaVantageApiKey?: string;
}

/**
 * Agent type enumeration for configuration
 */
export type AgentConfigType = 
  | 'marketAnalyst'
  | 'socialAnalyst' 
  | 'newsAnalyst'
  | 'fundamentalsAnalyst'
  | 'bullResearcher'
  | 'bearResearcher'
  | 'researchManager'
  | 'riskyAnalyst'
  | 'safeAnalyst'
  | 'neutralAnalyst'
  | 'portfolioManager'
  | 'trader';

/**
 * Mapping from agent types to config keys
 */
export const AGENT_TYPE_TO_CONFIG_KEY: Record<string, AgentConfigType> = {
  'market': 'marketAnalyst',
  'social': 'socialAnalyst',
  'news': 'newsAnalyst',
  'fundamentals': 'fundamentalsAnalyst',
  'bull': 'bullResearcher',
  'bear': 'bearResearcher',
  'research_manager': 'researchManager',
  'risky': 'riskyAnalyst',
  'safe': 'safeAnalyst',
  'neutral': 'neutralAnalyst',
  'portfolio_manager': 'portfolioManager',
  'trader': 'trader'
};

/**
 * Provider-specific model options
 */
export const PROVIDER_MODEL_OPTIONS: Record<LLMProvider, string[]> = {
  openai: [
    'gpt-4o',
    'gpt-4o-mini', 
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo',
    'o1-preview',
    'o1-mini'
  ],
  anthropic: [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307'
  ],
  google: [
    'gemini-2.0-flash-exp',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.0-pro'
  ],
  lm_studio: [
    'local-model'
  ],
  ollama: [
    'llama3.1',
    'qwen2.5',
    'mistral',
    'codellama'
  ],
  openrouter: [
    'anthropic/claude-3.5-sonnet',
    'openai/gpt-4o',
    'meta-llama/llama-3.1-8b-instruct',
    'mistralai/mistral-7b-instruct'
  ]
};

/**
 * Default configurations for different agent roles
 */
export const DEFAULT_AGENT_CONFIGS: AgentTypeConfigs = {
  default: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2000,
    timeout: 30000
  },
  
  // Analysts - fast models for data processing
  marketAnalyst: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 1500
  },
  
  socialAnalyst: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.4,
    maxTokens: 1500
  },
  
  newsAnalyst: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 1500
  },
  
  fundamentalsAnalyst: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.2,
    maxTokens: 2000
  },
  
  // Researchers - more powerful models for complex reasoning
  bullResearcher: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.7,
    maxTokens: 3000
  },
  
  bearResearcher: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.7,
    maxTokens: 3000
  },
  
  researchManager: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.5,
    maxTokens: 3000
  },
  
  // Risk Management - balanced models
  riskyAnalyst: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.8,
    maxTokens: 2000
  },
  
  safeAnalyst: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.3,
    maxTokens: 2000
  },
  
  neutralAnalyst: {
    provider: 'google',
    model: 'gemini-1.5-pro',
    temperature: 0.5,
    maxTokens: 2000
  },
  
  portfolioManager: {
    provider: 'openai',
    model: 'o1-mini',
    temperature: 0.4,
    maxTokens: 2500
  },
  
  // Trader - precise model for trading decisions
  trader: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.3,
    maxTokens: 2000
  }
};