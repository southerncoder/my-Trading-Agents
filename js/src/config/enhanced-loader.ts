import { 
  EnhancedTradingAgentsConfig, 
  AgentLLMConfig, 
  AgentTypeConfigs,
  DEFAULT_AGENT_CONFIGS,
  AGENT_TYPE_TO_CONFIG_KEY
} from '../types/agent-config';
import { LLMProvider } from '../types/config';
import { DEFAULT_CONFIG } from './default';

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