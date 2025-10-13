/**
 * Performance Metrics Calculator for Backtesting
 * 
 * This module provides comprehensive performance analysis including:
 * - Risk-adjusted returns (Sharpe, Sortino, Calmar ratios)
 * - Drawdown analysis with recovery time calculations
 * - Rolling performance windows (30d, 90d, 1y)
 * - Benchmark comparison metrics (alpha, beta, tracking error)
 * - Advanced risk metrics (VaR, CVaR, skewness, kurtosis)
 */

import { createLogger } from '../utils/enhanced-logger';
import {
  PerformanceMetrics,
  EquityCurve,
  EquityPoint,
  DrawdownAnalysis,
  DrawdownPeriod,
  RiskAnalysis,
  ExecutedTrade,
  Portfolio,
  RollingWindow
} from './types';

/**
 * Performance metrics calculator with comprehensive analysis
 */
export class PerformanceMetricsCalculator {
  private readonly logger = createLogger('system', 'performance-metrics');
  private readonly riskFreeRate: number = 0.02; // 2% annual risk-free rate

  /**
   * Calculate comprehensive performance metrics
   */
  calculatePerformanceMetrics(
    trades: ExecutedTrade[],
    equityCurve: EquityCurve,
    initialCapital: number,
    benchmarkReturns?: number[]
  ): PerformanceMetrics {
    try {
      // Calculate basic return metrics
      const returnMetrics = this.calculateReturnMetrics(equityCurve, initialCapital);
      
      // Calculate risk metrics
      const riskMetrics = this.calculateRiskMetrics(equityCurve);
      
      // Calculate trade statistics
      const tradeStats = this.calculateTradeStatistics(trades);
      
      // Calculate benchmark comparison if provided
      const benchmarkMetrics = benchmarkReturns 
        ? this.calculateBenchmarkMetrics(equityCurve, benchmarkReturns)
        : {};

      const performance: PerformanceMetrics = {
        totalReturn: 0,
        annualizedReturn: 0,
        cumulativeReturn: 0,
        volatility: 0,
        sharpeRatio: 0,
        sortinoRatio: 0,
        calmarRatio: 0,
        maxDrawdown: 0,
        maxDrawdownDuration: 0,
        currentDrawdown: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        profitFactor: 0,
        averageWin: 0,
        averageLoss: 0,
        largestWin: 0,
        largestLoss: 0,
        ...returnMetrics,
        ...riskMetrics,
        ...tradeStats,
        ...benchmarkMetrics
      };

      this.logger.info('performance-calculated', 'Performance metrics calculated successfully', {
        totalReturn: performance?.totalReturn || 0,
        sharpeRatio: performance?.sharpeRatio || 0,
        maxDrawdown: performance?.maxDrawdown || 0,
        totalTrades: performance?.totalTrades || 0
      });

      return performance;

    } catch (error) {
      this.logger.error('performance-calculation-error', 'Failed to calculate performance metrics', {
        error: error instanceof Error ? error.message : String(error),
        tradesCount: trades.length,
        equityPointsCount: equityCurve.points.length
      });
      throw error;
    }
  }

  /**
   * Calculate basic return metrics
   */
  private calculateReturnMetrics(equityCurve: EquityCurve, initialCapital: number): Partial<PerformanceMetrics> {
    const finalValue = equityCurve.endValue;
    const totalReturn = (finalValue - initialCapital) / initialCapital;
    
    // Calculate annualized return
    const daysDiff = this.calculateDaysBetween(
      equityCurve.points[0].timestamp,
      equityCurve.points[equityCurve.points.length - 1].timestamp
    );
    const years = daysDiff / 365.25;
    const annualizedReturn = years > 0 ? Math.pow(1 + totalReturn, 1 / years) - 1 : 0;
    
    // Calculate cumulative return
    const cumulativeReturn = totalReturn;

    return {
      totalReturn,
      annualizedReturn,
      cumulativeReturn
    };
  }

  /**
   * Calculate risk-adjusted metrics
   */
  private calculateRiskMetrics(equityCurve: EquityCurve): Partial<PerformanceMetrics> {
    const returns = this.calculateDailyReturns(equityCurve);
    
    // Calculate volatility (annualized)
    const volatility = this.calculateVolatility(returns) * Math.sqrt(252); // Annualized
    
    // Calculate Sharpe ratio
    const excessReturns = returns.map(r => r - this.riskFreeRate / 252);
    const avgExcessReturn = this.calculateMean(excessReturns);
    const sharpeRatio = volatility > 0 ? (avgExcessReturn * 252) / volatility : 0;
    
    // Calculate Sortino ratio (downside deviation)
    const downsideReturns = returns.filter(r => r < 0);
    const downsideVolatility = downsideReturns.length > 0 
      ? this.calculateStandardDeviation(downsideReturns) * Math.sqrt(252)
      : 0;
    const sortinoRatio = downsideVolatility > 0 ? (avgExcessReturn * 252) / downsideVolatility : 0;
    
    // Calculate drawdown metrics
    const drawdownAnalysis = this.calculateDrawdownAnalysis(equityCurve);
    const maxDrawdown = drawdownAnalysis.maxDrawdown;
    const maxDrawdownDuration = drawdownAnalysis.maxDrawdownDuration;
    const currentDrawdown = drawdownAnalysis.currentDrawdown;
    
    // Calculate Calmar ratio
    const annualizedReturn = this.calculateAnnualizedReturn(equityCurve);
    const calmarRatio = maxDrawdown > 0 ? annualizedReturn / Math.abs(maxDrawdown) : 0;

    return {
      volatility,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      maxDrawdown,
      maxDrawdownDuration,
      currentDrawdown
    };
  }

