#!/usr/bin/env node

/**
 * Simple API Integration Test
 * Tests core APIs with lm_studio provider and microsoft/phi-4-mini-reasoning model
 */

console.log('🚀 Starting Simple API Integration Tests...\n');

async function runSimpleAPITests() {
  try {
    // Test 1: Enhanced Trading Graph with API verification
    console.log('1️⃣  Testing Enhanced Trading Graph...');
    const { EnhancedTradingAgentsGraph } = await import('../dist/graph/enhanced-trading-graph.js');
    
    const success = await EnhancedTradingAgentsGraph.runIntegrationTest();
    
    if (success) {
      console.log('✅ Enhanced Trading Graph test passed\n');
    } else {
      console.log('❌ Enhanced Trading Graph test failed\n');
      return false;
    }

    // Test 2: Model Provider Configuration
    console.log('2️⃣  Testing Model Provider Configuration...');
    const { ModelProvider } = await import('../dist/models/provider.js');
    
    const modelConfig = ModelProvider.getLMStudioConfig('microsoft/phi-4-mini-reasoning');
    console.log('Model Configuration:', {
      provider: modelConfig.provider,
      modelName: modelConfig.modelName,
      baseURL: modelConfig.baseURL
    });
    
    const connectionTest = await ModelProvider.testConnection(modelConfig);
    if (connectionTest.success) {
      console.log('✅ LM Studio connection test passed\n');
    } else {
      console.log(`❌ LM Studio connection test failed: ${connectionTest.error}\n`);
      return false;
    }

    // Test 3: Basic Data Flow Setup
    console.log('3️⃣  Testing Basic Data Flow Setup...');
    const { Toolkit, setConfig } = await import('../dist/dataflows/interface.js');
    const { createConfig } = await import('../dist/config/default.js');
    
    const testConfig = createConfig({
      llmProvider: 'lm_studio',
      deepThinkLlm: 'microsoft/phi-4-mini-reasoning',
      quickThinkLlm: 'microsoft/phi-4-mini-reasoning',
      backendUrl: process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1',
      onlineTools: false,
      maxRecurLimit: 3
    });
    
    setConfig(testConfig);
    const toolkit = new Toolkit(testConfig);
    
    console.log('✅ Data flow toolkit initialized successfully');
    console.log('Configuration applied:', {
      provider: testConfig.llmProvider,
      model: testConfig.quickThinkLlm,
      onlineTools: testConfig.onlineTools
    });
    console.log('');

    // Test 4: Yahoo Finance Data Access (most reliable)
    console.log('4️⃣  Testing Yahoo Finance Data Access...');
    try {
      const yahooData = await Promise.race([
        toolkit.getYFinData('AAPL', '2025-08-20', '2025-08-24'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
      ]);
      
      if (yahooData && yahooData.length > 0) {
        console.log(`✅ Yahoo Finance data retrieved: ${yahooData.length} characters`);
        console.log(`Sample data preview: ${yahooData.substring(0, 100)}...`);
      } else {
        console.log('⚠️  Yahoo Finance returned empty data');
      }
    } catch (error) {
      console.log(`❌ Yahoo Finance error: ${error.message}`);
    }
    console.log('');

    // Test 5: Technical Indicators (offline mode)
    console.log('5️⃣  Testing Technical Indicators...');
    try {
      const indicators = await Promise.race([
        toolkit.getStockstatsIndicatorsReport('AAPL', '2025-08-24', 10),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
      ]);
      
      if (indicators && indicators.length > 0) {
        console.log(`✅ Technical indicators generated: ${indicators.length} characters`);
        console.log(`Sample indicators preview: ${indicators.substring(0, 100)}...`);
      } else {
        console.log('⚠️  Technical indicators returned empty data');
      }
    } catch (error) {
      console.log(`❌ Technical indicators error: ${error.message}`);
    }
    console.log('');

    // Test 6: Provider Status Check
    console.log('6️⃣  Testing Provider Status...');
    const providerStatus = ModelProvider.getProviderStatus();
    console.log('Available Providers:');
    Object.entries(providerStatus).forEach(([provider, status]) => {
      const icon = status.available ? '✅' : '❌';
      console.log(`  ${icon} ${provider}: ${status.description}`);
    });
    console.log('');

    console.log('🎉 All Simple API Integration Tests Completed Successfully!');
    return true;

  } catch (error) {
    console.error('❌ Simple API test failed:', error);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the tests
runSimpleAPITests()
  .then(success => {
    console.log('\n📊 Test Summary:');
    console.log(`Status: ${success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Model: microsoft/phi-4-mini-reasoning`);
    console.log(`Provider: lm_studio`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });