#!/usr/bin/env node

/**
 * Minimal API Integration Test
 * Quick verification of core components with remote_lmstudio and microsoft/phi-4-mini-reasoning
 */

console.log('🔧 Minimal API Integration Test');
console.log('Model: microsoft/phi-4-mini-reasoning');
console.log('Provider: remote_lmstudio');
console.log('================================\n');

async function runMinimalTest() {
  const results = [];

  // Test 1: Model Provider Import
  console.log('1. Testing Model Provider Import...');
  try {
    const { ModelProvider } = await import('../dist/models/provider.js');
    console.log('   ✅ ModelProvider imported successfully');
    results.push({ test: 'ModelProvider Import', success: true });
    
    // Test provider status
    const status = ModelProvider.getProviderStatus();
    console.log('   📊 LM Studio available:', status.remote_lmstudio?.available || false);
    
  } catch (error) {
    console.log('   ❌ ModelProvider import failed:', error.message);
    results.push({ test: 'ModelProvider Import', success: false, error: error.message });
  }

  // Test 2: Enhanced Trading Graph Import
  console.log('\n2. Testing Enhanced Trading Graph Import...');
  try {
    const { EnhancedTradingAgentsGraph } = await import('../dist/graph/enhanced-trading-graph.js');
    console.log('   ✅ EnhancedTradingAgentsGraph imported successfully');
    results.push({ test: 'Enhanced Graph Import', success: true });
    
    // Test createTestInstance method
    const graph = EnhancedTradingAgentsGraph.createTestInstance();
    const config = graph.getConfigInfo();
    console.log('   📊 Test instance config:', {
      provider: config.llmProvider,
      model: config.quickThinkLlm || config.deepThinkLlm,
      langGraph: config.langGraphEnabled
    });
    
  } catch (error) {
    console.log('   ❌ Enhanced Trading Graph import failed:', error.message);
    results.push({ test: 'Enhanced Graph Import', success: false, error: error.message });
  }

  // Test 3: Dataflows Interface Import
  console.log('\n3. Testing Dataflows Interface Import...');
  try {
    const { Toolkit, setConfig } = await import('../dist/dataflows/interface.js');
    const { createConfig } = await import('../dist/config/default.js');
    console.log('   ✅ Dataflows interface imported successfully');
    results.push({ test: 'Dataflows Import', success: true });
    
    // Test config creation
    const testConfig = createConfig({
      llmProvider: 'remote_lmstudio',
      quickThinkLlm: 'microsoft/phi-4-mini-reasoning',
      onlineTools: false
    });
    console.log('   📊 Config created with provider:', testConfig.llmProvider);
    
  } catch (error) {
    console.log('   ❌ Dataflows interface import failed:', error.message);
    results.push({ test: 'Dataflows Import', success: false, error: error.message });
  }

  // Test 4: Simple Model Configuration Test
  console.log('\n4. Testing Model Configuration...');
  try {
    const { ModelProvider } = await import('../dist/models/provider.js');
    
    const modelConfig = {
      provider: 'remote_lmstudio',
      modelName: 'microsoft/phi-4-mini-reasoning',
      baseURL: 'http://localhost:1234/v1',
      temperature: 0.7,
      maxTokens: 1024
    };
    
    console.log('   📋 Model configuration prepared:', {
      provider: modelConfig.provider,
      model: modelConfig.modelName,
      url: modelConfig.baseURL
    });
    
    // Quick validation (without actual connection)
    const validation = ModelProvider.validateConfig(modelConfig);
    if (validation.isValid) {
      console.log('   ✅ Model configuration is valid');
      results.push({ test: 'Model Configuration', success: true });
    } else {
      console.log('   ❌ Model configuration invalid:', validation.errors);
      results.push({ test: 'Model Configuration', success: false, error: validation.errors.join(', ') });
    }
    
  } catch (error) {
    console.log('   ❌ Model configuration test failed:', error.message);
    results.push({ test: 'Model Configuration', success: false, error: error.message });
  }

  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  const passRate = Math.round((passed / total) * 100);
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.test}`);
    if (!result.success && result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log(`\nOverall: ${passed}/${total} tests passed (${passRate}%)`);
  
  if (passRate >= 75) {
    console.log('🎉 System ready for API integration testing!');
    return true;
  } else {
    console.log('⚠️  System needs attention before full API testing');
    return false;
  }
}

// Run the minimal test
runMinimalTest()
  .then(success => {
    console.log(`\n🏁 Test completed: ${success ? 'SUCCESS' : 'NEEDS_ATTENTION'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test runner failed:', error.message);
    process.exit(1);
  });