/**
 * Comprehensive Agent Integration Tests with LM Studio
 * Tests all 12 agents against remote_lmstudio provider with microsoft/phi-4-mini-reasoning
 * 
 * This test suite verifies:
 * 1. Each agent can be instantiated with LM Studio provider
 * 2. Each agent can process a basic trading scenario
 * 3. LLM connections work correctly with phi-4-mini-reasoning model
 * 4. Agent responses are properly formatted and contain expected content
 * 5. Error handling works correctly for connection failures
 */

import { ModelProvider } from '../dist/models/provider.js';
import { createConfig } from '../dist/config/default.js';
import { AgentState } from '../dist/types/agent-states.js';

// Import all agent classes
import { MarketAnalyst } from '../dist/agents/analysts/market-analyst.js';
import { SocialAnalyst } from '../dist/agents/analysts/social-analyst.js';
import { NewsAnalyst } from '../dist/agents/analysts/news-analyst.js';
import { FundamentalsAnalyst } from '../dist/agents/analysts/fundamentals-analyst.js';
import { BullResearcher } from '../dist/agents/researchers/bull-researcher.js';
import { BearResearcher } from '../dist/agents/researchers/bear-researcher.js';
import { ResearchManager } from '../dist/agents/managers/research-manager.js';
import { Trader } from '../dist/agents/trader/trader.js';
import { RiskyAnalyst } from '../dist/agents/risk-mgmt/risky-analyst.js';
import { SafeAnalyst } from '../dist/agents/risk-mgmt/safe-analyst.js';
import { NeutralAnalyst } from '../dist/agents/risk-mgmt/neutral-analyst.js';
import { PortfolioManager } from '../dist/agents/risk-mgmt/portfolio-manager.js';

// Test configuration
const TEST_CONFIG = {
  provider: 'remote_lmstudio',
  modelName: 'microsoft/phi-4-mini-reasoning',
  baseURL: 'http://localhost:1234/v1',
  temperature: 0.3, // Lower temperature for more consistent test results
  maxTokens: 1024, // Smaller tokens for faster tests
  timeout: 30000 // 30 second timeout
};

// Test state for all agents
const BASE_TEST_STATE = {
  company_of_interest: 'AAPL',
  trade_date: '2025-01-15',
  messages: [],
  sender: 'test_harness'
};

// Define agent test configurations
const AGENT_TEST_CONFIGS = [
  {
    name: 'MarketAnalyst',
    class: MarketAnalyst,
    expectedFields: ['market_report'],
    testState: { ...BASE_TEST_STATE }
  },
  {
    name: 'SocialAnalyst', 
    class: SocialAnalyst,
    expectedFields: ['social_report'],
    testState: { ...BASE_TEST_STATE }
  },
  {
    name: 'NewsAnalyst',
    class: NewsAnalyst,
    expectedFields: ['news_report'],
    testState: { ...BASE_TEST_STATE }
  },
  {
    name: 'FundamentalsAnalyst',
    class: FundamentalsAnalyst,
    expectedFields: ['fundamentals_report'],
    testState: { ...BASE_TEST_STATE }
  },
  {
    name: 'BullResearcher',
    class: BullResearcher,
    expectedFields: ['bull_research'],
    testState: {
      ...BASE_TEST_STATE,
      market_report: 'Mock market analysis shows bullish trends',
      social_report: 'Positive social sentiment detected',
      news_report: 'Recent news is favorable',
      fundamentals_report: 'Strong fundamentals observed'
    }
  },
  {
    name: 'BearResearcher',
    class: BearResearcher,
    expectedFields: ['bear_research'],
    testState: {
      ...BASE_TEST_STATE,
      market_report: 'Mock market analysis shows potential risks',
      social_report: 'Mixed social sentiment detected',
      news_report: 'Some concerning news trends',
      fundamentals_report: 'Fundamentals show some concerns'
    }
  },
  {
    name: 'ResearchManager',
    class: ResearchManager,
    expectedFields: ['research_summary'],
    testState: {
      ...BASE_TEST_STATE,
      bull_research: 'Strong bullish case with growth potential',
      bear_research: 'Some downside risks to consider'
    }
  },
  {
    name: 'Trader',
    class: Trader,
    expectedFields: ['trading_plan'],
    testState: {
      ...BASE_TEST_STATE,
      research_summary: 'Overall positive outlook with measured optimism'
    }
  },
  {
    name: 'RiskyAnalyst',
    class: RiskyAnalyst,
    expectedFields: ['risky_analysis'],
    testState: {
      ...BASE_TEST_STATE,
      trading_plan: 'Conservative buy recommendation with stop loss'
    }
  },
  {
    name: 'SafeAnalyst',
    class: SafeAnalyst,
    expectedFields: ['safe_analysis'],
    testState: {
      ...BASE_TEST_STATE,
      trading_plan: 'Aggressive growth strategy with high position size'
    }
  },
  {
    name: 'NeutralAnalyst',
    class: NeutralAnalyst,
    expectedFields: ['neutral_analysis'],
    testState: {
      ...BASE_TEST_STATE,
      trading_plan: 'Balanced approach with moderate risk'
    }
  },
  {
    name: 'PortfolioManager',
    class: PortfolioManager,
    expectedFields: ['final_decision'],
    testState: {
      ...BASE_TEST_STATE,
      trading_plan: 'Moderate position with defined risk management',
      risky_analysis: 'Higher risk tolerance could increase returns',
      safe_analysis: 'Conservative approach ensures capital preservation',
      neutral_analysis: 'Balanced perspective recommends measured approach'
    }
  }
];

