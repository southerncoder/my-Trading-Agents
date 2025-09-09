/**
 * LM Studio Singleton Provider
 * 
 * Manages LM Studio model instances as singletons due to LM Studio's locking
 * model loading/unloading behavior. Only one model can be active at a time
 * per LM Studio instance, so we need to coordinate model access across agents.
 */

import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI } from '@langchain/openai';
import { LMStudioManager } from './lmstudio-manager';
import { createLogger } from '../utils/enhanced-logger';
import { getLMStudioBaseUrl } from '../utils/docker-secrets';
import { ModelConfig } from './provider';

const logger = createLogger('system', 'LMStudioSingleton');

/**
 * Singleton instance holder for LM Studio models
 */
class LMStudioSingleton {
  private instances: Map<string, BaseChatModel> = new Map();
  private currentModel: string | null = null;
  private baseUrl: string;
  private initializationPromises: Map<string, Promise<BaseChatModel>> = new Map();

  constructor(baseUrl: string = process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get or create a model instance for LM Studio
   * Ensures only one model is active at a time
   */
  async getModel(config: ModelConfig): Promise<BaseChatModel> {
    const cacheKey = this.getCacheKey(config);
    
    // Return existing instance if already created
    if (this.instances.has(cacheKey)) {
      const instance = this.instances.get(cacheKey)!;
      await this.ensureModelActive(config.modelName);
      return instance;
    }

    // Check if initialization is already in progress
    if (this.initializationPromises.has(cacheKey)) {
      logger.debug('getModel', 'Waiting for existing initialization', { modelName: config.modelName });
      return await this.initializationPromises.get(cacheKey)!;
    }

    // Start new initialization
    const initPromise = this.createModelInstance(config);
    this.initializationPromises.set(cacheKey, initPromise);

    try {
      const instance = await initPromise;
      this.instances.set(cacheKey, instance);
      return instance;
    } finally {
      this.initializationPromises.delete(cacheKey);
    }
  }

  /**
   * Create a new model instance with proper LM Studio integration
   */
  private async createModelInstance(config: ModelConfig): Promise<BaseChatModel> {
    logger.info('createModelInstance', 'Creating LM Studio model instance', {
      modelName: config.modelName,
      baseUrl: this.baseUrl
    });

    // Ensure the model is loaded in LM Studio
    await this.ensureModelActive(config.modelName);

    // Create the base ChatOpenAI instance
    const baseModel = new ChatOpenAI({
      modelName: config.modelName,
      openAIApiKey: 'not-needed-for-local',
      configuration: {
        baseURL: this.baseUrl
      },
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 2048,
      timeout: config.timeout || 30000,
      streaming: config.streaming || false
    });

    // Create a proxy that ensures model is active before each call
    const proxiedModel = new Proxy(baseModel, {
      get: (target: any, prop: PropertyKey) => {
        if (prop === 'invoke' || prop === 'call' || prop === 'generate' || prop === 'stream') {
          return async (...args: any[]) => {
            // Ensure this model is active before the call
            await this.ensureModelActive(config.modelName);
            
            const fn = target[prop];
            if (typeof fn === 'function') {
              return fn.apply(target, args);
            }
            throw new Error(`Method ${String(prop)} is not a function on model`);
          };
        }
        return target[prop];
      }
    });

    return proxiedModel as BaseChatModel;
  }

  /**
   * Ensure the specified model is the active one in LM Studio
   */
  private async ensureModelActive(modelName: string): Promise<void> {
    if (this.currentModel === modelName) {
      logger.debug('ensureModelActive', 'Model already active', { modelName });
      return;
    }

    logger.info('ensureModelActive', 'Switching to model', {
      from: this.currentModel,
      to: modelName,
      baseUrl: this.baseUrl
    });

    // Use LMStudioManager to handle model loading/switching
    if (this.currentModel && this.currentModel !== modelName) {
      // Request model switch with unload of previous
      const adminUrl = process.env.LM_STUDIO_ADMIN_URL;
      const switchOptions: { unloadPrevious: boolean; previousModel: string; adminUrl?: string } = {
        unloadPrevious: true,
        previousModel: this.currentModel
      };
      if (adminUrl) {
        switchOptions.adminUrl = adminUrl;
      }
      await LMStudioManager.requestModelSwitch(modelName, this.baseUrl, switchOptions);
    } else {
      // Just ensure the target model is loaded
      await LMStudioManager.ensureModelLoaded(modelName, this.baseUrl);
    }

    this.currentModel = modelName;
    logger.info('ensureModelActive', 'Model switch completed', { activeModel: modelName });
  }

  /**
   * Generate cache key for model configuration
   */
  private getCacheKey(config: ModelConfig): string {
    return `${config.modelName}-${this.baseUrl}`;
  }

  /**
   * Get current active model name
   */
  getCurrentModel(): string | null {
    return this.currentModel;
  }

  /**
   * Get base URL for this LM Studio instance
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Clear all cached instances (for testing/reset)
   */
  clearCache(): void {
    logger.info('clearCache', 'Clearing all cached LM Studio instances');
    this.instances.clear();
    this.currentModel = null;
  }

  /**
   * Get metrics about cached instances
   */
  getMetrics(): { instanceCount: number; currentModel: string | null; baseUrl: string } {
    return {
      instanceCount: this.instances.size,
      currentModel: this.currentModel,
      baseUrl: this.baseUrl
    };
  }
}

/**
 * Global singleton instances keyed by base URL
 * This allows multiple LM Studio instances on different ports/hosts
 */
const singletonInstances: Map<string, LMStudioSingleton> = new Map();

/**
 * Get or create LM Studio singleton for a specific base URL
 */
export function getLMStudioSingleton(baseUrl?: string): LMStudioSingleton {
  // Use the provided baseUrl or get the properly formatted one with /v1 suffix
  const url = baseUrl || getLMStudioBaseUrl();

  if (!singletonInstances.has(url)) {
    logger.info('getLMStudioSingleton', 'Creating new LM Studio singleton', { baseUrl: url });
    singletonInstances.set(url, new LMStudioSingleton(url));
  }

  return singletonInstances.get(url)!;
}

/**
 * Clear all singleton instances (for testing/reset)
 */
export function clearAllLMStudioSingletons(): void {
  logger.info('clearAllLMStudioSingletons', 'Clearing all LM Studio singletons');
  singletonInstances.clear();
}

/**
 * Get metrics for all singleton instances
 */
export function getAllLMStudioMetrics(): Array<{ baseUrl: string; instanceCount: number; currentModel: string | null }> {
  return Array.from(singletonInstances.entries()).map(([baseUrl, singleton]) => ({
    baseUrl,
    instanceCount: singleton.getMetrics().instanceCount,
    currentModel: singleton.getMetrics().currentModel
  }));
}