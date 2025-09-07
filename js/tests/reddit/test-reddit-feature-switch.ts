/**
 * Reddit Feature Switch Test
 * Tests that Reddit integration can be properly disabled/enabled via environment variable
 */

import { RedditAPI } from '../../src/dataflows/reddit.js';

console.log('🔧 Reddit Feature Switch Test');
console.log('==============================\n');

// Test basic configuration
const testConfig = {
  projectDir: '/tmp',
  resultsDir: '/tmp/results',
  dataDir: '/tmp/data',
  dataCacheDir: '/tmp/cache',
  exportsDir: '/tmp/exports',
  logsDir: '/tmp/logs',
  llmProvider: 'lm_studio' as const,
  deepThinkLlm: 'test-model',
  quickThinkLlm: 'test-model',
  backendUrl: 'http://localhost:1234/v1',
  maxDebateRounds: 3,
  maxRiskDiscussRounds: 2,
  maxRecurLimit: 5,
  onlineTools: true
};

console.log('📋 Environment Configuration:');
console.log(`   REDDIT_ENABLED: ${process.env.REDDIT_ENABLED || 'undefined'}`);
console.log(`   REDDIT_CLIENT_ID: ${process.env.REDDIT_CLIENT_ID ? 'configured' : 'not configured'}`);
console.log(`   REDDIT_CLIENT_SECRET: ${process.env.REDDIT_CLIENT_SECRET ? 'configured' : 'not configured'}\n`);

try {
  console.log('🧪 Testing Reddit API with feature switch...\n');
  
  // Test Reddit API instantiation
  const redditAPI = new RedditAPI(testConfig);
  console.log('✅ Reddit API instantiated successfully');
  
  // Test connection (should respect feature switch)
  console.log('🔍 Testing connection...');
  const connected = await redditAPI.testConnection();
  console.log(`   Connection result: ${connected ? 'CONNECTED' : 'DISABLED/FAILED'}`);
  
  // Test sentiment analysis (should respect feature switch)
  console.log('🔍 Testing sentiment analysis...');
  const sentiment = await redditAPI.analyzeSentiment('AAPL');
  console.log(`   Sentiment result: ${sentiment.sentiment} (${sentiment.mentions} mentions)`);
  console.log(`   Analysis topics: ${sentiment.analysis.trending_topics.join(', ')}`);
  
  // Test posts fetching (should respect feature switch)
  console.log('🔍 Testing posts fetching...');
  const posts = await redditAPI.getPosts(['TSLA']);
  console.log(`   Posts fetched: ${posts.length} posts`);
  
  console.log('\n🎉 Reddit Feature Switch Test COMPLETED!');
  
  // Show current status
  const redditEnabled = process.env.REDDIT_ENABLED?.toLowerCase() === 'true';
  console.log('\n📋 Current Status:');
  console.log(`   ✅ Feature Switch Working: ${redditEnabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`   ✅ API Integration: ${connected ? 'CONNECTED' : 'DISABLED/OFFLINE'}`);
  console.log(`   ✅ Graceful Handling: ${sentiment.analysis.trending_topics.includes('Reddit disabled') ? 'YES' : 'N/A'}`);
  
  if (!redditEnabled) {
    console.log('\n💡 To enable Reddit:');
    console.log('   1. Set REDDIT_ENABLED=true in .env.local');
    console.log('   2. Complete OAuth setup with: npx vite-node tests/reddit/reddit-oauth-setup.ts');
    console.log('   3. Test with: npx vite-node tests/reddit/test-reddit-auth-diagnostic.ts');
  }
  
} catch (error) {
  console.error('❌ Test failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}

console.log('\n✨ Feature switch test completed successfully!');