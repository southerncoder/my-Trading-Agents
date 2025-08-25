import { enhancedConfigLoader } from '../config/enhanced-loader';
import { EnhancedAgentFactory } from '../factory/enhanced-agent-factory';
import { LLMProviderFactory } from '../providers/llm-factory';
import { EmbeddingProviderFactory } from '../providers/memory-provider';

/**
 * Test suite for the enhanced agent configuration system
 */
async function testEnhancedConfiguration(): Promise<void> {
  console.log('🧪 Testing Enhanced Agent Configuration System\n');

  try {
    // Test 1: Configuration Loading
    console.log('1️⃣ Testing Configuration Loading...');
    const config = enhancedConfigLoader.getConfig();
    console.log(`✅ Configuration loaded successfully`);
    console.log(`   Default provider: ${config.agents.default.provider}`);
    console.log(`   Default model: ${config.agents.default.model}\n`);

    // Test 2: Configuration Summary
    console.log('2️⃣ Testing Configuration Summary...');
    const summary = enhancedConfigLoader.getConfigSummary();
    console.log(summary);

    // Test 3: Agent-specific configurations
    console.log('3️⃣ Testing Agent-specific Configurations...');
    const testAgents = ['market_analyst', 'bull_researcher', 'risk_manager'];
    testAgents.forEach(agentType => {
      const agentConfig = enhancedConfigLoader.getAgentConfig(agentType);
      console.log(`   ${agentType}: ${agentConfig.provider} | ${agentConfig.model}`);
    });
    console.log();

    // Test 4: Configuration Validation
    console.log('4️⃣ Testing Configuration Validation...');
    try {
      enhancedConfigLoader.validateConfiguration();
      console.log('✅ Configuration validation passed\n');
    } catch (error) {
      console.log(`⚠️ Configuration validation warnings: ${(error as Error).message}\n`);
    }

    // Test 5: LLM Provider Factory
    console.log('5️⃣ Testing LLM Provider Factory...');
    const marketAnalystConfig = enhancedConfigLoader.getAgentConfig('market_analyst');
    try {
      const llm = LLMProviderFactory.createLLM(marketAnalystConfig);
      console.log(`✅ LLM created for market_analyst: ${llm.constructor.name}`);
      
      // Test available models
      const availableModels = LLMProviderFactory.getAvailableModels(marketAnalystConfig.provider);
      console.log(`   Available models: ${availableModels.slice(0, 3).join(', ')}...\n`);
    } catch (error) {
      console.log(`❌ LLM creation failed: ${(error as Error).message}\n`);
    }

    // Test 6: Memory Provider Factory
    console.log('6️⃣ Testing Memory Provider Factory...');
    try {
      const memoryProvider = EmbeddingProviderFactory.createProvider(marketAnalystConfig);
      console.log(`✅ Memory provider created: ${memoryProvider.getProviderName()}\n`);
    } catch (error) {
      console.log(`❌ Memory provider creation failed: ${(error as Error).message}\n`);
    }

    // Test 7: Enhanced Agent Factory
    console.log('7️⃣ Testing Enhanced Agent Factory...');
    try {
      // Test individual agent creation
      const marketAnalyst = EnhancedAgentFactory.createAgent('market_analyst');
      console.log(`✅ Market Analyst created: ${marketAnalyst.constructor.name}`);
      
      // Test batch agent creation
      const analysts = EnhancedAgentFactory.createAnalysts();
      console.log(`✅ Analysts batch created: ${Object.keys(analysts).length} agents`);
      console.log(`   Agents: ${Object.keys(analysts).join(', ')}\n`);
    } catch (error) {
      console.log(`❌ Agent creation failed: ${(error as Error).message}\n`);
    }

    // Test 8: Configuration Updates
    console.log('8️⃣ Testing Runtime Configuration Updates...');
    const originalConfig = enhancedConfigLoader.getAgentConfig('trader');
    console.log(`   Original trader model: ${originalConfig.model}`);
    
    enhancedConfigLoader.updateAgentConfig('trader', {
      model: 'gpt-4o',
      temperature: 0.3
    });
    
    const updatedConfig = enhancedConfigLoader.getAgentConfig('trader');
    console.log(`   Updated trader model: ${updatedConfig.model}`);
    console.log(`   Updated trader temperature: ${updatedConfig.temperature}\n`);

    // Test 9: Provider Cost Estimation
    console.log('9️⃣ Testing Provider Cost Estimation...');
    const providers = ['openai', 'anthropic', 'google', 'lm_studio'];
    providers.forEach(provider => {
      const defaultModel = LLMProviderFactory.getDefaultModel(provider as any);
      const costs = LLMProviderFactory.getTokenCost(provider as any, defaultModel);
      console.log(`   ${provider}: $${costs.input}/1K input, $${costs.output}/1K output`);
    });
    console.log();

    // Test 10: Backward Compatibility
    console.log('🔟 Testing Backward Compatibility...');
    const legacyConfig = enhancedConfigLoader.toLegacyConfig();
    console.log(`✅ Legacy config created: ${legacyConfig.llmProvider} provider`);
    console.log(`   Deep think LLM: ${legacyConfig.deepThinkLlm}`);
    console.log(`   Quick think LLM: ${legacyConfig.quickThinkLlm}\n`);

    console.log('🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

/**
 * Test connection to different providers (if API keys are available)
 */
async function testProviderConnections(): Promise<void> {
  console.log('\n🔌 Testing Provider Connections...');
  
  const testAgents = ['market_analyst', 'bull_researcher', 'conservative_debator'];
  
  for (const agentType of testAgents) {
    try {
      const isConnected = await EnhancedAgentFactory.testAgentConnection(agentType);
      const config = EnhancedAgentFactory.getAgentConfig(agentType);
      const status = isConnected ? '✅' : '❌';
      console.log(`${status} ${agentType}: ${config.provider} (${config.model})`);
    } catch (error) {
      console.log(`❌ ${agentType}: Connection test failed`);
    }
  }
}

/**
 * Demonstrate diverse provider usage
 */
function demonstrateProviderDiversity(): void {
  console.log('\n🌈 Demonstrating Provider Diversity...');
  console.log('='.repeat(60));
  
  const agentTypes = [
    'market_analyst', 'news_analyst', 'fundamentals_analyst',
    'bull_researcher', 'bear_researcher',
    'safe_analyst', 'risky_analyst', 'neutral_analyst',
    'research_manager', 'portfolio_manager', 'trader'
  ];
  
  agentTypes.forEach(agentType => {
    const config = enhancedConfigLoader.getAgentConfig(agentType);
    const costs = LLMProviderFactory.getTokenCost(config.provider, config.model);
    const costStr = costs.input > 0 ? `$${costs.input}/1K` : 'Free';
    
    console.log(`${agentType.padEnd(20)}: ${config.provider.padEnd(12)} | ${config.model.padEnd(25)} | ${costStr}`);
  });
}

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    await testEnhancedConfiguration();
    await testProviderConnections();
    demonstrateProviderDiversity();
  })();
}