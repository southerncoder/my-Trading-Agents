/**
 * Alert Configuration Examples
 * 
 * This file provides comprehensive examples of how to configure
 * the alerting and notification system for various scenarios.
 */

import { AlertConfig, NotificationChannel } from './alert-manager.js';
import { EmailProviderConfig } from './notification-providers/email-provider.js';
import { SmsProviderConfig } from './notification-providers/sms-provider.js';

// ==================== NOTIFICATION CHANNEL EXAMPLES ====================

/**
 * Email notification configurations
 */
export const emailChannelExamples: NotificationChannel[] = [
  // SMTP Email (traditional)
  {
    type: 'email',
    config: {
      to: ['admin@tradingcompany.com', 'alerts@tradingcompany.com'],
      cc: ['manager@tradingcompany.com'],
      subject: 'Trading Alert: {{alertName}}',
      template: `
        Trading Alert Notification
        
        Alert: {{alertName}}
        Severity: {{severity}}
        Strategy: {{strategyId}}
        Time: {{timestamp}}
        
        Description: {{description}}
        
        Current Value: {{actualValue}}
        Threshold: {{threshold}}
        
        Please review and take appropriate action.
        
        ---
        TradingAgents Alert System
      `
    },
    enabled: true,
    retryAttempts: 3,
    retryDelay: 30
  },
  
  // Cloudflare Email Routing
  {
    type: 'email',
    config: {
      to: ['alerts@yourdomain.com'],
      subject: '🚨 {{severity}} Alert: {{alertName}}',
      template: `
        <h2>Trading Alert</h2>
        <p><strong>Alert:</strong> {{alertName}}</p>
        <p><strong>Severity:</strong> <span style="color: red;">{{severity}}</span></p>
        <p><strong>Strategy:</strong> {{strategyId}}</p>
        <p><strong>Time:</strong> {{timestamp}}</p>
        <hr>
        <p>{{description}}</p>
        <p><strong>Current Value:</strong> {{actualValue}}</p>
        <p><strong>Threshold:</strong> {{threshold}}</p>
      `
    },
    enabled: true,
    retryAttempts: 2,
    retryDelay: 15
  }
];

/**
 * SMS notification configurations
 */
export const smsChannelExamples: NotificationChannel[] = [
  // Twilio SMS
  {
    type: 'sms',
    config: {
      phoneNumbers: ['+1234567890', '+0987654321'],
      provider: 'twilio',
      template: '🚨 {{severity}} Alert: {{alertName}} - {{strategyId}} at {{timestamp}}'
    },
    enabled: true,
    retryAttempts: 2,
    retryDelay: 10
  },
  
  // Cloudflare Worker SMS (custom implementation)
  {
    type: 'sms',
    config: {
      phoneNumbers: ['+1234567890'],
      provider: 'cloudflare',
      template: 'Alert: {{alertName}} ({{severity}}) - Value: {{actualValue}}, Threshold: {{threshold}}'
    },
    enabled: true,
    retryAttempts: 1,
    retryDelay: 5
  }
];

/**
 * Slack notification configurations
 */
export const slackChannelExamples: NotificationChannel[] = [
  // Standard Slack webhook
  {
    type: 'slack',
    config: {
      webhookUrl: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
      channel: '#trading-alerts',
      username: 'TradingBot',
      iconEmoji: ':chart_with_upwards_trend:'
    },
    enabled: true,
    retryAttempts: 3,
    retryDelay: 5
  },
  
  // Slack with custom template
  {
    type: 'slack',
    config: {
      webhookUrl: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
      channel: '#critical-alerts',
      username: 'AlertSystem',
      iconEmoji: ':rotating_light:',
      template: `
        🚨 *{{severity}} Alert*: {{alertName}}
        
        *Strategy*: {{strategyId}}
        *Time*: {{timestamp}}
        *Current Value*: {{actualValue}}
        *Threshold*: {{threshold}}
        
        {{description}}
      `
    },
    enabled: true,
    retryAttempts: 2,
    retryDelay: 3
  }
];

/**
 * Webhook notification configurations
 */
