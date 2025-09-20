// Manual test migrated from root: test-brave-news.js
// Purpose: Ad-hoc validation of BraveNewsProvider outside automated workflow suite.

import { BraveNewsProvider } from '../../services/news-aggregator-service/src/providers/brave-news.js';

async function testBraveNewsProvider() {
  console.log('🧪 Testing Brave News Provider (manual)...\n');
  const apiKey = process.env.BRAVE_NEWS_API_KEY;
  if (!apiKey) {
    console.log('⚠️  BRAVE_NEWS_API_KEY not set; aborting manual test.');
    return;
  }
  const provider = new BraveNewsProvider({ apiKey, baseUrl: 'https://api.search.brave.com/res/v1/news' });
  try {
    console.log('🔍 healthCheck');
    const health = await provider.healthCheck();
    console.log('Health:', health);
    if (provider.getTrendingTopics) {
      console.log('🔥 trending topics');
      console.log(await provider.getTrendingTopics());
    }
    console.log('🔎 search results (ai, limit=3)');
    const searchResults = await provider.searchNews('artificial intelligence', { limit: 3, sortBy: 'relevance' });
    console.log(JSON.stringify(searchResults, null, 2));
    console.log('\n✅ Brave News manual test complete');
  } catch (err) {
    console.error('❌ Manual test failed:', err.message);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testBraveNewsProvider();
}
