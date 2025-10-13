/**
 * Backtesting Engine for Strategy Validation
 * 
 * This module provides the core backtesting orchestration including:
 * - Strategy execution against historical data
 * - Portfolio management and position tracking
 * - Integration with data providers for historical data
 * - Configuration management and validation
 * - Result generation and reporting
 */

import { createLogger } from '../utils/enhanced-logger';
import { ITradingStrategy, MarketData } from '../strategies/base-strategy';
import { TradeSimulator } from './trade-simulator';
import { PerformanceMetricsCalculator } from './performance-metrics';
import { BacktestingDataProvider } from './data-provider-integration';
import {
  BacktestConfig,
  BacktestResult,
  ValidationResult,
  ExecutedTrade,
  Portfolio,
  Position,
  Order,
  OrderType,
  OrderSide,
  OrderStatus,
  EquityCurve,
  DateRange
} from './types';

/**
 * Core backtesting engine with comprehensive strategy validation
 */
export class BacktestEngine {
  private readonly logger = createLogger('system', 'backtest-engine');
  private readonly performanceCalculator: PerformanceMetricsCalculator;
  private dataProvider?: BacktestingDataProvider;

  constructor(dataProvider?: BacktestingDataProvider) {
    this.performanceCalculator = new PerformanceMetricsCalculator();
    this.dataProvider = dataProvider;
  }

