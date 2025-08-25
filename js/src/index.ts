import 'dotenv/config';
import { DEFAULT_CONFIG, enhancedConfigLoader } from './config/index';
import { Toolkit } from './dataflows/index';
import { createInitialAgentState } from './agents/utils/index';
import { createTradingAgentsGraph } from './graph/trading-graph';

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
  // eslint-disable-next-line no-console
  console.log('🚀 Trading Agents TypeScript Implementation');
  // eslint-disable-next-line no-console
  console.log('==========================================');

  try {
    // Validate enhanced configuration
    // eslint-disable-next-line no-console
    console.log('📝 Validating enhanced configuration...');
    try {
      enhancedConfigLoader.validateConfiguration();
      // eslint-disable-next-line no-console
      console.log('✅ Enhanced configuration valid');
      
      // Show configuration summary
      // eslint-disable-next-line no-console
      console.log('\n📋 Agent Configuration Summary:');
      // eslint-disable-next-line no-console
      console.log(enhancedConfigLoader.getConfigSummary());
      
    } catch (configError) {
      // eslint-disable-next-line no-console
      console.log('⚠️  Configuration incomplete:', configError);
      // eslint-disable-next-line no-console
      console.log('   This is expected if API keys are not set up yet');
    }

    // Initialize toolkit
    // eslint-disable-next-line no-console
    console.log('🔧 Initializing data toolkit...');
    const toolkit = new Toolkit(DEFAULT_CONFIG);
    // eslint-disable-next-line no-console
    console.log('✅ Toolkit initialized');

    // Create sample state
    // eslint-disable-next-line no-console
    console.log('📊 Creating sample analysis state...');
    const state = createInitialAgentState('NVDA', '2024-05-10');
    // eslint-disable-next-line no-console
    console.log('✅ Sample state created');
    // eslint-disable-next-line no-console
    console.log(`   Company: ${state.companyOfInterest}`);
    // eslint-disable-next-line no-console
    console.log(`   Date: ${state.tradeDate}`);

    // Test the enhanced trading graph system
    // eslint-disable-next-line no-console
    console.log('🤖 Testing Enhanced TradingAgentsGraph...');
    try {
      const graph = createTradingAgentsGraph({
        selectedAnalysts: ['market'],
        debug: false,
        config: DEFAULT_CONFIG
      });
      
      // eslint-disable-next-line no-console
      console.log('✅ TradingAgentsGraph created successfully');
      const configInfo = graph.getConfigInfo();
      // eslint-disable-next-line no-console
      console.log(`   LLM Provider: ${configInfo.llmProvider}`);
      // eslint-disable-next-line no-console
      console.log(`   Selected Analysts: ${configInfo.selectedAnalysts.join(', ')}`);
      
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('⚠️  TradingAgentsGraph test failed (expected without API keys):', error);
    }

    // Test a simple data flow
    if (DEFAULT_CONFIG.onlineTools) {
      // eslint-disable-next-line no-console
      console.log('🌐 Testing online data flow...');
      try {
        const stockData = await toolkit.getYFinDataOnline('NVDA', '2024-05-01', '2024-05-10');
        // eslint-disable-next-line no-console
        console.log('✅ Yahoo Finance data retrieved');
        // eslint-disable-next-line no-console
        console.log(`   Data length: ${stockData.length} characters`);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log('⚠️  Yahoo Finance test failed (expected without API keys)');
      }
    }

    // eslint-disable-next-line no-console
    console.log('\n🎉 Enhanced system test completed successfully!');
    // eslint-disable-next-line no-console
    console.log('\nNext steps:');
    // eslint-disable-next-line no-console
    console.log('- Set up your API keys in .env file');
    // eslint-disable-next-line no-console
    console.log('- Run the full trading analysis with: npm run cli');
    // eslint-disable-next-line no-console
    console.log('- See .env.example for required environment variables');
    // eslint-disable-next-line no-console
    console.log('- Test enhanced agents with: npm run test-enhanced');

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Error during initialization:', error);
    process.exit(1);
  }
}

// Run main function
if (require.main === module) {
  main().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Fatal error:', error);
    process.exit(1);
  });
}