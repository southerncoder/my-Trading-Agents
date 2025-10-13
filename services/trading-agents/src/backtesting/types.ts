/**
 * Backtesting Framework Types and Interfaces
 * 
 * This module defines all types and interfaces used throughout the backtesting framework,
 * providing a consistent API for strategy testing and performance evaluation.
 */

import { ITradingStrategy, MarketData, TradingSignal } from '../strategies/base-strategy';

/**
 * Backtesting configuration parameters
 */
export interface BacktestConfig {
  strategy: ITradingStrategy;
  symbols: string[];
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  commission: number;
  slippage: number;
  marketImpact: boolean;
  enableMarketHours?: boolean;
  benchmarkSymbol?: string;
}

/**
 * Order types for trade simulation
 */
export enum OrderType {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
  STOP = 'STOP',
  STOP_LIMIT = 'STOP_LIMIT'
}

/**
 * Order side (buy/sell)
 */
export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL'
}

/**
 * Order status
 */
export enum OrderStatus {
  PENDING = 'PENDING',
  FILLED = 'FILLED',
  PARTIALLY_FILLED = 'PARTIALLY_FILLED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED'
}

/**
 * Trading order interface
 */
export interface Order {
  id: string;
  symbol: string;
  type: OrderType;
  side: OrderSide;
  quantity: number;
  price?: number;
  stopPrice?: number;
  timestamp: Date;
  status: OrderStatus;
  metadata?: Record<string, any>;
}

/**
 * Executed trade result
 */
export interface ExecutedTrade {
  orderId: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  executionPrice: number;
  commission: number;
  slippage: number;
  marketImpact: number;
  executionDelay: number;
  timestamp: Date;
  marketConditions: MarketCondition;
}

/**
 * Market condition at time of trade
 */
export interface MarketCondition {
  isMarketOpen: boolean;
  volatility: number;
  volume: number;
  bidAskSpread: number;
  marketTrend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
}

/**
 * Portfolio position
 */
export interface Position {
  symbol: string;
  quantity: number;
  averagePrice: number;
  marketValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
  lastUpdated: Date;
}

/**
 * Portfolio state
 */
export interface Portfolio {
  cash: number;
  totalValue: number;
  positions: Map<string, Position>;
  trades: ExecutedTrade[];
  timestamp: Date;
}

/**
 * Performance metrics for backtesting results
 */
export interface PerformanceMetrics {
  // Return metrics
  totalReturn: number;
  annualizedReturn: number;
  cumulativeReturn: number;
  
  // Risk metrics
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  
  // Drawdown analysis
  maxDrawdown: number;
  maxDrawdownDuration: number;
  currentDrawdown: number;
  
  // Trade statistics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  
  // Benchmark comparison
  alpha?: number;
  beta?: number;
  trackingError?: number;
  informationRatio?: number;
}

/**
 * Equity curve data point
 */
export interface EquityPoint {
  timestamp: Date;
  portfolioValue: number;
  cash: number;
  positions: number;
  drawdown: number;
  benchmarkValue?: number;
}

/**
 * Equity curve for visualization
 */
export interface EquityCurve {
  points: EquityPoint[];
  startValue: number;
  endValue: number;
  peakValue: number;
  troughValue: number;
}

/**
 * Drawdown period analysis
 */
export interface DrawdownPeriod {
  startDate: Date;
  endDate: Date;
  peakValue: number;
  troughValue: number;
  drawdownPercent: number;
  recoveryDate?: Date;
  duration: number;
  recoveryTime?: number;
}

/**
 * Drawdown analysis results
 */
export interface DrawdownAnalysis {
  maxDrawdown: number;
  maxDrawdownDuration: number;
  currentDrawdown: number;
  drawdownPeriods: DrawdownPeriod[];
  recoveryTimes: number[];
  averageRecoveryTime: number;
  worstDrawdownPeriod: DrawdownPeriod;
}

/**
 * Risk analysis metrics
 */
export interface RiskAnalysis {
  valueAtRisk95: number;
  valueAtRisk99: number;
  conditionalVaR95: number;
  conditionalVaR99: number;
  skewness: number;
  kurtosis: number;
  tailRatio: number;
  gainToPainRatio: number;
}

/**
 * Complete backtesting result
 */
export interface BacktestResult {
  config: BacktestConfig;
  trades: ExecutedTrade[];
  portfolio: Portfolio;
  performance: PerformanceMetrics;
  equity: EquityCurve;
  drawdowns: DrawdownAnalysis;
  riskMetrics: RiskAnalysis;
  startDate: Date;
  endDate: Date;
  duration: number;
  warnings: string[];
  metadata: Record<string, any>;
}

/**
 * Walk-forward analysis configuration
 */
export interface WalkForwardConfig {
  strategy: ITradingStrategy;
  data: MarketData[];
  inSamplePeriod: number;
  outOfSamplePeriod: number;
  stepSize: number;
  optimizationMetric: 'sharpe' | 'return' | 'calmar' | 'sortino';
  parameterRanges: Record<string, { min: number; max: number; step: number }>;
}

/**
 * Parameter optimization result
 */
export interface OptimizedParameters {
  parameters: Record<string, any>;
  performance: PerformanceMetrics;
  inSampleResult: BacktestResult;
  outOfSampleResult?: BacktestResult;
  optimizationScore: number;
}

/**
 * Walk-forward analysis result
 */
export interface WalkForwardResult {
  config: WalkForwardConfig;
  periods: WalkForwardPeriod[];
  aggregatedPerformance: PerformanceMetrics;
  overfittingAnalysis: OverfittingAnalysis;
  parameterStability: ParameterStabilityReport;
  bestParameters: OptimizedParameters;
}

/**
 * Individual walk-forward period
 */
export interface WalkForwardPeriod {
  periodIndex: number;
  inSampleStart: Date;
  inSampleEnd: Date;
  outOfSampleStart: Date;
  outOfSampleEnd: Date;
  optimizedParameters: OptimizedParameters;
  inSamplePerformance: PerformanceMetrics;
  outOfSamplePerformance: PerformanceMetrics;
}

/**
 * Overfitting detection analysis
 */
export interface OverfittingAnalysis {
  isOverfitted: boolean;
  overfittingScore: number;
  inSampleVsOutOfSample: {
    returnDegradation: number;
    sharpeRatioDegradation: number;
    winRateDegradation: number;
  };
  consistencyMetrics: {
    returnConsistency: number;
    sharpeConsistency: number;
    drawdownConsistency: number;
  };
  recommendations: string[];
}

/**
 * Parameter stability analysis
 */
export interface ParameterStabilityReport {
  stableParameters: string[];
  unstableParameters: string[];
  parameterVariability: Record<string, {
    mean: number;
    standardDeviation: number;
    coefficientOfVariation: number;
    trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  }>;
  stabilityScore: number;
  recommendations: string[];
}

/**
 * Validation result for backtesting
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * Market hours configuration
 */
export interface MarketHours {
  timezone: string;
  regularHours: {
    open: string; // HH:MM format
    close: string; // HH:MM format
  };
  extendedHours?: {
    preMarketOpen: string;
    preMarketClose: string;
    afterHoursOpen: string;
    afterHoursClose: string;
  };
  holidays: Date[];
}

/**
 * Date range for backtesting
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Rolling performance window
 */
export interface RollingWindow<T> {
  period: number;
  values: T[];
  current: T;
  average: T;
  standardDeviation?: T;
}