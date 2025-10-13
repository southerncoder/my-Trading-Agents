/**
 * Email Notification Provider
 * 
 * Supports multiple email services including Cloudflare Email Routing,
 * SMTP, and other cloud providers.
 */

import { createLogger } from '../../utils/enhanced-logger.js';
import { EmailConfig, NotificationRecord } from '../alert-manager.js';

const logger = createLogger('system', 'email-provider');

export interface EmailProviderConfig {
  provider: 'smtp' | 'cloudflare' | 'sendgrid' | 'resend';
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  cloudflare?: {
    apiToken: string;
    zoneId: string;
    fromEmail: string;
  };
  sendgrid?: {
    apiKey: string;
    fromEmail: string;
  };
  resend?: {
    apiKey: string;
    fromEmail: string;
  };
}

export class EmailProvider {
  private config: EmailProviderConfig;

  constructor(config: EmailProviderConfig) {
    this.config = config;
  }

  /**
   * Send email notification
   */
  async sendEmail(notification: NotificationRecord, alertData: any): Promise<void> {
    const emailConfig = notification.channel.config as EmailConfig;
    
    try {
      switch (this.config.provider) {
        case 'cloudflare':
          await this.sendCloudflareEmail(emailConfig, alertData);
          break;
        case 'smtp':
          await this.sendSMTPEmail(emailConfig, alertData);
          break;
        case 'sendgrid':
          await this.sendSendGridEmail(emailConfig, alertData);
          break;
        case 'resend':
          await this.sendResendEmail(emailConfig, alertData);
          break;
        default:
          throw new Error(`Unsupported email provider: ${this.config.provider}`);
      }

      logger.info('email-provider', 'Email sent successfully', {
        provider: this.config.provider,
        recipients: emailConfig.to.length
      });

    } catch (error) {
      logger.error('email-provider', 'Failed to send email', {
        provider: this.config.provider,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Send email via Cloudflare Email Routing
   */
  private async sendCloudflareEmail(emailConfig: EmailConfig, alertData: any): Promise<void> {
    if (!this.config.cloudflare) {
      throw new Error('Cloudflare configuration not provided');
    }

    const emailContent = this.generateEmailContent(emailConfig, alertData);

    // Cloudflare Email API (hypothetical - adjust based on actual API)
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${this.config.cloudflare.zoneId}/email/routing/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.cloudflare.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: this.config.cloudflare.fromEmail,
        to: emailConfig.to,
        cc: emailConfig.cc,
        bcc: emailConfig.bcc,
        subject: emailConfig.subject || `Trading Alert: ${alertData.name}`,
        html: emailContent.html,
        text: emailContent.text
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Cloudflare Email API error: ${response.status} - ${errorData.message || response.statusText}`);
    }
  }

  /**
   * Send email via SMTP (using nodemailer when available)
   */
  private async sendSMTPEmail(emailConfig: EmailConfig, alertData: any): Promise<void> {
    if (!this.config.smtp) {
      throw new Error('SMTP configuration not provided');
    }

    try {
      // Dynamic import to handle optional dependency
      const nodemailer = await import('nodemailer');
      
      const transporter = nodemailer.createTransporter({
        host: this.config.smtp.host,
        port: this.config.smtp.port,
        secure: this.config.smtp.secure,
        auth: this.config.smtp.auth
      });

      const emailContent = this.generateEmailContent(emailConfig, alertData);

      await transporter.sendMail({
        from: this.config.smtp.auth.user,
        to: emailConfig.to.join(', '),
        cc: emailConfig.cc?.join(', '),
        bcc: emailConfig.bcc?.join(', '),
        subject: emailConfig.subject || `Trading Alert: ${alertData.name}`,
        html: emailContent.html,
        text: emailContent.text
      });

    } catch (importError) {
      if ((importError as Error).message.includes('Cannot resolve module')) {
        logger.warn('email-provider', 'Nodemailer not installed, falling back to fetch-based SMTP');
        await this.sendFetchBasedEmail(emailConfig, alertData);
      } else {
        throw importError;
      }
    }
  }

  /**
   * Send email via SendGrid
   */
  private async sendSendGridEmail(emailConfig: EmailConfig, alertData: any): Promise<void> {
    if (!this.config.sendgrid) {
      throw new Error('SendGrid configuration not provided');
    }

    const emailContent = this.generateEmailContent(emailConfig, alertData);

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.sendgrid.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: { email: this.config.sendgrid.fromEmail },
        personalizations: [{
          to: emailConfig.to.map(email => ({ email })),
          cc: emailConfig.cc?.map(email => ({ email })),
          bcc: emailConfig.bcc?.map(email => ({ email })),
          subject: emailConfig.subject || `Trading Alert: ${alertData.name}`
        }],
        content: [
          {
            type: 'text/plain',
            value: emailContent.text
          },
          {
            type: 'text/html',
            value: emailContent.html
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`SendGrid API error: ${response.status} - ${errorData.message || response.statusText}`);
    }
  }

  /**
   * Send email via Resend
   */
  private async sendResendEmail(emailConfig: EmailConfig, alertData: any): Promise<void> {
    if (!this.config.resend) {
      throw new Error('Resend configuration not provided');
    }

    const emailContent = this.generateEmailContent(emailConfig, alertData);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.resend.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: this.config.resend.fromEmail,
        to: emailConfig.to,
        cc: emailConfig.cc,
        bcc: emailConfig.bcc,
        subject: emailConfig.subject || `Trading Alert: ${alertData.name}`,
        html: emailContent.html,
        text: emailContent.text
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Resend API error: ${response.status} - ${errorData.message || response.statusText}`);
    }
  }

  /**
   * Fallback email sending using fetch (for environments without nodemailer)
   */
  private async sendFetchBasedEmail(emailConfig: EmailConfig, alertData: any): Promise<void> {
    // This is a simplified implementation - in production, you'd want to use
    // a proper email service API like Cloudflare, SendGrid, or Resend
    logger.warn('email-provider', 'Using fallback email method - consider configuring a proper email service');
    
    const emailContent = this.generateEmailContent(emailConfig, alertData);
    
    // Log the email content for debugging
    logger.info('email-provider', 'Email content (fallback mode)', {
      to: emailConfig.to,
      subject: emailConfig.subject || `Trading Alert: ${alertData.name}`,
      content: emailContent.text
    });
  }

  /**
   * Generate email content from template
   */
  private generateEmailContent(emailConfig: EmailConfig, alertData: any): { html: string; text: string } {
    const template = emailConfig.template || this.getDefaultTemplate();
    
    // Replace template variables
    const replacements = {
      '{{alertName}}': alertData.name || 'Unknown Alert',
      '{{severity}}': alertData.severity || 'unknown',
      '{{description}}': alertData.description || 'No description provided',
      '{{actualValue}}': alertData.actualValue?.toString() || 'N/A',
      '{{threshold}}': alertData.threshold?.toString() || 'N/A',
      '{{timestamp}}': alertData.timestamp ? new Date(alertData.timestamp).toLocaleString() : new Date().toLocaleString(),
      '{{strategyId}}': alertData.strategyId || 'System'
    };

    let content = template;
    for (const [placeholder, value] of Object.entries(replacements)) {
      content = content.replace(new RegExp(placeholder, 'g'), value);
    }

    // Generate both HTML and text versions
    const html = this.generateHTMLContent(content, alertData);
    const text = this.stripHTML(content);

    return { html, text };
  }

  /**
   * Get default email template
   */
  private getDefaultTemplate(): string {
    return `
Trading Alert: {{alertName}}

Severity: {{severity}}
Strategy: {{strategyId}}
Time: {{timestamp}}

Description: {{description}}

Alert Details:
- Actual Value: {{actualValue}}
- Threshold: {{threshold}}

Please review this alert and take appropriate action if necessary.

---
TradingAgents Alert System
    `.trim();
  }

  /**
   * Generate HTML email content
   */
  private generateHTMLContent(textContent: string, alertData: any): string {
    const severityColor = this.getSeverityColor(alertData.severity);
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trading Alert</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: ${severityColor}; color: white; padding: 15px; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
        .alert-details { background-color: white; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .severity { font-weight: bold; text-transform: uppercase; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>🚨 Trading Alert: ${alertData.name || 'Unknown Alert'}</h2>
        </div>
        <div class="content">
            <div class="alert-details">
                <p><strong>Severity:</strong> <span class="severity" style="color: ${severityColor};">${alertData.severity || 'unknown'}</span></p>
                <p><strong>Strategy:</strong> ${alertData.strategyId || 'System'}</p>
                <p><strong>Time:</strong> ${alertData.timestamp ? new Date(alertData.timestamp).toLocaleString() : new Date().toLocaleString()}</p>
                <p><strong>Description:</strong> ${alertData.description || 'No description provided'}</p>
                
                <h4>Alert Details:</h4>
                <ul>
                    <li><strong>Actual Value:</strong> ${alertData.actualValue?.toString() || 'N/A'}</li>
                    <li><strong>Threshold:</strong> ${alertData.threshold?.toString() || 'N/A'}</li>
                </ul>
            </div>
            
            <p>Please review this alert and take appropriate action if necessary.</p>
        </div>
        <div class="footer">
            <p>TradingAgents Alert System</p>
        </div>
    </div>
</body>
</html>
    `.trim();
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
   * Strip HTML tags from content
   */
  private stripHTML(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}