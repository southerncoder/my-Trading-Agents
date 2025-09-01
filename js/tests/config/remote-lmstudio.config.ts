/**
 * Integration Test Configuration for Remote LM Studio
 * 
 * This file assigns specific models from the remote LM Studio instance
 * to different trading agent types based on their capabilities and use cases.
 * 
 * Security Note: Uses environment variables to avoid hardcoding server details
 * Set REMOTE_LM_STUDIO_URL environment variable to configure the remote server
 * 
 * Available Models Analysis:
 * - microsoft/phi-4-reasoning-plus (14.7B params) - Best for reasoning/analysis
 * - mistralai/devstral-small-2507 (?) - Development focused, good for quick tasks
 * - qwen/qwen3-4b-thinking-2507 (4B params) - Thinking model, great for analysis
 * - qwen/qwen3-14b (14B params) - Large general purpose model
 * - qwen/qwen3-1.7b (1.7B params) - Fast, lightweight for quick responses
 * - google/gemma-3-12b (12B params) - Good balance of size/performance
 * - mistralai_-_mistral-7b-instruct-v0.3 (7B params) - Reliable instruct model
 * - dolphin-2.9-llama3-8b (8B params) - Uncensored, good for creative tasks
 * - phi-3-context-obedient-rag (?) - Specialized for RAG tasks
 * - openai/gpt-oss-20b (20B params) - Large model for complex tasks
 */

import { ModelConfig } from '../../src/models/provider';
import { TradingAgentsConfig } from '../../src/types/config';

// Remote LM Studio configuration - uses environment variable for security
export const REMOTE_LM_STUDIO_BASE_URL = process.env.REMOTE_LM_STUDIO_URL || 'http://localhost:1234/v1';

// Warn if using default localhost URL
if (!process.env.REMOTE_LM_STUDIO_URL) {
  console.warn('⚠️ REMOTE_LM_STUDIO_URL environment variable not set, using localhost default');
  console.warn('   Set REMOTE_LM_STUDIO_URL=http://your-lm-studio-server:port/v1 for remote testing');
}

/**
 * Model assignments optimized for different trading agent types
 */
export const TRADING_AGENT_MODEL_ASSIGNMENTS = {
  // ANALYTICAL AGENTS - Need reasoning and deep thinking
  deepThinking: {
    provider: 'lm_studio' as const,
    modelName: 'microsoft/phi-4-reasoning-plus', // 14.7B - Excellent reasoning capabilities
    baseURL: REMOTE_LM_STUDIO_BASE_URL,
    temperature: 0.3, // Lower temperature for more focused analysis
    maxTokens: 2048
  },
  
  // QUICK RESPONSE AGENTS - Need fast, efficient responses  
  quickThinking: {
    provider: 'lm_studio' as const,
    modelName: 'qwen/qwen3-1.7b', // 1.7B - Fast and efficient
    baseURL: REMOTE_LM_STUDIO_BASE_URL,
    temperature: 0.5, // Balanced creativity
    maxTokens: 1024
  },
  
  // SPECIFIC AGENT TYPE ASSIGNMENTS
  marketAnalyst: {
    provider: 'lm_studio' as const,
    modelName: 'qwen/qwen3-4b-thinking-2507', // 4B - Thinking model perfect for market analysis
    baseURL: REMOTE_LM_STUDIO_BASE_URL,
    temperature: 0.2, // Low temperature for analytical precision
    maxTokens: 1536,
    description: 'Specialized thinking model for market data analysis and pattern recognition'
  },
  
  newsAnalyst: {
    provider: 'lm_studio' as const,
    modelName: 'mistralai_-_mistral-7b-instruct-v0.3', // 7B - Great for text analysis and summarization
    baseURL: REMOTE_LM_STUDIO_BASE_URL,
    temperature: 0.4, // Moderate temperature for balanced analysis
    maxTokens: 1536,
    description: 'Instruction-tuned model excellent for news analysis and sentiment extraction'
  },
  
  socialAnalyst: {
    provider: 'lm_studio' as const,
    modelName: 'dolphin-2.9-llama3-8b', // 8B - Uncensored, good for social media content
    baseURL: REMOTE_LM_STUDIO_BASE_URL,
    temperature: 0.6, // Higher temperature for social content understanding
    maxTokens: 1536,
    description: 'Uncensored model trained on diverse datasets, ideal for social media analysis'
  },
  
  fundamentalsAnalyst: {
    provider: 'lm_studio' as const,
    modelName: 'google/gemma-3-12b', // 12B - Good balance for financial fundamentals
    baseURL: REMOTE_LM_STUDIO_BASE_URL,
    temperature: 0.3, // Lower temperature for financial accuracy
    maxTokens: 2048,
    description: 'Balanced model for comprehensive fundamental analysis'
  },
  
  researchManager: {
    provider: 'lm_studio' as const,
    modelName: 'microsoft/phi-4-reasoning-plus', // 14.7B - Best reasoning for research coordination
    baseURL: REMOTE_LM_STUDIO_BASE_URL,
    temperature: 0.2, // Very low for research accuracy
    maxTokens: 2048,
    description: 'Advanced reasoning model for research synthesis and management'
  },
  
  riskManager: {
    provider: 'lm_studio' as const,
    modelName: 'qwen/qwen3-14b', // 14B - Large model for comprehensive risk assessment
    baseURL: REMOTE_LM_STUDIO_BASE_URL,
    temperature: 0.1, // Very conservative for risk analysis
    maxTokens: 2048,
    description: 'Large general-purpose model for thorough risk evaluation'
  },
  
  trader: {
    provider: 'lm_studio' as const,
    modelName: 'mistralai/devstral-small-2507', // Development-focused, good for decision making
    baseURL: REMOTE_LM_STUDIO_BASE_URL,
    temperature: 0.4, // Balanced for trading decisions
    maxTokens: 1024,
    description: 'Development-focused model optimized for structured decision making'
  },
  
  // SPECIALIZED MODELS FOR SPECIFIC TASKS
  ragOptimized: {
    provider: 'lm_studio' as const,
    modelName: 'phi-3-context-obedient-rag', // Specialized for RAG tasks
    baseURL: REMOTE_LM_STUDIO_BASE_URL,
    temperature: 0.3,
    maxTokens: 1536,
    description: 'Specialized RAG model for context-aware information retrieval'
  },
  
  largeContext: {
    provider: 'lm_studio' as const,
    modelName: 'openai/gpt-oss-20b', // 20B - Largest model for complex tasks
    baseURL: REMOTE_LM_STUDIO_BASE_URL,
    temperature: 0.3,
    maxTokens: 3072,
    description: 'Large model for complex multi-step reasoning and large context tasks'
  }
} as const;

