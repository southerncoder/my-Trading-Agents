#!/usr/bin/env node

import dotenv from 'dotenv';
import BraveNewsProvider from './src/providers/brave-news.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

console.log('🔍 Testing BRAVE_NEWS_API_KEY Configuration\n');

// Check if BRAVE_NEWS_API_KEY is set
const apiKey = process.env.BRAVE_NEWS_API_KEY;
console.log(`BRAVE_NEWS_API_KEY: ${apiKey ? '✅ Set' : '❌ Not set'}`);

if (!apiKey || apiKey === 'your_brave_news_api_key_here') {
  console.log('\n❌ BRAVE_NEWS_API_KEY is not properly configured!');
  console.log('\n📝 To fix this:');
  console.log('1. Go to https://api-dashboard.search.brave.com/');
  console.log('2. Sign up for a Brave Search API account');
  console.log('3. Get your API key from the dashboard');
  console.log('4. Replace "your_brave_news_api_key_here" in .env.local with your actual API key');
  console.log('\nExample:');
  console.log('BRAVE_NEWS_API_KEY=BSAbCdEfGhIjKlMnOpQrStUvWxYz1234567890');
  process.exit(1);
}

// Test provider initialization
console.log('\n🔧 Testing Brave News Provider initialization...');
try {
  const provider = new BraveNewsProvider();
  const isConfigured = provider.isConfigured();

  console.log(`Provider configured: ${isConfigured ? '✅ Yes' : '❌ No'}`);

  if (isConfigured) {
    console.log('\n✅ BRAVE_NEWS_API_KEY is properly configured and wired up!');
    console.log('🎉 The Brave News provider is ready to use.');
  } else {
    console.log('\n❌ Provider is not configured properly.');
    process.exit(1);
  }

} catch (error) {
  console.log('\n❌ Error initializing Brave News Provider:');
  console.log(error.message);
  process.exit(1);
}

console.log('\n📋 Configuration Summary:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`- LOG_LEVEL: ${process.env.LOG_LEVEL || 'not set'}`);
console.log(`- PORT: ${process.env.PORT || 'not set'}`);
console.log(`- NEWS_API_KEY: ${process.env.NEWS_API_KEY ? '✅ Set' : '❌ Not set'}`);
console.log(`- BRAVE_NEWS_API_KEY: ✅ Set (length: ${apiKey.length})`);
console.log(`- YAHOO_FINANCE_API_KEY: ${process.env.YAHOO_FINANCE_API_KEY && process.env.YAHOO_FINANCE_API_KEY !== 'your_yahoo_finance_api_key_here' ? '✅ Set' : '❌ Not set'}`);

console.log('\n🚀 Ready to start the news aggregator service!');
console.log('Run: npm start');