/**
 * Remote LM Studio Configuration
 *
 * Configuration for remote LM Studio instance via environment variables
 * Defines model assignments for different trading agents
 */

export const REMOTE_LM_STUDIO_BASE_URL = process.env.REMOTE_LM_STUDIO_URL || 'http://localhost:1234/v1';

export interface AgentModelConfig {
  modelName: string;
  description: string;
  capabilities: string[];
  useCase: string;
}

/**
 * Model assignments for different trading agents
 * Each agent gets its own specialized model configuration
 */
export const TRADING_AGENT_MODEL_ASSIGNMENTS = {
  marketAnalyst: {
    modelName: 'llama-3.2-3b-instruct',
    description: 'Market analysis and trend identification',
    capabilities: ['market_analysis', 'trend_identification', 'technical_analysis'],
    useCase: 'Analyzing market data, identifying trends, and providing market insights'
  } as AgentModelConfig,

  newsAnalyst: {
    modelName: 'llama-3.2-3b-instruct',
    description: 'News sentiment analysis and impact assessment',
    capabilities: ['sentiment_analysis', 'news_processing', 'impact_assessment'],
    useCase: 'Processing news articles, analyzing sentiment, and assessing market impact'
  } as AgentModelConfig,

  socialAnalyst: {
    modelName: 'dolphin-2.9.4-llama3.1-8b', // Creative/uncensored model
    description: 'Social media sentiment and behavioral analysis',
    capabilities: ['social_sentiment', 'behavioral_analysis', 'creative_reasoning'],
    useCase: 'Analyzing social media trends, sentiment, and behavioral patterns'
  } as AgentModelConfig,

  fundamentalsAnalyst: {
    modelName: 'phi-4', // Strong reasoning model
    description: 'Fundamental analysis and financial modeling',
    capabilities: ['financial_analysis', 'valuation_modeling', 'quantitative_analysis'],
    useCase: 'Analyzing company fundamentals, financial statements, and valuation metrics'
  } as AgentModelConfig,

  riskManager: {
    modelName: 'llama-3.2-3b-instruct',
    description: 'Risk assessment and portfolio management',
    capabilities: ['risk_assessment', 'portfolio_optimization', 'stress_testing'],
    useCase: 'Assessing trading risks, managing portfolios, and stress testing scenarios'
  } as AgentModelConfig,

  portfolioManager: {
    modelName: 'llama-3.2-3b-instruct',
    description: 'Portfolio optimization and strategy execution',
    capabilities: ['portfolio_optimization', 'strategy_execution', 'performance_monitoring'],
    useCase: 'Optimizing portfolio allocation, executing trading strategies, and monitoring performance'
  } as AgentModelConfig,

  researchManager: {
    modelName: 'phi-4', // Strong reasoning for research coordination
    description: 'Research coordination and synthesis',
    capabilities: ['research_synthesis', 'coordination', 'strategic_planning'],
    useCase: 'Coordinating research efforts, synthesizing findings, and strategic planning'
  } as AgentModelConfig,

  bullResearcher: {
    modelName: 'llama-3.2-3b-instruct',
    description: 'Bullish market research and opportunity identification',
    capabilities: ['bullish_analysis', 'opportunity_identification', 'growth_modeling'],
    useCase: 'Researching bullish market opportunities and growth scenarios'
  } as AgentModelConfig,

  bearResearcher: {
    modelName: 'llama-3.2-3b-instruct',
    description: 'Bearish market research and risk identification',
    capabilities: ['bearish_analysis', 'risk_identification', 'defensive_strategies'],
    useCase: 'Researching bearish market scenarios and defensive strategies'
  } as AgentModelConfig,

  neutralResearcher: {
    modelName: 'llama-3.2-3b-instruct',
    description: 'Balanced market research and scenario analysis',
    capabilities: ['balanced_analysis', 'scenario_planning', 'risk_reward_analysis'],
    useCase: 'Providing balanced market analysis and risk-reward assessments'
  } as AgentModelConfig,

  trader: {
    modelName: 'llama-3.2-3b-instruct',
    description: 'Trade execution and market timing',
    capabilities: ['trade_execution', 'market_timing', 'order_management'],
    useCase: 'Executing trades, timing market entries/exits, and managing orders'
  } as AgentModelConfig
};

/**
 * Model performance profiles for different use cases
 */
export const MODEL_PERFORMANCE_PROFILES = {
  fast_response: {
    temperature: 0.3,
    maxTokens: 500,
    timeout: 10000,
    description: 'Fast responses for real-time trading decisions'
  },

  analytical: {
    temperature: 0.1,
    maxTokens: 2000,
    timeout: 30000,
    description: 'Detailed analysis for research and strategy development'
  },

  creative: {
    temperature: 0.7,
    maxTokens: 1500,
    timeout: 25000,
    description: 'Creative reasoning for innovative trading strategies'
  },

  conservative: {
    temperature: 0.0,
    maxTokens: 1000,
    timeout: 20000,
    description: 'Conservative, fact-based responses for risk management'
  }
};

/**
 * Network configuration for remote LM Studio
 */
export const REMOTE_LM_STUDIO_CONFIG = {
  baseUrl: REMOTE_LM_STUDIO_BASE_URL,
  adminUrl: process.env.LM_STUDIO_ADMIN_URL || 'http://localhost:1234',
  timeout: 30000,
  retryAttempts: 3,
  healthCheckInterval: 30000
};

/**
 * Get model configuration for a specific agent
 */
export function getAgentModelConfig(agentName: keyof typeof TRADING_AGENT_MODEL_ASSIGNMENTS): AgentModelConfig {
  return TRADING_AGENT_MODEL_ASSIGNMENTS[agentName];
}

/**
 * Get performance profile for a specific use case
 */
export function getPerformanceProfile(profileName: keyof typeof MODEL_PERFORMANCE_PROFILES) {
  return MODEL_PERFORMANCE_PROFILES[profileName];
}

/**
 * Create a complete model configuration for an agent
 */
export function createAgentModelConfig(
  agentName: keyof typeof TRADING_AGENT_MODEL_ASSIGNMENTS,
  performanceProfile: keyof typeof MODEL_PERFORMANCE_PROFILES = 'analytical'
) {
  const agentConfig = getAgentModelConfig(agentName);
  const profile = getPerformanceProfile(performanceProfile);

  return {
    provider: 'lm_studio' as const,
    modelName: agentConfig.modelName,
    baseURL: REMOTE_LM_STUDIO_BASE_URL,
    agentDescription: agentConfig.description,
    capabilities: agentConfig.capabilities,
    useCase: agentConfig.useCase,
    ...profile
  };
}