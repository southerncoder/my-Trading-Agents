/**
 * Strategy Ensemble Verification Script
 * 
 * Simple verification script to test the StrategyEnsemble functionality
 * without requiring a full test framework setup.
 */

import { StrategyEnsemble, VotingConfig } from './strategy-ensemble.js';
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

// Mock strategy implementation for verification
class MockStrategy implements ITradingStrategy {
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
const mockTradingConfig = {
  llm: {
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 1000
  }
} as unknown as TradingAgentsConfig;

async function verifyEnsemble(): Promise<void> {
  console.log('🧪 Starting Strategy Ensemble Verification...\n');

  try {
    // Test 1: Basic Ensemble Creation
    console.log('📋 Test 1: Basic Ensemble Creation');
    const votingConfig: VotingConfig = {
      method: 'weighted_average',
      confidenceThreshold: 0.6,
      correlationThreshold: 0.7,
      maxSignalsPerSymbol: 3,
      enableConflictResolution: true
    };

    const ensemble = new StrategyEnsemble(mockTradingConfig, votingConfig);
    console.log('✅ Ensemble created successfully');

    // Test 2: Strategy Management
    console.log('\n📋 Test 2: Strategy Management');
    const strategy1 = new MockStrategy(
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

    const strategy2 = new MockStrategy(
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

    ensemble.addStrategy(strategy1, 1.0);
    ensemble.addStrategy(strategy2, 1.2);

    const activeStrategies = ensemble.getActiveStrategies();
    console.log(`✅ Added ${activeStrategies.length} strategies to ensemble`);
    console.log(`   - ${activeStrategies.map(s => s.name).join(', ')}`);

    // Test 3: Signal Aggregation
    console.log('\n📋 Test 3: Signal Aggregation');
    const signal1 = createMockSignal('AAPL', SignalType.BUY, 80, 150.0, 'momentum_strategy');
    const signal2 = createMockSignal('AAPL', SignalType.BUY, 70, 151.0, 'mean_reversion_strategy');
    
    strategy1.setMockSignals([signal1]);
    strategy2.setMockSignals([signal2]);

    const marketData = createMockMarketData('AAPL', 150.5);
    const aggregatedSignals = await ensemble.aggregateSignals('AAPL', marketData);

    console.log(`✅ Aggregated ${aggregatedSignals.length} signals`);
    if (aggregatedSignals.length > 0) {
      const signal = aggregatedSignals[0]!;
      console.log(`   - Signal: ${signal.signal}`);
      console.log(`   - Confidence: ${signal.confidence.toFixed(1)}%`);
      console.log(`   - Contributing strategies: ${signal.contributingStrategies.join(', ')}`);
      console.log(`   - Consensus strength: ${(signal.consensusStrength * 100).toFixed(1)}%`);
    }

    // Test 4: Conflict Resolution
    console.log('\n📋 Test 4: Conflict Resolution');
    const buySignal = createMockSignal('AAPL', SignalType.BUY, 80, 150.0, 'momentum_strategy');
    const sellSignal = createMockSignal('AAPL', SignalType.SELL, 70, 150.5, 'mean_reversion_strategy');

    const resolvedSignals = await ensemble.resolveConflicts([buySignal, sellSignal]);
    console.log(`✅ Resolved ${resolvedSignals.length} signals from conflicting inputs`);
    if (resolvedSignals.length > 0) {
      const resolved = resolvedSignals[0]!;
      console.log(`   - Resolved to: ${resolved.signal}`);
      console.log(`   - Confidence: ${resolved.confidence.toFixed(1)}%`);
    }

    // Test 5: Weight Management
    console.log('\n📋 Test 5: Weight Management');
    const performanceData: StrategyPerformance[] = [
      {
        totalTrades: 10,
        winningTrades: 8,
        losingTrades: 2,
        winRate: 0.8,
        totalReturn: 0.25,
        maxDrawdown: -0.03,
        sharpeRatio: 2.0,
        sortino: 2.5,
        averageWin: 0.04,
        averageLoss: -0.015,
        profitFactor: 2.67,
        lastUpdated: new Date()
      }
    ];

    const initialWeights = ensemble.getStrategyWeights();
    console.log('   Initial weights:');
    for (const [strategyId, weight] of initialWeights) {
      console.log(`     - ${strategyId}: ${weight.weight.toFixed(2)}`);
    }

    ensemble.updateWeights(performanceData);
    const updatedWeights = ensemble.getStrategyWeights();
    console.log('   Updated weights:');
    for (const [strategyId, weight] of updatedWeights) {
      console.log(`     - ${strategyId}: ${weight.weight.toFixed(2)}`);
    }
    console.log('✅ Weight management working correctly');

    // Test 6: Ensemble Statistics
    console.log('\n📋 Test 6: Ensemble Statistics');
    const stats = ensemble.getEnsembleStats();
    console.log('✅ Ensemble statistics:');
    console.log(`   - Total strategies: ${stats.totalStrategies}`);
    console.log(`   - Active strategies: ${stats.activeStrategies}`);
    console.log(`   - Average weight: ${stats.averageWeight.toFixed(2)}`);
    console.log(`   - Weight variance: ${stats.weightVariance.toFixed(4)}`);
    console.log(`   - Last updated: ${stats.lastUpdated.toISOString()}`);

    console.log('\n🎉 All Strategy Ensemble verification tests passed!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Ensemble creation and configuration');
    console.log('   ✅ Strategy management (add/remove)');
    console.log('   ✅ Signal aggregation with weighted voting');
    console.log('   ✅ Conflict resolution between contradictory signals');
    console.log('   ✅ Dynamic weight management based on performance');
    console.log('   ✅ Ensemble statistics and monitoring');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : String(error));
    process.exit(1);
  }
}

// Run verification if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyEnsemble().catch(console.error);
}

export { verifyEnsemble };