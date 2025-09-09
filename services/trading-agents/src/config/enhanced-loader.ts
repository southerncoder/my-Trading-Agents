import { 
  EnhancedTradingAgentsConfig, 
  AgentLLMConfig, 
  AgentTypeConfigs,
  DEFAULT_AGENT_CONFIGS,
  AGENT_TYPE_TO_CONFIG_KEY
} from '../types/agent-config';
import { LLMProvider } from '../types/config';
import { DEFAULT_CONFIG } from './default';
import path from 'path';
import fs from 'fs';

/**
 * Enhanced configuration loader with per-agent LLM provider support
 */
export class EnhancedConfigLoader {
  private config: EnhancedTradingAgentsConfig;

  constructor(overrides: Partial<EnhancedTradingAgentsConfig> = {}) {
    this.config = this.loadConfiguration(overrides);
  }

  /**
   * Load configuration from environment variables and overrides
   */
  private loadConfiguration(overrides: Partial<EnhancedTradingAgentsConfig>): EnhancedTradingAgentsConfig {
    const baseConfig: EnhancedTradingAgentsConfig = {
      // Basic settings from original config
      projectDir: DEFAULT_CONFIG.projectDir,
      resultsDir: DEFAULT_CONFIG.resultsDir,
      dataDir: DEFAULT_CONFIG.dataDir,
      dataCacheDir: DEFAULT_CONFIG.dataCacheDir,
      maxDebateRounds: DEFAULT_CONFIG.maxDebateRounds,
      maxRiskDiscussRounds: DEFAULT_CONFIG.maxRiskDiscussRounds,
      maxRecurLimit: DEFAULT_CONFIG.maxRecurLimit,
      onlineTools: DEFAULT_CONFIG.onlineTools,
      
      // Data provider API keys - provide defaults
      finnhubApiKey: DEFAULT_CONFIG.finnhubApiKey || '',
      redditClientId: DEFAULT_CONFIG.redditClientId || '',
      redditClientSecret: DEFAULT_CONFIG.redditClientSecret || '',
      redditUsername: DEFAULT_CONFIG.redditUsername || '',
      redditPassword: DEFAULT_CONFIG.redditPassword || '',
      newsApiKey: process.env.NEWS_API_KEY || '',
      alphaVantageApiKey: process.env.ALPHA_VANTAGE_API_KEY || '',
      
      // Enhanced agent configurations
      agents: this.loadAgentConfigurations()
    };

    return {
      ...baseConfig,
      ...overrides
    };
  }