export const webhookChannelExamples: NotificationChannel[] = [
  // Discord webhook
  {
    type: 'webhook',
    config: {
      url: 'https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    },
    enabled: true,
    retryAttempts: 2,
    retryDelay: 5
  },
  
  // Microsoft Teams webhook
  {
    type: 'webhook',
    config: {
      url: 'https://outlook.office.com/webhook/YOUR/TEAMS/WEBHOOK',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    },
    enabled: true,
    retryAttempts: 2,
    retryDelay: 5
  },
  
  // Custom API endpoint with authentication
  {
    type: 'webhook',
    config: {
      url: 'https://api.yourcompany.com/alerts',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TradingAgents/1.0'
      },
      authentication: {
        type: 'bearer',
        token: 'your-api-token-here'
      },
      template: JSON.stringify({
        alert: {
          name: '{{alertName}}',
          severity: '{{severity}}',
          strategy: '{{strategyId}}',
          timestamp: '{{timestamp}}',
          value: '{{actualValue}}',
          threshold: '{{threshold}}'
        },
        source: 'TradingAgents'
      })
    },
    enabled: true,
    retryAttempts: 3,
    retryDelay: 10
  }
];

/**
 * Console notification configurations
 */
export const consoleChannelExamples: NotificationChannel[] = [
  // Development console logging
  {
    type: 'console',
    config: {
      logLevel: 'error',
      template: 'ALERT: {{alertName}} ({{severity}}) - {{description}}'
    },
    enabled: true,
    retryAttempts: 1,
    retryDelay: 0
  }
];

// ==================== ALERT CONFIGURATION EXAMPLES ====================

/**
 * Performance-based alert configurations
 */
export const performanceAlertExamples: Omit<AlertConfig, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // High drawdown alert
  {
    name: 'High Drawdown Alert',
    description: 'Triggers when strategy drawdown exceeds 15%',
    enabled: true,
    condition: {
      type: 'threshold',
      metric: 'performance.maxDrawdown',
      operator: 'gt',
      aggregation: 'max',
      windowSize: 60
    },
    threshold: 0.15,
    timeframe: 60,
    channels: [...emailChannelExamples.slice(0, 1), ...slackChannelExamples.slice(0, 1)],
    severity: 'high',
    cooldownPeriod: 30,
    escalationRules: [
      {
        id: 'escalate-to-sms',
        condition: 'time_based',
        delay: 15,
        targetChannels: smsChannelExamples.slice(0, 1),
        escalationLevel: 1
      }
    ],
    tags: ['performance', 'risk', 'drawdown'],
    createdBy: 'system'
  },
  
  // Low Sharpe ratio alert
  {
    name: 'Low Sharpe Ratio Alert',
    description: 'Triggers when Sharpe ratio falls below 1.0',
    enabled: true,
    condition: {
      type: 'threshold',
      metric: 'performance.sharpeRatio',
      operator: 'lt',
      aggregation: 'avg',
      windowSize: 1440 // 24 hours
    },
    threshold: 1.0,
    timeframe: 1440,
    channels: emailChannelExamples.slice(0, 1),
    severity: 'medium',
    cooldownPeriod: 120,
    tags: ['performance', 'sharpe', 'risk-adjusted'],
    createdBy: 'system'
  },
  
  // Volatility spike alert
  {
    name: 'Volatility Spike Alert',
    description: 'Triggers when volatility increases by more than 50%',
    enabled: true,
    condition: {
      type: 'percentage_change',
      metric: 'performance.volatility',
      operator: 'gt',
      aggregation: 'avg',
      windowSize: 60
    },
    threshold: 0.5,
    timeframe: 60,
    channels: [...slackChannelExamples.slice(0, 1), ...webhookChannelExamples.slice(0, 1)],
    severity: 'medium',
    cooldownPeriod: 45,
    tags: ['performance', 'volatility', 'market-conditions'],
    createdBy: 'system'
  }
];

/**
 * System health alert configurations
 */
