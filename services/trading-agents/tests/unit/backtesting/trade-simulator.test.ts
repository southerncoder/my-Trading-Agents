/**
 * Unit Tests for TradeSimulator
 * 
 * Tests realistic trade execution simulation including slippage, commission, and market impact
 * Requirements: 7.1
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { TradeSimulator } from '../../../src/backtesting/trade-simulator';
import {
  Order,
  OrderType,
  OrderSide,
  OrderStatus,
  ExecutedTrade,
  MarketData,
  SimulationConfig
} from '../../../src/backtesting/types';

jest.mock('../../../src/utils/enhanced-logger');

describe('TradeSimulator', () => {
  let tradeSimulator: TradeSimulator;

  const createTestMarketData = (symbol: string, close: number, volume: number = 1000000): MarketData => ({
    symbol,
    timestamp: new Date(),
    open: close * 0.99,
    high: close * 1.02,
    low: close * 0.98,
    close,
    volume,
    adjustedClose: close
  });

  const createTestOrder = (side: OrderSide, quantity: number, price?: number): Order => ({
    id: `order-${Date.now()}`,
    symbol: 'AAPL',
    side,
    type: OrderType.MARKET,
    quantity,
    price,
    timestamp: new Date(),
    status: OrderStatus.PENDING
  });

  const createSimulationConfig = (): SimulationConfig => ({
    commission: 0.001,
    slippage: 0.0005,
    marketImpact: true,
    marketHours: {
      start: '09:30',
      end: '16:00',
      timezone: 'America/New_York'
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    tradeSimulator = new TradeSimulator();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('simulateTrade', () => {
    test('should execute market buy order with realistic pricing', async () => {
      const order = createTestOrder(OrderSide.BUY, 100);
      const marketData = createTestMarketData('AAPL', 150);
      const config = createSimulationConfig();

      const executedTrade = await tradeSimulator.simulateTrade(order, marketData, config);

      expect(executedTrade).toBeDefined();
      expect(executedTrade.symbol).toBe('AAPL');
      expect(executedTrade.side).toBe(OrderSide.BUY);
      expect(executedTrade.quantity).toBe(100);
      expect(executedTrade.executedPrice).toBeGreaterThan(marketData.close);
      expect(executedTrade.commission).toBeGreaterThan(0);
      expect(executedTrade.slippage).toBeGreaterThan(0);
      expect(executedTrade.status).toBe(OrderStatus.FILLED);
    });

    test('should execute market sell order with realistic pricing', async () => {
      const order = createTestOrder(OrderSide.SELL, 100);
      const marketData = createTestMarketData('AAPL', 150);
      const config = createSimulationConfig();

      const executedTrade = await tradeSimulator.simulateTrade(order, marketData, config);

      expect(executedTrade.side).toBe(OrderSide.SELL);
      expect(executedTrade.executedPrice).toBeLessThan(marketData.close);
      expect(executedTrade.commission).toBeGreaterThan(0);
      expect(executedTrade.slippage).toBeGreaterThan(0);
    });

    test('should handle limit orders correctly', async () => {
      const order: Order = {
        ...createTestOrder(OrderSide.BUY, 100),
        type: OrderType.LIMIT,
        price: 149
      };
      const marketData = createTestMarketData('AAPL', 150);
      const config = createSimulationConfig();

      const executedTrade = await tradeSimulator.simulateTrade(order, marketData, config);

      expect(executedTrade.executedPrice).toBeLessThanOrEqual(149);
    });

    test('should reject limit orders when price not met', async () => {
      const order: Order = {
        ...createTestOrder(OrderSide.BUY, 100),
        type: OrderType.LIMIT,
        price: 140 // Below market price
      };
      const marketData = createTestMarketData('AAPL', 150);
      const config = createSimulationConfig();

      const executedTrade = await tradeSimulator.simulateTrade(order, marketData, config);

      expect(executedTrade.status).toBe(OrderStatus.REJECTED);
    });

    test('should apply market impact for large orders', async () => {
      const smallOrder = createTestOrder(OrderSide.BUY, 100);
      const largeOrder = createTestOrder(OrderSide.BUY, 10000);
      const marketData = createTestMarketData('AAPL', 150, 500000); // Lower volume
      const config = createSimulationConfig();

      const smallTrade = await tradeSimulator.simulateTrade(smallOrder, marketData, config);
      const largeTrade = await tradeSimulator.simulateTrade(largeOrder, marketData, config);

      expect(largeTrade.marketImpact).toBeGreaterThan(smallTrade.marketImpact);
      expect(largeTrade.executedPrice).toBeGreaterThan(smallTrade.executedPrice);
    });
  });

  describe('applySlippage', () => {
    test('should apply positive slippage for buy orders', () => {
      const price = 150;
      const volume = 1000;
      const side = OrderSide.BUY;

      const slippedPrice = tradeSimulator.applySlippage(price, volume, side);

      expect(slippedPrice).toBeGreaterThan(price);
    });

    test('should apply negative slippage for sell orders', () => {
      const price = 150;
      const volume = 1000;
      const side = OrderSide.SELL;

      const slippedPrice = tradeSimulator.applySlippage(price, volume, side);

      expect(slippedPrice).toBeLessThan(price);
    });

    test('should increase slippage with order size', () => {
      const price = 150;
      const smallVolume = 100;
      const largeVolume = 10000;
      const side = OrderSide.BUY;

      const smallSlippage = tradeSimulator.applySlippage(price, smallVolume, side) - price;
      const largeSlippage = tradeSimulator.applySlippage(price, largeVolume, side) - price;

      expect(largeSlippage).toBeGreaterThan(smallSlippage);
    });
  });

  describe('calculateCommission', () => {
    test('should calculate commission based on trade value', () => {
      const trade: ExecutedTrade = {
        id: 'test-trade',
        symbol: 'AAPL',
        side: OrderSide.BUY,
        quantity: 100,
        price: 150,
        executedPrice: 150.05,
        timestamp: new Date(),
        commission: 0,
        slippage: 0,
        marketImpact: 0,
        status: OrderStatus.FILLED
      };
      const commissionRate = 0.001;

      const commission = tradeSimulator.calculateCommission(trade, commissionRate);

      expect(commission).toBe(100 * 150.05 * 0.001);
    });

    test('should apply minimum commission', () => {
      const smallTrade: ExecutedTrade = {
        id: 'test-trade',
        symbol: 'AAPL',
        side: OrderSide.BUY,
        quantity: 1,
        price: 1,
        executedPrice: 1,
        timestamp: new Date(),
        commission: 0,
        slippage: 0,
        marketImpact: 0,
        status: OrderStatus.FILLED
      };
      const commissionRate = 0.001;
      const minCommission = 1.0;

      const commission = tradeSimulator.calculateCommission(smallTrade, commissionRate, minCommission);

      expect(commission).toBe(minCommission);
    });
  });

  describe('simulateMarketImpact', () => {
    test('should calculate market impact based on order size and volume', () => {
      const order = createTestOrder(OrderSide.BUY, 5000);
      const marketData = createTestMarketData('AAPL', 150, 1000000);

      const marketImpact = tradeSimulator.simulateMarketImpact(order, marketData);

      expect(marketImpact).toBeGreaterThan(0);
      expect(marketImpact).toBeLessThan(0.01); // Should be reasonable
    });

    test('should increase market impact for larger orders relative to volume', () => {
      const smallOrder = createTestOrder(OrderSide.BUY, 1000);
      const largeOrder = createTestOrder(OrderSide.BUY, 10000);
      const marketData = createTestMarketData('AAPL', 150, 500000);

      const smallImpact = tradeSimulator.simulateMarketImpact(smallOrder, marketData);
      const largeImpact = tradeSimulator.simulateMarketImpact(largeOrder, marketData);

      expect(largeImpact).toBeGreaterThan(smallImpact);
    });

    test('should have minimal impact for small orders in high volume', () => {
      const order = createTestOrder(OrderSide.BUY, 100);
      const highVolumeData = createTestMarketData('AAPL', 150, 10000000);

      const marketImpact = tradeSimulator.simulateMarketImpact(order, highVolumeData);

      expect(marketImpact).toBeLessThan(0.001);
    });
  });

  describe('isMarketOpen', () => {
    test('should return true during market hours', () => {
      const marketTime = new Date('2023-06-15T14:30:00'); // 2:30 PM EST
      
      const isOpen = tradeSimulator.isMarketOpen(marketTime);

      expect(isOpen).toBe(true);
    });

    test('should return false outside market hours', () => {
      const afterHours = new Date('2023-06-15T18:30:00'); // 6:30 PM EST
      
      const isOpen = tradeSimulator.isMarketOpen(afterHours);

      expect(isOpen).toBe(false);
    });

    test('should return false on weekends', () => {
      const weekend = new Date('2023-06-17T14:30:00'); // Saturday 2:30 PM
      
      const isOpen = tradeSimulator.isMarketOpen(weekend);

      expect(isOpen).toBe(false);
    });
  });

  describe('queueOrder and processQueuedOrders', () => {
    test('should queue orders when market is closed', () => {
      const order = createTestOrder(OrderSide.BUY, 100);
      
      tradeSimulator.queueOrder(order);
      
      const queuedOrders = tradeSimulator.getQueuedOrders();
      expect(queuedOrders).toContain(order);
    });

    test('should process queued orders when market opens', async () => {
      const order = createTestOrder(OrderSide.BUY, 100);
      const marketData = createTestMarketData('AAPL', 150);
      const config = createSimulationConfig();
      
      tradeSimulator.queueOrder(order);
      
      const executedTrades = await tradeSimulator.processQueuedOrders(marketData, config);
      
      expect(executedTrades).toHaveLength(1);
      expect(executedTrades[0].symbol).toBe('AAPL');
    });

    test('should clear queue after processing', async () => {
      const order = createTestOrder(OrderSide.BUY, 100);
      const marketData = createTestMarketData('AAPL', 150);
      const config = createSimulationConfig();
      
      tradeSimulator.queueOrder(order);
      await tradeSimulator.processQueuedOrders(marketData, config);
      
      const queuedOrders = tradeSimulator.getQueuedOrders();
      expect(queuedOrders).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    test('should handle invalid order data', async () => {
      const invalidOrder = {
        ...createTestOrder(OrderSide.BUY, 100),
        quantity: -100 // Invalid negative quantity
      };
      const marketData = createTestMarketData('AAPL', 150);
      const config = createSimulationConfig();

      await expect(tradeSimulator.simulateTrade(invalidOrder, marketData, config))
        .rejects.toThrow('Invalid order quantity');
    });

    test('should handle missing market data', async () => {
      const order = createTestOrder(OrderSide.BUY, 100);
      const config = createSimulationConfig();

      await expect(tradeSimulator.simulateTrade(order, null as any, config))
        .rejects.toThrow('Market data is required');
    });

    test('should handle zero volume market data', async () => {
      const order = createTestOrder(OrderSide.BUY, 100);
      const zeroVolumeData = createTestMarketData('AAPL', 150, 0);
      const config = createSimulationConfig();

      const executedTrade = await tradeSimulator.simulateTrade(order, zeroVolumeData, config);

      expect(executedTrade.status).toBe(OrderStatus.REJECTED);
    });
  });

  describe('performance', () => {
    test('should handle high-frequency order simulation', async () => {
      const orders = Array.from({ length: 1000 }, (_, i) => 
        createTestOrder(OrderSide.BUY, 100 + i)
      );
      const marketData = createTestMarketData('AAPL', 150);
      const config = createSimulationConfig();

      const startTime = Date.now();
      
      const trades = await Promise.all(
        orders.map(order => tradeSimulator.simulateTrade(order, marketData, config))
      );
      
      const duration = Date.now() - startTime;

      expect(trades).toHaveLength(1000);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});