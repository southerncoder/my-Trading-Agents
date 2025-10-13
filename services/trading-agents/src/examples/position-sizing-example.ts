/**
 * Position Sizing Integration Example
 * 
 * This example demonstrates how to integrate the position sizing system
 * with the existing trading workflow.
 */

import { 
  SimplePositionSizer, 
  PositionSizingIntegration, 
  SimplePortfolio,
  EnhancedTradingSignal
} from '../portfolio/simple-position-sizer';
import { TradingSignal, SignalType, SignalStrength, RiskLevel } from '../strategies/base-strategy';
import { PortfolioHolding } from '../portfolio/modern-portfolio-theory';

/**
 * Example: Basic Position Sizing
 */
export function basicPositionSizingExample() {
  console.log('=== Basic Position Sizing Example ===\n');

  // Create a position sizer
  const positionSizer = new SimplePositionSizer({
    maxPositionSize: 0.15,      // 15% max position
    maxPortfolioRisk: 0.02,     // 2% max portfolio risk
    kellyFraction: 0.25,        // 25% of Kelly
    confidenceThreshold: 0.6    // 60% confidence threshold
  });

  // Example trading signal
  const signal: TradingSignal = {
    symbol: 'AAPL',
    signal: SignalType.BUY,
    strength: SignalStrength.STRONG,
    confidence: 85,
    timestamp: new Date(),
    price: 150.00,
    reasoning: 'Strong technical breakout with high volume',
    riskLevel: RiskLevel.MODERATE
  };

  // Example portfolio
  const portfolio: SimplePortfolio = {
    totalValue: 100000,
    availableCash: 20000,
    holdings: [
      {
        symbol: 'MSFT',
        quantity: 100,
        average_cost: 300,
        current_price: 320,
        weight: 0.32
      },
      {
        symbol: 'GOOGL',
        quantity: 50,
        average_cost: 2500,
        current_price: 2600,
        weight: 0.13
      }
    ] as PortfolioHolding[]
  };

  // Calculate position sizes using different algorithms
  console.log('Trading Signal:', signal.symbol, signal.signal, `${signal.confidence}% confidence`);
  console.log('Portfolio Value:', `$${portfolio.totalValue.toLocaleString()}`);
  console.log('Available Cash:', `$${portfolio.availableCash.toLocaleString()}\n`);

  // Kelly Criterion
  const kellySize = positionSizer.calculateKellySize(signal, portfolio, 0.65, 0.12, 0.08);
  console.log('Kelly Criterion:');
  console.log(`  Position Size: ${(kellySize.portfolioPercentage * 100).toFixed(2)}%`);
  console.log(`  Dollar Amount: $${kellySize.dollarAmount.toFixed(2)}`);
  console.log(`  Shares: ${kellySize.shares}`);
  console.log(`  Reasoning: ${kellySize.reasoning}\n`);

  // Risk Parity
  const riskParitySize = positionSizer.calculateRiskParitySize(signal, portfolio);
  console.log('Risk Parity:');
  console.log(`  Position Size: ${(riskParitySize.portfolioPercentage * 100).toFixed(2)}%`);
  console.log(`  Dollar Amount: $${riskParitySize.dollarAmount.toFixed(2)}`);
  console.log(`  Shares: ${riskParitySize.shares}`);
  console.log(`  Reasoning: ${riskParitySize.reasoning}\n`);

  // Volatility Adjusted
  const volatilitySize = positionSizer.calculateVolatilityAdjustedSize(signal, portfolio, 0.25);
  console.log('Volatility Adjusted:');
  console.log(`  Position Size: ${(volatilitySize.portfolioPercentage * 100).toFixed(2)}%`);
  console.log(`  Dollar Amount: $${volatilitySize.dollarAmount.toFixed(2)}`);
  console.log(`  Shares: ${volatilitySize.shares}`);
  console.log(`  Reasoning: ${volatilitySize.reasoning}\n`);

  // Confidence Based
  const confidenceSize = positionSizer.calculateConfidenceBasedSize(signal, portfolio, 0.75);
  console.log('Confidence Based:');
  console.log(`  Position Size: ${(confidenceSize.portfolioPercentage * 100).toFixed(2)}%`);
  console.log(`  Dollar Amount: $${confidenceSize.dollarAmount.toFixed(2)}`);
  console.log(`  Shares: ${confidenceSize.shares}`);
  console.log(`  Reasoning: ${confidenceSize.reasoning}\n`);

  // Apply risk limits
  const constrainedSize = positionSizer.enforceRiskLimits(kellySize, portfolio, 0.12);
  console.log('Risk-Constrained Kelly:');
  console.log(`  Position Size: ${(constrainedSize.portfolioPercentage * 100).toFixed(2)}%`);
  console.log(`  Dollar Amount: $${constrainedSize.dollarAmount.toFixed(2)}`);
  console.log(`  Shares: ${constrainedSize.shares}`);
  console.log(`  Reasoning: ${constrainedSize.reasoning}\n`);
}