export const systemAlertExamples: Omit<AlertConfig, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // High error rate alert
  {
    name: 'High Error Rate Alert',
    description: 'Triggers when system error rate exceeds 5%',
    enabled: true,
    condition: {
      type: 'threshold',
      metric: 'system.errorRate',
      operator: 'gt',
      aggregation: 'avg',
      windowSize: 15
    },
    threshold: 0.05,
    timeframe: 15,
    channels: [...emailChannelExamples.slice(0, 1), ...smsChannelExamples.slice(0, 1)],
    severity: 'critical',
    cooldownPeriod: 10,
    escalationRules: [
      {
        id: 'immediate-escalation',
        condition: 'severity_based',
        delay: 5,
        targetChannels: webhookChannelExamples.slice(0, 1),
        escalationLevel: 1
      }
    ],
    tags: ['system', 'errors', 'reliability'],
    createdBy: 'system'
  },
  
  // Memory usage alert
  {
    name: 'High Memory Usage Alert',
    description: 'Triggers when memory usage exceeds 85%',
    enabled: true,
    condition: {
      type: 'threshold',
      metric: 'system.memoryUsage',
      operator: 'gt',
      aggregation: 'max',
      windowSize: 5
    },
    threshold: 0.85,
    timeframe: 5,
    channels: slackChannelExamples.slice(0, 1),
    severity: 'high',
    cooldownPeriod: 15,
    tags: ['system', 'memory', 'resources'],
    createdBy: 'system'
  },
  
  // API response time alert
  {
    name: 'Slow API Response Alert',
    description: 'Triggers when API response time exceeds 5 seconds',
    enabled: true,
    condition: {
      type: 'threshold',
      metric: 'system.responseTime',
      operator: 'gt',
      aggregation: 'avg',
      windowSize: 10
    },
    threshold: 5000, // milliseconds
    timeframe: 10,
    channels: emailChannelExamples.slice(0, 1),
    severity: 'medium',
    cooldownPeriod: 20,
    tags: ['system', 'performance', 'api'],
    createdBy: 'system'
  }
];

/**
 * Market condition alert configurations
 */
export const marketAlertExamples: Omit<AlertConfig, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // VIX spike alert
  {
    name: 'VIX Spike Alert',
    description: 'Triggers when VIX exceeds 30 (high market volatility)',
    enabled: true,
    condition: {
      type: 'threshold',
      metric: 'market.vix',
      operator: 'gt'
    },
    threshold: 30,
    timeframe: 5,
    channels: [...slackChannelExamples.slice(0, 1), ...emailChannelExamples.slice(0, 1)],
    severity: 'high',
    cooldownPeriod: 60,
    tags: ['market', 'volatility', 'vix'],
    createdBy: 'system'
  },
  
  // Market trend change alert
  {
    name: 'Market Trend Change Alert',
    description: 'Triggers when market trend changes significantly',
    enabled: true,
    condition: {
      type: 'custom',
      metric: 'market.marketTrend',
      operator: 'eq',
      customExpression: 'trend_change_detected'
    },
    threshold: 1,
    timeframe: 30,
    channels: slackChannelExamples.slice(0, 1),
    severity: 'medium',
    cooldownPeriod: 180,
    tags: ['market', 'trend', 'analysis'],
    createdBy: 'system'
  }
];

// ==================== PROVIDER CONFIGURATION EXAMPLES ====================

/**
 * Email provider configurations for different services
 */
export const emailProviderConfigs: Record<string, EmailProviderConfig> = {
  // Cloudflare Email Routing (recommended for Cloudflare infrastructure)
  cloudflare: {
    provider: 'cloudflare',
    cloudflare: {
      apiToken: process.env.CLOUDFLARE_API_TOKEN || 'your-cloudflare-api-token',
      zoneId: process.env.CLOUDFLARE_ZONE_ID || 'your-zone-id',
      fromEmail: 'alerts@yourdomain.com'
    }
  },
  
  // SMTP (traditional email)
  smtp: {
    provider: 'smtp',
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'your-email@gmail.com',
        pass: process.env.SMTP_PASS || 'your-app-password'
      }
    }
  },
  
  // SendGrid
  sendgrid: {
    provider: 'sendgrid',
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY || 'your-sendgrid-api-key',
      fromEmail: 'alerts@yourdomain.com'
    }
  },
  
  // Resend (modern email API)
  resend: {
    provider: 'resend',
    resend: {
      apiKey: process.env.RESEND_API_KEY || 'your-resend-api-key',
      fromEmail: 'alerts@yourdomain.com'
    }
  }
};

/**
 * SMS provider configurations
 */
export const smsProviderConfigs: Record<string, SmsProviderConfig> = {
  // Twilio
  twilio: {
    provider: 'twilio',
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || 'your-twilio-account-sid',
      authToken: process.env.TWILIO_AUTH_TOKEN || 'your-twilio-auth-token',
      fromNumber: process.env.TWILIO_FROM_NUMBER || '+1234567890'
    }
  },
  
  // Cloudflare Worker SMS (custom implementation)
  cloudflare: {
    provider: 'cloudflare',
    cloudflare: {
      apiToken: process.env.CLOUDFLARE_API_TOKEN || 'your-cloudflare-api-token',
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID || 'your-account-id',
      workerUrl: process.env.CLOUDFLARE_SMS_WORKER_URL || 'https://sms-worker.your-account.workers.dev'
    }
  },
  
  // Vonage (formerly Nexmo)
  vonage: {
    provider: 'vonage',
    vonage: {
      apiKey: process.env.VONAGE_API_KEY || 'your-vonage-api-key',
      apiSecret: process.env.VONAGE_API_SECRET || 'your-vonage-api-secret',
      fromNumber: process.env.VONAGE_FROM_NUMBER || 'TradingAgents'
    }
  }
};

