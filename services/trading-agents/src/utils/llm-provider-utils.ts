/**
 * LLM Provider Environment Variable Utilities
 *
 * This module provides utilities for resolving LLM provider configuration
 * from environment variables based on the provider name.
 */

import { LLMProvider } from '../types/config';

/**
 * LLM Provider Configuration
 */
export interface LLMProviderConfig {
  baseUrl: string;
  apiKey: string;
  provider: LLMProvider;
}

/**
 * Resolves LLM provider configuration from environment variables
 *
 * Environment Variable Pattern:
 * - {PROVIDER}_BASE_URL (e.g., OPENAI_BASE_URL, ANTHROPIC_BASE_URL)
 * - {PROVIDER}_API_KEY (e.g., OPENAI_API_KEY, ANTHROPIC_API_KEY)
 *
 * Special cases:
 * - OPENAI_BASE_URL and OPENAI_API_KEY are always set to EMBEDDING_LLM_URL and EMBEDDING_API_KEY
 * - OLLAMA uses OLLAMA_BASE_URL and OLLAMA_API_KEY
 * - OPENROUTER uses OPENROUTER_BASE_URL and OPENROUTER_API_KEY
 * - REMOTE_LM_STUDIO uses REMOTE_LM_STUDIO_BASE_URL and REMOTE_LM_STUDIO_API_KEY
 * - LOCAL_LM_STUDIO uses LOCAL_LM_STUDIO_BASE_URL and LOCAL_LM_STUDIO_API_KEY
 *
 * @param provider The LLM provider name
 * @returns Provider configuration with baseUrl and apiKey
 * @throws Error if required environment variables are not set
 */
export function resolveLLMProviderConfig(provider: LLMProvider): LLMProviderConfig {
  if (!provider) {
    throw new Error('LLM provider is undefined – ensure configuration supplies provider context');
  }
  const providerUpper = provider.toUpperCase().replace('-', '_');

  // Special handling for OpenAI - prefer dedicated OPENAI variables, fallback to embedding
  if (provider === 'openai') {
    const baseUrl = process.env.OPENAI_BASE_URL || process.env.EMBEDDING_LLM_URL || 'https://api.openai.com/v1';
    const apiKey = process.env.OPENAI_API_KEY || process.env.EMBEDDING_API_KEY;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY or EMBEDDING_API_KEY environment variable is required for OpenAI provider');
    }

    return {
      provider,
      baseUrl,
      apiKey
    };
  }

  // Standard pattern for all other providers
  const baseUrlEnv = `${providerUpper}_BASE_URL`;
  const apiKeyEnv = `${providerUpper}_API_KEY`;

  const baseUrl = process.env[baseUrlEnv];
  const apiKey = process.env[apiKeyEnv];

  if (!baseUrl) {
    throw new Error(`${baseUrlEnv} environment variable is required for ${provider} provider`);
  }
  if (!apiKey) {
    throw new Error(`${apiKeyEnv} environment variable is required for ${provider} provider`);
  }

  return {
    provider,
    baseUrl,
    apiKey
  };
}

/**
 * Gets the base URL for a specific LLM provider
 *
 * @param provider The LLM provider name
 * @param usage The usage context ('prompt' or 'embedding')
 * @returns The base URL for the provider
 */
export function getLLMProviderBaseUrl(provider: LLMProvider): string {
  return resolveLLMProviderConfig(provider).baseUrl;
}

/**
 * Gets the API key for a specific LLM provider
 *
 * @param provider The LLM provider name
 * @param usage The usage context ('prompt' or 'embedding')
 * @returns The API key for the provider
 */
export function getLLMProviderApiKey(provider: LLMProvider): string {
  return resolveLLMProviderConfig(provider).apiKey;
}

/**
 * Validates that all required environment variables are set for a provider
 *
 * @param provider The LLM provider name
 * @param usage The usage context ('prompt' or 'embedding')
 * @returns true if all required environment variables are set
 */
export function validateLLMProviderEnv(provider: LLMProvider): boolean {
  try {
    resolveLLMProviderConfig(provider);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Gets all available LLM providers that have valid environment configuration
 *
 * @returns Array of providers with valid environment configuration
 */
export function getAvailableLLMProviders(): LLMProvider[] {
  const allProviders: LLMProvider[] = ['openai', 'anthropic', 'google', 'ollama', 'openrouter', 'local_lmstudio', 'remote_lmstudio'];

  return allProviders.filter(provider => {
    return validateLLMProviderEnv(provider);
  });
}

/**
 * Environment variable mapping for documentation
 */
export const LLM_PROVIDER_ENV_VARS = {
  openai: {
    baseUrl: 'OPENAI_BASE_URL (defaults to https://api.openai.com/v1, or EMBEDDING_LLM_URL for backward compatibility)',
    apiKey: 'OPENAI_API_KEY (or EMBEDDING_API_KEY for backward compatibility)'
  },
  anthropic: {
    baseUrl: 'ANTHROPIC_BASE_URL',
    apiKey: 'ANTHROPIC_API_KEY'
  },
  google: {
    baseUrl: 'GOOGLE_BASE_URL',
    apiKey: 'GOOGLE_API_KEY'
  },
  local_lmstudio: {
    baseUrl: 'LOCAL_LM_STUDIO_BASE_URL',
    apiKey: 'LOCAL_LM_STUDIO_API_KEY'
  },
  remote_lmstudio: {
    baseUrl: 'REMOTE_LM_STUDIO_BASE_URL',
    apiKey: 'REMOTE_LM_STUDIO_API_KEY'
  },
  ollama: {
    baseUrl: 'OLLAMA_BASE_URL',
    apiKey: 'OLLAMA_API_KEY'
  },
  openrouter: {
    baseUrl: 'OPENROUTER_BASE_URL',
    apiKey: 'OPENROUTER_API_KEY'
  }
} as const;