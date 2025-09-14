/**
 * LangChain + LM Studio Integration Test  
 * Tests LangChain ChatOpenAI with LM Studio configuration
 */

async function testLangChainIntegration() {
  console.log('🔗 Testing LangChain + LM Studio Integration');
  console.log('='.repeat(50));
  
  try {
    console.log('📦 Importing ChatOpenAI...');
    const { ChatOpenAI } = await import('@langchain/openai');
    
    console.log('🔧 Creating ChatOpenAI instance for LM Studio...');
    const model = new ChatOpenAI({
      modelName: 'microsoft/phi-4-mini-reasoning',
      openAIApiKey: 'not-needed-for-local',
      configuration: {
        baseURL: 'http://localhost:1234/v1'
      },
      temperature: 0.1,
      maxTokens: 100,
      timeout: 30000 // 30 second timeout
    });
    
    console.log('💬 Testing simple invoke...');
    const startTime = Date.now();
    
    const response = await model.invoke([
      { role: 'user', content: 'Say "LangChain + LM Studio working!" in exactly those words.' }
    ]);
    
    const duration = Date.now() - startTime;
    
    console.log('✅ LangChain integration successful!');
    console.log(`⏱️  Response time: ${duration}ms`);
    console.log(`📝 Response: "${response.content}"`);
    
    return { success: true, model, duration };
  } catch (error) {
    console.log(`❌ LangChain integration failed: ${error.message}`);
    console.log(`📋 Error type: ${error.constructor.name}`);
    
    if (error.message.includes('timeout')) {
      console.log('⏰ This appears to be a timeout issue');
      console.log('💡 The model might be slow or busy');
    }
    
    return { success: false, model: null, error };
  }
}

async function testModelProviderWrapper() {
  console.log('\n🏭 Testing ModelProvider Wrapper');
  console.log('='.repeat(50));
  
  try {
    console.log('📦 Importing ModelProvider...');
    const { ModelProvider } = await import('../../dist/models/provider.js');
    
    console.log('🔧 Creating model with extended timeout...');
    const config = {
      provider: 'remote_lmstudio',
      modelName: 'microsoft/phi-4-mini-reasoning',
      baseURL: 'http://localhost:1234/v1',
      temperature: 0.1,
      maxTokens: 100,
      timeout: 60000 // 60 second timeout
    };
    
    const model = ModelProvider.createModel(config);
    
    console.log('💬 Testing ModelProvider invoke...');
    const startTime = Date.now();
    
    const response = await model.invoke([
      { role: 'user', content: 'Respond with "ModelProvider test successful"' }
    ]);
    
    const duration = Date.now() - startTime;
    
    console.log('✅ ModelProvider test successful!');
    console.log(`⏱️  Response time: ${duration}ms`);
    console.log(`📝 Response: "${response.content}"`);
    
    return { success: true, duration };
  } catch (error) {
    console.log(`❌ ModelProvider test failed: ${error.message}`);
    console.log(`📋 Error details: ${error.stack}`);
    return { success: false, error };
  }
}

async function runLangChainTest() {
  console.log('🚀 LANGCHAIN + LM STUDIO INTEGRATION TEST');
  console.log('Testing LangChain wrapper with microsoft/phi-4-mini-reasoning');
  console.log('='.repeat(60));
  
  // Test 1: Direct LangChain integration
  const langchainResult = await testLangChainIntegration();
  
  // Test 2: ModelProvider wrapper
  const providerResult = await testModelProviderWrapper();
  
  // Summary
  console.log('\n📊 INTEGRATION TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`🔗 LangChain Direct: ${langchainResult.success ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`🏭 ModelProvider: ${providerResult.success ? '✅ WORKING' : '❌ FAILED'}`);
  
  if (langchainResult.success && providerResult.success) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✨ LangChain + LM Studio integration is working correctly');
    console.log('⚡ Ready to test agents with longer timeouts');
    
    const avgTime = ((langchainResult.duration + providerResult.duration) / 2);
    console.log(`📊 Average response time: ${avgTime.toFixed(0)}ms`);
    
    if (avgTime > 10000) {
      console.log('⚠️  Response times are slow (>10s)');
      console.log('💡 Consider using a faster model or increasing timeouts');
    }
  } else {
    console.log('\n❌ INTEGRATION ISSUES DETECTED');
    
    if (!langchainResult.success) {
      console.log('🔧 LangChain integration failed - check configuration');
    }
    
    if (!providerResult.success) {
      console.log('🔧 ModelProvider failed - check wrapper implementation');
    }
  }
  
  return langchainResult.success && providerResult.success;
}

// Run test
runLangChainTest()
  .then(success => {
    console.log(`\n🏁 Integration test ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
  });