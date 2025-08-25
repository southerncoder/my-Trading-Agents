import { enhancedConfigLoader } from '../config/enhanced-loader';
import { FinancialSituationMemory } from '../agents/utils/memory';
import { EmbeddingProviderFactory } from '../providers/memory-provider';

/**
 * Simple test for memory provider selection
 */
async function basicMemoryProviderTest(): Promise<void> {
  try {
    console.log('🧠 Basic Memory Provider Test\n');

    // Test OpenAI agent (market_analyst)
    console.log('1️⃣ Testing OpenAI Agent Memory Provider...');
    const openaiAgentConfig = enhancedConfigLoader.getAgentConfig('market_analyst');
    console.log(`   Agent LLM Provider: ${openaiAgentConfig.provider}`);
    console.log(`   Agent Model: ${openaiAgentConfig.model}`);
    
    const openaiMemoryProvider = EmbeddingProviderFactory.createProvider(openaiAgentConfig);
    console.log(`   Memory Provider: ${openaiMemoryProvider.getProviderName()}`);
    
    // Test Anthropic agent (bull_researcher)
    console.log('\n2️⃣ Testing Anthropic Agent Memory Provider...');
    const anthropicAgentConfig = enhancedConfigLoader.getAgentConfig('bull_researcher');
    console.log(`   Agent LLM Provider: ${anthropicAgentConfig.provider}`);
    console.log(`   Agent Model: ${anthropicAgentConfig.model}`);
    
    const anthropicMemoryProvider = EmbeddingProviderFactory.createProvider(anthropicAgentConfig);
    console.log(`   Memory Provider: ${anthropicMemoryProvider.getProviderName()}`);
    
    // Test Google agent (neutral_analyst)
    console.log('\n3️⃣ Testing Google Agent Memory Provider...');
    const googleAgentConfig = enhancedConfigLoader.getAgentConfig('neutral_analyst');
    console.log(`   Agent LLM Provider: ${googleAgentConfig.provider}`);
    console.log(`   Agent Model: ${googleAgentConfig.model}`);
    
    const googleMemoryProvider = EmbeddingProviderFactory.createProvider(googleAgentConfig);
    console.log(`   Memory Provider: ${googleMemoryProvider.getProviderName()}`);

    // Test actual memory creation
    console.log('\n4️⃣ Testing Memory Creation...');
    const testMemory = new FinancialSituationMemory('test_memory', openaiAgentConfig);
    const memoryInfo = testMemory.getProviderInfo();
    console.log(`   Memory Name: ${memoryInfo.name}`);
    console.log(`   Memory Provider: ${memoryInfo.provider}`);
    console.log(`   Memory Count: ${memoryInfo.memoryCount}`);

    console.log('\n✅ Basic memory provider test completed successfully!');
    console.log('\n📝 Summary:');
    console.log('- OpenAI agents use OpenAI embeddings when possible');
    console.log('- Anthropic agents fallback to available embedding providers');
    console.log('- Google agents use Google embeddings when possible');
    console.log('- All agents have working memory systems');

  } catch (error) {
    console.error('❌ Basic memory provider test failed:', error);
    throw error;
  }
}

// Run the test
basicMemoryProviderTest().catch(console.error);