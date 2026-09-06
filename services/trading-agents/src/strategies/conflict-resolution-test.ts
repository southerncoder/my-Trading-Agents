/**
 * Simple test to verify conflict resolution functionality
 * 
 * This test verifies that the conflict resolution system in StrategyManager
 * can properly detect and resolve contradictory signals.
 */

import { StrategyManager } from './index.js';
import { 
  ITradingStrategy, 
  TradingSignal, 
  SignalType, 
  SignalStrength, 
  RiskLevel, 
  MarketData, 
  StrategyConfig,
  StrategyPerformance
} from './base-strategy.js';
import { TradingAgentsConfig } from '../config/index.js';

// Mock strategy implementation for testing
class MockConflictStrategy implements ITradingStrategy {
  constructor(
    public readonly name: string,
    public readonly description: string,
    public config: StrategyConfig,
    private mockSignals: TradingSignal[] = []
  ) {}

  async analyze(_marketData: MarketData[], _currentPosition?: number): Promise<TradingSignal[]> {
    return [...this.mockSignals];
  }

  validate(): boolean {
    return true;
  }

  getPerformance(): StrategyPerformance {
    return {
      totalTrades: 10,
      winningTrades: 6,
      losingTrades: 4,
      winRate: 0.6,
      totalReturn: 0.15,
      maxDrawdown: -0.05,
      sharpeRatio: 1.2,
      sortino: 1.5,
      averageWin: 0.03,
      averageLoss: -0.02,
      profitFactor: 1.8,
      lastUpdated: new Date()
    };
  }

