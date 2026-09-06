/**
 * Backtesting Visualization Engine
 * 
 * This module provides comprehensive visualization capabilities for backtesting results including:
 * - Equity curve generation and drawdown charts
 * - Trade distribution analysis and performance comparison charts
 * - Interactive performance dashboard components
 * - Chart data generation for various visualization libraries
 */

import { createLogger } from '../utils/enhanced-logger';
import {
  BacktestResult,
  EquityCurve,
  EquityPoint,
  DrawdownAnalysis,
  DrawdownPeriod,
  PerformanceMetrics,
  ExecutedTrade,
  Portfolio
} from './types';

/**
 * Chart data interfaces for visualization
 */
export interface ChartDataPoint {
  x: string | number | Date;
  y: number;
  label?: string;
  color?: string;
  metadata?: Record<string, any>;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  type: 'line' | 'bar' | 'area' | 'scatter';
  color?: string;
  yAxis?: 'left' | 'right';
}

export interface ChartConfig {
  title: string;
  subtitle?: string;
  xAxisLabel: string;
  yAxisLabel: string;
  series: ChartSeries[];
  annotations?: ChartAnnotation[];
  theme?: 'light' | 'dark';
  responsive?: boolean;
}

export interface ChartAnnotation {
  type: 'line' | 'area' | 'point';
  x?: string | number | Date;
  y?: number;
  text: string;
  color?: string;
}

export interface EquityCurveChart extends ChartConfig {
  benchmarkSeries?: ChartSeries;
  drawdownSeries?: ChartSeries;
}

export interface DrawdownChart extends ChartConfig {
  recoveryPeriods?: ChartAnnotation[];
}

export interface TradeDistributionChart extends ChartConfig {
  profitLossDistribution: ChartSeries;
  winLossRatio: ChartSeries;
}

export interface PerformanceComparisonChart extends ChartConfig {
  strategies: string[];
  metrics: string[];
  comparisonData: ChartSeries[];
}

export interface DashboardData {
  equityCurve: EquityCurveChart;
  drawdownAnalysis: DrawdownChart;
  tradeDistribution: TradeDistributionChart;
  performanceMetrics: PerformanceMetrics;
  riskMetrics: Record<string, number>;
  summary: DashboardSummary;
}

export interface DashboardSummary {
  totalReturn: string;
  annualizedReturn: string;
  sharpeRatio: string;
  maxDrawdown: string;
  winRate: string;
  totalTrades: number;
  profitFactor: string;
  calmarRatio: string;
  volatility: string;
  bestTrade: string;
  worstTrade: string;
  averageHoldingPeriod: string;
}

/**
 * Comprehensive visualization engine for backtesting results
 */
export class VisualizationEngine {
  private readonly logger = createLogger('system', 'visualization-engine');

