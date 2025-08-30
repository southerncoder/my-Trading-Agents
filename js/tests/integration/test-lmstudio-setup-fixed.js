/**
 * Fixed LM Studio Setup Verification
 * Checks if LM Studio is running and accessible before running agent tests
 */

async function checkLMStudioServer() {
  console.log('🔍 Checking LM Studio Server Status...');
  console.log('-'.repeat(40));
  
  try {
    console.log('📡 Testing connection to http://localhost:1234/v1/models');
    
    const response = await fetch('http://localhost:1234/v1/models', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const models = await response.json();
      console.log('✅ LM Studio server is running');
      console.log(`📊 Status: ${response.status} ${response.statusText}`);
      
      if (models.data && models.data.length > 0) {
        console.log(`🤖 Available models: ${models.data.length}`);
        for (const model of models.data) {
          console.log(`   - ${model.id}`);
          if (model.id.includes('phi-4')) {
            console.log('   ✅ Found phi-4 model!');
          }
        }
      } else {
        console.log('⚠️  No models loaded');
      }
      return true;
    } else {
      console.log(`❌ Server responded with error: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('❌ Connection timeout');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('❌ Connection refused - LM Studio server not running');
    } else {
      console.log(`❌ Connection error: ${error.message}`);
    }
    return false;
  }
}

async function testHealthEndpoint() {
  console.log('\n🏥 Testing Health Endpoint...');
  console.log('-'.repeat(40));
  
  try {
    const response = await fetch('http://localhost:1234/health', {
      method: 'GET'
    });
    
    if (response.ok) {
      console.log('✅ Health endpoint responding');
      return true;
    } else {
      console.log(`⚠️  Health endpoint returned: ${response.status}`);
      return true; // Still consider it working if we get a response
    }
  } catch (error) {
    console.log('ℹ️  Health endpoint not available (this is normal)');
    return true; // Not all LM Studio versions have health endpoint
  }
}

async function testSimpleCompletion() {
  console.log('\n💬 Testing Simple Completion...');
  console.log('-'.repeat(40));
  
  try {
    console.log('📤 Sending test completion request...');
    
    const response = await fetch('http://localhost:1234/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'microsoft/phi-4-mini-reasoning',
        messages: [
          { role: 'user', content: 'Hello! Please respond with exactly "Test successful"' }
        ],
        max_tokens: 50,
        temperature: 0.1
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Completion successful');
      
      if (result.choices && result.choices.length > 0) {
        const message = result.choices[0].message.content;
        console.log(`📝 Response: "${message}"`);
        console.log(`📊 Usage: ${result.usage?.total_tokens || 'N/A'} tokens`);
        return true;
      } else {
        console.log('⚠️  Empty response from model');
        return false;
      }
    } else {
      const errorText = await response.text();
      console.log(`❌ Completion failed: ${response.status} ${response.statusText}`);
      console.log(`📋 Error details: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Completion error: ${error.message}`);
    return false;
  }
}

async function generateSetupInstructions() {
  console.log('\n📋 LM Studio Setup Instructions');
  console.log('='.repeat(50));
  console.log('1. 📥 Download and install LM Studio from: https://lmstudio.ai');
  console.log('2. 🚀 Launch LM Studio application');
  console.log('3. 🔍 Search for "microsoft/phi-4-mini-reasoning" in the model catalog');
  console.log('4. ⬇️  Download the microsoft/phi-4-mini-reasoning model');
  console.log('5. 🖥️  Go to "Local Server" tab in LM Studio');
  console.log('6. ✅ Select microsoft/phi-4-mini-reasoning as the loaded model');
  console.log('7. ▶️  Click "Start Server" (should start on port 1234)');
  console.log('8. 🌐 Verify server shows "Server running on http://localhost:1234"');
  console.log('9. 🔁 Re-run this test');
  console.log('\n💡 Alternative models if phi-4-mini-reasoning is not available:');
  console.log('   - microsoft/phi-3-mini-4k-instruct');
  console.log('   - llama-3.2-3b-instruct');
  console.log('   - qwen2.5-3b-instruct');
}

async function runSetupVerification() {
  console.log('🚀 LM STUDIO SETUP VERIFICATION');
  console.log('Checking if LM Studio is ready for agent testing');
  console.log('='.repeat(60));
  
  let allPassed = true;
  
  // Test 1: Check server
  const serverOk = await checkLMStudioServer();
  if (!serverOk) allPassed = false;
  
  // Test 2: Check health (optional)
  const healthOk = await testHealthEndpoint();
  if (!healthOk) allPassed = false;
  
  // Test 3: Test completion
  const completionOk = await testSimpleCompletion();
  if (!completionOk) allPassed = false;
  
  // Summary
  console.log('\n📊 VERIFICATION RESULTS');
  console.log('='.repeat(50));
  console.log(`🖥️  Server Status: ${serverOk ? '✅ RUNNING' : '❌ NOT RUNNING'}`);
  console.log(`🏥 Health Check: ${healthOk ? '✅ OK' : '❌ FAILED'}`);
  console.log(`💬 Model Test: ${completionOk ? '✅ WORKING' : '❌ FAILED'}`);
  
  if (allPassed) {
    console.log('\n🎉 LM STUDIO IS READY!');
    console.log('✨ microsoft/phi-4-mini-reasoning is working correctly');
    console.log('🚀 You can now run agent integration tests:');
    console.log('   npm run test-agent-validation');
    console.log('   npm run test-agent-integration');
    console.log('   npm run test-agent-performance');
  } else {
    console.log('\n⚠️  SETUP INCOMPLETE');
    await generateSetupInstructions();
  }
  
  return allPassed;
}

// Run test
runSetupVerification()
  .then(success => {
    console.log(`\n🏁 Setup verification ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Verification failed:', error);
    process.exit(1);
  });