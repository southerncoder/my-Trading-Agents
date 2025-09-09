/**
 * Dynamic Model Discovery Configuration for Remote LM Studio
 *
 * This file dynamically discovers available models from the remote LM Studio instance
 * and assigns them to different trading agent types based on their capabilities and performance.
 *
 * Features:
 * - Automatic model discovery from LM Studio API
 * - Dynamic model assignment based on capabilities
 * - Real-time performance profiling
 * - Adaptive test scenario generation
 *
 * SECURITY REQUIREMENTS:
 * - REMOTE_LM_STUDIO_URL environment variable MUST be set
 * - Never hardcode server URLs, IPs, or ports in source code
 * - Use environment variables for all network endpoints
 * - LM Studio does NOT run on port 1234 by default
 */

import { ModelConfig } from '../../src/models/provider';
import { TradingAgentsConfig } from '../../src/types/config';

// Remote LM Studio configuration - REQUIRES environment variable for security
const getRemoteLMStudioBaseURL = (): string => {
  const url = process.env.REMOTE_LM_STUDIO_URL;
  if (!url) {
    throw new Error(
      '🚨 SECURITY ERROR: REMOTE_LM_STUDIO_URL environment variable is required.\n' +
      'Set REMOTE_LM_STUDIO_URL=http://your-lm-studio-server:port/v1\n' +
      'Example: REMOTE_LM_STUDIO_URL=http://192.168.1.100:8080/v1\n' +
      'Note: LM Studio does NOT run on port 1234 by default'
    );
  }

  // Validate URL format
  try {
    const parsedUrl = new URL(url);
    if (!parsedUrl.protocol.startsWith('http')) {
      throw new Error('Invalid protocol');
    }
    return url;
  } catch (error) {
    throw new Error(
      `🚨 SECURITY ERROR: Invalid REMOTE_LM_STUDIO_URL format: ${url}\n` +
      'Expected format: http://host:port/v1 or https://host:port/v1'
    );
  }
};

export const REMOTE_LM_STUDIO_BASE_URL = getRemoteLMStudioBaseURL();

// Model capability detection patterns
const MODEL_CAPABILITY_PATTERNS = {
  reasoning: ['reasoning', 'thinking', 'phi', 'qwen.*thinking'],
  analysis: ['analysis', 'research', 'gemma', 'mistral.*instruct'],
  fast: ['1\\.7b', 'small', 'fast', 'quick'],
  large: ['14b', '20b', 'large', 'gpt-oss'],
  creative: ['dolphin', 'creative', 'uncensored'],
  specialized: ['rag', 'context', 'obedient']
} as const;

// Model size estimation from name patterns
const MODEL_SIZE_PATTERNS = {
  small: ['1\\.7b', 'small', 'mini', '1b', '2b', '3b'],
  medium: ['4b', '5b', '6b', '7b', '8b', '9b', '10b', '11b', '12b', '13b'],
  large: ['14b', '15b', '16b', '17b', '18b', '19b', '20b', '21b', '22b', '23b', '24b', '25b', '30b', '40b', '70b', 'large', 'gpt-oss', 'phi-4', 'phi4']
} as const;

/**
 * Interface for discovered model information
 */
interface DiscoveredModel {
  id: string;
  name: string;
  size: 'small' | 'medium' | 'large';
  capabilities: string[];
  estimatedParams: number;
  speed: 'fast' | 'medium' | 'slow';
  quality: 'good' | 'very_good' | 'excellent';
}

/**
 * Fetch available models from LM Studio server
 */
