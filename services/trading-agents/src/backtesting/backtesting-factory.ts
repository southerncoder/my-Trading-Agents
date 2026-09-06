/**
 * Backtesting Factory for Easy Integration
 * 
 * This module provides factory functions and utilities to easily create
 * and configure the backtesting framework with data providers and storage.
 */

import { createLogger } from '../utils/enhanced-logger';
import { TradingAgentsConfig } from '../config';
import { BacktestEngine } from './backtest-engine';
import { 
  BacktestingDataProvider, 
  createBacktestingDataProvider,
  DataProviderConfig,
  DEFAULT_DATA_PROVIDER_CONFIG
} from './data-provider-integration';
import { BacktestConfig, BacktestResult } from './types';
import { ITradingStrategy } from '../strategies/base-strategy';

/**
 * Configuration for the integrated backtesting system
 */
export interface IntegratedBacktestConfig {
  dataProvider?: Partial<DataProviderConfig>;
  enableGraphStorage?: boolean;
  enablePostgresStorage?: boolean;
}

/**
 * Factory class for creating integrated backtesting systems
 */
export class BacktestingFactory {
  private static readonly logger = createLogger('system', 'backtesting-factory');

  /**
   * Create a fully integrated backtesting engine with data providers
   */
  static async createIntegratedBacktestEngine(
    tradingConfig: TradingAgentsConfig,
    config: IntegratedBacktestConfig = {}
  ): Promise<BacktestEngine> {
    try {
      this.logger.info('creating-integrated-engine', 'Creating integrated backtesting engine', {
        enableGraphStorage: config.enableGraphStorage,
        enablePostgresStorage: config.enablePostgresStorage
      });

      // Create data provider configuration
      const dataProviderConfig: DataProviderConfig = {
        ...DEFAULT_DATA_PROVIDER_CONFIG,
        ...config.dataProvider,
        enableGraphStorage: config.enableGraphStorage || false,
        enablePostgresStorage: config.enablePostgresStorage || false
      };

      // Create and initialize data provider
      const dataProvider = await createBacktestingDataProvider(
        dataProviderConfig,
        tradingConfig
      );

      // Test provider connections
      const connectionStatus = await dataProvider.testConnections();
      this.logger.info('provider-connections-tested', 'Data provider connections tested', connectionStatus);

      // Create backtest engine with data provider
      const engine = new BacktestEngine(dataProvider);

      this.logger.info('integrated-engine-created', 'Integrated backtesting engine created successfully', {
        providerStatus: dataProvider.getProviderStatus()
      });

      return engine;

    } catch (error) {
      this.logger.error('create-integrated-engine-failed', 'Failed to create integrated backtesting engine', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Create a simple backtesting engine without data provider integration
   */
  static createSimpleBacktestEngine(): BacktestEngine {
    this.logger.info('creating-simple-engine', 'Creating simple backtesting engine without data providers');
    return new BacktestEngine();
  }

  /**
   * Run a complete backtest with automatic data loading and result storage
   */
  static async runCompleteBacktest(
    strategy: ITradingStrategy,
    symbols: string[],
    startDate: Date,
    endDate: Date,
    tradingConfig: TradingAgentsConfig,
    options: {
      initialCapital?: number;
      commission?: number;
      slippage?: number;
      enableMarketHours?: boolean;
      enableGraphStorage?: boolean;
      enablePostgresStorage?: boolean;
      dataProvider?: Partial<DataProviderConfig>;
    } = {}
  ): Promise<BacktestResult> {
    try {
      this.logger.info('running-complete-backtest', 'Starting complete backtesting workflow', {
        strategy: strategy.name,
        symbols,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        initialCapital: options.initialCapital || 100000
      });

      // Create integrated backtesting engine
      const integrationConfig: IntegratedBacktestConfig = {};
      if (options.dataProvider) integrationConfig.dataProvider = options.dataProvider;
      if (options.enableGraphStorage !== undefined) integrationConfig.enableGraphStorage = options.enableGraphStorage;
      if (options.enablePostgresStorage !== undefined) integrationConfig.enablePostgresStorage = options.enablePostgresStorage;
      
      const engine = await this.createIntegratedBacktestEngine(tradingConfig, integrationConfig);

      // Configure backtest
      const backtestConfig: BacktestConfig = {
        strategy,
        symbols,
        startDate,
        endDate,
        initialCapital: options.initialCapital || 100000,
        commission: options.commission || 0.001, // 0.1%
        slippage: options.slippage || 0.0005, // 0.05%
        marketImpact: true,
        enableMarketHours: options.enableMarketHours || false
      };

      // Run backtest
      const result = await engine.runBacktest(backtestConfig);

      this.logger.info('complete-backtest-finished', 'Complete backtesting workflow finished', {
        strategy: strategy.name,
        totalReturn: result.performance.totalReturn,
        sharpeRatio: result.performance.sharpeRatio,
        maxDrawdown: result.performance.maxDrawdown,
        totalTrades: result.trades.length
      });

      return result;

    } catch (error) {
      this.logger.error('complete-backtest-failed', 'Complete backtesting workflow failed', {
        strategy: strategy.name,
        symbols,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Validate backtesting configuration and requirements
   */
  static validateBacktestConfig(config: BacktestConfig): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate strategy
    if (!config.strategy) {
      errors.push('Strategy is required');
    } else if (!config.strategy.validate()) {
      errors.push('Strategy validation failed');
    }

    // Validate symbols
    if (!config.symbols || config.symbols.length === 0) {
      errors.push('At least one symbol is required');
    }

    // Validate dates
    if (!config.startDate || !config.endDate) {
      errors.push('Start date and end date are required');
    } else if (config.startDate >= config.endDate) {
      errors.push('Start date must be before end date');
    } else {
      const daysDiff = (config.endDate.getTime() - config.startDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff < 30) {
        warnings.push('Backtest period is less than 30 days - results may not be statistically significant');
      }
      if (daysDiff > 365 * 10) {
        warnings.push('Backtest period is very long (>10 years) - consider shorter periods for faster execution');
      }
    }

    // Validate capital
    if (!config.initialCapital || config.initialCapital <= 0) {
      errors.push('Initial capital must be positive');
    } else if (config.initialCapital < 10000) {
      warnings.push('Initial capital is low (<$10,000) - commission costs may significantly impact results');
    }

    // Validate commission and slippage
    if (config.commission < 0 || config.commission > 0.01) {
      warnings.push('Commission rate seems unusual (should be 0-1%)');
    }
    if (config.slippage < 0 || config.slippage > 0.01) {
      warnings.push('Slippage rate seems unusual (should be 0-1%)');
    }

    const isValid = errors.length === 0;

    this.logger.debug('config-validation-complete', 'Backtest configuration validation completed', {
      isValid,
      errorsCount: errors.length,
      warningsCount: warnings.length
    });

    return { isValid, errors, warnings };
  }

  /**
   * Get recommended configuration for different use cases
   */
  static getRecommendedConfig(useCase: 'development' | 'testing' | 'production'): IntegratedBacktestConfig {
    switch (useCase) {
      case 'development':
        return {
          dataProvider: {
            preferredProvider: 'yahoo',
            enableCaching: true,
            maxRetries: 1,
            timeout: 10000
          },
          enableGraphStorage: false,
          enablePostgresStorage: false
        };

      case 'testing':
        return {
          dataProvider: {
            preferredProvider: 'auto',
            enableCaching: true,
            maxRetries: 2,
            timeout: 15000
          },
          enableGraphStorage: true,
          enablePostgresStorage: false
        };

      case 'production':
        return {
          dataProvider: {
            preferredProvider: 'auto',
            enableCaching: true,
            maxRetries: 3,
            timeout: 30000
          },
          enableGraphStorage: true,
          enablePostgresStorage: true
        };

      default:
        return {
          dataProvider: DEFAULT_DATA_PROVIDER_CONFIG,
          enableGraphStorage: false,
          enablePostgresStorage: false
        };
    }
  }
}

/**
 * Convenience function to create an integrated backtesting engine
 */
export async function createBacktestEngine(
  tradingConfig: TradingAgentsConfig,
  config?: IntegratedBacktestConfig
): Promise<BacktestEngine> {
  return BacktestingFactory.createIntegratedBacktestEngine(tradingConfig, config);
}

/**
 * Convenience function to run a complete backtest
 */
export async function runBacktest(
  strategy: ITradingStrategy,
  symbols: string[],
  startDate: Date,
  endDate: Date,
  tradingConfig: TradingAgentsConfig,
  options?: {
    initialCapital?: number;
    commission?: number;
    slippage?: number;
    enableMarketHours?: boolean;
    enableGraphStorage?: boolean;
    enablePostgresStorage?: boolean;
    dataProvider?: Partial<DataProviderConfig>;
  }
): Promise<BacktestResult> {
  return BacktestingFactory.runCompleteBacktest(
    strategy,
    symbols,
    startDate,
    endDate,
    tradingConfig,
    options
  );
}

/**
 * Convenience function to validate backtest configuration
 */
export function validateConfig(config: BacktestConfig): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  return BacktestingFactory.validateBacktestConfig(config);
}