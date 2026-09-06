/**
 * Data Provider Integration for Backtesting Framework
 * 
 * This module integrates the backtesting framework with existing data providers:
 * - MarketStack API for historical market data
 * - Yahoo Finance service for comprehensive market data
 * - PostgreSQL for backtesting results storage (future implementation)
 * - Zep Graphiti for graph-based relationship storage
 */

import { createLogger } from '../utils/enhanced-logger';
import { MarketData } from '../strategies/base-strategy';
import { YahooFinanceAPI } from '../dataflows/yahoo-finance';
import { MarketStackDataProvider, MARKETSTACK_CONFIG } from '../dataflows/marketstack';
import { ZepGraphitiMemoryProvider, EpisodeType } from '../providers/zep-graphiti/zep-graphiti-memory-provider-client';
import { TradingAgentsConfig } from '../config';
import {
  BacktestResult,
  DateRange,
  PerformanceMetrics,
  ExecutedTrade,
  EquityCurve
} from './types';

/**
 * Configuration for data provider integration
 */
export interface DataProviderConfig {
  preferredProvider: 'yahoo' | 'marketstack' | 'auto';
  enableCaching: boolean;
  enableGraphStorage: boolean;
  enablePostgresStorage: boolean;
  maxRetries: number;
  timeout: number;
}

/**
 * Historical data request parameters
 */
export interface HistoricalDataRequest {
  symbols: string[];
  startDate: Date;
  endDate: Date;
  interval?: 'daily' | 'hourly' | 'minute';
  adjustForSplits?: boolean;
  adjustForDividends?: boolean;
}

/**
 * Data provider integration service for backtesting
 */
export class BacktestingDataProvider {
  private readonly logger = createLogger('system', 'backtesting-data-provider');
  private readonly config: DataProviderConfig;
  private readonly tradingConfig: TradingAgentsConfig;
  private yahooProvider: YahooFinanceAPI | null = null;
  private marketStackProvider: MarketStackDataProvider | null = null;
  private graphProvider: ZepGraphitiMemoryProvider | null = null;

  constructor(config: DataProviderConfig, tradingConfig: TradingAgentsConfig) {
    this.config = config;
    this.tradingConfig = tradingConfig;

    this.logger.info('constructor', 'Initializing backtesting data provider', {
      preferredProvider: this.config.preferredProvider,
      enableCaching: this.config.enableCaching,
      enableGraphStorage: this.config.enableGraphStorage
    });
  }

