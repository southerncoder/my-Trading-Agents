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
import { VercelAISDKProviderFactory } from '../providers/vercel-ai-sdk-provider-factory';
import { VercelAISDKLangChainWrapper } from './vercel-ai-sdk-wrapper';
import { AgentLLMConfig } from '../types/agent-config';
import { getLMStudioSingleton } from './lmstudio-singleton';
import { createLogger } from '../utils/enhanced-logger';
import { getLMStudioBaseUrl } from '../utils/docker-secrets';
import { resolveLLMProviderConfig, getLLMProviderBaseUrl } from '../utils/llm-provider-utils';

const logger = createLogger('system', 'ModelProvider');

export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'ollama' | 'openrouter' | 'local_lmstudio' | 'remote_lmstudio';

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

    // Check if provider is supported by Vercel AI SDK
    if (VercelAISDKProviderFactory.isProviderSupported(config.provider)) {
      // Use Vercel AI SDK wrapper for supported providers (local_lmstudio, remote_lmstudio, ollama)
      logger.info('createModelAsync', 'Using Vercel AI SDK wrapper for provider', {
        provider: config.provider,
        modelName: config.modelName
      });

      const wrapperConfig: any = {
        provider: config.provider as 'local_lmstudio' | 'remote_lmstudio' | 'ollama',
        model: config.modelName
      };

      // Only add optional fields if they have values
      if (config.temperature !== undefined) {
        wrapperConfig.temperature = config.temperature;
      }
      if (config.maxTokens !== undefined) {
        wrapperConfig.maxTokens = config.maxTokens;
      }
      if (config.apiKey) {
        wrapperConfig.apiKey = config.apiKey;
      }
      if (config.baseURL) {
        wrapperConfig.baseURL = config.baseURL;
      }

      model = new VercelAISDKLangChainWrapper(wrapperConfig);
    } else if (config.provider === 'local_lmstudio' || config.provider === 'remote_lmstudio') {
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
    if (config.provider !== 'local_lmstudio' && config.provider !== 'remote_lmstudio') {
      this.instances.set(cacheKey, model);
    }

    logger.info('createModelAsync', 'Successfully created model instance', {
      provider: config.provider,
      modelName: config.modelName,
      cached: config.provider !== 'local_lmstudio' && config.provider !== 'remote_lmstudio'
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
    if (config.provider === 'local_lmstudio' || config.provider === 'remote_lmstudio') {
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
    const providerName = (config as any).llmProvider as LLMProvider | undefined;
    let providerConfig: any = null;
    if (providerName) {
      try {
        providerConfig = resolveLLMProviderConfig(providerName);
      } catch (e) {
        logger.warn('createFromConfig', 'Provider resolution failed; continuing with minimal base (no API key)', {
          provider: providerName,
          error: e instanceof Error ? e.message : String(e)
        });
      }
    } else {
      logger.warn('createFromConfig', 'No llmProvider found; using remote_lmstudio placeholder (no network calls unless env present)');
    }
    const effectiveProvider: LLMProvider = providerName || 'remote_lmstudio';
    const baseConfig = {
      provider: effectiveProvider,
      baseURL: providerConfig?.baseUrl,
      apiKey: providerConfig?.apiKey,
      temperature: 0.7,
      maxTokens: 2048,
      streaming: false
    } as ModelConfig;

    return {
      quickThinking: {
        ...baseConfig,
        modelName: config.quickThinkLlm
      },
      deepThinking: {
        ...baseConfig,
        modelName: config.deepThinkLlm
      }
    };
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
    // For Vercel AI SDK providers, preloading is handled automatically by the SDK
    if (VercelAISDKProviderFactory.isProviderSupported(config.provider)) {
      logger.info('preloadModel', 'Vercel AI SDK provider - no preloading needed', {
        provider: config.provider,
        modelName: config.modelName
      });
      return;
    }

    // For traditional LM Studio providers, use the existing preload logic
    if (config.provider === 'local_lmstudio' || config.provider === 'remote_lmstudio') {
  const baseUrl = config.baseURL || getLLMProviderBaseUrl(config.provider);
      const { LMStudioManager } = await import('./lmstudio-manager');
      await LMStudioManager.preloadModel(config.modelName, baseUrl);
    }
  }

  /**
   * Get LM Studio configuration for local or network development
   */
  static getLMStudioConfig(
    modelName: string = 'llama-3.2-3b-instruct'
  ): ModelConfig {
  const providerConfig = resolveLLMProviderConfig('local_lmstudio');
    return {
      provider: 'local_lmstudio',
      modelName,
      baseURL: providerConfig.baseUrl,
      apiKey: providerConfig.apiKey,
      temperature: 0.7,
      maxTokens: 2048,
      streaming: false
    };
  }

  /**
   * Get LM Studio configuration for network accessible instance
   */
  static getLMStudioNetworkConfig(
    modelName: string = 'llama-3.2-3b-instruct'
  ): ModelConfig {
  const providerConfig = resolveLLMProviderConfig('remote_lmstudio');
    return {
      provider: 'remote_lmstudio',
      modelName,
      baseURL: providerConfig.baseUrl,
      apiKey: providerConfig.apiKey,
      temperature: 0.7,
      maxTokens: 2048,
      streaming: false
    };
  }

  /**
   * Get Ollama configuration for local development
   */
  static getOllamaConfig(modelName: string = 'llama3.2:3b'): ModelConfig {
  const providerConfig = resolveLLMProviderConfig('ollama');
    return {
      provider: 'ollama',
      modelName,
      baseURL: providerConfig.baseUrl,
      apiKey: providerConfig.apiKey,
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
    const status: Record<LLMProvider, { available: boolean; description: string }> = {
      'openai': {
        available: false,
        description: 'OpenAI GPT models (requires EMBEDDING_LLM_URL and EMBEDDING_API_KEY)'
      },
      'anthropic': {
        available: false,
        description: 'Anthropic Claude models (requires ANTHROPIC_BASE_URL and ANTHROPIC_API_KEY)'
      },
      'google': {
        available: false,
        description: 'Google Gemini models (requires GOOGLE_BASE_URL and GOOGLE_API_KEY)'
      },
      'local_lmstudio': {
        available: false,
        description: 'Local LM Studio inference (requires LOCAL_LMSTUDIO_BASE_URL and LOCAL_LMSTUDIO_API_KEY)'
      },
      'remote_lmstudio': {
        available: false,
        description: 'Remote LM Studio inference (requires REMOTE_LMSTUDIO_BASE_URL and REMOTE_LMSTUDIO_API_KEY)'
      },
      'ollama': {
        available: false,
        description: 'Ollama local inference (requires OLLAMA_BASE_URL and OLLAMA_API_KEY)'
      },
      'openrouter': {
        available: false,
        description: 'OpenRouter API (requires OPENROUTER_BASE_URL and OPENROUTER_API_KEY)'
      }
    };

    // Check availability using environment variable resolution
    Object.keys(status).forEach(provider => {
      try {
        // Check both prompt and embedding contexts for availability
  resolveLLMProviderConfig(provider as LLMProvider);
  resolveLLMProviderConfig(provider as LLMProvider);
        status[provider as LLMProvider].available = true;
      } catch (_error) {
        // Provider not available due to missing environment variables
      }
    });

    return status;
  }
}