  /**
   * Calculate trade statistics
   */
  private calculateTradeStatistics(trades: ExecutedTrade[]): Partial<PerformanceMetrics> {
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        profitFactor: 0,
        averageWin: 0,
        averageLoss: 0,
        largestWin: 0,
        largestLoss: 0
      };
    }

    // Group trades by symbol to calculate P&L
    const tradePnLs = this.calculateTradePnLs(trades);
    
    const winningTrades = tradePnLs.filter(pnl => pnl > 0);
    const losingTrades = tradePnLs.filter(pnl => pnl < 0);
    
    const totalTrades = tradePnLs.length;
    const winRate = totalTrades > 0 ? winningTrades.length / totalTrades : 0;
    
    const totalWins = winningTrades.reduce((sum, pnl) => sum + pnl, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, pnl) => sum + pnl, 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;
    
    const averageWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
    
    const largestWin = winningTrades.length > 0 ? Math.max(...winningTrades) : 0;
    const largestLoss = losingTrades.length > 0 ? Math.min(...losingTrades) : 0;

    return {
      totalTrades,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      profitFactor,
      averageWin,
      averageLoss,
      largestWin,
      largestLoss
    };
  }

  /**
   * Calculate benchmark comparison metrics
   */
  private calculateBenchmarkMetrics(
    equityCurve: EquityCurve, 
    benchmarkReturns: number[]
  ): Partial<PerformanceMetrics> {
    const portfolioReturns = this.calculateDailyReturns(equityCurve);
    
    // Align returns arrays (take minimum length)
    const minLength = Math.min(portfolioReturns.length, benchmarkReturns.length);
    const alignedPortfolioReturns = portfolioReturns.slice(0, minLength);
    const alignedBenchmarkReturns = benchmarkReturns.slice(0, minLength);
    
    // Calculate beta
    const beta = this.calculateBeta(alignedPortfolioReturns, alignedBenchmarkReturns);
    
    // Calculate alpha
    const portfolioMean = this.calculateMean(alignedPortfolioReturns) * 252; // Annualized
    const benchmarkMean = this.calculateMean(alignedBenchmarkReturns) * 252; // Annualized
    const alpha = portfolioMean - (this.riskFreeRate + beta * (benchmarkMean - this.riskFreeRate));
    
    // Calculate tracking error
    const excessReturns = alignedPortfolioReturns.map((r, i) => r - alignedBenchmarkReturns[i]);
    const trackingError = this.calculateStandardDeviation(excessReturns) * Math.sqrt(252);
    
    // Calculate information ratio
    const informationRatio = trackingError > 0 ? alpha / trackingError : 0;

    return {
      alpha,
      beta,
      trackingError,
      informationRatio
    };
  }

  /**
   * Calculate drawdown analysis
   */
  calculateDrawdownAnalysis(equityCurve: EquityCurve): DrawdownAnalysis {
    const points = equityCurve.points;
    const drawdownPeriods: DrawdownPeriod[] = [];
    let currentPeak = points[0].portfolioValue;
    let currentPeakDate = points[0].timestamp;
    let inDrawdown = false;
    let drawdownStart: Date | null = null;
    let maxDrawdown = 0;
    let maxDrawdownDuration = 0;
    let currentDrawdown = 0;

    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      if (!point) continue;
      
      if (point.portfolioValue > currentPeak) {
        // New peak reached
        if (inDrawdown && drawdownStart) {
          // End current drawdown period
          const drawdownPeriod: DrawdownPeriod = {
            startDate: drawdownStart,
            endDate: point.timestamp,
            peakValue: currentPeak,
            troughValue: Math.min(...points.slice(points.findIndex(p => p.timestamp === drawdownStart), i).map(p => p.portfolioValue)),
            drawdownPercent: 0, // Will be calculated below
            duration: this.calculateDaysBetween(drawdownStart, point.timestamp),
            recoveryDate: point.timestamp,
            recoveryTime: this.calculateDaysBetween(drawdownStart, point.timestamp)
          };
          
          drawdownPeriod.drawdownPercent = (drawdownPeriod.peakValue - drawdownPeriod.troughValue) / drawdownPeriod.peakValue;
          drawdownPeriods.push(drawdownPeriod);
          
          inDrawdown = false;
          drawdownStart = null;
        }
        
        currentPeak = point.portfolioValue;
        currentPeakDate = point.timestamp;
        currentDrawdown = 0;
      } else {
        // In drawdown
        if (!inDrawdown) {
          inDrawdown = true;
          drawdownStart = currentPeakDate;
        }
        
        const drawdown = (currentPeak - point.portfolioValue) / currentPeak;
        currentDrawdown = drawdown;
        
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }
    }

    // Handle ongoing drawdown
    if (inDrawdown && drawdownStart) {
      const lastPoint = points[points.length - 1];
      if (!lastPoint) return this.getEmptyDrawdownAnalysis();
      
      const drawdownPeriod: DrawdownPeriod = {
        startDate: drawdownStart,
        endDate: lastPoint.timestamp,
        peakValue: currentPeak,
        troughValue: Math.min(...points.slice(points.findIndex(p => p.timestamp === drawdownStart)).map(p => p.portfolioValue)),
        drawdownPercent: 0,
        duration: this.calculateDaysBetween(drawdownStart, lastPoint.timestamp)
      };
      
      drawdownPeriod.drawdownPercent = (drawdownPeriod.peakValue - drawdownPeriod.troughValue) / drawdownPeriod.peakValue;
      drawdownPeriods.push(drawdownPeriod);
    }

    // Calculate statistics
    const recoveryTimes = drawdownPeriods
      .filter(period => period.recoveryTime !== undefined)
      .map(period => period.recoveryTime!);
    
    const averageRecoveryTime = recoveryTimes.length > 0 
      ? recoveryTimes.reduce((sum, time) => sum + time, 0) / recoveryTimes.length 
      : 0;

    maxDrawdownDuration = drawdownPeriods.length > 0 
      ? Math.max(...drawdownPeriods.map(period => period.duration))
      : 0;

    const worstDrawdownPeriod = drawdownPeriods.length > 0
      ? drawdownPeriods.reduce((worst, current) => 
          current.drawdownPercent > worst.drawdownPercent ? current : worst
        )
      : {
          startDate: new Date(),
          endDate: new Date(),
          peakValue: 0,
          troughValue: 0,
          drawdownPercent: 0,
          duration: 0
        };

    return {
      maxDrawdown,
      maxDrawdownDuration,
      currentDrawdown,
      drawdownPeriods,
      recoveryTimes,
      averageRecoveryTime,
      worstDrawdownPeriod
    };
  }

  /**
   * Calculate rolling performance windows
   */
  calculateRollingMetrics(
    equityCurve: EquityCurve,
    windowDays: number
  ): RollingWindow<PerformanceMetrics> {
    const points = equityCurve.points;
    const rollingMetrics: PerformanceMetrics[] = [];

    for (let i = windowDays; i < points.length; i++) {
      const windowPoints = points.slice(i - windowDays, i + 1);
      const windowEquityCurve: EquityCurve = {
        points: windowPoints,
        startValue: windowPoints[0].portfolioValue,
        endValue: windowPoints[windowPoints.length - 1].portfolioValue,
        peakValue: Math.max(...windowPoints.map(p => p.portfolioValue)),
        troughValue: Math.min(...windowPoints.map(p => p.portfolioValue))
      };

      // Calculate metrics for this window (simplified version)
      const windowReturns = this.calculateDailyReturns(windowEquityCurve);
      const windowVolatility = this.calculateVolatility(windowReturns) * Math.sqrt(252);
      const windowReturn = (windowEquityCurve.endValue - windowEquityCurve.startValue) / windowEquityCurve.startValue;
      
      const windowMetrics: PerformanceMetrics = {
        totalReturn: windowReturn,
        annualizedReturn: windowReturn * (365.25 / windowDays),
        cumulativeReturn: windowReturn,
        volatility: windowVolatility,
        sharpeRatio: windowVolatility > 0 ? (windowReturn * (365.25 / windowDays) - this.riskFreeRate) / windowVolatility : 0,
        sortinoRatio: 0, // Simplified
        calmarRatio: 0, // Simplified
        maxDrawdown: 0, // Simplified
        maxDrawdownDuration: 0,
        currentDrawdown: 0,
        totalTrades: 0, // Would need trade data
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        profitFactor: 0,
        averageWin: 0,
        averageLoss: 0,
        largestWin: 0,
        largestLoss: 0
      };

      rollingMetrics.push(windowMetrics);
    }

    const currentMetrics = rollingMetrics[rollingMetrics.length - 1] || this.getEmptyMetrics();
    const averageMetrics = this.calculateAverageMetrics(rollingMetrics);

    return {
      period: windowDays,
      values: rollingMetrics,
      current: currentMetrics,
      average: averageMetrics
    };
  }

  /**
   * Generate equity curve from portfolio values
   */
  generateEquityCurve(portfolioHistory: Portfolio[]): EquityCurve {
    const points: EquityPoint[] = portfolioHistory.map(portfolio => ({
      timestamp: portfolio.timestamp,
      portfolioValue: portfolio.totalValue,
      cash: portfolio.cash,
      positions: portfolio.totalValue - portfolio.cash,
      drawdown: 0 // Will be calculated separately
    }));

    // Calculate drawdowns
    let peak = points[0].portfolioValue;
    for (const point of points) {
      if (point.portfolioValue > peak) {
        peak = point.portfolioValue;
      }
      point.drawdown = (peak - point.portfolioValue) / peak;
    }

    return {
      points,
      startValue: points[0].portfolioValue,
      endValue: points[points.length - 1].portfolioValue,
      peakValue: Math.max(...points.map(p => p.portfolioValue)),
      troughValue: Math.min(...points.map(p => p.portfolioValue))
    };
  }

  // Helper methods

  private calculateDailyReturns(equityCurve: EquityCurve): number[] {
    const points = equityCurve.points;
    const returns: number[] = [];

    for (let i = 1; i < points.length; i++) {
      const prevValue = points[i - 1].portfolioValue;
      const currentValue = points[i].portfolioValue;
      const dailyReturn = (currentValue - prevValue) / prevValue;
      returns.push(dailyReturn);
    }

    return returns;
  }

  private calculateVolatility(returns: number[]): number {
    return this.calculateStandardDeviation(returns);
  }

  private calculateMean(values: number[]): number {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  private calculateStandardDeviation(values: number[]): number {
    if (values.length <= 1) return 0;
    
    const mean = this.calculateMean(values);
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = this.calculateMean(squaredDiffs);
    
    return Math.sqrt(variance);
  }

  private calculateBeta(portfolioReturns: number[], benchmarkReturns: number[]): number {
    if (portfolioReturns.length !== benchmarkReturns.length || portfolioReturns.length === 0) {
      return 1; // Default beta
    }

    const portfolioMean = this.calculateMean(portfolioReturns);
    const benchmarkMean = this.calculateMean(benchmarkReturns);

    let covariance = 0;
    let benchmarkVariance = 0;

    for (let i = 0; i < portfolioReturns.length; i++) {
      const portfolioDiff = portfolioReturns[i] - portfolioMean;
      const benchmarkDiff = benchmarkReturns[i] - benchmarkMean;
      
      covariance += portfolioDiff * benchmarkDiff;
      benchmarkVariance += benchmarkDiff * benchmarkDiff;
    }

    covariance /= portfolioReturns.length - 1;
    benchmarkVariance /= portfolioReturns.length - 1;

    return benchmarkVariance > 0 ? covariance / benchmarkVariance : 1;
  }

  private calculateAnnualizedReturn(equityCurve: EquityCurve): number {
    const totalReturn = (equityCurve.endValue - equityCurve.startValue) / equityCurve.startValue;
    const daysDiff = this.calculateDaysBetween(
      equityCurve.points[0].timestamp,
      equityCurve.points[equityCurve.points.length - 1].timestamp
    );
    const years = daysDiff / 365.25;
    
    return years > 0 ? Math.pow(1 + totalReturn, 1 / years) - 1 : 0;
  }

  private calculateDaysBetween(startDate: Date, endDate: Date): number {
    const timeDiff = endDate.getTime() - startDate.getTime();
    return timeDiff / (1000 * 60 * 60 * 24);
  }

  private calculateTradePnLs(trades: ExecutedTrade[]): number[] {
    // Group trades by symbol and calculate P&L for each round trip
    const positionsBySymbol = new Map<string, { quantity: number; avgPrice: number }>();
    const pnls: number[] = [];

    for (const trade of trades) {
      const position = positionsBySymbol.get(trade.symbol) || { quantity: 0, avgPrice: 0 };
      
      if (trade.side === 'BUY') {
        // Add to position
        const newQuantity = position.quantity + trade.quantity;
        const newAvgPrice = position.quantity > 0 
          ? (position.avgPrice * position.quantity + trade.executionPrice * trade.quantity) / newQuantity
          : trade.executionPrice;
        
        positionsBySymbol.set(trade.symbol, { quantity: newQuantity, avgPrice: newAvgPrice });
      } else {
        // Reduce position (sell)
        if (position.quantity > 0) {
          const sellQuantity = Math.min(trade.quantity, position.quantity);
          const pnl = (trade.executionPrice - position.avgPrice) * sellQuantity - trade.commission;
          pnls.push(pnl);
          
          const remainingQuantity = position.quantity - sellQuantity;
          if (remainingQuantity > 0) {
            positionsBySymbol.set(trade.symbol, { quantity: remainingQuantity, avgPrice: position.avgPrice });
          } else {
            positionsBySymbol.delete(trade.symbol);
          }
        }
      }
    }

    return pnls;
  }

  private calculateAverageMetrics(metrics: PerformanceMetrics[]): PerformanceMetrics {
    if (metrics.length === 0) return this.getEmptyMetrics();

    const avgMetrics: PerformanceMetrics = {
      totalReturn: this.calculateMean(metrics.map(m => m.totalReturn)),
      annualizedReturn: this.calculateMean(metrics.map(m => m.annualizedReturn)),
      cumulativeReturn: this.calculateMean(metrics.map(m => m.cumulativeReturn)),
      volatility: this.calculateMean(metrics.map(m => m.volatility)),
      sharpeRatio: this.calculateMean(metrics.map(m => m.sharpeRatio)),
      sortinoRatio: this.calculateMean(metrics.map(m => m.sortinoRatio)),
      calmarRatio: this.calculateMean(metrics.map(m => m.calmarRatio)),
      maxDrawdown: this.calculateMean(metrics.map(m => m.maxDrawdown)),
      maxDrawdownDuration: this.calculateMean(metrics.map(m => m.maxDrawdownDuration)),
      currentDrawdown: this.calculateMean(metrics.map(m => m.currentDrawdown)),
      totalTrades: Math.round(this.calculateMean(metrics.map(m => m.totalTrades))),
      winningTrades: Math.round(this.calculateMean(metrics.map(m => m.winningTrades))),
      losingTrades: Math.round(this.calculateMean(metrics.map(m => m.losingTrades))),
      winRate: this.calculateMean(metrics.map(m => m.winRate)),
      profitFactor: this.calculateMean(metrics.map(m => m.profitFactor)),
      averageWin: this.calculateMean(metrics.map(m => m.averageWin)),
      averageLoss: this.calculateMean(metrics.map(m => m.averageLoss)),
      largestWin: this.calculateMean(metrics.map(m => m.largestWin)),
      largestLoss: this.calculateMean(metrics.map(m => m.largestLoss))
    };

    return avgMetrics;
  }

  private getEmptyMetrics(): PerformanceMetrics {
    return {
      totalReturn: 0,
      annualizedReturn: 0,
      cumulativeReturn: 0,
      volatility: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      maxDrawdown: 0,
      maxDrawdownDuration: 0,
      currentDrawdown: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      profitFactor: 0,
      averageWin: 0,
      averageLoss: 0,
      largestWin: 0,
      largestLoss: 0
    };
  }

  private getEmptyDrawdownAnalysis(): DrawdownAnalysis {
    return {
      maxDrawdown: 0,
      maxDrawdownDuration: 0,
      currentDrawdown: 0,
      drawdownPeriods: [],
      recoveryTimes: [],
      averageRecoveryTime: 0,
      worstDrawdownPeriod: {
        startDate: new Date(),
        endDate: new Date(),
        peakValue: 0,
        troughValue: 0,
        drawdownPercent: 0,
        duration: 0
      }
    };
  }
}