/**
 * Example: Workflow Integration
 */
export function workflowIntegrationExample() {
  console.log('=== Workflow Integration Example ===\n');

  // Create position sizing integration
  const integration = new PositionSizingIntegration({
    maxPositionSize: 0.12,
    confidenceThreshold: 0.65
  });

  // Multiple trading signals from different strategies
  const signals: TradingSignal[] = [
    {
      symbol: 'AAPL',
      signal: SignalType.BUY,
      strength: SignalStrength.STRONG,
      confidence: 88,
      timestamp: new Date(),
      price: 150.00,
      reasoning: 'Technical breakout with momentum',
      riskLevel: RiskLevel.MODERATE
    },
    {
      symbol: 'TSLA',
      signal: SignalType.BUY,
      strength: SignalStrength.MODERATE,
      confidence: 72,
      timestamp: new Date(),
      price: 200.00,
      reasoning: 'Earnings beat expectations',
      riskLevel: RiskLevel.HIGH
    },
    {
      symbol: 'NVDA',
      signal: SignalType.SELL,
      strength: SignalStrength.WEAK,
      confidence: 55,
      timestamp: new Date(),
      price: 400.00,
      reasoning: 'Overbought conditions',
      riskLevel: RiskLevel.LOW
    }
  ];

  // Portfolio state
  const portfolio: SimplePortfolio = {
    totalValue: 250000,
    availableCash: 50000,
    holdings: [
      {
        symbol: 'SPY',
        quantity: 200,
        average_cost: 400,
        current_price: 420,
        weight: 0.336
      },
      {
        symbol: 'QQQ',
        quantity: 150,
        average_cost: 300,
        current_price: 320,
        weight: 0.192
      },
      {
        symbol: 'VTI',
        quantity: 100,
        average_cost: 200,
        current_price: 210,
        weight: 0.084
      }
    ] as PortfolioHolding[]
  };

  console.log('Processing multiple trading signals...\n');
  console.log('Portfolio Value:', `$${portfolio.totalValue.toLocaleString()}`);
  console.log('Current Holdings:', portfolio.holdings.length);
  console.log('Available Cash:', `$${portfolio.availableCash.toLocaleString()}\n`);

  // Generate enhanced signals with position sizing
  const enhancedSignals = integration.generateRecommendations(signals, portfolio);

  enhancedSignals.forEach((enhancedSignal, index) => {
    console.log(`Signal ${index + 1}: ${enhancedSignal.symbol} ${enhancedSignal.signal}`);
    console.log(`  Confidence: ${enhancedSignal.confidence}%`);
    console.log(`  Risk Level: ${enhancedSignal.riskLevel}`);
    
    if (enhancedSignal.positionSizeRecommendation) {
      console.log(`  Recommended Size: ${(enhancedSignal.positionSizeRecommendation.portfolioPercentage * 100).toFixed(2)}%`);
      console.log(`  Dollar Amount: $${enhancedSignal.positionSizeRecommendation.dollarAmount.toFixed(2)}`);
      console.log(`  Shares: ${enhancedSignal.positionSizeRecommendation.shares}`);
      console.log(`  Algorithm: ${enhancedSignal.positionSizeRecommendation.algorithm}`);
    }
    
    if (enhancedSignal.portfolioImpact) {
      console.log(`  Risk Increase: ${(enhancedSignal.portfolioImpact.riskIncrease * 100).toFixed(2)}%`);
      console.log(`  Concentration Risk: ${(enhancedSignal.portfolioImpact.concentrationRisk * 100).toFixed(2)}%`);
    }
    
    console.log('');
  });
}

/**
 * Example: Portfolio Rebalancing
 */
export function rebalancingExample() {
  console.log('=== Portfolio Rebalancing Example ===\n');

  const positionSizer = new SimplePositionSizer();

  // Current portfolio with drift
  const portfolio: SimplePortfolio = {
    totalValue: 500000,
    availableCash: 25000,
    holdings: [
      {
        symbol: 'AAPL',
        quantity: 500,
        average_cost: 140,
        current_price: 160,
        weight: 0.16  // Target: 0.12
      },
      {
        symbol: 'MSFT',
        quantity: 200,
        average_cost: 280,
        current_price: 320,
        weight: 0.128 // Target: 0.12
      },
      {
        symbol: 'GOOGL',
        quantity: 80,
        average_cost: 2400,
        current_price: 2600,
        weight: 0.416 // Target: 0.12 (overweight!)
      },
      {
        symbol: 'AMZN',
        quantity: 150,
        average_cost: 120,
        current_price: 130,
        weight: 0.039 // Target: 0.12 (underweight)
      }
    ] as PortfolioHolding[]
  };

  // Target equal weights
  const targetWeights: Record<string, number> = {
    'AAPL': 0.12,
    'MSFT': 0.12,
    'GOOGL': 0.12,
    'AMZN': 0.12
  };

  console.log('Current Portfolio Allocation:');
  portfolio.holdings.forEach(holding => {
    const targetWeight = targetWeights[holding.symbol] || 0;
    console.log(`  ${holding.symbol}: ${(holding.weight * 100).toFixed(2)}% (Target: ${(targetWeight * 100).toFixed(2)}%)`);
  });
  console.log('');

  // Generate rebalancing signals
  const rebalanceSignals = positionSizer.generateRebalancingSignals(
    portfolio,
    targetWeights,
    0.03 // 3% threshold
  );

  console.log('Rebalancing Recommendations:');
  if (rebalanceSignals.length === 0) {
    console.log('  No rebalancing needed - all positions within threshold');
  } else {
    rebalanceSignals.forEach((signal, index) => {
      console.log(`  ${index + 1}. ${signal.symbol}: ${signal.reason}`);
      console.log(`     Adjustment: ${(signal.adjustment * 100).toFixed(2)}%`);
    });
  }
  console.log('');
}

/**
 * Example: Integration with Agent State
 */
export function agentStateIntegrationExample() {
  console.log('=== Agent State Integration Example ===\n');

  // This example shows how position sizing would integrate with the existing
  // agent workflow in Phase 4 (Trading)

  // Simulated agent state data
  const agentContext = {
    company_of_interest: 'AAPL',
    trade_date: '2024-01-15',
    investment_plan: 'Strong buy recommendation based on technical analysis',
    portfolio_value: 150000,
    available_cash: 30000,
    risk_tolerance: 'moderate' as 'conservative' | 'moderate' | 'aggressive'
  };

  // Trading signal from strategy analysis
  const tradingSignal: TradingSignal = {
    symbol: agentContext.company_of_interest,
    signal: SignalType.BUY,
    strength: SignalStrength.STRONG,
    confidence: 82,
    timestamp: new Date(agentContext.trade_date),
    price: 155.50,
    reasoning: agentContext.investment_plan,
    riskLevel: RiskLevel.MODERATE
  };

  // Portfolio context
  const portfolio: SimplePortfolio = {
    totalValue: agentContext.portfolio_value,
    availableCash: agentContext.available_cash,
    holdings: [
      {
        symbol: 'SPY',
        quantity: 100,
        average_cost: 400,
        current_price: 420,
        weight: 0.28
      }
    ] as PortfolioHolding[]
  };

  // Create position sizing integration
  let maxPositionSize = 0.12; // default moderate
  if (agentContext.risk_tolerance === 'conservative') {
    maxPositionSize = 0.08;
  } else if (agentContext.risk_tolerance === 'aggressive') {
    maxPositionSize = 0.15;
  }
  
  const integration = new PositionSizingIntegration({
    maxPositionSize,
    confidenceThreshold: 0.7
  });

  console.log('Agent Context:');
  console.log(`  Company: ${agentContext.company_of_interest}`);
  console.log(`  Trade Date: ${agentContext.trade_date}`);
  console.log(`  Risk Tolerance: ${agentContext.risk_tolerance}`);
  console.log(`  Portfolio Value: $${agentContext.portfolio_value.toLocaleString()}`);
  console.log(`  Available Cash: $${agentContext.available_cash.toLocaleString()}\n`);

  // Enhance signal with position sizing
  const enhancedSignal = integration.enhanceSignal(tradingSignal, portfolio);

  console.log('Enhanced Trading Recommendation:');
  console.log(`  Signal: ${enhancedSignal.signal} ${enhancedSignal.symbol}`);
  console.log(`  Confidence: ${enhancedSignal.confidence}%`);
  console.log(`  Price: $${enhancedSignal.price}`);
  
  if (enhancedSignal.positionSizeRecommendation) {
    console.log(`  Recommended Position: ${(enhancedSignal.positionSizeRecommendation.portfolioPercentage * 100).toFixed(2)}%`);
    console.log(`  Investment Amount: $${enhancedSignal.positionSizeRecommendation.dollarAmount.toFixed(2)}`);
    console.log(`  Shares to Buy: ${enhancedSignal.positionSizeRecommendation.shares}`);
    console.log(`  Algorithm Used: ${enhancedSignal.positionSizeRecommendation.algorithm}`);
    console.log(`  Reasoning: ${enhancedSignal.positionSizeRecommendation.reasoning}`);
  }

  console.log('');
}

/**
 * Run all examples
 */
export function runPositionSizingExamples() {
  console.log('Position Sizing System Examples\n');
  console.log('=====================================\n');

  try {
    basicPositionSizingExample();
    console.log('\n=====================================\n');
    
    workflowIntegrationExample();
    console.log('\n=====================================\n');
    
    rebalancingExample();
    console.log('\n=====================================\n');
    
    agentStateIntegrationExample();
    console.log('\n=====================================\n');
    
    console.log('All examples completed successfully!');
  } catch (error) {
    console.error('Example execution failed:', error);
  }
}

// Export for use in other modules
export {
  SimplePositionSizer,
  PositionSizingIntegration,
  type SimplePortfolio,
  type EnhancedTradingSignal
};