import 'dotenv/config';
import { DEFAULT_CONFIG, validateConfig } from '@/config';
import { Toolkit } from '@/dataflows';
import { createInitialAgentState } from '@/agents/utils';
import { TradingAgentsGraph, createTradingAgentsGraph } from './graph/trading-graph';

// Re-export main classes and functions for library usage
export { TradingAgentsGraph, createTradingAgentsGraph } from './graph/trading-graph';
export { EnhancedTradingAgentsGraph } from './graph/enhanced-trading-graph';
export { LangGraphSetup } from './graph/langgraph-working';
export { createConfig, DEFAULT_CONFIG } from './config/index';
export { Toolkit } from './dataflows/index';
export { TradingAgentsConfig, LLMProvider, AnalystConfig, AnalystType } from './types/index';
export {
  // Base agent classes
  AbstractAgent, BaseAgent, AgentType, AgentRole, AGENT_ROLES,
  // Specific agents
  MarketAnalyst, SocialAnalyst, NewsAnalyst, FundamentalsAnalyst,
  BullResearcher, BearResearcher, ResearchManager,
  RiskyAnalyst, SafeAnalyst, NeutralAnalyst, Trader
} from './agents/index';

/**
 * Main entry point for the Trading Agents TypeScript implementation
 */
async function main(): Promise<void> {
  console.log('🚀 Trading Agents TypeScript Implementation');
  console.log('==========================================');

  try {
    // Validate configuration
    console.log('📝 Validating configuration...');
    try {
      validateConfig(DEFAULT_CONFIG);
      console.log('✅ Configuration valid');
    } catch (configError) {
      console.log('⚠️  Configuration incomplete:', configError);
      console.log('   This is expected if API keys are not set up yet');
    }

    // Initialize toolkit
    console.log('🔧 Initializing data toolkit...');
    const toolkit = new Toolkit(DEFAULT_CONFIG);
    console.log('✅ Toolkit initialized');

    // Create sample state
    console.log('📊 Creating sample analysis state...');
    const state = createInitialAgentState('NVDA', '2024-05-10');
    console.log('✅ Sample state created');
    console.log(`   Company: ${state.companyOfInterest}`);
    console.log(`   Date: ${state.tradeDate}`);

    // Test the trading graph system
    console.log('🤖 Testing TradingAgentsGraph...');
    try {
      const graph = createTradingAgentsGraph({
        selectedAnalysts: ['market'],
        debug: false,
        config: DEFAULT_CONFIG
      });
      
      console.log('✅ TradingAgentsGraph created successfully');
      const configInfo = graph.getConfigInfo();
      console.log(`   LLM Provider: ${configInfo.llmProvider}`);
      console.log(`   Selected Analysts: ${configInfo.selectedAnalysts.join(', ')}`);
      
    } catch (error) {
      console.log('⚠️  TradingAgentsGraph test failed (expected without API keys):', error);
    }

    // Test a simple data flow
    if (DEFAULT_CONFIG.onlineTools) {
      console.log('🌐 Testing online data flow...');
      try {
        const stockData = await toolkit.getYFinDataOnline('NVDA', '2024-05-01', '2024-05-10');
        console.log('✅ Yahoo Finance data retrieved');
        console.log(`   Data length: ${stockData.length} characters`);
      } catch (error) {
        console.log('⚠️  Yahoo Finance test failed (expected without API keys)');
      }
    }

    console.log('\n🎉 Basic system test completed successfully!');
    console.log('\nNext steps:');
    console.log('- Set up your API keys in .env file');
    console.log('- Run the full trading analysis with: npm run cli');
    console.log('- See .env.example for required environment variables');
    console.log('- Test the graph directly with: npm run test-graph');

  } catch (error) {
    console.error('❌ Error during initialization:', error);
    process.exit(1);
  }
}

// Run main function
if (require.main === module) {
  main().catch(console.error);
}