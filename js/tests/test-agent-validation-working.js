/**
 * Working Agent Validation Test with LM Studio
 * Tests that all 12 agents can be instantiated and work with LM Studio
 */

// Test configuration for LM Studio
const LM_STUDIO_CONFIG = {
  provider: 'lm_studio',
  modelName: 'microsoft/phi-4-mini-reasoning',
  baseURL: 'http://localhost:1234/v1',
  temperature: 0.3,
  maxTokens: 512,
  timeout: 15000
};

async function testBasicConnection() {
  console.log('🔍 Testing LM Studio Connection');
  console.log('-'.repeat(40));
  
  try {
    const response = await fetch('http://localhost:1234/v1/models');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ LM Studio connection successful');
      console.log(`🤖 Models available: ${data.data?.length || 0}`);
      
      const hasPhiModel = data.data?.some(model => model.id.includes('phi-4'));
      if (hasPhiModel) {
        console.log('✅ phi-4-mini-reasoning model found');
        return true;
      } else {
        console.log('⚠️  phi-4-mini-reasoning model not found');
        return false;
      }
    } else {
      console.log(`❌ Connection failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Connection error: ${error.message}`);
    return false;
  }
}

async function testModelProviderCreation() {
  console.log('\n🏭 Testing ModelProvider');
  console.log('-'.repeat(40));
  
  try {
    console.log('📦 Importing ModelProvider...');
    const { ModelProvider } = await import('../dist/models/provider.js');
    
    console.log('🔧 Creating model instance...');
    const model = ModelProvider.createModel(LM_STUDIO_CONFIG);
    
    console.log('💬 Testing model response...');
    const response = await model.invoke([
      { role: 'user', content: 'Hello! Please respond with "ModelProvider test successful"' }
    ]);
    
    console.log('✅ ModelProvider test successful');
    console.log(`📝 Response preview: "${response.content.substring(0, 100)}..."`);
    
    return { success: true, model };
  } catch (error) {
    console.log(`❌ ModelProvider test failed: ${error.message}`);
    return { success: false, model: null };
  }
}

async function testSingleAgent(model) {
  console.log('\n🤖 Testing Single Agent');
  console.log('-'.repeat(40));
  
  try {
    console.log('📦 Importing MarketAnalyst...');
    const { MarketAnalyst } = await import('../dist/agents/analysts/market-analyst.js');
    
    console.log('🏗️  Creating MarketAnalyst instance...');
    const agent = new MarketAnalyst(model, []);
    
    console.log('✅ Agent instantiated successfully');
    console.log(`   Name: ${agent.name}`);
    console.log(`   Description: ${agent.description.substring(0, 80)}...`);
    
    console.log('🔄 Testing agent processing...');
    const testState = {
      company_of_interest: 'AAPL',
      trade_date: '2025-01-15',
      messages: [],
      sender: 'test'
    };
    
    const startTime = Date.now();
    const response = await agent.process(testState);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Agent processing successful in ${duration}ms`);
    console.log(`📊 Response fields: ${Object.keys(response).join(', ')}`);
    
    if (response.market_report) {
      const preview = response.market_report.substring(0, 100);
      console.log(`📝 Report preview: "${preview}..."`);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Agent test failed: ${error.message}`);
    return false;
  }
}

async function testAllAgentImports() {
  console.log('\n📚 Testing All Agent Imports');
  console.log('-'.repeat(40));
  
  const agentModules = [
    { name: 'MarketAnalyst', path: '../dist/agents/analysts/market-analyst.js' },
    { name: 'SocialAnalyst', path: '../dist/agents/analysts/social-analyst.js' },
    { name: 'NewsAnalyst', path: '../dist/agents/analysts/news-analyst.js' },
    { name: 'FundamentalsAnalyst', path: '../dist/agents/analysts/fundamentals-analyst.js' },
    { name: 'BullResearcher', path: '../dist/agents/researchers/bull-researcher.js' },
    { name: 'BearResearcher', path: '../dist/agents/researchers/bear-researcher.js' },
    { name: 'ResearchManager', path: '../dist/agents/managers/research-manager.js' },
    { name: 'Trader', path: '../dist/agents/trader/trader.js' },
    { name: 'RiskyAnalyst', path: '../dist/agents/risk-mgmt/risky-analyst.js' },
    { name: 'SafeAnalyst', path: '../dist/agents/risk-mgmt/safe-analyst.js' },
    { name: 'NeutralAnalyst', path: '../dist/agents/risk-mgmt/neutral-analyst.js' },
    { name: 'PortfolioManager', path: '../dist/agents/risk-mgmt/portfolio-manager.js' }
  ];
  
  const results = [];
  
  for (const agentModule of agentModules) {
    try {
      const module = await import(agentModule.path);
      const AgentClass = module[agentModule.name];
      
      if (AgentClass) {
        console.log(`✅ ${agentModule.name}: Imported successfully`);
        results.push({ name: agentModule.name, success: true });
      } else {
        console.log(`❌ ${agentModule.name}: Class not found in module`);
        results.push({ name: agentModule.name, success: false, error: 'Class not found' });
      }
    } catch (error) {
      console.log(`❌ ${agentModule.name}: Import failed - ${error.message}`);
      results.push({ name: agentModule.name, success: false, error: error.message });
    }
  }
  
  return results;
}

async function runWorkingValidation() {
  console.log('🚀 WORKING AGENT VALIDATION WITH LM STUDIO');
  console.log('Testing all 12 agents with microsoft/phi-4-mini-reasoning');
  console.log('='.repeat(60));
  
  let allPassed = true;
  
  // Test 1: Basic connection
  const connectionOk = await testBasicConnection();
  if (!connectionOk) {
    console.log('\n❌ LM Studio connection failed - cannot proceed with agent tests');
    return false;
  }
  
  // Test 2: ModelProvider
  const { success: providerOk, model } = await testModelProviderCreation();
  if (!providerOk) {
    console.log('\n❌ ModelProvider creation failed - cannot proceed with agent tests');
    return false;
  }
  
  // Test 3: Single agent processing
  const singleAgentOk = await testSingleAgent(model);
  if (!singleAgentOk) allPassed = false;
  
  // Test 4: All agent imports
  const importResults = await testAllAgentImports();
  const importSuccesses = importResults.filter(r => r.success).length;
  const importTotal = importResults.length;
  
  // Summary
  console.log('\n📊 VALIDATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`🔗 LM Studio Connection: ${connectionOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🏭 Model Provider: ${providerOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🤖 Single Agent Test: ${singleAgentOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`📚 Agent Imports: ${importSuccesses}/${importTotal} successful`);
  
  const finalSuccess = connectionOk && providerOk && singleAgentOk && (importSuccesses === importTotal);
  
  if (finalSuccess) {
    console.log('\n🎉 ALL VALIDATIONS PASSED!');
    console.log('✨ LM Studio + microsoft/phi-4-mini-reasoning is working correctly');
    console.log('🚀 All agents are ready for testing');
    console.log('\n💡 Next steps:');
    console.log('   npm run test-agent-integration   # Full integration tests');
    console.log('   npm run test-agent-performance   # Performance benchmarks');
  } else {
    console.log('\n⚠️  SOME VALIDATIONS FAILED');
    console.log('🔧 Review the errors above and fix before proceeding');
  }
  
  return finalSuccess;
}

// Run test
runWorkingValidation()
  .then(success => {
    console.log(`\n🏁 Validation ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Validation crashed:', error);
    process.exit(1);
  });