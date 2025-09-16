/**
 * Modern LangChain Configuration System  
 * Using latest initChatModel patterns and runtime configuration
 * Following latest stable interfaces from Context7 documentation
 */

import { AsyncLocalStorage } from 'async_hooks';
import { AsyncLocalStorageProviderSingleton } from "@langchain/core/singletons";
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LLMProviderFactory } from '../providers/llm-factory.js';
import { VercelAISDKProviderFactory } from '../providers/vercel-ai-sdk-provider-factory.js';
import { VercelAISDKLangChainWrapper } from '../models/vercel-ai-sdk-wrapper.js';
import { LLMProvider } from '../types/config.js';
import { resolveLLMProviderConfig } from '../utils/llm-provider-utils.js';
import process from 'process';

// Types for modern configuration
export interface ModelConfig {
  model: string;
  apiKey?: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
}

export interface ModelConfigurations {
  [key: string]: ModelConfig;
}

export interface RuntimeConfig {
  modelName: string;
  overrides?: Partial<ModelConfig>;
}
// Initialize global async storage for configuration passing
AsyncLocalStorageProviderSingleton.initializeGlobalInstance(
    new AsyncLocalStorage()
);

/**
 * Modern configuration loader using latest LangChain patterns
 */
export class ModernConfigLoader {
    constructor() {
        // Environment loading is handled in methods that need it
    }

    /**
     * Load environment variables with proper fallbacks
     */
    async loadEnvironment() {
        try {
            const dotenv = await import('dotenv');
            const path = await import('path');
            dotenv.config({ path: path.join(process.cwd(), '.env.local') });
        } catch {
            // Silently handle missing .env.local file
        }
    }

