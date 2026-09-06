/**
 * Slack Notification Provider
 * 
 * Provides rich Slack notifications with formatting, attachments,
 * and interactive elements for trading alerts.
 */

import { createLogger } from '../../utils/enhanced-logger.js';
import { SlackConfig, NotificationRecord } from '../alert-manager.js';

const logger = createLogger('system', 'slack-provider');

export interface SlackMessage {
  channel?: string;
  username?: string;
  icon_emoji?: string;
  icon_url?: string;
  text?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
}

export interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
  };
  fields?: Array<{
    type: string;
    text: string;
  }>;
  accessory?: any;
}

export interface SlackAttachment {
  color?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: Array<{
    title: string;
    value: string;
    short: boolean;
  }>;
  footer?: string;
  footer_icon?: string;
  ts?: number;
}

export class SlackProvider {
  /**
   * Send Slack notification
   */
  async sendSlackNotification(notification: NotificationRecord, alertData: any): Promise<void> {
    const slackConfig = notification.channel.config as SlackConfig;
    
    try {
      const message = this.buildSlackMessage(slackConfig, alertData);
      
      const response = await fetch(slackConfig.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Slack API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.text();
      if (result !== 'ok') {
        throw new Error(`Slack webhook failed: ${result}`);
      }

      logger.info('slack-provider', 'Slack notification sent successfully', {
        channel: slackConfig.channel,
        alertName: alertData.name
      });

    } catch (error) {
      logger.error('slack-provider', 'Failed to send Slack notification', {
        error: (error as Error).message,
        channel: slackConfig.channel
      });
      throw error;
    }
  }

  /**
   * Build Slack message with rich formatting
   */
  private buildSlackMessage(config: SlackConfig, alertData: any): SlackMessage {
    const severity = alertData.severity || 'unknown';
    const color = this.getSeverityColor(severity);
    const emoji = this.getSeverityEmoji(severity);
    
    // Use custom template if provided, otherwise use rich blocks
    if (config.template) {
      return this.buildTemplateMessage(config, alertData);
    }

    return {
      channel: config.channel,
      username: config.username || 'TradingAgents',
      icon_emoji: config.iconEmoji || emoji,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} Trading Alert: ${alertData.name || 'Unknown Alert'}`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Severity:*\n${severity.toUpperCase()}`
            },
            {
              type: 'mrkdwn',
              text: `*Strategy:*\n${alertData.strategyId || 'System'}`
            },
            {
              type: 'mrkdwn',
              text: `*Time:*\n${alertData.timestamp ? new Date(alertData.timestamp).toLocaleString() : new Date().toLocaleString()}`
            },
            {
              type: 'mrkdwn',
              text: `*Status:*\n${alertData.status || 'Active'}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Description:*\n${alertData.description || 'No description provided'}`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Actual Value:*\n\`${alertData.actualValue?.toString() || 'N/A'}\``
            },
            {
              type: 'mrkdwn',
              text: `*Threshold:*\n\`${alertData.threshold?.toString() || 'N/A'}\``
            }
          ]
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Acknowledge'
              },
              style: 'primary',
              action_id: 'acknowledge_alert',
              value: alertData.id
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Details'
              },
              action_id: 'view_alert_details',
              value: alertData.id
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Alert ID: ${alertData.id} | TradingAgents System`
            }
          ]
        }
      ]
    };
  }

  /**
   * Build message from custom template
   */
  private buildTemplateMessage(config: SlackConfig, alertData: any): SlackMessage {
    const template = config.template || '';
    
    // Replace template variables
    const replacements = {
      '{{alertName}}': alertData.name || 'Unknown Alert',
      '{{severity}}': alertData.severity || 'unknown',
      '{{description}}': alertData.description || 'No description provided',
      '{{actualValue}}': alertData.actualValue?.toString() || 'N/A',
      '{{threshold}}': alertData.threshold?.toString() || 'N/A',
      '{{timestamp}}': alertData.timestamp ? new Date(alertData.timestamp).toLocaleString() : new Date().toLocaleString(),
      '{{strategyId}}': alertData.strategyId || 'System',
      '{{status}}': alertData.status || 'Active',
      '{{alertId}}': alertData.id || 'Unknown'
    };

    let content = template;
    for (const [placeholder, value] of Object.entries(replacements)) {
      content = content.replace(new RegExp(placeholder, 'g'), value);
    }

    const severity = alertData.severity || 'unknown';
    const emoji = this.getSeverityEmoji(severity);

    return {
      channel: config.channel,
      username: config.username || 'TradingAgents',
      icon_emoji: config.iconEmoji || emoji,
      text: content,
      attachments: [
        {
          color: this.getSeverityColor(severity),
          footer: 'TradingAgents Alert System',
          footer_icon: 'https://example.com/trading-icon.png',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    };
  }

  /**
   * Get color for severity level
   */
  private getSeverityColor(severity: string): string {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return '#ffc107';
      case 'low': return 'good';
      default: return '#6c757d';
    }
  }

  /**
   * Get emoji for severity level
   */
  private getSeverityEmoji(severity: string): string {
    switch (severity?.toLowerCase()) {
      case 'critical': return ':rotating_light:';
      case 'high': return ':warning:';
      case 'medium': return ':large_orange_diamond:';
      case 'low': return ':information_source:';
      default: return ':bell:';
    }
  }

  /**
   * Build alert summary for multiple alerts
   */
  buildAlertSummary(alerts: any[]): SlackMessage {
    const criticalCount = alerts.filter(a => a.severity === 'critical').length;
    const highCount = alerts.filter(a => a.severity === 'high').length;
    const totalCount = alerts.length;

    let summaryText = `📊 *Alert Summary* - ${totalCount} active alert${totalCount !== 1 ? 's' : ''}`;
    
    if (criticalCount > 0) {
      summaryText += `\n🚨 ${criticalCount} Critical`;
    }
    if (highCount > 0) {
      summaryText += `\n⚠️ ${highCount} High`;
    }

    const recentAlerts = alerts
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);

    const blocks: SlackBlock[] = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: summaryText
        }
      }
    ];

    if (recentAlerts.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Recent Alerts:*'
        }
      });

      for (const alert of recentAlerts) {
        const emoji = this.getSeverityEmoji(alert.severity);
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${emoji} *${alert.name}* (${alert.severity})\n${alert.strategyId || 'System'} - ${new Date(alert.timestamp).toLocaleTimeString()}`
          }
        });
      }
    }

    return {
      username: 'TradingAgents',
      icon_emoji: ':chart_with_upwards_trend:',
      blocks
    };
  }

  /**
   * Build performance report message
   */
  buildPerformanceReport(performanceData: any): SlackMessage {
    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📈 Trading Performance Report'
        }
      }
    ];

    if (performanceData.strategies) {
      for (const [strategyId, metrics] of Object.entries(performanceData.strategies)) {
        const strategyMetrics = metrics as any;
        blocks.push({
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*${strategyId}*`
            },
            {
              type: 'mrkdwn',
              text: `Return: ${(strategyMetrics.totalReturn * 100).toFixed(2)}%`
            },
            {
              type: 'mrkdwn',
              text: `Sharpe: ${strategyMetrics.sharpeRatio?.toFixed(2) || 'N/A'}`
            },
            {
              type: 'mrkdwn',
              text: `Drawdown: ${(strategyMetrics.maxDrawdown * 100).toFixed(2)}%`
            }
          ]
        });
      }
    }

    return {
      username: 'TradingAgents',
      icon_emoji: ':chart_with_upwards_trend:',
      blocks
    };
  }
}