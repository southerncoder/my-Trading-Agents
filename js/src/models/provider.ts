/**
 * Model Provider Pattern for Trading Agents
 * 
 * Supports multiple LLM providers including LM Studio for local inference.
 * Each agent can have its own model instance and configuration.
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { TradingAgentsConfig } from '../types/config';

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
 * Creates LLM instances based on configuration
 */
export class ModelProvider {
  private static instances: Map<string, BaseChatModel> = new Map();

  /**
   * Create a model instance based on configuration
   */
  static createModel(config: ModelConfig): BaseChatModel {
    const cacheKey = this.getCacheKey(config);
    
    // Return cached instance if exists
    if (this.instances.has(cacheKey)) {
      return this.instances.get(cacheKey)!;
    }

    let model: BaseChatModel;

    switch (config.provider) {
      case 'openai':
      case 'lm_studio':
      case 'ollama':
      case 'openrouter':
        model = new ChatOpenAI({
          modelName: config.modelName,
          openAIApiKey: config.apiKey || 'not-needed-for-local',
          configuration: {
            baseURL: config.baseURL || 'http://localhost:1234/v1' // LM Studio default
          },
          temperature: config.temperature || 0.7,
          maxTokens: config.maxTokens || 2048,
          streaming: config.streaming || false,
          timeout: config.timeout || 60000
        });
        break;

      case 'anthropic':
        if (!config.apiKey) {
          throw new Error('API key required for Anthropic provider');
        }
        model = new ChatAnthropic({
          modelName: config.modelName,
          anthropicApiKey: config.apiKey,
          clientOptions: {
            baseURL: config.baseURL
          },
          temperature: config.temperature || 0.7,
          maxTokens: config.maxTokens || 2048,
          streaming: config.streaming || false
        });
        break;

      case 'google':
        if (!config.apiKey) {
          throw new Error('API key required for Google provider');
        }
        model = new ChatGoogleGenerativeAI({
          model: config.modelName,
          apiKey: config.apiKey,
          temperature: config.temperature || 0.7,
          maxOutputTokens: config.maxTokens || 2048,
          streaming: config.streaming || false
        });
        break;

      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }

    // Cache the instance
    this.instances.set(cacheKey, model);
    return model;
  }

  /**
   * Create models for a specific agent
   */
  static createAgentModels(agentConfig: AgentModelConfig): {
    quickThinking: BaseChatModel;
    deepThinking?: BaseChatModel;
  } {
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
   * Get LM Studio configuration for local development
   */
  static getLMStudioConfig(modelName: string = 'llama-3.2-3b-instruct'): ModelConfig {
    return {
      provider: 'lm_studio',
      modelName,
      baseURL: 'http://localhost:1234/v1',
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
      baseURL: 'http://localhost:11434/v1',
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
      const response = await model.invoke([
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
        description: 'LM Studio local inference (http://localhost:1234)'
      },
      'ollama': {
        available: true,
        description: 'Ollama local inference (http://localhost:11434)'
      },
      'openrouter': {
        available: !!process.env.OPENAI_API_KEY,
        description: 'OpenRouter API (uses OpenAI API key)'
      }
    };
  }
}