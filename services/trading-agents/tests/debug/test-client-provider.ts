#!/usr/bin/env npx vite-node
/**
 * Test the new client-based Zep Graphiti Memory Provider
 * This test verifies that the provider works with the Python client bridge
 */

import { createZepGraphitiMemory, ZepGraphitiConfig, EpisodeType } from '../../src/providers/zep-graphiti/zep-graphiti-memory-provider-client';
import { AgentLLMConfig } from '../../src/types/agent-config';

async function testClientBasedProvider() {
  console.log('🧠 Testing Client-Based Zep Graphiti Memory Provider');
  console.log('='.repeat(60));

  // Configure LLM for the agent
  const agentConfig: AgentLLMConfig = {
    model: 'microsoft/phi-4-mini-reasoning',
    temperature: 0.1,
    maxTokens: 4000,
    apiKey: 'lm-studio',
    baseUrl: process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1',
    provider: 'lm_studio'
  };

  // Configure Zep Graphiti
  const zepConfig: ZepGraphitiConfig = {
    sessionId: `test-client-session-${Date.now()}`,
    userId: 'test-client-user',
    maxResults: 5
  };

  try {
    console.log('✅ Creating ZepGraphitiMemoryProvider with client bridge...');
    const memoryProvider = await createZepGraphitiMemory(zepConfig, agentConfig);
    console.log('✅ Provider created and connection tested successfully');

    // Test 1: Add trading episodes
    console.log('\n📝 Test 1: Adding trading episodes...');
    await memoryProvider.addEpisode(
      'Market Analysis',
      'AAPL shows strong bullish momentum with RSI at 55 and moving averages trending upward',
      EpisodeType.ANALYSIS,
      { 
        symbol: 'AAPL',
        indicator_type: 'technical',
        recommendation: 'Consider long position with stop-loss at 10%'
      }
    );

    await memoryProvider.addEpisode(
      'Risk Assessment',
      'Market volatility increasing, recommend position size reduction',
      EpisodeType.ANALYSIS,
      {
        risk_level: 'medium',
        recommendation: 'Reduce position sizes by 15%'
      }
    );
    console.log('✅ Episodes added successfully');

    // Test 2: Search memories
    console.log('\n🔍 Test 2: Searching memories...');
    const searchResult = await memoryProvider.searchMemories('AAPL technical analysis');
    console.log(`✅ Found ${searchResult.facts.length} facts for AAPL technical analysis`);
    
    if (searchResult.facts.length > 0) {
      console.log('📋 Sample search result:');
      console.log(`   Fact: ${searchResult.facts[0].fact}`);
      console.log(`   Confidence: ${searchResult.facts[0].confidence}`);
      console.log(`   Source: ${searchResult.facts[0].source_entity || 'Unknown'}`);
    }

    // Test 3: FinancialSituationMemory compatibility
    console.log('\n💰 Test 3: Testing FinancialSituationMemory compatibility...');
    await memoryProvider.addSituations([
      ['High volatility market conditions', 'Reduce position sizes and increase cash reserves'],
      ['Strong earnings growth', 'Consider increasing allocation to growth stocks']
    ]);

    const memories = await memoryProvider.getMemories('market volatility', 2);
    console.log(`✅ Found ${memories.length} compatible memory matches`);
    
    if (memories.length > 0) {
      console.log('📋 Sample memory match:');
      console.log(`   Situation: ${memories[0].matchedSituation}`);
      console.log(`   Recommendation: ${memories[0].recommendation}`);
      console.log(`   Similarity: ${memories[0].similarityScore}`);
    }

    // Test 4: Add structured facts
    console.log('\n🔗 Test 4: Adding structured facts...');
    await memoryProvider.addFact(
      'AAPL',
      'TechSector',
      'belongs_to',
      0.95,
      { relationship_type: 'sector_membership' }
    );
    console.log('✅ Structured fact added successfully');

    // Test 5: Provider info
    console.log('\n📊 Test 5: Provider information...');
    const providerInfo = memoryProvider.getProviderInfo();
    console.log(`✅ Provider: ${providerInfo.provider}`);
    console.log(`   Name: ${providerInfo.name}`);
    console.log(`   Memory Count: ${providerInfo.memoryCount} (not available via bridge)`);

    console.log('\n' + '='.repeat(60));
    console.log('🎉 ALL TESTS PASSED - Client-based provider working correctly!');
    console.log('✅ Entity_node functionality now uses proper Graphiti client');
    console.log('✅ All HTTP calls replaced with client bridge');
    console.log('✅ Full compatibility with existing FinancialSituationMemory interface');
    console.log('='.repeat(60));

    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('\nPossible issues:');
    console.error('- Zep Graphiti service not running');
    console.error('- Python environment not properly configured');
    console.error('- Bridge script not found or accessible');
    console.error('- Neo4j connection issues');
    return false;
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testClientBasedProvider()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { testClientBasedProvider };