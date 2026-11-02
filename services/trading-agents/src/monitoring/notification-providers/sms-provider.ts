/**
 * SMS Notification Provider
 * 
 * Supports multiple SMS services including Twilio, Cloudflare Workers,
 * and other cloud providers.
 */

import { createLogger } from '../../utils/enhanced-logger.js';
import { SmsConfig, NotificationRecord } from '../alert-manager.js';

const logger = createLogger('system', 'sms-provider');

export interface SmsProviderConfig {
  provider: 'twilio' | 'cloudflare' | 'aws_sns' | 'vonage';
  twilio?: {
    accountSid: string;
    authToken: string;
    fromNumber: string;
  };
  cloudflare?: {
    apiToken: string;
    accountId: string;
    workerUrl?: string; // Custom Cloudflare Worker for SMS
  };
  aws_sns?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };
  vonage?: {
    apiKey: string;
    apiSecret: string;
    fromNumber: string;
  };
}

export class SmsProvider {
  private config: SmsProviderConfig;

  constructor(config: SmsProviderConfig) {
    this.config = config;
  }

  /**
   * Send SMS notification
   */
  async sendSms(notification: NotificationRecord, alertData: any): Promise<void> {
    const smsConfig = notification.channel.config as SmsConfig;
    
    try {
      switch (this.config.provider) {
        case 'twilio':
          await this.sendTwilioSms(smsConfig, alertData);
          break;
        case 'cloudflare':
          await this.sendCloudflareSms(smsConfig, alertData);
          break;
        case 'aws_sns':
          await this.sendAwsSnsSms(smsConfig, alertData);
          break;
        case 'vonage':
          await this.sendVonageSms(smsConfig, alertData);
          break;
        default:
          throw new Error(`Unsupported SMS provider: ${this.config.provider}`);
      }

      logger.info('sms-provider', 'SMS sent successfully', {
        provider: this.config.provider,
        recipients: smsConfig.phoneNumbers.length
      });

    } catch (error) {
      logger.error('sms-provider', 'Failed to send SMS', {
        provider: this.config.provider,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Send SMS via Twilio
   */
  private async sendTwilioSms(smsConfig: SmsConfig, alertData: any): Promise<void> {
    if (!this.config.twilio) {
      throw new Error('Twilio configuration not provided');
    }

    const message = this.generateSmsContent(smsConfig, alertData);

    try {
      // Try to use Twilio SDK if available
      const twilio = await import('twilio');
      const client = twilio.default(this.config.twilio.accountSid, this.config.twilio.authToken);

      for (const phoneNumber of smsConfig.phoneNumbers) {
        await client.messages.create({
          body: message,
          from: this.config.twilio.fromNumber,
          to: phoneNumber
        });
      }

    } catch (importError) {
      if ((importError as Error).message.includes('Cannot resolve module')) {
        logger.warn('sms-provider', 'Twilio SDK not installed, using REST API');
        await this.sendTwilioRestApi(smsConfig, alertData);
      } else {
        throw importError;
      }
    }
  }

  /**
   * Send SMS via Twilio REST API (fallback)
   */
  private async sendTwilioRestApi(smsConfig: SmsConfig, alertData: any): Promise<void> {
    if (!this.config.twilio) {
      throw new Error('Twilio configuration not provided');
    }

    const message = this.generateSmsContent(smsConfig, alertData);
    const credentials = Buffer.from(`${this.config.twilio.accountSid}:${this.config.twilio.authToken}`).toString('base64');

    for (const phoneNumber of smsConfig.phoneNumbers) {
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.config.twilio.accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          From: this.config.twilio.fromNumber,
          To: phoneNumber,
          Body: message
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Twilio API error: ${response.status} - ${errorData.message || response.statusText}`);
      }
    }
  }

  /**
   * Send SMS via Cloudflare Worker
   */
  private async sendCloudflareSms(smsConfig: SmsConfig, alertData: any): Promise<void> {
    if (!this.config.cloudflare) {
      throw new Error('Cloudflare configuration not provided');
    }

    const message = this.generateSmsContent(smsConfig, alertData);
    
    // Use custom Cloudflare Worker for SMS (you'd need to deploy this)
    const workerUrl = this.config.cloudflare.workerUrl || 
      `https://sms-worker.${this.config.cloudflare.accountId}.workers.dev`;

    for (const phoneNumber of smsConfig.phoneNumbers) {
      const response = await fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.cloudflare.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: phoneNumber,
          message: message,
          alertData: {
            name: alertData.name,
            severity: alertData.severity,
            timestamp: alertData.timestamp
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Cloudflare Worker SMS error: ${response.status} - ${errorData.message || response.statusText}`);
      }
    }
  }

  /**
   * Send SMS via AWS SNS
   */
  private async sendAwsSnsSms(smsConfig: SmsConfig, alertData: any): Promise<void> {
    if (!this.config.aws_sns) {
      throw new Error('AWS SNS configuration not provided');
    }

    const message = this.generateSmsContent(smsConfig, alertData);

    // AWS SNS REST API implementation
    const region = this.config.aws_sns.region;
    const endpoint = `https://sns.${region}.amazonaws.com/`;

    for (const phoneNumber of smsConfig.phoneNumbers) {
      // This is a simplified implementation - in production, you'd want to use
      // proper AWS SDK or implement full AWS signature v4
      logger.warn('sms-provider', 'AWS SNS implementation requires proper AWS SDK - using placeholder');
      
      // For now, just log the SMS that would be sent
      logger.info('sms-provider', 'SMS content (AWS SNS placeholder)', {
        to: phoneNumber,
        message: message
      });
    }
  }

  /**
   * Send SMS via Vonage (formerly Nexmo)
   */
  private async sendVonageSms(smsConfig: SmsConfig, alertData: any): Promise<void> {
    if (!this.config.vonage) {
      throw new Error('Vonage configuration not provided');
    }

    const message = this.generateSmsContent(smsConfig, alertData);

    for (const phoneNumber of smsConfig.phoneNumbers) {
      const response = await fetch('https://rest.nexmo.com/sms/json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          api_key: this.config.vonage.apiKey,
          api_secret: this.config.vonage.apiSecret,
          from: this.config.vonage.fromNumber,
          to: phoneNumber,
          text: message
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Vonage API error: ${response.status} - ${errorData.message || response.statusText}`);
      }

      const result = await response.json();
      if (result.messages && result.messages[0].status !== '0') {
        throw new Error(`Vonage SMS failed: ${result.messages[0]['error-text']}`);
      }
    }
  }

  /**
   * Generate SMS content from template
   */
  private generateSmsContent(smsConfig: SmsConfig, alertData: any): string {
    const template = smsConfig.template || this.getDefaultTemplate();
    
    // Replace template variables
    const replacements = {
      '{{alertName}}': alertData.name || 'Alert',
      '{{severity}}': alertData.severity || 'unknown',
      '{{actualValue}}': alertData.actualValue?.toString() || 'N/A',
      '{{threshold}}': alertData.threshold?.toString() || 'N/A',
      '{{timestamp}}': alertData.timestamp ? new Date(alertData.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString(),
      '{{strategyId}}': alertData.strategyId || 'System'
    };

    let content = template;
    for (const [placeholder, value] of Object.entries(replacements)) {
      content = content.replace(new RegExp(placeholder, 'g'), value);
    }

    // Ensure SMS is within character limits (160 chars for single SMS)
    if (content.length > 160) {
      content = content.substring(0, 157) + '...';
    }

    return content;
  }

  /**
   * Get default SMS template
   */
  private getDefaultTemplate(): string {
    return '🚨 {{severity}} Alert: {{alertName}} ({{strategyId}}) - Value: {{actualValue}}, Threshold: {{threshold}} at {{timestamp}}';
  }

  /**
   * Validate phone number format
   */
  private validatePhoneNumber(phoneNumber: string): boolean {
    // Basic E.164 format validation
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phoneNumber);
  }

  /**
   * Format phone number to E.164 if needed
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Add + prefix if not present
    if (!phoneNumber.startsWith('+')) {
      // Assume US number if 10 digits, otherwise add + prefix
      if (digits.length === 10) {
        return `+1${digits}`;
      } else {
        return `+${digits}`;
      }
    }
    
    return phoneNumber;
  }
}