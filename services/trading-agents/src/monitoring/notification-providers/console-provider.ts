/**
 * Console Notification Provider
 * 
 * Provides console-based notifications with rich formatting
 * for development and debugging purposes.
 */

import { createLogger } from '../../utils/enhanced-logger.js';
import { ConsoleConfig, NotificationRecord } from '../alert-manager.js';

const logger = createLogger('system', 'console-provider');

export class ConsoleProvider {
  /**
   * Send console notification
   */
  async sendConsoleNotification(notification: NotificationRecord, alertData: any): Promise<void> {
    const consoleConfig = notification.channel.config as ConsoleConfig;
    
    try {
      const message = this.formatConsoleMessage(consoleConfig, alertData);
      
      // Log based on configured level
      switch (consoleConfig.logLevel) {
        case 'info':
          logger.info('console-notification', message.text, message.data);
          break;
        case 'warn':
          logger.warn('console-notification', message.text, message.data);
          break;
        case 'error':
          logger.error('console-notification', message.text, message.data);
          break;
        default:
          logger.info('console-notification', message.text, message.data);
      }

      // Also output to console with formatting if in development
      if (process.env.NODE_ENV === 'development') {
        this.outputFormattedConsole(alertData);
      }

      logger.debug('console-provider', 'Console notification sent', {
        logLevel: consoleConfig.logLevel,
        alertName: alertData.name
      });

    } catch (error) {
      logger.error('console-provider', 'Failed to send console notification', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Format console message
   */
  private formatConsoleMessage(config: ConsoleConfig, alertData: any): { text: string; data: any } {
    if (config.template) {
      const text = this.processTemplate(config.template, alertData);
      return {
        text,
        data: {
          alertId: alertData.id,
          severity: alertData.severity,
          timestamp: alertData.timestamp
        }
      };
    }

    const text = `Trading Alert: ${alertData.name} (${alertData.severity?.toUpperCase() || 'UNKNOWN'})`;
    const data = {
      alertId: alertData.id,
      name: alertData.name,
      severity: alertData.severity,
      description: alertData.description,
      actualValue: alertData.actualValue,
      threshold: alertData.threshold,
      timestamp: alertData.timestamp,
      strategyId: alertData.strategyId,
      status: alertData.status
    };

    return { text, data };
  }

  /**
   * Process template with variable replacement
   */
  private processTemplate(template: string, alertData: any): string {
    const replacements = {
      '{{alertId}}': alertData.id || 'unknown',
      '{{alertName}}': alertData.name || 'Unknown Alert',
      '{{severity}}': alertData.severity || 'unknown',
      '{{description}}': alertData.description || 'No description provided',
      '{{actualValue}}': alertData.actualValue?.toString() || 'N/A',
      '{{threshold}}': alertData.threshold?.toString() || 'N/A',
      '{{timestamp}}': alertData.timestamp ? new Date(alertData.timestamp).toLocaleString() : new Date().toLocaleString(),
      '{{status}}': alertData.status || 'active',
      '{{strategyId}}': alertData.strategyId || 'System'
    };

    let content = template;
    for (const [placeholder, value] of Object.entries(replacements)) {
      content = content.replace(new RegExp(placeholder, 'g'), value);
    }

    return content;
  }

  /**
   * Output formatted console message for development
   */
  private outputFormattedConsole(alertData: any): void {
    const severity = alertData.severity || 'unknown';
    const emoji = this.getSeverityEmoji(severity);
    const color = this.getSeverityColor(severity);
    
    // Create a formatted box for the alert
    const boxWidth = 80;
    const line = '═'.repeat(boxWidth);
    const emptyLine = '║' + ' '.repeat(boxWidth - 2) + '║';
    
    console.log('\n' + '╔' + line + '╗');
    console.log('║' + this.centerText(`${emoji} TRADING ALERT ${emoji}`, boxWidth - 2) + '║');
    console.log('╠' + line + '╣');
    console.log(emptyLine);
    
    // Alert details
    console.log('║' + this.padText(`Name: ${alertData.name || 'Unknown Alert'}`, boxWidth - 2) + '║');
    console.log('║' + this.padText(`Severity: ${color}${severity.toUpperCase()}\x1b[0m`, boxWidth - 2) + '║');
    console.log('║' + this.padText(`Strategy: ${alertData.strategyId || 'System'}`, boxWidth - 2) + '║');
    console.log('║' + this.padText(`Time: ${alertData.timestamp ? new Date(alertData.timestamp).toLocaleString() : new Date().toLocaleString()}`, boxWidth - 2) + '║');
    
    if (alertData.description) {
      console.log(emptyLine);
      const descLines = this.wrapText(alertData.description, boxWidth - 6);
      for (const line of descLines) {
        console.log('║' + this.padText(line, boxWidth - 2) + '║');
      }
    }
    
    console.log(emptyLine);
    console.log('║' + this.padText(`Actual Value: ${alertData.actualValue?.toString() || 'N/A'}`, boxWidth - 2) + '║');
    console.log('║' + this.padText(`Threshold: ${alertData.threshold?.toString() || 'N/A'}`, boxWidth - 2) + '║');
    console.log('║' + this.padText(`Alert ID: ${alertData.id || 'unknown'}`, boxWidth - 2) + '║');
    
    console.log(emptyLine);
    console.log('╚' + line + '╝\n');
  }

  /**
   * Get emoji for severity level
   */
  private getSeverityEmoji(severity: string): string {
    switch (severity?.toLowerCase()) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '🔶';
      case 'low': return 'ℹ️';
      default: return '🔔';
    }
  }

  /**
   * Get ANSI color code for severity level
   */
  private getSeverityColor(severity: string): string {
    switch (severity?.toLowerCase()) {
      case 'critical': return '\x1b[91m'; // Bright red
      case 'high': return '\x1b[93m';     // Bright yellow
      case 'medium': return '\x1b[33m';   // Yellow
      case 'low': return '\x1b[92m';      // Bright green
      default: return '\x1b[37m';         // White
    }
  }

  /**
   * Center text within a given width
   */
  private centerText(text: string, width: number): string {
    const padding = Math.max(0, width - text.length);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
  }

  /**
   * Pad text to a specific width
   */
  private padText(text: string, width: number): string {
    if (text.length >= width) {
      return text.substring(0, width);
    }
    return ' ' + text + ' '.repeat(width - text.length - 1);
  }

  /**
   * Wrap text to fit within a specific width
   */
  private wrapText(text: string, width: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + word).length <= width) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Send alert summary to console
   */
  async sendAlertSummary(alerts: any[]): Promise<void> {
    const summary = this.generateAlertSummary(alerts);
    
    logger.info('console-notification', 'Alert Summary', summary);
    
    if (process.env.NODE_ENV === 'development') {
      this.outputFormattedSummary(summary);
    }
  }

  /**
   * Generate alert summary data
   */
  private generateAlertSummary(alerts: any[]): any {
    const severityCounts = {
      critical: alerts.filter(a => a.severity === 'critical').length,
      high: alerts.filter(a => a.severity === 'high').length,
      medium: alerts.filter(a => a.severity === 'medium').length,
      low: alerts.filter(a => a.severity === 'low').length
    };

    const strategyCounts: Record<string, number> = {};
    alerts.forEach(alert => {
      const strategy = alert.strategyId || 'System';
      strategyCounts[strategy] = (strategyCounts[strategy] || 0) + 1;
    });

    return {
      total: alerts.length,
      severityCounts,
      strategyCounts,
      recentAlerts: alerts
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5)
        .map(alert => ({
          name: alert.name,
          severity: alert.severity,
          strategy: alert.strategyId,
          time: new Date(alert.timestamp).toLocaleTimeString()
        }))
    };
  }

