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
  'market_analyst': 'marketAnalyst',
  'social': 'socialAnalyst',
  'social_analyst': 'socialAnalyst',
  'social_media_analyst': 'socialAnalyst',
  'news': 'newsAnalyst',
  'news_analyst': 'newsAnalyst',
  'fundamentals': 'fundamentalsAnalyst',
  'fundamentals_analyst': 'fundamentalsAnalyst',
  'bull': 'bullResearcher',
  'bull_researcher': 'bullResearcher',
  'bear': 'bearResearcher',
  'bear_researcher': 'bearResearcher',
  'research_manager': 'researchManager',
  'risky': 'riskyAnalyst',
  'risky_analyst': 'riskyAnalyst',
  'aggressive_debator': 'riskyAnalyst',
  'safe': 'safeAnalyst',
  'safe_analyst': 'safeAnalyst',
  'conservative_debator': 'safeAnalyst',
  'neutral': 'neutralAnalyst',
  'neutral_analyst': 'neutralAnalyst',
  'neutral_debator': 'neutralAnalyst',
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
 * Uses environment variables with sensible fallbacks
 */
export const DEFAULT_AGENT_CONFIGS: AgentTypeConfigs = {
  default: {
    provider: (process.env.DEFAULT_LLM_PROVIDER as LLMProvider) || 'openai',
    model: process.env.DEFAULT_LLM_MODEL || 'gpt-4o-mini',
    temperature: parseFloat(process.env.DEFAULT_LLM_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.DEFAULT_LLM_MAX_TOKENS || '2000'),
    timeout: parseInt(process.env.DEFAULT_LLM_TIMEOUT || '30000')
  },
  
  // Analysts - fast models for data processing
  // Each can be overridden by specific environment variables
  marketAnalyst: {
    provider: (process.env.MARKET_ANALYST_LLM_PROVIDER as LLMProvider) || 
              (process.env.ANALYSTS_LLM_PROVIDER as LLMProvider) || 
              (process.env.DEFAULT_LLM_PROVIDER as LLMProvider) || 'openai',
    model: process.env.MARKET_ANALYST_LLM_MODEL || 
           process.env.ANALYSTS_LLM_MODEL || 
           process.env.DEFAULT_LLM_MODEL || 'gpt-4o-mini',
    temperature: parseFloat(process.env.MARKET_ANALYST_LLM_TEMPERATURE || 
                           process.env.ANALYSTS_LLM_TEMPERATURE || '0.3'),
    maxTokens: parseInt(process.env.MARKET_ANALYST_LLM_MAX_TOKENS || 
                       process.env.ANALYSTS_LLM_MAX_TOKENS || '1500')
  },
  
  socialAnalyst: {
    provider: (process.env.SOCIAL_ANALYST_LLM_PROVIDER as LLMProvider) || 
              (process.env.ANALYSTS_LLM_PROVIDER as LLMProvider) || 
              (process.env.DEFAULT_LLM_PROVIDER as LLMProvider) || 'openai',
    model: process.env.SOCIAL_ANALYST_LLM_MODEL || 
           process.env.ANALYSTS_LLM_MODEL || 
           process.env.DEFAULT_LLM_MODEL || 'gpt-4o-mini',
    temperature: parseFloat(process.env.SOCIAL_ANALYST_LLM_TEMPERATURE || 
                           process.env.ANALYSTS_LLM_TEMPERATURE || '0.4'),
    maxTokens: parseInt(process.env.SOCIAL_ANALYST_LLM_MAX_TOKENS || 
                       process.env.ANALYSTS_LLM_MAX_TOKENS || '1500')
  },
  
  newsAnalyst: {
    provider: (process.env.NEWS_ANALYST_LLM_PROVIDER as LLMProvider) || 
              (process.env.ANALYSTS_LLM_PROVIDER as LLMProvider) || 
              (process.env.DEFAULT_LLM_PROVIDER as LLMProvider) || 'openai',
    model: process.env.NEWS_ANALYST_LLM_MODEL || 
           process.env.ANALYSTS_LLM_MODEL || 
           process.env.DEFAULT_LLM_MODEL || 'gpt-4o-mini',
    temperature: parseFloat(process.env.NEWS_ANALYST_LLM_TEMPERATURE || 
                           process.env.ANALYSTS_LLM_TEMPERATURE || '0.3'),
    maxTokens: parseInt(process.env.NEWS_ANALYST_LLM_MAX_TOKENS || 
                       process.env.ANALYSTS_LLM_MAX_TOKENS || '1500')
  },
  
  fundamentalsAnalyst: {
    provider: (process.env.FUNDAMENTALS_ANALYST_LLM_PROVIDER as LLMProvider) || 
              (process.env.ANALYSTS_LLM_PROVIDER as LLMProvider) || 
              (process.env.DEFAULT_LLM_PROVIDER as LLMProvider) || 'openai',
    model: process.env.FUNDAMENTALS_ANALYST_LLM_MODEL || 
           process.env.ANALYSTS_LLM_MODEL || 
           process.env.DEFAULT_LLM_MODEL || 'gpt-4o',
    temperature: parseFloat(process.env.FUNDAMENTALS_ANALYST_LLM_TEMPERATURE || 
                           process.env.ANALYSTS_LLM_TEMPERATURE || '0.2'),
    maxTokens: parseInt(process.env.FUNDAMENTALS_ANALYST_LLM_MAX_TOKENS || 
                       process.env.ANALYSTS_LLM_MAX_TOKENS || '2000')
  },
  
  // Researchers - more powerful models for complex reasoning
  bullResearcher: {
    provider: (process.env.BULL_RESEARCHER_LLM_PROVIDER as LLMProvider) || 
              (process.env.RESEARCHERS_LLM_PROVIDER as LLMProvider) || 
              (process.env.DEFAULT_LLM_PROVIDER as LLMProvider) || 'anthropic',
    model: process.env.BULL_RESEARCHER_LLM_MODEL || 
           process.env.RESEARCHERS_LLM_MODEL || 
           process.env.DEFAULT_LLM_MODEL || 'claude-3-5-sonnet-20241022',
    temperature: parseFloat(process.env.BULL_RESEARCHER_LLM_TEMPERATURE || 
                           process.env.RESEARCHERS_LLM_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.BULL_RESEARCHER_LLM_MAX_TOKENS || 
                       process.env.RESEARCHERS_LLM_MAX_TOKENS || '3000')
  },
  
  bearResearcher: {
    provider: (process.env.BEAR_RESEARCHER_LLM_PROVIDER as LLMProvider) || 
              (process.env.RESEARCHERS_LLM_PROVIDER as LLMProvider) || 
              (process.env.DEFAULT_LLM_PROVIDER as LLMProvider) || 'anthropic',
    model: process.env.BEAR_RESEARCHER_LLM_MODEL || 
           process.env.RESEARCHERS_LLM_MODEL || 
           process.env.DEFAULT_LLM_MODEL || 'claude-3-5-sonnet-20241022',
    temperature: parseFloat(process.env.BEAR_RESEARCHER_LLM_TEMPERATURE || 
                           process.env.RESEARCHERS_LLM_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.BEAR_RESEARCHER_LLM_MAX_TOKENS || 
                       process.env.RESEARCHERS_LLM_MAX_TOKENS || '3000')
  },
  
  researchManager: {
    provider: (process.env.RESEARCH_MANAGER_LLM_PROVIDER as LLMProvider) || 
              (process.env.MANAGERS_LLM_PROVIDER as LLMProvider) || 
              (process.env.DEFAULT_LLM_PROVIDER as LLMProvider) || 'openai',
    model: process.env.RESEARCH_MANAGER_LLM_MODEL || 
           process.env.MANAGERS_LLM_MODEL || 
           process.env.DEFAULT_LLM_MODEL || 'gpt-4o',
    temperature: parseFloat(process.env.RESEARCH_MANAGER_LLM_TEMPERATURE || 
                           process.env.MANAGERS_LLM_TEMPERATURE || '0.5'),
    maxTokens: parseInt(process.env.RESEARCH_MANAGER_LLM_MAX_TOKENS || 
                       process.env.MANAGERS_LLM_MAX_TOKENS || '3000')
  },
  
  // Risk Management - balanced models
  riskyAnalyst: {
    provider: (process.env.RISKY_ANALYST_LLM_PROVIDER as LLMProvider) || 
              (process.env.RISK_ANALYSTS_LLM_PROVIDER as LLMProvider) || 
              (process.env.DEFAULT_LLM_PROVIDER as LLMProvider) || 'openai',
    model: process.env.RISKY_ANALYST_LLM_MODEL || 
           process.env.RISK_ANALYSTS_LLM_MODEL || 
           process.env.DEFAULT_LLM_MODEL || 'gpt-4o',
    temperature: parseFloat(process.env.RISKY_ANALYST_LLM_TEMPERATURE || 
                           process.env.RISK_ANALYSTS_LLM_TEMPERATURE || '0.8'),
    maxTokens: parseInt(process.env.RISKY_ANALYST_LLM_MAX_TOKENS || 
                       process.env.RISK_ANALYSTS_LLM_MAX_TOKENS || '2000')
  },
  
  safeAnalyst: {
    provider: (process.env.SAFE_ANALYST_LLM_PROVIDER as LLMProvider) || 
              (process.env.RISK_ANALYSTS_LLM_PROVIDER as LLMProvider) || 
              (process.env.DEFAULT_LLM_PROVIDER as LLMProvider) || 'anthropic',
    model: process.env.SAFE_ANALYST_LLM_MODEL || 
           process.env.RISK_ANALYSTS_LLM_MODEL || 
           process.env.DEFAULT_LLM_MODEL || 'claude-3-5-sonnet-20241022',
    temperature: parseFloat(process.env.SAFE_ANALYST_LLM_TEMPERATURE || 
                           process.env.RISK_ANALYSTS_LLM_TEMPERATURE || '0.3'),
    maxTokens: parseInt(process.env.SAFE_ANALYST_LLM_MAX_TOKENS || 
                       process.env.RISK_ANALYSTS_LLM_MAX_TOKENS || '2000')
  },
  
  neutralAnalyst: {
    provider: (process.env.NEUTRAL_ANALYST_LLM_PROVIDER as LLMProvider) || 
              (process.env.RISK_ANALYSTS_LLM_PROVIDER as LLMProvider) || 
              (process.env.DEFAULT_LLM_PROVIDER as LLMProvider) || 'google',
    model: process.env.NEUTRAL_ANALYST_LLM_MODEL || 
           process.env.RISK_ANALYSTS_LLM_MODEL || 
           process.env.DEFAULT_LLM_MODEL || 'gemini-1.5-pro',
    temperature: parseFloat(process.env.NEUTRAL_ANALYST_LLM_TEMPERATURE || 
                           process.env.RISK_ANALYSTS_LLM_TEMPERATURE || '0.5'),
    maxTokens: parseInt(process.env.NEUTRAL_ANALYST_LLM_MAX_TOKENS || 
                       process.env.RISK_ANALYSTS_LLM_MAX_TOKENS || '2000')
  },
  
  portfolioManager: {
    provider: (process.env.PORTFOLIO_MANAGER_LLM_PROVIDER as LLMProvider) || 
              (process.env.MANAGERS_LLM_PROVIDER as LLMProvider) || 
              (process.env.DEFAULT_LLM_PROVIDER as LLMProvider) || 'openai',
    model: process.env.PORTFOLIO_MANAGER_LLM_MODEL || 
           process.env.MANAGERS_LLM_MODEL || 
           process.env.DEFAULT_LLM_MODEL || 'o1-mini',
    temperature: parseFloat(process.env.PORTFOLIO_MANAGER_LLM_TEMPERATURE || 
                           process.env.MANAGERS_LLM_TEMPERATURE || '0.4'),
    maxTokens: parseInt(process.env.PORTFOLIO_MANAGER_LLM_MAX_TOKENS || 
                       process.env.MANAGERS_LLM_MAX_TOKENS || '2500')
  },
  
  // Trader - precise model for trading decisions
  trader: {
    provider: (process.env.TRADER_LLM_PROVIDER as LLMProvider) || 
              (process.env.DEFAULT_LLM_PROVIDER as LLMProvider) || 'openai',
    model: process.env.TRADER_LLM_MODEL || 
           process.env.DEFAULT_LLM_MODEL || 'gpt-4o',
    temperature: parseFloat(process.env.TRADER_LLM_TEMPERATURE || '0.3'),
    maxTokens: parseInt(process.env.TRADER_LLM_MAX_TOKENS || '2000')
  }
};