    /**
     * Get modern LLM configuration using environment variables
     */
    getLLMConfig() {
        const provider = 'remote_lmstudio'; // Default provider - should be specified in config.json
        
        // Resolve provider configuration from environment variables
    const providerConfig = resolveLLMProviderConfig(provider as LLMProvider);
        
        return {
            // Provider configuration
            provider: provider,
            model: process.env.LLM_MODEL_NAME || 'llama-3.2-3b-instruct',
            // Connection configuration
            baseURL: providerConfig.baseUrl,
            apiKey: providerConfig.apiKey,
            // Model parameters
            temperature: 0.7, // Set via config.json or runtime config
            maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '1000'),
            // Advanced configuration
            configurableFields: ["model", "temperature", "maxTokens", "baseURL"],
            configPrefix: "llm"
        };
    }

    /**
     * Create a modern chat model using ChatOpenAI as fallback
     */
    async createChatModel(overrides = {}): Promise<BaseChatModel> {
        const config = { ...this.getLLMConfig(), ...overrides };
        
        try {
            // Check if provider is supported by Vercel AI SDK
            if (VercelAISDKProviderFactory.isProviderSupported(config.provider as LLMProvider)) {
                // Use Vercel AI SDK wrapper for supported providers (local_lmstudio, remote_lmstudio, ollama)
                const wrapperConfig = {
                    provider: config.provider as 'local_lmstudio' | 'remote_lmstudio' | 'ollama',
                    model: config.model,
                    temperature: config.temperature,
                    maxTokens: config.maxTokens,
                    apiKey: config.apiKey,
                    baseURL: config.baseURL
                };
                
                return new VercelAISDKLangChainWrapper(wrapperConfig);
            } else {
                // Use LLMProviderFactory for all other providers
                return LLMProviderFactory.createLLM({
                    provider: config.provider as LLMProvider,
                    model: config.model,
                    apiKey: config.apiKey,
                    baseUrl: config.baseURL,
                    temperature: config.temperature,
                    maxTokens: config.maxTokens
                });
            }
        } catch (error: any) {
            throw new Error(`Modern chat model creation failed: ${error.message}`);
        }
    }

    /**
     * Create multiple models with different configurations
     */
    async createMultipleModels() {
        const baseConfig = this.getLLMConfig();
        
        const models = {
            // Quick thinking model - faster, lower temperature
            quick: await this.createChatModel({
                ...baseConfig,
                temperature: 0.3,
                maxTokens: 500,
                configPrefix: "quick"
            }),
            
            // Deep thinking model - more thorough, higher temperature
            deep: await this.createChatModel({
                ...baseConfig,
                temperature: 0.8,
                maxTokens: 2000,
                configPrefix: "deep"
            }),
            
            // Analysis model - balanced for analysis tasks
            analysis: await this.createChatModel({
                ...baseConfig,
                temperature: 0.5,
                maxTokens: 1500,
                configPrefix: "analysis"
            })
        };

        return models;
    }

    /**
     * Get system configuration with environment variables
     */
    getSystemConfig() {
        return {
            // Directory settings
            projectDir: process.env.TRADINGAGENTS_PROJECT_DIR || './project',
            resultsDir: process.env.TRADINGAGENTS_RESULTS_DIR || './results',
            dataDir: process.env.TRADINGAGENTS_DATA_DIR || './data',
            dataCacheDir: process.env.TRADINGAGENTS_CACHE_DIR || './cache',
            exportsDir: process.env.TRADINGAGENTS_EXPORTS_DIR || './exports',
            logsDir: process.env.TRADINGAGENTS_LOGS_DIR || './logs',
            
            // Debate and discussion settings
            maxDebateRounds: parseInt(process.env.MAX_DEBATE_ROUNDS || '1'),
            maxRiskDiscussRounds: parseInt(process.env.MAX_RISK_DISCUSS_ROUNDS || '1'),
            maxRecurLimit: parseInt(process.env.MAX_RECUR_LIMIT || '100'),
            
            // Tool settings
            onlineTools: process.env.ONLINE_TOOLS?.toLowerCase() === 'true' || true,
            
            // API Keys (from environment variables)
            finnhubApiKey: process.env.FINNHUB_API_KEY || '',
            redditClientId: process.env.REDDIT_CLIENT_ID || '',
            redditClientSecret: process.env.REDDIT_CLIENT_SECRET || '',
            newsApiKey: process.env.NEWS_API_KEY || '',
            alphaVantageApiKey: process.env.ALPHA_VANTAGE_API_KEY || ''
        };
    }

    /**
     * Create runtime configurable model
     */
    async createConfigurableModel() {
        const baseModel = await this.createChatModel();
        
        // Add runtime configuration capabilities
        return baseModel.withConfig({
            configurable: {
                temperature: 0.5,
                maxTokens: 1000
            }
        });
    }

    /**
     * Get complete modern configuration
     */
    async getModernConfig() {
        const systemConfig = this.getSystemConfig();
        const llmConfig = this.getLLMConfig();
        const models = await this.createMultipleModels();

        return {
            ...systemConfig,
            llm: llmConfig,
            // llmProvider is no longer part of TradingAgentsConfig - it's specified in config.json
            models,
            // Modern LangChain features
            features: {
                asyncStorage: true,
                runtimeConfiguration: true,
                universalInit: true,
                configurableFields: true
            }
        };
    }

    /**
     * Validate configuration
     */
    validateConfig() {
        const llmConfig = this.getLLMConfig();
        
        const warnings = [];
        
        // Check for important environment variables
        if (!process.env.LLM_BACKEND_URL) {
            warnings.push('LLM_BACKEND_URL not set, using default');
        }
        
        if (llmConfig.provider === 'openai' && !process.env.OPENAI_API_KEY) {
            warnings.push('OPENAI_API_KEY not set for OpenAI provider');
        }
        
        return {
            valid: true,
            warnings
        };
    }
}

// Create singleton instance
export const modernConfigLoader = new ModernConfigLoader();

/**
 * Convenience function to get a modern chat model
 */
export async function createModernChatModel(overrides = {}) {
    return await modernConfigLoader.createChatModel(overrides);
}

/**
 * Convenience function to get complete modern configuration
 */
export async function getModernConfig() {
    return await modernConfigLoader.getModernConfig();
}