/**
 * Quick Agent Validation Test with LM Studio
 * Fast test to verify all agents can instantiate and basic LLM connectivity works
 */

import { ModelProvider } from '../../src/models/provider.js';

// Test configuration for LM Studio
const LM_STUDIO_CONFIG = {
  provider: 'remote_lmstudio',
  modelName: 'microsoft/phi-4-mini-reasoning',
  baseURL: process.env.REMOTE_LM_STUDIO_BASE_URL || 'http://localhost:1234/v1',
  temperature: 0.3,
  maxTokens: 512,
  timeout: 15000
};

async function quickConnectionTest() {
  console.log('🔍 Quick LM Studio Connection Test');
  console.log('Model: microsoft/phi-4-mini-reasoning');
  console.log(`URL: ${process.env.REMOTE_LM_STUDIO_BASE_URL || 'http://localhost:1234/v1'}`);
  console.log('-'.repeat(40));
  
  try {
    console.log('Creating model instance...');
    const model = ModelProvider.createModel(LM_STUDIO_CONFIG);
    
    console.log('Testing connection with simple prompt...');
    const startTime = Date.now();
    
    const response = await model.invoke([
      { role: 'user', content: 'Hello! Please respond with exactly "LM Studio is working" to confirm connectivity.' }
    ]);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Response received in ${duration}ms`);
    console.log(`📝 Response: "${response.content}"`);
    
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Ensure LM Studio is running');
    console.error('   2. Check model is loaded: microsoft/phi-4-mini-reasoning');
    console.error(`   3. Verify server is on ${process.env.REMOTE_LM_STUDIO_BASE_URL?.replace('/v1', '') || 'http://localhost:1234'}`);
    return false;
  }
}

async function testAgentInstantiations() {
  console.log('\n🏗️  Testing Agent Instantiations');
  console.log('-'.repeat(40));
  
  const model = ModelProvider.createModel(LM_STUDIO_CONFIG);
  
  // Import and test each agent type
  const agentTests = [
    { name: 'MarketAnalyst', module: '../../src/agents/analysts/market-analyst.js' },
    { name: 'SocialAnalyst', module: '../../src/agents/analysts/social-analyst.js' },
    { name: 'NewsAnalyst', module: '../../src/agents/analysts/news-analyst.js' },
    { name: 'FundamentalsAnalyst', module: '../../src/agents/analysts/fundamentals-analyst.js' },
    { name: 'BullResearcher', module: '../../src/agents/researchers/bull-researcher.js' },
    { name: 'BearResearcher', module: '../../src/agents/researchers/bear-researcher.js' },
    { name: 'ResearchManager', module: '../../src/agents/managers/research-manager.js' },
    { name: 'Trader', module: '../../src/agents/trader/trader.js' },
    { name: 'RiskyAnalyst', module: '../../src/agents/risk-mgmt/risky-analyst.js' },
    { name: 'SafeAnalyst', module: '../../src/agents/risk-mgmt/safe-analyst.js' },
    { name: 'NeutralAnalyst', module: '../../src/agents/risk-mgmt/neutral-analyst.js' },
    { name: 'PortfolioManager', module: '../../src/agents/risk-mgmt/portfolio-manager.js' }
  ];
  
  const results = [];
  
  for (const { name, module } of agentTests) {
    try {
      const { [name]: AgentClass } = await import(module);
      const agent = new AgentClass(model, []);
      
      // Basic validation
      if (!agent.name || !agent.llm || !agent.getSystemPrompt) {
        throw new Error('Missing required agent properties/methods');
      }
      
      console.log(`✅ ${name}: OK`);
      results.push({ name, success: true });
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      results.push({ name, success: false, error: error.message });
    }
  }
  
  return results;
}

async function testSingleAgentProcessing() {
  console.log('\n🤖 Testing Single Agent Processing');
  console.log('-'.repeat(40));
  
  try {
    const model = ModelProvider.createModel(LM_STUDIO_CONFIG);
    const { MarketAnalyst } = await import('../../src/agents/analysts/market-analyst.js');
    
    const agent = new MarketAnalyst(model, []);
    
    const testState = {
      company_of_interest: 'AAPL',
      trade_date: '2025-01-15',
      messages: [],
      sender: 'test'
    };
    
    console.log('Processing test state with MarketAnalyst...');
    console.log(`Company: ${testState.company_of_interest}`);
    console.log(`Date: ${testState.trade_date}`);
    
    const startTime = Date.now();
    const response = await agent.process(testState);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Processing completed in ${duration}ms`);
    console.log(`📊 Response fields: ${Object.keys(response).join(', ')}`);
    
    if (response.market_report) {
      const preview = response.market_report.substring(0, 150);
      console.log(`📝 Report preview: "${preview}..."`);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Agent processing failed: ${error.message}`);
    return false;
  }
}

async function runQuickValidation() {
  console.log('🚀 QUICK AGENT VALIDATION WITH LM STUDIO');
  console.log('='.repeat(50));
  
  let allPassed = true;
  
  // Test 1: Connection
  const connectionOk = await quickConnectionTest();
  if (!connectionOk) allPassed = false;
  
  // Test 2: Agent instantiation
  const instantiationResults = await testAgentInstantiations();
  const instantiationOk = instantiationResults.every(r => r.success);
  if (!instantiationOk) allPassed = false;
  
  // Test 3: Single agent processing
  const processingOk = await testSingleAgentProcessing();
  if (!processingOk) allPassed = false;
  
  // Summary
  console.log('\n📊 VALIDATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`🔗 LM Studio Connection: ${connectionOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🏗️  Agent Instantiation: ${instantiationOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🤖 Agent Processing: ${processingOk ? '✅ PASS' : '❌ FAIL'}`);
  
  if (allPassed) {
    console.log('\n🎉 ALL VALIDATIONS PASSED!');
    console.log('✨ LM Studio + microsoft/phi-4-mini-reasoning is working correctly');
    console.log('🚀 Ready to run full integration tests');
  } else {
    console.log('\n⚠️  SOME VALIDATIONS FAILED');
    console.log('🔧 Fix issues before running full integration tests');
  }
  
  console.log('\n💡 To run comprehensive tests:');
  console.log('   node tests/test-agent-integration-lmstudio.js');
  
  return allPassed;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runQuickValidation()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('💥 Critical error:', error);
      process.exit(1);
    });
}

export { runQuickValidation };