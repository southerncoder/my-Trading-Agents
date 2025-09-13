/**
 * Price Data Generation Utilities
 *
 * Provides deterministic price data generation and sector-based volatility calculations
 * for fallback scenarios when real market data is unavailable.
 */

import { createLogger } from '../utils/enhanced-logger';

const logger = createLogger('system', 'PriceDataUtils');

/**
 * Sector-specific volatility characteristics
 */
export interface SectorVolatility {
  baseVolatility: number;
  trendDirection: number;
}

/**
 * Sector-specific price ranges for fallback scenarios
 */
export interface SectorPriceRange {
  min: number;
  max: number;
}

/**
 * Get sector-based volatility characteristics for deterministic price generation
 */
export function getSectorBasedVolatility(symbol: string): SectorVolatility {
  const sector = determineSector(symbol);

  // Sector-specific base volatility (annualized, realistic ranges)
  const sectorVolatilities: { [key: string]: number } = {
    'technology': 0.35,    // High volatility: 35%
    'energy': 0.28,        // Commodity sensitivity: 28%
    'finance': 0.25,       // Interest rate sensitivity: 25%
    'healthcare': 0.22,    // Regulatory risk: 22%
    'consumer_defensive': 0.18,  // Stable: 18%
    'utilities': 0.16,     // Very stable: 16%
    'general': 0.20        // Default: 20%
  };

  const baseVolatility = sectorVolatilities[sector] || sectorVolatilities.general || 0.20;

  // Calculate trend direction based on symbol hash for consistency
  const symbolHash = simpleHash(symbol);
  const trendDirection = (symbolHash % 200 - 100) / 1000; // Small trend bias (-0.1 to +0.1)

  return { baseVolatility, trendDirection };
}

/**
 * Generate deterministic price series based on sector characteristics
 */
export function generateDeterministicPriceSeries(
  basePrice: number,
  days: number,
  symbol: string,
  volatilityMultiplier: number = 1.0
): number[] {
  const { baseVolatility, trendDirection } = getSectorBasedVolatility(symbol);
  const prices: number[] = [basePrice];
  let currentPrice = basePrice;

  // Convert annualized volatility to daily
  const dailyVolatility = baseVolatility / Math.sqrt(252) * volatilityMultiplier;

  for (let i = 1; i < days; i++) {
    // Use sine wave for seasonal/market cycle patterns + trend direction
    const cycleComponent = Math.sin(i / 20) * dailyVolatility * 0.5;
    const trendComponent = trendDirection * (i / days); // Gradual trend over time
    const randomWalk = (Math.sin(i * 0.1) + Math.cos(i * 0.15)) * dailyVolatility * 0.3;

    // Combine components for realistic price movement
    const priceChange = cycleComponent + trendComponent + randomWalk;
    currentPrice = Math.max(0.01, currentPrice * (1 + priceChange));

    prices.push(currentPrice);
  }

  return prices;
}

/**
 * Get sector-based price estimate for fallback scenarios
 */
export function getSectorBasedPriceEstimate(symbol: string): number {
  const sector = determineSector(symbol);

  // Realistic price ranges by sector (approximate market averages)
  const sectorPriceRanges: { [key: string]: SectorPriceRange } = {
    'technology': { min: 50, max: 300 },
    'finance': { min: 30, max: 150 },
    'energy': { min: 40, max: 120 },
    'healthcare': { min: 60, max: 200 },
    'consumer_defensive': { min: 25, max: 100 },
    'utilities': { min: 20, max: 80 },
    'general': { min: 30, max: 150 }
  };

  const range = sectorPriceRanges[sector] || sectorPriceRanges.general || { min: 30, max: 150 };

  // Use symbol hash for consistent but varied pricing within sector
  const symbolHash = simpleHash(symbol);
  const normalizedHash = (symbolHash % 100) / 100; // 0-1 range

  return range.min + (range.max - range.min) * normalizedHash;
}

/**
 * Determine sector from symbol (simplified sector mapping)
 */
export function determineSector(symbol: string): string {
  // Simplified sector mapping based on common symbols
  const sectorMap: { [key: string]: string } = {
    'AAPL': 'technology', 'MSFT': 'technology', 'GOOGL': 'technology', 'AMZN': 'technology',
    'XOM': 'energy', 'CVX': 'energy', 'COP': 'energy',
    'JPM': 'finance', 'BAC': 'finance', 'WFC': 'finance',
    'JNJ': 'healthcare', 'PFE': 'healthcare', 'UNH': 'healthcare',
    'NEE': 'utilities', 'SO': 'utilities', 'DUK': 'utilities',
    'PG': 'consumer_defensive', 'KO': 'consumer_defensive', 'WMT': 'consumer_defensive'
  };

  return sectorMap[symbol] || 'general';
}

/**
 * Simple hash function for consistent symbol-based variations
 */
export function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Check if sector has high correlation risk
 */
export function isHighCorrelationSector(sector: string): boolean {
  const highCorrelationSectors = ['technology', 'energy', 'finance'];
  return highCorrelationSectors.includes(sector);
}