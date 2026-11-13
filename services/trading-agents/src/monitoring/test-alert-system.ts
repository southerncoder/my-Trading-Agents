/**
 * Test Alert System
 * 
 * Simple test script to verify the alert system functionality
 */

import { createNotificationProvider, NotificationManager } from './notification-providers/index.js';
import {
  emailChannelExamples,
  smsChannelExamples,
  slackChannelExamples,
  webhookChannelExamples,
  consoleChannelExamples,
  performanceAlertExamples,
  systemAlertExamples,
  marketAlertExamples
} from './alert-config-example.js';

const exampleNotificationChannels = [
  ...emailChannelExamples,
  ...smsChannelExamples,
  ...slackChannelExamples,
  ...webhookChannelExamples,
  ...consoleChannelExamples
];
const exampleAlertConfigs = [
  ...performanceAlertExamples,
  ...systemAlertExamples,
  ...marketAlertExamples
];
import { createLogger } from '../utils/enhanced-logger.js';

const logger = createLogger('system', 'alert-test');

/**
 * Test the alert system functionality
 */
async function testAlertSystem(): Promise<void> {
  try {
    logger.info('alert-test', 'Starting alert system test');

    // Test notification providers
    logger.info('alert-test', 'Testing notification providers');
    
    // Test console provider
    const consoleProvider = createNotificationProvider('console', {
      enabled: true,
      retryAttempts: 1,
      retryDelay: 0,
      logLevel: 'info',
      colorize: true,
      includeMetadata: true
    });

    await consoleProvider.initialize();
    
    const testMessage = {
      id: 'test-001',
      to: ['test@example.com'],
      subject: 'Test Alert',
      body: 'This is a test alert message',
      priority: 'medium' as const,
      templateData: {
        alertName: 'Test Alert',
        severity: 'medium',
        actualValue: '15.5',
        threshold: '10.0',
        timestamp: new Date().toISOString()
      }
    };

    const result = await consoleProvider.sendMessage(testMessage);
    logger.info('alert-test', 'Console notification result', { result });

    // Test notification manager
    const notificationManager = new NotificationManager();
    notificationManager.addProvider('console-test', consoleProvider);

    const managerResult = await notificationManager.sendMessage('console-test', testMessage);
    logger.info('alert-test', 'Notification manager result', { managerResult });

    // Cleanup
    await consoleProvider.cleanup();
    await notificationManager.cleanup();

    logger.info('alert-test', 'Alert system test completed successfully');

  } catch (error) {
    logger.error('alert-test', 'Alert system test failed', {
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    throw error;
  }
}

/**
 * Test alert configuration examples
 */
async function testAlertConfigurations(): Promise<void> {
  try {
    logger.info('alert-test', 'Testing alert configurations');

    // Test example configurations
    const channels = exampleNotificationChannels;
    logger.info('alert-test', 'Available notification channels', {
      channelCount: channels.length,
      channelTypes: channels.map(c => c.type)
    });

    const configs = exampleAlertConfigs;
    logger.info('alert-test', 'Available alert configurations', {
      configCount: configs.length,
      configNames: configs.map(c => c.name)
    });

    // Validate configurations
    for (const config of configs) {
      if (!config.name || !config.condition) {
        throw new Error(`Invalid configuration: ${config.name}`);
      }
    }

    logger.info('alert-test', 'Alert configuration test completed successfully');

  } catch (error) {
    logger.error('alert-test', 'Alert configuration test failed', {
      error: (error as Error).message
    });
    throw error;
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      await testAlertSystem();
      await testAlertConfigurations();
      console.log('✅ All alert system tests passed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Alert system tests failed:', error);
      process.exit(1);
    }
  })();
}

export { testAlertSystem, testAlertConfigurations };