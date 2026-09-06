/**
 * Trade Simulator for Realistic Backtesting
 * 
 * This module provides realistic trade execution simulation including:
 * - Bid-ask spread modeling
 * - Slippage calculations
 * - Commission structures
 * - Market impact simulation
 * - Market hours validation
 * - Order queuing and execution delays
 */

import { createLogger } from '../utils/enhanced-logger';
import {
  Order,
  ExecutedTrade,
  OrderType,
  OrderSide,
  OrderStatus,
  MarketCondition,
  MarketHours,
  BacktestConfig
} from './types';
import { MarketData } from '../strategies/base-strategy';

/**
 * Trade simulator with realistic execution modeling
 */
export class TradeSimulator {
  private readonly logger = createLogger('system', 'trade-simulator');
  private readonly config: BacktestConfig;
  private readonly marketHours: MarketHours;
  private orderQueue: Order[] = [];
  private executionDelayMs: number = 100; // Default 100ms execution delay

  constructor(config: BacktestConfig) {
    this.config = config;
    this.marketHours = this.getDefaultMarketHours();
  }

  /**
   * Simulate trade execution with realistic market conditions
   */
  async simulateTrade(order: Order, marketData: MarketData): Promise<ExecutedTrade> {
    try {
      // Validate market hours if enabled
      if (this.config.enableMarketHours && !this.isMarketOpen(order.timestamp)) {
        // Queue order for next market open
        this.queueOrder(order);
        throw new Error(`Market closed at ${order.timestamp.toISOString()}, order queued`);
      }

      // Calculate market conditions
      const marketConditions = this.calculateMarketConditions(marketData);

      // Apply execution delay
      const executionDelay = this.calculateExecutionDelay(order, marketConditions);

      // Calculate execution price with slippage and market impact
      const executionPrice = this.calculateExecutionPrice(order, marketData, marketConditions);

      // Calculate commission
      const commission = this.calculateCommission(order, executionPrice);

      // Calculate slippage
      const slippage = this.calculateSlippage(order, marketData, executionPrice);

      // Calculate market impact
      const marketImpact = this.config.marketImpact 
        ? this.simulateMarketImpact(order, marketData)
        : 0;

      // Create executed trade
      const executedTrade: ExecutedTrade = {
        orderId: order.id,
        symbol: order.symbol,
        side: order.side,
        quantity: order.quantity,
        executionPrice,
        commission,
        slippage,
        marketImpact,
        executionDelay,
        timestamp: new Date(order.timestamp.getTime() + executionDelay),
        marketConditions
      };

      this.logger.debug('trade-executed', 'Trade simulation completed', {
        orderId: order.id,
        symbol: order.symbol,
        side: order.side,
        quantity: order.quantity,
        executionPrice,
        commission,
        slippage,
        marketImpact
      });

      return executedTrade;

    } catch (error) {
      this.logger.error('trade-simulation-error', 'Failed to simulate trade', {
        orderId: order.id,
        symbol: order.symbol,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Apply slippage based on market conditions and order characteristics
   */
  applySlippage(price: number, volume: number, marketData: MarketData): number {
    // Base slippage from configuration
    const baseSlippage = this.config.slippage;

    // Volume-based slippage adjustment
    const avgVolume = this.calculateAverageVolume(marketData);
    const volumeRatio = volume / avgVolume;
    const volumeSlippage = Math.min(0.01, volumeRatio * 0.001); // Max 1% additional slippage

    // Volatility-based slippage adjustment
    const volatility = this.calculateVolatility(marketData);
    const volatilitySlippage = volatility * 0.5; // 50% of volatility as additional slippage

    // Total slippage
    const totalSlippage = baseSlippage + volumeSlippage + volatilitySlippage;

    return price * totalSlippage;
  }

  /**
   * Calculate commission based on trade characteristics
   */
  calculateCommission(order: Order, executionPrice: number): number {
    const tradeValue = order.quantity * executionPrice;
    
    // Use configured commission rate
    const commissionRate = this.config.commission;
    
    // Minimum commission (e.g., $1)
    const minCommission = 1.0;
    
    return Math.max(minCommission, tradeValue * commissionRate);
  }

  /**
   * Simulate market impact for large orders
   */
  simulateMarketImpact(order: Order, marketData: MarketData): number {
    if (!this.config.marketImpact) {
      return 0;
    }

    // Calculate order size relative to average volume
    const avgVolume = this.calculateAverageVolume(marketData);
    const orderSizeRatio = (order.quantity * marketData.close) / (avgVolume * marketData.close);

    // Market impact is proportional to square root of order size
    const impactFactor = Math.sqrt(orderSizeRatio) * 0.001; // Base impact factor

    // Direction-dependent impact
    const impactDirection = order.side === OrderSide.BUY ? 1 : -1;

    return marketData.close * impactFactor * impactDirection;
  }

  /**
   * Check if market is open at given timestamp
   */
  isMarketOpen(timestamp: Date): boolean {
    if (!this.config.enableMarketHours) {
      return true; // Always open if market hours not enabled
    }

    const dayOfWeek = timestamp.getDay();
    
    // Weekend check (Saturday = 6, Sunday = 0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }

    // Holiday check
    const dateString = timestamp.toDateString();
    const isHoliday = this.marketHours.holidays.some(holiday => 
      holiday.toDateString() === dateString
    );
    
    if (isHoliday) {
      return false;
    }

    // Regular hours check
    const timeString = timestamp.toTimeString().substring(0, 5); // HH:MM format
    const openTime = this.marketHours.regularHours.open;
    const closeTime = this.marketHours.regularHours.close;

    return timeString >= openTime && timeString <= closeTime;
  }

  /**
   * Queue order for execution when market opens
   */
  queueOrder(order: Order): void {
    order.status = OrderStatus.PENDING;
    this.orderQueue.push(order);
    
    this.logger.debug('order-queued', 'Order queued for market open', {
      orderId: order.id,
      symbol: order.symbol,
      queueLength: this.orderQueue.length
    });
  }

  /**
   * Process queued orders when market opens
   */
  async processQueuedOrders(marketData: MarketData): Promise<ExecutedTrade[]> {
    if (!this.isMarketOpen(marketData.timestamp)) {
      return [];
    }

    const executedTrades: ExecutedTrade[] = [];
    const ordersToProcess = [...this.orderQueue];
    this.orderQueue = [];

    for (const order of ordersToProcess) {
      try {
        // Update order timestamp to market open
        order.timestamp = marketData.timestamp;
        
        const executedTrade = await this.simulateTrade(order, marketData);
        executedTrades.push(executedTrade);
        
        order.status = OrderStatus.FILLED;
      } catch (error) {
        order.status = OrderStatus.REJECTED;
        this.logger.warn('queued-order-failed', 'Queued order execution failed', {
          orderId: order.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    if (executedTrades.length > 0) {
      this.logger.info('queued-orders-processed', 'Processed queued orders', {
        processedCount: executedTrades.length,
        totalQueued: ordersToProcess.length
      });
    }

    return executedTrades;
  }

  /**
   * Calculate execution price with slippage and market impact
   */
  private calculateExecutionPrice(
    order: Order, 
    marketData: MarketData, 
    marketConditions: MarketCondition
  ): number {
    let basePrice = marketData.close;

    // For limit orders, use limit price if favorable
    if (order.type === OrderType.LIMIT && order.price) {
      if (order.side === OrderSide.BUY && order.price >= marketData.close) {
        basePrice = marketData.close;
      } else if (order.side === OrderSide.SELL && order.price <= marketData.close) {
        basePrice = marketData.close;
      } else {
        basePrice = order.price;
      }
    }

    // Apply bid-ask spread
    const spreadAdjustment = marketConditions.bidAskSpread / 2;
    if (order.side === OrderSide.BUY) {
      basePrice += spreadAdjustment;
    } else {
      basePrice -= spreadAdjustment;
    }

    // Apply slippage
    const slippageAmount = this.applySlippage(basePrice, order.quantity, marketData);
    if (order.side === OrderSide.BUY) {
      basePrice += slippageAmount;
    } else {
      basePrice -= slippageAmount;
    }

    // Apply market impact
    const marketImpact = this.simulateMarketImpact(order, marketData);
    basePrice += marketImpact;

    return Math.max(0.01, basePrice); // Ensure positive price
  }

  /**
   * Calculate market conditions at time of trade
   */
  private calculateMarketConditions(marketData: MarketData): MarketCondition {
    const volatility = this.calculateVolatility(marketData);
    const volume = marketData.volume;
    const bidAskSpread = this.estimateBidAskSpread(marketData, volatility);
    const marketTrend = this.determineMarketTrend(marketData);

    return {
      isMarketOpen: this.isMarketOpen(marketData.timestamp),
      volatility,
      volume,
      bidAskSpread,
      marketTrend
    };
  }

  /**
   * Calculate execution delay based on order and market conditions
   */
  private calculateExecutionDelay(order: Order, marketConditions: MarketCondition): number {
    let baseDelay = this.executionDelayMs;

    // Increase delay for large orders
    const avgVolume = 1000000; // Assume average volume
    const orderSizeRatio = order.quantity / avgVolume;
    const sizeDelayMultiplier = 1 + (orderSizeRatio * 2);

    // Increase delay during high volatility
    const volatilityMultiplier = 1 + (marketConditions.volatility * 10);

    // Market orders execute faster than limit orders
    const orderTypeMultiplier = order.type === OrderType.MARKET ? 0.5 : 1.0;

    const totalDelay = baseDelay * sizeDelayMultiplier * volatilityMultiplier * orderTypeMultiplier;

    return Math.min(5000, Math.max(50, totalDelay)); // Between 50ms and 5s
  }

  /**
   * Calculate slippage amount
   */
  private calculateSlippage(order: Order, marketData: MarketData, executionPrice: number): number {
    const expectedPrice = order.price || marketData.close;
    return Math.abs(executionPrice - expectedPrice);
  }

  /**
   * Calculate average volume for market impact calculations
   */
  private calculateAverageVolume(marketData: MarketData): number {
    // In a real implementation, this would use historical volume data
    // For now, use current volume as proxy
    return marketData.volume || 1000000;
  }

  /**
   * Calculate volatility for slippage adjustments
   */
  private calculateVolatility(marketData: MarketData): number {
    // Simple volatility estimate using high-low range
    const range = marketData.high - marketData.low;
    const midPrice = (marketData.high + marketData.low) / 2;
    return range / midPrice;
  }

  /**
   * Estimate bid-ask spread based on volatility and volume
   */
  private estimateBidAskSpread(marketData: MarketData, volatility: number): number {
    // Base spread as percentage of price
    const baseSpreadPercent = 0.001; // 0.1%
    
    // Adjust for volatility (higher volatility = wider spread)
    const volatilityAdjustment = volatility * 0.5;
    
    // Adjust for volume (lower volume = wider spread)
    const avgVolume = 1000000;
    const volumeRatio = Math.min(1, marketData.volume / avgVolume);
    const volumeAdjustment = (1 - volumeRatio) * 0.002;
    
    const totalSpreadPercent = baseSpreadPercent + volatilityAdjustment + volumeAdjustment;
    
    return marketData.close * totalSpreadPercent;
  }

  /**
   * Determine market trend for market impact calculations
   */
  private determineMarketTrend(marketData: MarketData): 'BULLISH' | 'BEARISH' | 'SIDEWAYS' {
    // Simple trend determination using open vs close
    const changePercent = (marketData.close - marketData.open) / marketData.open;
    
    if (changePercent > 0.01) return 'BULLISH';
    if (changePercent < -0.01) return 'BEARISH';
    return 'SIDEWAYS';
  }

  /**
   * Get default market hours (NYSE)
   */
  private getDefaultMarketHours(): MarketHours {
    return {
      timezone: 'America/New_York',
      regularHours: {
        open: '09:30',
        close: '16:00'
      },
      extendedHours: {
        preMarketOpen: '04:00',
        preMarketClose: '09:30',
        afterHoursOpen: '16:00',
        afterHoursClose: '20:00'
      },
      holidays: [
        // Add major market holidays
        new Date('2024-01-01'), // New Year's Day
        new Date('2024-07-04'), // Independence Day
        new Date('2024-12-25'), // Christmas Day
      ]
    };
  }
}