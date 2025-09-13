/**
 * Position Sizing Utilities
 *
 * This module provides advanced position sizing and portfolio constraint utilities
 * extracted from the main LangGraph setup for better maintainability and reusability.
 */

import { createLogger } from '../utils/enhanced-logger';

const logger = createLogger('system', 'PositionSizingUtils');

/**
 * Calculate advanced position sizing using Kelly Criterion and risk-adjusted models
 */
export function calculateAdvancedPositionSizing(traderPlan: string, riskScore: number): {
  recommendedSize: number;
  kellySize: number;
  riskAdjustedSize: number;
  volatilityAdjustedSize: number;
  portfolioConstrainedSize: number;
} {
  try {
    // Extract parameters from trader plan
    const planParams = extractPositionSizingParameters(traderPlan);

    // Kelly Criterion calculation
    const winRate = planParams.winRate || 0.55;
    const winLossRatio = planParams.winLossRatio || 2.0;
    const kellySize = calculateKellyCriterion(winRate, winLossRatio);

    // Risk-adjusted sizing based on risk score
    const riskAdjustedSize = calculateRiskAdjustedSize(kellySize, riskScore);

    // Volatility-adjusted sizing
    const volatilityAdjustedSize = calculateVolatilityAdjustedSize(riskAdjustedSize, planParams.volatility || 0.2);

    // Portfolio constraints
    const portfolioConstrainedSize = applyPortfolioConstraints(volatilityAdjustedSize, planParams.portfolioSize || 100000);

    // Final recommended size (conservative approach)
    const recommendedSize = Math.min(kellySize * 0.5, riskAdjustedSize, volatilityAdjustedSize, portfolioConstrainedSize);

    logger.debug('calculateAdvancedPositionSizing', 'Advanced position sizing calculated', {
      traderPlan: traderPlan.substring(0, 50) + '...',
      kellySize: (kellySize * 100).toFixed(2) + '%',
      riskAdjustedSize: (riskAdjustedSize * 100).toFixed(2) + '%',
      volatilityAdjustedSize: (volatilityAdjustedSize * 100).toFixed(2) + '%',
      portfolioConstrainedSize: (portfolioConstrainedSize * 100).toFixed(2) + '%',
      recommendedSize: (recommendedSize * 100).toFixed(2) + '%'
    });

    return {
      recommendedSize: Math.max(0.01, Math.min(0.25, recommendedSize)), // 1% to 25% position limit
      kellySize,
      riskAdjustedSize,
      volatilityAdjustedSize,
      portfolioConstrainedSize
    };
  } catch (error) {
    logger.warn('calculateAdvancedPositionSizing', 'Failed to calculate advanced position sizing, using conservative defaults', {
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      recommendedSize: 0.05, // 5% conservative default
      kellySize: 0.05,
      riskAdjustedSize: 0.05,
      volatilityAdjustedSize: 0.05,
      portfolioConstrainedSize: 0.05
    };
  }
}

/**
 * Extract position sizing parameters from trader plan text
 */
export function extractPositionSizingParameters(traderPlan: string): {
  winRate?: number;
  winLossRatio?: number;
  volatility?: number;
  portfolioSize?: number;
  riskTolerance?: number;
} {
  const planLower = traderPlan.toLowerCase();
  const params: any = {};

  // Extract win rate mentions
  const winRateMatch = planLower.match(/(\d+(?:\.\d+)?)%?\s*win\s*rate/i);
  if (winRateMatch && winRateMatch[1]) {
    params.winRate = parseFloat(winRateMatch[1]) / 100;
  }

  // Extract risk-reward ratio
  const rrMatch = planLower.match(/(\d+(?:\.\d+)?)\s*(?::|to|risk.reward|rr)/i);
  if (rrMatch && rrMatch[1]) {
    params.winLossRatio = parseFloat(rrMatch[1]);
  }

  // Extract volatility mentions
  const volMatch = planLower.match(/(\d+(?:\.\d+)?)%?\s*volatility/i);
  if (volMatch && volMatch[1]) {
    params.volatility = parseFloat(volMatch[1]) / 100;
  }

  // Extract portfolio size
  const portfolioMatch = planLower.match(/\$?(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:portfolio|account|capital)/i);
  if (portfolioMatch && portfolioMatch[1]) {
    params.portfolioSize = parseFloat(portfolioMatch[1].replace(/,/g, ''));
  }

  // Extract risk tolerance
  if (planLower.includes('conservative') || planLower.includes('low risk')) {
    params.riskTolerance = 0.3;
  } else if (planLower.includes('aggressive') || planLower.includes('high risk')) {
    params.riskTolerance = 0.8;
  } else {
    params.riskTolerance = 0.5; // Moderate default
  }

  return params;
}

/**
 * Calculate Kelly Criterion for optimal position sizing
 */
export function calculateKellyCriterion(winRate: number, winLossRatio: number): number {
  // Kelly Formula: K = (bp - q) / b
  // Where: b = odds (win/loss ratio), p = win probability, q = loss probability
  const b = winLossRatio;
  const p = winRate;
  const q = 1 - p;

  const kellySize = (b * p - q) / b;

  // Cap at reasonable maximum (typically 20% for safety)
  return Math.max(0, Math.min(0.20, kellySize));
}

/**
 * Calculate risk-adjusted position size
 */
export function calculateRiskAdjustedSize(kellySize: number, riskScore: number): number {
  // Reduce position size as risk increases
  const riskMultiplier = Math.max(0.3, 1 - riskScore);

  return kellySize * riskMultiplier;
}

/**
 * Calculate volatility-adjusted position size
 */
export function calculateVolatilityAdjustedSize(baseSize: number, volatility: number): number {
  // Reduce position size as volatility increases
  // Using inverse relationship: higher volatility = smaller position
  const volMultiplier = Math.max(0.2, 1 - volatility * 2);

  return baseSize * volMultiplier;
}

/**
 * Apply portfolio-level constraints to position sizing
 */
export function applyPortfolioConstraints(baseSize: number, portfolioSize: number): number {
  // Maximum position size as percentage of portfolio
  const maxPositionPercent = 0.25; // 25% maximum per position

  // Also consider minimum position size for diversification
  const minPositionPercent = 0.01; // 1% minimum per position

  return Math.max(minPositionPercent, Math.min(maxPositionPercent, baseSize));
}

/**
 * Estimate proposed position size from state and risk assessment
 */
export function estimateProposedPositionSize(state: any, riskAssessment: any): number {
  try {
    const symbol = state.ticker || state.symbol || state.companyOfInterest || 'UNKNOWN';
    const sector = determineSector(symbol);

    // Base position size by sector risk
    const sectorBaseSizes: { [key: string]: number } = {
      'technology': 0.08,    // Higher risk, smaller position
      'energy': 0.06,        // Commodity risk
      'finance': 0.10,       // More stable
      'healthcare': 0.09,    // Regulatory risk
      'consumer_defensive': 0.12,  // Stable
      'utilities': 0.15,     // Very stable
      'general': 0.08
    };

    let proposedSize: number = sectorBaseSizes[sector] ?? sectorBaseSizes.general;

    // Adjust based on risk assessment
    if (riskAssessment.overallRisk === 'HIGH') {
      proposedSize *= 0.6;
    } else if (riskAssessment.overallRisk === 'LOW') {
      proposedSize *= 1.2;
    }

    // Adjust based on confidence
    if (riskAssessment.confidence) {
      proposedSize *= riskAssessment.confidence;
    }

    return Math.max(0.01, Math.min(0.25, proposedSize));
  } catch (error) {
    logger.warn('estimateProposedPositionSize', 'Failed to estimate position size, using default', {
      error: error instanceof Error ? error.message : String(error)
    });
    return 0.05; // 5% default
  }
}

/**
 * Check position sizing constraints
 */
export function checkPositionSizingConstraints(
  symbol: string,
  proposedSize: number,
  portfolioState: any
): { violations: string[]; warnings: string[]; positionLimit: number } {
  const violations: string[] = [];
  const warnings: string[] = [];
  const positionLimit = 0.25; // 25% max per position

  // Check maximum position size
  if (proposedSize > positionLimit) {
    violations.push(`Proposed position size ${(proposedSize * 100).toFixed(1)}% exceeds maximum limit of ${(positionLimit * 100).toFixed(1)}%`);
  }

  // Check minimum position size for diversification
  const minSize = 0.01; // 1% minimum
  if (proposedSize < minSize) {
    warnings.push(`Proposed position size ${(proposedSize * 100).toFixed(1)}% below minimum recommended size of ${(minSize * 100).toFixed(1)}%`);
  }

  // Check sector concentration
  const sector = determineSector(symbol);
  const currentSectorAllocation = portfolioState.sectorAllocations[sector] || 0;
  const maxSectorAllocation = 0.40; // 40% max per sector

  if (currentSectorAllocation + proposedSize > maxSectorAllocation) {
    warnings.push(`Adding ${(proposedSize * 100).toFixed(1)}% to ${sector} sector would exceed maximum sector allocation of ${(maxSectorAllocation * 100).toFixed(1)}%`);
  }

  return { violations, warnings, positionLimit };
}

/**
 * Check sector allocation constraints
 */
export function checkSectorAllocationConstraints(
  symbol: string,
  proposedSize: number,
  portfolioState: any
): { violations: string[]; warnings: string[]; sectorLimit: number } {
  const violations: string[] = [];
  const warnings: string[] = [];
  const sector = determineSector(symbol);
  const sectorLimit = 0.40; // 40% max per sector

  const currentSectorAllocation = portfolioState.sectorAllocations[sector] || 0;
  const newSectorAllocation = currentSectorAllocation + proposedSize;

  if (newSectorAllocation > sectorLimit) {
    violations.push(`New sector allocation ${(newSectorAllocation * 100).toFixed(1)}% exceeds maximum sector limit of ${(sectorLimit * 100).toFixed(1)}% for ${sector}`);
  } else if (newSectorAllocation > sectorLimit * 0.8) {
    warnings.push(`New sector allocation ${(newSectorAllocation * 100).toFixed(1)}% approaches maximum sector limit of ${(sectorLimit * 100).toFixed(1)}% for ${sector}`);
  }

  return { violations, warnings, sectorLimit };
}

/**
 * Check correlation risk between positions
 */
export async function checkCorrelationRisk(
  symbol: string,
  portfolioState: any
): Promise<{ violations: string[]; warnings: string[]; correlationRisk: number }> {
  const violations: string[] = [];
  const warnings: string[] = [];
  let correlationRisk = 0.3; // Base correlation risk

  try {
    // Check correlation with existing positions
    const existingSymbols = Object.keys(portfolioState.positionSizes);
    let highCorrelationCount = 0;

    for (const existingSymbol of existingSymbols) {
      const correlation = await calculateSymbolCorrelation(symbol, existingSymbol);
      if (correlation > 0.7) { // High correlation threshold
        highCorrelationCount++;
        correlationRisk += 0.1;
      }
    }

    if (highCorrelationCount > 2) {
      violations.push(`High correlation risk: ${highCorrelationCount} existing positions show high correlation with ${symbol}`);
    } else if (highCorrelationCount > 0) {
      warnings.push(`${highCorrelationCount} existing positions show moderate to high correlation with ${symbol}`);
    }

    correlationRisk = Math.min(1.0, correlationRisk);
  } catch (error) {
    warnings.push('Unable to calculate correlation risk - using default assessment');
  }

  return { violations, warnings, correlationRisk };
}

/**
 * Check drawdown limits
 */
export function checkDrawdownLimits(portfolioState: any): { violations: string[]; warnings: string[]; maxDrawdown: number } {
  const violations: string[] = [];
  const warnings: string[] = [];
  const maxDrawdown = 0.20; // 20% maximum drawdown
  const currentDrawdown = portfolioState.currentDrawdown || 0;

  if (currentDrawdown > maxDrawdown) {
    violations.push(`Current portfolio drawdown ${(currentDrawdown * 100).toFixed(1)}% exceeds maximum limit of ${(maxDrawdown * 100).toFixed(1)}%`);
  } else if (currentDrawdown > maxDrawdown * 0.8) {
    warnings.push(`Current portfolio drawdown ${(currentDrawdown * 100).toFixed(1)}% approaches maximum limit of ${(maxDrawdown * 100).toFixed(1)}%`);
  }

  return { violations, warnings, maxDrawdown };
}

/**
 * Check diversification requirements
 */
export function checkDiversificationRequirements(portfolioState: any): { violations: string[]; warnings: string[]; minPositions: number } {
  const violations: string[] = [];
  const warnings: string[] = [];
  const minPositions = 5; // Minimum number of positions for diversification
  const currentPositions = Object.keys(portfolioState.positionSizes).length;

  if (currentPositions < minPositions) {
    warnings.push(`Portfolio has only ${currentPositions} positions, minimum recommended is ${minPositions} for proper diversification`);
  }

  // Check sector diversification
  const sectors = Object.keys(portfolioState.sectorAllocations);
  if (sectors.length < 3) {
    warnings.push(`Portfolio spans only ${sectors.length} sectors, minimum recommended is 3 for sector diversification`);
  }

  return { violations, warnings, minPositions };
}

/**
 * Calculate correlation between two symbols
 */
export async function calculateSymbolCorrelation(symbol1: string, symbol2: string): Promise<number> {
  try {
    // Simplified correlation calculation based on sector similarity
    const sector1 = determineSector(symbol1);
    const sector2 = determineSector(symbol2);

    if (sector1 === sector2) {
      // Same sector = high correlation
      return 0.8;
    } else if (isHighCorrelationSector(sector1) && isHighCorrelationSector(sector2)) {
      // Both in high-correlation sectors
      return 0.6;
    } else {
      // Different sectors = lower correlation
      return 0.3;
    }
  } catch (error) {
    logger.warn('calculateSymbolCorrelation', 'Failed to calculate correlation, using default', {
      symbol1,
      symbol2,
      error: error instanceof Error ? error.message : String(error)
    });
    return 0.4; // Moderate correlation default
  }
}

/**
 * Get current portfolio state (simplified implementation)
 */
export async function getCurrentPortfolioState(): Promise<{
  totalValue: number;
  totalExposure: number;
  sectorAllocations: Record<string, number>;
  positionSizes: Record<string, number>;
  currentDrawdown: number;
}> {
  // In a real implementation, this would fetch from portfolio service
  // For now, return simulated portfolio state
  return {
    totalValue: 100000, // $100K portfolio
    totalExposure: 0.6,  // 60% invested
    sectorAllocations: {
      'technology': 0.25,
      'finance': 0.20,
      'healthcare': 0.15,
      'energy': 0.10,
      'consumer_defensive': 0.10
    },
    positionSizes: {
      'AAPL': 0.08,
      'MSFT': 0.07,
      'JPM': 0.06,
      'JNJ': 0.05
    },
    currentDrawdown: 0.05 // 5% current drawdown
  };
}

// Helper functions

/**
 * Determine sector from symbol
 */
function determineSector(symbol: string): string {
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
 * Check if sector has high correlation
 */
function isHighCorrelationSector(sector: string): boolean {
  const highCorrelationSectors = ['technology', 'energy', 'finance'];
  return highCorrelationSectors.includes(sector);
}