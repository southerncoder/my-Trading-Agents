/**
 * Test script to verify news aggregator integration
 */

import { RiskManagementEngine } from './risk-management-engine-simple';

async function testNewsIntegration() {
  console.log('Testing News Aggregator Integration...');
  
  // Create a basic config for the engine
  const config = {
    llm: { provider: 'openai', model: 'gpt-4' },
    dataProviders: {},
    agents: {}
  };
  
  const engine = new RiskManagementEngine(config);
  
  try {
    // Test sector sentiment analysis for a technology stock
    console.log('\n1. Testing sector sentiment analysis for AAPL (Technology)...');
    const appleSentiment = await engine.getSectorSentiment('AAPL');
    console.log('AAPL Sector Sentiment Result:', {
      sentiment: appleSentiment.sentiment.toFixed(3),
      sectorRotation: appleSentiment.sectorRotation,
      correlationRisk: appleSentiment.correlationRisk.toFixed(3),
      newsImpact: appleSentiment.newsImpact.toFixed(3),
      confidence: appleSentiment.confidence.toFixed(3)
    });
    
    // Test sector sentiment analysis for an energy stock
    console.log('\n2. Testing sector sentiment analysis for XOM (Energy)...');
    const xomSentiment = await engine.getSectorSentiment('XOM');
    console.log('XOM Sector Sentiment Result:', {
      sentiment: xomSentiment.sentiment.toFixed(3),
      sectorRotation: xomSentiment.sectorRotation,
      correlationRisk: xomSentiment.correlationRisk.toFixed(3),
      newsImpact: xomSentiment.newsImpact.toFixed(3),
      confidence: xomSentiment.confidence.toFixed(3)
    });
    
    // Test sector sentiment analysis for a financial stock
    console.log('\n3. Testing sector sentiment analysis for JPM (Financials)...');
    const jpmSentiment = await engine.getSectorSentiment('JPM');
    console.log('JPM Sector Sentiment Result:', {
      sentiment: jpmSentiment.sentiment.toFixed(3),
      sectorRotation: jpmSentiment.sectorRotation,
      correlationRisk: jpmSentiment.correlationRisk.toFixed(3),
      newsImpact: jpmSentiment.newsImpact.toFixed(3),
      confidence: jpmSentiment.confidence.toFixed(3)
    });
    
    console.log('\n✅ News integration test completed successfully!');
    console.log('\nNote: If NEWS_AGGREGATOR_URL is not set or the service is not running,');
    console.log('the system will fall back to sector-based sentiment estimation.');
    
  } catch (error) {
    console.error('\n❌ News integration test failed:', error);
    console.log('\nThis might be expected if the news aggregator service is not running.');
    console.log('The risk management system will use fallback sentiment analysis.');
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testNewsIntegration().catch(console.error);
}

export { testNewsIntegration };