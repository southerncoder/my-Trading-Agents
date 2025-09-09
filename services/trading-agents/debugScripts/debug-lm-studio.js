// Debug the LM Studio connectivity issue
console.log('=== DEBUGGING LM STUDIO CONNECTIVITY ===');

async function testLMStudioConnection() {
  try {
    console.log('1. Checking environment variables...');
    console.log('LLM_PROVIDER:', process.env.LLM_PROVIDER);
    console.log('LM_STUDIO_HOST:', process.env.LM_STUDIO_HOST);
    console.log('LLM_BACKEND_URL:', process.env.LLM_BACKEND_URL);
    
    console.log('\n2. Testing LM Studio endpoint connectivity...');
    const url = process.env.LLM_BACKEND_URL || 'http://your_host_ip:1234/v1';
    
    // Test basic connectivity
    try {
      const response = await fetch(`${url}/models`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (response.ok) {
        const models = await response.json();
        console.log('✅ LM Studio is accessible!');
        console.log('Available models:', models);
      } else {
        console.log('❌ LM Studio responded with error:', response.status, response.statusText);
      }
    } catch (fetchError) {
      console.log('❌ Cannot connect to LM Studio:', fetchError.message);
      console.log('This is likely why the agents are not responding!');
      
      // Suggest fixes
      console.log('\n🔧 POSSIBLE FIXES:');
      console.log('1. Start LM Studio on the specified host (your_host_ip:1234)');
      console.log('2. Change to OpenAI by setting: LLM_PROVIDER=openai and adding OPENAI_API_KEY');
      console.log('3. Use local LM Studio: LM_STUDIO_HOST=localhost');
      console.log('4. Check network connectivity to your_host_ip');
    }
    
    console.log('\n3. Testing alternative provider configurations...');
    
    // Check if OpenAI key is available as fallback
    if (process.env.OPENAI_API_KEY) {
      console.log('✅ OPENAI_API_KEY is available as fallback');
    } else {
      console.log('❌ No OPENAI_API_KEY available');
    }
    
    if (process.env.ANTHROPIC_API_KEY) {
      console.log('✅ ANTHROPIC_API_KEY is available as fallback');
    } else {
      console.log('❌ No ANTHROPIC_API_KEY available');
    }
    
  } catch (error) {
    console.error('❌ Failed to test LM Studio connection:', error);
  }
}

// Run the test
testLMStudioConnection().then(() => {
  console.log('\n=== CONNECTION TEST COMPLETED ===');
}).catch(error => {
  console.error('Connection test failed:', error);
});