/**
 * Test Helper Functions
 */
function createTestLogger() {
  return {
    info: (component, message) => console.log(`[INFO] ${component}: ${message}`),
    warn: (component, message) => console.log(`[WARN] ${component}: ${message}`),
    error: (component, message) => console.log(`[ERROR] ${component}: ${message}`),
    debug: (component, message) => console.log(`[DEBUG] ${component}: ${message}`)
  };
}

function validateAgentResponse(response, agentName, expectedFields) {
  const errors = [];
  
  if (!response) {
    errors.push(`${agentName}: No response received`);
    return errors;
  }
  
  // Check for messages array
  if (!Array.isArray(response.messages)) {
    errors.push(`${agentName}: Response missing 'messages' array`);
  }
  
  // Check for expected fields
  for (const field of expectedFields) {
    if (!response[field] || typeof response[field] !== 'string' || response[field].trim().length === 0) {
      errors.push(`${agentName}: Missing or empty required field '${field}'`);
    }
  }
  
  // Check for sender field
  if (!response.sender) {
    errors.push(`${agentName}: Missing 'sender' field`);
  }
  
  return errors;
}

async function testLMStudioConnection() {
  console.log('🔍 Testing LM Studio connection...');
  
  try {
    const connectionTest = await ModelProvider.testConnection(TEST_CONFIG);
    
    if (!connectionTest.success) {
      throw new Error(`Connection failed: ${connectionTest.error}`);
    }
    
    console.log('✅ LM Studio connection successful');
    return true;
  } catch (error) {
    console.error('❌ LM Studio connection failed:', error.message);
    console.error('   Make sure LM Studio is running on http://localhost:1234');
    console.error('   with microsoft/phi-4-mini-reasoning model loaded');
    return false;
  }
}

async function testAgentInstantiation() {
  console.log('\n🏗️  Testing agent instantiation...');
  
  const model = ModelProvider.createModel(TEST_CONFIG);
  const results = [];
  
  for (const config of AGENT_TEST_CONFIGS) {
    try {
      // Create agent instance (some agents require tools parameter)
      const agent = new config.class(model, []);
      
      // Validate basic properties
      if (!agent.name || !agent.description || !agent.llm) {
        throw new Error('Agent missing required properties');
      }
      
      console.log(`✅ ${config.name} instantiated successfully`);
      results.push({ agent: config.name, success: true });
    } catch (error) {
      console.error(`❌ ${config.name} instantiation failed:`, error.message);
      results.push({ agent: config.name, success: false, error: error.message });
    }
  }
  
  return results;
}

async function testIndividualAgent(agentConfig, model) {
  const { name, class: AgentClass, expectedFields, testState } = agentConfig;
  
  console.log(`\n🤖 Testing ${name}...`);
  
  try {
    // Create agent instance
    const agent = new AgentClass(model, []);
    
    // Check if agent can process the test state
    if (!agent.canProcess(testState)) {
      throw new Error(`Agent cannot process test state`);
    }
    
    // Process the test state
    console.log(`   Processing state for ${testState.company_of_interest}...`);
    const startTime = Date.now();
    
    const response = await agent.process(testState);
    
    const duration = Date.now() - startTime;
    console.log(`   Response received in ${duration}ms`);
    
    // Validate the response
    const validationErrors = validateAgentResponse(response, name, expectedFields);
    
    if (validationErrors.length > 0) {
      throw new Error(`Response validation failed:\n${validationErrors.join('\n')}`);
    }
    
    // Log response summary
    console.log(`✅ ${name} test passed`);
    console.log(`   Generated fields: ${expectedFields.join(', ')}`);
    
    // Log a preview of the main output field
    const mainField = expectedFields[0];
    if (response[mainField]) {
      const preview = response[mainField].substring(0, 100);
      console.log(`   Output preview: "${preview}${response[mainField].length > 100 ? '...' : ''}"`);
    }
    
    return {
      agent: name,
      success: true,
      duration,
      responseFields: Object.keys(response),
      outputLength: response[expectedFields[0]]?.length || 0
    };
    
  } catch (error) {
    console.error(`❌ ${name} test failed:`, error.message);
    return {
      agent: name,
      success: false,
      error: error.message
    };
  }
}