  /**
   * Output formatted summary to console
   */
  private outputFormattedSummary(summary: any): void {
    const boxWidth = 80;
    const line = '═'.repeat(boxWidth);
    
    console.log('\n' + '╔' + line + '╗');
    console.log('║' + this.centerText('📊 ALERT SUMMARY 📊', boxWidth - 2) + '║');
    console.log('╠' + line + '╣');
    
    console.log('║' + this.padText(`Total Active Alerts: ${summary.total}`, boxWidth - 2) + '║');
    console.log('║' + ' '.repeat(boxWidth - 2) + '║');
    
    // Severity breakdown
    console.log('║' + this.padText('Severity Breakdown:', boxWidth - 2) + '║');
    console.log('║' + this.padText(`  🚨 Critical: ${summary.severityCounts.critical}`, boxWidth - 2) + '║');
    console.log('║' + this.padText(`  ⚠️  High: ${summary.severityCounts.high}`, boxWidth - 2) + '║');
    console.log('║' + this.padText(`  🔶 Medium: ${summary.severityCounts.medium}`, boxWidth - 2) + '║');
    console.log('║' + this.padText(`  ℹ️  Low: ${summary.severityCounts.low}`, boxWidth - 2) + '║');
    
    // Strategy breakdown
    if (Object.keys(summary.strategyCounts).length > 0) {
      console.log('║' + ' '.repeat(boxWidth - 2) + '║');
      console.log('║' + this.padText('By Strategy:', boxWidth - 2) + '║');
      for (const [strategy, count] of Object.entries(summary.strategyCounts)) {
        console.log('║' + this.padText(`  ${strategy}: ${count}`, boxWidth - 2) + '║');
      }
    }
    
    // Recent alerts
    if (summary.recentAlerts.length > 0) {
      console.log('║' + ' '.repeat(boxWidth - 2) + '║');
      console.log('║' + this.padText('Recent Alerts:', boxWidth - 2) + '║');
      for (const alert of summary.recentAlerts) {
        const emoji = this.getSeverityEmoji(alert.severity);
        console.log('║' + this.padText(`  ${emoji} ${alert.name} (${alert.strategy}) - ${alert.time}`, boxWidth - 2) + '║');
      }
    }
    
    console.log('╚' + line + '╝\n');
  }
}