  /**
   * Initialize data providers based on configuration
   */
  async initialize(): Promise<void> {
    try {
      // Initialize Yahoo Finance provider
      if (this.config.preferredProvider === 'yahoo' || this.config.preferredProvider === 'auto') {
        try {
          this.yahooProvider = new YahooFinanceAPI(this.tradingConfig);
          this.logger.info('provider-initialized', 'Yahoo Finance provider initialized');
        } catch (error) {
          this.logger.warn('provider-init-failed', 'Yahoo Finance provider initialization failed', {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Initialize MarketStack provider
      if (this.config.preferredProvider === 'marketstack' || this.config.preferredProvider === 'auto') {
        try {
          if (MARKETSTACK_CONFIG.apiKey) {
            this.marketStackProvider = new MarketStackDataProvider(MARKETSTACK_CONFIG);
            const connected = await this.marketStackProvider.testConnection();
            if (connected) {
              this.logger.info('provider-initialized', 'MarketStack provider initialized and tested');
            } else {
              this.logger.warn('provider-test-failed', 'MarketStack provider failed connection test');
              this.marketStackProvider = null;
            }
          } else {
            this.logger.warn('provider-config-missing', 'MarketStack API key not configured');
          }
        } catch (error) {
          this.logger.warn('provider-init-failed', 'MarketStack provider initialization failed', {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Initialize Zep Graphiti provider for storing backtest results
      if (this.config.enableGraphStorage) {
        try {
          this.graphProvider = new ZepGraphitiMemoryProvider(
            {
              sessionId: `backtesting-${Date.now()}`,
              userId: 'backtesting-system'
            },
            this.tradingConfig.llm || {} as any
          );
          
          const connected = await this.graphProvider.testConnection();
          if (connected) {
            this.logger.info('provider-initialized', 'Zep Graphiti provider initialized for backtest storage');
          } else {
            this.logger.warn('provider-test-failed', 'Zep Graphiti provider failed connection test');
            this.graphProvider = null;
          }
        } catch (error) {
          this.logger.warn('provider-init-failed', 'Zep Graphiti provider initialization failed', {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      this.logger.info('initialization-complete', 'Data provider initialization completed', {
        yahooAvailable: !!this.yahooProvider,
        marketStackAvailable: !!this.marketStackProvider,
        graphStorageAvailable: !!this.graphProvider
      });

    } catch (error) {
      this.logger.error('initialization-failed', 'Data provider initialization failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Load historical market data for backtesting
   */
  async loadHistoricalData(request: HistoricalDataRequest): Promise<Record<string, MarketData[]>> {
    try {
      this.logger.info('load-historical-data', 'Loading historical data for backtesting', {
        symbols: request.symbols,
        startDate: request.startDate.toISOString(),
        endDate: request.endDate.toISOString(),
        symbolCount: request.symbols.length
      });

      const historicalData: Record<string, MarketData[]> = {};
      const failedSymbols: string[] = [];

      // Process each symbol
      for (const symbol of request.symbols) {
        try {
          const symbolData = await this.loadSymbolData(symbol, request);
          if (symbolData && symbolData.length > 0) {
            // Group data by date
            for (const dataPoint of symbolData) {
              const dateStr = dataPoint.timestamp.toISOString().split('T')[0];
              if (!historicalData[dateStr]) {
                historicalData[dateStr] = [];
              }
              historicalData[dateStr]!.push(dataPoint);
            }
          } else {
            failedSymbols.push(symbol);
          }
        } catch (symbolError) {
          this.logger.warn('symbol-data-failed', `Failed to load data for symbol ${symbol}`, {
            symbol,
            error: symbolError instanceof Error ? symbolError.message : String(symbolError)
          });
          failedSymbols.push(symbol);
        }
      }

      if (failedSymbols.length > 0) {
        this.logger.warn('partial-data-load', 'Some symbols failed to load', {
          failedSymbols,
          successfulSymbols: request.symbols.filter(s => !failedSymbols.includes(s))
        });
      }

      this.logger.info('historical-data-loaded', 'Historical data loading completed', {
        totalDates: Object.keys(historicalData).length,
        totalDataPoints: Object.values(historicalData).flat().length,
        failedSymbols: failedSymbols.length
      });

      return historicalData;

    } catch (error) {
      this.logger.error('load-historical-data-failed', 'Failed to load historical data', {
        symbols: request.symbols,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Load data for a single symbol using available providers
   */
  private async loadSymbolData(symbol: string, request: HistoricalDataRequest): Promise<MarketData[]> {
    const startDateStr = request.startDate.toISOString().split('T')[0];
    const endDateStr = request.endDate.toISOString().split('T')[0];

    // Try Yahoo Finance first (if available and preferred)
    if (this.yahooProvider && (this.config.preferredProvider === 'yahoo' || this.config.preferredProvider === 'auto')) {
      try {
        this.logger.debug('loading-yahoo-data', `Loading ${symbol} data from Yahoo Finance`, {
          symbol,
          startDate: startDateStr,
          endDate: endDateStr
        });

        const yahooData = await this.yahooProvider.getData(symbol, startDateStr, endDateStr, true);
        const parsedData = this.parseYahooFinanceData(symbol, yahooData);
        
        if (parsedData && parsedData.length > 0) {
          this.logger.debug('yahoo-data-success', `Successfully loaded ${symbol} from Yahoo Finance`, {
            symbol,
            dataPoints: parsedData.length
          });
          return parsedData;
        }
      } catch (yahooError) {
        this.logger.warn('yahoo-data-failed', `Yahoo Finance failed for ${symbol}`, {
          symbol,
          error: yahooError instanceof Error ? yahooError.message : String(yahooError)
        });
      }
    }

    // Try MarketStack as fallback
    if (this.marketStackProvider && (this.config.preferredProvider === 'marketstack' || this.config.preferredProvider === 'auto')) {
      try {
        this.logger.debug('loading-marketstack-data', `Loading ${symbol} data from MarketStack`, {
          symbol,
          startDate: startDateStr,
          endDate: endDateStr
        });

        const marketStackData = await this.marketStackProvider.getHistoricalData(
          symbol,
          startDateStr,
          endDateStr,
          { sort: 'ASC' }
        );

        const parsedData = this.parseMarketStackData(symbol, marketStackData);
        
        if (parsedData && parsedData.length > 0) {
          this.logger.debug('marketstack-data-success', `Successfully loaded ${symbol} from MarketStack`, {
            symbol,
            dataPoints: parsedData.length
          });
          return parsedData;
        }
      } catch (marketStackError) {
        this.logger.warn('marketstack-data-failed', `MarketStack failed for ${symbol}`, {
          symbol,
          error: marketStackError instanceof Error ? marketStackError.message : String(marketStackError)
        });
      }
    }

    // If all providers fail, throw error
    throw new Error(`Failed to load data for ${symbol} from all available providers`);
  }

  /**
   * Parse Yahoo Finance CSV data into MarketData format
   */
  private parseYahooFinanceData(symbol: string, csvData: string): MarketData[] {
    try {
      const lines = csvData.split('\n');
      const dataPoints: MarketData[] = [];

      // Skip header and metadata lines
      let startIndex = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Date,Open,High,Low,Close,Adj Close,Volume')) {
          startIndex = i + 1;
          break;
        }
      }

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',');
        if (parts.length >= 7) {
          try {
            const dataPoint: MarketData = {
              symbol,
              timestamp: new Date(parts[0] || ''),
              open: parseFloat(parts[1] || '0'),
              high: parseFloat(parts[2] || '0'),
              low: parseFloat(parts[3] || '0'),
              close: parseFloat(parts[4] || '0'),
              volume: parseInt(parts[6] || '0') || 0,
              technicalIndicators: {
                adjustedClose: parseFloat(parts[5] || '0')
              }
            };

            // Validate data point
            if (!isNaN(dataPoint.open) && !isNaN(dataPoint.high) && 
                !isNaN(dataPoint.low) && !isNaN(dataPoint.close)) {
              dataPoints.push(dataPoint);
            }
          } catch (parseError) {
            this.logger.debug('parse-line-failed', `Failed to parse line: ${line}`, {
              symbol,
              line,
              error: parseError instanceof Error ? parseError.message : String(parseError)
            });
          }
        }
      }

      return dataPoints;
    } catch (error) {
      this.logger.error('parse-yahoo-data-failed', 'Failed to parse Yahoo Finance data', {
        symbol,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Parse MarketStack data into MarketData format
   */
  private parseMarketStackData(symbol: string, marketStackData: any[]): MarketData[] {
    try {
      const dataPoints: MarketData[] = [];

      for (const item of marketStackData) {
        try {
          const dataPoint: MarketData = {
            symbol: item?.symbol || symbol,
            timestamp: new Date(item?.date || ''),
            open: item?.open || 0,
            high: item?.high || 0,
            low: item?.low || 0,
            close: item?.close || 0,
            volume: item?.volume || 0,
            technicalIndicators: {
              adjustedOpen: item?.adj_open,
              adjustedHigh: item?.adj_high,
              adjustedLow: item?.adj_low,
              adjustedClose: item?.adj_close,
              splitFactor: item?.split_factor,
              dividend: item?.dividend
            }
          };

          // Validate data point
          if (!isNaN(dataPoint.open) && !isNaN(dataPoint.high) && 
              !isNaN(dataPoint.low) && !isNaN(dataPoint.close)) {
            dataPoints.push(dataPoint);
          }
        } catch (parseError) {
          this.logger.debug('parse-item-failed', `Failed to parse MarketStack item`, {
            symbol,
            item,
            error: parseError instanceof Error ? parseError.message : String(parseError)
          });
        }
      }

      return dataPoints;
    } catch (error) {
      this.logger.error('parse-marketstack-data-failed', 'Failed to parse MarketStack data', {
        symbol,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Store backtest results in Zep Graphiti for relationship analysis
   */
  async storeBacktestResults(result: BacktestResult): Promise<void> {
    if (!this.config.enableGraphStorage || !this.graphProvider) {
      this.logger.debug('graph-storage-disabled', 'Graph storage not enabled or available');
      return;
    }

    try {
      this.logger.info('storing-backtest-results', 'Storing backtest results in graph database', {
        strategy: result.config.strategy.name,
        totalTrades: result.trades.length,
        totalReturn: result.performance.totalReturn
      });

      // Store backtest summary
      await this.graphProvider.addEpisode(
        `Backtest: ${result.config.strategy.name}`,
        JSON.stringify({
          strategy: result.config.strategy.name,
          symbols: result.config.symbols,
          startDate: result.startDate.toISOString(),
          endDate: result.endDate.toISOString(),
          performance: result.performance,
          duration: result.duration,
          warnings: result.warnings
        }),
        EpisodeType.ANALYSIS,
        {
          type: 'backtest-result',
          strategy: result.config.strategy.name,
          totalReturn: result.performance.totalReturn,
          sharpeRatio: result.performance.sharpeRatio,
          maxDrawdown: result.performance.maxDrawdown,
          totalTrades: result.trades.length
        }
      );

      // Store key performance relationships
      await this.graphProvider.addFact(
        result.config.strategy.name,
        'performance_metrics',
        'achieved',
        result.performance.sharpeRatio > 1 ? 0.9 : 0.5,
        {
          totalReturn: result.performance.totalReturn,
          sharpeRatio: result.performance.sharpeRatio,
          maxDrawdown: result.performance.maxDrawdown
        }
      );

      // Store symbol relationships
      for (const symbol of result.config.symbols) {
        await this.graphProvider.addFact(
          result.config.strategy.name,
          symbol,
          'traded',
          1.0,
          {
            tradesCount: result.trades.filter(t => t.symbol === symbol).length,
            backtestDate: new Date().toISOString()
          }
        );
      }

      this.logger.info('backtest-results-stored', 'Backtest results stored successfully in graph database', {
        strategy: result.config.strategy.name
      });

    } catch (error) {
      this.logger.error('store-backtest-results-failed', 'Failed to store backtest results in graph database', {
        strategy: result.config.strategy.name,
        error: error instanceof Error ? error.message : String(error)
      });
      // Don't throw error - graph storage is optional
    }
  }

  /**
   * Store performance metrics for analysis
   */
  async storePerformanceMetrics(
    strategyName: string,
    metrics: PerformanceMetrics,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.config.enableGraphStorage || !this.graphProvider) {
      return;
    }

    try {
      await this.graphProvider.addEpisode(
        `Performance: ${strategyName}`,
        JSON.stringify(metrics),
        EpisodeType.ANALYSIS,
        {
          type: 'performance-metrics',
          strategy: strategyName,
          ...metadata
        }
      );

      this.logger.debug('performance-metrics-stored', 'Performance metrics stored in graph database', {
        strategy: strategyName
      });
    } catch (error) {
      this.logger.warn('store-performance-metrics-failed', 'Failed to store performance metrics', {
        strategy: strategyName,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Validate data quality and completeness
   */
  validateHistoricalData(data: Record<string, MarketData[]>): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      const dates = Object.keys(data).sort();
      
      if (dates.length === 0) {
        issues.push('No historical data available');
        return { isValid: false, issues, suggestions };
      }

      // Check for data gaps
      const startDate = new Date(dates[0]);
      const endDate = new Date(dates[dates.length - 1]);
      const expectedDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const actualDays = dates.length;
      
      if (actualDays < expectedDays * 0.7) { // Allow for weekends/holidays
        issues.push(`Significant data gaps detected: ${actualDays} days out of ${expectedDays} expected`);
        suggestions.push('Consider using a different date range or data provider');
      }

      // Check data quality for each date
      let invalidDataPoints = 0;
      let totalDataPoints = 0;

      for (const [dateStr, dayData] of Object.entries(data)) {
        for (const dataPoint of dayData) {
          totalDataPoints++;
          
          // Check for invalid prices
          if (dataPoint.open <= 0 || dataPoint.high <= 0 || 
              dataPoint.low <= 0 || dataPoint.close <= 0) {
            invalidDataPoints++;
          }
          
          // Check for impossible price relationships
          if (dataPoint.high < dataPoint.low || 
              dataPoint.high < dataPoint.open || 
              dataPoint.high < dataPoint.close ||
              dataPoint.low > dataPoint.open || 
              dataPoint.low > dataPoint.close) {
            invalidDataPoints++;
          }
        }
      }

      if (invalidDataPoints > 0) {
        const invalidPercentage = (invalidDataPoints / totalDataPoints) * 100;
        if (invalidPercentage > 5) {
          issues.push(`High percentage of invalid data points: ${invalidPercentage.toFixed(2)}%`);
        } else {
          suggestions.push(`Some invalid data points detected: ${invalidDataPoints} out of ${totalDataPoints}`);
        }
      }

      const isValid = issues.length === 0;
      
      this.logger.info('data-validation-complete', 'Historical data validation completed', {
        isValid,
        totalDates: dates.length,
        totalDataPoints,
        invalidDataPoints,
        issuesCount: issues.length
      });

      return { isValid, issues, suggestions };

    } catch (error) {
      this.logger.error('data-validation-failed', 'Data validation failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        isValid: false,
        issues: ['Data validation failed due to internal error'],
        suggestions: ['Check data format and try again']
      };
    }
  }

  /**
   * Get provider status and capabilities
   */
  getProviderStatus(): {
    yahoo: { available: boolean; status: string };
    marketStack: { available: boolean; status: string };
    graphStorage: { available: boolean; status: string };
  } {
    return {
      yahoo: {
        available: !!this.yahooProvider,
        status: this.yahooProvider ? 'Connected' : 'Not available'
      },
      marketStack: {
        available: !!this.marketStackProvider,
        status: this.marketStackProvider ? 'Connected' : 'Not available'
      },
      graphStorage: {
        available: !!this.graphProvider,
        status: this.graphProvider ? 'Connected' : 'Not enabled'
      }
    };
  }

  /**
   * Test all provider connections
   */
  async testConnections(): Promise<{
    yahoo: boolean;
    marketStack: boolean;
    graphStorage: boolean;
  }> {
    const results = {
      yahoo: false,
      marketStack: false,
      graphStorage: false
    };

    // Test Yahoo Finance
    if (this.yahooProvider) {
      try {
        await this.yahooProvider.getQuote('AAPL');
        results.yahoo = true;
      } catch (error) {
        this.logger.warn('yahoo-connection-test-failed', 'Yahoo Finance connection test failed', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Test MarketStack
    if (this.marketStackProvider) {
      try {
        results.marketStack = await this.marketStackProvider.testConnection();
      } catch (error) {
        this.logger.warn('marketstack-connection-test-failed', 'MarketStack connection test failed', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Test Zep Graphiti
    if (this.graphProvider) {
      try {
        results.graphStorage = await this.graphProvider.testConnection();
      } catch (error) {
        this.logger.warn('graph-connection-test-failed', 'Graph storage connection test failed', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    this.logger.info('connection-tests-complete', 'Provider connection tests completed', results);
    return results;
  }
}

/**
 * Factory function to create and initialize a backtesting data provider
 */
export async function createBacktestingDataProvider(
  config: Partial<DataProviderConfig>,
  tradingConfig: TradingAgentsConfig
): Promise<BacktestingDataProvider> {
  const provider = new BacktestingDataProvider(config as DataProviderConfig, tradingConfig);
  await provider.initialize();
  return provider;
}

/**
 * Default configuration for backtesting data provider
 */
export const DEFAULT_DATA_PROVIDER_CONFIG: DataProviderConfig = {
  preferredProvider: 'auto',
  enableCaching: true,
  enableGraphStorage: false,
  enablePostgresStorage: false,
  maxRetries: 3,
  timeout: 30000
};