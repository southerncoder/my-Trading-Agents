#!/usr/bin/env node

const http = require('http');

/**
 * Simple health check script for Docker and monitoring systems
 * Usage: node healthcheck.js
 * Returns exit code 0 if healthy, 1 if unhealthy
 */

const HOST = process.env.HEALTH_CHECK_HOST || 'localhost';
const PORT = parseInt(process.env.HEALTH_CHECK_PORT || process.env.PORT || '3004');
const TIMEOUT = parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000');

function checkHealth() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path: '/health',
      method: 'GET',
      timeout: TIMEOUT
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const healthData = JSON.parse(data);

          if (res.statusCode === 200 && healthData.status === 'healthy') {
            console.log('✅ Service is healthy');
            resolve(true);
          } else {
            console.log('❌ Service is unhealthy:', healthData);
            resolve(false);
          }
        } catch (error) {
          console.log('❌ Failed to parse health response:', error.message);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Health check failed:', error.message);
      resolve(false);
    });

    req.on('timeout', () => {
      console.log('❌ Health check timed out');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

async function main() {
  try {
    const isHealthy = await checkHealth();
    process.exit(isHealthy ? 0 : 1);
  } catch (error) {
    console.error('Health check error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkHealth };