import path from 'path';
import { TradingAgentsConfig } from '@/types/config';

/**
 * Default configuration for the Trading Agents system
 */
export const DEFAULT_CONFIG: TradingAgentsConfig = {
  // Directory settings
  projectDir: process.cwd(),
  resultsDir: process.env.TRADINGAGENTS_RESULTS_DIR || './results',
  dataDir: process.env.TRADINGAGENTS_DATA_DIR || './data',
  dataCacheDir: path.join(process.cwd(), 'dataflows', 'data_cache'),

  // LLM settings
  llmProvider: (process.env.LLM_PROVIDER as any) || 'openai',
  deepThinkLlm: process.env.DEEP_THINK_LLM || 'o1-mini',
  quickThinkLlm: process.env.QUICK_THINK_LLM || 'gpt-4o-mini',
  backendUrl: process.env.LLM_BACKEND_URL || 
    (process.env.LLM_PROVIDER === 'lm_studio' ? 
      `http://${process.env.LM_STUDIO_HOST || 'localhost'}:1234/v1` : 
      'https://api.openai.com/v1'),

  // Debate and discussion settings
  maxDebateRounds: parseInt(process.env.MAX_DEBATE_ROUNDS || '1'),
  maxRiskDiscussRounds: parseInt(process.env.MAX_RISK_DISCUSS_ROUNDS || '1'),
  maxRecurLimit: parseInt(process.env.MAX_RECUR_LIMIT || '100'),

  // Tool settings
  onlineTools: process.env.ONLINE_TOOLS?.toLowerCase() === 'true' || true,

  // API Keys (from environment variables)
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  googleApiKey: process.env.GOOGLE_API_KEY,
  finnhubApiKey: process.env.FINNHUB_API_KEY,
  redditClientId: process.env.REDDIT_CLIENT_ID,
  redditClientSecret: process.env.REDDIT_CLIENT_SECRET,
  redditUsername: process.env.REDDIT_USERNAME,
  redditPassword: process.env.REDDIT_PASSWORD,
};

/**
 * Validates the configuration and throws errors for missing required values
 */
export function validateConfig(config: TradingAgentsConfig): void {
  const errors: string[] = [];

  // Check for required API keys based on LLM provider
  switch (config.llmProvider) {
    case 'openai':
    case 'openrouter':
      if (!config.openaiApiKey) {
        errors.push('OPENAI_API_KEY is required for OpenAI provider');
      }
      break;
    case 'anthropic':
      if (!config.anthropicApiKey) {
        errors.push('ANTHROPIC_API_KEY is required for Anthropic provider');
      }
      break;
    case 'google':
      if (!config.googleApiKey) {
        errors.push('GOOGLE_API_KEY is required for Google provider');
      }
      break;
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Creates a deep copy of the default configuration
 */
export function createConfig(overrides: Partial<TradingAgentsConfig> = {}): TradingAgentsConfig {
  return {
    ...DEFAULT_CONFIG,
    ...overrides,
  };
}

/**
 * Utility function to get environment variable with fallback
 */
export function getEnvVar(key: string, fallback: string = ''): string {
  return process.env[key] || fallback;
}

/**
 * Utility function to get boolean environment variable
 */
export function getEnvBool(key: string, fallback: boolean = false): boolean {
  const value = process.env[key];
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
}

/**
 * Utility function to get numeric environment variable
 */
export function getEnvNumber(key: string, fallback: number = 0): number {
  const value = process.env[key];
  if (value === undefined) return fallback;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}