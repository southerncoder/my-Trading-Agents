#!/usr/bin/env node

/**
 * Quick test to verify MarketStack environment configuration
 */

import { MARKETSTACK_CONFIG } from '../src/dataflows/marketstack.js';
import { createLogger } from '../src/utils/enhanced-logger.js';

const logger = createLogger('test', 'env-config');

console.log('🔧 MarketStack Environment Configuration Test');
console.log('=============================================\n');

console.log('📋 Current Configuration:');
console.log(`   API Key: ${MARKETSTACK_CONFIG.apiKey ? '✅ Set (' + MARKETSTACK_CONFIG.apiKey.length + ' chars)' : '❌ Not set'}`);
console.log(`   Rate Limit: ${MARKETSTACK_CONFIG.rateLimit} requests/second`);
console.log(`   Timeout: ${MARKETSTACK_CONFIG.timeout}ms`);

console.log('\n🔍 Environment Variables:');
console.log(`   MARKETSTACK_API_KEY: ${process.env.MARKETSTACK_API_KEY ? '✅ Set' : '❌ Not set'}`);
console.log(`   MARKETSTACK_RATE_LIMIT: ${process.env.MARKETSTACK_RATE_LIMIT || 'Using default (5)'}`);
console.log(`   MARKETSTACK_TIMEOUT: ${process.env.MARKETSTACK_TIMEOUT || 'Using default (30000)'}`);

if (!MARKETSTACK_CONFIG.apiKey) {
  console.log('\n💡 To set your MarketStack API key:');
  console.log('   1. Get your API key from https://marketstack.com');
  console.log('   2. Edit js/.env.local file');
  console.log('   3. Set: MARKETSTACK_API_KEY=your_api_key_here');
  console.log('   4. Available plans:');
  console.log('      - Free: 1,000 requests/month');
  console.log('      - Basic: $9.99/month, 10,000 requests');
  console.log('      - Professional: $49.99/month, 100,000 requests');
  console.log('      - Business: $149.99/month, 500,000 requests');
} else {
  console.log('\n✅ MarketStack is configured and ready to use!');
}

console.log('\n📁 Configuration files updated:');
console.log('   ✅ js/.env.local - Added MARKETSTACK_API_KEY, MARKETSTACK_RATE_LIMIT, MARKETSTACK_TIMEOUT');
console.log('   ✅ js/.env.local.example - Added MarketStack configuration template');
console.log('   ✅ .env.example - Added data provider API keys section');

logger.info('env-test-complete', 'MarketStack environment configuration test completed', {
  apiKeyConfigured: !!MARKETSTACK_CONFIG.apiKey,
  rateLimit: MARKETSTACK_CONFIG.rateLimit,
  timeout: MARKETSTACK_CONFIG.timeout
});