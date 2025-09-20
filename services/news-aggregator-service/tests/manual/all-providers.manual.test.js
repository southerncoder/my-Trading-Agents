// Migrated from root: test-providers.js
import NewsAPIProvider from '../../src/providers/newsapi.js';
import YahooFinanceProvider from '../../src/providers/yahoo-finance.js';
import GoogleNewsProvider from '../../src/providers/google-news.js';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  console.log('🧪 Manual Test: All News Providers');
  const providers = {
    'NewsAPI': new NewsAPIProvider(),
    'Yahoo Finance': new YahooFinanceProvider(),
    'Google News': new GoogleNewsProvider(),
  };
  for (const [name, provider] of Object.entries(providers)) {
    console.log(`\n📊 ${name}`);
    console.log('Configured:', provider.isConfigured());
    try {
      const health = await provider.healthCheck();
      console.log('Health:', health);
    } catch (e) {
      console.log('Health failed:', e.message);
    }
    if (provider.isConfigured()) {
      try {
        if (name === 'Yahoo Finance') {
          const quote = await provider.getQuote('AAPL');
          console.log('Quote:', quote.symbol, quote.regularMarketPrice);
        } else {
          const res = await provider.searchNews({ query: 'Apple', pageSize: 2 });
          console.log('Articles:', res.articles?.length || 0);
        }
      } catch (e) {
        console.log('Search failed:', e.message);
      }
    } else {
      console.log('Search skipped (not configured)');
    }
  }
  console.log('\n✅ Manual provider test complete');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch(console.error);
}
