/**
 * Reddit Authentication Test - Quick Diagnostic
 * Use this to verify your Reddit authentication setup
 */

import { RedditAPI } from '../../src/dataflows/reddit.js';

console.log('🔐 Reddit Authentication Diagnostic');
console.log('=====================================\n');

// Check environment variables
console.log('📋 Environment Variables Status:');
console.log(`   REDDIT_ENABLED: ${process.env.REDDIT_ENABLED ? '✅ SET' : '❌ MISSING'}`);
console.log(`   REDDIT_CLIENT_ID: ${process.env.REDDIT_CLIENT_ID ? '✅ SET' : '❌ MISSING'}`);
console.log(`   REDDIT_CLIENT_SECRET: ${process.env.REDDIT_CLIENT_SECRET ? '✅ SET' : '❌ MISSING'}`);
console.log(`   REDDIT_REFRESH_TOKEN: ${process.env.REDDIT_REFRESH_TOKEN ? '✅ SET' : '❌ MISSING'}`);
console.log(`   REDDIT_REFRESH_TOKEN: ${process.env.REDDIT_REFRESH_TOKEN ? '✅ SET' : '❌ MISSING'}\n`);

// Determine authentication method
let authMethod = 'None';
let canAuthenticate = false;

// Check for feature switch first
if (process.env.REDDIT_ENABLED === 'false') {
  authMethod = 'Disabled (Feature Switch)';
  canAuthenticate = false;
} else if (process.env.REDDIT_REFRESH_TOKEN) {
  authMethod = 'OAuth (Refresh Token)';
  canAuthenticate = true;
} else if (process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET) {
  authMethod = 'OAuth (Setup Required)';
  canAuthenticate = false;
} else {
  authMethod = 'Not Configured';
  canAuthenticate = false;
}

console.log('🔍 Authentication Analysis:');
console.log(`   Method: ${authMethod}`);
console.log(`   Can Authenticate: ${canAuthenticate ? '✅ YES' : '❌ NO'}\n`);

if (!canAuthenticate) {
  console.log('⚠️  AUTHENTICATION SETUP REQUIRED');
  console.log('=================================\n');
  
  if (process.env.REDDIT_ENABLED === 'false') {
    console.log('� Reddit is currently disabled via feature switch.');
    console.log('   To enable Reddit integration:');
    console.log('   1. Set REDDIT_ENABLED=true in .env.local');
    console.log('   2. Complete OAuth setup (see instructions below)\n');
  } else if (process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET && !process.env.REDDIT_REFRESH_TOKEN) {
    console.log('🔐 OAuth credentials configured but refresh token missing.');
    console.log('   Complete OAuth setup:');
    console.log('   npx vite-node tests/reddit/reddit-oauth-setup.ts\n');
  } else {
    console.log('🛠️  Complete Reddit OAuth setup needed.');
    console.log('   Required environment variables:\n');
    
    console.log('   1. Add Reddit app credentials:');
    console.log('   REDDIT_CLIENT_ID=your_client_id');
    console.log('   REDDIT_CLIENT_SECRET=your_client_secret\n');
    
    console.log('   2. Complete OAuth flow:');
    console.log('   npx vite-node tests/reddit/reddit-oauth-setup.ts\n');
    
    console.log('   3. Enable Reddit integration:');
    console.log('   REDDIT_ENABLED=true\n');
  }
  
  console.log('📖 Full setup guide: docs/reddit/REDDIT-FEATURE-SWITCH.md');
  process.exit(0);
}

// Test authentication if possible
console.log('🧪 Testing Reddit API Authentication...\n');

try {
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

  const redditAPI = new RedditAPI(testConfig);
  
  // Test connection
  const connected = await redditAPI.testConnection();
  
  if (connected) {
    console.log('🎉 SUCCESS: Reddit API authentication working!');
    console.log('✅ You can now use Reddit social sentiment analysis');
    console.log('📊 Ready to integrate with trading workflow\n');
    
    // Quick test of functionality
    console.log('🔍 Quick functionality test...');
    const sentiment = await redditAPI.analyzeSentiment('AAPL');
    console.log(`   AAPL sentiment: ${sentiment.sentiment} (${sentiment.mentions} mentions)`);
    
  } else {
    console.log('❌ AUTHENTICATION FAILED');
    console.log('🔧 Possible issues:');
    console.log('   - Incorrect credentials');
    console.log('   - Reddit app type mismatch');
    console.log('   - Reddit API rate limits');
    console.log('   - Network connectivity');
    console.log('\n📖 Check REDDIT_SETUP_GUIDE.md for troubleshooting');
  }
  
} catch (error) {
  console.error('💥 ERROR:', error instanceof Error ? error.message : String(error));
  console.log('\n🔧 Check your Reddit app configuration and credentials');
}

console.log('\n✨ Authentication diagnostic complete!');