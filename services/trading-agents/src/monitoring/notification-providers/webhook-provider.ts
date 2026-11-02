/**
 * Webhook Notification Provider
 * 
 * Provides flexible webhook notifications with support for various
 * authentication methods and payload formats.
 */

import { createLogger } from '../../utils/enhanced-logger.js';
import { WebhookConfig, NotificationRecord } from '../alert-manager.js';

const logger = createLogger('system', 'webhook-provider');

export interface WebhookPayload {
  alert: {
    id: string;
    name: string;
    severity: string;
    description: string;
    actualValue: any;
    threshold: any;
    timestamp: string;
    status: string;
    strategyId?: string;
  };
  system: {
    source: string;
    version: string;
    environment: string;
  };
  metadata: Record<string, any>;
}

export class WebhookProvider {
  /**
   * Send webhook notification
   */
  async sendWebhookNotification(notification: NotificationRecord, alertData: any): Promise<void> {
    const webhookConfig = notification.channel.config as WebhookConfig;
    
    try {
      const payload = this.buildWebhookPayload(webhookConfig, alertData);
      const headers = this.buildHeaders(webhookConfig);
      
      const response = await fetch(webhookConfig.url, {
        method: webhookConfig.method || 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Webhook error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const responseData = await response.text();
      
      logger.info('webhook-provider', 'Webhook notification sent successfully', {
        url: webhookConfig.url,
        method: webhookConfig.method,
        status: response.status,
        alertName: alertData.name
      });

      // Store response for debugging
      notification.response = responseData;

    } catch (error) {
      logger.error('webhook-provider', 'Failed to send webhook notification', {
        error: (error as Error).message,
        url: webhookConfig.url
      });
      throw error;
    }
  }

  /**
   * Build webhook payload
   */
  private buildWebhookPayload(config: WebhookConfig, alertData: any): WebhookPayload | any {
    // If custom template is provided, use it
    if (config.template) {
      return this.buildTemplatePayload(config.template, alertData);
    }

    // Default structured payload
    return {
      alert: {
        id: alertData.id || 'unknown',
        name: alertData.name || 'Unknown Alert',
        severity: alertData.severity || 'unknown',
        description: alertData.description || 'No description provided',
        actualValue: alertData.actualValue,
        threshold: alertData.threshold,
        timestamp: alertData.timestamp ? new Date(alertData.timestamp).toISOString() : new Date().toISOString(),
        status: alertData.status || 'active',
        strategyId: alertData.strategyId
      },
      system: {
        source: 'TradingAgents',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      },
      metadata: {
        configId: alertData.configId,
        escalationLevel: alertData.escalationLevel || 0,
        notificationId: alertData.notificationId,
        ...alertData.metadata
      }
    };
  }

  /**
   * Build payload from custom template
   */
  private buildTemplatePayload(template: string, alertData: any): any {
    try {
      // Replace template variables
      const replacements = {
        '{{alertId}}': alertData.id || 'unknown',
        '{{alertName}}': alertData.name || 'Unknown Alert',
        '{{severity}}': alertData.severity || 'unknown',
        '{{description}}': alertData.description || 'No description provided',
        '{{actualValue}}': JSON.stringify(alertData.actualValue),
        '{{threshold}}': JSON.stringify(alertData.threshold),
        '{{timestamp}}': alertData.timestamp ? new Date(alertData.timestamp).toISOString() : new Date().toISOString(),
        '{{status}}': alertData.status || 'active',
        '{{strategyId}}': alertData.strategyId || 'System',
        '{{configId}}': alertData.configId || 'unknown'
      };

      let content = template;
      for (const [placeholder, value] of Object.entries(replacements)) {
        content = content.replace(new RegExp(placeholder, 'g'), value);
      }

      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(content);
      } catch {
        return { message: content };
      }

    } catch (error) {
      logger.warn('webhook-provider', 'Failed to process template, using default payload', {
        error: (error as Error).message
      });
      return this.buildWebhookPayload({ ...config, template: undefined } as WebhookConfig, alertData);
    }
  }

  /**
   * Build HTTP headers with authentication
   */
  private buildHeaders(config: WebhookConfig): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'TradingAgents-Webhook/1.0',
      ...config.headers
    };

