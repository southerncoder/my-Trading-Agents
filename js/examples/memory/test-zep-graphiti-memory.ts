// moved from tests/memory/test-zep-graphiti-memory.ts
// ...existing code...
import { createZepGraphitiMemory, ZepGraphitiConfig, EpisodeType } from '../../src/providers/zep-graphiti-memory-provider';
import { AgentLLMConfig } from '../../src/types/agent-config';

/**
 * Test Zep Graphiti Memory Provider
 * 
 * This test verifies that the ZepGraphitiMemoryProvider can:
 * 1. Connect to the Python service
 * 2. Add episodes and facts to the knowledge graph
 * 3. Search for memories using semantic search
 * 4. Maintain compatibility with existing FinancialSituationMemory interface
 */

async function testZepGraphitiMemoryProvider() {
  console.log('\n=== Testing Zep Graphiti Memory Provider ===\n');

  const agentConfig: AgentLLMConfig = {
    provider: 'lm_studio',
    model: 'microsoft/phi-4-mini-reasoning',
    temperature: 0.1,
    maxTokens: 4000,
    apiKey: 'lm-studio',
    baseUrl: process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1'
  };

  const zepConfig: ZepGraphitiConfig = {
    sessionId: 'test-trading-session',
    userId: 'test-trader',
    serviceUrl: process.env.ZEP_SERVICE_URL || 'http://localhost:8000',
    maxResults: 5
  };

  try {
    // Test 1: Create and connect to service
    console.log('1. Testing connection to Zep Graphiti service...');
    const memoryProvider = await createZepGraphitiMemory(zepConfig, agentConfig);
    console.log('✅ Successfully connected to Zep Graphiti service');

    // Test 2: Add some trading episodes
    console.log('\n2. Adding trading episodes to memory...');
    await memoryProvider.addEpisode(
      'Market Analysis',
      'AAPL shows strong technical indicators with RSI at 45 and moving averages aligning bullishly',
      EpisodeType.TEXT,
      { 
        symbol: 'AAPL',
        indicator_type: 'technical',
        recommendation: 'Consider long position with strict stop-loss'
      }
    );

    await memoryProvider.addEpisode(
      'Risk Assessment',
      'High volatility detected in tech sector, recommend reducing position sizes by 25%',
      EpisodeType.TEXT,
      {
        sector: 'technology',
        risk_level: 'high',
        recommendation: 'Reduce position sizes for risk management'
      }
    );
    console.log('✅ Successfully added trading episodes');

    // Test 3: Add structured facts
    console.log('\n3. Adding structured facts to knowledge graph...');
    await memoryProvider.addFact(
      'AAPL',
      'Technology Sector',
      'belongs_to',
      0.95,
      { fact_type: 'sector_classification' }
    );

    await memoryProvider.addFact(
      'Technology Sector',
      'High Volatility',
      'currently_experiencing',
      0.85,
      { fact_type: 'market_condition' }
    );
    console.log('✅ Successfully added structured facts');

    // Test 4: Search for memories
    console.log('\n4. Testing memory search functionality...');
    const searchResults = await memoryProvider.searchMemories('AAPL technical analysis');
    console.log(`Found ${searchResults.facts.length} relevant facts`);
    
    if (searchResults.facts.length > 0) {
      console.log('Sample fact:', searchResults.facts[0].fact);
      console.log('Confidence:', searchResults.facts[0].confidence);
    }

    // Test 5: Test compatibility with FinancialSituationMemory interface
    console.log('\n5. Testing FinancialSituationMemory compatibility...');
    const memoryMatches = await memoryProvider.getMemories('Need advice on AAPL investment', 2);
    console.log(`Found ${memoryMatches.length} memory matches`);
    
    memoryMatches.forEach((match, index) => {
      console.log(`Match ${index + 1}:`);
      console.log(`  Situation: ${match.matchedSituation}`);
      console.log(`  Recommendation: ${match.recommendation}`);
      console.log(`  Similarity: ${match.similarityScore}`);
    });

    // Test 6: Add financial situations (compatibility test)
    console.log('\n6. Testing addSituations compatibility...');
    await memoryProvider.addSituations([
      [
        'Market showing signs of correction with multiple sectors declining',
        'Consider defensive positioning with increased cash allocation and blue-chip stocks'
      ],
      [
        'Earnings season approaching with high expectations',
        'Focus on companies with strong fundamentals and conservative guidance'
      ]
    ]);
    console.log('✅ Successfully added financial situations');

    // Test 7: Provider info
    console.log('\n7. Testing provider information...');
    const providerInfo = memoryProvider.getProviderInfo();
    console.log('Provider Info:', providerInfo);

    console.log('\n🎉 All tests passed! Zep Graphiti Memory Provider is working correctly.\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('\nMake sure:');
    console.error(`1. The Python Zep service is running on ${process.env.ZEP_SERVICE_URL || 'http://localhost:8000'}`);
    console.error('2. Neo4j database is accessible');
    console.error('3. All dependencies are installed\n');
    process.exit(1);
  }
}

// Run the test
testZepGraphitiMemoryProvider().catch(console.error);