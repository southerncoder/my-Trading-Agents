/**
 * Notification Providers Index
 * 
 * Exports all notification providers and provides a factory
 * for creating provider instances.
 */

import { createLogger } from '../../utils/enhanced-logger.js';
import { EmailProvider, EmailProviderConfig } from './email-provider.js';
import { SmsProvider, SmsProviderConfig } from './sms-provider.js';
import { SlackProvider } from './slack-provider.js';
import { WebhookProvider } from './webhook-provider.js';
import { ConsoleProvider } from './console-provider.js';
import { NotificationRecord } from '../alert-manager.js';

const logger = createLogger('system', 'notification-manager');

export { EmailProvider } from './email-provider.js';
export { SmsProvider } from './sms-provider.js';
export { SlackProvider } from './slack-provider.js';
export { WebhookProvider } from './webhook-provider.js';
export { ConsoleProvider } from './console-provider.js';

export * from './email-provider.js';
export * from './sms-provider.js';
export * from './slack-provider.js';
export * from './webhook-provider.js';
export * from './console-provider.js';

// Notification Manager Types
export interface NotificationMessage {
  id: string;
  to: string[];
  subject?: string;
  body: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  templateData?: Record<string, any>;
}

export interface NotificationResult {
  success: boolean;
  response?: any;
  error?: string;
}

export interface NotificationProvider {
  initialize(): Promise<void>;
  sendMessage(message: NotificationMessage): Promise<NotificationResult>;
  cleanup(): Promise<void>;
}

export type NotificationProviderType = 'email' | 'sms' | 'slack' | 'webhook' | 'console';

export type AnyNotificationProviderConfig = 
  | EmailProviderConfig 
  | SmsProviderConfig 
  | { type: 'slack' }
  | { type: 'webhook' }
  | { type: 'console' };

/**
 * Notification Manager
 * 
 * Manages multiple notification providers and handles message routing
 */
export class NotificationManager {
  private providers: Map<string, NotificationProvider> = new Map();
  private initialized = false;

  /**
   * Initialize the notification manager
   */
  async initialize(): Promise<void> {
    this.initialized = true;
    logger.info('notification-manager', 'Notification manager initialized');
  }

  /**
   * Add a notification provider
   */
  addProvider(name: string, provider: NotificationProvider): void {
    this.providers.set(name, provider);
    logger.info('notification-manager', 'Provider added', { name });
  }

  /**
   * Get a notification provider
   */
  getProvider(name: string): NotificationProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Send message through a specific provider
   */
  async sendMessage(providerName: string, message: NotificationMessage): Promise<NotificationResult> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      return {
        success: false,
        error: `Provider not found: ${providerName}`
      };
    }

    try {
      return await provider.sendMessage(message);
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Cleanup all providers
   */
  async cleanup(): Promise<void> {
    for (const [name, provider] of this.providers) {
      try {
        await provider.cleanup();
        logger.debug('notification-manager', 'Provider cleaned up', { name });
      } catch (error) {
        logger.error('notification-manager', 'Failed to cleanup provider', {
          name,
          error: (error as Error).message
        });
      }
    }
    this.providers.clear();
    this.initialized = false;
  }
}

/**
 * Notification Provider Wrapper
 * 
 * Wraps individual providers to implement the common interface
 */
class NotificationProviderWrapper implements NotificationProvider {
  private provider: any;
  private type: NotificationProviderType;

  constructor(type: NotificationProviderType, config: any) {
    this.type = type;
    
    switch (type) {
      case 'email':
        this.provider = new EmailProvider(config as EmailProviderConfig);
        break;
      case 'sms':
        this.provider = new SmsProvider(config as SmsProviderConfig);
        break;
      case 'slack':
        this.provider = new SlackProvider();
        break;
      case 'webhook':
        this.provider = new WebhookProvider();
        break;
      case 'console':
        this.provider = new ConsoleProvider();
        break;
      default:
        throw new Error(`Unsupported notification provider type: ${type}`);
    }
  }

  async initialize(): Promise<void> {
    // Most providers don't need initialization
    logger.debug('notification-manager', 'Provider initialized', { type: this.type });
  }

  async sendMessage(message: NotificationMessage): Promise<NotificationResult> {
    try {
      // Create a mock notification record for compatibility
      const notification: NotificationRecord = {
        id: message.id,
        channel: {
          type: this.type,
          config: message.templateData || {} as any,
          enabled: true,
          retryAttempts: 3,
          retryDelay: 5
        },
        sentAt: new Date(),
        status: 'pending',
        attempts: 0
      };

      // Create alert data from message
      const alertData = {
        id: message.id,
        name: message.subject || 'Alert',
        description: message.body,
        severity: message.priority,
        timestamp: new Date(),
        ...(message.templateData || {})
      };

      switch (this.type) {
        case 'email':
          await this.provider.sendEmail(notification, alertData);
          break;
        case 'sms':
          await this.provider.sendSms(notification, alertData);
          break;
        case 'slack':
          await this.provider.sendSlackNotification(notification, alertData);
          break;
        case 'webhook':
          await this.provider.sendWebhookNotification(notification, alertData);
          break;
        case 'console':
          await this.provider.sendConsoleNotification(notification, alertData);
          break;
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async cleanup(): Promise<void> {
    // Most providers don't need cleanup
    logger.debug('notification-manager', 'Provider cleaned up', { type: this.type });
  }
}

/**
 * Create notification provider factory
 */
export function createNotificationProvider(
  type: NotificationProviderType, 
  config: any
): NotificationProvider {
  return new NotificationProviderWrapper(type, config);
}