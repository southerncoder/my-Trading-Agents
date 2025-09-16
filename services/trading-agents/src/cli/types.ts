export enum AnalystType {
  MARKET = "market",
  SOCIAL = "social", 
  NEWS = "news",
  FUNDAMENTALS = "fundamentals"
}

export interface UserSelections {
  ticker: string;
  analysisDate: string;
  analysts: AnalystType[];
  researchDepth: number;
  llmProvider: string;
  shallowThinker: string;
  deepThinker: string;
  verboseLogging?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'critical';
}

export interface DepthOption {
  display: string;
  value: number;
}

export interface LLMOption {
  display: string;
  value: string;
}

export interface ProviderOption {
  display: string;
  url: string;
}

export interface AnalystOption {
  display: string;
  value: AnalystType;
}

export interface MessageEntry {
  timestamp: string;
  type: string;
  content: string;
}

export interface ToolCallEntry {
  timestamp: string;
  name: string;
  args: Record<string, any> | string;
}

export interface AgentStatuses {
  [agentName: string]: 'pending' | 'in_progress' | 'completed' | 'error';
}

export interface ReportSections {
  market_report?: string;
  sentiment_report?: string;
  news_report?: string;
  fundamentals_report?: string;
  investment_plan?: string;
  trader_investment_plan?: string;
  final_trade_decision?: string;
}