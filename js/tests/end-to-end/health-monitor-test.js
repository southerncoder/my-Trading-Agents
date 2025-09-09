/**
 * Health Monitor Test
 *
 * Tests the comprehensive health monitoring system
 */

import { HealthMonitor, getSystemHealth } from '../../dist/utils/health-monitor.js';

async function testHealthMonitor() {
  console.log('🩺 Testing Health Monitor System...');

  try {
    // Test 1: Basic health monitor creation
    console.log('📋 Test 1: Creating health monitor...');
    const monitor = new HealthMonitor({
      checkInterval: 10000, // 10 seconds for testing
      timeout: 3000,
      services: [
        {
          name: 'Test Service',
          url: 'http://httpbin.org/status/200',
          type: 'http',
          critical: false
        }
      ]
    });
    console.log('✅ Health monitor created successfully');

    // Test 2: Manual health check
    console.log('📋 Test 2: Performing manual health check...');
    const health = await monitor.performHealthCheck();
    console.log('✅ Manual health check completed');
    console.log(`   Overall status: ${health.overall}`);
    console.log(`   Services checked: ${health.services.length}`);
    console.log(`   Active alerts: ${health.alerts.length}`);

    // Test 3: System health getter
    console.log('📋 Test 3: Testing system health getter...');
    const systemHealth = monitor.getSystemHealth();
    console.log('✅ System health retrieved');
    console.log(`   Uptime: ${Math.round(systemHealth.uptime / 1000)}s`);
    console.log(`   Memory usage: ${Math.round(systemHealth.performance.memoryUsage.heapUsed / 1024 / 1024)}MB`);

    // Test 4: Global functions
    console.log('📋 Test 4: Testing global health functions...');
    const globalHealth = getSystemHealth();
    console.log('✅ Global health function works');
    console.log(`   Services: ${globalHealth.services.length}`);

    console.log('🎉 All health monitor tests passed!');

  } catch (error) {
    console.error('❌ Health monitor test failed:', error);
    process.exit(1);
  }
}

// Run the test
testHealthMonitor().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});