/**
 * Backtesting Export Engine
 * 
 * This module provides comprehensive export functionality for backtesting results including:
 * - JSON export with structured data
 * - CSV export for spreadsheet analysis
 * - PDF report generation with charts and tables
 * - Configurable export formats and templates
 */

import { createLogger } from '../utils/enhanced-logger';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import {
  BacktestResult,
  PerformanceMetrics,
  ExecutedTrade,
  DrawdownAnalysis,
  EquityCurve
} from './types';
import { DashboardData, ChartConfig } from './visualization-engine';

/**
 * Export configuration options
 */
export interface ExportConfig {
  outputPath: string;
  format: 'json' | 'csv' | 'pdf' | 'html';
  includeCharts?: boolean;
  includeRawData?: boolean;
  template?: 'standard' | 'detailed' | 'summary';
  customFields?: string[];
  dateFormat?: string;
  numberFormat?: {
    decimals: number;
    thousandsSeparator: string;
    decimalSeparator: string;
  };
}

export interface ExportResult {
  success: boolean;
  filePath: string;
  fileSize: number;
  exportTime: Date;
  format: string;
  errors?: string[];
  warnings?: string[];
}

export interface CSVExportOptions {
  delimiter: string;
  includeHeaders: boolean;
  dateFormat: string;
  floatPrecision: number;
}

export interface PDFExportOptions {
  pageSize: 'A4' | 'Letter' | 'Legal';
  orientation: 'portrait' | 'landscape';
  includeCharts: boolean;
  includeTradeDetails: boolean;
  template: 'executive' | 'detailed' | 'technical';
}

export interface HTMLExportOptions {
  template: 'dashboard' | 'report' | 'interactive';
  includeInteractiveCharts: boolean;
  cssFramework: 'bootstrap' | 'tailwind' | 'custom';
  chartLibrary: 'chartjs' | 'plotly' | 'highcharts';
}

/**
 * Comprehensive export engine for backtesting results
 */
export class ExportEngine {
  private readonly logger = createLogger('system', 'export-engine');

