import { beforeAll, afterAll } from 'vitest';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables from the root .env.local file
beforeAll(() => {
  // Load from root directory
  config({ path: path.resolve(process.cwd(), '../../.env.local') });
  
  // Set test-specific environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
  
  // Set default test user agent if not provided
  if (!process.env.TEST_USER_AGENT) {
    process.env.TEST_USER_AGENT = 'TradingAgents-Test/1.0.0 (test@example.com)';
  }
});

afterAll(() => {
  // Cleanup any global resources if needed
});

// Global test utilities
declare global {
  var testConfig: {
    userAgent: string;
    fredApiKey?: string;
    blsApiKey?: string;
    timeout: number;
    retries: number;
  };
}

globalThis.testConfig = {
  userAgent: process.env.TEST_USER_AGENT || 'TradingAgents-Test/1.0.0 (test@example.com)',
  fredApiKey: process.env.FRED_API_KEY,
  blsApiKey: process.env.BLS_API_KEY,
  timeout: 30000,
  retries: 2
};