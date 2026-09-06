/**
 * Interactive Performance Dashboard Components
 * 
 * This module provides reusable dashboard components for backtesting visualization including:
 * - Performance summary cards
 * - Interactive chart components
 * - Trade analysis tables
 * - Risk metrics displays
 * - Comparison widgets
 */

import { createLogger } from '../utils/enhanced-logger';
import {
  BacktestResult,
  PerformanceMetrics,
  ExecutedTrade,
  DrawdownAnalysis
} from './types';
import {
  DashboardData,
  DashboardSummary,
  ChartConfig,
  ChartSeries
} from './visualization-engine';

/**
 * Dashboard component interfaces
 */
export interface DashboardComponent {
  id: string;
  type: ComponentType;
  title: string;
  data: any;
  config: ComponentConfig;
  render(): ComponentRenderResult;
}

export type ComponentType = 
  | 'summary-card' 
  | 'chart' 
  | 'table' 
  | 'metric-display' 
  | 'comparison-widget'
  | 'risk-gauge'
  | 'trade-calendar'
  | 'performance-attribution';

export interface ComponentConfig {
  width?: number;
  height?: number;
  responsive?: boolean;
  theme?: 'light' | 'dark';
  interactive?: boolean;
  refreshInterval?: number;
  customStyles?: Record<string, string>;
  showTooltips?: boolean;
  exportable?: boolean;
}

export interface ComponentRenderResult {
  html: string;
  css?: string;
  javascript?: string;
  dependencies?: string[];
}

export interface SummaryCardData {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  subtitle?: string;
  icon?: string;
  color?: string;
}

export interface MetricDisplayData {
  metrics: Array<{
    name: string;
    value: number;
    format: 'percentage' | 'currency' | 'ratio' | 'number';
    benchmark?: number;
    target?: number;
    status?: 'good' | 'warning' | 'danger';
  }>;
}

export interface TradeTableData {
  trades: ExecutedTrade[];
  columns: string[];
  sortable?: boolean;
  filterable?: boolean;
  pagination?: {
    pageSize: number;
    currentPage: number;
    totalPages: number;
  };
}

export interface RiskGaugeData {
  currentValue: number;
  minValue: number;
  maxValue: number;
  thresholds: Array<{
    value: number;
    color: string;
    label: string;
  }>;
  title: string;
  unit: string;
}

/**
 * Interactive dashboard component factory
 */
export class DashboardComponentFactory {
  private readonly logger = createLogger('system', 'dashboard-components');

