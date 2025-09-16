/**
 * LangChain-compatible wrapper for Vercel AI SDK LanguageModel
 *
 * This wrapper allows Vercel AI SDK models to be used as LangChain BaseChatModel instances,
 * enabling seamless integration with existing LangChain workflows.
 */

import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BaseMessage, AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatResult } from '@langchain/core/outputs';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { LanguageModel } from 'ai';
import { generateText } from 'ai';
import { VercelAISDKProviderFactory } from '../providers/vercel-ai-sdk-provider-factory';
import { createLogger } from '../utils/enhanced-logger';

const logger = createLogger('system', 'VercelAISDKLangChainWrapper');

/**
 * Configuration for the Vercel AI SDK LangChain wrapper
 */
export interface VercelAISDKWrapperConfig {
  provider: 'local_lmstudio' | 'remote_lmstudio' | 'ollama';
  model: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  baseURL?: string;
}

/**
 * LangChain-compatible wrapper for Vercel AI SDK models
 */
export class VercelAISDKLangChainWrapper extends BaseChatModel {
  private vercelModel: LanguageModel;
  private config: VercelAISDKWrapperConfig;

  constructor(config: VercelAISDKWrapperConfig) {
    super({});
    this.config = config;
    this.vercelModel = VercelAISDKProviderFactory.createModel(config);
  }

  get lc_secrets(): { [key: string]: string } | undefined {
    return {};
  }

  get lc_aliases(): { [key: string]: string } | undefined {
    return {};
  }

  _llmType(): string {
    return 'vercel-ai-sdk';
  }

  /**
   * Convert LangChain messages to Vercel AI SDK message format
   */
  private convertMessages(messages: BaseMessage[]): Array<{ role: 'user' | 'assistant' | 'system'; content: string }> {
    return messages.map(message => {
      if (message instanceof HumanMessage) {
        return { role: 'user' as const, content: message.content as string };
      } else if (message instanceof AIMessage) {
        return { role: 'assistant' as const, content: message.content as string };
      } else if (message instanceof SystemMessage) {
        return { role: 'system' as const, content: message.content as string };
      } else {
        // Default to user role for unknown message types
        return { role: 'user' as const, content: message.content as string };
      }
    });
  }

  /**
   * Generate chat completion using Vercel AI SDK
   */
  async _generate(
    messages: BaseMessage[],
    _options?: this['ParsedCallOptions'],
    _runManager?: CallbackManagerForLLMRun
  ): Promise<ChatResult> {
    try {
      logger.debug('_generate', 'Converting messages for Vercel AI SDK', {
        messageCount: messages.length,
        provider: this.config.provider,
        model: this.config.model
      });

      const vercelMessages = this.convertMessages(messages);

      // Use Vercel AI SDK's generateText function
      const { text } = await generateText({
        model: this.vercelModel,
        messages: vercelMessages
      });

      logger.debug('_generate', 'Generated response from Vercel AI SDK', {
        responseLength: text.length,
        provider: this.config.provider
      });

      const aiMessage = new AIMessage(text);

      return {
        generations: [{
          text: text,
          message: aiMessage
        }],
        llmOutput: {
          tokenUsage: {
            // TODO: Extract token usage from Vercel AI SDK response when available
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0
          }
        }
      };
    } catch (error) {
      logger.error('_generate', 'Error generating response with Vercel AI SDK', {
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.config.provider,
        model: this.config.model
      });
      throw error;
    }
  }

  /**
   * Get identifying parameters for the model
   */
  _modelType(): string {
    return `${this.config.provider}-${this.config.model}`;
  }

  /**
   * Get the model name
   */
  get modelName(): string {
    return this.config.model;
  }

  /**
   * Get the provider name
   */
  get provider(): string {
    return this.config.provider;
  }
}