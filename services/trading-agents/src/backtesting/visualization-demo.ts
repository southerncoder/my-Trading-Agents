/**
 * Backtesting Visualization and Reporting Demo
 * 
 * This demo shows how to use the visualization and reporting capabilities
 * of the backtesting framework including:
 * - Generating charts and dashboard data
 * - Exporting results in multiple formats
 * - Creating interactive dashboard components
 */

import { createLogger } from '../utils/enhanced-logger';
import { BacktestEngine } from './backtest-engine';
import { VisualizationEngine } from './visualization-engine';
import { ExportEngine } from './export-engine';
import { DashboardComponentFactory } from './dashboard-components';
import {
  BacktestConfig,
  BacktestResult,
  OrderSide
} from './types';

/**
 * Demo class showing visualization and reporting usage
 */
export class VisualizationDemo {
  private readonly logger = createLogger('system', 'visualization-demo');
  private readonly backtestEngine: BacktestEngine;
  private readonly visualizationEngine: VisualizationEngine;
  private readonly exportEngine: ExportEngine;
  private readonly dashboardFactory: DashboardComponentFactory;

  constructor() {
    this.backtestEngine = new BacktestEngine();
    this.visualizationEngine = new VisualizationEngine();
    this.exportEngine = new ExportEngine();
    this.dashboardFactory = new DashboardComponentFactory();
  }

