// Example: End-to-end usage of AdvancedMemoryLearningSystem with ZepAdapter
import { AdvancedMemoryLearningSystem, AdvancedMemoryConfigSchema, TradingIntelligenceRequestSchema } from '../index';
import { createZepAdapter } from '../../zep-adapter';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env.local' });

async function main() {
  // Configure ZepAdapter from environment
  const zep = createZepAdapter({
    baseUrl: process.env.ZEP_GRAPHITI_URL || 'http://localhost:8000',
    apiKey: process.env.ZEP_API_KEY || '',
    timeoutMs: 15000
  });

  // Example config (normally load from env or config file)
  const config = AdvancedMemoryConfigSchema.parse({
    zep_client_config: {
      api_key: process.env.ZEP_API_KEY || '',
      base_url: process.env.ZEP_GRAPHITI_URL || 'http://localhost:8000',
      session_id: 'example-session',
      user_id: 'example-user'
    },
    learning_config: {},
    processing_config: {},
    integration_config: {}
  });

  // Initialize system
  const system = new AdvancedMemoryLearningSystem(config, zep, console);
  await system.initialize();

  // Example request (fill with real data for your use case)
  const request = TradingIntelligenceRequestSchema.parse({
    request_id: 'req-001',
    agent_id: 'agent-001',
    entity_id: 'AAPL',
    query_type: 'market_analysis',
    current_context: {
      market_conditions: { "S&P500": 1, "VIX": 15 },
      technical_indicators: { rsi: 55, macd: 0.2 },
      economic_indicators: { cpi: 3.2, gdp: 2.1 },
      sentiment_scores: { news: 0.1, social: 0.2 },
      market_regime: 'bull',
      price_level: 195.2,
      volatility: 0.18,
      volume: 1000000,
      time_horizon_days: 21,
      confidence_level: 0.7
    },
    preferences: {
      include_similar_scenarios: true,
      include_pattern_analysis: true,
      include_risk_factors: true,
      include_confidence_adjustment: true,
      max_historical_scenarios: 10,
      similarity_threshold: 0.7
    }
  });

  // Run request
  const response = await system.processIntelligenceRequest(request);
  console.log('--- Trading Intelligence Response ---');
  console.dir(response, { depth: 6 });
}

main().catch(err => {
  console.error('Example failed:', err);
  process.exit(1);
});
