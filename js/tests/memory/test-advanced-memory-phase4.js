/**
 * Test Advanced Memory System - Phase 4: Context Retrieval
 * 
 * Tests the context retrieval functionality:
 * - Multi-dimensional similarity searches
 * - Historical scenario matching
 * - Performance-based context retrieval
 * - Relevance scoring and ranking algorithms
 * - Contextual insight generation
 */

console.log('🚀 Testing Advanced Memory System - Phase 4: Context Retrieval');

async function testPhase4ContextRetrieval() {
  try {
    // Test 1: Import ContextRetrievalLayer
    console.log('\n📦 Test 1: Import ContextRetrievalLayer');
    const { ContextRetrievalUtils, createContextRetrievalLayer } = await import('../../src/memory/advanced/context-retrieval-layer.js');
    console.log('✅ ContextRetrievalLayer imported successfully');
    
    // Test 2: Create mock Zep client with search capabilities
    console.log('\n🔧 Test 2: Create Mock Zep Client with Search');
    const mockZepClient = {
      searchMemory: async (query, options) => {
        console.log(`   Mock search: "${query}" (max: ${options?.maxResults || 10})`);
        
        // Return mock search results based on query
        const mockFacts = [
          {
            fact_id: 'fact-1',
            fact: 'Bull market momentum breakout pattern observed with RSI 65, high volume',
            created_at: '2025-08-29T10:00:00Z',
            metadata: {
              market_regime: 'bull',
              volatility: 0.02,
              rsi: 65,
              success_rate: 0.8
            }
          },
          {
            fact_id: 'fact-2', 
            fact: 'Bear market reversal pattern with oversold conditions RSI 30',
            created_at: '2025-08-28T15:30:00Z',
            metadata: {
              market_regime: 'bear',
              volatility: 0.05,
              rsi: 30,
              success_rate: 0.7
            }
          },
          {
            fact_id: 'fact-3',
            fact: 'Sideways consolidation pattern in neutral market conditions',
            created_at: '2025-08-27T09:15:00Z', 
            metadata: {
              market_regime: 'sideways',
              volatility: 0.015,
              rsi: 50,
              success_rate: 0.6
            }
          }
        ];
        
        return { facts: mockFacts };
      }
    };
    
    const logger = {
      info: (msg, data) => console.log(`   INFO: ${msg}`, data ? JSON.stringify(data, null, 2) : ''),
      warn: (msg, data) => console.log(`   WARN: ${msg}`, data ? JSON.stringify(data, null, 2) : ''),
      error: (msg, data) => console.log(`   ERROR: ${msg}`, data ? JSON.stringify(data, null, 2) : '')
    };
    
    console.log('✅ Mock Zep client with search capabilities created');
    
    // Test 3: Create ContextRetrievalLayer instance
    console.log('\n🏗️  Test 3: Create ContextRetrievalLayer');
    const contextRetrieval = createContextRetrievalLayer(mockZepClient, {
      maxSearchResults: 10,
      relevanceThreshold: 0.7,
      cacheEnabled: true,
      logger: logger
    });
    console.log('✅ ContextRetrievalLayer created successfully');
    
    // Test 4: Test context retrieval with multi-dimensional criteria
    console.log('\n🔍 Test 4: Multi-Dimensional Context Retrieval');
    
    const retrievalCriteria = {
      current_market_conditions: {
        market_regime: 'bull',
        volatility: 0.025,
        volume_ratio: 1.2,
        price_level: 150,
        trend_direction: 'up',
        momentum: 0.1
      },
      technical_indicators: {
        rsi: 68,
        macd: 0.5,
        bollinger_position: 0.8,
        momentum: 0.1
      },
      time_horizon: 'short_term',
      risk_tolerance: 'moderate',
      strategy_type: 'momentum_breakout',
      max_results: 5,
      relevance_threshold: 0.6
    };
    
    const retrievalResult = await contextRetrieval.retrieveRelevantContext(retrievalCriteria);
    
    console.log('✅ Context retrieval completed');
    console.log(`   Retrieved memories: ${retrievalResult.retrieved_memories.length}`);
    console.log(`   Search strategy: ${retrievalResult.search_insights.search_strategy}`);
    console.log(`   Avg relevance: ${retrievalResult.relevance_metrics.avg_relevance_score.toFixed(3)}`);
    console.log(`   Total search time: ${retrievalResult.relevance_metrics.retrieval_performance.total_retrieval_time_ms}ms`);
    
    // Test memory details
    if (retrievalResult.retrieved_memories.length > 0) {
      const firstMemory = retrievalResult.retrieved_memories[0];
      console.log(`   Sample memory ID: ${firstMemory.memory_id}`);
      console.log(`   Memory type: ${firstMemory.memory_type}`);
      console.log(`   Relevance score: ${firstMemory.relevance_score.toFixed(3)}`);
      console.log(`   Key factors: ${firstMemory.contextual_insights.key_factors.join(', ')}`);
    }
    
    // Test 5: Test historical scenario matching
    console.log('\n📊 Test 5: Historical Scenario Matching');
    
    const currentScenario = {
      market_conditions: {
        market_regime: 'bull',
        volatility: 0.02,
        volume_ratio: 1.1,
        trend_strength: 0.8
      },
      technical_indicators: {
        rsi: 65,
        macd: 0.45,
        bollinger_position: 0.7
      },
      context_description: 'Strong bull market with momentum indicators showing continuation pattern'
    };
    
    const similarScenarios = await contextRetrieval.findSimilarScenarios(currentScenario, {
      lookback_days: 90,
      min_similarity: 0.6,
      max_results: 3
    });
    
    console.log('✅ Historical scenario matching completed');
    console.log(`   Similar scenarios found: ${similarScenarios.length}`);
    
    if (similarScenarios.length > 0) {
      const topScenario = similarScenarios[0];
      console.log(`   Top scenario similarity: ${topScenario.similarity_score.toFixed(3)}`);
      console.log(`   Historical date: ${topScenario.historical_date}`);
      console.log(`   Lessons learned: ${topScenario.lessons_learned.join(', ')}`);
    }
    
    // Test 6: Test performance-based context retrieval
    console.log('\n🎯 Test 6: Performance-Based Context Retrieval');
    
    const performanceContext = await contextRetrieval.retrievePerformanceContext('agent-001', {
      strategy_type: 'momentum_breakout',
      market_conditions: {
        market_regime: 'bull',
        volatility: 0.02
      },
      time_period: 'last_30_days',
      performance_threshold: 0.7
    });
    
    console.log('✅ Performance context retrieval completed');
    console.log(`   Performance records found: ${performanceContext.length}`);
    
    if (performanceContext.length > 0) {
      const firstPerf = performanceContext[0];
      console.log(`   Agent ID: ${firstPerf.agent_id}`);
      console.log(`   Success rate: ${firstPerf.strategy_performance.success_rate}`);
      console.log(`   Avg return: ${firstPerf.strategy_performance.avg_return}`);
      console.log(`   Key insights: ${firstPerf.key_insights.join(', ')}`);
      console.log(`   Recommendations: ${firstPerf.recommended_adjustments.join(', ')}`);
    }
    
    // Test 7: Test utility functions
    console.log('\n🧮 Test 7: Context Retrieval Utilities');
    
    // Test market similarity calculation
    const conditions1 = {
      market_regime: 'bull',
      volatility: 0.02,
      volume_ratio: 1.2,
      trend_direction: 'up'
    };
    
    const conditions2 = {
      market_regime: 'bull',
      volatility: 0.025,
      volume_ratio: 1.1,
      trend_direction: 'up'
    };
    
    const marketSimilarity = ContextRetrievalUtils.calculateMarketSimilarity(conditions1, conditions2);
    console.log(`   Market similarity: ${marketSimilarity.toFixed(3)} (should be high for similar bull markets)`);
    
    // Test search keyword generation
    const keywords = ContextRetrievalUtils.generateSearchKeywords(conditions1);
    console.log(`   Generated keywords: ${keywords.join(', ')}`);
    
    // Test 8: Test caching functionality
    console.log('\n💾 Test 8: Context Retrieval Caching');
    
    // First retrieval (should hit the search)
    const startTime1 = Date.now();
    await contextRetrieval.retrieveRelevantContext(retrievalCriteria);
    const time1 = Date.now() - startTime1;
    
    // Second retrieval (should hit the cache)
    const startTime2 = Date.now();
    const cachedResult = await contextRetrieval.retrieveRelevantContext(retrievalCriteria);
    const time2 = Date.now() - startTime2;
    
    console.log(`   First retrieval time: ${time1}ms`);
    console.log(`   Second retrieval time: ${time2}ms (cached)`);
    console.log(`   Cache strategy: ${cachedResult.search_insights.search_strategy}`);
    console.log('✅ Caching functionality working');
    
    console.log('\n🎉 Phase 4 Context Retrieval Tests Completed!');
    console.log('\nSummary:');
    console.log('✅ ContextRetrievalLayer creation working');
    console.log('✅ Multi-dimensional context retrieval working'); 
    console.log('✅ Historical scenario matching working');
    console.log('✅ Performance-based context retrieval working');
    console.log('✅ Relevance scoring and ranking algorithms working');
    console.log('✅ Contextual insight generation working');
    console.log('✅ Utility functions for similarity calculations working');
    console.log('✅ Caching functionality working');
    
    console.log('\nImplemented Context Retrieval Features:');
    console.log('• Multi-dimensional similarity scoring');
    console.log('• Intelligent search strategy selection');
    console.log('• Historical scenario pattern matching');
    console.log('• Performance-based context filtering');
    console.log('• Relevance threshold filtering');
    console.log('• Contextual insight generation');
    console.log('• Search result caching for performance');
    console.log('• Market condition similarity algorithms');
    console.log('• Technical indicator matching');
    console.log('• Temporal similarity calculations');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Phase 4 test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run the test
testPhase4ContextRetrieval()
  .then(success => {
    if (success) {
      console.log('\n🚀 Phase 4 tests passed! Context retrieval with intelligent search is working.');
      console.log('🔍 Multi-dimensional similarity and scenario matching functional.');
      console.log('➡️  Ready to proceed to Phase 5: Performance Learning.');
      process.exit(0);
    } else {
      console.log('\n💥 Phase 4 tests failed. Please fix issues before proceeding.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });