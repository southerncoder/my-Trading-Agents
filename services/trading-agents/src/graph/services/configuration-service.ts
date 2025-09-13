/**
 * Configuration Service for Enhanced Trading Graph
 *
 * Handles configuration management, validation, and information retrieval.
 */

import { TradingAgentsConfig } from '../../types/config';
import { AnalystType } from '../langgraph-working';
import { createLogger } from '../../utils/enhanced-logger';

export interface ConfigurationServiceConfig {
  config: TradingAgentsConfig;
  selectedAnalysts: AnalystType[];
  enableLangGraph: boolean;
  workflowInitialized: boolean;
}

/**
 * Service for managing configuration and system information
 */
export class ConfigurationService {
  private logger: any;
  private config: TradingAgentsConfig;
  private selectedAnalysts: AnalystType[];
  private enableLangGraph: boolean;
  private workflowInitialized: boolean;

  constructor(config: ConfigurationServiceConfig) {
    this.logger = createLogger('graph', 'configuration-service');
    this.config = config.config;
    this.selectedAnalysts = config.selectedAnalysts;
    this.enableLangGraph = config.enableLangGraph;
    this.workflowInitialized = config.workflowInitialized;
  }

  /**
   * Get configuration information
   */
  getConfigInfo(): {
    llmProvider: string;
    selectedAnalysts: AnalystType[];
    langGraphEnabled: boolean;
    workflowInitialized: boolean;
  } {
    return {
      llmProvider: this.config.llmProvider,
      selectedAnalysts: this.selectedAnalysts,
      langGraphEnabled: this.enableLangGraph,
      workflowInitialized: this.workflowInitialized
    };
  }

  /**
   * Update workflow initialization status
   */
  setWorkflowInitialized(initialized: boolean): void {
    this.workflowInitialized = initialized;
    this.logger.info('setWorkflowInitialized', 'Workflow initialization status updated', { initialized });
  }

  /**
   * Validate configuration
   */
  validateConfiguration(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      // Validate required configuration fields
      if (!this.config.llmProvider) {
        errors.push('LLM provider is required');
      }

      if (!this.config.backendUrl && this.config.llmProvider === 'lm_studio') {
        errors.push('Backend URL is required for LM Studio provider');
      }

      if (this.selectedAnalysts.length === 0) {
        errors.push('At least one analyst must be selected');
      }

      // Validate analyst types
      const validAnalysts: AnalystType[] = ['market', 'social', 'news', 'fundamentals'];
      const invalidAnalysts = this.selectedAnalysts.filter(analyst => !validAnalysts.includes(analyst));
      if (invalidAnalysts.length > 0) {
        errors.push(`Invalid analyst types: ${invalidAnalysts.join(', ')}`);
      }

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      this.logger.error('validateConfiguration', 'Configuration validation failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        valid: false,
        errors: ['Configuration validation failed due to internal error']
      };
    }
  }

  /**
   * Get system status information
   */
  getSystemStatus(): {
    configurationValid: boolean;
    configurationErrors: string[];
    systemReady: boolean;
    componentsStatus: Record<string, boolean>;
  } {
    const validation = this.validateConfiguration();

    const componentsStatus: Record<string, boolean> = {
      langGraph: this.enableLangGraph,
      workflow: this.workflowInitialized,
      configuration: validation.valid
    };

    return {
      configurationValid: validation.valid,
      configurationErrors: validation.errors,
      systemReady: validation.valid && this.workflowInitialized,
      componentsStatus
    };
  }

  /**
   * Get configuration as JSON (for debugging)
   */
  getConfigurationJson(): string {
    try {
      return JSON.stringify({
        config: this.config,
        selectedAnalysts: this.selectedAnalysts,
        enableLangGraph: this.enableLangGraph,
        workflowInitialized: this.workflowInitialized
      }, null, 2);
    } catch (error) {
      this.logger.warn('getConfigurationJson', 'Failed to serialize configuration', {
        error: error instanceof Error ? error.message : String(error)
      });
      return '{}';
    }
  }

  /**
   * Update selected analysts
   */
  updateSelectedAnalysts(analysts: AnalystType[]): void {
    this.selectedAnalysts = [...analysts];
    this.logger.info('updateSelectedAnalysts', 'Selected analysts updated', { analysts });
  }

  /**
   * Get available analyst types
   */
  getAvailableAnalystTypes(): AnalystType[] {
    return ['market', 'social', 'news', 'fundamentals'];
  }
}

/**
 * Factory function to create ConfigurationService instance
 */
export function createConfigurationService(config: ConfigurationServiceConfig): ConfigurationService {
  return new ConfigurationService(config);
}