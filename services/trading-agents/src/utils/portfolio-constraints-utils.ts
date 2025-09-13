import { createLogger } from '../utils/enhanced-logger';
import { TradingAgentsConfig } from '../types/config';

export interface PortfolioConstraintsResult {
  status: 'PASS' | 'WARNING' | 'VIOLATION' | 'ERROR';
  violations: string[];
  warnings: string[];
  positionLimit: number;
  sectorLimit: number;
  correlationRisk: number;
  maxDrawdown: number;
  portfolioMetrics: {
    totalValue: number;
    totalExposure: number;
    sectorAllocations: Record<string, number>;
    positionSizes: Record<string, number>;
    currentDrawdown: number;
  };
}

export interface PositionSizingConstraints {
  violations: string[];
  warnings: string[];
  positionLimit: number;
}

export interface SectorAllocationConstraints {
  violations: string[];
  warnings: string[];
  sectorLimit: number;
}

export interface CorrelationRiskResult {
  violations: string[];
  warnings: string[];
  correlationRisk: number;
}

export interface DrawdownLimitsResult {
  violations: string[];
  warnings: string[];
  maxDrawdown: number;
}

export interface DiversificationRequirementsResult {
  violations: string[];
  warnings: string[];
  minPositions: number;
}

export interface PortfolioState {
  totalValue: number;
  totalExposure: number;
  sectorAllocations: Record<string, number>;
  positionSizes: Record<string, number>;
  currentDrawdown: number;
}

/**
 * Utility class for portfolio constraint management and risk assessment
 */
export class PortfolioConstraintsUtils {
  private logger = createLogger('system', 'PortfolioConstraintsUtils');

  constructor(private config: TradingAgentsConfig) {}

