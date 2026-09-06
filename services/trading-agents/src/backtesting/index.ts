/**
 * Backtesting Framework Module
 * 
 * This module provides comprehensive backtesting capabilities for trading strategies,
 * including realistic trade simulation, performance metrics calculation, 
 * walk-forward analysis for overfitting detection, visualization, and reporting.
 * 
 * Key Components:
 * - BacktestEngine: Core backtesting orchestration
 * - TradeSimulator: Realistic trade execution simulation
 * - PerformanceMetricsCalculator: Risk-adjusted performance calculation
 * - WalkForwardAnalyzer: Overfitting detection and parameter optimization
 * - VisualizationEngine: Chart generation and dashboard data
 * - ExportEngine: Multi-format export capabilities (JSON, CSV, PDF, HTML)
 * - DashboardComponentFactory: Interactive dashboard components
 */

export * from './types';
export * from './trade-simulator';
export * from './performance-metrics';
export * from './walk-forward-analyzer';
export * from './backtest-engine';
export * from './data-provider-integration';
export * from './backtesting-factory';
export * from './visualization-engine';
export * from './export-engine';
export * from './dashboard-components';