  /**
   * Run comprehensive backtest for a strategy
   */
  async runBacktest(config: BacktestConfig): Promise<BacktestResult> {
    try {
      this.logger.info('backtest-started', 'Starting backtest execution', {
        strategy: config.strategy.name,
        symbols: config.symbols,
        startDate: config.startDate.toISOString(),
        endDate: config.endDate.toISOString(),
        initialCapital: config.initialCapital
      });

      // Validate configuration
      const validation = await this.validateStrategy(config.strategy);
      if (!validation.isValid) {
        throw new Error(`Strategy validation failed: ${validation.errors.join(', ')}`);
      }

      // Initialize trade simulator with config
      const tradeSimulator = new TradeSimulator(config);

      // Load historical data for all symbols
      const historicalData = await this.loadHistoricalData(config.symbols, {
        start: config.startDate,
        end: config.endDate
      });

      // Initialize portfolio
      let portfolio = this.initializePortfolio(config.initialCapital, config.startDate);
      const portfolioHistory: Portfolio[] = [{ ...portfolio }];
      const allTrades: ExecutedTrade[] = [];
      const warnings: string[] = [];

      // Execute strategy day by day
      const sortedDates = Object.keys(historicalData).sort();
      
      for (const dateStr of sortedDates) {
        const currentDate = new Date(dateStr);
        const dayData = historicalData[dateStr];
        
        if (!dayData || dayData.length === 0) {
          warnings.push(`No data available for ${dateStr}`);
          continue;
        }

        try {
          // Process any queued orders from previous days
          const queuedTrades = await tradeSimulator.processQueuedOrders(dayData[0]);
          for (const trade of queuedTrades) {
            portfolio = this.updatePortfolioWithTrade(portfolio, trade);
            allTrades.push(trade);
          }

          // Generate signals for current market data
          const signals = await config.strategy.analyze(dayData);

          // Execute trades based on signals
          for (const signal of signals) {
            try {
              const order = this.createOrderFromSignal(signal, portfolio, config);
              if (order) {
                const marketData = dayData.find(d => d.symbol === signal.symbol);
                if (marketData) {
                  const executedTrade = await tradeSimulator.simulateTrade(order, marketData);
                  portfolio = this.updatePortfolioWithTrade(portfolio, executedTrade);
                  allTrades.push(executedTrade);
                }
              }
            } catch (tradeError) {
              warnings.push(`Trade execution failed for ${signal.symbol}: ${tradeError instanceof Error ? tradeError.message : String(tradeError)}`);
            }
          }

          // Update portfolio timestamp and value
          portfolio.timestamp = currentDate;
          portfolio.totalValue = this.calculatePortfolioValue(portfolio, dayData);
          
          // Store portfolio snapshot
          portfolioHistory.push({ ...portfolio });

        } catch (dayError) {
          warnings.push(`Error processing day ${dateStr}: ${dayError instanceof Error ? dayError.message : String(dayError)}`);
        }
      }

      // Generate equity curve
      const equityCurve = this.performanceCalculator.generateEquityCurve(portfolioHistory);

      // Calculate performance metrics
      const performance = this.performanceCalculator.calculatePerformanceMetrics(
        allTrades,
        equityCurve,
        config.initialCapital
      );

      // Calculate drawdown analysis
      const drawdowns = this.performanceCalculator.calculateDrawdownAnalysis(equityCurve);

      // Calculate risk metrics (simplified for now)
      const riskMetrics = {
        valueAtRisk95: 0,
        valueAtRisk99: 0,
        conditionalVaR95: 0,
        conditionalVaR99: 0,
        skewness: 0,
        kurtosis: 0,
        tailRatio: 0,
        gainToPainRatio: 0
      };

      const result: BacktestResult = {
        config,
        trades: allTrades,
        portfolio,
        performance,
        equity: equityCurve,
        drawdowns,
        riskMetrics,
        startDate: config.startDate,
        endDate: config.endDate,
        duration: this.calculateDaysBetween(config.startDate, config.endDate),
        warnings,
        metadata: {
          totalDataPoints: sortedDates.length,
          symbolsTraded: [...new Set(allTrades.map(t => t.symbol))],
          executionTime: Date.now()
        }
      };

      // Store results in graph database if enabled
      if (this.dataProvider) {
        try {
          await this.dataProvider.storeBacktestResults(result);
          await this.dataProvider.storePerformanceMetrics(
            config.strategy.name,
            performance,
            {
              symbols: config.symbols,
              startDate: config.startDate.toISOString(),
              endDate: config.endDate.toISOString(),
              backtestId: `${config.strategy.name}-${Date.now()}`
            }
          );
        } catch (storageError) {
          this.logger.warn('storage-failed', 'Failed to store backtest results', {
            error: storageError instanceof Error ? storageError.message : String(storageError)
          });
          // Don't fail the backtest if storage fails
        }
      }

      this.logger.info('backtest-completed', 'Backtest execution completed successfully', {
        strategy: config.strategy.name,
        totalTrades: allTrades.length,
        finalValue: portfolio.totalValue,
        totalReturn: performance.totalReturn,
        sharpeRatio: performance.sharpeRatio,
        maxDrawdown: performance.maxDrawdown
      });

      return result;

    } catch (error) {
      this.logger.error('backtest-error', 'Backtest execution failed', {
        strategy: config.strategy.name,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Validate strategy configuration and requirements
   */
  async validateStrategy(strategy: ITradingStrategy): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    try {
      // Basic strategy validation
      if (!strategy.validate()) {
        errors.push('Strategy failed internal validation');
      }

      // Check required methods
      if (typeof strategy.analyze !== 'function') {
        errors.push('Strategy must implement analyze method');
      }

      // Validate configuration
      if (!strategy.config) {
        errors.push('Strategy must have configuration');
      } else {
        if (strategy.config.maxPositionSize <= 0 || strategy.config.maxPositionSize > 1) {
          errors.push('Max position size must be between 0 and 1');
        }

        if (strategy.config.lookbackPeriod <= 0) {
          errors.push('Lookback period must be positive');
        }

        if (strategy.config.stopLossPercent < 0 || strategy.config.stopLossPercent > 50) {
          warnings.push('Stop loss percentage seems unusual (should be 0-50%)');
        }

        if (strategy.config.takeProfitPercent < 0 || strategy.config.takeProfitPercent > 100) {
          warnings.push('Take profit percentage seems unusual (should be 0-100%)');
        }
      }

      // Performance suggestions
      if (strategy.config?.lookbackPeriod > 252) {
        suggestions.push('Consider reducing lookback period for better performance');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions
      };

    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
      return {
        isValid: false,
        errors,
        warnings,
        suggestions
      };
    }
  }

  /**
   * Load historical data for backtesting using integrated data providers
   */
  async loadHistoricalData(symbols: string[], dateRange: DateRange): Promise<Record<string, MarketData[]>> {
    try {
      this.logger.info('loading-historical-data', 'Loading historical market data', {
        symbols,
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString()
      });

      // Use the data provider integration if available
      if (this.dataProvider) {
        const request = {
          symbols,
          startDate: dateRange.start,
          endDate: dateRange.end,
          interval: 'daily' as const,
          adjustForSplits: true,
          adjustForDividends: true
        };

        const historicalData = await this.dataProvider.loadHistoricalData(request);
        
        // Validate data quality
        const validation = this.dataProvider.validateHistoricalData(historicalData);
        if (!validation.isValid) {
          this.logger.warn('data-quality-issues', 'Data quality issues detected', {
            issues: validation.issues,
            suggestions: validation.suggestions
          });
        }

        this.logger.info('historical-data-loaded', 'Historical data loaded successfully from providers', {
          symbols,
          dataPoints: Object.keys(historicalData).length,
          totalRecords: Object.values(historicalData).flat().length,
          dataQuality: validation.isValid ? 'Good' : 'Issues detected'
        });

        return historicalData;
      }

      // Fallback to mock data if no data provider is configured
      this.logger.warn('using-mock-data', 'No data provider configured, using mock data for demonstration');
      
      const historicalData: Record<string, MarketData[]> = {};
      const startTime = dateRange.start.getTime();
      const endTime = dateRange.end.getTime();
      const dayMs = 24 * 60 * 60 * 1000;

      for (let time = startTime; time <= endTime; time += dayMs) {
        const date = new Date(time);
        const dateStr = date.toISOString().split('T')[0];
        
        historicalData[dateStr] = symbols.map(symbol => ({
          symbol,
          timestamp: date,
          open: 100 + Math.random() * 50,
          high: 110 + Math.random() * 60,
          low: 90 + Math.random() * 40,
          close: 100 + Math.random() * 50,
          volume: Math.floor(1000000 + Math.random() * 5000000),
          technicalIndicators: {}
        }));
      }

      this.logger.info('mock-data-generated', 'Mock historical data generated', {
        symbols,
        dataPoints: Object.keys(historicalData).length,
        totalRecords: Object.values(historicalData).flat().length
      });

      return historicalData;

    } catch (error) {
      this.logger.error('historical-data-error', 'Failed to load historical data', {
        symbols,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Execute strategy against historical data
   */
  async executeStrategy(strategy: ITradingStrategy, data: MarketData[]): Promise<ExecutedTrade[]> {
    try {
      const trades: ExecutedTrade[] = [];
      
      // Group data by date for sequential processing
      const dataByDate = this.groupDataByDate(data);
      const sortedDates = Object.keys(dataByDate).sort();

      for (const dateStr of sortedDates) {
        const dayData = dataByDate[dateStr];
        if (!dayData) continue;
        
        try {
          const signals = await strategy.analyze(dayData);
          
          // Convert signals to trades (simplified)
          for (const signal of signals) {
            const marketData = dayData.find(d => d.symbol === signal.symbol);
            if (marketData) {
              const trade: ExecutedTrade = {
                orderId: `${signal.symbol}-${Date.now()}`,
                symbol: signal.symbol,
                side: signal.signal === 'BUY' ? OrderSide.BUY : OrderSide.SELL,
                quantity: signal.positionSize || 100,
                executionPrice: signal.price,
                commission: 1.0,
                slippage: 0,
                marketImpact: 0,
                executionDelay: 0,
                timestamp: signal.timestamp,
                marketConditions: {
                  isMarketOpen: true,
                  volatility: 0.02,
                  volume: marketData.volume,
                  bidAskSpread: marketData.close * 0.001,
                  marketTrend: 'SIDEWAYS'
                }
              };
              
              trades.push(trade);
            }
          }
        } catch (dayError) {
          this.logger.warn('strategy-execution-day-error', 'Error executing strategy for day', {
            date: dateStr,
            error: dayError instanceof Error ? dayError.message : String(dayError)
          });
        }
      }

      return trades;

    } catch (error) {
      this.logger.error('strategy-execution-error', 'Strategy execution failed', {
        strategy: strategy.name,
        dataPoints: data.length,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // Private helper methods

  private initializePortfolio(initialCapital: number, startDate: Date): Portfolio {
    return {
      cash: initialCapital,
      totalValue: initialCapital,
      positions: new Map<string, Position>(),
      trades: [],
      timestamp: startDate
    };
  }

  private createOrderFromSignal(signal: any, portfolio: Portfolio, config: BacktestConfig): Order | null {
    if (signal.signal === 'HOLD') {
      return null;
    }

    const orderSide = signal.signal === 'BUY' ? OrderSide.BUY : OrderSide.SELL;
    const positionSize = signal.positionSize || 0.1; // Default 10% position
    const maxOrderValue = portfolio.cash * positionSize;
    const quantity = Math.floor(maxOrderValue / signal.price);

    if (quantity <= 0) {
      return null;
    }

    return {
      id: `${signal.symbol}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      symbol: signal.symbol,
      type: OrderType.MARKET,
      side: orderSide,
      quantity,
      price: signal.price,
      timestamp: signal.timestamp,
      status: OrderStatus.PENDING,
      metadata: {
        signalStrength: signal.strength,
        signalConfidence: signal.confidence,
        reasoning: signal.reasoning
      }
    };
  }

  private updatePortfolioWithTrade(portfolio: Portfolio, trade: ExecutedTrade): Portfolio {
    const updatedPortfolio = { ...portfolio };
    
    // Update cash
    const tradeValue = trade.quantity * trade.executionPrice;
    if (trade.side === OrderSide.BUY) {
      updatedPortfolio.cash -= (tradeValue + trade.commission);
    } else {
      updatedPortfolio.cash += (tradeValue - trade.commission);
    }

    // Update positions
    const currentPosition = updatedPortfolio.positions.get(trade.symbol);
    
    if (trade.side === OrderSide.BUY) {
      if (currentPosition) {
        const newQuantity = currentPosition.quantity + trade.quantity;
        const newAvgPrice = (currentPosition.averagePrice * currentPosition.quantity + trade.executionPrice * trade.quantity) / newQuantity;
        
        updatedPortfolio.positions.set(trade.symbol, {
          ...currentPosition,
          quantity: newQuantity,
          averagePrice: newAvgPrice,
          lastUpdated: trade.timestamp
        });
      } else {
        updatedPortfolio.positions.set(trade.symbol, {
          symbol: trade.symbol,
          quantity: trade.quantity,
          averagePrice: trade.executionPrice,
          marketValue: trade.quantity * trade.executionPrice,
          unrealizedPnL: 0,
          realizedPnL: 0,
          lastUpdated: trade.timestamp
        });
      }
    } else {
      // Sell order
      if (currentPosition && currentPosition.quantity >= trade.quantity) {
        const newQuantity = currentPosition.quantity - trade.quantity;
        const realizedPnL = (trade.executionPrice - currentPosition.averagePrice) * trade.quantity - trade.commission;
        
        if (newQuantity > 0) {
          updatedPortfolio.positions.set(trade.symbol, {
            ...currentPosition,
            quantity: newQuantity,
            realizedPnL: currentPosition.realizedPnL + realizedPnL,
            lastUpdated: trade.timestamp
          });
        } else {
          updatedPortfolio.positions.delete(trade.symbol);
        }
      }
    }

    // Add trade to portfolio history
    updatedPortfolio.trades.push(trade);

    return updatedPortfolio;
  }

  private calculatePortfolioValue(portfolio: Portfolio, marketData: MarketData[]): number {
    let totalValue = portfolio.cash;

    for (const [symbol, position] of portfolio.positions) {
      const currentPrice = marketData.find(d => d.symbol === symbol)?.close || position.averagePrice;
      totalValue += position.quantity * currentPrice;
    }

    return totalValue;
  }

  private groupDataByDate(data: MarketData[]): Record<string, MarketData[]> {
    const grouped: Record<string, MarketData[]> = {};
    
    for (const dataPoint of data) {
      const dateStr = dataPoint.timestamp.toISOString().split('T')[0];
      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      grouped[dateStr]!.push(dataPoint);
    }

    return grouped;
  }

  private calculateDaysBetween(startDate: Date, endDate: Date): number {
    const timeDiff = endDate.getTime() - startDate.getTime();
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  }
}