  /**
   * Export backtesting results in specified format
   */
  async exportResults(
    backtestResult: BacktestResult,
    config: ExportConfig,
    dashboardData?: DashboardData
  ): Promise<ExportResult> {
    try {
      this.logger.info('export-started', 'Starting export process', {
        format: config.format,
        outputPath: config.outputPath,
        strategy: backtestResult.config.strategy.name
      });

      // Ensure output directory exists
      await this.ensureDirectoryExists(dirname(config.outputPath));

      let result: ExportResult;

      switch (config.format) {
        case 'json':
          result = await this.exportToJSON(backtestResult, config, dashboardData);
          break;
        case 'csv':
          result = await this.exportToCSV(backtestResult, config);
          break;
        case 'pdf':
          result = await this.exportToPDF(backtestResult, config, dashboardData);
          break;
        case 'html':
          result = await this.exportToHTML(backtestResult, config, dashboardData);
          break;
        default:
          throw new Error(`Unsupported export format: ${config.format}`);
      }

      this.logger.info('export-completed', 'Export process completed successfully', {
        format: config.format,
        filePath: result.filePath,
        fileSize: result.fileSize,
        success: result.success
      });

      return result;

    } catch (error) {
      this.logger.error('export-error', 'Export process failed', {
        format: config.format,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        filePath: config.outputPath,
        fileSize: 0,
        exportTime: new Date(),
        format: config.format,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Export to JSON format with structured data
   */
  async exportToJSON(
    backtestResult: BacktestResult,
    config: ExportConfig,
    dashboardData?: DashboardData
  ): Promise<ExportResult> {
    try {
      const exportData = {
        metadata: {
          exportTime: new Date().toISOString(),
          exportVersion: '1.0.0',
          strategy: backtestResult.config.strategy.name,
          symbols: backtestResult.config.symbols,
          period: {
            start: backtestResult.startDate.toISOString(),
            end: backtestResult.endDate.toISOString(),
            duration: backtestResult.duration
          }
        },
        configuration: {
          initialCapital: backtestResult.config.initialCapital,
          commission: backtestResult.config.commission,
          slippage: backtestResult.config.slippage,
          marketImpact: backtestResult.config.marketImpact
        },
        performance: this.formatPerformanceMetrics(backtestResult.performance, config),
        riskMetrics: backtestResult.riskMetrics,
        drawdownAnalysis: this.formatDrawdownAnalysis(backtestResult.drawdowns, config),
        portfolio: {
          finalValue: backtestResult.portfolio.totalValue,
          cash: backtestResult.portfolio.cash,
          positions: Array.from(backtestResult.portfolio.positions.entries()).map(([symbol, position]) => ({
            symbol: symbol,
            quantity: position.quantity,
            averagePrice: position.averagePrice,
            marketValue: position.marketValue,
            unrealizedPnL: position.unrealizedPnL,
            realizedPnL: position.realizedPnL,
            lastUpdated: position.lastUpdated
          }))
        },
        trades: config.includeRawData ? this.formatTrades(backtestResult.trades, config) : {
          count: backtestResult.trades.length,
          summary: 'Raw trade data excluded (set includeRawData: true to include)'
        },
        equityCurve: config.includeRawData ? this.formatEquityCurve(backtestResult.equity, config) : {
          summary: 'Equity curve data excluded (set includeRawData: true to include)'
        },
        warnings: backtestResult.warnings,
        dashboardData: config.includeCharts && dashboardData ? this.formatDashboardData(dashboardData) : undefined
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      await writeFile(config.outputPath, jsonString, 'utf8');

      const stats = await this.getFileStats(config.outputPath);

      return {
        success: true,
        filePath: config.outputPath,
        fileSize: stats.size,
        exportTime: new Date(),
        format: 'json'
      };

    } catch (error) {
      throw new Error(`JSON export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Export to CSV format for spreadsheet analysis
   */
  async exportToCSV(
    backtestResult: BacktestResult,
    config: ExportConfig
  ): Promise<ExportResult> {
    try {
      const csvOptions: CSVExportOptions = {
        delimiter: ',',
        includeHeaders: true,
        dateFormat: config.dateFormat || 'YYYY-MM-DD',
        floatPrecision: config.numberFormat?.decimals || 4
      };

      let csvContent = '';

      // Export based on template
      switch (config.template) {
        case 'summary':
          csvContent = this.generateSummaryCSV(backtestResult, csvOptions);
          break;
        case 'detailed':
          csvContent = this.generateDetailedCSV(backtestResult, csvOptions);
          break;
        default:
          csvContent = this.generateStandardCSV(backtestResult, csvOptions);
      }

      await writeFile(config.outputPath, csvContent, 'utf8');

      const stats = await this.getFileStats(config.outputPath);

      return {
        success: true,
        filePath: config.outputPath,
        fileSize: stats.size,
        exportTime: new Date(),
        format: 'csv'
      };

    } catch (error) {
      throw new Error(`CSV export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Export to PDF format with charts and tables
   */
  async exportToPDF(
    backtestResult: BacktestResult,
    config: ExportConfig,
    dashboardData?: DashboardData
  ): Promise<ExportResult> {
    try {
      // Note: This is a simplified PDF export implementation
      // In a real implementation, you would use a library like puppeteer, jsPDF, or PDFKit
      
      const pdfOptions: PDFExportOptions = {
        pageSize: 'A4',
        orientation: 'portrait',
        includeCharts: config.includeCharts || false,
        includeTradeDetails: config.includeRawData || false,
        template: (config.template as any) || 'executive'
      };

      // Generate HTML content for PDF conversion
      const htmlContent = await this.generatePDFHTML(backtestResult, pdfOptions, dashboardData);
      
      // For now, save as HTML (in real implementation, convert to PDF)
      const htmlPath = config.outputPath.replace('.pdf', '.html');
      await writeFile(htmlPath, htmlContent, 'utf8');

      const stats = await this.getFileStats(htmlPath);

      return {
        success: true,
        filePath: htmlPath,
        fileSize: stats.size,
        exportTime: new Date(),
        format: 'pdf',
        warnings: ['PDF export saved as HTML - PDF conversion requires additional dependencies']
      };

    } catch (error) {
      throw new Error(`PDF export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Export to HTML format with interactive dashboard
   */
  async exportToHTML(
    backtestResult: BacktestResult,
    config: ExportConfig,
    dashboardData?: DashboardData
  ): Promise<ExportResult> {
    try {
      const htmlOptions: HTMLExportOptions = {
        template: (config.template as any) || 'dashboard',
        includeInteractiveCharts: config.includeCharts || false,
        cssFramework: 'bootstrap',
        chartLibrary: 'chartjs'
      };

      const htmlContent = await this.generateInteractiveHTML(backtestResult, htmlOptions, dashboardData);
      await writeFile(config.outputPath, htmlContent, 'utf8');

      const stats = await this.getFileStats(config.outputPath);

      return {
        success: true,
        filePath: config.outputPath,
        fileSize: stats.size,
        exportTime: new Date(),
        format: 'html'
      };

    } catch (error) {
      throw new Error(`HTML export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Export multiple formats simultaneously
   */
  async exportMultipleFormats(
    backtestResult: BacktestResult,
    configs: ExportConfig[],
    dashboardData?: DashboardData
  ): Promise<ExportResult[]> {
    const results: ExportResult[] = [];

    for (const config of configs) {
      try {
        const result = await this.exportResults(backtestResult, config, dashboardData);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          filePath: config.outputPath,
          fileSize: 0,
          exportTime: new Date(),
          format: config.format,
          errors: [error instanceof Error ? error.message : String(error)]
        });
      }
    }

    return results;
  }

  // Private helper methods

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore error
    }
  }

  private async getFileStats(filePath: string): Promise<{ size: number }> {
    try {
      const fs = await import('fs/promises');
      const stats = await fs.stat(filePath);
      return { size: stats.size };
    } catch {
      return { size: 0 };
    }
  }

  private formatPerformanceMetrics(metrics: PerformanceMetrics, config: ExportConfig): Record<string, any> {
    const decimals = config.numberFormat?.decimals || 4;
    
    return {
      returns: {
        total: this.formatNumber(metrics.totalReturn, decimals),
        annualized: this.formatNumber(metrics.annualizedReturn, decimals),
        cumulative: this.formatNumber(metrics.cumulativeReturn, decimals)
      },
      risk: {
        volatility: this.formatNumber(metrics.volatility, decimals),
        sharpeRatio: this.formatNumber(metrics.sharpeRatio, decimals),
        sortinoRatio: this.formatNumber(metrics.sortinoRatio, decimals),
        calmarRatio: this.formatNumber(metrics.calmarRatio, decimals),
        maxDrawdown: this.formatNumber(metrics.maxDrawdown, decimals),
        maxDrawdownDuration: metrics.maxDrawdownDuration,
        currentDrawdown: this.formatNumber(metrics.currentDrawdown, decimals)
      },
      trading: {
        totalTrades: metrics.totalTrades,
        winningTrades: metrics.winningTrades,
        losingTrades: metrics.losingTrades,
        winRate: this.formatNumber(metrics.winRate, decimals),
        profitFactor: this.formatNumber(metrics.profitFactor, decimals),
        averageWin: this.formatNumber(metrics.averageWin, decimals),
        averageLoss: this.formatNumber(metrics.averageLoss, decimals),
        largestWin: this.formatNumber(metrics.largestWin, decimals),
        largestLoss: this.formatNumber(metrics.largestLoss, decimals)
      },
      benchmark: metrics.alpha !== undefined ? {
        alpha: this.formatNumber(metrics.alpha, decimals),
        beta: this.formatNumber(metrics.beta || 0, decimals),
        trackingError: this.formatNumber(metrics.trackingError || 0, decimals),
        informationRatio: this.formatNumber(metrics.informationRatio || 0, decimals)
      } : undefined
    };
  }

  private formatDrawdownAnalysis(drawdowns: DrawdownAnalysis, config: ExportConfig): Record<string, any> {
    const decimals = config.numberFormat?.decimals || 4;
    
    return {
      maxDrawdown: this.formatNumber(drawdowns.maxDrawdown, decimals),
      maxDrawdownDuration: drawdowns.maxDrawdownDuration,
      currentDrawdown: this.formatNumber(drawdowns.currentDrawdown, decimals),
      averageRecoveryTime: this.formatNumber(drawdowns.averageRecoveryTime, decimals),
      drawdownPeriods: drawdowns.drawdownPeriods.map(period => ({
        startDate: period.startDate.toISOString(),
        endDate: period.endDate.toISOString(),
        peakValue: this.formatNumber(period.peakValue, decimals),
        troughValue: this.formatNumber(period.troughValue, decimals),
        drawdownPercent: this.formatNumber(period.drawdownPercent, decimals),
        duration: period.duration,
        recoveryTime: period.recoveryTime,
        recoveryDate: period.recoveryDate?.toISOString()
      }))
    };
  }

  private formatTrades(trades: ExecutedTrade[], config: ExportConfig): any[] {
    const decimals = config.numberFormat?.decimals || 4;
    
    return trades.map(trade => ({
      orderId: trade.orderId,
      symbol: trade.symbol,
      side: trade.side,
      quantity: trade.quantity,
      executionPrice: this.formatNumber(trade.executionPrice, decimals),
      commission: this.formatNumber(trade.commission, decimals),
      slippage: this.formatNumber(trade.slippage, decimals),
      marketImpact: this.formatNumber(trade.marketImpact, decimals),
      executionDelay: trade.executionDelay,
      timestamp: trade.timestamp.toISOString(),
      marketConditions: {
        isMarketOpen: trade.marketConditions.isMarketOpen,
        volatility: this.formatNumber(trade.marketConditions.volatility, decimals),
        volume: trade.marketConditions.volume,
        bidAskSpread: this.formatNumber(trade.marketConditions.bidAskSpread, decimals),
        marketTrend: trade.marketConditions.marketTrend
      }
    }));
  }

  private formatEquityCurve(equity: EquityCurve, config: ExportConfig): Record<string, any> {
    const decimals = config.numberFormat?.decimals || 4;
    
    return {
      startValue: this.formatNumber(equity.startValue, decimals),
      endValue: this.formatNumber(equity.endValue, decimals),
      peakValue: this.formatNumber(equity.peakValue, decimals),
      troughValue: this.formatNumber(equity.troughValue, decimals),
      points: equity.points.map(point => ({
        timestamp: point.timestamp.toISOString(),
        portfolioValue: this.formatNumber(point.portfolioValue, decimals),
        cash: this.formatNumber(point.cash, decimals),
        positions: this.formatNumber(point.positions, decimals),
        drawdown: this.formatNumber(point.drawdown, decimals),
        benchmarkValue: point.benchmarkValue ? this.formatNumber(point.benchmarkValue, decimals) : undefined
      }))
    };
  }

  private formatDashboardData(dashboardData: DashboardData): Record<string, any> {
    return {
      summary: dashboardData.summary,
      performanceMetrics: dashboardData.performanceMetrics,
      riskMetrics: dashboardData.riskMetrics,
      charts: {
        equityCurve: {
          title: dashboardData.equityCurve.title,
          dataPoints: dashboardData.equityCurve.series[0]?.data.length || 0
        },
        drawdownAnalysis: {
          title: dashboardData.drawdownAnalysis.title,
          dataPoints: dashboardData.drawdownAnalysis.series[0]?.data.length || 0
        },
        tradeDistribution: {
          title: dashboardData.tradeDistribution.title,
          dataPoints: dashboardData.tradeDistribution.series[0]?.data.length || 0
        }
      }
    };
  }

  private generateSummaryCSV(backtestResult: BacktestResult, options: CSVExportOptions): string {
    const headers = [
      'Metric',
      'Value',
      'Description'
    ];

    const rows: string[][] = [
      ['Strategy', backtestResult.config.strategy.name || 'Unknown', 'Trading strategy name'],
      ['Period Start', backtestResult.startDate.toISOString().split('T')[0] || '', 'Backtest start date'],
      ['Period End', backtestResult.endDate.toISOString().split('T')[0] || '', 'Backtest end date'],
      ['Initial Capital', backtestResult.config.initialCapital.toString() || '0', 'Starting portfolio value'],
      ['Final Value', backtestResult.portfolio.totalValue.toFixed(options.floatPrecision) || '0', 'Ending portfolio value'],
      ['Total Return', (backtestResult.performance.totalReturn * 100).toFixed(2) + '%' || '0%', 'Total return percentage'],
      ['Annualized Return', (backtestResult.performance.annualizedReturn * 100).toFixed(2) + '%' || '0%', 'Annualized return percentage'],
      ['Sharpe Ratio', backtestResult.performance.sharpeRatio.toFixed(options.floatPrecision) || '0', 'Risk-adjusted return measure'],
      ['Max Drawdown', (backtestResult.performance.maxDrawdown * 100).toFixed(2) + '%' || '0%', 'Maximum portfolio decline'],
      ['Win Rate', backtestResult.performance.winRate.toFixed(2) + '%' || '0%', 'Percentage of profitable trades'],
      ['Total Trades', backtestResult.performance.totalTrades.toString() || '0', 'Number of completed trades'],
      ['Profit Factor', backtestResult.performance.profitFactor.toFixed(options.floatPrecision) || '0', 'Gross profit / Gross loss']
    ];

    return this.arrayToCSV([headers, ...rows], options.delimiter);
  }

  private generateStandardCSV(backtestResult: BacktestResult, options: CSVExportOptions): string {
    const headers = [
      'Date',
      'Symbol',
      'Side',
      'Quantity',
      'Price',
      'Commission',
      'P&L'
    ];

    const rows: string[][] = backtestResult.trades.map(trade => [
      trade.timestamp.toISOString().split('T')[0] || '',
      trade.symbol || '',
      trade.side || '',
      trade.quantity.toString() || '0',
      trade.executionPrice.toFixed(options.floatPrecision) || '0',
      trade.commission.toFixed(options.floatPrecision) || '0',
      '0' // P&L calculation would need additional logic
    ]);

    return this.arrayToCSV([headers, ...rows], options.delimiter);
  }

  private generateDetailedCSV(backtestResult: BacktestResult, options: CSVExportOptions): string {
    const headers = [
      'Date',
      'Symbol',
      'Side',
      'Quantity',
      'Execution Price',
      'Commission',
      'Slippage',
      'Market Impact',
      'Execution Delay',
      'Market Open',
      'Volatility',
      'Volume',
      'Bid-Ask Spread',
      'Market Trend'
    ];

    const rows: string[][] = backtestResult.trades.map(trade => [
      trade.timestamp.toISOString() || '',
      trade.symbol || '',
      trade.side || '',
      trade.quantity.toString() || '0',
      trade.executionPrice.toFixed(options.floatPrecision) || '0',
      trade.commission.toFixed(options.floatPrecision) || '0',
      trade.slippage.toFixed(options.floatPrecision) || '0',
      trade.marketImpact.toFixed(options.floatPrecision) || '0',
      trade.executionDelay.toString() || '0',
      trade.marketConditions.isMarketOpen.toString() || 'false',
      trade.marketConditions.volatility.toFixed(options.floatPrecision) || '0',
      trade.marketConditions.volume.toString() || '0',
      trade.marketConditions.bidAskSpread.toFixed(options.floatPrecision) || '0',
      trade.marketConditions.marketTrend || 'SIDEWAYS'
    ]);

    return this.arrayToCSV([headers, ...rows], options.delimiter);
  }

  private generatePDFHTML(
    backtestResult: BacktestResult,
    options: PDFExportOptions,
    dashboardData?: DashboardData
  ): Promise<string> {
    // Simplified PDF HTML generation
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Backtest Report - ${backtestResult.config.strategy.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin-bottom: 20px; }
        .metric { display: inline-block; margin: 10px; padding: 10px; border: 1px solid #ccc; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Backtest Report</h1>
        <h2>${backtestResult.config.strategy.name}</h2>
        <p>${backtestResult.startDate.toLocaleDateString()} - ${backtestResult.endDate.toLocaleDateString()}</p>
    </div>
    
    <div class="section">
        <h3>Performance Summary</h3>
        <div class="metric">
            <strong>Total Return:</strong> ${(backtestResult.performance.totalReturn * 100).toFixed(2)}%
        </div>
        <div class="metric">
            <strong>Sharpe Ratio:</strong> ${backtestResult.performance.sharpeRatio.toFixed(3)}
        </div>
        <div class="metric">
            <strong>Max Drawdown:</strong> ${(backtestResult.performance.maxDrawdown * 100).toFixed(2)}%
        </div>
        <div class="metric">
            <strong>Win Rate:</strong> ${backtestResult.performance.winRate.toFixed(1)}%
        </div>
    </div>
    
    ${options.includeTradeDetails ? this.generateTradeTable(backtestResult.trades) : ''}
    
    <div class="section">
        <h3>Risk Metrics</h3>
        <p>Volatility: ${(backtestResult.performance.volatility * 100).toFixed(2)}%</p>
        <p>Sortino Ratio: ${backtestResult.performance.sortinoRatio.toFixed(3)}</p>
        <p>Calmar Ratio: ${backtestResult.performance.calmarRatio.toFixed(3)}</p>
    </div>
</body>
</html>`;

    return Promise.resolve(html);
  }

  private generateInteractiveHTML(
    backtestResult: BacktestResult,
    options: HTMLExportOptions,
    dashboardData?: DashboardData
  ): Promise<string> {
    // Simplified interactive HTML generation
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Interactive Backtest Dashboard - ${backtestResult.config.strategy.name}</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="container-fluid">
        <div class="row">
            <div class="col-12">
                <h1 class="text-center">Backtest Dashboard</h1>
                <h2 class="text-center text-muted">${backtestResult.config.strategy.name}</h2>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-3">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Total Return</h5>
                        <h3 class="text-success">${(backtestResult.performance.totalReturn * 100).toFixed(2)}%</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Sharpe Ratio</h5>
                        <h3>${backtestResult.performance.sharpeRatio.toFixed(3)}</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Max Drawdown</h5>
                        <h3 class="text-danger">${(backtestResult.performance.maxDrawdown * 100).toFixed(2)}%</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Win Rate</h5>
                        <h3>${backtestResult.performance.winRate.toFixed(1)}%</h3>
                    </div>
                </div>
            </div>
        </div>
        
        ${options.includeInteractiveCharts ? '<div class="row"><div class="col-12"><canvas id="equityChart"></canvas></div></div>' : ''}
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    ${options.includeInteractiveCharts ? this.generateChartScript(backtestResult) : ''}
</body>
</html>`;

    return Promise.resolve(html);
  }

  private generateTradeTable(trades: ExecutedTrade[]): string {
    const rows = trades.slice(0, 50).map(trade => `
        <tr>
            <td>${trade.timestamp.toLocaleDateString()}</td>
            <td>${trade.symbol}</td>
            <td>${trade.side}</td>
            <td>${trade.quantity}</td>
            <td>$${trade.executionPrice.toFixed(2)}</td>
            <td>$${trade.commission.toFixed(2)}</td>
        </tr>
    `).join('');

    return `
        <div class="section">
            <h3>Recent Trades (Last 50)</h3>
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Symbol</th>
                        <th>Side</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Commission</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
  }

  private generateChartScript(backtestResult: BacktestResult): string {
    const equityData = backtestResult.equity.points.map(point => ({
      x: point.timestamp.toISOString().split('T')[0],
      y: point.portfolioValue
    }));

    return `
    <script>
        const ctx = document.getElementById('equityChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Portfolio Value',
                    data: ${JSON.stringify(equityData)},
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            parser: 'YYYY-MM-DD'
                        }
                    }
                }
            }
        });
    </script>
    `;
  }

  private arrayToCSV(data: string[][], delimiter: string): string {
    return data.map(row => 
      row.map(cell => 
        cell.includes(delimiter) || cell.includes('"') || cell.includes('\n') 
          ? `"${cell.replace(/"/g, '""')}"` 
          : cell
      ).join(delimiter)
    ).join('\n');
  }

  private formatNumber(value: number, decimals: number): number {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }
}