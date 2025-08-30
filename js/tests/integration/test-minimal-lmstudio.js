/**
 * Minimal LM Studio Connection Test
 * Simple test to verify LM Studio connectivity before running complex agent tests
 */

import { ChatOpenAI } from '@langchain/openai';

async function testBasicConnection() {
  console.log('🔍 Basic LM Studio Connection Test');
  console.log('='.repeat(40));
  
  try {
    // Create direct OpenAI-compatible client for LM Studio
    const model = new ChatOpenAI({
      modelName: 'microsoft/phi-4-mini-reasoning',
      openAIApiKey: 'not-needed-for-local',
      configuration: {
        baseURL: process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1'
      },
      temperature: 0.3,
      maxTokens: 100,
      timeout: 10000
    });

    console.log(`🌐 Connecting to LM Studio at ${process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1'}`);
    console.log('🤖 Model: microsoft/phi-4-mini-reasoning');
    
    const startTime = Date.now();
    const response = await model.invoke([
      { role: 'user', content: 'Please respond with exactly: "LM Studio connection successful"' }
    ]);
    
    const duration = Date.now() - startTime;
    
    console.log('✅ Connection successful!');
    console.log(`⏱️  Response time: ${duration}ms`);
    console.log(`📝 Response: "${response.content}"`);
    
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('💡 Troubleshooting checklist:');
    console.error('   1. ✅ LM Studio is running');
    console.error(`   2. ✅ Server is on ${process.env.LM_STUDIO_BASE_URL?.replace('/v1', '') || 'http://localhost:1234'}`);
    console.error('   3. ✅ Model microsoft/phi-4-mini-reasoning is loaded');
    console.error('   4. ✅ Model is not busy processing another request');
    console.error('\n🔧 In LM Studio:');
    console.error('   - Go to Local Server tab');
    console.error('   - Start server on port 1234');
    console.error('   - Load microsoft/phi-4-mini-reasoning model');
    console.error('   - Ensure "Cross-Origin-Requests" is enabled if needed');
    
    return false;
  }
}

async function testModelProvider() {
  console.log('\n🏭 Model Provider Test');
  console.log('='.repeat(40));
  
  try {
    // Import our model provider
    const { ModelProvider } = await import('../dist/models/provider.js');
    
    const config = {
      provider: 'lm_studio',
      modelName: 'microsoft/phi-4-mini-reasoning',
      baseURL: process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1',
      temperature: 0.3,
      maxTokens: 100
    };
    
    console.log('🔧 Creating model with ModelProvider...');
    const model = ModelProvider.createModel(config);
    
    const startTime = Date.now();
    const response = await model.invoke([
      { role: 'user', content: 'Say "ModelProvider working"' }
    ]);
    
    const duration = Date.now() - startTime;
    
    console.log('✅ ModelProvider test successful!');
    console.log(`⏱️  Response time: ${duration}ms`);
    console.log(`📝 Response: "${response.content}"`);
    
    return true;
  } catch (error) {
    console.error('❌ ModelProvider test failed:', error.message);
    console.error('   Error details:', error.stack);
    return false;
  }
}

async function runMinimalTest() {
  console.log('🚀 MINIMAL LM STUDIO CONNECTIVITY TEST');
  console.log('Testing microsoft/phi-4-mini-reasoning');
  console.log('='.repeat(50));
  
  let allPassed = true;
  
  // Test 1: Basic connection
  const basicConnection = await testBasicConnection();
  if (!basicConnection) allPassed = false;
  
  // Test 2: Model provider
  const modelProvider = await testModelProvider();
  if (!modelProvider) allPassed = false;
  
  // Summary
  console.log('\n📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`🔗 Basic Connection: ${basicConnection ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🏭 Model Provider: ${modelProvider ? '✅ PASS' : '❌ FAIL'}`);
  
  if (allPassed) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✨ LM Studio is ready for agent testing');
    console.log('🚀 Run: npm run test-agent-validation');
  } else {
    console.log('\n⚠️  TESTS FAILED');
    console.log('🔧 Fix LM Studio setup before running agent tests');
  }
  
  return allPassed;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMinimalTest()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('💥 Critical error:', error);
      process.exit(1);
    });
}

export { runMinimalTest };