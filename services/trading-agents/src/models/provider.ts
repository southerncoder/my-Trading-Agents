/**
 * Model Provider Pattern for Trading Agents
 * 
 * Supports multiple LLM providers including LM Studio for local inference.
 * Each agent can have its own model instance and configuration.
 * 
 * All methods are async to support proper model initialization and
 * LM Studio's singleton pattern for model loading/unloading.
 */

import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { TradingAgentsConfig } from '../types/config';
import { LLMProviderFactory } from '../providers/llm-factory';
import { AgentLLMConfig } from '../types/agent-config';
import { getLMStudioSingleton } from './lmstudio-singleton';
import { createLogger } from '../utils/enhanced-logger';
import { getLMStudioBaseUrl } from '../utils/docker-secrets';

const logger = createLogger('system', 'ModelProvider');

export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'lm_studio' | 'ollama' | 'openrouter';

export interface ModelConfig {
  provider: LLMProvider;
  modelName: string;
  apiKey?: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
  timeout?: number;
}

export interface AgentModelConfig {
  agentName: string;
  quickThinkModel: ModelConfig;
  deepThinkModel?: ModelConfig; // Optional for agents that don't need deep thinking
}

/**
 * Model Provider Factory
 * Creates LLM instances based on configuration with async support
 */
export class ModelProvider {
  private static instances: Map<string, BaseChatModel> = new Map();

  /**
   * Create or retrieve a model instance asynchronously.
   * This is the primary method that should be used for all model creation.
   */
  static async createModelAsync(config: ModelConfig): Promise<BaseChatModel> {
    const cacheKey = this.getCacheKey(config);
    
    // Return cached instance if exists
    if (this.instances.has(cacheKey)) {
      logger.debug('createModelAsync', 'Returning cached model instance', {
        provider: config.provider,
        modelName: config.modelName,
        cacheKey
      });
      return this.instances.get(cacheKey)!;
    }

    logger.info('createModelAsync', 'Creating new model instance', {
      provider: config.provider,
      modelName: config.modelName,
      baseURL: config.baseURL
    });

    let model: BaseChatModel;

    if (config.provider === 'lm_studio') {
      // Use singleton pattern for LM Studio
      const lmStudioBaseUrl = config.baseURL || getLMStudioBaseUrl();
      const singleton = getLMStudioSingleton(lmStudioBaseUrl);
      model = await singleton.getModel(config);
      logger.info('createModelAsync', 'Created LM Studio model via singleton', {
        modelName: config.modelName,
        baseURL: lmStudioBaseUrl
      });
    } else {
      // Use LLMProviderFactory for all other providers
      const factoryConfig: AgentLLMConfig = {
        provider: config.provider as any,
        model: config.modelName
      };

      // Only add optional fields if they have values
      if (config.apiKey) {
        factoryConfig.apiKey = config.apiKey;
      }
      if (config.baseURL) {
        factoryConfig.baseUrl = config.baseURL;
      }
      if (config.temperature !== undefined) {
        factoryConfig.temperature = config.temperature;
      }
      if (config.maxTokens !== undefined) {
        factoryConfig.maxTokens = config.maxTokens;
      }
      if (config.timeout !== undefined) {
        factoryConfig.timeout = config.timeout;
      }

      model = await LLMProviderFactory.createLLM(factoryConfig);
      logger.info('createModelAsync', 'Created model via LLMProviderFactory', {
        provider: config.provider,
        modelName: config.modelName
      });
    }

    // Cache the instance (except for LM Studio which handles its own caching)
    if (config.provider !== 'lm_studio') {
      this.instances.set(cacheKey, model);
    }

    logger.info('createModelAsync', 'Successfully created model instance', {
      provider: config.provider,
      modelName: config.modelName,
      cached: config.provider !== 'lm_studio'
    });

    return model;
  }

  /**
   * Create a model instance based on configuration (DEPRECATED - use createModelAsync)
   * This method is kept for backward compatibility but should not be used for new code.
   * For LM Studio, this will create a basic model without proper singleton management.
   * 
   * @deprecated Use createModelAsync instead for proper async model initialization
   */
  static createModel(config: ModelConfig): BaseChatModel {
    logger.warn('createModel', 'Using deprecated sync createModel method', {
      provider: config.provider,
      modelName: config.modelName,
      warning: 'Use createModelAsync for proper async initialization'
    });

    // For backward compatibility, we'll create the model synchronously using the factory
    // This is not ideal but maintains compatibility
    const cacheKey = this.getCacheKey(config);
    
    // Return cached instance if exists
    if (this.instances.has(cacheKey)) {
      return this.instances.get(cacheKey)!;
    }

    // For non-LM Studio providers, we need to create synchronously
    // This is a limitation of the deprecated method
    if (config.provider === 'lm_studio') {
      // Use singleton pattern for LM Studio
      const lmStudioBaseUrl = config.baseURL || getLMStudioBaseUrl();
      const singleton = getLMStudioSingleton(lmStudioBaseUrl);
      // For sync compatibility, we'll use the async method but this is not ideal
      const _modelPromise = singleton.getModel(config);
      // This will throw an error in practice - deprecated method should not be used
      throw new Error('LM Studio requires async initialization. Use createModelAsync instead.');
    }

    // For other providers, create synchronously (not recommended)
    logger.error('createModel', 'Synchronous model creation not supported for non-LM Studio providers', {
      provider: config.provider,
      suggestion: 'Use createModelAsync instead'
    });
    throw new Error(`Synchronous model creation not supported for provider: ${config.provider}. Use createModelAsync instead.`);
  }

  /**
   * Create models for a specific agent (async version)
   */
  static async createAgentModelsAsync(agentConfig: AgentModelConfig): Promise<{
    quickThinking: BaseChatModel;
    deepThinking?: BaseChatModel;
  }> {
    logger.info('createAgentModelsAsync', 'Creating agent models', {
      agentName: agentConfig.agentName,
      hasDeepThinking: !!agentConfig.deepThinkModel
    });

    const quickThinking = await this.createModelAsync(agentConfig.quickThinkModel);
    const deepThinking = agentConfig.deepThinkModel 
      ? await this.createModelAsync(agentConfig.deepThinkModel)
      : undefined;

    const result: { quickThinking: BaseChatModel; deepThinking?: BaseChatModel } = {
      quickThinking
    };

    if (deepThinking) {
      result.deepThinking = deepThinking;
    }

    logger.info('createAgentModelsAsync', 'Successfully created agent models', {
      agentName: agentConfig.agentName,
      quickThinkingProvider: agentConfig.quickThinkModel.provider,
      deepThinkingProvider: agentConfig.deepThinkModel?.provider
    });

    return result;
  }

  /**
   * Create models for a specific agent (DEPRECATED - use createAgentModelsAsync)
   * 
   * @deprecated Use createAgentModelsAsync for proper async initialization
   */
  static createAgentModels(agentConfig: AgentModelConfig): {
    quickThinking: BaseChatModel;
    deepThinking?: BaseChatModel;
  } {
    logger.warn('createAgentModels', 'Using deprecated sync createAgentModels method', {
      agentName: agentConfig.agentName,
      warning: 'Use createAgentModelsAsync for proper async initialization'
    });

    const quickThinking = this.createModel(agentConfig.quickThinkModel);
    const deepThinking = agentConfig.deepThinkModel 
      ? this.createModel(agentConfig.deepThinkModel)
      : undefined;

    const result: { quickThinking: BaseChatModel; deepThinking?: BaseChatModel } = {
      quickThinking
    };

    if (deepThinking) {
      result.deepThinking = deepThinking;
    }

    return result;
  }

  /**
   * Create model configurations from TradingAgentsConfig
   */
  static createFromConfig(config: TradingAgentsConfig): {
    quickThinking: ModelConfig;
    deepThinking: ModelConfig;
  } {
    const apiKey = this.getApiKeyForProvider(config);
    const baseConfig = {
      provider: config.llmProvider as LLMProvider,
      baseURL: config.backendUrl,
      temperature: 0.7,
      maxTokens: 2048,
      streaming: false
    };

    const configWithKey = apiKey ? { ...baseConfig, apiKey } : baseConfig;

    return {
      quickThinking: {
        ...configWithKey,
        modelName: config.quickThinkLlm
      },
      deepThinking: {
        ...configWithKey,
        modelName: config.deepThinkLlm
      }
    };
  }

