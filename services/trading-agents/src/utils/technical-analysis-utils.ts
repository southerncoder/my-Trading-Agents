/**
 * Technical Analysis Utilities
 *
 * Provides technical analysis calculations and indicators for price data
 * Includes RSI, SMA, standard deviation, and other technical metrics.
 */

import { createLogger } from '../utils/enhanced-logger';

const logger = createLogger('system', 'TechnicalAnalysisUtils');

/**
 * Calculate Relative Strength Index (RSI)
 */
export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) {
    return 50; // Neutral RSI if insufficient data
  }

  const gains: number[] = [];
  const losses: number[] = [];

  // Calculate price changes
  for (let i = 1; i < prices.length; i++) {
    const currentPrice = prices[i];
    const previousPrice = prices[i - 1];
    if (currentPrice !== undefined && previousPrice !== undefined) {
      const change = currentPrice - previousPrice;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
  }

  // Calculate average gains and losses
  let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

  // Use Wilder's smoothing for subsequent values
  for (let i = period; i < gains.length; i++) {
    const currentGain = gains[i];
    const currentLoss = losses[i];
    if (currentGain !== undefined && currentLoss !== undefined) {
      avgGain = (avgGain * (period - 1) + currentGain) / period;
      avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
    }
  }

  if (avgLoss === 0) {
    return 100; // All gains, maximum RSI
  }

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * Calculate Simple Moving Average (SMA)
 */
export function calculateSMA(prices: number[], period: number): number | null {
  if (prices.length < period) {
    return null;
  }

  const recentPrices = prices.slice(-period);
  return recentPrices.reduce((sum, price) => sum + price, 0) / period;
}

/**
 * Calculate Standard Deviation
 */
export function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
  const variance = squaredDifferences.reduce((sum, sq) => sum + sq, 0) / values.length;

  return Math.sqrt(variance);
}

/**
 * Extract trend strength from risk assessment factors
 */
export function extractTrendStrength(factors: string[]): number {
  let trendScore = 0.5;

  for (const factor of factors) {
    const lowerFactor = factor.toLowerCase();
    if (lowerFactor.includes('bullish trend') || lowerFactor.includes('strong uptrend')) {
      trendScore += 0.2;
    } else if (lowerFactor.includes('bearish trend') || lowerFactor.includes('strong downtrend')) {
      trendScore -= 0.2;
    }
  }

  return Math.max(0, Math.min(1, trendScore));
}

/**
 * Extract valuation score from risk assessment factors
 */
export function extractValuationScore(factors: string[]): number {
  let valuationScore = 0.5;

  for (const factor of factors) {
    const lowerFactor = factor.toLowerCase();
    if (lowerFactor.includes('undervaluation') || lowerFactor.includes('cheap')) {
      valuationScore += 0.2;
    } else if (lowerFactor.includes('overvaluation') || lowerFactor.includes('expensive')) {
      valuationScore -= 0.2;
    }
  }

  return Math.max(0, Math.min(1, valuationScore));
}

/**
 * Extract quality score from risk assessment factors
 */
export function extractQualityScore(factors: string[]): number {
  let qualityScore = 0.5;

  for (const factor of factors) {
    const lowerFactor = factor.toLowerCase();
    if (lowerFactor.includes('strong') || lowerFactor.includes('good') || lowerFactor.includes('profitable')) {
      qualityScore += 0.15;
    } else if (lowerFactor.includes('weak') || lowerFactor.includes('poor') || lowerFactor.includes('concern')) {
      qualityScore -= 0.15;
    }
  }

  return Math.max(0, Math.min(1, qualityScore));
}