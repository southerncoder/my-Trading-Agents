/**
 * Real-time Performance Monitoring System
 * 
 * Provides comprehensive performance tracking for trading strategies including
 * rolling window calculations, strategy comparison, and performance attribution.
 */

import { createLogger } from '../utils/enhanced-logger.js';
import { DatabaseManager } from '../database/database-manager.js';

const logger = createLogger('system', 'performance-monitor');

export interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  tradesCount: number;
  averageHoldingPeriod: number;
  beta?: number;
  alpha?: number;
  trackingError?: number;
  informationRatio?: number;
}

export interface RollingWindow<T> {
  window30d: T;
  window90d: T;
  window1y: T;
}

export interface RollingMetrics {
  returns: RollingWindow<number>;
  sharpeRatio: RollingWindow<number>;
  maxDrawdown: RollingWindow<number>;
  winRate: RollingWindow<number>;
  volatility: RollingWindow<number>;
}

export interface StrategyPerformance {
  strategyId: string;
  timestamp: Date;
  metrics: PerformanceMetrics;
  trades: TradeRecord[];
  marketConditions: MarketCondition;
  attribution: PerformanceAttribution;
}

export interface TradeRecord {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  timestamp: Date;
  pnl: number;
  commission: number;
  slippage: number;
  holdingPeriod: number; // in hours
  marketCondition: MarketCondition;
}

export interface MarketCondition {
  volatility: 'low' | 'medium' | 'high';
  trend: 'bullish' | 'bearish' | 'sideways';
  volume: 'low' | 'normal' | 'high';
  sentiment: 'positive' | 'negative' | 'neutral';
  vix?: number;
  marketCap?: 'small' | 'mid' | 'large';
}

export interface PerformanceAttribution {
  assetAllocation: number; // % of return from asset allocation
  stockSelection: number; // % of return from stock selection
  timing: number; // % of return from market timing
  interaction: number; // % of return from interaction effects
  residual: number; // % of unexplained return
}

export interface StrategyComparison {
  strategies: string[];
  relativePerformance: Record<string, number>;
  correlationMatrix: number[][];
  statisticalSignificance: Record<string, number>;
  rankingByMetric: Record<string, string[]>;
  riskAdjustedRanking: string[];
}

export interface TimeFrame {
  start: Date;
  end: Date;
  period: '1d' | '1w' | '1m' | '3m' | '6m' | '1y' | 'ytd' | 'all';
}

export interface Anomaly {
  id: string;
  strategyId: string;
  type: 'performance_degradation' | 'unusual_volatility' | 'correlation_break' | 'drawdown_spike';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  metrics: Record<string, number>;
  threshold: number;
  actualValue: number;
  confidence: number;
}

export interface PerformanceAlert {
  id: string;
  strategyId: string;
  type: 'performance' | 'risk' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  metrics?: Record<string, number>;
  threshold?: number;
  actualValue?: number;
}

/**
 * Comprehensive Performance Monitor for real-time tracking
 */