    // Add authentication headers
    if (config.authentication) {
      switch (config.authentication.type) {
        case 'bearer':
          if (config.authentication.token) {
            headers['Authorization'] = `Bearer ${config.authentication.token}`;
          }
          break;
        
        case 'basic':
          if (config.authentication.username && config.authentication.password) {
            const credentials = Buffer.from(
              `${config.authentication.username}:${config.authentication.password}`
            ).toString('base64');
            headers['Authorization'] = `Basic ${credentials}`;
          }
          break;
        
        case 'api_key':
          if (config.authentication.apiKey) {
            const headerName = config.authentication.apiKeyHeader || 'X-API-Key';
            headers[headerName] = config.authentication.apiKey;
          }
          break;
      }
    }

    return headers;
  }

  /**
   * Send batch webhook notifications
   */
  async sendBatchWebhook(config: WebhookConfig, alerts: any[]): Promise<void> {
    try {
      const payload = {
        alerts: alerts.map(alert => ({
          id: alert.id,
          name: alert.name,
          severity: alert.severity,
          timestamp: alert.timestamp,
          strategyId: alert.strategyId
        })),
        summary: {
          total: alerts.length,
          critical: alerts.filter(a => a.severity === 'critical').length,
          high: alerts.filter(a => a.severity === 'high').length,
          medium: alerts.filter(a => a.severity === 'medium').length,
          low: alerts.filter(a => a.severity === 'low').length
        },
        system: {
          source: 'TradingAgents',
          timestamp: new Date().toISOString()
        }
      };

      const headers = this.buildHeaders(config);
      
      const response = await fetch(config.url, {
        method: config.method || 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Batch webhook error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      logger.info('webhook-provider', 'Batch webhook notification sent successfully', {
        url: config.url,
        alertCount: alerts.length
      });

    } catch (error) {
      logger.error('webhook-provider', 'Failed to send batch webhook notification', {
        error: (error as Error).message,
        url: config.url,
        alertCount: alerts.length
      });
      throw error;
    }
  }

  /**
   * Send test webhook
   */
  async sendTestWebhook(config: WebhookConfig): Promise<boolean> {
    try {
      const testPayload = {
        test: true,
        message: 'TradingAgents webhook test',
        timestamp: new Date().toISOString(),
        system: {
          source: 'TradingAgents',
          version: '1.0.0'
        }
      };

      const headers = this.buildHeaders(config);
      
      const response = await fetch(config.url, {
        method: config.method || 'POST',
        headers,
        body: JSON.stringify(testPayload)
      });

      const success = response.ok;
      
      logger.info('webhook-provider', 'Test webhook completed', {
        url: config.url,
        success,
        status: response.status
      });

      return success;

    } catch (error) {
      logger.error('webhook-provider', 'Test webhook failed', {
        error: (error as Error).message,
        url: config.url
      });
      return false;
    }
  }

  /**
   * Validate webhook configuration
   */
  validateConfig(config: WebhookConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.url) {
      errors.push('Webhook URL is required');
    } else {
      try {
        new URL(config.url);
      } catch {
        errors.push('Invalid webhook URL format');
      }
    }

    if (config.method && !['POST', 'PUT', 'PATCH'].includes(config.method)) {
      errors.push('Invalid HTTP method. Must be POST, PUT, or PATCH');
    }

    if (config.authentication) {
      switch (config.authentication.type) {
        case 'bearer':
          if (!config.authentication.token) {
            errors.push('Bearer token is required for bearer authentication');
          }
          break;
        case 'basic':
          if (!config.authentication.username || !config.authentication.password) {
            errors.push('Username and password are required for basic authentication');
          }
          break;
        case 'api_key':
          if (!config.authentication.apiKey) {
            errors.push('API key is required for API key authentication');
          }
          break;
      }
    }

    if (config.template) {
      try {
        // Try to validate template by replacing with dummy values
        const testTemplate = config.template
          .replace(/\{\{[^}]+\}\}/g, 'test');
        JSON.parse(testTemplate);
      } catch {
        // Template might not be JSON, which is okay
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Build webhook for specific integrations
   */
  buildIntegrationWebhook(integration: string, alertData: any): any {
    switch (integration.toLowerCase()) {
      case 'discord':
        return this.buildDiscordWebhook(alertData);
      case 'teams':
        return this.buildTeamsWebhook(alertData);
      case 'pagerduty':
        return this.buildPagerDutyWebhook(alertData);
      default:
        return this.buildWebhookPayload({} as WebhookConfig, alertData);
    }
  }

  /**
   * Build Discord webhook payload
   */
  private buildDiscordWebhook(alertData: any): any {
    const color = this.getSeverityColor(alertData.severity);
    
    return {
      embeds: [{
        title: `🚨 Trading Alert: ${alertData.name}`,
        description: alertData.description,
        color: parseInt(color.replace('#', ''), 16),
        fields: [
          {
            name: 'Severity',
            value: alertData.severity?.toUpperCase() || 'UNKNOWN',
            inline: true
          },
          {
            name: 'Strategy',
            value: alertData.strategyId || 'System',
            inline: true
          },
          {
            name: 'Actual Value',
            value: alertData.actualValue?.toString() || 'N/A',
            inline: true
          },
          {
            name: 'Threshold',
            value: alertData.threshold?.toString() || 'N/A',
            inline: true
          }
        ],
        timestamp: alertData.timestamp || new Date().toISOString(),
        footer: {
          text: 'TradingAgents Alert System'
        }
      }]
    };
  }

  /**
   * Build Microsoft Teams webhook payload
   */
  private buildTeamsWebhook(alertData: any): any {
    const color = this.getSeverityColor(alertData.severity);
    
    return {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: `Trading Alert: ${alertData.name}`,
      themeColor: color,
      sections: [{
        activityTitle: `🚨 Trading Alert: ${alertData.name}`,
        activitySubtitle: `Severity: ${alertData.severity?.toUpperCase() || 'UNKNOWN'}`,
        facts: [
          {
            name: 'Strategy',
            value: alertData.strategyId || 'System'
          },
          {
            name: 'Actual Value',
            value: alertData.actualValue?.toString() || 'N/A'
          },
          {
            name: 'Threshold',
            value: alertData.threshold?.toString() || 'N/A'
          },
          {
            name: 'Time',
            value: alertData.timestamp ? new Date(alertData.timestamp).toLocaleString() : new Date().toLocaleString()
          }
        ],
        text: alertData.description || 'No description provided'
      }]
    };
  }

  /**
   * Build PagerDuty webhook payload
   */
  private buildPagerDutyWebhook(alertData: any): any {
    return {
      routing_key: process.env.PAGERDUTY_ROUTING_KEY,
      event_action: 'trigger',
      dedup_key: alertData.id,
      payload: {
        summary: `Trading Alert: ${alertData.name}`,
        severity: this.mapSeverityToPagerDuty(alertData.severity),
        source: 'TradingAgents',
        component: alertData.strategyId || 'System',
        group: 'Trading',
        class: 'Alert',
        custom_details: {
          actual_value: alertData.actualValue,
          threshold: alertData.threshold,
          description: alertData.description,
          timestamp: alertData.timestamp
        }
      }
    };
  }

  /**
   * Get color for severity level
   */
  private getSeverityColor(severity: string): string {
    switch (severity?.toLowerCase()) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  }

  /**
   * Map severity to PagerDuty severity levels
   */
  private mapSeverityToPagerDuty(severity: string): string {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'critical';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'info';
    }
  }
}