  /**
   * Load agent-specific configurations from environment variables
   * Uses the DEFAULT_AGENT_CONFIGS which already includes environment variable logic
   */
  private loadAgentConfigurations(): AgentTypeConfigs {
    // The DEFAULT_AGENT_CONFIGS already handles environment variables with proper fallbacks
    const agentConfigs: AgentTypeConfigs = { ...DEFAULT_AGENT_CONFIGS };
    // Determine whether memory consideration is enabled. This can be provided via
    // environment variable `CONSIDER_MEMORY=true` or passed in overrides under the
    // same key on the constructor (handled by loadConfiguration overrides merging).
    const considerMemoryEnv = (process.env.CONSIDER_MEMORY || '').toLowerCase() === 'true';
    const considerMemory = considerMemoryEnv;

    // Attempt to load HF aggregate metadata to detect embedding models
    let hfAggregate: any[] = [];
    try {
      // Path relative to this file: ../../.hf-models-aggregate.json -> resolves to js/.hf-models-aggregate.json
      const aggPath = path.resolve(__dirname, '..', '..', '.hf-models-aggregate.json');
      if (fs.existsSync(aggPath)) {
        const txt = fs.readFileSync(aggPath, 'utf8');
        hfAggregate = JSON.parse(txt);
      }
    } catch (_e) {
      hfAggregate = [];
    }

    const isEmbeddingModel = (modelId?: string): boolean => {
      if (!modelId) return false;
      const m = modelId.toLowerCase();
      // quick heuristic
      if (m.includes('embed') || m.includes('embedding') || m.startsWith('text-embedding')) return true;
      try {
        const found = hfAggregate.find(e => {
          const sid = (e?.summary?.modelId || e?.id || '').toString().toLowerCase();
          return sid === modelId.toLowerCase() || sid === modelId.replace(/\//g, '_').toLowerCase();
        });
        if (found && found.summary && found.summary.pipeline_tag) {
          return String(found.summary.pipeline_tag).toLowerCase().includes('embedding') || String(found.summary.pipeline_tag).toLowerCase().includes('embed');
        }
      } catch (_err) {
        // ignore
      }
      return false;
    };
    
    // Try to load optional agent-model mapping file and apply recommendations
    try {
      const mapping = require('../memory/agent-model-mapping.json');
      if (mapping && typeof mapping === 'object') {
        Object.keys(mapping).forEach(key => {
          // map from mapping keys (e.g., market_analyst) to internal config keys
          const cfgKey = AGENT_TYPE_TO_CONFIG_KEY[key] || key;
          const recommended = mapping[key];
          if (recommended && cfgKey && agentConfigs[cfgKey as keyof AgentTypeConfigs]) {
            const existing = agentConfigs[cfgKey as keyof AgentTypeConfigs] as AgentLLMConfig;
            // Only apply recommended model/provider when env vars did not set explicit values
            // If memory consideration is enabled and the target is an analyst role,
            // avoid applying embedding models as the primary LLM for analyst agents.
            const isAnalyst = ['marketAnalyst','socialAnalyst','newsAnalyst','fundamentalsAnalyst','riskyAnalyst','safeAnalyst','neutralAnalyst'].includes(cfgKey as any);
            if (!process.env[`${key.toUpperCase()}_LLM_MODEL`] && !process.env[`${cfgKey.toUpperCase()}_LLM_MODEL`]) {
              const candidateModel = recommended.model || existing.model;
              // Determine per-agent allowEmbeddingModel flag precedence:
              // 1) environment variable `${CFGKEY}_ALLOW_EMBEDDING` (true/false)
              // 2) per-agent config file `allowEmbeddingModel` (if present)
              // 3) mapping's `allowEmbeddingModel` (if present)
              // 4) default false
              const envFlag = process.env[`${cfgKey.toUpperCase()}_ALLOW_EMBEDDING`];
              let allowEmbedding = false;
              if (typeof envFlag !== 'undefined') {
                allowEmbedding = String(envFlag).toLowerCase() === 'true';
              } else if (typeof (recommended as any).allowEmbeddingModel !== 'undefined') {
                allowEmbedding = Boolean((recommended as any).allowEmbeddingModel);
              } else if (typeof (existing as any).allowEmbeddingModel !== 'undefined') {
                allowEmbedding = Boolean((existing as any).allowEmbeddingModel);
              }

              if (considerMemory && isAnalyst && isEmbeddingModel(candidateModel) && !allowEmbedding) {
                // Skip applying an embedding model as the primary LLM for analyst when
                // memory is being considered and the agent has not opted in.
              } else {
                existing.model = recommended.model || existing.model;
              }
            }
            if (!process.env[`${key.toUpperCase()}_LLM_PROVIDER`] && !process.env[`${cfgKey.toUpperCase()}_LLM_PROVIDER`]) {
              existing.provider = recommended.provider || existing.provider;
            }
            // attach a note for debugging if present
            if (recommended.notes) {
              (existing as any)._recommended_notes = recommended.notes;
            }
          }
        });
      }
    } catch (_err) {
      // ignore if mapping file not present or fails to load
    }

    // Try to load per-agent config files from js/src/agents/configs
    try {
      const fs = require('fs');
      const path = require('path');
      const configsDir = path.resolve(__dirname, '..', 'agents', 'configs');
      if (fs.existsSync(configsDir)) {
        const files = fs.readdirSync(configsDir);
        files.forEach((f: string) => {
          if (!f.endsWith('.json')) return;
          const agentKey = f.replace('.json', '');
          try {
            const cfg = require(path.join(configsDir, f));
            const cfgKey = AGENT_TYPE_TO_CONFIG_KEY[agentKey] || agentKey;
            if (cfg && agentConfigs[cfgKey as keyof AgentTypeConfigs]) {
              const existing = agentConfigs[cfgKey as keyof AgentTypeConfigs] as AgentLLMConfig;
              // Merge fields but don't overwrite env-provided values
              if (!process.env[`${agentKey.toUpperCase()}_LLM_PROVIDER`] && !process.env[`${cfgKey.toUpperCase()}_LLM_PROVIDER`]) {
                existing.provider = cfg.provider || existing.provider;
              }
              if (!process.env[`${agentKey.toUpperCase()}_LLM_MODEL`] && !process.env[`${cfgKey.toUpperCase()}_LLM_MODEL`]) {
                existing.model = cfg.model || existing.model;
              }
              if (typeof cfg.temperature !== 'undefined') existing.temperature = cfg.temperature;
              if (typeof cfg.maxTokens !== 'undefined') existing.maxTokens = cfg.maxTokens;
              if (cfg.notes) (existing as any)._config_notes = cfg.notes;
              // Allow per-agent configs to specify an explicit embedding model and opt-in flag
              if (typeof cfg.allowEmbeddingModel !== 'undefined') {
                (existing as any).allowEmbeddingModel = Boolean(cfg.allowEmbeddingModel);
              }
              if (typeof cfg.embeddingModel !== 'undefined') {
                (existing as any).embeddingModel = String(cfg.embeddingModel);
              }
            }
          } catch (_e) {
            // ignore malformed config files
          }
        });
      }
    } catch (_err2) {
      // ignore; attempted best-effort merge
    }
    
    // Add API keys and base URLs for each configuration
    Object.keys(agentConfigs).forEach(agentType => {
      const config = agentConfigs[agentType as keyof AgentTypeConfigs];
      if (!config) return;
      
      // Set API key based on provider (allow undefined for local providers)
      const apiKey = this.getApiKeyForProvider(config.provider);
      if (apiKey) {
        config.apiKey = apiKey;
      }

      // Set base URL for local providers
      if (config.provider === 'lm_studio') {
        config.baseUrl = process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1';
      } else if (config.provider === 'ollama') {
        config.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
      }
    });
    
    return agentConfigs;
  }  /**
   * Check if provider string is valid
   */
  private isValidProvider(provider: string): boolean {
    const validProviders: LLMProvider[] = ['openai', 'anthropic', 'google', 'lm_studio', 'ollama', 'openrouter'];
    return validProviders.includes(provider as LLMProvider);
  }

  /**
   * Get API key for a specific provider
   */
  private getApiKeyForProvider(provider: LLMProvider): string | undefined {
    switch (provider) {
      case 'openai':
      case 'openrouter':
        return process.env.OPENAI_API_KEY;
      case 'anthropic':
        return process.env.ANTHROPIC_API_KEY;
      case 'google':
        return process.env.GOOGLE_API_KEY;
      case 'lm_studio':
      case 'ollama':
        return undefined; // Local providers don't need API keys
      default:
        return undefined;
    }
  }

  /**
   * Get configuration for a specific agent
   */
  public getAgentConfig(agentType: string): AgentLLMConfig {
    const configKey = AGENT_TYPE_TO_CONFIG_KEY[agentType];
    if (!configKey) {
      // Return default configuration for unknown agent types
      return this.config.agents.default;
    }

    return this.config.agents[configKey] || this.config.agents.default;
  }

  /**
   * Get the full configuration
   */
  public getConfig(): EnhancedTradingAgentsConfig {
    return this.config;
  }

  /**
   * Update agent configuration at runtime
   */
  public updateAgentConfig(agentType: string, updates: Partial<AgentLLMConfig>): void {
    const configKey = AGENT_TYPE_TO_CONFIG_KEY[agentType];
    if (!configKey) {
      // Silently ignore unknown agent types
      return;
    }

    const currentConfig = this.config.agents[configKey] || this.config.agents.default;
    this.config.agents[configKey] = {
      ...currentConfig,
      ...updates
    };
  }

  /**
   * Validate that all required API keys are present for configured providers
   */
  public validateConfiguration(): void {
    const errors: string[] = [];
    const requiredProviders = new Set<LLMProvider>();

    // Collect all providers used by agents
    Object.values(this.config.agents).forEach(agentConfig => {
      if (agentConfig) {
        requiredProviders.add(agentConfig.provider);
      }
    });

    // Check for required API keys
    requiredProviders.forEach(provider => {
      switch (provider) {
        case 'openai':
        case 'openrouter':
          if (!process.env.OPENAI_API_KEY) {
            errors.push(`OPENAI_API_KEY is required for ${provider} provider`);
          }
          break;
        case 'anthropic':
          if (!process.env.ANTHROPIC_API_KEY) {
            errors.push(`ANTHROPIC_API_KEY is required for ${provider} provider`);
          }
          break;
        case 'google':
          if (!process.env.GOOGLE_API_KEY) {
            errors.push(`GOOGLE_API_KEY is required for ${provider} provider`);
          }
          break;
        case 'lm_studio':
          // Local provider - no API key needed, but check URL availability
          break;
        case 'ollama':
          // Local provider - no API key needed, but check URL availability
          break;
      }
    });

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Create a backward-compatible legacy config for existing code
   */
  public toLegacyConfig() {
    // Use the default agent config as the global LLM settings
    const defaultConfig = this.config.agents.default;
    
    return {
      ...DEFAULT_CONFIG,
      llmProvider: defaultConfig.provider,
      deepThinkLlm: defaultConfig.model,
      quickThinkLlm: defaultConfig.model,
      backendUrl: defaultConfig.baseUrl || this.getDefaultBackendUrl(defaultConfig.provider),
      openaiApiKey: process.env.OPENAI_API_KEY,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      googleApiKey: process.env.GOOGLE_API_KEY
    };
  }

  /**
   * Get default backend URL for a provider
   */
  private getDefaultBackendUrl(provider: LLMProvider): string {
    switch (provider) {
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'anthropic':
        return 'https://api.anthropic.com';
      case 'google':
        return 'https://generativelanguage.googleapis.com';
      case 'lm_studio':
        return 'http://localhost:1234/v1';
      case 'ollama':
        return 'http://localhost:11434';
      case 'openrouter':
        return 'https://openrouter.ai/api/v1';
      default:
        return 'https://api.openai.com/v1';
    }
  }

  /**
   * Get configuration summary as formatted string
   */
  public getConfigSummary(): string {
    let output = '\n🔧 Agent Configuration Summary:\n';
    output += '='.repeat(50) + '\n';
    
    Object.entries(this.config.agents).forEach(([agentType, config]) => {
      if (config && agentType !== 'default') {
        output += `${agentType.padEnd(18)}: ${config.provider.padEnd(12)} | ${config.model}\n`;
      }
    });
    
    output += '\n📋 Default Configuration:\n';
    const defaultConfig = this.config.agents.default;
    output += `Provider: ${defaultConfig.provider}\n`;
    output += `Model: ${defaultConfig.model}\n`;
    output += `Temperature: ${defaultConfig.temperature}\n`;
    output += `Max Tokens: ${defaultConfig.maxTokens}\n\n`;
    
    return output;
  }

  /**
   * Print configuration summary to console
   * @deprecated Use getConfigSummary() instead for better testability
   */
  public printConfigSummary(): void {
    // eslint-disable-next-line no-console
    console.log(this.getConfigSummary());
  }
}

// Create singleton instance
export const enhancedConfigLoader = new EnhancedConfigLoader();