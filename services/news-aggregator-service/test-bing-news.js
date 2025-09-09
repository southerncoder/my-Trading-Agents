import BingNewsProvider from '../providers/bing-news.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testBingNewsProvider() {
  console.log('🧪 Testing Bing News Provider...\n');

  const provider = new BingNewsProvider();

  // Test configuration
  console.log('📋 Configuration Test:');
  console.log(`- Is Configured: ${provider.isConfigured()}`);
  console.log(`- API Key Present: ${!!process.env.BING_NEWS_API_KEY}\n`);

  // Test health check
  console.log('🏥 Health Check Test:');
  try {
    const healthResult = await provider.healthCheck();
    console.log(`- Healthy: ${healthResult.healthy}`);
    console.log(`- Message: ${healthResult.message}`);
  } catch (error) {
    console.log(`- Health Check Failed: ${error.message}`);
  }
  console.log();

  // Test news search (if configured)
  if (provider.isConfigured()) {
    console.log('📰 News Search Test:');
    try {
      const searchResult = await provider.searchNews({
        query: 'Apple stock',
        count: 3
      });
      console.log(`- Status: ${searchResult.status}`);
      console.log(`- Articles Found: ${searchResult.articles?.length || 0}`);
      console.log(`- Provider: ${searchResult.provider}`);

      if (searchResult.articles && searchResult.articles.length > 0) {
        console.log('\n📄 Sample Article:');
        const article = searchResult.articles[0];
        console.log(`- Title: ${article.title}`);
        console.log(`- Source: ${article.source?.name}`);
        console.log(`- Published: ${article.publishedAt}`);
      }
    } catch (error) {
      console.log(`- Search Failed: ${error.message}`);
    }
    console.log();

    // Test trending topics
    console.log('🔥 Trending Topics Test:');
    try {
      const trendingResult = await provider.getTrendingTopics({ count: 3 });
      console.log(`- Status: ${trendingResult.status}`);
      console.log(`- Topics Found: ${trendingResult.topics?.length || 0}`);

      if (trendingResult.topics && trendingResult.topics.length > 0) {
        console.log('\n📈 Sample Topic:');
        const topic = trendingResult.topics[0];
        console.log(`- Name: ${topic.name}`);
        console.log(`- Query: ${topic.query}`);
      }
    } catch (error) {
      console.log(`- Trending Topics Failed: ${error.message}`);
    }
  } else {
    console.log('⚠️  Bing News API key not configured. To test:');
    console.log('1. Get API key from: https://www.microsoft.com/en-us/bing/apis/bing-news-search-api');
    console.log('2. Add BING_NEWS_API_KEY to .env.local');
    console.log('3. Re-run this test\n');
  }

  console.log('✅ Bing News Provider Test Complete!');
}

// Run the test
testBingNewsProvider().catch(console.error);