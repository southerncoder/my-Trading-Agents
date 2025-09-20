// Migrated from root: test-bing-news.js
import BingNewsProvider from '../../src/providers/bing-news.js';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  console.log('🧪 Bing News Provider manual test');
  const provider = new BingNewsProvider();
  console.log('Configured:', provider.isConfigured());
  console.log('API Key Present:', !!process.env.BING_NEWS_API_KEY);
  try {
    const health = await provider.healthCheck();
    console.log('Health:', health);
  } catch (e) {
    console.log('Health check failed:', e.message);
  }
  if (provider.isConfigured()) {
    try {
      const search = await provider.searchNews({ query: 'Apple stock', count: 3 });
      console.log('Search articles:', search.articles?.length || 0);
    } catch (e) {
      console.log('Search failed:', e.message);
    }
    try {
      const trending = await provider.getTrendingTopics({ count: 3 });
      console.log('Trending topics:', trending.topics?.length || 0);
    } catch (e) {
      console.log('Trending failed:', e.message);
    }
  }
  console.log('✅ Bing manual test complete');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch(console.error);
}
