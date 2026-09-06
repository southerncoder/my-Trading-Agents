/**
 * Simple test for backtesting visualization and reporting functionality
 */

import { VisualizationEngine } from './visualization-engine';
import { ExportEngine } from './export-engine';
import { DashboardComponentFactory } from './dashboard-components';
import { BacktestResult, PerformanceMetrics, ExecutedTrade, OrderSide } from './types';

/**
 * Test the visualization and reporting components
 */
async function testVisualizationComponents(): Promise<void> {
  console.log('Testing backtesting visualization and reporting components...');

  // Create sample data
  const sampleResult: BacktestResult = {
    config: {
      strategy: { name: 'Test Strategy' } as any,
      symbols: ['AAPL'],
      startDate: new Date('2023-01-01'),
      endDate: new Date('2023-12-31'),
      initialCapital: 100000,
      commission: 1.0,
      slippage: 0.001,
      marketImpact: true
    },
    trades: [
      {
        orderId: 'test-1',
        symbol: 'AAPL',
        side: OrderSide.BUY,
        quantity: 100,
        executionPrice: 150.00,
        commission: 1.0,
        slippage: 0.001,
        marketImpact: 0.0005,
        executionDelay: 0,
        timestamp: new Date('2023-06-01'),
        marketConditions: {
          isMarketOpen: true,
          volatility: 0.2,
          volume: 1000000,
          bidAskSpread: 0.01,
          marketTrend: 'BULLISH'
        }
      }
    ] as ExecutedTrade[],
    portfolio: {
      cash: 85000,
      totalValue: 125000,
      positions: new Map(),
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
      totalTrades: 1,
      winningTrades: 1,
      losingTrades: 0,
      winRate: 1.0,
      profitFactor: 2.1,
      averageWin: 1250,
      averageLoss: 0,
      largestWin: 1250,
      largestLoss: 0
    } as PerformanceMetrics,
    equity: {
      points: [
        {
          timestamp: new Date('2023-01-01'),
          portfolioValue: 100000,
          cash: 100000,
          positions: 0,
          drawdown: 0
        },
        {
          timestamp: new Date('2023-12-31'),
          portfolioValue: 125000,
          cash: 85000,
          positions: 40000,
          drawdown: 0
        }
      ],
      startValue: 100000,
      endValue: 125000,
      peakValue: 125000,
      troughValue: 100000
    },
    drawdowns: {
      maxDrawdown: 0.08,
      maxDrawdownDuration: 45,
      currentDrawdown: 0.02,
      drawdownPeriods: [],
      recoveryTimes: [],
      averageRecoveryTime: 0,
      worstDrawdownPeriod: {
        startDate: new Date('2023-03-01'),
        endDate: new Date('2023-04-15'),
        peakValue: 110000,
        troughValue: 101200,
        drawdownPercent: 0.08,
        duration: 45
      }
    },
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
    startDate: new Date('2023-01-01'),
    endDate: new Date('2023-12-31'),
    duration: 365,
    warnings: [],
    metadata: {}
  };

  try {
    // Test VisualizationEngine
    console.log('Testing VisualizationEngine...');
    const visualizationEngine = new VisualizationEngine();
    
    const equityCurveChart = visualizationEngine.generateEquityCurveChart(sampleResult.equity);
    console.log('✓ Equity curve chart generated');
    
    const drawdownChart = visualizationEngine.generateDrawdownChart(sampleResult.drawdowns);
    console.log('✓ Drawdown chart generated');
    
    const tradeDistributionChart = visualizationEngine.generateTradeDistributionChart(sampleResult.trades);
    console.log('✓ Trade distribution chart generated');
    
    const dashboardData = visualizationEngine.generateDashboardData(sampleResult);
    console.log('✓ Dashboard data generated');

    // Test ExportEngine
    console.log('\nTesting ExportEngine...');
    const exportEngine = new ExportEngine();
    
    // Test JSON export
    const jsonResult = await exportEngine.exportToJSON(sampleResult, {
      outputPath: './test-export.json',
      format: 'json',
      includeCharts: true,
      includeRawData: true
    }, dashboardData);
    console.log('✓ JSON export completed:', jsonResult.success);

    // Test CSV export
    const csvResult = await exportEngine.exportToCSV(sampleResult, {
      outputPath: './test-export.csv',
      format: 'csv',
      template: 'summary'
    });
    console.log('✓ CSV export completed:', csvResult.success);

    // Test DashboardComponentFactory
    console.log('\nTesting DashboardComponentFactory...');
    const dashboardFactory = new DashboardComponentFactory();
    
    const summaryCards = dashboardFactory.createSummaryCards(dashboardData);
    console.log('✓ Summary cards created:', summaryCards.length);
    
    const chartComponents = dashboardFactory.createChartComponents(dashboardData);
    console.log('✓ Chart components created:', chartComponents.length);
    
    const riskGauges = dashboardFactory.createRiskGauges(dashboardData);
    console.log('✓ Risk gauges created:', riskGauges.length);
    
    const metricDisplays = dashboardFactory.createMetricDisplays(dashboardData);
    console.log('✓ Metric displays created:', metricDisplays.length);
    
    const dashboardLayout = dashboardFactory.generateDashboardLayout(dashboardData);
    console.log('✓ Dashboard layout generated');

    console.log('\n✅ All visualization and reporting components tested successfully!');
    
    // Display summary
    console.log('\n📊 Component Summary:');
    console.log(`- Equity curve data points: ${equityCurveChart.series[0]?.data.length || 0}`);
    console.log(`- Drawdown periods: ${drawdownChart.series[0]?.data.length || 0}`);
    console.log(`- Trade distribution bins: ${tradeDistributionChart.series[0]?.data.length || 0}`);
    console.log(`- Dashboard components: ${summaryCards.length + chartComponents.length + riskGauges.length + metricDisplays.length}`);
    console.log(`- Dashboard HTML size: ${dashboardLayout.html.length} characters`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testVisualizationComponents().catch(console.error);
}

export { testVisualizationComponents };