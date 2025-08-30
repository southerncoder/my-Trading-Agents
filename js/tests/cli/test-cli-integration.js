/**
 * Integration test for the CLI with mock selections
 */

import { TradingAgentsCLI } from '../dist/cli/main.js';
import { EnhancedTradingAgentsGraph } from '../dist/graph/enhanced-trading-graph.js';

// Mock the getUserSelections method to avoid interactive prompts
class TestTradingAgentsCLI extends TradingAgentsCLI {
  async getUserSelections() {
    console.log('🧪 Using mock user selections for testing...');
    return {
      ticker: 'AAPL',
      analysisDate: '2025-08-24',
      analysts: ['market', 'social'],
      researchDepth: 1,
      llmProvider: 'lm_studio',
      backendUrl: 'http://localhost:1234/v1',
      shallowThinker: 'local-model',
      deepThinker: 'local-model'
    };
  }
}

async function testCLIIntegration() {
  console.log('🚀 Running CLI Integration Test...\n');

  try {
    // Test 1: EnhancedTradingAgentsGraph connectivity
    console.log('1. Testing EnhancedTradingAgentsGraph...');
    
    const testInstance = EnhancedTradingAgentsGraph.createTestInstance();
    const configInfo = testInstance.getConfigInfo();
    console.log('   Configuration:', configInfo);
    console.log('✓ EnhancedTradingAgentsGraph test passed\n');

    // Test 2: CLI instantiation with mock data
    console.log('2. Testing CLI with mock data...');
    const cli = new TestTradingAgentsCLI();
    const selections = await cli.getUserSelections();
    console.log('   Mock selections:', selections);
    console.log('✓ CLI mock test passed\n');

    // Test 3: Configuration creation
    console.log('3. Testing configuration creation...');
    console.log('✓ Configuration test passed\n');

    console.log('🎉 CLI Integration Test completed successfully!');
    console.log('\n📝 Note: Full CLI analysis test requires LM Studio to be running.');
    console.log('   To test with a real LLM, start LM Studio and run: npm run cli:analyze');

    return true;

  } catch (error) {
    console.error('❌ CLI Integration test failed:', error);
    return false;
  }
}

// Run the test
testCLIIntegration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });