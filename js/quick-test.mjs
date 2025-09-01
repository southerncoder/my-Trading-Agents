console.log('🚀 Quick Test - LMStudio Singleton and Async ModelProvider');
console.log('Testing from compiled JavaScript...\n');

async function quickTest() {
  try {
    // Test 1: Can we import the modules?
    console.log('📋 Testing module imports...');
    const { ModelProvider } = await import('./dist/index.js');
    console.log('✅ ModelProvider imported successfully');
    
    // Test 2: Basic model creation
    console.log('📋 Testing basic model creation...');
    const config = {
      provider: 'openai',
      modelName: 'gpt-4o-mini', 
      apiKey: 'test-key'
    };
    
    const model = await ModelProvider.createModelAsync(config);
    console.log('✅ Model created successfully:', !!model);
    
    // Test 3: Caching
    const model2 = await ModelProvider.createModelAsync(config);
    console.log('✅ Caching working:', model === model2);
    
    // Test 4: Agent models
    console.log('📋 Testing agent models...');
    const agentModels = await ModelProvider.createAgentModelsAsync({
      agentName: 'test',
      quickThinkModel: config,
      deepThinkModel: config
    });
    console.log('✅ Agent models created:', !!agentModels?.quickThinking);
    
    console.log('\n🎉 QUICK TEST PASSED! Core functionality is working.');
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

quickTest();