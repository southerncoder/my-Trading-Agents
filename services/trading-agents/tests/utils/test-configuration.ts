/**
 * Test Configuration Management for Different Scenarios
 * 
 * Provides utilities for managing test configurations across different scenarios
 * Requirements: 7.1, 7.2, 7.3
 */

import { TradingAgentsConfig } from '../../src/config';
import {
  BacktestConfig,
  MarketData,
  NewsData,
  SentimentData
} from '../../src/types';

export interface TestScenarioConfig {
  name: string;
  description: string;
  marketCondition: 'bull' | 'bear' | 'sideways' | 'volatile' | 'crash' | 'recovery';
  dataProviderConfig: {
    primary: string;
    fallbacks: string[];
    responseDelays: Record<string, number>;
    failureRates: Record<string, number>;
  };
  tradingConfig: Partial<TradingAgentsConfig>;
  expectedOutcomes: {
    minSuccessRate: number;
    maxExecutionTime: number;
    expectedSignalType?: 'BUY' | 'SELL' | 'HOLD';
    expectedRiskLevel?: 'low' | 'medium' | 'high';
  };
}

export interface PerformanceTestConfig {
  name: string;
  description: string;
  dataSize: {
    symbols: number;
    timePoints: number;
    newsArticles: number;
  };
  concurrency: {
    maxConcurrent: number;
    rampUpTime: number;
  };
  performance: {
    maxDuration: number;
    minThroughput: number;
    maxMemoryUsage: number;
  };
}

/**
 * Test configuration factory
 */
export class TestConfigurationFactory {
  /**
   * Create configuration for bull market scenario
   */
  static createBullMarketScenario(): TestScenarioConfig {
    return {
      name: 'bull-market',
      description: 'Bull market with positive sentiment and upward trends',
      marketCondition: 'bull',
      dataProviderConfig: {
        primary: 'yahoo-finance',
        fallbacks: ['alpha-vantage', 'marketstack'],
        responseDelays: {
          'yahoo-finance': 50,
          'alpha-vantage': 100,
          'marketstack': 150
        },
        failureRates: {
          'yahoo-finance': 0.05,
          'alpha-vantage': 0.1,
          'marketstack': 0.15
        }
      },
      tradingConfig: {
        riskTolerance: 'moderate',
        analysisDepth: 'comprehensive',
        strategyEnsemble: {
          enabled: true,
          strategies: ['momentum', 'breakout'],
          weightingMethod: 'performance-based'
        }
      },
      expectedOutcomes: {
        minSuccessRate: 90,
        maxExecutionTime: 30000,
        expectedSignalType: 'BUY',
        expectedRiskLevel: 'medium'
      }
    };
  }

  /**
   * Create configuration for bear market scenario
   */
  static createBearMarketScenario(): TestScenarioConfig {
    return {
      name: 'bear-market',
      description: 'Bear market with negative sentiment and downward trends',
      marketCondition: 'bear',
      dataProviderConfig: {
        primary: 'yahoo-finance',
        fallbacks: ['alpha-vantage', 'marketstack'],
        responseDelays: {
          'yahoo-finance': 75,
          'alpha-vantage': 125,
          'marketstack': 200
        },
        failureRates: {
          'yahoo-finance': 0.1,
          'alpha-vantage': 0.15,
          'marketstack': 0.2
        }
      },
      tradingConfig: {
        riskTolerance: 'conservative',
        analysisDepth: 'comprehensive',
        strategyEnsemble: {
          enabled: true,
          strategies: ['mean-reversion', 'defensive'],
          weightingMethod: 'risk-adjusted'
        }
      },
      expectedOutcomes: {
        minSuccessRate: 85,
        maxExecutionTime: 35000,
        expectedSignalType: 'SELL',
        expectedRiskLevel: 'high'
      }
    };
  }

  /**
   * Create configuration for volatile market scenario
   */
  static createVolatileMarketScenario(): TestScenarioConfig {
    return {
      name: 'volatile-market',
      description: 'Highly volatile market with mixed signals',
      marketCondition: 'volatile',
      dataProviderConfig: {
        primary: 'yahoo-finance',
        fallbacks: ['alpha-vantage', 'marketstack'],
        responseDelays: {
          'yahoo-finance': 100,
          'alpha-vantage': 150,
          'marketstack': 250
        },
        failureRates: {
          'yahoo-finance': 0.15,
          'alpha-vantage': 0.2,
          'marketstack': 0.25
        }
      },
      tradingConfig: {
        riskTolerance: 'moderate',
        analysisDepth: 'comprehensive',
        strategyEnsemble: {
          enabled: true,
          strategies: ['momentum', 'mean-reversion', 'volatility'],
          weightingMethod: 'adaptive'
        }
      },
      expectedOutcomes: {
        minSuccessRate: 75,
        maxExecutionTime: 40000,
        expectedRiskLevel: 'high'
      }
    };
  }

  /**
   * Create configuration for data provider failover scenario
   */
  static createFailoverScenario(): TestScenarioConfig {
    return {
      name: 'provider-failover',
      description: 'Primary provider fails, testing failover mechanisms',
      marketCondition: 'bull',
      dataProviderConfig: {
        primary: 'yahoo-finance',
        fallbacks: ['alpha-vantage', 'marketstack'],
        responseDelays: {
          'yahoo-finance': 5000, // Very slow
          'alpha-vantage': 100,
          'marketstack': 150
        },
        failureRates: {
          'yahoo-finance': 0.8, // High failure rate
          'alpha-vantage': 0.1,
          'marketstack': 0.15
        }
      },
      tradingConfig: {
        riskTolerance: 'moderate',
        analysisDepth: 'quick',
        dataResilience: {
          enabled: true,
          circuitBreakerThreshold: 3,
          cacheEnabled: true,
          cacheTTL: 300
        }
      },
      expectedOutcomes: {
        minSuccessRate: 80, // Should still succeed via fallback
        maxExecutionTime: 15000, // Should be fast due to failover
        expectedRiskLevel: 'medium'
      }
    };
  }

  /**
   * Create configuration for high-frequency performance test
   */
  static createHighFrequencyPerformanceTest(): PerformanceTestConfig {
    return {
      name: 'high-frequency-performance',
      description: 'High-frequency trading simulation with large datasets',
      dataSize: {
        symbols: 100,
        timePoints: 1000,
        newsArticles: 500
      },
      concurrency: {
        maxConcurrent: 50,
        rampUpTime: 5000
      },
      performance: {
        maxDuration: 60000,
        minThroughput: 100,
        maxMemoryUsage: 500 * 1024 * 1024 // 500MB
      }
    };
  }

  /**
   * Create configuration for load testing
   */
  static createLoadTestConfig(): PerformanceTestConfig {
    return {
      name: 'load-test',
      description: 'Load testing with sustained high throughput',
      dataSize: {
        symbols: 50,
        timePoints: 500,
        newsArticles: 200
      },
      concurrency: {
        maxConcurrent: 20,
        rampUpTime: 10000
      },
      performance: {
        maxDuration: 120000,
        minThroughput: 50,
        maxMemoryUsage: 300 * 1024 * 1024 // 300MB
      }
    };
  }

  /**
   * Create configuration for memory stress test
   */
  static createMemoryStressTestConfig(): PerformanceTestConfig {
    return {
      name: 'memory-stress-test',
      description: 'Memory usage testing with large datasets',
      dataSize: {
        symbols: 1000,
        timePoints: 2000,
        newsArticles: 1000
      },
      concurrency: {
        maxConcurrent: 10,
        rampUpTime: 2000
      },
      performance: {
        maxDuration: 180000,
        minThroughput: 10,
        maxMemoryUsage: 1024 * 1024 * 1024 // 1GB
      }
    };
  }
}

/**
 * Test data configuration manager
 */
export class TestDataConfigManager {
  private static configurations = new Map<string, any>();

  /**
   * Register a test configuration
   */
  static registerConfiguration(name: string, config: any): void {
    this.configurations.set(name, config);
  }

  /**
   * Get a test configuration
   */
  static getConfiguration<T>(name: string): T | undefined {
    return this.configurations.get(name) as T;
  }

  /**
   * Get all configuration names
   */
  static getConfigurationNames(): string[] {
    return Array.from(this.configurations.keys());
  }

  /**
   * Clear all configurations
   */
  static clearConfigurations(): void {
    this.configurations.clear();
  }

