/**
 * Vercel AI SDK Provider Factory
 *
 * This module provides LLM provider implementations using the Vercel AI SDK
 * for LM Studio and Ollama integration, avoiding direct HTTP calls.
 */

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { ollama } from 'ollama-ai-provider-v2';
import { generateText } from 'ai';
import { LanguageModel } from 'ai';
import { LLMProvider } from '../types/config';
import { resolveLLMProviderConfig } from '../utils/llm-provider-utils';
import { createLogger } from '../utils/enhanced-logger';

const logger = createLogger('system', 'VercelAISDKProviderFactory');

/**
 * Configuration for Vercel AI SDK providers
 */
export interface VercelAISDKConfig {
  provider: LLMProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  baseURL?: string;
}

/**
 * Factory for creating Vercel AI SDK language model instances
 */
export class VercelAISDKProviderFactory {
  /**
   * Create a Vercel AI SDK language model instance
   */
  public static createModel(config: VercelAISDKConfig): LanguageModel {
    switch (config.provider) {
      case 'local_lmstudio':
      case 'remote_lmstudio':
        return this.createLMStudioModel(config);
      case 'ollama':
        return this.createOllamaModel(config);
      default:
        throw new Error(`Vercel AI SDK does not support provider: ${config.provider}`);
    }
  }

  /**
   * Create LM Studio model using OpenAI-compatible provider
   */
  private static createLMStudioModel(config: VercelAISDKConfig): LanguageModel {
    // Resolve provider configuration from environment variables
    const providerConfig = resolveLLMProviderConfig(config.provider, 'prompt');

    const baseURL = config.baseURL || providerConfig.baseUrl;
    const apiKey = config.apiKey || providerConfig.apiKey;

    logger.info('createLMStudioModel', 'Creating LM Studio model with Vercel AI SDK', {
      provider: config.provider,
      model: config.model,
      baseURL
    });

    return createOpenAICompatible({
      name: 'lm-studio',
      apiKey,
      baseURL
    })(config.model);
  }

  /**
   * Create Ollama model using Ollama provider
   */
  private static createOllamaModel(config: VercelAISDKConfig): LanguageModel {
    // Resolve provider configuration from environment variables
    const providerConfig = resolveLLMProviderConfig(config.provider, 'prompt');

    const baseURL = config.baseURL || providerConfig.baseUrl;

    logger.info('createOllamaModel', 'Creating Ollama model with Vercel AI SDK', {
      model: config.model,
      baseURL
    });

    return ollama(config.model);
  }

  /**
   * Test connection to a Vercel AI SDK provider
   */
  public static async testConnection(config: VercelAISDKConfig): Promise<boolean> {
    try {
      const model = this.createModel(config);

      // Use Vercel AI SDK's generateText for a simple test
      const { text } = await generateText({
        model,
        prompt: 'Hello, this is a connection test. Please respond with "OK".'
      });

      const success = text.toLowerCase().includes('ok') || text.length > 0;
      logger.info('testConnection', 'Connection test result', {
        provider: config.provider,
        model: config.model,
        success
      });

      return success;
    } catch (error) {
      logger.error('testConnection', 'Connection test failed', {
        provider: config.provider,
        model: config.model,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Get available models for Vercel AI SDK supported providers
   */
  public static getAvailableModels(provider: LLMProvider): string[] {
    switch (provider) {
      case 'local_lmstudio':
      case 'remote_lmstudio':
        return [
          'llama-3.2-3b-instruct',
          'llama-3.2-1b-instruct',
          'llama-3.1-8b-instruct',
          'llama-3.1-70b-instruct',
          'mistral-7b-instruct-v0.2',
          'mixtral-8x7b-instruct-v0.1',
          'codellama-7b-instruct',
          'codellama-13b-instruct',
          'codellama-34b-instruct',
          'phi-3-mini-4k-instruct',
          'phi-3-medium-4k-instruct',
          'gemma-2b-it',
          'gemma-7b-it',
          'qwen2-0.5b-instruct',
          'qwen2-1.5b-instruct',
          'qwen2-7b-instruct',
          'qwen2-72b-instruct'
        ];
      case 'ollama':
        return [
          'llama2',
          'llama2:7b',
          'llama2:13b',
          'llama3',
          'llama3:8b',
          'llama3:70b',
          'mistral',
          'mixtral',
          'codellama',
          'phi3',
          'gemma',
          'gemma:2b',
          'gemma:7b',
          'qwen',
          'qwen:0.5b',
          'qwen:1.5b',
          'qwen:7b',
          'qwen:72b'
        ];
      default:
        return [];
    }
  }

  /**
   * Validate model name for a Vercel AI SDK provider
   */
  public static isValidModel(provider: LLMProvider, model: string): boolean {
    const availableModels = this.getAvailableModels(provider);
    return availableModels.includes(model);
  }

  /**
   * Get default model for a Vercel AI SDK provider
   */
  public static getDefaultModel(provider: LLMProvider): string {
    switch (provider) {
      case 'local_lmstudio':
      case 'remote_lmstudio':
        return 'llama-3.2-3b-instruct';
      case 'ollama':
        return 'llama3:8b';
      default:
        throw new Error(`No default model defined for provider: ${provider}`);
    }
  }

  /**
   * Get supported providers
   */
  public static getSupportedProviders(): LLMProvider[] {
    return ['local_lmstudio', 'remote_lmstudio', 'ollama'];
  }

  /**
   * Check if a provider is supported by Vercel AI SDK
   */
  public static isProviderSupported(provider: LLMProvider): boolean {
    return this.getSupportedProviders().includes(provider);
  }
}