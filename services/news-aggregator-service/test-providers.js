import NewsAPIProvider from '../providers/newsapi.js';
import YahooFinanceProvider from '../providers/yahoo-finance.js';
import GoogleNewsProvider from '../providers/google-news.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testAllProviders() {
  console.log('🧪 Testing All News Providers...\n');

  const providers = {
    'NewsAPI': new NewsAPIProvider(),
    'Yahoo Finance': new YahooFinanceProvider(),
    'Google News': new GoogleNewsProvider()
  };

  for (const [name, provider] of Object.entries(providers)) {
    console.log(`\n📊 Testing ${name} Provider:`);
    console.log(`- Is Configured: ${provider.isConfigured()}`);

    // Health check
    try {
      const healthResult = await provider.healthCheck();
      console.log(`- Health Check: ${healthResult.healthy ? '✅' : '❌'} ${healthResult.message}`);
    } catch (error) {
      console.log(`- Health Check: ❌ ${error.message}`);
    }

    // Test search if configured
    if (provider.isConfigured()) {
      try {
        let result;
        if (name === 'Yahoo Finance') {
          result = await provider.getQuote('AAPL');
          console.log(`- Quote Test: ✅ Got ${result.symbol} at $${result.regularMarketPrice}`);
        } else {
          result = await provider.searchNews({ query: 'Apple', pageSize: 2 });
          console.log(`- Search Test: ✅ Found ${result.articles?.length || 0} articles`);
        }
      } catch (error) {
        console.log(`- Search Test: ❌ ${error.message}`);
      }
    } else {
      console.log(`- Search Test: ⚠️  Skipped (not configured)`);
    }
  }

  console.log('\n✅ All Provider Tests Complete!');
}

// Run the test
testAllProviders().catch(console.error);