export async function fetchAvailableModels(): Promise<DiscoveredModel[]> {
  try {
    const response = await fetch(`${REMOTE_LM_STUDIO_BASE_URL}/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      console.warn(`⚠️ Failed to fetch models from LM Studio: ${response.status}`);
      return getFallbackModels();
    }

    const data = await response.json();
    const models = data.data || [];

    return models.map((model: any) => discoverModelCapabilities(model.id));
  } catch (error) {
    console.warn('⚠️ Could not connect to LM Studio, using fallback model list:', error);
    return getFallbackModels();
  }
}

/**
 * Analyze model name to determine capabilities and characteristics
 */
export function discoverModelCapabilities(modelName: string): DiscoveredModel {
  const name = modelName.toLowerCase();

  // Determine capabilities based on name patterns
  const capabilities: string[] = [];
  Object.entries(MODEL_CAPABILITY_PATTERNS).forEach(([capability, patterns]) => {
    if (patterns.some(pattern => new RegExp(pattern, 'i').test(name))) {
      capabilities.push(capability);
    }
  });

  // Estimate model size
  let size: 'small' | 'medium' | 'large' = 'medium';
  if (MODEL_SIZE_PATTERNS.small.some(pattern => new RegExp(pattern, 'i').test(name))) {
    size = 'small';
  } else if (MODEL_SIZE_PATTERNS.large.some(pattern => new RegExp(pattern, 'i').test(name))) {
    size = 'large';
  }

  // Estimate parameter count
  let estimatedParams = 7; // Default 7B
  const paramMatch = name.match(/(\d+(?:\.\d+)?)b/i);
  if (paramMatch) {
    estimatedParams = parseFloat(paramMatch[1]);
  }

  // Determine speed and quality based on size and capabilities
  let speed: 'fast' | 'medium' | 'slow' = 'medium';
  let quality: 'good' | 'very_good' | 'excellent' = 'very_good';

  if (size === 'small') {
    speed = 'fast';
    quality = 'good';
  } else if (size === 'large') {
    speed = 'slow';
    quality = 'excellent';
  }

  if (capabilities.includes('reasoning')) {
    quality = 'excellent';
  }

  return {
    id: modelName,
    name: modelName,
    size,
    capabilities,
    estimatedParams,
    speed,
    quality
  };
}

/**
 * Fallback models when LM Studio is not available
 */
export function getFallbackModels(): DiscoveredModel[] {
  return [
    {
      id: 'microsoft/phi-4-reasoning-plus',
      name: 'microsoft/phi-4-reasoning-plus',
      size: 'large',
      capabilities: ['reasoning', 'analysis'],
      estimatedParams: 14.7,
      speed: 'medium',
      quality: 'excellent'
    },
    {
      id: 'qwen/qwen3-1.7b',
      name: 'qwen/qwen3-1.7b',
      size: 'small',
      capabilities: ['fast'],
      estimatedParams: 1.7,
      speed: 'fast',
      quality: 'good'
    },
    {
      id: 'qwen/qwen3-4b-thinking-2507',
      name: 'qwen/qwen3-4b-thinking-2507',
      size: 'medium',
      capabilities: ['reasoning', 'analysis'],
      estimatedParams: 4,
      speed: 'medium',
      quality: 'very_good'
    },
    {
      id: 'mistralai_-_mistral-7b-instruct-v0.3',
      name: 'mistralai_-_mistral-7b-instruct-v0.3',
      size: 'medium',
      capabilities: ['analysis'],
      estimatedParams: 7,
      speed: 'medium',
      quality: 'very_good'
    },
    {
      id: 'dolphin-2.9-llama3-8b',
      name: 'dolphin-2.9-llama3-8b',
      size: 'medium',
      capabilities: ['creative'],
      estimatedParams: 8,
      speed: 'medium',
      quality: 'very_good'
    },
    {
      id: 'google/gemma-3-12b',
      name: 'google/gemma-3-12b',
      size: 'large',
      capabilities: ['analysis'],
      estimatedParams: 12,
      speed: 'medium',
      quality: 'very_good'
    }
  ];
}

/**
 * Dynamically assign models to agent types based on capabilities
 */
export async function createDynamicModelAssignments(): Promise<Record<string, ModelConfig>> {
  const models = await fetchAvailableModels();

  // Sort models by quality and speed for optimal assignments
  const sortedModels = models.sort((a, b) => {
    const qualityOrder = { excellent: 3, very_good: 2, good: 1 };
    const speedOrder = { fast: 3, medium: 2, slow: 1 };

    const aScore = qualityOrder[a.quality] * 2 + speedOrder[a.speed];
    const bScore = qualityOrder[b.quality] * 2 + speedOrder[b.speed];

    return bScore - aScore;
  });

  // Find best models for each agent type
  const findBestModel = (requiredCapabilities: string[], preferredSize?: 'small' | 'medium' | 'large') => {
    return sortedModels.find(model =>
      requiredCapabilities.some(cap => model.capabilities.includes(cap)) &&
      (!preferredSize || model.size === preferredSize)
    ) || sortedModels[0]; // Fallback to best available
  };

  const assignments: Record<string, ModelConfig> = {};

  // Quick thinking - prioritize speed
  const quickModel = findBestModel(['fast'], 'small') || sortedModels.find(m => m.speed === 'fast') || sortedModels[0];
  assignments.quickThinking = {
    provider: 'lm_studio' as const,
    modelName: quickModel.id,
    baseURL: REMOTE_LM_STUDIO_BASE_URL,
    temperature: 0.5,
    maxTokens: 1024
  };

  // Deep thinking - prioritize reasoning and quality
  const deepModel = findBestModel(['reasoning'], 'large') || sortedModels.find(m => m.quality === 'excellent') || sortedModels[0];
  assignments.deepThinking = {
    provider: 'lm_studio' as const,
    modelName: deepModel.id,
    baseURL: REMOTE_LM_STUDIO_BASE_URL,
    temperature: 0.3,
    maxTokens: 2048
  };

  // Specialized assignments
  assignments.marketAnalyst = {
    provider: 'lm_studio' as const,
    modelName: findBestModel(['reasoning', 'analysis']).id,
    baseURL: REMOTE_LM_STUDIO_BASE_URL,
    temperature: 0.2,
    maxTokens: 1536
  };

  assignments.newsAnalyst = {
    provider: 'lm_studio' as const,
    modelName: findBestModel(['analysis']).id,
    baseURL: REMOTE_LM_STUDIO_BASE_URL,
    temperature: 0.4,
    maxTokens: 1536
  };

  assignments.socialAnalyst = {
    provider: 'lm_studio' as const,
    modelName: findBestModel(['creative']).id,
    baseURL: REMOTE_LM_STUDIO_BASE_URL,
    temperature: 0.6,
    maxTokens: 1536
  };

  assignments.fundamentalsAnalyst = {
    provider: 'lm_studio' as const,
    modelName: findBestModel(['analysis'], 'large').id,
    baseURL: REMOTE_LM_STUDIO_BASE_URL,
    temperature: 0.3,
    maxTokens: 2048
  };

  assignments.researchManager = {
    provider: 'lm_studio' as const,
    modelName: deepModel.id, // Use same as deep thinking
    baseURL: REMOTE_LM_STUDIO_BASE_URL,
    temperature: 0.2,
    maxTokens: 2048
  };

  assignments.riskManager = {
    provider: 'lm_studio' as const,
    modelName: findBestModel(['reasoning'], 'large').id,
    baseURL: REMOTE_LM_STUDIO_BASE_URL,
    temperature: 0.1,
    maxTokens: 2048
  };

  assignments.trader = {
    provider: 'lm_studio' as const,
    modelName: findBestModel(['fast']).id,
    baseURL: REMOTE_LM_STUDIO_BASE_URL,
    temperature: 0.4,
    maxTokens: 1024
  };

  // Specialized models
  assignments.ragOptimized = {
    provider: 'lm_studio' as const,
    modelName: findBestModel(['specialized']).id,
    baseURL: REMOTE_LM_STUDIO_BASE_URL,
    temperature: 0.3,
    maxTokens: 1536
  };

  assignments.largeContext = {
    provider: 'lm_studio' as const,
    modelName: findBestModel([], 'large').id,
    baseURL: REMOTE_LM_STUDIO_BASE_URL,
    temperature: 0.3,
    maxTokens: 3072
  };

  return assignments;
}

/**
 * Generate dynamic performance profiles based on discovered models
 */
export async function generateDynamicPerformanceProfiles(): Promise<Record<string, any>> {
  const models = await fetchAvailableModels();
  const profiles: Record<string, any> = {};

  models.forEach(model => {
    profiles[model.id] = {
      parameters: `${model.estimatedParams}B`,
      specialty: model.capabilities.join(', ') || 'General purpose',
      speed: model.speed,
      quality: model.quality,
      useCase: generateUseCaseDescription(model),
      strengths: generateStrengthsList(model),
      idealFor: generateIdealForList(model)
    };
  });

  return profiles;
}

/**
 * Helper functions for profile generation
 */
function generateUseCaseDescription(model: DiscoveredModel): string {
  if (model.capabilities.includes('reasoning')) {
    return 'Complex analytical tasks, research management';
  } else if (model.capabilities.includes('fast')) {
    return 'Quick responses, real-time analysis';
  } else if (model.capabilities.includes('creative')) {
    return 'Social media analysis, creative tasks';
  } else if (model.capabilities.includes('specialized')) {
    return 'Context-aware information retrieval';
  } else {
    return 'General analysis and processing tasks';
  }
}

function generateStrengthsList(model: DiscoveredModel): string[] {
  const strengths = [];

  if (model.capabilities.includes('reasoning')) {
    strengths.push('Mathematical reasoning', 'Complex problem solving');
  }
  if (model.capabilities.includes('analysis')) {
    strengths.push('Pattern analysis', 'Text analysis');
  }
  if (model.speed === 'fast') {
    strengths.push('Speed', 'Efficiency');
  }
  if (model.quality === 'excellent') {
    strengths.push('High quality output', 'Detailed reasoning');
  }
  if (model.capabilities.includes('creative')) {
    strengths.push('Creative analysis', 'Uncensored responses');
  }

  return strengths.length > 0 ? strengths : ['General purpose AI capabilities'];
}

function generateIdealForList(model: DiscoveredModel): string[] {
  const idealFor = [];

  if (model.capabilities.includes('reasoning')) {
    idealFor.push('ResearchManager', 'RiskManager');
  }
  if (model.capabilities.includes('analysis')) {
    idealFor.push('MarketAnalyst', 'NewsAnalyst');
  }
  if (model.speed === 'fast') {
    idealFor.push('QuickThinking', 'RealTimeAlerts');
  }
  if (model.capabilities.includes('creative')) {
    idealFor.push('SocialAnalyst', 'SentimentAnalyst');
  }
  if (model.size === 'large') {
    idealFor.push('ComprehensiveAnalysis', 'LargeContextTasks');
  }

  return idealFor.length > 0 ? idealFor : ['GeneralAnalysis'];
}

/**
 * Create model configurations for different agent types
 */
export async function createAgentModelConfigs(): Promise<{
  quickThinking: ModelConfig;
  deepThinking: ModelConfig;
  specialized: Record<string, ModelConfig>;
}> {
  const assignments = await createDynamicModelAssignments();

  return {
    quickThinking: assignments.quickThinking,
    deepThinking: assignments.deepThinking,
    specialized: {
      marketAnalyst: assignments.marketAnalyst,
      newsAnalyst: assignments.newsAnalyst,
      socialAnalyst: assignments.socialAnalyst,
      fundamentalsAnalyst: assignments.fundamentalsAnalyst,
      researchManager: assignments.researchManager,
      riskManager: assignments.riskManager,
      trader: assignments.trader,
      ragOptimized: assignments.ragOptimized,
      largeContext: assignments.largeContext
    }
  };
}

/**
 * Create trading agents configuration for remote LM Studio testing
 */
export async function createRemoteLMStudioConfig(): Promise<TradingAgentsConfig> {
  const assignments = await createDynamicModelAssignments();

  return {
    projectDir: process.cwd(),
    resultsDir: './results',
    dataDir: './data',
    dataCacheDir: './data/cache',
    exportsDir: './exports',
    logsDir: './logs',
    llmProvider: 'lm_studio',
    backendUrl: REMOTE_LM_STUDIO_BASE_URL,
    deepThinkLlm: assignments.deepThinking.modelName,
    quickThinkLlm: assignments.quickThinking.modelName,
    maxDebateRounds: 3,
    maxRiskDiscussRounds: 3,
    maxRecurLimit: 10,
    onlineTools: true // Enable for more comprehensive testing
  };
}

/**
 * Get dynamic performance profiles
 */
export async function getDynamicPerformanceProfiles(): Promise<Record<string, any>> {
  return generateDynamicPerformanceProfiles();
}

/**
 * Get discovered models information
 */
export async function getDiscoveredModels(): Promise<DiscoveredModel[]> {
  return fetchAvailableModels();
}

/**
 * Generate dynamic test scenarios based on available models
 */
export async function generateDynamicTestScenarios(): Promise<Record<string, any>> {
  const assignments = await createDynamicModelAssignments();

  return {
    // Scenario 1: Lightweight and fast
    lightweightSetup: {
      quickThinking: assignments.quickThinking,
      deepThinking: assignments.marketAnalyst,
      description: 'Fast setup for quick testing and development'
    },

    // Scenario 2: Balanced performance
    balancedSetup: {
      quickThinking: assignments.quickThinking,
      deepThinking: assignments.fundamentalsAnalyst,
      description: 'Balanced setup for comprehensive testing'
    },

    // Scenario 3: Maximum quality
    premiumSetup: {
      quickThinking: assignments.marketAnalyst,
      deepThinking: assignments.deepThinking,
      description: 'High-quality setup for production testing'
    },

    // Scenario 4: Specialized tasks
    specializedSetup: {
      quickThinking: assignments.newsAnalyst,
      deepThinking: assignments.largeContext,
      description: 'Specialized setup for complex analytical tasks'
    }
  };
}

// Legacy exports for backward compatibility
export const TRADING_AGENT_MODEL_ASSIGNMENTS = {}; // Will be populated dynamically
export const MODEL_PERFORMANCE_PROFILES = {}; // Will be populated dynamically
export const TEST_SCENARIOS = {}; // Will be populated dynamically

export default {
  REMOTE_LM_STUDIO_BASE_URL,
  createAgentModelConfigs,
  createRemoteLMStudioConfig,
  getDynamicPerformanceProfiles,
  getDiscoveredModels,
  generateDynamicTestScenarios,
  // Internal functions for testing
  fetchAvailableModels,
  discoverModelCapabilities,
  createDynamicModelAssignments,
  generateDynamicPerformanceProfiles,
  getFallbackModels
};