  /**
   * Generate equity curve chart with benchmark comparison
   */
  generateEquityCurveChart(
    equityCurve: EquityCurve,
    benchmarkData?: EquityPoint[],
    options?: Partial<ChartConfig>
  ): EquityCurveChart {
    try {
      // Main equity curve series
      const equitySeries: ChartSeries = {
        name: 'Portfolio Value',
        type: 'line',
        color: '#2E7D32',
        data: equityCurve.points.map(point => ({
          x: point.timestamp,
          y: point.portfolioValue,
          metadata: {
            cash: point.cash,
            positions: point.positions,
            drawdown: point.drawdown
          }
        }))
      };

      // Drawdown series (as area chart)
      const drawdownSeries: ChartSeries = {
        name: 'Drawdown',
        type: 'area',
        color: '#D32F2F',
        yAxis: 'right',
        data: equityCurve.points.map(point => ({
          x: point.timestamp,
          y: point.drawdown * 100, // Convert to percentage
          metadata: { drawdownPercent: point.drawdown }
        }))
      };

      const series: ChartSeries[] = [equitySeries, drawdownSeries];

      // Add benchmark series if provided
      let benchmarkSeries: ChartSeries | undefined;
      if (benchmarkData && benchmarkData.length > 0) {
        benchmarkSeries = {
          name: 'Benchmark',
          type: 'line',
          color: '#1976D2',
          data: benchmarkData.map(point => ({
            x: point.timestamp,
            y: point.benchmarkValue || 0
          }))
        };
        series.push(benchmarkSeries);
      }

      // Calculate key annotations
      const annotations: ChartAnnotation[] = [];
      
      // Mark peak and trough points
      const peakPoint = equityCurve.points.find(p => p.portfolioValue === equityCurve.peakValue);
      const troughPoint = equityCurve.points.find(p => p.portfolioValue === equityCurve.troughValue);
      
      if (peakPoint) {
        annotations.push({
          type: 'point',
          x: peakPoint.timestamp,
          y: peakPoint.portfolioValue,
          text: `Peak: $${peakPoint.portfolioValue.toLocaleString()}`,
          color: '#4CAF50'
        });
      }
      
      if (troughPoint) {
        annotations.push({
          type: 'point',
          x: troughPoint.timestamp,
          y: troughPoint.portfolioValue,
          text: `Trough: $${troughPoint.portfolioValue.toLocaleString()}`,
          color: '#F44336'
        });
      }

      const chart: EquityCurveChart = {
        title: options?.title || 'Portfolio Equity Curve',
        subtitle: `From ${equityCurve.points[0]?.timestamp.toLocaleDateString()} to ${equityCurve.points[equityCurve.points.length - 1]?.timestamp.toLocaleDateString()}`,
        xAxisLabel: 'Date',
        yAxisLabel: 'Portfolio Value ($)',
        series,
        annotations,
        benchmarkSeries,
        drawdownSeries,
        theme: options?.theme || 'light',
        responsive: true
      };

      this.logger.info('equity-curve-generated', 'Equity curve chart generated successfully', {
        dataPoints: equityCurve.points.length,
        hasBenchmark: !!benchmarkSeries,
        peakValue: equityCurve.peakValue,
        troughValue: equityCurve.troughValue
      });

      return chart;

    } catch (error) {
      this.logger.error('equity-curve-error', 'Failed to generate equity curve chart', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Generate drawdown analysis chart with recovery periods
   */
  generateDrawdownChart(drawdownAnalysis: DrawdownAnalysis): DrawdownChart {
    try {
      // Main drawdown series
      const drawdownSeries: ChartSeries = {
        name: 'Drawdown %',
        type: 'area',
        color: '#D32F2F',
        data: drawdownAnalysis.drawdownPeriods.flatMap(period => [
          {
            x: period.startDate,
            y: 0,
            label: 'Peak'
          },
          {
            x: period.endDate,
            y: period.drawdownPercent * 100,
            label: `${(period.drawdownPercent * 100).toFixed(2)}%`,
            metadata: {
              duration: period.duration,
              recoveryTime: period.recoveryTime,
              peakValue: period.peakValue,
              troughValue: period.troughValue
            }
          }
        ])
      };

      // Recovery period annotations
      const recoveryPeriods: ChartAnnotation[] = drawdownAnalysis.drawdownPeriods
        .filter(period => period.recoveryDate)
        .map(period => ({
          type: 'area' as const,
          x: period.startDate,
          y: period.drawdownPercent * 100,
          text: `Recovery: ${period.recoveryTime} days`,
          color: '#4CAF50'
        }));

      const chart: DrawdownChart = {
        title: 'Drawdown Analysis',
        subtitle: `Max Drawdown: ${(drawdownAnalysis.maxDrawdown * 100).toFixed(2)}% | Avg Recovery: ${drawdownAnalysis.averageRecoveryTime.toFixed(0)} days`,
        xAxisLabel: 'Date',
        yAxisLabel: 'Drawdown (%)',
        series: [drawdownSeries],
        recoveryPeriods,
        annotations: [
          {
            type: 'line',
            y: drawdownAnalysis.maxDrawdown * 100,
            text: `Max Drawdown: ${(drawdownAnalysis.maxDrawdown * 100).toFixed(2)}%`,
            color: '#FF5722'
          }
        ],
        theme: 'light',
        responsive: true
      };

      this.logger.info('drawdown-chart-generated', 'Drawdown chart generated successfully', {
        maxDrawdown: drawdownAnalysis.maxDrawdown,
        drawdownPeriods: drawdownAnalysis.drawdownPeriods.length,
        averageRecoveryTime: drawdownAnalysis.averageRecoveryTime
      });

      return chart;

    } catch (error) {
      this.logger.error('drawdown-chart-error', 'Failed to generate drawdown chart', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Generate trade distribution analysis charts
   */
  generateTradeDistributionChart(trades: ExecutedTrade[]): TradeDistributionChart {
    try {
      // Calculate P&L for each trade (simplified)
      const tradePnLs = this.calculateTradePnLs(trades);
      
      // Create profit/loss distribution histogram
      const bins = this.createHistogramBins(tradePnLs, 20);
      const profitLossDistribution: ChartSeries = {
        name: 'Trade P&L Distribution',
        type: 'bar',
        color: '#1976D2',
        data: bins.map(bin => ({
          x: bin.midpoint,
          y: bin.count,
          label: `$${bin.midpoint.toFixed(0)}`,
          metadata: {
            range: `$${bin.min.toFixed(0)} - $${bin.max.toFixed(0)}`,
            count: bin.count,
            percentage: (bin.count / tradePnLs.length * 100).toFixed(1)
          }
        }))
      };

      // Win/Loss ratio over time
      const winLossData = this.calculateWinLossOverTime(trades);
      const winLossRatio: ChartSeries = {
        name: 'Win Rate (30-day rolling)',
        type: 'line',
        color: '#4CAF50',
        data: winLossData.map(point => ({
          x: point.date,
          y: point.winRate * 100,
          metadata: {
            wins: point.wins,
            losses: point.losses,
            totalTrades: point.totalTrades
          }
        }))
      };

      const chart: TradeDistributionChart = {
        title: 'Trade Distribution Analysis',
        subtitle: `Total Trades: ${trades.length} | Win Rate: ${this.calculateWinRate(tradePnLs).toFixed(1)}%`,
        xAxisLabel: 'Profit/Loss ($)',
        yAxisLabel: 'Number of Trades',
        series: [profitLossDistribution],
        profitLossDistribution,
        winLossRatio,
        theme: 'light',
        responsive: true
      };

      this.logger.info('trade-distribution-generated', 'Trade distribution chart generated successfully', {
        totalTrades: trades.length,
        winRate: this.calculateWinRate(tradePnLs),
        profitableTrades: tradePnLs.filter(pnl => pnl > 0).length
      });

      return chart;

    } catch (error) {
      this.logger.error('trade-distribution-error', 'Failed to generate trade distribution chart', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Generate performance comparison chart for multiple strategies
   */
  generatePerformanceComparisonChart(
    strategies: Array<{ name: string; metrics: PerformanceMetrics }>,
    selectedMetrics: string[] = ['totalReturn', 'sharpeRatio', 'maxDrawdown', 'winRate']
  ): PerformanceComparisonChart {
    try {
      const comparisonData: ChartSeries[] = selectedMetrics.map(metric => ({
        name: this.formatMetricName(metric),
        type: 'bar' as const,
        data: strategies.map(strategy => ({
          x: strategy.name,
          y: this.getMetricValue(strategy.metrics, metric),
          label: this.formatMetricValue(this.getMetricValue(strategy.metrics, metric), metric),
          metadata: { strategy: strategy.name, metric }
        }))
      }));

      const chart: PerformanceComparisonChart = {
        title: 'Strategy Performance Comparison',
        subtitle: `Comparing ${strategies.length} strategies across ${selectedMetrics.length} metrics`,
        xAxisLabel: 'Strategy',
        yAxisLabel: 'Performance Metric',
        series: comparisonData,
        strategies: strategies.map(s => s.name),
        metrics: selectedMetrics,
        comparisonData,
        theme: 'light',
        responsive: true
      };

      this.logger.info('performance-comparison-generated', 'Performance comparison chart generated successfully', {
        strategiesCount: strategies.length,
        metricsCount: selectedMetrics.length,
        metrics: selectedMetrics
      });

      return chart;

    } catch (error) {
      this.logger.error('performance-comparison-error', 'Failed to generate performance comparison chart', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Generate comprehensive dashboard data
   */
  generateDashboardData(backtestResult: BacktestResult): DashboardData {
    try {
      const equityCurve = this.generateEquityCurveChart(backtestResult.equity);
      const drawdownAnalysis = this.generateDrawdownChart(backtestResult.drawdowns);
      const tradeDistribution = this.generateTradeDistributionChart(backtestResult.trades);

      // Calculate additional risk metrics
      const riskMetrics = {
        valueAtRisk95: backtestResult.riskMetrics.valueAtRisk95,
        conditionalVaR95: backtestResult.riskMetrics.conditionalVaR95,
        skewness: backtestResult.riskMetrics.skewness,
        kurtosis: backtestResult.riskMetrics.kurtosis,
        tailRatio: backtestResult.riskMetrics.tailRatio,
        gainToPainRatio: backtestResult.riskMetrics.gainToPainRatio
      };

      // Generate summary statistics
      const summary = this.generateDashboardSummary(backtestResult);

      const dashboardData: DashboardData = {
        equityCurve,
        drawdownAnalysis,
        tradeDistribution,
        performanceMetrics: backtestResult.performance,
        riskMetrics,
        summary
      };

      this.logger.info('dashboard-data-generated', 'Dashboard data generated successfully', {
        strategy: backtestResult.config.strategy.name,
        totalReturn: backtestResult.performance.totalReturn,
        sharpeRatio: backtestResult.performance.sharpeRatio,
        maxDrawdown: backtestResult.performance.maxDrawdown
      });

      return dashboardData;

    } catch (error) {
      this.logger.error('dashboard-data-error', 'Failed to generate dashboard data', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Generate interactive chart configuration for web frameworks
   */
  generateInteractiveChartConfig(chartData: ChartConfig, framework: 'chartjs' | 'plotly' | 'highcharts' = 'chartjs'): Record<string, any> {
    try {
      switch (framework) {
        case 'chartjs':
          return this.generateChartJSConfig(chartData);
        case 'plotly':
          return this.generatePlotlyConfig(chartData);
        case 'highcharts':
          return this.generateHighchartsConfig(chartData);
        default:
          throw new Error(`Unsupported framework: ${framework}`);
      }
    } catch (error) {
      this.logger.error('interactive-chart-error', 'Failed to generate interactive chart config', {
        framework,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // Private helper methods

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

  private createHistogramBins(values: number[], binCount: number): Array<{ min: number; max: number; midpoint: number; count: number }> {
    if (values.length === 0) return [];

    const min = Math.min(...values);
    const max = Math.max(...values);
    const binWidth = (max - min) / binCount;
    
    const bins = Array.from({ length: binCount }, (_, i) => ({
      min: min + i * binWidth,
      max: min + (i + 1) * binWidth,
      midpoint: min + (i + 0.5) * binWidth,
      count: 0
    }));

    for (const value of values) {
      const binIndex = Math.min(Math.floor((value - min) / binWidth), binCount - 1);
      bins[binIndex]!.count++;
    }

    return bins;
  }

  private calculateWinLossOverTime(trades: ExecutedTrade[]): Array<{ date: Date; winRate: number; wins: number; losses: number; totalTrades: number }> {
    const tradePnLs = this.calculateTradePnLs(trades);
    const sortedTrades = trades.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const windowSize = 30; // 30-day rolling window
    const results: Array<{ date: Date; winRate: number; wins: number; losses: number; totalTrades: number }> = [];

    for (let i = windowSize; i < sortedTrades.length; i++) {
      const windowTrades = sortedTrades.slice(i - windowSize, i);
      const windowPnLs = tradePnLs.slice(i - windowSize, i);
      
      const wins = windowPnLs.filter(pnl => pnl > 0).length;
      const losses = windowPnLs.filter(pnl => pnl <= 0).length;
      const winRate = windowPnLs.length > 0 ? wins / windowPnLs.length : 0;

      results.push({
        date: sortedTrades[i]!.timestamp,
        winRate,
        wins,
        losses,
        totalTrades: windowPnLs.length
      });
    }

    return results;
  }

  private calculateWinRate(pnls: number[]): number {
    if (pnls.length === 0) return 0;
    const wins = pnls.filter(pnl => pnl > 0).length;
    return (wins / pnls.length) * 100;
  }

  private formatMetricName(metric: string): string {
    const names: Record<string, string> = {
      totalReturn: 'Total Return',
      annualizedReturn: 'Annualized Return',
      sharpeRatio: 'Sharpe Ratio',
      sortinoRatio: 'Sortino Ratio',
      calmarRatio: 'Calmar Ratio',
      maxDrawdown: 'Max Drawdown',
      winRate: 'Win Rate',
      profitFactor: 'Profit Factor',
      volatility: 'Volatility'
    };
    return names[metric] || metric;
  }

  private getMetricValue(metrics: PerformanceMetrics, metric: string): number {
    return (metrics as any)[metric] || 0;
  }

  private formatMetricValue(value: number, metric: string): string {
    const percentageMetrics = ['totalReturn', 'annualizedReturn', 'maxDrawdown', 'winRate', 'volatility'];
    const ratioMetrics = ['sharpeRatio', 'sortinoRatio', 'calmarRatio', 'profitFactor'];

    if (percentageMetrics.includes(metric)) {
      return `${(value * 100).toFixed(2)}%`;
    } else if (ratioMetrics.includes(metric)) {
      return value.toFixed(3);
    } else {
      return value.toFixed(2);
    }
  }

  private generateDashboardSummary(backtestResult: BacktestResult): DashboardSummary {
    const trades = backtestResult.trades;
    const performance = backtestResult.performance;
    
    // Calculate best and worst trades
    const tradePnLs = this.calculateTradePnLs(trades);
    const bestTrade = tradePnLs.length > 0 ? Math.max(...tradePnLs) : 0;
    const worstTrade = tradePnLs.length > 0 ? Math.min(...tradePnLs) : 0;
    
    // Calculate average holding period (simplified)
    const avgHoldingPeriod = trades.length > 1 
      ? (trades[trades.length - 1]!.timestamp.getTime() - trades[0]!.timestamp.getTime()) / (1000 * 60 * 60 * 24 * trades.length)
      : 0;

    return {
      totalReturn: `${(performance.totalReturn * 100).toFixed(2)}%`,
      annualizedReturn: `${(performance.annualizedReturn * 100).toFixed(2)}%`,
      sharpeRatio: performance.sharpeRatio.toFixed(3),
      maxDrawdown: `${(performance.maxDrawdown * 100).toFixed(2)}%`,
      winRate: `${performance.winRate.toFixed(1)}%`,
      totalTrades: performance.totalTrades,
      profitFactor: performance.profitFactor.toFixed(2),
      calmarRatio: performance.calmarRatio.toFixed(3),
      volatility: `${(performance.volatility * 100).toFixed(2)}%`,
      bestTrade: `$${bestTrade.toFixed(2)}`,
      worstTrade: `$${worstTrade.toFixed(2)}`,
      averageHoldingPeriod: `${avgHoldingPeriod.toFixed(1)} days`
    };
  }

  private generateChartJSConfig(chartData: ChartConfig): Record<string, any> {
    return {
      type: chartData.series[0]?.type || 'line',
      data: {
        labels: chartData.series[0]?.data.map(d => d.x) || [],
        datasets: chartData.series.map(series => ({
          label: series.name,
          data: series.data.map(d => d.y),
          borderColor: series.color,
          backgroundColor: series.type === 'area' ? `${series.color}33` : series.color,
          fill: series.type === 'area'
        }))
      },
      options: {
        responsive: chartData.responsive,
        plugins: {
          title: {
            display: true,
            text: chartData.title
          },
          subtitle: {
            display: !!chartData.subtitle,
            text: chartData.subtitle
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: chartData.xAxisLabel
            }
          },
          y: {
            title: {
              display: true,
              text: chartData.yAxisLabel
            }
          }
        }
      }
    };
  }

  private generatePlotlyConfig(chartData: ChartConfig): Record<string, any> {
    return {
      data: chartData.series.map(series => ({
        x: series.data.map(d => d.x),
        y: series.data.map(d => d.y),
        type: series.type === 'line' ? 'scatter' : series.type,
        mode: series.type === 'line' ? 'lines' : undefined,
        name: series.name,
        line: { color: series.color },
        marker: { color: series.color }
      })),
      layout: {
        title: chartData.title,
        xaxis: { title: chartData.xAxisLabel },
        yaxis: { title: chartData.yAxisLabel },
        responsive: chartData.responsive
      }
    };
  }

  private generateHighchartsConfig(chartData: ChartConfig): Record<string, any> {
    return {
      title: { text: chartData.title },
      subtitle: { text: chartData.subtitle },
      xAxis: { title: { text: chartData.xAxisLabel } },
      yAxis: { title: { text: chartData.yAxisLabel } },
      series: chartData.series.map(series => ({
        name: series.name,
        type: series.type,
        data: series.data.map(d => [d.x, d.y]),
        color: series.color
      })),
      responsive: {
        rules: chartData.responsive ? [{ condition: { maxWidth: 500 } }] : []
      }
    };
  }
}