  /**
   * Get the appropriate API key for a provider
   */
  private static getApiKeyForProvider(config: TradingAgentsConfig): string | undefined {
    switch (config.llmProvider) {
      case 'openai':
      case 'openrouter':
        return config.openaiApiKey;
      case 'anthropic':
        return config.anthropicApiKey;
      case 'google':
        return config.googleApiKey;
      case 'lm_studio':
      case 'ollama':
        return undefined; // Local providers don't need API keys
      default:
        return undefined;
    }
  }

  /**
   * Generate a cache key for model instances
   */
  private static getCacheKey(config: ModelConfig): string {
    return `${config.provider}-${config.modelName}-${config.baseURL || 'default'}`;
  }

  /**
   * Clear cached model instances
   */
  static clearCache(): void {
    this.instances.clear();
  }

  /**
   * Preload model for LM Studio (noop for other providers)
   */
  static async preloadModel(config: ModelConfig): Promise<void> {
    if (config.provider !== 'lm_studio') return;
    const baseUrl = config.baseURL || process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1';
    const { LMStudioManager } = await import('./lmstudio-manager');
    await LMStudioManager.preloadModel(config.modelName, baseUrl);
  }

  /**
   * Get LM Studio configuration for local or network development
   */
  static getLMStudioConfig(
    modelName: string = 'llama-3.2-3b-instruct',
    baseURL: string = process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1'
  ): ModelConfig {
    return {
      provider: 'lm_studio',
      modelName,
      baseURL,
      temperature: 0.7,
      maxTokens: 2048,
      streaming: false
    };
  }

  /**
   * Get LM Studio configuration for network accessible instance
   * @param modelName - Model name to use
   * @param networkHost - Network host IP or hostname (use environment variable LM_STUDIO_HOST)
   */
  static getLMStudioNetworkConfig(
    modelName: string = 'llama-3.2-3b-instruct',
    networkHost?: string
  ): ModelConfig {
    const host = networkHost || process.env.LM_STUDIO_HOST || 'localhost';
    return {
      provider: 'lm_studio',
      modelName,
      baseURL: process.env.LM_STUDIO_BASE_URL || `http://${host}:1234/v1`,
      temperature: 0.7,
      maxTokens: 2048,
      streaming: false
    };
  }

  /**
   * Get Ollama configuration for local development
   */
  static getOllamaConfig(modelName: string = 'llama3.2:3b'): ModelConfig {
    return {
      provider: 'ollama',
      modelName,
      baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
      temperature: 0.7,
      maxTokens: 2048,
      streaming: false
    };
  }

  /**
   * Validate model configuration
   */
  static validateConfig(config: ModelConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.provider) {
      errors.push('Provider is required');
    }

    if (!config.modelName) {
      errors.push('Model name is required');
    }

    if (['anthropic', 'google'].includes(config.provider) && !config.apiKey) {
      errors.push(`API key is required for ${config.provider} provider`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Test connection to a model provider
   */
  static async testConnection(config: ModelConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const model = this.createModel(config);
      
      // Try a simple test message
      const _response = await model.invoke([
        { role: 'user', content: 'Hello, this is a connection test. Please respond with "OK".' }
      ]);

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get available providers and their status
   */
  static getProviderStatus(): Record<LLMProvider, { available: boolean; description: string }> {
    return {
      'openai': {
        available: !!process.env.OPENAI_API_KEY,
        description: 'OpenAI GPT models (requires API key)'
      },
      'anthropic': {
        available: !!process.env.ANTHROPIC_API_KEY,
        description: 'Anthropic Claude models (requires API key)'
      },
      'google': {
        available: !!process.env.GOOGLE_API_KEY,
        description: 'Google Gemini models (requires API key)'
      },
      'lm_studio': {
        available: true,
        description: 'LM Studio inference (use LM_STUDIO_HOST env var for network access)'
      },
      'ollama': {
        available: true,
        description: `Ollama local inference (${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'})`
      },
      'openrouter': {
        available: !!process.env.OPENAI_API_KEY,
        description: 'OpenRouter API (uses OpenAI API key)'
      }
    };
  }
}