/**
 * Create model configurations for different agent types
 */
export function createAgentModelConfigs(): {
  quickThinking: ModelConfig;
  deepThinking: ModelConfig;
  specialized: Record<string, ModelConfig>;
} {
  return {
    quickThinking: TRADING_AGENT_MODEL_ASSIGNMENTS.quickThinking,
    deepThinking: TRADING_AGENT_MODEL_ASSIGNMENTS.deepThinking,
    specialized: {
      marketAnalyst: TRADING_AGENT_MODEL_ASSIGNMENTS.marketAnalyst,
      newsAnalyst: TRADING_AGENT_MODEL_ASSIGNMENTS.newsAnalyst,
      socialAnalyst: TRADING_AGENT_MODEL_ASSIGNMENTS.socialAnalyst,
      fundamentalsAnalyst: TRADING_AGENT_MODEL_ASSIGNMENTS.fundamentalsAnalyst,
      researchManager: TRADING_AGENT_MODEL_ASSIGNMENTS.researchManager,
      riskManager: TRADING_AGENT_MODEL_ASSIGNMENTS.riskManager,
      trader: TRADING_AGENT_MODEL_ASSIGNMENTS.trader,
      ragOptimized: TRADING_AGENT_MODEL_ASSIGNMENTS.ragOptimized,
      largeContext: TRADING_AGENT_MODEL_ASSIGNMENTS.largeContext
    }
  };
}

/**
 * Create trading agents configuration for remote LM Studio testing
 */
export function createRemoteLMStudioConfig(): TradingAgentsConfig {
  return {
    projectDir: process.cwd(),
    resultsDir: './results',
    dataDir: './data',
    dataCacheDir: './data/cache',
    exportsDir: './exports',
    logsDir: './logs',
    llmProvider: 'lm_studio',
    backendUrl: REMOTE_LM_STUDIO_BASE_URL,
    deepThinkLlm: 'microsoft/phi-4-reasoning-plus',
    quickThinkLlm: 'qwen/qwen3-1.7b',
    maxDebateRounds: 3,
    maxRiskDiscussRounds: 3,
    maxRecurLimit: 10,
    onlineTools: true // Enable for more comprehensive testing
  };
}

/**
 * Model performance characteristics for testing optimization
 */