  /**
   * Create trading config from scenario
   */
  static createTradingConfigFromScenario(scenario: TestScenarioConfig): TradingAgentsConfig {
    const baseConfig: TradingAgentsConfig = {
      symbol: 'AAPL',
      analysisDepth: 'comprehensive',
      riskTolerance: 'moderate',
      llmProvider: 'openai',
      llmModel: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 4000,
      dataProviders: {
        primary: scenario.dataProviderConfig.primary,
        fallback: scenario.dataProviderConfig.fallbacks,
        newsProviders: ['google-news', 'newsapi'],
        socialProviders: ['reddit']
      },
      memoryProvider: 'zep-graphiti',
      memoryConfig: {
        sessionId: `test-${scenario.name}`,
        userId: 'test-user'
      }
    };

    return { ...baseConfig, ...scenario.tradingConfig };
  }

  /**
   * Create backtest config from scenario
   */
  static createBacktestConfigFromScenario(
    scenario: TestScenarioConfig,
    strategy: any,
    symbols: string[] = ['AAPL']
  ): BacktestConfig {
    return {
      strategy,
      symbols,
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
      endDate: new Date(),
      initialCapital: 100000,
      commission: 0.001,
      slippage: 0.0005,
      marketImpact: true
    };
  }
}

/**
 * Environment-specific test configurations
 */
export class EnvironmentTestConfig {
  /**
   * Get configuration for CI/CD environment
   */
  static getCIConfig(): Partial<TestScenarioConfig> {
    return {
      dataProviderConfig: {
        primary: 'mock-provider',
        fallbacks: ['mock-fallback'],
        responseDelays: {
          'mock-provider': 10,
          'mock-fallback': 20
        },
        failureRates: {
          'mock-provider': 0,
          'mock-fallback': 0
        }
      },
      expectedOutcomes: {
        minSuccessRate: 95,
        maxExecutionTime: 10000
      }
    };
  }

  /**
   * Get configuration for local development
   */
  static getLocalConfig(): Partial<TestScenarioConfig> {
    return {
      dataProviderConfig: {
        primary: 'yahoo-finance',
        fallbacks: ['alpha-vantage'],
        responseDelays: {
          'yahoo-finance': 100,
          'alpha-vantage': 200
        },
        failureRates: {
          'yahoo-finance': 0.05,
          'alpha-vantage': 0.1
        }
      },
      expectedOutcomes: {
        minSuccessRate: 90,
        maxExecutionTime: 30000
      }
    };
  }

  /**
   * Get configuration for performance testing environment
   */
  static getPerformanceConfig(): Partial<PerformanceTestConfig> {
    return {
      dataSize: {
        symbols: 1000,
        timePoints: 5000,
        newsArticles: 2000
      },
      concurrency: {
        maxConcurrent: 100,
        rampUpTime: 30000
      },
      performance: {
        maxDuration: 300000, // 5 minutes
        minThroughput: 200,
        maxMemoryUsage: 2 * 1024 * 1024 * 1024 // 2GB
      }
    };
  }
}

/**
 * Test scenario validator
 */
export class TestScenarioValidator {
  /**
   * Validate test scenario configuration
   */
  static validateScenario(scenario: TestScenarioConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!scenario.name || scenario.name.trim() === '') {
      errors.push('Scenario name is required');
    }

    if (!scenario.marketCondition) {
      errors.push('Market condition is required');
    }

    if (!scenario.dataProviderConfig.primary) {
      errors.push('Primary data provider is required');
    }

    if (!scenario.dataProviderConfig.fallbacks || scenario.dataProviderConfig.fallbacks.length === 0) {
      errors.push('At least one fallback provider is required');
    }

    if (scenario.expectedOutcomes.minSuccessRate < 0 || scenario.expectedOutcomes.minSuccessRate > 100) {
      errors.push('Success rate must be between 0 and 100');
    }

    if (scenario.expectedOutcomes.maxExecutionTime <= 0) {
      errors.push('Max execution time must be positive');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate performance test configuration
   */
  static validatePerformanceConfig(config: PerformanceTestConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.name || config.name.trim() === '') {
      errors.push('Performance test name is required');
    }

    if (config.dataSize.symbols <= 0) {
      errors.push('Number of symbols must be positive');
    }

    if (config.dataSize.timePoints <= 0) {
      errors.push('Number of time points must be positive');
    }

    if (config.concurrency.maxConcurrent <= 0) {
      errors.push('Max concurrent operations must be positive');
    }

    if (config.performance.maxDuration <= 0) {
      errors.push('Max duration must be positive');
    }

    if (config.performance.minThroughput <= 0) {
      errors.push('Min throughput must be positive');
    }

    if (config.performance.maxMemoryUsage <= 0) {
      errors.push('Max memory usage must be positive');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}