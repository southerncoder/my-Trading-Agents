#!/usr/bin/env node
// Migrated from root: test-brave-config.js
import dotenv from 'dotenv';
import BraveNewsProvider from '../../src/providers/brave-news.js';

dotenv.config({ path: '.env.local' });

console.log('🔍 Testing BRAVE_NEWS_API_KEY Configuration');
const apiKey = process.env.BRAVE_NEWS_API_KEY;
console.log(`BRAVE_NEWS_API_KEY: ${apiKey ? '✅ Set' : '❌ Not set'}`);

if (!apiKey || apiKey === 'your_brave_news_api_key_here') {
  console.log('❌ BRAVE_NEWS_API_KEY not properly configured.');
  process.exitCode = 1;
} else {
  try {
    const provider = new BraveNewsProvider();
    const configured = provider.isConfigured();
    console.log(`Provider configured: ${configured ? '✅ Yes' : '❌ No'}`);
  } catch (e) {
    console.log('Provider init error:', e.message);
    process.exitCode = 1;
  }
}
