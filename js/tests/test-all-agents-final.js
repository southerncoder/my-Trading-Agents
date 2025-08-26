/**
 * COMPREHENSIVE AGENT INTEGRATION TEST
 * Final validation that all 12 agents work with LM Studio
 */

async function createLMStudioModel() {
  const { ModelProvider } = await import('../dist/models/provider.js');
  
  return ModelProvider.createModel({
    provider: 'lm_studio',
    modelName: 'microsoft/phi-4-mini-reasoning',
    baseURL: 'http://localhost:1234/v1',
    temperature: 0.1,
    maxTokens: 200,
    timeout: 60000 // 60 second timeout - sufficient for phi-4-mini-reasoning
  });
}

async function testAgent(agentName, agentPath, testPrompt) {
  console.log(`\n🔍 Testing ${agentName}...`);
  
  try {
    const startTime = Date.now();
    
    // Import agent with named import
    const agentModule = await import(agentPath);
    
    // Get the class - it could be default export or named export
    const AgentClass = agentModule.default || Object.values(agentModule).find(exp => 
      typeof exp === 'function' && exp.prototype && exp.name
    );
    
    if (!AgentClass) {
      throw new Error(`No valid agent class found in ${agentPath}`);
    }
    
    // Create model
    const model = await createLMStudioModel();
    
    // Instantiate agent - agents expect (llm, tools) constructor
    const agent = new AgentClass(model, []);
    
    // Test processing - agents expect state object with messages array
    console.log(`   📝 Processing: "${testPrompt.substring(0, 40)}..."`);
    
    const state = {
      messages: [],
      company_of_interest: 'AAPL',
      trade_date: new Date().toISOString(),
      input: testPrompt
    };
    
    const response = await agent.process(state);
    
    const duration = Date.now() - startTime;
    
    console.log(`   ✅ ${agentName}: SUCCESS (${duration}ms)`);
    console.log(`   📄 Response length: ${response?.content?.length || response?.length || 'N/A'} chars`);
    
    return { success: true, duration, agent: agentName };
  } catch (error) {
    console.log(`   ❌ ${agentName}: FAILED - ${error.message}`);
    return { success: false, error: error.message, agent: agentName };
  }
}

async function runComprehensiveAgentTest() {
  console.log('🚀 COMPREHENSIVE AGENT INTEGRATION TEST');
  console.log('Testing all 12 agents with LM Studio + microsoft/phi-4-mini-reasoning');
  console.log('='.repeat(70));
  
  const testCases = [
    // Analysts
    {
      name: 'Market Analyst',
      path: '../dist/agents/analysts/market-analyst.js',
      prompt: 'Analyze current market conditions for AAPL stock'
    },
    {
      name: 'News Analyst', 
      path: '../dist/agents/analysts/news-analyst.js',
      prompt: 'Analyze the impact of recent tech news on stock markets'
    },
    {
      name: 'Fundamentals Analyst',
      path: '../dist/agents/analysts/fundamentals-analyst.js', 
      prompt: 'Evaluate the fundamental metrics for Tesla stock'
    },
    {
      name: 'Social Media Analyst',
      path: '../dist/agents/analysts/social-analyst.js',
      prompt: 'Analyze social sentiment around cryptocurrency markets'
    },
    
    // Researchers
    {
      name: 'Bull Researcher',
      path: '../dist/agents/researchers/bull-researcher.js',
      prompt: 'Research bullish indicators for the technology sector'
    },
    {
      name: 'Bear Researcher', 
      path: '../dist/agents/researchers/bear-researcher.js',
      prompt: 'Research bearish risks in the current market environment'
    },
    
    // Managers
    {
      name: 'Research Manager',
      path: '../dist/agents/managers/research-manager.js',
      prompt: 'Coordinate research on emerging market opportunities'
    },
    {
      name: 'Portfolio Manager',
      path: '../dist/agents/risk-mgmt/portfolio-manager.js',
      prompt: 'Assess portfolio risk exposure and recommend adjustments'
    },
    
    // Risk Management Analysts
    {
      name: 'Safe Analyst',
      path: '../dist/agents/risk-mgmt/safe-analyst.js',
      prompt: 'Argue for conservative investment approach in current market'
    },
    {
      name: 'Risky Analyst',
      path: '../dist/agents/risk-mgmt/risky-analyst.js', 
      prompt: 'Present case for aggressive growth strategy'
    },
    {
      name: 'Neutral Analyst',
      path: '../dist/agents/risk-mgmt/neutral-analyst.js',
      prompt: 'Provide balanced perspective on investment strategy'
    },
    
    // Trader
    {
      name: 'Trader',
      path: '../dist/agents/trader/trader.js',
      prompt: 'Execute a buy order for 100 shares of MSFT based on analysis'
    }
  ];
  
  console.log(`📋 Testing ${testCases.length} agents...\n`);
  
  const results = [];
  let successCount = 0;
  let totalTime = 0;
  
  // Test each agent sequentially to avoid overwhelming LM Studio
  for (const testCase of testCases) {
    const result = await testAgent(testCase.name, testCase.path, testCase.prompt);
    results.push(result);
    
    if (result.success) {
      successCount++;
      totalTime += result.duration;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Results Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 COMPREHENSIVE TEST RESULTS');
  console.log('='.repeat(70));
  
  console.log(`✅ Successful agents: ${successCount}/${testCases.length}`);
  console.log(`❌ Failed agents: ${testCases.length - successCount}/${testCases.length}`);
  
  if (successCount > 0) {
    const avgTime = totalTime / successCount;
    console.log(`⏱️  Average response time: ${avgTime.toFixed(0)}ms`);
  }
  
  // Success breakdown
  console.log('\n📋 AGENT STATUS:');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const time = result.duration ? `(${result.duration}ms)` : '';
    console.log(`   ${status} ${result.agent} ${time}`);
  });
  
  // Failed agents details
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    console.log('\n🔧 FAILURE DETAILS:');
    failures.forEach(failure => {
      console.log(`   ❌ ${failure.agent}: ${failure.error}`);
    });
  }
  
  // Overall assessment
  console.log('\n🎯 INTEGRATION ASSESSMENT:');
  if (successCount === testCases.length) {
    console.log('🎉 PERFECT! All agents working with LM Studio');
    console.log('✨ microsoft/phi-4-mini-reasoning integration complete');
    console.log('🚀 Ready for production testing');
  } else if (successCount >= testCases.length * 0.8) {
    console.log('✅ GOOD! Most agents working with LM Studio');
    console.log('🔧 Minor issues to resolve with failed agents');
  } else if (successCount > 0) {
    console.log('⚠️  PARTIAL! Some agents working with LM Studio');
    console.log('🔧 Significant issues need investigation');
  } else {
    console.log('❌ CRITICAL! No agents working with LM Studio');
    console.log('🔧 Major configuration issues need resolution');
  }
  
  return successCount === testCases.length;
}

// Run comprehensive test
runComprehensiveAgentTest()
  .then(allSuccess => {
    console.log(`\n🏁 Comprehensive agent test ${allSuccess ? 'PASSED' : 'COMPLETED WITH ISSUES'}`);
    process.exit(allSuccess ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
  });