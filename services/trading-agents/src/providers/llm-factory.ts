import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { AgentLLMConfig } from '../types/agent-config';
import { LLMProvider } from '../types/config';

/**
 * Factory for creating LLM instances based on agent configuration
 */
export class LLMProviderFactory {
  /**
   * Create an LLM instance for a specific agent
   */
  public static createLLM(config: AgentLLMConfig): BaseChatModel {
    switch (config.provider) {
      case 'openai':
        return this.createOpenAILLM(config);
      case 'anthropic':
        return this.createAnthropicLLM(config);
      case 'google':
        return this.createGoogleLLM(config);
      case 'remote_lmstudio':
        return this.createLMStudioLLM(config);
      case 'ollama':
        return this.createOllamaLLM(config);
      case 'openrouter':
        return this.createOpenRouterLLM(config);
      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
  }

  /**
   * Create OpenAI LLM instance with best practices
   * 
   * Follows OpenAI SDK best practices:
   * - Automatic retry logic for transient failures
   * - Configurable timeout for requests
   * - Proper base URL configuration
   * - Comprehensive error handling
   * 
   * @see https://github.com/openai/openai-node for official SDK documentation
   */
  private static createOpenAILLM(config: AgentLLMConfig): ChatOpenAI {
    if (!config.apiKey) {
      throw new Error(
        'OpenAI API key is required. ' +
        'Set OPENAI_API_KEY environment variable or provide apiKey in configuration. ' +
        'Get your API key from https://platform.openai.com/api-keys'
      );
    }

    // Build OpenAI configuration with best practices
    const openAIConfig: any = {
      modelName: config.model || 'gpt-4o-mini',
      openAIApiKey: config.apiKey,
      // Default to 2 retries for transient failures (network issues, rate limits)
      maxRetries: 2,
      // Default timeout of 60 seconds for API requests
      timeout: config.timeout || 60000
    };

    // Configure temperature (0.0 to 2.0, default 1.0)
    if (config.temperature !== undefined) {
      openAIConfig.temperature = Math.max(0, Math.min(2, config.temperature));
    }

    // Configure max tokens (output limit)
    if (config.maxTokens !== undefined) {
      openAIConfig.maxTokens = config.maxTokens;
    }

    // Configure base URL (for proxies or OpenAI-compatible endpoints)
    // Defaults to https://api.openai.com/v1 if not specified
    if (config.baseUrl) {
      openAIConfig.configuration = { 
        baseURL: config.baseUrl,
        // Support proxy configuration via fetchOptions if needed
        // Example: fetchOptions: { dispatcher: new undici.ProxyAgent('http://proxy:8080') }
      };
    }

    return new ChatOpenAI(openAIConfig);
  }

  /**
   * Create Anthropic LLM instance
   */
  private static createAnthropicLLM(config: AgentLLMConfig): ChatAnthropic {
    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    const anthropicConfig: any = {
      model: config.model,
      anthropicApiKey: config.apiKey
    };

    if (config.temperature !== undefined) {
      anthropicConfig.temperature = config.temperature;
    }
    if (config.maxTokens !== undefined) {
      anthropicConfig.maxTokens = config.maxTokens;
    }
    if (config.baseUrl) {
      anthropicConfig.clientOptions = { baseURL: config.baseUrl };
    }

    return new ChatAnthropic(anthropicConfig);
  }

  /**
   * Create Google Generative AI LLM instance
   */
  private static createGoogleLLM(config: AgentLLMConfig): ChatGoogleGenerativeAI {
    if (!config.apiKey) {
      throw new Error('Google API key is required');
    }

    const googleConfig: any = {
      modelName: config.model,
      apiKey: config.apiKey
    };

    if (config.temperature !== undefined) {
      googleConfig.temperature = config.temperature;
    }
    if (config.maxTokens !== undefined) {
      googleConfig.maxOutputTokens = config.maxTokens;
    }

    return new ChatGoogleGenerativeAI(googleConfig);
  }

  /**
   * Create LM Studio LLM instance (OpenAI-compatible local server)
   */
  private static createLMStudioLLM(config: AgentLLMConfig): ChatOpenAI {
    const baseUrl = config.baseUrl || process.env.REMOTE_LM_STUDIO_BASE_URL;

    if (!baseUrl) {
      throw new Error('REMOTE_LM_STUDIO_BASE_URL environment variable is required for LM Studio provider');
    }

    const lmStudioConfig: any = {
      modelName: config.model,
      openAIApiKey: 'not-needed', // LM Studio doesn't require API key
      configuration: { baseURL: baseUrl }
    };

    if (config.temperature !== undefined) {
      lmStudioConfig.temperature = config.temperature;
    }
    if (config.maxTokens !== undefined) {
      lmStudioConfig.maxTokens = config.maxTokens;
    }
    if (config.timeout !== undefined) {
      lmStudioConfig.timeout = config.timeout;
    }

    return new ChatOpenAI(lmStudioConfig);
  }

  /**
   * Create Ollama LLM instance (local inference server)
   */
  private static createOllamaLLM(config: AgentLLMConfig): ChatOpenAI {
    const baseUrl = config.baseUrl || process.env.OLLAMA_BASE_URL;

    if (!baseUrl) {
      throw new Error('OLLAMA_BASE_URL environment variable is required for Ollama provider');
    }

    const ollamaConfig: any = {
      modelName: config.model,
      openAIApiKey: 'not-needed', // Ollama doesn't require API key
      configuration: { baseURL: baseUrl }
    };

    if (config.temperature !== undefined) {
      ollamaConfig.temperature = config.temperature;
    }
    if (config.maxTokens !== undefined) {
      ollamaConfig.maxTokens = config.maxTokens;
    }
    if (config.timeout !== undefined) {
      ollamaConfig.timeout = config.timeout;
    }

    return new ChatOpenAI(ollamaConfig);
  }

  /**
   * Create OpenRouter LLM instance (unified API)
   */
  private static createOpenRouterLLM(config: AgentLLMConfig): ChatOpenAI {
    if (!config.apiKey) {
      throw new Error('OpenRouter API key is required');
    }

    const openRouterConfig: any = {
      modelName: config.model,
      openAIApiKey: config.apiKey,
      configuration: { baseURL: 'https://openrouter.ai/api/v1' }
    };

    if (config.temperature !== undefined) {
      openRouterConfig.temperature = config.temperature;
    }
    if (config.maxTokens !== undefined) {
      openRouterConfig.maxTokens = config.maxTokens;
    }
    if (config.timeout !== undefined) {
      openRouterConfig.timeout = config.timeout;
    }

    return new ChatOpenAI(openRouterConfig);
  }

  /**
   * Test connection to a provider
   */
  public static async testConnection(config: AgentLLMConfig): Promise<boolean> {
    try {
      const llm = this.createLLM(config);
      
      // Send a simple test message
      await llm.invoke([{ role: 'user', content: 'Hello' }]);
      
      return true;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Get available models for a provider
   */
  public static getAvailableModels(provider: LLMProvider): string[] {
    switch (provider) {
      case 'openai':
        return [
          'gpt-4o',
          'gpt-4o-mini',
          'gpt-4-turbo',
          'gpt-4',
          'gpt-3.5-turbo',
          'o1-preview',
          'o1-mini'
        ];
      case 'anthropic':
        return [
          'claude-3-5-sonnet-20241022',
          'claude-3-5-haiku-20241022',
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307'
        ];
      case 'google':
        return [
          'gemini-1.5-pro',
          'gemini-1.5-flash',
          'gemini-1.0-pro',
          'gemini-pro-vision'
        ];
      case 'remote_lmstudio':
      case 'ollama':
        return [
          'llama2',
          'llama2-7b',
          'llama2-13b',
          'codellama',
          'mistral',
          'mixtral',
          'phi3'
        ];
      case 'openrouter':
        return [
          'openai/gpt-4o',
          'anthropic/claude-3-5-sonnet',
          'google/gemini-pro',
          'meta-llama/llama-2-70b-chat',
          'mistralai/mixtral-8x7b-instruct'
        ];
      default:
        return [];
    }
  }

  /**
   * Validate model name for a provider
   */
  public static isValidModel(provider: LLMProvider, model: string): boolean {
    const availableModels = this.getAvailableModels(provider);
    return availableModels.includes(model);
  }

  /**
   * Get default model for a provider
   */
  public static getDefaultModel(provider: LLMProvider): string {
    switch (provider) {
      case 'openai':
        return 'gpt-4o-mini';
      case 'anthropic':
        return 'claude-3-5-haiku-20241022';
      case 'google':
        return 'gemini-1.5-flash';
      case 'remote_lmstudio':
      case 'ollama':
        return 'llama2-7b';
      case 'openrouter':
        return 'openai/gpt-4o';
      default:
        return 'gpt-4o-mini';
    }
  }

  /**
   * Estimate cost per token for a provider/model combination
   */
  public static getTokenCost(provider: LLMProvider, model: string): { input: number; output: number } {
    // Costs in USD per 1000 tokens (approximate)
    switch (provider) {
      case 'openai':
        switch (model) {
          case 'gpt-4o':
            return { input: 0.005, output: 0.015 };
          case 'gpt-4o-mini':
            return { input: 0.00015, output: 0.0006 };
          case 'gpt-4-turbo':
            return { input: 0.01, output: 0.03 };
          case 'o1-preview':
            return { input: 0.015, output: 0.06 };
          default:
            return { input: 0.001, output: 0.002 };
        }
      case 'anthropic':
        switch (model) {
          case 'claude-3-5-sonnet-20241022':
            return { input: 0.003, output: 0.015 };
          case 'claude-3-5-haiku-20241022':
            return { input: 0.00025, output: 0.00125 };
          default:
            return { input: 0.001, output: 0.005 };
        }
      case 'google':
        return { input: 0.000125, output: 0.000375 };
      case 'remote_lmstudio':
      case 'ollama':
        return { input: 0, output: 0 }; // Local inference is free
      case 'openrouter':
        return { input: 0.002, output: 0.006 }; // Average across models
      default:
        return { input: 0.001, output: 0.002 };
    }
  }
}