import { enhancedConfigLoader } from './enhanced-loader';
import { TradingAgentsConfig } from '../types/config';

/**
 * Backward-compatible configuration loader
 * Provides a bridge between legacy code and the new enhanced configuration system
 */
export class BackwardCompatibleConfig {
  private static instance: BackwardCompatibleConfig;
  private legacyConfig: TradingAgentsConfig;

  private constructor() {
    // Initialize with enhanced configuration converted to legacy format
    this.legacyConfig = enhancedConfigLoader.toLegacyConfig();
  }

  public static getInstance(): BackwardCompatibleConfig {
    if (!BackwardCompatibleConfig.instance) {
      BackwardCompatibleConfig.instance = new BackwardCompatibleConfig();
    }
    return BackwardCompatibleConfig.instance;
  }

  /**
   * Get legacy configuration
   */
  public getConfig(): TradingAgentsConfig {
    return this.legacyConfig;
  }

  /**
   * Update configuration (triggers refresh from enhanced loader)
   */
  public refresh(): void {
    this.legacyConfig = enhancedConfigLoader.toLegacyConfig();
  }

  /**
   * Get agent-specific configuration (enhanced feature)
   */
  public getAgentConfig(agentType: string) {
    return enhancedConfigLoader.getAgentConfig(agentType);
  }

  /**
   * Create configuration with overrides
   */
  public createConfig(overrides: Partial<TradingAgentsConfig> = {}): TradingAgentsConfig {
    return {
      ...this.legacyConfig,
      ...overrides
    };
  }
}

// Export singleton instance
export const backwardCompatibleConfig = BackwardCompatibleConfig.getInstance();

/**
 * Legacy export for backward compatibility
 */
export const DEFAULT_CONFIG = backwardCompatibleConfig.getConfig();

/**
 * Legacy factory function for creating configurations
 */
export function createConfig(overrides: Partial<TradingAgentsConfig> = {}): TradingAgentsConfig {
  return backwardCompatibleConfig.createConfig(overrides);
}