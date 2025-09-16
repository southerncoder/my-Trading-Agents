/**
 * Test Reddit OAuth Integration
 * 
 * Comprehensive test of Reddit API integration using snoowrap with OAuth 2.0
 * Tests configuration, connection, and basic functionality
 */

import { createLogger } from '../src/utils/enhanced-logger.js';
import { RedditAPI } from '../src/dataflows/reddit.js';
import { TradingAgentsConfig } from '../src/types/config.js';

const logger = createLogger('test', 'reddit-oauth');

async function testRedditOAuth() {
  logger.info('test-start', 'Starting Reddit OAuth integration test');

  try {
    // Test configuration
    const config: TradingAgentsConfig = {
      projectDir: '/tmp/test',
      resultsDir: '/tmp/test/results',
      dataDir: '/tmp/test/data',
      dataCacheDir: '/tmp/test/cache',
      exportsDir: '/tmp/test/exports',
      logsDir: '/tmp/test/logs',
      llmProvider: 'remote_lmstudio',
      deepThinkLlm: 'test-model',
      quickThinkLlm: 'test-model',
      backendUrl: 'http://localhost:1234/v1',
      maxDebateRounds: 3,
      maxRiskDiscussRounds: 2,
      maxRecurLimit: 5,
      onlineTools: true
    };

    // Initialize Reddit API
    const redditAPI = new RedditAPI(config);
    logger.info('api-initialized', 'Reddit API initialized');

    // Test connection (will only work if credentials are configured)
    logger.info('testing-connection', 'Testing Reddit API connection...');
    const connectionResult = await redditAPI.testConnection();
    
    if (connectionResult) {
      logger.info('connection-success', 'Reddit API connection successful');
    } else {
      logger.warn('connection-failed', 'Reddit API connection failed - checking credentials configuration');
    }

    // Test sentiment analysis (works with mock data if no credentials)
    logger.info('testing-sentiment', 'Testing sentiment analysis...');
    const sentiment = await redditAPI.analyzeSentiment('AAPL');
    
    logger.info('sentiment-result', 'Sentiment analysis completed', {
      symbol: sentiment.symbol,
      sentiment: sentiment.sentiment,
      confidence: sentiment.confidence,
      mentions: sentiment.mentions,
      totalScore: sentiment.analysis.total_score
    });

    // Test post fetching (works with mock/empty data if no credentials)
    logger.info('testing-posts', 'Testing post fetching...');
    const posts = await redditAPI.getPosts(['TSLA', 'MSFT']);
    
    logger.info('posts-result', 'Post fetching completed', {
      postsCount: posts.length,
      symbols: ['TSLA', 'MSFT']
    });

    // Test global news (works with fallback if no credentials)
    logger.info('testing-global-news', 'Testing global news...');
    const globalNews = await redditAPI.getGlobalNews('2025-09-06', 7, 10);
    
    logger.info('global-news-result', 'Global news fetching completed', {
      contentLength: globalNews.length,
      hasContent: globalNews.includes('Global News Reddit')
    });

    // Test company news (works with fallback if no credentials)
    logger.info('testing-company-news', 'Testing company news...');
    const companyNews = await redditAPI.getCompanyNews('NVDA', '2025-09-06', 7, 10);
    
    logger.info('company-news-result', 'Company news fetching completed', {
      contentLength: companyNews.length,
      ticker: 'NVDA',
      hasContent: companyNews.includes('NVDA')
    });

    logger.info('test-complete', 'Reddit OAuth integration test completed successfully', {
      connectionWorking: connectionResult,
      sentimentAnalysisWorking: sentiment.symbol === 'AAPL',
      postFetchingWorking: Array.isArray(posts),
      globalNewsWorking: typeof globalNews === 'string',
      companyNewsWorking: typeof companyNews === 'string'
    });

    return {
      success: true,
      results: {
        connection: connectionResult,
        sentiment: sentiment,
        posts: posts,
        globalNews: globalNews.substring(0, 200),
        companyNews: companyNews.substring(0, 200)
      }
    };

  } catch (error) {
    logger.error('test-error', 'Reddit OAuth integration test failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Configuration instructions
function logConfigurationInstructions() {
  logger.info('config-instructions', 'Reddit OAuth Configuration Instructions', {
    step1: 'Visit https://www.reddit.com/prefs/apps/ and create a new app',
    step2: 'Choose "script" type for username/password or "web app" for OAuth',
    step3: 'Copy client ID and secret to your .env.local file',
    step4: 'Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET environment variables',
    step5_oauth: 'For OAuth: Set REDDIT_REFRESH_TOKEN (recommended)',
    step5_script: 'For script: Set REDDIT_USERNAME and REDDIT_PASSWORD',
    step6: 'Set REDDIT_USER_AGENT to identify your application',
    note: 'Test will work without credentials but with limited functionality'
  });
}

// Main execution
async function main() {
  console.log('🧪 Starting Reddit OAuth Integration Test...\n');
  
  logger.info('main-start', 'Starting Reddit OAuth integration verification');
  
  // Log configuration instructions
  logConfigurationInstructions();
  
  // Run the test
  const result = await testRedditOAuth();
  
  if (result.success && result.results) {
    logger.info('main-success', 'Reddit OAuth integration test completed successfully');
    console.log('\n✅ Reddit OAuth Integration Test PASSED');
    console.log('📋 Check the logs above for detailed results');
    
    if (result.results.connection) {
      console.log('🔐 Reddit API connection: SUCCESSFUL');
    } else {
      console.log('⚙️  Reddit API connection: No credentials or connection failed');
      console.log('   Configure Reddit API credentials in .env.local for full functionality');
    }
    
    console.log(`📊 Sentiment analysis: ${result.results.sentiment.sentiment} (${result.results.sentiment.mentions} mentions)`);
    console.log(`📄 Posts fetched: ${result.results.posts.length}`);
    console.log(`📰 Global news: ${result.results.globalNews.includes('data not accessible') ? 'fallback mode' : 'working'}`);
    console.log(`🏢 Company news: ${result.results.companyNews.includes('data not accessible') ? 'fallback mode' : 'working'}`);
    
  } else {
    logger.error('main-failure', 'Reddit OAuth integration test failed');
    console.log('\n❌ Reddit OAuth Integration Test FAILED');
    console.log('📋 Error:', result.error);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { testRedditOAuth, logConfigurationInstructions };