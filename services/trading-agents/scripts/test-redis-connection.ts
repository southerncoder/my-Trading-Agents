#!/usr/bin/env node
/**
 * Redis Connection Test Script
 * 
 * Tests Redis connectivity for the intelligent caching system
 */

import { createClient } from 'redis';
import { createLogger } from '../src/utils/enhanced-logger.js';

const logger = createLogger('system', 'redis-test');

async function testRedisConnection() {
  const config = {
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')
    },
    database: parseInt(process.env.REDIS_DB || '0')
  };

  if (process.env.REDIS_PASSWORD) {
    config.password = process.env.REDIS_PASSWORD;
  }

  logger.info('redis-test-start', 'Testing Redis connection', {
    host: config.socket.host,
    port: config.socket.port,
    database: config.database,
    hasPassword: !!config.password
  });

  const client = createClient(config);

  try {
    // Set up error handler
    client.on('error', (error) => {
      logger.error('redis-connection-error', 'Redis connection error', {
        error: error.message
      });
    });

    // Connect to Redis
    await client.connect();
    logger.info('redis-connected', 'Successfully connected to Redis');

    // Test basic operations
    const testKey = 'trading-agents:test:connection';
    const testValue = JSON.stringify({
      timestamp: new Date().toISOString(),
      test: 'Redis connection test'
    });

    // Set a test value
    await client.setEx(testKey, 60, testValue); // 60 seconds TTL
    logger.info('redis-set-success', 'Successfully set test value');

    // Get the test value
    const retrievedValue = await client.get(testKey);
    if (retrievedValue === testValue) {
      logger.info('redis-get-success', 'Successfully retrieved test value');
    } else {
      throw new Error('Retrieved value does not match set value');
    }

    // Delete the test value
    await client.del(testKey);
    logger.info('redis-delete-success', 'Successfully deleted test value');

    // Test Redis info
    const info = await client.info('server');
    const lines = info.split('\r\n');
    const serverInfo = {};
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        serverInfo[key] = value;
      }
    }

    logger.info('redis-info', 'Redis server information', {
      version: serverInfo['redis_version'],
      mode: serverInfo['redis_mode'],
      os: serverInfo['os'],
      uptime: serverInfo['uptime_in_seconds']
    });

    logger.info('redis-test-complete', 'Redis connection test completed successfully');
    
  } catch (error) {
    logger.error('redis-test-failed', 'Redis connection test failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  } finally {
    try {
      await client.quit();
      logger.info('redis-disconnected', 'Disconnected from Redis');
    } catch (error) {
      logger.warn('redis-disconnect-error', 'Error disconnecting from Redis', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

// Run the test
testRedisConnection().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});