  /**
   * Run complete visualization and reporting demo
   */
  async runDemo(): Promise<void> {
    try {
      this.logger.info('demo-started', 'Starting visualization and reporting demo');

      // Step 1: Generate sample backtest results
      const backtestResult = await this.generateSampleBacktestResult();

      // Step 2: Generate visualization data
      const dashboardData = this.visualizationEngine.generateDashboardData(backtestResult);

      // Step 3: Create individual charts
      await this.demonstrateChartGeneration(backtestResult, dashboardData);

      // Step 4: Export in multiple formats
      await this.demonstrateExportCapabilities(backtestResult, dashboardData);

      // Step 5: Generate interactive dashboard
      await this.demonstrateDashboardGeneration(dashboardData);

      // Step 6: Show framework integration examples
      await this.demonstrateFrameworkIntegration(dashboardData);

      this.logger.info('demo-completed', 'Visualization and reporting demo completed successfully');

    } catch (error) {
      this.logger.error('demo-error', 'Demo execution failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Generate sample backtest result for demonstration
   */
  private async generateSampleBacktestResult(): Promise<BacktestResult> {
    // Create a mock strategy for demo purposes
    const mockStrategy = {
      name: 'Demo Moving Average Strategy',
      validate: () => true,
      analyze: async () => [
        {
          symbol: 'AAPL',
          signal: 'BUY',
          strength: 0.8,
          confidence: 0.75,
          price: 150.00,
          timestamp: new Date(),
          reasoning: 'Moving average crossover signal',
          positionSize: 0.1
        }
      ],
      config: {
        maxPositionSize: 0.2,
        lookbackPeriod: 20,
        stopLossPercent: 5,
        takeProfitPercent: 10
      }
    };

    const config: BacktestConfig = {
      strategy: mockStrategy as any,
      symbols: ['AAPL', 'MSFT', 'GOOGL'],
      startDate: new Date('2023-01-01'),
      endDate: new Date('2023-12-31'),
      initialCapital: 100000,
      commission: 1.0,
      slippage: 0.001,
      marketImpact: true
    };

    // Generate sample result (in real usage, this would come from BacktestEngine.runBacktest)
    const sampleResult: BacktestResult = {
      config,
      trades: this.generateSampleTrades(),
      portfolio: {
        cash: 85000,
        totalValue: 125000,
        positions: new Map([
          ['AAPL', {
            symbol: 'AAPL',
            quantity: 100,
            averagePrice: 150.00,
            marketValue: 15500,
            unrealizedPnL: 500,
            realizedPnL: 1200,
            lastUpdated: new Date()
          }],
          ['MSFT', {
            symbol: 'MSFT',
            quantity: 50,
            averagePrice: 300.00,
            marketValue: 15750,
            unrealizedPnL: 750,
            realizedPnL: 800,
            lastUpdated: new Date()
          }]
        ]),
        trades: [],
        timestamp: new Date()
      },
      performance: {
        totalReturn: 0.25,
        annualizedReturn: 0.28,
        cumulativeReturn: 0.25,
        volatility: 0.18,
        sharpeRatio: 1.45,
        sortinoRatio: 1.82,
        calmarRatio: 1.12,
        maxDrawdown: 0.08,
        maxDrawdownDuration: 45,
        currentDrawdown: 0.02,
        totalTrades: 24,
        winningTrades: 16,
        losingTrades: 8,
        winRate: 0.667,
        profitFactor: 2.1,
        averageWin: 1250,
        averageLoss: -580,
        largestWin: 3200,
        largestLoss: -1100
      },
      equity: this.generateSampleEquityCurve(),
      drawdowns: this.generateSampleDrawdownAnalysis(),
      riskMetrics: {
        valueAtRisk95: -0.035,
        valueAtRisk99: -0.055,
        conditionalVaR95: -0.042,
        conditionalVaR99: -0.068,
        skewness: 0.15,
        kurtosis: 2.8,
        tailRatio: 1.2,
        gainToPainRatio: 1.8
      },
      startDate: config.startDate,
      endDate: config.endDate,
      duration: 365,
      warnings: ['Demo data - not from actual backtest'],
      metadata: {
        demoMode: true,
        generatedAt: new Date().toISOString()
      }
    };

    return sampleResult;
  }

  /**
   * Demonstrate chart generation capabilities
   */
  private async demonstrateChartGeneration(
    backtestResult: BacktestResult,
    dashboardData: any
  ): Promise<void> {
    this.logger.info('demo-charts', 'Demonstrating chart generation');

    // Generate equity curve chart
    const equityCurveChart = this.visualizationEngine.generateEquityCurveChart(
      backtestResult.equity,
      undefined, // No benchmark data for demo
      { title: 'Demo Strategy Equity Curve' }
    );

    // Generate drawdown chart
    const drawdownChart = this.visualizationEngine.generateDrawdownChart(
      backtestResult.drawdowns
    );

    // Generate trade distribution chart
    const tradeDistributionChart = this.visualizationEngine.generateTradeDistributionChart(
      backtestResult.trades
    );

    // Generate performance comparison (with mock strategies)
    const mockStrategies = [
      { name: 'Demo Strategy', metrics: backtestResult.performance },
      { name: 'Buy & Hold', metrics: { ...backtestResult.performance, totalReturn: 0.15, sharpeRatio: 0.8 } },
      { name: 'Market Index', metrics: { ...backtestResult.performance, totalReturn: 0.12, sharpeRatio: 0.9 } }
    ];

    const comparisonChart = this.visualizationEngine.generatePerformanceComparisonChart(
      mockStrategies as any
    );

    // Generate interactive chart configs for different frameworks
    const chartJSConfig = this.visualizationEngine.generateInteractiveChartConfig(
      equityCurveChart,
      'chartjs'
    );

    const plotlyConfig = this.visualizationEngine.generateInteractiveChartConfig(
      equityCurveChart,
      'plotly'
    );

    this.logger.info('charts-generated', 'All chart types generated successfully', {
      equityCurveDataPoints: equityCurveChart.series[0]?.data.length || 0,
      drawdownPeriods: drawdownChart.series[0]?.data.length || 0,
      tradeDistributionBins: tradeDistributionChart.series[0]?.data.length || 0,
      comparisonStrategies: comparisonChart.strategies.length,
      frameworkConfigs: ['chartjs', 'plotly']
    });
  }

  /**
   * Demonstrate export capabilities in multiple formats
   */
  private async demonstrateExportCapabilities(
    backtestResult: BacktestResult,
    dashboardData: any
  ): Promise<void> {
    this.logger.info('demo-exports', 'Demonstrating export capabilities');

    const baseOutputPath = './exports/demo';

    // Export to JSON with full data
    const jsonResult = await this.exportEngine.exportResults(
      backtestResult,
      {
        outputPath: `${baseOutputPath}/backtest-results.json`,
        format: 'json',
        includeCharts: true,
        includeRawData: true,
        template: 'detailed'
      },
      dashboardData
    );

    // Export to CSV summary
    const csvSummaryResult = await this.exportEngine.exportResults(
      backtestResult,
      {
        outputPath: `${baseOutputPath}/backtest-summary.csv`,
        format: 'csv',
        template: 'summary',
        numberFormat: {
          decimals: 4,
          thousandsSeparator: ',',
          decimalSeparator: '.'
        }
      }
    );

    // Export to CSV detailed trades
    const csvDetailedResult = await this.exportEngine.exportResults(
      backtestResult,
      {
        outputPath: `${baseOutputPath}/backtest-trades.csv`,
        format: 'csv',
        template: 'detailed',
        includeRawData: true
      }
    );

    // Export to HTML dashboard
    const htmlResult = await this.exportEngine.exportResults(
      backtestResult,
      {
        outputPath: `${baseOutputPath}/backtest-dashboard.html`,
        format: 'html',
        includeCharts: true,
        template: 'dashboard'
      },
      dashboardData
    );

    // Export to PDF report
    const pdfResult = await this.exportEngine.exportResults(
      backtestResult,
      {
        outputPath: `${baseOutputPath}/backtest-report.pdf`,
        format: 'pdf',
        includeCharts: true,
        includeRawData: false,
        template: 'executive'
      },
      dashboardData
    );

    // Export multiple formats simultaneously
    const multipleResults = await this.exportEngine.exportMultipleFormats(
      backtestResult,
      [
        {
          outputPath: `${baseOutputPath}/multi-export.json`,
          format: 'json',
          includeCharts: false,
          template: 'standard'
        },
        {
          outputPath: `${baseOutputPath}/multi-export.csv`,
          format: 'csv',
          template: 'summary'
        },
        {
          outputPath: `${baseOutputPath}/multi-export.html`,
          format: 'html',
          includeCharts: true,
          template: 'report'
        }
      ],
      dashboardData
    );

    this.logger.info('exports-completed', 'All export formats demonstrated', {
      jsonSuccess: jsonResult.success,
      csvSummarySuccess: csvSummaryResult.success,
      csvDetailedSuccess: csvDetailedResult.success,
      htmlSuccess: htmlResult.success,
      pdfSuccess: pdfResult.success,
      multipleExportsSuccess: multipleResults.every(r => r.success),
      totalFileSize: [jsonResult, csvSummaryResult, csvDetailedResult, htmlResult, pdfResult]
        .reduce((sum, result) => sum + result.fileSize, 0)
    });
  }

  /**
   * Demonstrate dashboard component generation
   */
  private async demonstrateDashboardGeneration(dashboardData: any): Promise<void> {
    this.logger.info('demo-dashboard', 'Demonstrating dashboard generation');

    // Create individual component types
    const summaryCards = this.dashboardFactory.createSummaryCards(dashboardData);
    const chartComponents = this.dashboardFactory.createChartComponents(dashboardData);
    const riskGauges = this.dashboardFactory.createRiskGauges(dashboardData);
    const metricDisplays = this.dashboardFactory.createMetricDisplays(dashboardData);

    // Generate complete dashboard layout
    const dashboardLayout = this.dashboardFactory.generateDashboardLayout(dashboardData);

    // Render individual components
    const renderedComponents = [
      ...summaryCards,
      ...chartComponents,
      ...riskGauges,
      ...metricDisplays
    ].map(component => ({
      id: component.id,
      type: component.type,
      rendered: component.render()
    }));

    this.logger.info('dashboard-generated', 'Dashboard components generated successfully', {
      summaryCards: summaryCards.length,
      chartComponents: chartComponents.length,
      riskGauges: riskGauges.length,
      metricDisplays: metricDisplays.length,
      totalComponents: renderedComponents.length,
      dashboardHtmlSize: dashboardLayout.html.length,
      dashboardCssSize: dashboardLayout.css?.length || 0,
      dashboardJsSize: dashboardLayout.javascript?.length || 0,
      dependencies: dashboardLayout.dependencies?.length || 0
    });
  }

  /**
   * Demonstrate integration with popular web frameworks
   */
  private async demonstrateFrameworkIntegration(dashboardData: any): Promise<void> {
    this.logger.info('demo-integration', 'Demonstrating framework integration');

    // Generate Chart.js configuration
    const chartJSExample = {
      framework: 'Chart.js',
      config: this.visualizationEngine.generateInteractiveChartConfig(
        dashboardData.equityCurve,
        'chartjs'
      ),
      usage: `
        // Chart.js integration example
        const ctx = document.getElementById('myChart').getContext('2d');
        const chart = new Chart(ctx, chartConfig);
      `
    };

    // Generate Plotly configuration
    const plotlyExample = {
      framework: 'Plotly.js',
      config: this.visualizationEngine.generateInteractiveChartConfig(
        dashboardData.equityCurve,
        'plotly'
      ),
      usage: `
        // Plotly.js integration example
        Plotly.newPlot('myDiv', plotlyConfig.data, plotlyConfig.layout);
      `
    };

    // Generate Highcharts configuration
    const highchartsExample = {
      framework: 'Highcharts',
      config: this.visualizationEngine.generateInteractiveChartConfig(
        dashboardData.equityCurve,
        'highcharts'
      ),
      usage: `
        // Highcharts integration example
        Highcharts.chart('container', highchartsConfig);
      `
    };

    // React component example
    const reactExample = {
      framework: 'React',
      component: `
        import React from 'react';
        import { Chart } from 'chart.js';
        
        const BacktestChart = ({ dashboardData }) => {
          const chartRef = useRef(null);
          
          useEffect(() => {
            const config = generateInteractiveChartConfig(dashboardData.equityCurve, 'chartjs');
            new Chart(chartRef.current, config);
          }, [dashboardData]);
          
          return <canvas ref={chartRef} />;
        };
      `,
      usage: 'Use the VisualizationEngine to generate chart configs for React components'
    };

    // Vue component example
    const vueExample = {
      framework: 'Vue.js',
      component: `
        <template>
          <canvas ref="chartCanvas"></canvas>
        </template>
        
        <script>
        import { Chart } from 'chart.js';
        
        export default {
          props: ['dashboardData'],
          mounted() {
            const config = this.generateChartConfig();
            new Chart(this.$refs.chartCanvas, config);
          }
        }
        </script>
      `,
      usage: 'Use the VisualizationEngine to generate chart configs for Vue components'
    };

    this.logger.info('integration-examples-generated', 'Framework integration examples generated', {
      frameworks: ['Chart.js', 'Plotly.js', 'Highcharts', 'React', 'Vue.js'],
      configSizes: {
        chartjs: JSON.stringify(chartJSExample.config).length,
        plotly: JSON.stringify(plotlyExample.config).length,
        highcharts: JSON.stringify(highchartsExample.config).length
      }
    });
  }

  // Helper methods for generating sample data

  private generateSampleTrades(): any[] {
    const trades = [];
    const symbols = ['AAPL', 'MSFT', 'GOOGL'];
    const startDate = new Date('2023-01-01');
    
    for (let i = 0; i < 24; i++) {
      const tradeDate = new Date(startDate.getTime() + i * 15 * 24 * 60 * 60 * 1000); // Every 15 days
      const symbol = symbols[i % symbols.length];
      const side = i % 2 === 0 ? OrderSide.BUY : OrderSide.SELL;
      const basePrice = symbol === 'AAPL' ? 150 : symbol === 'MSFT' ? 300 : 2500;
      
      trades.push({
        orderId: `order-${i + 1}`,
        symbol,
        side,
        quantity: Math.floor(Math.random() * 100) + 10,
        executionPrice: basePrice + (Math.random() - 0.5) * 20,
        commission: 1.0,
        slippage: Math.random() * 0.002,
        marketImpact: Math.random() * 0.001,
        executionDelay: Math.floor(Math.random() * 5),
        timestamp: tradeDate,
        marketConditions: {
          isMarketOpen: true,
          volatility: 0.15 + Math.random() * 0.1,
          volume: Math.floor(Math.random() * 10000000) + 1000000,
          bidAskSpread: basePrice * 0.001,
          marketTrend: ['BULLISH', 'BEARISH', 'SIDEWAYS'][Math.floor(Math.random() * 3)] as any
        }
      });
    }
    
    return trades;
  }

  private generateSampleEquityCurve(): any {
    const points = [];
    const startValue = 100000;
    let currentValue = startValue;
    const startDate = new Date('2023-01-01');
    
    for (let i = 0; i < 365; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dailyReturn = (Math.random() - 0.48) * 0.02; // Slight positive bias
      currentValue *= (1 + dailyReturn);
      
      const peak = Math.max(...points.map(p => p.portfolioValue), currentValue);
      const drawdown = (peak - currentValue) / peak;
      
      points.push({
        timestamp: date,
        portfolioValue: currentValue,
        cash: currentValue * (0.1 + Math.random() * 0.3), // 10-40% cash
        positions: currentValue * (0.6 + Math.random() * 0.3), // 60-90% positions
        drawdown
      });
    }
    
    return {
      points,
      startValue,
      endValue: currentValue,
      peakValue: Math.max(...points.map(p => p.portfolioValue)),
      troughValue: Math.min(...points.map(p => p.portfolioValue))
    };
  }

  private generateSampleDrawdownAnalysis(): any {
    return {
      maxDrawdown: 0.08,
      maxDrawdownDuration: 45,
      currentDrawdown: 0.02,
      drawdownPeriods: [
        {
          startDate: new Date('2023-03-15'),
          endDate: new Date('2023-04-30'),
          peakValue: 115000,
          troughValue: 105800,
          drawdownPercent: 0.08,
          duration: 45,
          recoveryTime: 30,
          recoveryDate: new Date('2023-05-30')
        },
        {
          startDate: new Date('2023-08-10'),
          endDate: new Date('2023-09-05'),
          peakValue: 128000,
          troughValue: 122400,
          drawdownPercent: 0.044,
          duration: 26,
          recoveryTime: 18,
          recoveryDate: new Date('2023-09-23')
        }
      ],
      recoveryTimes: [30, 18],
      averageRecoveryTime: 24,
      worstDrawdownPeriod: {
        startDate: new Date('2023-03-15'),
        endDate: new Date('2023-04-30'),
        peakValue: 115000,
        troughValue: 105800,
        drawdownPercent: 0.08,
        duration: 45
      }
    };
  }
}

// Example usage
export async function runVisualizationDemo(): Promise<void> {
  const demo = new VisualizationDemo();
  await demo.runDemo();
}

// Export for CLI usage
if (require.main === module) {
  runVisualizationDemo().catch(console.error);
}