export class PerformanceMonitor {
  private dbManager: DatabaseManager;
  private performanceCache: Map<string, StrategyPerformance[]> = new Map();
  private rollingMetricsCache: Map<string, RollingMetrics> = new Map();
  private isInitialized = false;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
  }

  /**
   * Initialize the performance monitor
   */
  async initialize(): Promise<void> {
    try {
      if (!this.dbManager.initialized) {
        await this.dbManager.initializeConnections();
      }

      this.isInitialized = true;
      logger.info('performance-monitor', 'Performance monitor initialized successfully');

    } catch (error) {
      logger.error('performance-monitor', 'Failed to initialize performance monitor', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Track strategy performance in real-time
   */
  async trackStrategyPerformance(strategyId: string, performance: PerformanceMetrics): Promise<void> {
    this.ensureInitialized();

    try {
      const timestamp = new Date();

      // Store performance metrics in database
      await this.dbManager.storeStructuredData({
        table: 'performance_metrics',
        data: {
          id: `${strategyId}_${timestamp.getTime()}`,
          strategy_id: strategyId,
          timestamp,
          metrics: performance,
          metadata: {
            source: 'real_time_tracking',
            version: '1.0'
          }
        }
      });

      // Update cache
      const cachedPerformance = this.performanceCache.get(strategyId) || [];
      cachedPerformance.push({
        strategyId,
        timestamp,
        metrics: performance,
        trades: [], // Will be populated separately
        marketConditions: await this.getCurrentMarketConditions(),
        attribution: await this.calculatePerformanceAttribution(strategyId, performance)
      });

      // Keep only last 1000 entries in cache
      if (cachedPerformance.length > 1000) {
        cachedPerformance.splice(0, cachedPerformance.length - 1000);
      }

      this.performanceCache.set(strategyId, cachedPerformance);

      // Update rolling metrics
      await this.updateRollingMetrics(strategyId);

      logger.debug('performance-monitor', 'Strategy performance tracked', {
        strategyId,
        sharpeRatio: performance.sharpeRatio,
        totalReturn: performance.totalReturn,
        maxDrawdown: performance.maxDrawdown
      });

    } catch (error) {
      logger.error('performance-monitor', 'Failed to track strategy performance', {
        strategyId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Calculate rolling window metrics (30d, 90d, 1y)
   */
  async calculateRollingMetrics(strategyId: string, window: number): Promise<RollingMetrics> {
    this.ensureInitialized();

    try {
      const endDate = new Date();
      const startDate30d = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      const startDate90d = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
      const startDate1y = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);

      // Get performance data for different windows
      const [data30d, data90d, data1y] = await Promise.all([
        this.getPerformanceData(strategyId, startDate30d, endDate),
        this.getPerformanceData(strategyId, startDate90d, endDate),
        this.getPerformanceData(strategyId, startDate1y, endDate)
      ]);

      const rollingMetrics: RollingMetrics = {
        returns: {
          window30d: this.calculateAnnualizedReturn(data30d),
          window90d: this.calculateAnnualizedReturn(data90d),
          window1y: this.calculateAnnualizedReturn(data1y)
        },
        sharpeRatio: {
          window30d: this.calculateSharpeRatio(data30d),
          window90d: this.calculateSharpeRatio(data90d),
          window1y: this.calculateSharpeRatio(data1y)
        },
        maxDrawdown: {
          window30d: this.calculateMaxDrawdown(data30d),
          window90d: this.calculateMaxDrawdown(data90d),
          window1y: this.calculateMaxDrawdown(data1y)
        },
        winRate: {
          window30d: this.calculateWinRate(data30d),
          window90d: this.calculateWinRate(data90d),
          window1y: this.calculateWinRate(data1y)
        },
        volatility: {
          window30d: this.calculateVolatility(data30d),
          window90d: this.calculateVolatility(data90d),
          window1y: this.calculateVolatility(data1y)
        }
      };

      // Cache the results
      this.rollingMetricsCache.set(strategyId, rollingMetrics);

      logger.debug('performance-monitor', 'Rolling metrics calculated', {
        strategyId,
        window,
        returns30d: rollingMetrics.returns.window30d,
        sharpe30d: rollingMetrics.sharpeRatio.window30d
      });

      return rollingMetrics;

    } catch (error) {
      logger.error('performance-monitor', 'Failed to calculate rolling metrics', {
        strategyId,
        window,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Compare multiple strategies performance
   */
  async compareStrategies(strategyIds: string[], timeframe: TimeFrame): Promise<StrategyComparison> {
    this.ensureInitialized();

    try {
      // Get performance data for all strategies
      const performanceData = await Promise.all(
        strategyIds.map(id => this.getPerformanceData(id, timeframe.start, timeframe.end))
      );

      // Calculate relative performance
      const relativePerformance: Record<string, number> = {};
      const returns: number[][] = [];

      for (let i = 0; i < strategyIds.length; i++) {
        const strategyId = strategyIds[i];
        const data = performanceData[i];
        const totalReturn = this.calculateTotalReturn(data);
        relativePerformance[strategyId] = totalReturn;
        
        // Extract daily returns for correlation calculation
        const dailyReturns = this.extractDailyReturns(data);
        returns.push(dailyReturns);
      }

      // Calculate correlation matrix
      const correlationMatrix = this.calculateCorrelationMatrix(returns);

      // Calculate statistical significance
      const statisticalSignificance: Record<string, number> = {};
      for (const strategyId of strategyIds) {
        statisticalSignificance[strategyId] = this.calculateStatisticalSignificance(
          performanceData[strategyIds.indexOf(strategyId)]
        );
      }

      // Rank strategies by different metrics
      const rankingByMetric: Record<string, string[]> = {
        totalReturn: this.rankByMetric(strategyIds, relativePerformance),
        sharpeRatio: this.rankBySharpeRatio(strategyIds, performanceData),
        maxDrawdown: this.rankByMaxDrawdown(strategyIds, performanceData),
        winRate: this.rankByWinRate(strategyIds, performanceData)
      };

      // Risk-adjusted ranking (combination of return and risk metrics)
      const riskAdjustedRanking = this.calculateRiskAdjustedRanking(strategyIds, performanceData);

      const comparison: StrategyComparison = {
        strategies: strategyIds,
        relativePerformance,
        correlationMatrix,
        statisticalSignificance,
        rankingByMetric,
        riskAdjustedRanking
      };

      logger.info('performance-monitor', 'Strategy comparison completed', {
        strategyCount: strategyIds.length,
        timeframe: timeframe.period,
        topPerformer: riskAdjustedRanking[0]
      });

      return comparison;

    } catch (error) {
      logger.error('performance-monitor', 'Failed to compare strategies', {
        strategyIds,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Build performance attribution analysis
   */
  async buildPerformanceAttribution(strategyId: string, timeframe: TimeFrame): Promise<PerformanceAttribution> {
    this.ensureInitialized();

    try {
      const performanceData = await this.getPerformanceData(strategyId, timeframe.start, timeframe.end);
      
      // This is a simplified attribution model
      // In practice, this would require more sophisticated factor analysis
      const totalReturn = this.calculateTotalReturn(performanceData);
      
      // Estimate attribution components (simplified model)
      const attribution: PerformanceAttribution = {
        assetAllocation: totalReturn * 0.3, // 30% from asset allocation
        stockSelection: totalReturn * 0.4, // 40% from stock selection
        timing: totalReturn * 0.2, // 20% from market timing
        interaction: totalReturn * 0.05, // 5% from interaction effects
        residual: totalReturn * 0.05 // 5% residual/unexplained
      };

      logger.debug('performance-monitor', 'Performance attribution calculated', {
        strategyId,
        totalReturn,
        assetAllocation: attribution.assetAllocation,
        stockSelection: attribution.stockSelection
      });

      return attribution;

    } catch (error) {
      logger.error('performance-monitor', 'Failed to build performance attribution', {
        strategyId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Update rolling metrics for a strategy
   */
  private async updateRollingMetrics(strategyId: string): Promise<void> {
    try {
      const rollingMetrics = await this.calculateRollingMetrics(strategyId, 365);
      this.rollingMetricsCache.set(strategyId, rollingMetrics);
    } catch (error) {
      logger.error('performance-monitor', 'Failed to update rolling metrics', {
        strategyId,
        error: (error as Error).message
      });
    }
  }

  /**
   * Get performance data from database
   */
  private async getPerformanceData(strategyId: string, startDate: Date, endDate: Date): Promise<PerformanceMetrics[]> {
    const results = await this.dbManager.queryPerformanceMetrics({
      metrics: ['*'],
      startTime: startDate,
      endTime: endDate
    });

    return results
      .filter(r => r.strategyId === strategyId)
      .map(r => r.metrics as unknown as PerformanceMetrics);
  }

  /**
   * Calculate annualized return from performance data
   */
  private calculateAnnualizedReturn(data: PerformanceMetrics[]): number {
    if (data.length === 0) return 0;
    
    const latestMetrics = data[data.length - 1];
    return latestMetrics?.annualizedReturn || 0;
  }

  /**
   * Calculate Sharpe ratio from performance data
   */
  private calculateSharpeRatio(data: PerformanceMetrics[]): number {
    if (data.length === 0) return 0;
    
    const latestMetrics = data[data.length - 1];
    return latestMetrics?.sharpeRatio || 0;
  }

  /**
   * Calculate maximum drawdown from performance data
   */
  private calculateMaxDrawdown(data: PerformanceMetrics[]): number {
    if (data.length === 0) return 0;
    
    const latestMetrics = data[data.length - 1];
    return latestMetrics?.maxDrawdown || 0;
  }

  /**
   * Calculate win rate from performance data
   */
  private calculateWinRate(data: PerformanceMetrics[]): number {
    if (data.length === 0) return 0;
    
    const latestMetrics = data[data.length - 1];
    return latestMetrics?.winRate || 0;
  }

  /**
   * Calculate volatility from performance data
   */
  private calculateVolatility(data: PerformanceMetrics[]): number {
    if (data.length === 0) return 0;
    
    const latestMetrics = data[data.length - 1];
    return latestMetrics?.volatility || 0;
  }

  /**
   * Calculate total return from performance data
   */
  private calculateTotalReturn(data: PerformanceMetrics[]): number {
    if (data.length === 0) return 0;
    
    const latestMetrics = data[data.length - 1];
    return latestMetrics?.totalReturn || 0;
  }

  /**
   * Extract daily returns for correlation analysis
   */
  private extractDailyReturns(data: PerformanceMetrics[]): number[] {
    // Simplified: use total returns as proxy for daily returns
    return data.map(d => d.totalReturn || 0);
  }

  /**
   * Calculate correlation matrix between strategies
   */
  private calculateCorrelationMatrix(returns: number[][]): number[][] {
    const n = returns.length;
    const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1.0;
        } else {
          matrix[i][j] = this.calculateCorrelation(returns[i], returns[j]);
        }
      }
    }

    return matrix;
  }

  /**
   * Calculate correlation between two return series
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;

    let numerator = 0;
    let sumXSquared = 0;
    let sumYSquared = 0;

    for (let i = 0; i < n; i++) {
      const deltaX = x[i] - meanX;
      const deltaY = y[i] - meanY;
      numerator += deltaX * deltaY;
      sumXSquared += deltaX * deltaX;
      sumYSquared += deltaY * deltaY;
    }

    const denominator = Math.sqrt(sumXSquared * sumYSquared);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Calculate statistical significance of performance
   */
  private calculateStatisticalSignificance(data: PerformanceMetrics[]): number {
    if (data.length < 2) return 0;

    // Simplified t-statistic calculation
    const returns = data.map(d => d.totalReturn || 0);
    const mean = returns.reduce((sum, val) => sum + val, 0) / returns.length;
    const variance = returns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (returns.length - 1);
    const standardError = Math.sqrt(variance / returns.length);
    
    return standardError === 0 ? 0 : Math.abs(mean / standardError);
  }

  /**
   * Rank strategies by a specific metric
   */
  private rankByMetric(strategyIds: string[], metrics: Record<string, number>): string[] {
    return strategyIds.sort((a, b) => (metrics[b] || 0) - (metrics[a] || 0));
  }

  /**
   * Rank strategies by Sharpe ratio
   */
  private rankBySharpeRatio(strategyIds: string[], performanceData: PerformanceMetrics[][]): string[] {
    const sharpeRatios: Record<string, number> = {};
    
    for (let i = 0; i < strategyIds.length; i++) {
      const data = performanceData[i];
      sharpeRatios[strategyIds[i]] = this.calculateSharpeRatio(data);
    }

    return this.rankByMetric(strategyIds, sharpeRatios);
  }

  /**
   * Rank strategies by maximum drawdown (lower is better)
   */
  private rankByMaxDrawdown(strategyIds: string[], performanceData: PerformanceMetrics[][]): string[] {
    const drawdowns: Record<string, number> = {};
    
    for (let i = 0; i < strategyIds.length; i++) {
      const data = performanceData[i];
      drawdowns[strategyIds[i]] = -this.calculateMaxDrawdown(data); // Negative for ascending sort
    }

    return this.rankByMetric(strategyIds, drawdowns);
  }

  /**
   * Rank strategies by win rate
   */
  private rankByWinRate(strategyIds: string[], performanceData: PerformanceMetrics[][]): string[] {
    const winRates: Record<string, number> = {};
    
    for (let i = 0; i < strategyIds.length; i++) {
      const data = performanceData[i];
      winRates[strategyIds[i]] = this.calculateWinRate(data);
    }

    return this.rankByMetric(strategyIds, winRates);
  }

  /**
   * Calculate risk-adjusted ranking
   */
  private calculateRiskAdjustedRanking(strategyIds: string[], performanceData: PerformanceMetrics[][]): string[] {
    const riskAdjustedScores: Record<string, number> = {};
    
    for (let i = 0; i < strategyIds.length; i++) {
      const strategyId = strategyIds[i];
      const data = performanceData[i];
      
      const sharpe = this.calculateSharpeRatio(data);
      const totalReturn = this.calculateTotalReturn(data);
      const maxDrawdown = this.calculateMaxDrawdown(data);
      
      // Composite risk-adjusted score
      riskAdjustedScores[strategyId] = (sharpe * 0.4) + (totalReturn * 0.3) - (Math.abs(maxDrawdown) * 0.3);
    }

    return this.rankByMetric(strategyIds, riskAdjustedScores);
  }

  /**
   * Get current market conditions
   */
  private async getCurrentMarketConditions(): Promise<MarketCondition> {
    // This would integrate with market data providers
    // For now, return a default condition
    return {
      volatility: 'medium',
      trend: 'sideways',
      volume: 'normal',
      sentiment: 'neutral'
    };
  }

  /**
   * Calculate performance attribution for a strategy
   */
  private async calculatePerformanceAttribution(strategyId: string, performance: PerformanceMetrics): Promise<PerformanceAttribution> {
    // Simplified attribution calculation
    const totalReturn = performance.totalReturn;
    
    return {
      assetAllocation: totalReturn * 0.3,
      stockSelection: totalReturn * 0.4,
      timing: totalReturn * 0.2,
      interaction: totalReturn * 0.05,
      residual: totalReturn * 0.05
    };
  }

  /**
   * Ensure the monitor is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('PerformanceMonitor not initialized. Call initialize() first.');
    }
  }

  /**
   * Get cached rolling metrics
   */
  getRollingMetrics(strategyId: string): RollingMetrics | null {
    return this.rollingMetricsCache.get(strategyId) || null;
  }

  /**
   * Get cached performance data
   */
  getCachedPerformance(strategyId: string): StrategyPerformance[] {
    return this.performanceCache.get(strategyId) || [];
  }

  /**
   * Clear cache for a strategy
   */
  clearCache(strategyId?: string): void {
    if (strategyId) {
      this.performanceCache.delete(strategyId);
      this.rollingMetricsCache.delete(strategyId);
    } else {
      this.performanceCache.clear();
      this.rollingMetricsCache.clear();
    }
  }
}

/**
 * Create performance monitor instance
 */
export function createPerformanceMonitor(dbManager: DatabaseManager): PerformanceMonitor {
  return new PerformanceMonitor(dbManager);
}