  /**
   * Assess portfolio-level risk constraints including position sizing, sector allocation,
   * correlation analysis, and drawdown limits
   */
  async assessPortfolioLevelConstraints(
    state: any,
    riskAssessment: any,
    getCurrentPortfolioState: () => Promise<PortfolioState>,
    checkPositionSizingConstraints: (symbol: string, proposedSize: number, portfolioState: PortfolioState) => PositionSizingConstraints,
    checkSectorAllocationConstraints: (symbol: string, proposedSize: number, portfolioState: PortfolioState) => SectorAllocationConstraints,
    checkCorrelationRisk: (symbol: string, portfolioState: PortfolioState) => Promise<CorrelationRiskResult>,
    checkDrawdownLimits: (portfolioState: PortfolioState) => DrawdownLimitsResult,
    checkDiversificationRequirements: (portfolioState: PortfolioState) => DiversificationRequirementsResult,
    estimateProposedPositionSize: (state: any, riskAssessment: any) => number
  ): Promise<PortfolioConstraintsResult> {
    try {
      const symbol = state.ticker || state.symbol || state.companyOfInterest || 'UNKNOWN';
      const proposedPositionSize = estimateProposedPositionSize(state, riskAssessment);

      // Get current portfolio state
      const portfolioState = await getCurrentPortfolioState();

      // Assess position sizing constraints
      const positionSizingCheck = checkPositionSizingConstraints(
        symbol,
        proposedPositionSize,
        portfolioState
      );

      // Assess sector allocation constraints
      const sectorAllocationCheck = checkSectorAllocationConstraints(
        symbol,
        proposedPositionSize,
        portfolioState
      );

      // Assess correlation risk
      const correlationCheck = await checkCorrelationRisk(
        symbol,
        portfolioState
      );

      // Assess drawdown limits
      const drawdownCheck = checkDrawdownLimits(portfolioState);

      // Assess diversification requirements
      const diversificationCheck = checkDiversificationRequirements(portfolioState);

      // Combine all constraint checks
      const allViolations = [
        ...positionSizingCheck.violations,
        ...sectorAllocationCheck.violations,
        ...correlationCheck.violations,
        ...drawdownCheck.violations,
        ...diversificationCheck.violations
      ];

      const allWarnings = [
        ...positionSizingCheck.warnings,
        ...sectorAllocationCheck.warnings,
        ...correlationCheck.warnings,
        ...drawdownCheck.warnings,
        ...diversificationCheck.warnings
      ];

      // Determine overall status
      let status: 'PASS' | 'WARNING' | 'VIOLATION' | 'ERROR' = 'PASS';
      if (allViolations.length > 0) {
        status = 'VIOLATION';
      } else if (allWarnings.length > 0) {
        status = 'WARNING';
      }

      this.logger.info('assessPortfolioLevelConstraints', `Portfolio constraints assessment for ${symbol}`, {
        symbol,
        status,
        violationsCount: allViolations.length,
        warningsCount: allWarnings.length,
        proposedPositionSize: proposedPositionSize.toFixed(2),
        portfolioValue: portfolioState.totalValue.toFixed(2)
      });

      return {
        status,
        violations: allViolations,
        warnings: allWarnings,
        positionLimit: positionSizingCheck.positionLimit,
        sectorLimit: sectorAllocationCheck.sectorLimit,
        correlationRisk: correlationCheck.correlationRisk,
        maxDrawdown: drawdownCheck.maxDrawdown,
        portfolioMetrics: portfolioState
      };

    } catch (error) {
      this.logger.error('assessPortfolioLevelConstraints', 'Portfolio constraints assessment failed', {
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        status: 'ERROR',
        violations: ['Portfolio constraints assessment failed'],
        warnings: [],
        positionLimit: 0.05, // 5% default
        sectorLimit: 0.25, // 25% default
        correlationRisk: 0.5,
        maxDrawdown: 0.20, // 20% default
        portfolioMetrics: {
          totalValue: 100000, // Default portfolio value
          totalExposure: 0,
          sectorAllocations: {},
          positionSizes: {},
          currentDrawdown: 0
        }
      };
    }
  }

  /**
   * Determine trade decision considering portfolio-level constraints
   */
  async determineTradeDecisionWithPortfolioConstraints(
    state: any,
    riskAssessment: any,
    portfolioConstraints: PortfolioConstraintsResult,
    determineTradeDecision: (state: any, riskAssessment: any) => Promise<string>
  ): Promise<string> {
    try {
      // First get the base ML-based decision
      const baseDecision = await determineTradeDecision(state, riskAssessment);

      // If portfolio constraints are violated, override decision
      if (portfolioConstraints.status === 'VIOLATION') {
        const violationReasons = portfolioConstraints.violations.join('; ');
        return `HOLD - Portfolio constraints violated: ${violationReasons}`;
      }

      // If there are warnings, add them to the decision
      if (portfolioConstraints.status === 'WARNING') {
        const warningReasons = portfolioConstraints.warnings.join('; ');
        return `${baseDecision} (Portfolio warnings: ${warningReasons})`;
      }

      // If constraints pass, return the base decision
      return baseDecision;

    } catch (error) {
      this.logger.error('determineTradeDecisionWithPortfolioConstraints', 'Portfolio-aware decision failed', {
        error: error instanceof Error ? error.message : String(error)
      });

      // Fallback to conservative approach
      return 'HOLD - Portfolio constraint analysis failed, defaulting to conservative stance';
    }
  }

  /**
   * Check position sizing constraints
   */
  checkPositionSizingConstraints(
    symbol: string,
    proposedSize: number,
    portfolioState: PortfolioState,
    determineSector: (symbol: string) => string
  ): PositionSizingConstraints {
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
  checkSectorAllocationConstraints(
    symbol: string,
    proposedSize: number,
    portfolioState: PortfolioState,
    determineSector: (symbol: string) => string
  ): SectorAllocationConstraints {
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
  async checkCorrelationRisk(
    symbol: string,
    portfolioState: PortfolioState,
    calculateSymbolCorrelation: (symbol1: string, symbol2: string) => Promise<number>
  ): Promise<CorrelationRiskResult> {
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
  checkDrawdownLimits(portfolioState: PortfolioState): DrawdownLimitsResult {
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
  checkDiversificationRequirements(portfolioState: PortfolioState): DiversificationRequirementsResult {
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
  async calculateSymbolCorrelation(
    symbol1: string,
    symbol2: string,
    determineSector: (symbol: string) => string,
    isHighCorrelationSector: (sector: string) => boolean
  ): Promise<number> {
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
      this.logger.warn('calculateSymbolCorrelation', 'Failed to calculate correlation, using default', {
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
  async getCurrentPortfolioState(): Promise<PortfolioState> {
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

  /**
   * Estimate proposed position size from state and risk assessment
   */
  estimateProposedPositionSize(
    state: any,
    riskAssessment: any,
    determineSector: (symbol: string) => string
  ): number {
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
      this.logger.warn('estimateProposedPositionSize', 'Failed to estimate position size, using default', {
        error: error instanceof Error ? error.message : String(error)
      });
      return 0.05; // 5% default
    }
  }

  /**
   * Determine sector based on symbol
   */
  determineSector(symbol: string): string {
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
   * Check if sector is considered high correlation
   */
  isHighCorrelationSector(sector: string): boolean {
    const highCorrelationSectors = ['technology', 'energy', 'finance'];
    return highCorrelationSectors.includes(sector);
  }
}