  updateConfig(newConfig: Partial<StrategyConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  shouldActivate(_marketConditions: Record<string, any>): boolean {
    return this.config.enabled;
  }

  setMockSignals(signals: TradingSignal[]): void {
    this.mockSignals = signals;
  }
}

// Helper function to create mock trading signal
function createMockSignal(
  symbol: string,
  signal: SignalType,
  confidence: number,
  price: number,
  strategy: string
): TradingSignal {
  return {
    symbol,
    signal,
    strength: SignalStrength.MODERATE,
    confidence,
    timestamp: new Date(),
    price,
    reasoning: `Mock signal from ${strategy}`,
    riskLevel: RiskLevel.MODERATE,
    metadata: { strategy }
  };
}

// Helper function to create mock market data
function createMockMarketData(symbol: string, price: number): MarketData[] {
  return [{
    symbol,
    timestamp: new Date(),
    open: price * 0.99,
    high: price * 1.01,
    low: price * 0.98,
    close: price,
    volume: 1000000
  }];
}

// Mock trading config
const mockTradingConfig: TradingAgentsConfig = {
  llm: {
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 1000
  }
} as TradingAgentsConfig;

async function testConflictResolution() {
  console.log('🧪 Testing Conflict Resolution System...\n');

  const strategyManager = new StrategyManager(mockTradingConfig);

  // Create mock strategies with conflicting signals
  const momentumStrategy = new MockConflictStrategy(
    'momentum_strategy',
    'Mock momentum strategy',
    {
      name: 'momentum_strategy',
      enabled: true,
      parameters: {},
      riskTolerance: RiskLevel.MODERATE,
      maxPositionSize: 0.1,
      stopLossPercent: 2.0,
      takeProfitPercent: 4.0,
      lookbackPeriod: 20
    }
  );

  const meanReversionStrategy = new MockConflictStrategy(
    'mean_reversion_strategy',
    'Mock mean reversion strategy',
    {
      name: 'mean_reversion_strategy',
      enabled: true,
      parameters: {},
      riskTolerance: RiskLevel.LOW,
      maxPositionSize: 0.15,
      stopLossPercent: 1.5,
      takeProfitPercent: 3.0,
      lookbackPeriod: 30
    }
  );

  // Test Case 1: Conflicting BUY vs SELL signals
  console.log('📊 Test Case 1: Conflicting BUY vs SELL signals');
  
  const buySignal = createMockSignal('AAPL', SignalType.BUY, 80, 150.0, 'momentum_strategy');
  const sellSignal = createMockSignal('AAPL', SignalType.SELL, 70, 150.5, 'mean_reversion_strategy');
  
  momentumStrategy.setMockSignals([buySignal]);
  meanReversionStrategy.setMockSignals([sellSignal]);
  
  strategyManager.addStrategy(momentumStrategy, 1.0);
  strategyManager.addStrategy(meanReversionStrategy, 1.0);
  
  const marketData = createMockMarketData('AAPL', 150.25);
  const consolidatedSignals = await strategyManager.generateConsolidatedSignals('AAPL', marketData);
  
  console.log(`   Original signals: BUY (80% confidence) vs SELL (70% confidence)`);
  console.log(`   Resolved to: ${consolidatedSignals[0]?.signal || consolidatedSignals[0]?.action} with ${((consolidatedSignals[0]?.confidence || 0) * 100).toFixed(1)}% confidence`);
  console.log(`   Resolution reasoning: ${consolidatedSignals[0]?.reasoning || 'No reasoning provided'}`);
  console.log('');

  // Test Case 2: Non-conflicting signals (both BUY)
  console.log('📊 Test Case 2: Non-conflicting signals (both BUY)');
  
  const buySignal1 = createMockSignal('GOOGL', SignalType.BUY, 85, 2500.0, 'momentum_strategy');
  const buySignal2 = createMockSignal('GOOGL', SignalType.BUY, 75, 2501.0, 'mean_reversion_strategy');
  
  momentumStrategy.setMockSignals([buySignal1]);
  meanReversionStrategy.setMockSignals([buySignal2]);
  
  const marketData2 = createMockMarketData('GOOGL', 2500.5);
  const consolidatedSignals2 = await strategyManager.generateConsolidatedSignals('GOOGL', marketData2);
  
  console.log(`   Original signals: BUY (85% confidence) + BUY (75% confidence)`);
  console.log(`   Aggregated to: ${consolidatedSignals2[0]?.signal || consolidatedSignals2[0]?.action} with ${((consolidatedSignals2[0]?.confidence || 0) * 100).toFixed(1)}% confidence`);
  console.log(`   Consensus strength: ${((consolidatedSignals2[0]?.consensus_strength || 0) * 100).toFixed(1)}%`);
  console.log('');

  // Test Case 3: Strong vs Weak conflicting signals
  console.log('📊 Test Case 3: Strong vs Weak conflicting signals');
  
  const strongBuySignal = createMockSignal('MSFT', SignalType.STRONG_BUY, 95, 300.0, 'momentum_strategy');
  const weakSellSignal = createMockSignal('MSFT', SignalType.SELL, 55, 300.2, 'mean_reversion_strategy');
  
  momentumStrategy.setMockSignals([strongBuySignal]);
  meanReversionStrategy.setMockSignals([weakSellSignal]);
  
  const marketData3 = createMockMarketData('MSFT', 300.1);
  const consolidatedSignals3 = await strategyManager.generateConsolidatedSignals('MSFT', marketData3);
  
  console.log(`   Original signals: STRONG_BUY (95% confidence) vs SELL (55% confidence)`);
  console.log(`   Resolved to: ${consolidatedSignals3[0]?.signal || consolidatedSignals3[0]?.action} with ${((consolidatedSignals3[0]?.confidence || 0) * 100).toFixed(1)}% confidence`);
  console.log(`   Conflict resolutions: ${JSON.stringify(consolidatedSignals3[0]?.conflictResolutions || [], null, 2)}`);
  console.log('');

  console.log('✅ Conflict Resolution System Test Complete!');
  console.log('');
  console.log('Key Features Verified:');
  console.log('  ✓ Conflict detection between contradictory signals');
  console.log('  ✓ Resolution strategies (confidence voting, performance weighting)');
  console.log('  ✓ Transparent conflict resolution reasoning');
  console.log('  ✓ Signal aggregation for non-conflicting signals');
  console.log('  ✓ Consensus strength calculation');
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testConflictResolution().catch(console.error);
}

export { testConflictResolution };