/**
 * Simple LM Studio API Test
 * Direct API test without complex imports
 */

async function simpleLMStudioTest() {
  console.log('🔍 Simple LM Studio API Test');
  console.log('='.repeat(40));
  
  try {
    // Use Node.js built-in fetch (Node 18+)
    const response = await fetch('http://localhost:1234/v1/models', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ LM Studio API is responding!');
      console.log(`📊 Status: ${response.status}`);
      console.log(`🤖 Models available: ${data.data?.length || 0}`);
      
      if (data.data) {
        for (const model of data.data) {
          console.log(`   - ${model.id}`);
        }
      }
      return true;
    } else {
      console.log(`❌ API error: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Connection failed: ${error.message}`);
    return false;
  }
}

async function testCompletion() {
  console.log('\n💬 Testing Chat Completion');
  console.log('='.repeat(40));
  
  try {
    const response = await fetch('http://localhost:1234/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'microsoft/phi-4-mini-reasoning',
        messages: [{ role: 'user', content: 'Say "Hello from LM Studio!"' }],
        max_tokens: 20,
        temperature: 0.1
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Chat completion successful!');
      
      if (data.choices && data.choices.length > 0) {
        console.log(`📝 Response: "${data.choices[0].message.content}"`);
        console.log(`📊 Tokens used: ${data.usage?.total_tokens || 'N/A'}`);
      }
      return true;
    } else {
      const errorText = await response.text();
      console.log(`❌ Completion failed: ${response.status}`);
      console.log(`📋 Error: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Completion error: ${error.message}`);
    return false;
  }
}

async function runSimpleTest() {
  console.log('🚀 SIMPLE LM STUDIO API TEST');
  console.log('Testing microsoft/phi-4-mini-reasoning');
  console.log('='.repeat(50));

  const modelsOk = await simpleLMStudioTest();
  
  if (modelsOk) {
    const completionOk = await testCompletion();
    
    console.log('\n📊 Results Summary');
    console.log('='.repeat(50));
    console.log(`🔗 API Connection: ${modelsOk ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`💬 Chat Completion: ${completionOk ? '✅ WORKING' : '❌ FAILED'}`);
    
    if (modelsOk && completionOk) {
      console.log('\n🎉 SUCCESS! LM Studio API is fully functional');
      console.log('✨ Ready to test agents!');
    } else {
      console.log('\n⚠️  Issues detected with LM Studio API');
    }
    
    return modelsOk && completionOk;
  } else {
    console.log('\n❌ Cannot test completion - API connection failed');
    return false;
  }
}

// Run test
runSimpleTest()
  .then(success => {
    console.log(`\n🏁 Test ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
  });