export const MODEL_PERFORMANCE_PROFILES = {
  'microsoft/phi-4-reasoning-plus': {
    parameters: '14.7B',
    specialty: 'Advanced reasoning and analysis',
    speed: 'Medium',
    quality: 'Excellent',
    useCase: 'Complex analytical tasks, research management',
    strengths: ['Mathematical reasoning', 'Code analysis', 'Complex problem solving'],
    idealFor: ['ResearchManager', 'RiskManager', 'FundamentalsAnalyst']
  },
  'qwen/qwen3-4b-thinking-2507': {
    parameters: '4B',
    specialty: 'Thinking and step-by-step reasoning',
    speed: 'Fast',
    quality: 'Very Good',
    useCase: 'Market analysis, pattern recognition',
    strengths: ['Step-by-step thinking', 'Pattern analysis', 'Efficient reasoning'],
    idealFor: ['MarketAnalyst', 'TechnicalAnalyst']
  },
  'qwen/qwen3-1.7b': {
    parameters: '1.7B',
    specialty: 'Fast responses and efficiency',
    speed: 'Very Fast',
    quality: 'Good',
    useCase: 'Quick responses, real-time analysis',
    strengths: ['Speed', 'Efficiency', 'Low latency'],
    idealFor: ['QuickThinking', 'RealTimeAlerts', 'BasicAnalysis']
  },
  'mistralai_-_mistral-7b-instruct-v0.3': {
    parameters: '7B',
    specialty: 'Instruction following and text analysis',
    speed: 'Fast',
    quality: 'Very Good',
    useCase: 'News analysis, instruction following',
    strengths: ['Instruction following', 'Text analysis', 'Summarization'],
    idealFor: ['NewsAnalyst', 'ContentAnalyst']
  },
  'dolphin-2.9-llama3-8b': {
    parameters: '8B',
    specialty: 'Uncensored analysis and creativity',
    speed: 'Fast',
    quality: 'Very Good',
    useCase: 'Social media analysis, creative tasks',
    strengths: ['Uncensored responses', 'Creative analysis', 'Social understanding'],
    idealFor: ['SocialAnalyst', 'SentimentAnalyst']
  },
  'google/gemma-3-12b': {
    parameters: '12B',
    specialty: 'Balanced performance and reliability',
    speed: 'Medium',
    quality: 'Very Good',
    useCase: 'General analysis, balanced tasks',
    strengths: ['Balanced performance', 'Reliability', 'Versatility'],
    idealFor: ['FundamentalsAnalyst', 'GeneralAnalysis']
  },
  'qwen/qwen3-14b': {
    parameters: '14B',
    specialty: 'Large context and comprehensive analysis',
    speed: 'Medium',
    quality: 'Excellent',
    useCase: 'Risk analysis, comprehensive evaluation',
    strengths: ['Large context', 'Comprehensive analysis', 'Detailed reasoning'],
    idealFor: ['RiskManager', 'ComprehensiveAnalysis']
  },
  'openai/gpt-oss-20b': {
    parameters: '20B',
    specialty: 'Complex reasoning and large context',
    speed: 'Slow',
    quality: 'Excellent',
    useCase: 'Complex multi-step tasks, large context analysis',
    strengths: ['Complex reasoning', 'Large context', 'Multi-step analysis'],
    idealFor: ['ComplexResearch', 'LargeContextTasks']
  }
} as const;

/**
 * Test scenarios for different model combinations
 */
export const TEST_SCENARIOS = {
  // Scenario 1: Lightweight and fast
  lightweightSetup: {
    quickThinking: TRADING_AGENT_MODEL_ASSIGNMENTS.quickThinking,
    deepThinking: TRADING_AGENT_MODEL_ASSIGNMENTS.marketAnalyst,
    description: 'Fast setup for quick testing and development'
  },
  
  // Scenario 2: Balanced performance
  balancedSetup: {
    quickThinking: TRADING_AGENT_MODEL_ASSIGNMENTS.quickThinking,
    deepThinking: TRADING_AGENT_MODEL_ASSIGNMENTS.fundamentalsAnalyst,
    description: 'Balanced setup for comprehensive testing'
  },
  
  // Scenario 3: Maximum quality
  premiumSetup: {
    quickThinking: TRADING_AGENT_MODEL_ASSIGNMENTS.marketAnalyst,
    deepThinking: TRADING_AGENT_MODEL_ASSIGNMENTS.deepThinking,
    description: 'High-quality setup for production testing'
  },
  
  // Scenario 4: Specialized tasks
  specializedSetup: {
    quickThinking: TRADING_AGENT_MODEL_ASSIGNMENTS.newsAnalyst,
    deepThinking: TRADING_AGENT_MODEL_ASSIGNMENTS.largeContext,
    description: 'Specialized setup for complex analytical tasks'
  }
} as const;

export default {
  REMOTE_LM_STUDIO_BASE_URL,
  TRADING_AGENT_MODEL_ASSIGNMENTS,
  createAgentModelConfigs,
  createRemoteLMStudioConfig,
  MODEL_PERFORMANCE_PROFILES,
  TEST_SCENARIOS
};