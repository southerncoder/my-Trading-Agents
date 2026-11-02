import { BraveNewsProvider } from '../services/news-aggregator-service/src/providers/brave-news.js';

async function testBraveNewsProvider() {
  console.log('🧪 Testing Brave News Provider with vite-node...\n');

  // Check if API key is available
  const apiKey = process.env.BRAVE_NEWS_API_KEY;
  if (!apiKey) {
    console.log('⚠️  BRAVE_NEWS_API_KEY not found in environment variables');
    console.log('Please set BRAVE_NEWS_API_KEY in your .env.local file\n');
    return;
  }

  console.log('✅ BRAVE_NEWS_API_KEY found');

  // Create provider instance
  const provider = new BraveNewsProvider({
    apiKey: apiKey,
    baseUrl: 'https://api.search.brave.com/res/v1/news'
  });

  console.log('✅ BraveNewsProvider instance created');

  try {
    // Test health check
    console.log('\n🔍 Testing health check...');
    const health = await provider.healthCheck();
    console.log('Health check result:', health);

    // Test trending topics (if available)
    if (provider.getTrendingTopics) {
      console.log('\n🔥 Testing trending topics...');
      const trending = await provider.getTrendingTopics();
      console.log('Trending topics:', trending);
    }

    // Test search (with a simple query)
    console.log('\n🔎 Testing news search...');
    const searchResults = await provider.searchNews('artificial intelligence', {
      limit: 3,
      sortBy: 'relevance'
    });
    console.log('Search results:', JSON.stringify(searchResults, null, 2));

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testBraveNewsProvider().catch(console.error);