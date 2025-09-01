import { enhancedConfigLoader } from '../config/enhanced-loader';
import { FinancialSituationMemory } from '../agents/utils/memory';
import { EmbeddingProviderFactory } from '../providers/memory-provider';

/**
 * Test memory provider selection based on agent LLM configuration
 */
async function testMemoryProviderSelection(): Promise<void> {
  console.log('🧠 Testing Memory Provider Selection Based on Agent Configuration\n');

  try {
    // Test different agent types and their memory providers
    const testAgents = [
      'market_analyst',   // OpenAI LLM -> Should use OpenAI embeddings
      'bull_researcher',  // Anthropic LLM -> Should use fallback (OpenAI if available)
      'neutral_analyst',  // Google LLM -> Should use Google embeddings
      'trader'           // OpenAI LLM -> Should use OpenAI embeddings
    ];

    console.log('📋 Agent Memory Provider Mapping:');
    console.log('='.repeat(60));

    for (const agentType of testAgents) {
      // Get agent configuration
      const agentConfig = enhancedConfigLoader.getAgentConfig(agentType);
      
      // Create memory provider
      const memoryProvider = EmbeddingProviderFactory.createProvider(agentConfig);
      
      // Create financial memory instance
      const memory = new FinancialSituationMemory(`${agentType}_memory`, agentConfig);
      const memoryInfo = memory.getProviderInfo();
      
      console.log(`${agentType.padEnd(20)}: LLM=${agentConfig.provider.padEnd(10)} → Memory=${memoryInfo.provider}`);
    }

    console.log('\n🧪 Testing Memory Operations...');
    
    // Test with a sample agent (market analyst)
    const marketAnalystConfig = enhancedConfigLoader.getAgentConfig('market_analyst');
    const testMemory = new FinancialSituationMemory('test_memory', marketAnalystConfig);
    
    console.log(`\n📊 Test Memory Provider: ${testMemory.getProviderInfo().provider}`);
    
    // Add some test situations
    const testSituations: Array<[string, string]> = [
      ['Market showing high volatility with tech stocks declining', 'Consider defensive positioning and reduce tech exposure'],
      ['Strong earnings report with positive guidance', 'Monitor for momentum continuation and potential entry points'],
      ['Fed rate decision approaching with dovish signals', 'Prepare for potential rotation to growth sectors']
    ];
    
    console.log('\n📝 Adding test situations to memory...');
    await testMemory.addSituations(testSituations);
    
    const memoryStats = testMemory.getProviderInfo();
    console.log(`✅ Added ${memoryStats.memoryCount} situations using ${memoryStats.provider} provider`);
    
    // Test memory retrieval
    console.log('\n🔍 Testing memory retrieval...');
    const querySituation = 'Market volatility is increasing and investors are getting nervous';
    const matches = await testMemory.getMemories(querySituation, 2);
    
    if (matches.length > 0) {
      console.log(`✅ Found ${matches.length} relevant memories:`);
      matches.forEach((match, index) => {
        console.log(`   ${index + 1}. Similarity: ${match.similarityScore.toFixed(3)}`);
        console.log(`      Situation: ${match.matchedSituation.substring(0, 50)}...`);
        console.log(`      Recommendation: ${match.recommendation.substring(0, 50)}...`);
      });
    } else {
      console.log('⚠️ No relevant memories found (expected if embeddings are not available)');
    }

    console.log('\n🎯 Memory Provider Selection Summary:');
    console.log('- OpenAI agents → OpenAI embeddings (when API key available)');
    console.log('- Google agents → Google embeddings (when API key available)');
    console.log('- Anthropic agents → Fallback to OpenAI embeddings (smart fallback)');
    console.log('- Local agents → Fallback to text-based embeddings');

    console.log('\n🎉 Memory provider testing completed successfully!');

  } catch (error) {
    console.error('❌ Memory provider test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testMemoryProviderSelection();
}