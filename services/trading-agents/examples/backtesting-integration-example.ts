/**
 * Backtesting Integration Example
 * 
 * This example demonstrates how to use the integrated backtesting framework
 * with MarketStack and Yahoo Finance data providers.
 */

import { 
  createBacktestEngine,
  runBacktest,
  validateConfig,
  BacktestingFactory
} from '../src/backtesting';
import { TradingAgentsConfig } from '../src/config';
import { ITradingStrategy, MarketData, TradingSignal, SignalType, SignalStrength, RiskLevel } from '../src/strategies/base-strategy';

/**
 * Example trading strategy for demonstration
 */
class SimpleMovingAverageStrategy implements ITradingStrategy {
  public readonly name = 'Simple Moving Average';
  public readonly description = 'Simple moving average crossover strategy';
  public config: any;

  constructor() {
    this.config = {
      name: 'SMA Strategy',
      enabled: true,
      parameters: {
        shortPeriod: 10,
        longPeriod: 20
      },
      riskTolerance: RiskLevel.MODERATE,
      maxPositionSize: 0.1,
      stopLossPercent: 5,
      takeProfitPercent: 10,
      lookbackPeriod: 50
    };
  }

  async analyze(marketData: MarketData[]): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = [];

    for (const data of marketData) {
      // Simple logic: buy if price > 100, sell if price < 95
      if (data.close > 100) {
        signals.push({
          symbol: data.symbol,
          signal: SignalType.BUY,
          strength: SignalStrength.MODERATE,
          confidence: 70,
          timestamp: data.timestamp,
          price: data.close,
          reasoning: 'Price above 100 threshold',
          riskLevel: RiskLevel.MODERATE,
          positionSize: 0.1
        });
      } else if (data.close < 95) {
        signals.push({
          symbol: data.symbol,
          signal: SignalType.SELL,
          strength: SignalStrength.MODERATE,
          confidence: 70,
          timestamp: data.timestamp,
          price: data.close,
          reasoning: 'Price below 95 threshold',
          riskLevel: RiskLevel.MODERATE,
          positionSize: 0.1
        });
      }
    }

    return signals;
  }

  validate(): boolean {
    return true;
  }

  getPerformance(): any {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalReturn: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      sortino: 0,
      averageWin: 0,
      averageLoss: 0,
      profitFactor: 0,
      lastUpdated: new Date()
    };
  }

  updateConfig(newConfig: Partial<any>): void {
    this.config = { ...this.config, ...newConfig };
  }

  shouldActivate(): boolean {
    return this.config.enabled;
  }
}

/**
 * Example function to run a complete backtest
 */
async function runExampleBacktest() {
  try {
    console.log('🚀 Starting backtesting integration example...');

    // Create trading configuration
    const tradingConfig: TradingAgentsConfig = {
      dataDir: './data',
      // Add other required config properties as needed
    } as TradingAgentsConfig;

    // Create strategy
    const strategy = new SimpleMovingAverageStrategy();

    // Define test parameters
    const symbols = ['AAPL', 'MSFT'];
    const startDate = new Date('2023-01-01');
    const endDate = new Date('2023-12-31');

    // Validate configuration first
    const validation = validateConfig({
      strategy,
      symbols,
      startDate,
      endDate,
      initialCapital: 100000,
      commission: 0.001,
      slippage: 0.0005,
      marketImpact: true
    });

    if (!validation.isValid) {
      console.error('❌ Configuration validation failed:', validation.errors);
      return;
    }

    if (validation.warnings.length > 0) {
      console.warn('⚠️ Configuration warnings:', validation.warnings);
    }

    console.log('✅ Configuration validated successfully');

    // Run backtest with integrated data providers
    console.log('📊 Running backtest with integrated data providers...');
    
    const result = await runBacktest(
      strategy,
      symbols,
      startDate,
      endDate,
      tradingConfig,
      {
        initialCapital: 100000,
        commission: 0.001,
        slippage: 0.0005,
        enableMarketHours: false,
        enableGraphStorage: true, // Enable graph storage for relationship analysis
        dataProvider: {
          preferredProvider: 'auto', // Try both Yahoo Finance and MarketStack
          enableCaching: true,
          maxRetries: 3
        }
      }
    );

    // Display results
    console.log('\n📈 Backtest Results:');
    console.log('===================');
    console.log(`Strategy: ${result.config.strategy.name}`);
    console.log(`Symbols: ${result.config.symbols.join(', ')}`);
    console.log(`Period: ${result.startDate.toDateString()} - ${result.endDate.toDateString()}`);
    console.log(`Duration: ${result.duration} days`);
    console.log('\n💰 Performance Metrics:');
    console.log(`Total Return: ${(result.performance.totalReturn * 100).toFixed(2)}%`);
    console.log(`Annualized Return: ${(result.performance.annualizedReturn * 100).toFixed(2)}%`);
    console.log(`Sharpe Ratio: ${result.performance.sharpeRatio.toFixed(3)}`);
    console.log(`Sortino Ratio: ${result.performance.sortinoRatio.toFixed(3)}`);
    console.log(`Calmar Ratio: ${result.performance.calmarRatio.toFixed(3)}`);
    console.log(`Max Drawdown: ${(result.performance.maxDrawdown * 100).toFixed(2)}%`);
    console.log(`Volatility: ${(result.performance.volatility * 100).toFixed(2)}%`);
    
    console.log('\n📊 Trade Statistics:');
    console.log(`Total Trades: ${result.performance.totalTrades}`);
    console.log(`Winning Trades: ${result.performance.winningTrades}`);
    console.log(`Losing Trades: ${result.performance.losingTrades}`);
    console.log(`Win Rate: ${(result.performance.winRate * 100).toFixed(2)}%`);
    console.log(`Profit Factor: ${result.performance.profitFactor.toFixed(3)}`);
    console.log(`Average Win: $${result.performance.averageWin.toFixed(2)}`);
    console.log(`Average Loss: $${result.performance.averageLoss.toFixed(2)}`);

    if (result.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      result.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    console.log('\n✅ Backtesting integration example completed successfully!');

  } catch (error) {
    console.error('❌ Backtesting example failed:', error);
  }
}

/**
 * Example function to create and test a backtesting engine
 */
async function createEngineExample() {
  try {
    console.log('🔧 Creating integrated backtesting engine...');

    const tradingConfig: TradingAgentsConfig = {
      dataDir: './data',
    } as TradingAgentsConfig;

    // Get recommended configuration for development
    const config = BacktestingFactory.getRecommendedConfig('development');
    
    // Create integrated engine
    const engine = await createBacktestEngine(tradingConfig, config);
    
    console.log('✅ Backtesting engine created successfully');
    
    // You can now use the engine for multiple backtests
    // const result = await engine.runBacktest(backtestConfig);
    
  } catch (error) {
    console.error('❌ Failed to create backtesting engine:', error);
  }
}

/**
 * Run the examples
 */
async function main() {
  console.log('🎯 Backtesting Integration Examples');
  console.log('===================================\n');

  // Example 1: Create engine
  await createEngineExample();
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Example 2: Run complete backtest
  await runExampleBacktest();
}

// Run examples if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  runExampleBacktest,
  createEngineExample,
  SimpleMovingAverageStrategy
};