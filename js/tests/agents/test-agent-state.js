/**
 * Simple Agent State Test
 * Figure out the correct state structure for agents
 */

async function testSingleAgent() {
  console.log('🔬 AGENT STATE STRUCTURE TEST');
  console.log('='.repeat(50));
  
  try {
    // Import model and agent
    const { ModelProvider } = await import('../dist/models/provider.js');
    const agentModule = await import('../dist/agents/analysts/market-analyst.js');
    const MarketAnalyst = agentModule.MarketAnalyst;
    
    // Create model
    const model = ModelProvider.createModel({
      provider: 'lm_studio',
      modelName: 'microsoft/phi-4-mini-reasoning',
      baseURL: 'http://localhost:1234/v1',
      temperature: 0.1,
      maxTokens: 150,
      timeout: 60000
    });
    
    // Create agent
    const agent = new MarketAnalyst(model, []);
    
    console.log('✅ Agent created successfully');
    console.log(`📋 Agent name: ${agent.name}`);
    console.log(`📝 Agent description: ${agent.description}`);
    
    // Test different state structures
    const testStates = [
      {
        name: 'Basic state with messages array',
        state: {
          messages: [],
          company_of_interest: 'AAPL',
          trade_date: new Date().toISOString()
        }
      },
      {
        name: 'State with input message',
        state: {
          messages: [{ role: 'user', content: 'Analyze AAPL stock' }],
          company_of_interest: 'AAPL', 
          trade_date: new Date().toISOString()
        }
      },
      {
        name: 'LangGraph-style state',
        state: {
          messages: [],
          company_of_interest: 'AAPL',
          trade_date: new Date().toISOString(),
          market_data: {},
          analysis_results: {}
        }
      }
    ];
    
    for (const testCase of testStates) {
      console.log(`\n🧪 Testing: ${testCase.name}`);
      
      try {
        console.log(`   📤 Input state:`, JSON.stringify(testCase.state, null, 2));
        
        const result = await agent.process(testCase.state);
        
        console.log(`   ✅ SUCCESS! Agent processed state`);
        console.log(`   📥 Output keys:`, Object.keys(result));
        console.log(`   💬 Messages length:`, result.messages?.length || 'N/A');
        console.log(`   📄 Response preview:`, result.market_report?.substring(0, 100) || 'N/A');
        
        // Success - we found a working state structure!
        return { success: true, workingState: testCase.state, result };
      } catch (error) {
        console.log(`   ❌ FAILED: ${error.message}`);
      }
    }
    
    console.log('\n❌ No working state structure found');
    return { success: false };
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    return { success: false, error };
  }
}

// Run test
testSingleAgent()
  .then(result => {
    if (result.success) {
      console.log('\n🎉 Found working agent state structure!');
      console.log('✨ Ready to run comprehensive tests');
    } else {
      console.log('\n❌ Could not determine working state structure');
    }
  })
  .catch(error => {
    console.error('💥 Test crashed:', error);
  });