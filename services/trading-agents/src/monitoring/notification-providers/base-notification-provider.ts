/**
 * Base Notification Provider Interface
 * 
 * Defines the contract for all notification providers to enable
 * easy swapping of notification services (email, SMS, etc.)
 */

export interface NotificationMessage {
  id: string;
  to: string | string[];
  subject?: string;
  body: string;
  template?: string;
  templateData?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  response?: any;
  timestamp: Date;
}

export interface NotificationProviderConfig {
  enabled: boolean;
  retryAttempts: number;
  retryDelay: number; // seconds
  timeout?: number; // milliseconds
}

/**
 * Base interface for all notification providers
 */
export abstract class BaseNotificationProvider {
  protected config: NotificationProviderConfig;
  protected providerName: string;

  constructor(providerName: string, config: NotificationProviderConfig) {
    this.providerName = providerName;
    this.config = config;
  }

  /**
   * Initialize the provider (setup connections, validate config, etc.)
   */
  abstract initialize(): Promise<void>;

  /**
   * Send a notification message
   */
  abstract sendMessage(message: NotificationMessage): Promise<NotificationResult>;

  /**
   * Test the provider connection/configuration
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Get provider health status
   */
  abstract getHealthStatus(): Promise<{
    healthy: boolean;
    lastCheck: Date;
    error?: string;
  }>;

  /**
   * Cleanup resources
   */
  abstract cleanup(): Promise<void>;

  /**
   * Get provider name
   */
  getProviderName(): string {
    return this.providerName;
  }

  /**
   * Check if provider is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
}