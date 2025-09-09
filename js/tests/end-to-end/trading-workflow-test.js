/**
 * Simple Trading Workflow Test
 *
 * Tests the complete trading workflow programmatically
 */

import 'dotenv/config';
import { config } from 'dotenv';

// Load environment configuration
config({ path: '.env.local' });

async function testTradingWorkflow() {
  console.log('🚀 Starting Trading Workflow Test...');

  try {
    // Import the enhanced trading graph and default config
    const { EnhancedTradingAgentsGraph } = await import('../../src/graph/enhanced-trading-graph');
    const { DEFAULT_CONFIG } = await import('../../src/config/default');

    console.log('📊 Testing AAPL analysis...');

    // Create the trading graph with proper configuration structure
    const graph = new EnhancedTradingAgentsGraph({
      config: DEFAULT_CONFIG,
      selectedAnalysts: ['market', 'news', 'fundamentals'],
      enableLangGraph: true,
      llmProvider: 'lm_studio'
    });

    console.log('⏳ Running analysis (this may take a few minutes)...');

    // Run the analysis
    const result = await graph.analyzeAndDecide('AAPL', new Date().toISOString().split('T')[0]);

    console.log('✅ Analysis completed successfully!');
    console.log('📈 Results summary:');

    if (result && typeof result === 'object') {
      // Log key results
      console.log('- Recommendation:', result.recommendation || 'N/A');
      console.log('- Confidence:', result.confidence || 'N/A');
      console.log('- Analysis completed at:', new Date().toISOString());
    } else {
      console.log('- Raw result:', result);
    }

    console.log('🎉 Trading workflow test completed successfully!');

  } catch (error) {
    console.error('❌ Trading workflow test failed:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the test
testTradingWorkflow().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});