  /**
   * Create summary cards for key performance metrics
   */
  createSummaryCards(dashboardData: DashboardData): DashboardComponent[] {
    try {
      const summary = dashboardData.summary;
      const performance = dashboardData.performanceMetrics;

      const cards: DashboardComponent[] = [
        {
          id: 'total-return-card',
          type: 'summary-card',
          title: 'Total Return',
          data: {
            title: 'Total Return',
            value: summary.totalReturn,
            changeType: performance.totalReturn > 0 ? 'positive' : 'negative',
            subtitle: `Annualized: ${summary.annualizedReturn}`,
            icon: 'trending-up',
            color: performance.totalReturn > 0 ? '#4CAF50' : '#F44336'
          } as SummaryCardData,
          config: { responsive: true, theme: 'light' },
          render: () => this.renderSummaryCard('total-return-card', {
            title: 'Total Return',
            value: summary.totalReturn,
            changeType: performance.totalReturn > 0 ? 'positive' : 'negative',
            subtitle: `Annualized: ${summary.annualizedReturn}`,
            icon: 'trending-up',
            color: performance.totalReturn > 0 ? '#4CAF50' : '#F44336'
          })
        },
        {
          id: 'sharpe-ratio-card',
          type: 'summary-card',
          title: 'Sharpe Ratio',
          data: {
            title: 'Sharpe Ratio',
            value: summary.sharpeRatio,
            changeType: performance.sharpeRatio > 1 ? 'positive' : performance.sharpeRatio > 0.5 ? 'neutral' : 'negative',
            subtitle: 'Risk-adjusted return',
            icon: 'analytics',
            color: performance.sharpeRatio > 1 ? '#4CAF50' : performance.sharpeRatio > 0.5 ? '#FF9800' : '#F44336'
          } as SummaryCardData,
          config: { responsive: true, theme: 'light' },
          render: () => this.renderSummaryCard('sharpe-ratio-card', {
            title: 'Sharpe Ratio',
            value: summary.sharpeRatio,
            changeType: performance.sharpeRatio > 1 ? 'positive' : performance.sharpeRatio > 0.5 ? 'neutral' : 'negative',
            subtitle: 'Risk-adjusted return',
            icon: 'analytics',
            color: performance.sharpeRatio > 1 ? '#4CAF50' : performance.sharpeRatio > 0.5 ? '#FF9800' : '#F44336'
          })
        },
        {
          id: 'max-drawdown-card',
          type: 'summary-card',
          title: 'Max Drawdown',
          data: {
            title: 'Max Drawdown',
            value: summary.maxDrawdown,
            changeType: 'negative',
            subtitle: 'Maximum portfolio decline',
            icon: 'trending-down',
            color: '#F44336'
          } as SummaryCardData,
          config: { responsive: true, theme: 'light' },
          render: () => this.renderSummaryCard('max-drawdown-card', {
            title: 'Max Drawdown',
            value: summary.maxDrawdown,
            changeType: 'negative',
            subtitle: 'Maximum portfolio decline',
            icon: 'trending-down',
            color: '#F44336'
          })
        },
        {
          id: 'win-rate-card',
          type: 'summary-card',
          title: 'Win Rate',
          data: {
            title: 'Win Rate',
            value: summary.winRate,
            changeType: performance.winRate > 0.6 ? 'positive' : performance.winRate > 0.4 ? 'neutral' : 'negative',
            subtitle: `${summary.totalTrades} total trades`,
            icon: 'target',
            color: performance.winRate > 0.6 ? '#4CAF50' : performance.winRate > 0.4 ? '#FF9800' : '#F44336'
          } as SummaryCardData,
          config: { responsive: true, theme: 'light' },
          render: () => this.renderSummaryCard('win-rate-card', {
            title: 'Win Rate',
            value: summary.winRate,
            changeType: performance.winRate > 0.6 ? 'positive' : performance.winRate > 0.4 ? 'neutral' : 'negative',
            subtitle: `${summary.totalTrades} total trades`,
            icon: 'target',
            color: performance.winRate > 0.6 ? '#4CAF50' : performance.winRate > 0.4 ? '#FF9800' : '#F44336'
          })
        }
      ];

      this.logger.info('summary-cards-created', 'Summary cards created successfully', {
        cardsCount: cards.length
      });

      return cards;

    } catch (error) {
      this.logger.error('summary-cards-error', 'Failed to create summary cards', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Create interactive chart components
   */
  createChartComponents(dashboardData: DashboardData): DashboardComponent[] {
    try {
      const components: DashboardComponent[] = [
        {
          id: 'equity-curve-chart',
          type: 'chart',
          title: 'Equity Curve',
          data: dashboardData.equityCurve,
          config: { 
            width: 800, 
            height: 400, 
            responsive: true, 
            interactive: true,
            exportable: true
          },
          render: () => this.renderChart('equity-curve-chart', dashboardData.equityCurve)
        },
        {
          id: 'drawdown-chart',
          type: 'chart',
          title: 'Drawdown Analysis',
          data: dashboardData.drawdownAnalysis,
          config: { 
            width: 800, 
            height: 300, 
            responsive: true, 
            interactive: true,
            exportable: true
          },
          render: () => this.renderChart('drawdown-chart', dashboardData.drawdownAnalysis)
        },
        {
          id: 'trade-distribution-chart',
          type: 'chart',
          title: 'Trade Distribution',
          data: dashboardData.tradeDistribution,
          config: { 
            width: 600, 
            height: 400, 
            responsive: true, 
            interactive: true,
            exportable: true
          },
          render: () => this.renderChart('trade-distribution-chart', dashboardData.tradeDistribution)
        }
      ];

      this.logger.info('chart-components-created', 'Chart components created successfully', {
        componentsCount: components.length
      });

      return components;

    } catch (error) {
      this.logger.error('chart-components-error', 'Failed to create chart components', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Create risk gauge components
   */
  createRiskGauges(dashboardData: DashboardData): DashboardComponent[] {
    try {
      const performance = dashboardData.performanceMetrics;
      const riskMetrics = dashboardData.riskMetrics;

      const gauges: DashboardComponent[] = [
        {
          id: 'volatility-gauge',
          type: 'risk-gauge',
          title: 'Volatility',
          data: {
            currentValue: performance.volatility * 100,
            minValue: 0,
            maxValue: 50,
            thresholds: [
              { value: 10, color: '#4CAF50', label: 'Low' },
              { value: 20, color: '#FF9800', label: 'Medium' },
              { value: 35, color: '#F44336', label: 'High' },
              { value: 50, color: '#9C27B0', label: 'Extreme' }
            ],
            title: 'Volatility',
            unit: '%'
          } as RiskGaugeData,
          config: { width: 300, height: 200, responsive: true },
          render: () => this.renderRiskGauge('volatility-gauge', {
            currentValue: performance.volatility * 100,
            minValue: 0,
            maxValue: 50,
            thresholds: [
              { value: 10, color: '#4CAF50', label: 'Low' },
              { value: 20, color: '#FF9800', label: 'Medium' },
              { value: 35, color: '#F44336', label: 'High' },
              { value: 50, color: '#9C27B0', label: 'Extreme' }
            ],
            title: 'Volatility',
            unit: '%'
          })
        },
        {
          id: 'var-gauge',
          type: 'risk-gauge',
          title: 'Value at Risk (95%)',
          data: {
            currentValue: Math.abs((riskMetrics.valueAtRisk95 || 0) * 100),
            minValue: 0,
            maxValue: 20,
            thresholds: [
              { value: 2, color: '#4CAF50', label: 'Low Risk' },
              { value: 5, color: '#FF9800', label: 'Medium Risk' },
              { value: 10, color: '#F44336', label: 'High Risk' },
              { value: 20, color: '#9C27B0', label: 'Extreme Risk' }
            ],
            title: 'VaR (95%)',
            unit: '%'
          } as RiskGaugeData,
          config: { width: 300, height: 200, responsive: true },
          render: () => this.renderRiskGauge('var-gauge', {
            currentValue: Math.abs((riskMetrics.valueAtRisk95 || 0) * 100),
            minValue: 0,
            maxValue: 20,
            thresholds: [
              { value: 2, color: '#4CAF50', label: 'Low Risk' },
              { value: 5, color: '#FF9800', label: 'Medium Risk' },
              { value: 10, color: '#F44336', label: 'High Risk' },
              { value: 20, color: '#9C27B0', label: 'Extreme Risk' }
            ],
            title: 'VaR (95%)',
            unit: '%'
          })
        }
      ];

      this.logger.info('risk-gauges-created', 'Risk gauge components created successfully', {
        gaugesCount: gauges.length
      });

      return gauges;

    } catch (error) {
      this.logger.error('risk-gauges-error', 'Failed to create risk gauge components', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Create metric display components
   */
  createMetricDisplays(dashboardData: DashboardData): DashboardComponent[] {
    try {
      const performance = dashboardData.performanceMetrics;
      const riskMetrics = dashboardData.riskMetrics;

      const displays: DashboardComponent[] = [
        {
          id: 'performance-metrics',
          type: 'metric-display',
          title: 'Performance Metrics',
          data: {
            metrics: [
              {
                name: 'Total Return',
                value: performance.totalReturn,
                format: 'percentage' as const,
                status: performance.totalReturn > 0 ? 'good' as const : 'danger' as const
              },
              {
                name: 'Annualized Return',
                value: performance.annualizedReturn,
                format: 'percentage' as const,
                benchmark: 0.08, // 8% benchmark
                status: performance.annualizedReturn > 0.08 ? 'good' as const : 'warning' as const
              },
              {
                name: 'Sharpe Ratio',
                value: performance.sharpeRatio,
                format: 'ratio' as const,
                target: 1.0,
                status: performance.sharpeRatio > 1 ? 'good' as const : performance.sharpeRatio > 0.5 ? 'warning' as const : 'danger' as const
              },
              {
                name: 'Sortino Ratio',
                value: performance.sortinoRatio,
                format: 'ratio' as const,
                target: 1.5,
                status: performance.sortinoRatio > 1.5 ? 'good' as const : performance.sortinoRatio > 1 ? 'warning' as const : 'danger' as const
              }
            ]
          } as MetricDisplayData,
          config: { responsive: true, showTooltips: true },
          render: () => this.renderMetricDisplay('performance-metrics', {
            metrics: [
              {
                name: 'Total Return',
                value: performance.totalReturn,
                format: 'percentage' as const,
                status: performance.totalReturn > 0 ? 'good' as const : 'danger' as const
              },
              {
                name: 'Annualized Return',
                value: performance.annualizedReturn,
                format: 'percentage' as const,
                benchmark: 0.08,
                status: performance.annualizedReturn > 0.08 ? 'good' as const : 'warning' as const
              },
              {
                name: 'Sharpe Ratio',
                value: performance.sharpeRatio,
                format: 'ratio' as const,
                target: 1.0,
                status: performance.sharpeRatio > 1 ? 'good' as const : performance.sharpeRatio > 0.5 ? 'warning' as const : 'danger' as const
              },
              {
                name: 'Sortino Ratio',
                value: performance.sortinoRatio,
                format: 'ratio' as const,
                target: 1.5,
                status: performance.sortinoRatio > 1.5 ? 'good' as const : performance.sortinoRatio > 1 ? 'warning' as const : 'danger' as const
              }
            ]
          })
        },
        {
          id: 'risk-metrics',
          type: 'metric-display',
          title: 'Risk Metrics',
          data: {
            metrics: [
              {
                name: 'Max Drawdown',
                value: performance.maxDrawdown,
                format: 'percentage' as const,
                status: performance.maxDrawdown < 0.1 ? 'good' as const : performance.maxDrawdown < 0.2 ? 'warning' as const : 'danger' as const
              },
              {
                name: 'Volatility',
                value: performance.volatility,
                format: 'percentage' as const,
                status: performance.volatility < 0.15 ? 'good' as const : performance.volatility < 0.25 ? 'warning' as const : 'danger' as const
              },
              {
                name: 'VaR (95%)',
                value: Math.abs(riskMetrics.valueAtRisk95 || 0),
                format: 'percentage' as const,
                status: Math.abs(riskMetrics.valueAtRisk95 || 0) < 0.05 ? 'good' as const : Math.abs(riskMetrics.valueAtRisk95 || 0) < 0.1 ? 'warning' as const : 'danger' as const
              },
              {
                name: 'Calmar Ratio',
                value: performance.calmarRatio,
                format: 'ratio' as const,
                target: 0.5,
                status: performance.calmarRatio > 0.5 ? 'good' as const : performance.calmarRatio > 0.25 ? 'warning' as const : 'danger' as const
              }
            ]
          } as MetricDisplayData,
          config: { responsive: true, showTooltips: true },
          render: () => this.renderMetricDisplay('risk-metrics', {
            metrics: [
              {
                name: 'Max Drawdown',
                value: performance.maxDrawdown,
                format: 'percentage' as const,
                status: performance.maxDrawdown < 0.1 ? 'good' as const : performance.maxDrawdown < 0.2 ? 'warning' as const : 'danger' as const
              },
              {
                name: 'Volatility',
                value: performance.volatility,
                format: 'percentage' as const,
                status: performance.volatility < 0.15 ? 'good' as const : performance.volatility < 0.25 ? 'warning' as const : 'danger' as const
              },
              {
                name: 'VaR (95%)',
                value: Math.abs(riskMetrics.valueAtRisk95 || 0),
                format: 'percentage' as const,
                status: Math.abs(riskMetrics.valueAtRisk95 || 0) < 0.05 ? 'good' as const : Math.abs(riskMetrics.valueAtRisk95 || 0) < 0.1 ? 'warning' as const : 'danger' as const
              },
              {
                name: 'Calmar Ratio',
                value: performance.calmarRatio,
                format: 'ratio' as const,
                target: 0.5,
                status: performance.calmarRatio > 0.5 ? 'good' as const : performance.calmarRatio > 0.25 ? 'warning' as const : 'danger' as const
              }
            ]
          })
        }
      ];

      this.logger.info('metric-displays-created', 'Metric display components created successfully', {
        displaysCount: displays.length
      });

      return displays;

    } catch (error) {
      this.logger.error('metric-displays-error', 'Failed to create metric display components', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Generate complete dashboard layout
   */
  generateDashboardLayout(dashboardData: DashboardData): ComponentRenderResult {
    try {
      const summaryCards = this.createSummaryCards(dashboardData);
      const chartComponents = this.createChartComponents(dashboardData);
      const riskGauges = this.createRiskGauges(dashboardData);
      const metricDisplays = this.createMetricDisplays(dashboardData);

      const allComponents = [
        ...summaryCards,
        ...chartComponents,
        ...riskGauges,
        ...metricDisplays
      ];

      const html = `
        <div class="dashboard-container">
          <div class="dashboard-header">
            <h1>Backtesting Dashboard</h1>
            <div class="dashboard-controls">
              <button class="btn btn-primary" onclick="exportDashboard()">Export</button>
              <button class="btn btn-secondary" onclick="refreshDashboard()">Refresh</button>
            </div>
          </div>
          
          <div class="dashboard-grid">
            <div class="summary-section">
              <h2>Performance Summary</h2>
              <div class="summary-cards">
                ${summaryCards.map(card => card.render().html).join('')}
              </div>
            </div>
            
            <div class="charts-section">
              <h2>Performance Charts</h2>
              <div class="charts-grid">
                ${chartComponents.map(chart => chart.render().html).join('')}
              </div>
            </div>
            
            <div class="risk-section">
              <h2>Risk Analysis</h2>
              <div class="risk-gauges">
                ${riskGauges.map(gauge => gauge.render().html).join('')}
              </div>
              <div class="risk-metrics">
                ${metricDisplays.map(display => display.render().html).join('')}
              </div>
            </div>
          </div>
        </div>
      `;

      const css = this.generateDashboardCSS();
      const javascript = this.generateDashboardJS(allComponents);

      this.logger.info('dashboard-layout-generated', 'Dashboard layout generated successfully', {
        componentsCount: allComponents.length,
        sectionsCount: 3
      });

      return {
        html,
        css,
        javascript,
        dependencies: [
          'https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css',
          'https://cdn.jsdelivr.net/npm/chart.js',
          'https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js'
        ]
      };

    } catch (error) {
      this.logger.error('dashboard-layout-error', 'Failed to generate dashboard layout', {
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        html: '<div class="error">Failed to generate dashboard</div>',
        css: '.error { color: red; padding: 20px; }',
        javascript: ''
      };
    }
  }

  // Private rendering methods

  private renderSummaryCard(id: string, data: SummaryCardData): ComponentRenderResult {
    const html = `
      <div class="summary-card" id="${id}">
        <div class="card-header">
          <h3>${data.title}</h3>
          ${data.icon ? `<i class="icon-${data.icon}"></i>` : ''}
        </div>
        <div class="card-body">
          <div class="card-value" style="color: ${data.color}">${data.value}</div>
          ${data.subtitle ? `<div class="card-subtitle">${data.subtitle}</div>` : ''}
          ${data.change ? `<div class="card-change ${data.changeType}">${data.change}</div>` : ''}
        </div>
      </div>
    `;

    return { html };
  }

  private renderChart(id: string, chartData: ChartConfig): ComponentRenderResult {
    const html = `
      <div class="chart-container" id="${id}">
        <div class="chart-header">
          <h3>${chartData.title}</h3>
          ${chartData.subtitle ? `<p class="chart-subtitle">${chartData.subtitle}</p>` : ''}
        </div>
        <div class="chart-body">
          <canvas id="${id}-canvas"></canvas>
        </div>
      </div>
    `;

    const javascript = `
      // Chart initialization for ${id}
      const ${id.replace(/-/g, '_')}_ctx = document.getElementById('${id}-canvas').getContext('2d');
      const ${id.replace(/-/g, '_')}_chart = new Chart(${id.replace(/-/g, '_')}_ctx, ${JSON.stringify(this.convertToChartJS(chartData))});
    `;

    return { html, javascript };
  }

  private renderRiskGauge(id: string, data: RiskGaugeData): ComponentRenderResult {
    const html = `
      <div class="risk-gauge" id="${id}">
        <div class="gauge-header">
          <h4>${data.title}</h4>
        </div>
        <div class="gauge-body">
          <div class="gauge-chart" id="${id}-gauge"></div>
          <div class="gauge-value">${data.currentValue.toFixed(1)}${data.unit}</div>
        </div>
      </div>
    `;

    return { html };
  }

  private renderMetricDisplay(id: string, data: MetricDisplayData): ComponentRenderResult {
    const html = `
      <div class="metric-display" id="${id}">
        <div class="metrics-grid">
          ${data.metrics.map(metric => `
            <div class="metric-item ${metric.status}">
              <div class="metric-name">${metric.name}</div>
              <div class="metric-value">${this.formatMetricValue(metric.value, metric.format)}</div>
              ${metric.benchmark ? `<div class="metric-benchmark">Benchmark: ${this.formatMetricValue(metric.benchmark, metric.format)}</div>` : ''}
              ${metric.target ? `<div class="metric-target">Target: ${this.formatMetricValue(metric.target, metric.format)}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    return { html };
  }

  private convertToChartJS(chartData: ChartConfig): any {
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
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: chartData.title
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

  private formatMetricValue(value: number, format: 'percentage' | 'currency' | 'ratio' | 'number'): string {
    switch (format) {
      case 'percentage':
        return `${(value * 100).toFixed(2)}%`;
      case 'currency':
        return `$${value.toLocaleString()}`;
      case 'ratio':
        return value.toFixed(3);
      case 'number':
        return value.toLocaleString();
      default:
        return value.toString();
    }
  }

  private generateDashboardCSS(): string {
    return `
      .dashboard-container {
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .dashboard-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 1px solid #e0e0e0;
      }
      
      .dashboard-grid {
        display: grid;
        gap: 30px;
      }
      
      .summary-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin-bottom: 30px;
      }
      
      .summary-card {
        background: white;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        border-left: 4px solid #2196F3;
      }
      
      .card-value {
        font-size: 2em;
        font-weight: bold;
        margin: 10px 0;
      }
      
      .card-subtitle {
        color: #666;
        font-size: 0.9em;
      }
      
      .charts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 20px;
      }
      
      .chart-container {
        background: white;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      .risk-gauges {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        margin-bottom: 20px;
      }
      
      .risk-gauge {
        background: white;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        text-align: center;
      }
      
      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
      }
      
      .metric-item {
        background: white;
        border-radius: 8px;
        padding: 15px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      .metric-item.good {
        border-left: 4px solid #4CAF50;
      }
      
      .metric-item.warning {
        border-left: 4px solid #FF9800;
      }
      
      .metric-item.danger {
        border-left: 4px solid #F44336;
      }
      
      .metric-name {
        font-weight: 500;
        color: #333;
        margin-bottom: 5px;
      }
      
      .metric-value {
        font-size: 1.5em;
        font-weight: bold;
        color: #2196F3;
      }
      
      .metric-benchmark, .metric-target {
        font-size: 0.8em;
        color: #666;
        margin-top: 5px;
      }
      
      @media (max-width: 768px) {
        .summary-cards {
          grid-template-columns: 1fr;
        }
        
        .charts-grid {
          grid-template-columns: 1fr;
        }
        
        .risk-gauges {
          grid-template-columns: 1fr;
        }
      }
    `;
  }

  private generateDashboardJS(components: DashboardComponent[]): string {
    return `
      // Dashboard JavaScript functionality
      function exportDashboard() {
        // Export functionality
        console.log('Exporting dashboard...');
      }
      
      function refreshDashboard() {
        // Refresh functionality
        console.log('Refreshing dashboard...');
        location.reload();
      }
      
      // Initialize all charts
      document.addEventListener('DOMContentLoaded', function() {
        ${components
          .filter(c => c.type === 'chart')
          .map(c => c.render().javascript || '')
          .join('\n')}
      });
    `;
  }
}