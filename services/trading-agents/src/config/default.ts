import { TradingAgentsConfig } from '@/types/config';

/**
 * Default configuration for the Trading Agents system
 */
export const DEFAULT_CONFIG: TradingAgentsConfig = {
  // Directory settings
  projectDir: process.env.TRADINGAGENTS_PROJECT_DIR || './project',
  resultsDir: process.env.TRADINGAGENTS_RESULTS_DIR || './results',
  dataDir: process.env.TRADINGAGENTS_DATA_DIR || './data',
  dataCacheDir: process.env.TRADINGAGENTS_CACHE_DIR || './cache',
  exportsDir: process.env.TRADINGAGENTS_EXPORTS_DIR || './exports',
  logsDir: process.env.TRADINGAGENTS_LOGS_DIR || './logs',

  // LLM settings - provider and model are now specified in config.json
  deepThinkLlm: process.env.DEEP_THINK_LLM || 'o1-mini',
  quickThinkLlm: process.env.QUICK_THINK_LLM || 'gpt-4o-mini',

  // Debate and discussion settings
  maxDebateRounds: parseInt(process.env.MAX_DEBATE_ROUNDS || '1'),
  maxRiskDiscussRounds: parseInt(process.env.MAX_RISK_DISCUSS_ROUNDS || '1'),
  maxRecurLimit: parseInt(process.env.MAX_RECUR_LIMIT || '100'),

  // Tool settings
  onlineTools: process.env.ONLINE_TOOLS?.toLowerCase() === 'true' || true,
};

/**
 * Validates the configuration and throws errors for missing required values
 */
export function validateConfig(config: TradingAgentsConfig): void {
  const errors: string[] = [];

  // Basic validation - ensure required fields are present
  if (!config.deepThinkLlm) {
    errors.push('Deep thinking LLM model is required');
  }

  if (!config.quickThinkLlm) {
    errors.push('Quick thinking LLM model is required');
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