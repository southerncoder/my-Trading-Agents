/**
 * Trading Agents Configuration Types
 */

export interface TradingAgentsConfig {
  // Directory settings
  projectDir: string;
  resultsDir: string;
  dataDir: string;
  dataCacheDir: string;

  // LLM settings
  llmProvider: LLMProvider;
  deepThinkLlm: string;
  quickThinkLlm: string;
  backendUrl: string;

  // Debate and discussion settings
  maxDebateRounds: number;
  maxRiskDiscussRounds: number;
  maxRecurLimit: number;

  // Tool settings
  onlineTools: boolean;

  // API Keys (optional, can be set via environment)
  openaiApiKey?: string | undefined;
  anthropicApiKey?: string | undefined;
  googleApiKey?: string | undefined;
  finnhubApiKey?: string | undefined;
  redditClientId?: string | undefined;
  redditClientSecret?: string | undefined;
  redditUsername?: string | undefined;
  redditPassword?: string | undefined;
}

export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'lm_studio' | 'ollama' | 'openrouter';

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