async function testAllAgents() {
  console.log('\n🎯 Testing all agents with LM Studio...');
  
  const model = ModelProvider.createModel(TEST_CONFIG);
  const results = [];
  
  for (const agentConfig of AGENT_TEST_CONFIGS) {
    const result = await testIndividualAgent(agentConfig, model);
    results.push(result);
    
    // Small delay between tests to avoid overwhelming the model
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
}

function generateTestReport(instantiationResults, agentTestResults) {
  console.log('\n📊 COMPREHENSIVE TEST REPORT');
  console.log('=' * 50);
  
  // Overall statistics
  const totalAgents = AGENT_TEST_CONFIGS.length;
  const instantiationSuccesses = instantiationResults.filter(r => r.success).length;
  const testSuccesses = agentTestResults.filter(r => r.success).length;
  
  console.log(`\n📈 SUMMARY STATISTICS`);
  console.log(`Total Agents Tested: ${totalAgents}`);
  console.log(`Instantiation Success Rate: ${instantiationSuccesses}/${totalAgents} (${(instantiationSuccesses/totalAgents*100).toFixed(1)}%)`);
  console.log(`Processing Success Rate: ${testSuccesses}/${totalAgents} (${(testSuccesses/totalAgents*100).toFixed(1)}%)`);
  
  // Instantiation results
  console.log(`\n🏗️  INSTANTIATION RESULTS`);
  for (const result of instantiationResults) {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.agent}${result.error ? `: ${result.error}` : ''}`);
  }
  
  // Agent processing results
  console.log(`\n🤖 AGENT PROCESSING RESULTS`);
  for (const result of agentTestResults) {
    const status = result.success ? '✅' : '❌';
    if (result.success) {
      console.log(`${status} ${result.agent} (${result.duration}ms, ${result.outputLength} chars)`);
    } else {
      console.log(`${status} ${result.agent}: ${result.error}`);
    }
  }
  
  // Performance metrics for successful tests
  const successfulTests = agentTestResults.filter(r => r.success);
  if (successfulTests.length > 0) {
    console.log(`\n⚡ PERFORMANCE METRICS`);
    
    const durations = successfulTests.map(r => r.duration);
    const outputLengths = successfulTests.map(r => r.outputLength);
    
    console.log(`Average Response Time: ${(durations.reduce((a,b) => a+b, 0) / durations.length).toFixed(0)}ms`);
    console.log(`Fastest Response: ${Math.min(...durations)}ms`);
    console.log(`Slowest Response: ${Math.max(...durations)}ms`);
    console.log(`Average Output Length: ${(outputLengths.reduce((a,b) => a+b, 0) / outputLengths.length).toFixed(0)} characters`);
  }
  
  // Recommendations
  console.log(`\n💡 RECOMMENDATIONS`);
  
  if (testSuccesses === totalAgents) {
    console.log('🎉 All agents are working perfectly with LM Studio!');
    console.log('🚀 The microsoft/phi-4-mini-reasoning model is fully compatible');
    console.log('✨ Ready for production use with this configuration');
  } else if (testSuccesses > totalAgents * 0.8) {
    console.log('👍 Most agents are working well with LM Studio');
    console.log('🔧 Consider investigating failing agents for specific issues');
  } else {
    console.log('⚠️  Multiple agents are failing - check LM Studio configuration');
    console.log('🔍 Verify model is loaded and responsive');
    console.log('🛠️  Consider adjusting model parameters or switching models');
  }
  
  console.log('\n' + '=' * 50);
}

/**
 * Main Test Execution
 */
async function runIntegrationTests() {
  console.log('🚀 TRADING AGENTS - LM STUDIO INTEGRATION TESTS');
  console.log('Testing all 12 agents with microsoft/phi-4-mini-reasoning');
  console.log('=' * 60);
  
  try {
    // Step 1: Test LM Studio connection
    const connectionOk = await testLMStudioConnection();
    if (!connectionOk) {
      process.exit(1);
    }
    
    // Step 2: Test agent instantiation
    const instantiationResults = await testAgentInstantiation();
    
    // Step 3: Test all agents
    const agentTestResults = await testAllAgents();
    
    // Step 4: Generate comprehensive report
    generateTestReport(instantiationResults, agentTestResults);
    
    // Determine exit code
    const allSuccess = agentTestResults.every(r => r.success);
    process.exit(allSuccess ? 0 : 1);
    
  } catch (error) {
    console.error('\n💥 CRITICAL TEST FAILURE:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  runIntegrationTests();
}

export { runIntegrationTests, testIndividualAgent, testLMStudioConnection };