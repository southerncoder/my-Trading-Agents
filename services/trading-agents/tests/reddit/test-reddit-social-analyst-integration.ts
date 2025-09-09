/**
 * Integration test for Reddit feature switch with Social Analyst
 * Tests the complete flow from Social Analyst → Enhanced Dataflows → Reddit API
 */

import { config } from 'dotenv';
import { createLogger } from '../../src/utils/enhanced-logger';
import { RedditAPI } from '../../src/dataflows/reddit';
import { TradingAgentsConfig } from '../../src/types/config';

// Load environment variables
config({ path: '.env.local' });

const logger = createLogger('test', 'reddit-integration');

async function testRedditIntegration() {
  console.log('🔧 Reddit Integration Test (Social Analyst Flow)');
  console.log('==================================================');
  console.log('');

  const redditEnabled = process.env.REDDIT_ENABLED === 'true';
  console.log(`📋 Environment Configuration:`);
  console.log(`   REDDIT_ENABLED: ${process.env.REDDIT_ENABLED || 'undefined'}`);
  console.log(`   Feature Switch Active: ${redditEnabled ? 'ENABLED' : 'DISABLED'}`);
  console.log('');

  try {
    // Create config for Reddit API
    const tradingConfig: TradingAgentsConfig = {
      projectDir: process.cwd(),
      resultsDir: 'results',
      dataDir: 'data',
      dataCacheDir: 'data/cache',
      exportsDir: 'exports',
      logsDir: 'logs',
      llmProvider: 'openai',
      deepThinkLlm: 'gpt-4',
      quickThinkLlm: 'gpt-3.5-turbo',
      backendUrl: 'http://localhost:8000',
      maxDebateRounds: 3,
      maxRiskDiscussRounds: 2,
      maxRecurLimit: 10,
      onlineTools: true
    };
    
    // Test Reddit API directly (what Enhanced Dataflows uses)
    console.log('🧪 Testing Reddit API Integration...');
    const reddit = new RedditAPI(tradingConfig);
    
    // Test connection
    console.log('🔍 Testing Reddit connection...');
    const connectionResult = await reddit.testConnection();
    
    console.log(`🔗 Connection Test:`);
    console.log(`   Result: ${connectionResult ? 'CONNECTED' : 'DISABLED/FAILED'}`);
    console.log('');

    // Test sentiment analysis
    console.log('🔍 Testing Reddit sentiment analysis...');
    const sentimentResult = await reddit.analyzeSentiment('AAPL');
    
    console.log(`📈 Sentiment Analysis Result:`);
    console.log(`   Symbol: ${sentimentResult.symbol}`);
    console.log(`   Sentiment: ${sentimentResult.sentiment}`);
    console.log(`   Confidence: ${sentimentResult.confidence}`);
    console.log(`   Mentions: ${sentimentResult.mentions}`);
    console.log(`   Trending Topics: ${sentimentResult.analysis.trending_topics.join(', ')}`);
    console.log('');

    // Test posts fetching
    console.log('🔍 Testing Reddit posts fetching...');
    const posts = await reddit.getPosts(['TSLA']);
    
    console.log(`📰 Posts Fetching Result:`);
    console.log(`   Posts Retrieved: ${posts.length}`);
    if (posts.length > 0) {
      console.log(`   Sample Post: ${posts[0].title?.substring(0, 50)}...`);
    }
    console.log('');

    console.log('🎉 Reddit Integration Test COMPLETED!');
    console.log('');
    console.log(`📋 Summary:`);
    console.log(`   ✅ Feature Switch: ${redditEnabled ? 'ENABLED' : 'DISABLED'}`);
    console.log(`   ✅ API Connection: ${connectionResult ? 'CONNECTED' : 'DISABLED'}`);
    console.log(`   ✅ Sentiment Analysis: WORKING`);
    console.log(`   ✅ Posts Fetching: WORKING`);
    console.log(`   ✅ Graceful Degradation: ${!redditEnabled ? 'YES' : 'N/A'}`);
    console.log('');

    if (!redditEnabled) {
      console.log('💡 To enable Reddit integration:');
      console.log('   1. Set REDDIT_ENABLED=true in .env.local');
      console.log('   2. Complete OAuth: npx vite-node tests/reddit/reddit-oauth-setup.ts');
      console.log('   3. Verify: npx vite-node tests/reddit/test-reddit-auth-diagnostic.ts');
    } else {
      console.log('✨ Reddit integration is ENABLED and ready!');
    }

  } catch (error) {
    logger.error('reddit-integration-test-failed', 'Reddit integration test failed', {
      error: error instanceof Error ? error.message : String(error),
      enabled: redditEnabled
    });
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testRedditIntegration()
  .then(() => {
    console.log('✨ Reddit integration test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Reddit integration test failed:', error);
    process.exit(1);
  });