/**
 * Simple test to verify position sizing system works
 */

// Import the position sizing system
const { SimplePositionSizer, PositionSizingIntegration } = require('./src/portfolio/simple-position-sizer.ts');

// Test basic functionality
console.log('Testing Position Sizing System...\n');

try {
  // Create a simple position sizer
  const positionSizer = new SimplePositionSizer({
    maxPositionSize: 0.1,
    confidenceThreshold: 0.6
  });

  // Test signal
  const signal = {
    symbol: 'AAPL',
    signal: 'BUY',
    strength: 4, // STRONG
    confidence: 85,
    timestamp: new Date(),
    price: 150.00,
    reasoning: 'Test signal',
    riskLevel: 'MODERATE'
  };

  // Test portfolio
  const portfolio = {
    totalValue: 100000,
    availableCash: 20000,
    holdings: []
  };

  // Test confidence-based sizing
  const positionSize = positionSizer.calculateConfidenceBasedSize(signal, portfolio);
  
  console.log('Position Sizing Test Results:');
  console.log(`Symbol: ${signal.symbol}`);
  console.log(`Portfolio Percentage: ${(positionSize.portfolioPercentage * 100).toFixed(2)}%`);
  console.log(`Dollar Amount: $${positionSize.dollarAmount.toFixed(2)}`);
  console.log(`Shares: ${positionSize.shares}`);
  console.log(`Algorithm: ${positionSize.algorithm}`);
  console.log(`Reasoning: ${positionSize.reasoning}`);
  
  console.log('\n✅ Position sizing system test passed!');

} catch (error) {
  console.error('❌ Position sizing system test failed:', error.message);
  process.exit(1);
}