// ==================== ENVIRONMENT CONFIGURATION ====================

/**
 * Environment-specific alert configurations
 */
export const environmentConfigs = {
  development: {
    // In development, use console notifications primarily
    defaultChannels: consoleChannelExamples,
    enabledSeverities: ['medium', 'high', 'critical'],
    cooldownMultiplier: 0.5, // Shorter cooldowns for testing
    enableRealTimeUpdates: true
  },
  
  staging: {
    // In staging, use Slack and email
    defaultChannels: [...slackChannelExamples.slice(0, 1), ...emailChannelExamples.slice(0, 1)],
    enabledSeverities: ['high', 'critical'],
    cooldownMultiplier: 1.0,
    enableRealTimeUpdates: true
  },
  
  production: {
    // In production, use all notification methods
    defaultChannels: [
      ...emailChannelExamples.slice(0, 1),
      ...smsChannelExamples.slice(0, 1),
      ...slackChannelExamples.slice(0, 1),
      ...webhookChannelExamples.slice(0, 1)
    ],
    enabledSeverities: ['low', 'medium', 'high', 'critical'],
    cooldownMultiplier: 1.0,
    enableRealTimeUpdates: true
  }
};

/**
 * Complete alert system configuration example
 */
export const completeAlertSystemConfig = {
  // Database configuration
  database: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'trading_agents',
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'password'
  },
  
  // Provider configurations
  providers: {
    email: emailProviderConfigs.cloudflare, // Use Cloudflare for email
    sms: smsProviderConfigs.twilio // Use Twilio for SMS
  },
  
  // Alert configurations to create on startup
  alertConfigs: [
    ...performanceAlertExamples,
    ...systemAlertExamples,
    ...marketAlertExamples
  ],
  
  // Dashboard configuration
  dashboard: {
    refreshInterval: 30, // seconds
    maxRecentAlerts: 50,
    enableRealTimeUpdates: true,
    alertRetentionDays: 90
  },
  
  // Environment-specific settings
  environment: environmentConfigs[process.env.NODE_ENV as keyof typeof environmentConfigs] || environmentConfigs.development
};

// ==================== USAGE EXAMPLES ====================

/**
 * Example: Creating an alert manager with full configuration
 */
export const alertManagerSetupExample = `
import { AlertManager, createAlertManager } from './alert-manager.js';
import { DatabaseManager } from '../database/database-manager.js';
import { completeAlertSystemConfig } from './alert-config-example.js';

// Initialize database manager
const dbManager = new DatabaseManager();
await dbManager.initializeConnections();

// Create alert manager
const alertManager = createAlertManager(dbManager);
await alertManager.initialize();

// Create alert configurations
for (const config of completeAlertSystemConfig.alertConfigs) {
  await alertManager.createAlert(config);
}

// Start monitoring
setInterval(async () => {
  const systemMetrics = await getSystemMetrics(); // Your metrics collection
  const triggeredAlerts = await alertManager.checkAlerts(systemMetrics);
  
  console.log(\`Checked alerts: \${triggeredAlerts.length} triggered\`);
}, 60000); // Check every minute
`;

/**
 * Example: Setting up notification providers
 */
export const notificationProviderSetupExample = `
import { EmailProvider, SmsProvider } from './notification-providers/index.js';
import { emailProviderConfigs, smsProviderConfigs } from './alert-config-example.js';

// Setup email provider (Cloudflare)
const emailProvider = new EmailProvider(emailProviderConfigs.cloudflare);

// Setup SMS provider (Twilio)
const smsProvider = new SmsProvider(smsProviderConfigs.twilio);

// Test notifications
const testNotification = {
  id: 'test-123',
  channel: {
    type: 'email',
    config: { to: ['test@example.com'] },
    enabled: true,
    retryAttempts: 1,
    retryDelay: 5
  },
  sentAt: new Date(),
  status: 'pending',
  attempts: 0
};

const testAlertData = {
  name: 'Test Alert',
  severity: 'medium',
  description: 'This is a test alert',
  timestamp: new Date()
};

await emailProvider.sendEmail(testNotification, testAlertData);
`;

export default completeAlertSystemConfig;