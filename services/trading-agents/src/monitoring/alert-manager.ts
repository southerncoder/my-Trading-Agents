/**
 * Alerting and Notification System
 * 
 * Provides configurable alert rules, multiple notification channels,
 * alert acknowledgment workflows, and alert dashboard management.
 */

import { createLogger } from '../utils/enhanced-logger.js';
import { DatabaseManager } from '../database/database-manager.js';
import { PerformanceAlert } from './performance-monitor.js';
import { 
  NotificationManager, 
  createNotificationProvider, 
  NotificationMessage,
  NotificationProviderType,
  AnyNotificationProviderConfig
} from './notification-providers/index.js';

// Import specific config types for type checking
export interface EmailConfig {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  template?: string;
}

export interface SmsConfig {
  phoneNumbers: string[];
  provider: 'twilio' | 'aws_sns';
  template?: string;
}

export interface SlackConfig {
  webhookUrl: string;
  channel: string;
  username?: string;
  iconEmoji?: string;
  template?: string;
}

export interface WebhookConfig {
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  template?: string;
  authentication?: {
    type: 'bearer' | 'basic' | 'api_key';
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
}

export interface ConsoleConfig {
  logLevel: 'info' | 'warn' | 'error';
  template?: string;
}

const logger = createLogger('system', 'alert-manager');

export interface AlertConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  condition: AlertCondition;
  threshold: number;
  timeframe: number; // minutes
  channels: NotificationChannel[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  cooldownPeriod: number; // minutes
  escalationRules?: EscalationRule[];
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertCondition {
  type: 'threshold' | 'percentage_change' | 'moving_average' | 'custom';
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'between';
  value: number | number[];
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
  windowSize?: number; // minutes
  customExpression?: string; // For custom conditions
}

export interface NotificationChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'console';
  name?: string; // Optional unique name for this channel instance
  config: EmailConfig | SlackConfig | WebhookConfig | SmsConfig | ConsoleConfig;
  enabled: boolean;
  retryAttempts: number;
  retryDelay: number; // seconds
}

// Configuration interfaces are now imported from notification providers

export interface EscalationRule {
  id: string;
  condition: 'time_based' | 'severity_based' | 'acknowledgment_timeout';
  delay: number; // minutes
  targetChannels: NotificationChannel[];
  escalationLevel: number;
}

export interface TriggeredAlert {
  id: string;
  configId: string;
  strategyId?: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  condition: AlertCondition;
  actualValue: number | string;
  threshold: number;
  timestamp: Date;
  status: 'active' | 'acknowledged' | 'resolved' | 'escalated';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  escalationLevel: number;
  notificationsSent: NotificationRecord[];
  metadata: Record<string, any>;
}

export interface NotificationRecord {
  id: string;
  channel: NotificationChannel;
  sentAt: Date;
  status: 'pending' | 'sent' | 'failed' | 'retrying';
  attempts: number;
  lastAttemptAt?: Date;
  error?: string;
  response?: any;
}

export interface SystemMetrics {
  timestamp: Date;
  performance: {
    [strategyId: string]: {
      totalReturn: number;
      sharpeRatio: number;
      maxDrawdown: number;
      volatility: number;
      winRate: number;
    };
  };
  system: {
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
    errorRate: number;
    responseTime: number;
  };
  market: {
    vix?: number;
    marketTrend?: 'bullish' | 'bearish' | 'sideways';
    volatility?: number;
  };
}

export interface AlertDashboard {
  summary: {
    totalAlerts: number;
    activeAlerts: number;
    criticalAlerts: number;
    acknowledgedAlerts: number;
    resolvedAlerts: number;
  };
  recentAlerts: TriggeredAlert[];
  alertsByStrategy: Record<string, number>;
  alertsBySeverity: Record<string, number>;
  alertTrends: {
    hourly: number[];
    daily: number[];
    weekly: number[];
  };
  topAlertConfigs: Array<{
    configId: string;
    name: string;
    triggerCount: number;
    lastTriggered: Date;
  }>;
}

/**
 * Comprehensive Alert Manager for configurable alerting
 */
export class AlertManager {
  private dbManager: DatabaseManager;
  private notificationManager: NotificationManager;
  private alertConfigs: Map<string, AlertConfig> = new Map();
  private activeAlerts: Map<string, TriggeredAlert> = new Map();
  private notificationQueue: NotificationRecord[] = [];
  private isInitialized = false;
  private processingInterval?: NodeJS.Timeout | undefined;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
    this.notificationManager = new NotificationManager();
  }

  /**
   * Initialize the alert manager
   */
  async initialize(): Promise<void> {
    try {
      if (!this.dbManager.initialized) {
        await this.dbManager.initializeConnections();
      }

      // Load existing alert configurations
      await this.loadAlertConfigurations();

      // Load active alerts
      await this.loadActiveAlerts();

      // Start notification processing
      this.startNotificationProcessing();

      this.isInitialized = true;
      logger.info('alert-manager', 'Alert manager initialized successfully', {
        configCount: this.alertConfigs.size,
        activeAlertCount: this.activeAlerts.size
      });

    } catch (error) {
      logger.error('alert-manager', 'Failed to initialize alert manager', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Create a new alert configuration
   */
  async createAlert(config: Omit<AlertConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    this.ensureInitialized();

    try {
      const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date();

      const alertConfig: AlertConfig = {
        ...config,
        id: alertId,
        createdAt: now,
        updatedAt: now
      };

      // Validate configuration
      this.validateAlertConfig(alertConfig);

      // Store in database
      await this.dbManager.storeStructuredData({
        table: 'alert_configs',
        data: {
          id: alertConfig.id,
          name: alertConfig.name,
          description: alertConfig.description,
          enabled: alertConfig.enabled,
          condition: alertConfig.condition,
          threshold: alertConfig.threshold,
          timeframe: alertConfig.timeframe,
          channels: alertConfig.channels,
          severity: alertConfig.severity,
          cooldown_period: alertConfig.cooldownPeriod,
          escalation_rules: alertConfig.escalationRules || [],
          tags: alertConfig.tags,
          created_by: alertConfig.createdBy,
          created_at: alertConfig.createdAt,
          updated_at: alertConfig.updatedAt
        }
      });

      // Cache configuration
      this.alertConfigs.set(alertId, alertConfig);

      logger.info('alert-manager', 'Alert configuration created', {
        alertId,
        name: alertConfig.name,
        severity: alertConfig.severity
      });

      return alertId;

    } catch (error) {
      logger.error('alert-manager', 'Failed to create alert configuration', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Update an existing alert configuration
   */
  async updateAlert(alertId: string, config: Partial<AlertConfig>): Promise<void> {
    this.ensureInitialized();

    try {
      const existingConfig = this.alertConfigs.get(alertId);
      if (!existingConfig) {
        throw new Error(`Alert configuration not found: ${alertId}`);
      }

      const updatedConfig: AlertConfig = {
        ...existingConfig,
        ...config,
        id: alertId, // Ensure ID doesn't change
        updatedAt: new Date()
      };

      // Validate updated configuration
      this.validateAlertConfig(updatedConfig);

      // Update in database
      await this.dbManager.storeStructuredData({
        table: 'alert_configs',
        data: {
          id: updatedConfig.id,
          name: updatedConfig.name,
          description: updatedConfig.description,
          enabled: updatedConfig.enabled,
          condition: updatedConfig.condition,
          threshold: updatedConfig.threshold,
          timeframe: updatedConfig.timeframe,
          channels: updatedConfig.channels,
          severity: updatedConfig.severity,
          cooldown_period: updatedConfig.cooldownPeriod,
          escalation_rules: updatedConfig.escalationRules || [],
          tags: updatedConfig.tags,
          created_by: updatedConfig.createdBy,
          created_at: updatedConfig.createdAt,
          updated_at: updatedConfig.updatedAt
        },
        upsert: true
      });

      // Update cache
      this.alertConfigs.set(alertId, updatedConfig);

      logger.info('alert-manager', 'Alert configuration updated', {
        alertId,
        name: updatedConfig.name
      });

    } catch (error) {
      logger.error('alert-manager', 'Failed to update alert configuration', {
        alertId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Delete an alert configuration
   */
  async deleteAlert(alertId: string): Promise<void> {
    this.ensureInitialized();

    try {
      const existingConfig = this.alertConfigs.get(alertId);
      if (!existingConfig) {
        throw new Error(`Alert configuration not found: ${alertId}`);
      }

      // Delete from database
      await this.dbManager.executeQuery(
        'DELETE FROM alert_configs WHERE id = $1',
        [alertId]
      );

      // Remove from cache
      this.alertConfigs.delete(alertId);

      // Resolve any active alerts for this configuration
      const activeAlertsForConfig = Array.from(this.activeAlerts.values())
        .filter(alert => alert.configId === alertId);

      for (const alert of activeAlertsForConfig) {
        await this.resolveAlert(alert.id, 'system', 'Alert configuration deleted');
      }

      logger.info('alert-manager', 'Alert configuration deleted', {
        alertId,
        name: existingConfig.name
      });

    } catch (error) {
      logger.error('alert-manager', 'Failed to delete alert configuration', {
        alertId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Check alerts against current system metrics
   */
  async checkAlerts(currentMetrics: SystemMetrics): Promise<TriggeredAlert[]> {
    this.ensureInitialized();

    try {
      const triggeredAlerts: TriggeredAlert[] = [];

      for (const config of this.alertConfigs.values()) {
        if (!config.enabled) continue;

        // Check if alert is in cooldown
        if (this.isInCooldown(config.id)) continue;

        // Evaluate alert condition
        const conditionMet = await this.evaluateCondition(config.condition, currentMetrics);
        
        if (conditionMet.triggered) {
          const alert = await this.createTriggeredAlert(config, conditionMet.actualValue, currentMetrics);
          triggeredAlerts.push(alert);
        }
      }

      logger.debug('alert-manager', 'Alert check completed', {
        configsChecked: this.alertConfigs.size,
        alertsTriggered: triggeredAlerts.length
      });

      return triggeredAlerts;

    } catch (error) {
      logger.error('alert-manager', 'Failed to check alerts', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Send alert through configured notification channels
   */
  async sendAlert(alert: TriggeredAlert, channels: NotificationChannel[]): Promise<void> {
    this.ensureInitialized();

    try {
      for (const channel of channels) {
        if (!channel.enabled) continue;

        const notification: NotificationRecord = {
          id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          channel,
          sentAt: new Date(),
          status: 'pending',
          attempts: 0
        };

        // Add to queue for processing
        this.notificationQueue.push(notification);

        // Update alert with notification record
        alert.notificationsSent.push(notification);
      }

      // Update alert in database
      await this.updateTriggeredAlert(alert);

      logger.info('alert-manager', 'Alert queued for notification', {
        alertId: alert.id,
        channelCount: channels.length
      });

    } catch (error) {
      logger.error('alert-manager', 'Failed to send alert', {
        alertId: alert.id,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, userId: string, note?: string): Promise<void> {
    this.ensureInitialized();

    try {
      const alert = this.activeAlerts.get(alertId);
      if (!alert) {
        throw new Error(`Active alert not found: ${alertId}`);
      }

      if (alert.status === 'acknowledged') {
        logger.warn('alert-manager', 'Alert already acknowledged', { alertId });
        return;
      }

      // Update alert status
      alert.status = 'acknowledged';
      alert.acknowledgedBy = userId;
      alert.acknowledgedAt = new Date();
      
      if (note) {
        alert.metadata.acknowledgmentNote = note;
      }

      // Update in database and cache
      await this.updateTriggeredAlert(alert);

      logger.info('alert-manager', 'Alert acknowledged', {
        alertId,
        acknowledgedBy: userId
      });

    } catch (error) {
      logger.error('alert-manager', 'Failed to acknowledge alert', {
        alertId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, userId: string, resolution?: string): Promise<void> {
    this.ensureInitialized();

    try {
      const alert = this.activeAlerts.get(alertId);
      if (!alert) {
        throw new Error(`Active alert not found: ${alertId}`);
      }

      // Update alert status
      alert.status = 'resolved';
      alert.resolvedAt = new Date();
      
      if (resolution) {
        alert.metadata.resolution = resolution;
        alert.metadata.resolvedBy = userId;
      }

      // Update in database
      await this.updateTriggeredAlert(alert);

      // Remove from active alerts
      this.activeAlerts.delete(alertId);

      logger.info('alert-manager', 'Alert resolved', {
        alertId,
        resolvedBy: userId
      });

    } catch (error) {
      logger.error('alert-manager', 'Failed to resolve alert', {
        alertId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get alert dashboard data
   */
  async getAlertDashboard(): Promise<AlertDashboard> {
    this.ensureInitialized();

    try {
      const activeAlerts = Array.from(this.activeAlerts.values());
      
      // Calculate summary statistics
      const summary = {
        totalAlerts: activeAlerts.length,
        activeAlerts: activeAlerts.filter(a => a.status === 'active').length,
        criticalAlerts: activeAlerts.filter(a => a.severity === 'critical').length,
        acknowledgedAlerts: activeAlerts.filter(a => a.status === 'acknowledged').length,
        resolvedAlerts: 0 // Would need to query database for historical data
      };

      // Get recent alerts (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentAlerts = activeAlerts
        .filter(a => a.timestamp > oneDayAgo)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 20);

      // Group alerts by strategy
      const alertsByStrategy: Record<string, number> = {};
      activeAlerts.forEach(alert => {
        const strategyId = alert.strategyId || 'system';
        alertsByStrategy[strategyId] = (alertsByStrategy[strategyId] || 0) + 1;
      });

      // Group alerts by severity
      const alertsBySeverity: Record<string, number> = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      };
      activeAlerts.forEach(alert => {
        const severity = alert.severity;
        if (severity && alertsBySeverity.hasOwnProperty(severity)) {
          alertsBySeverity[severity] = (alertsBySeverity[severity] || 0) + 1;
        }
      });

      // Calculate alert trends (simplified)
      const alertTrends = {
        hourly: new Array(24).fill(0),
        daily: new Array(7).fill(0),
        weekly: new Array(4).fill(0)
      };

      // Get top alert configurations by trigger count
      const configTriggerCounts = new Map<string, { count: number; lastTriggered: Date; name: string }>();
      activeAlerts.forEach(alert => {
        const existing = configTriggerCounts.get(alert.configId);
        if (existing) {
          existing.count++;
          if (alert.timestamp > existing.lastTriggered) {
            existing.lastTriggered = alert.timestamp;
          }
        } else {
          const config = this.alertConfigs.get(alert.configId);
          configTriggerCounts.set(alert.configId, {
            count: 1,
            lastTriggered: alert.timestamp,
            name: config?.name || 'Unknown'
          });
        }
      });

      const topAlertConfigs = Array.from(configTriggerCounts.entries())
        .map(([configId, data]) => ({
          configId,
          name: data.name,
          triggerCount: data.count,
          lastTriggered: data.lastTriggered
        }))
        .sort((a, b) => b.triggerCount - a.triggerCount)
        .slice(0, 10);

      const dashboard: AlertDashboard = {
        summary,
        recentAlerts,
        alertsByStrategy,
        alertsBySeverity,
        alertTrends,
        topAlertConfigs
      };

      logger.debug('alert-manager', 'Alert dashboard generated', {
        totalAlerts: summary.totalAlerts,
        activeAlerts: summary.activeAlerts
      });

      return dashboard;

    } catch (error) {
      logger.error('alert-manager', 'Failed to generate alert dashboard', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Load alert configurations from database
   */
  private async loadAlertConfigurations(): Promise<void> {
    try {
      const configs = await this.dbManager.executeQuery<any>(
        'SELECT * FROM alert_configs WHERE enabled = true'
      );

      for (const config of configs) {
        const alertConfig: AlertConfig = {
          id: config.id,
          name: config.name,
          description: config.description,
          enabled: config.enabled,
          condition: config.condition,
          threshold: config.threshold,
          timeframe: config.timeframe,
          channels: config.channels,
          severity: config.severity,
          cooldownPeriod: config.cooldown_period,
          escalationRules: config.escalation_rules,
          tags: config.tags,
          createdBy: config.created_by,
          createdAt: config.created_at,
          updatedAt: config.updated_at
        };

        this.alertConfigs.set(alertConfig.id, alertConfig);
      }

      logger.info('alert-manager', 'Alert configurations loaded', {
        count: this.alertConfigs.size
      });

    } catch (error) {
      logger.error('alert-manager', 'Failed to load alert configurations', {
        error: (error as Error).message
      });
      // Don't throw - continue with empty configurations
    }
  }

  /**
   * Load active alerts from database
   */
  private async loadActiveAlerts(): Promise<void> {
    try {
      const alerts = await this.dbManager.executeQuery<any>(
        'SELECT * FROM triggered_alerts WHERE status IN ($1, $2)',
        ['active', 'acknowledged']
      );

      for (const alert of alerts) {
        const triggeredAlert: TriggeredAlert = {
          id: alert.id,
          configId: alert.config_id,
          strategyId: alert.strategy_id,
          name: alert.name,
          description: alert.description,
          severity: alert.severity,
          condition: alert.condition,
          actualValue: alert.actual_value,
          threshold: alert.threshold,
          timestamp: alert.timestamp,
          status: alert.status,
          acknowledgedBy: alert.acknowledged_by,
          acknowledgedAt: alert.acknowledged_at,
          resolvedAt: alert.resolved_at,
          escalationLevel: alert.escalation_level,
          notificationsSent: alert.notifications_sent || [],
          metadata: alert.metadata || {}
        };

        this.activeAlerts.set(triggeredAlert.id, triggeredAlert);
      }

      logger.info('alert-manager', 'Active alerts loaded', {
        count: this.activeAlerts.size
      });

    } catch (error) {
      logger.error('alert-manager', 'Failed to load active alerts', {
        error: (error as Error).message
      });
      // Don't throw - continue with empty alerts
    }
  }

  /**
   * Start notification processing loop
   */
  private startNotificationProcessing(): void {
    this.processingInterval = setInterval(async () => {
      await this.processNotificationQueue();
    }, 5000); // Process every 5 seconds

    logger.info('alert-manager', 'Notification processing started');
  }

  /**
   * Process notification queue
   */
  private async processNotificationQueue(): Promise<void> {
    if (this.notificationQueue.length === 0) return;

    const notifications = this.notificationQueue.splice(0, 10); // Process up to 10 at a time

    for (const notification of notifications) {
      try {
        await this.sendNotification(notification);
      } catch (error) {
        logger.error('alert-manager', 'Failed to process notification', {
          notificationId: notification.id,
          error: (error as Error).message
        });
      }
    }
  }

  /**
   * Send individual notification
   */
  private async sendNotification(notification: NotificationRecord): Promise<void> {
    notification.attempts++;
    notification.lastAttemptAt = new Date();
    notification.status = 'retrying';

    const channelName = notification.channel.name || `${notification.channel.type}_${Date.now()}`;

    try {
      // Ensure provider is initialized
      await this.ensureProviderInitialized(notification.channel);

      // Create notification message
      const message: NotificationMessage = {
        id: notification.id,
        to: this.extractRecipients(notification),
        subject: this.extractSubject(notification),
        body: this.extractBody(notification),
        priority: this.extractPriority(notification),
        templateData: this.extractTemplateData(notification)
      };

      // Send through notification manager
      const result = await this.notificationManager.sendMessage(channelName, message);
      
      if (result.success) {
        notification.status = 'sent';
        notification.response = result.response;
        
        logger.debug('alert-manager', 'Notification sent successfully', {
          notificationId: notification.id,
          channel: notification.channel.type,
          providerName: channelName
        });
      } else {
        throw new Error(result.error || 'Unknown notification error');
      }

    } catch (error) {
      notification.status = 'failed';
      notification.error = (error as Error).message;

      if (notification.attempts < notification.channel.retryAttempts) {
        // Retry later
        setTimeout(() => {
          this.notificationQueue.push(notification);
        }, notification.channel.retryDelay * 1000);
      }

      logger.error('alert-manager', 'Notification failed', {
        notificationId: notification.id,
        channel: notification.channel.type,
        providerName: channelName,
        attempts: notification.attempts,
        error: (error as Error).message
      });
    }
  }

  /**
   * Ensure notification provider is initialized
   */
  private async ensureProviderInitialized(channel: NotificationChannel): Promise<void> {
    const channelName = channel.name || `${channel.type}_${Date.now()}`;
    const existingProvider = this.notificationManager.getProvider(channelName);
    
    if (!existingProvider) {
      // Create and initialize new provider
      const provider = createNotificationProvider(channel.type, channel.config);
      await provider.initialize();
      this.notificationManager.addProvider(channelName, provider);
      
      logger.info('alert-manager', 'Notification provider initialized', {
        providerName: channelName,
        providerType: channel.type
      });
    }
  }

  /**
   * Extract recipients from notification record
   */
  private extractRecipients(notification: NotificationRecord): string[] {
    // Extract recipients from channel config based on channel type
    switch (notification.channel.type) {
      case 'email':
        const emailConfig = notification.channel.config as EmailConfig;
        return emailConfig.to || ['admin@example.com'];
      case 'sms':
        const smsConfig = notification.channel.config as SmsConfig;
        return smsConfig.phoneNumbers || ['+1234567890'];
      default:
        return ['admin@example.com'];
    }
  }

  /**
   * Extract subject from notification record
   */
  private extractSubject(notification: NotificationRecord): string {
    // Extract subject from alert data
    return 'Trading Agents Alert'; // TODO: Extract from alert context
  }

  /**
   * Extract body from notification record
   */
  private extractBody(notification: NotificationRecord): string {
    // Extract body from alert data
    return 'Alert notification body'; // TODO: Extract from alert context
  }

  /**
   * Extract priority from notification record
   */
  private extractPriority(notification: NotificationRecord): 'low' | 'medium' | 'high' | 'critical' {
    // Extract priority from alert data
    return 'medium'; // TODO: Extract from alert context
  }

  /**
   * Extract template data from notification record
   */
  private extractTemplateData(notification: NotificationRecord): Record<string, any> {
    // Extract template data from alert context
    return {}; // TODO: Extract from alert context
  }

  /**
   * Validate alert configuration
   */
  private validateAlertConfig(config: AlertConfig): void {
    if (!config.name || config.name.trim().length === 0) {
      throw new Error('Alert name is required');
    }

    if (!config.condition || !config.condition.metric) {
      throw new Error('Alert condition and metric are required');
    }

    if (config.threshold === undefined || config.threshold === null) {
      throw new Error('Alert threshold is required');
    }

    if (!config.channels || config.channels.length === 0) {
      throw new Error('At least one notification channel is required');
    }

    // Validate channels
    for (const channel of config.channels) {
      this.validateNotificationChannel(channel);
    }
  }

  /**
   * Validate notification channel
   */
  private validateNotificationChannel(channel: NotificationChannel): void {
    if (!channel.type) {
      throw new Error('Notification channel type is required');
    }

    // Channel name is optional - will be auto-generated if not provided

    if (!channel.config) {
      throw new Error('Notification channel config is required');
    }

    // Basic validation - specific validation is handled by the providers themselves
    // The config validation is done by individual providers during initialization
  }

  /**
   * Check if alert configuration is in cooldown
   */
  private isInCooldown(configId: string): boolean {
    const config = this.alertConfigs.get(configId);
    if (!config) return false;

    const now = new Date();
    const cooldownMs = config.cooldownPeriod * 60 * 1000;

    // Find most recent alert for this configuration
    const recentAlert = Array.from(this.activeAlerts.values())
      .filter(alert => alert.configId === configId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

    if (!recentAlert) return false;

    return (now.getTime() - recentAlert.timestamp.getTime()) < cooldownMs;
  }

  /**
   * Evaluate alert condition against metrics
   */
  private async evaluateCondition(condition: AlertCondition, metrics: SystemMetrics): Promise<{
    triggered: boolean;
    actualValue: number | string;
  }> {
    let actualValue: number | string = 0;

    // Extract metric value from system metrics
    if (condition.metric.startsWith('performance.')) {
      const parts = condition.metric.split('.');
      if (parts.length >= 3) {
        const strategyId = parts[1];
        const metricName = parts[2];
        if (strategyId && metricName && metrics.performance[strategyId]) {
          const strategyMetrics = metrics.performance[strategyId];
          if (strategyMetrics && metricName in strategyMetrics) {
            actualValue = (strategyMetrics as any)[metricName];
          }
        }
      }
    } else if (condition.metric.startsWith('system.')) {
      const metricName = condition.metric.replace('system.', '');
      if (metricName && metrics.system && metricName in metrics.system) {
        actualValue = (metrics.system as any)[metricName];
      }
    } else if (condition.metric.startsWith('market.')) {
      const metricName = condition.metric.replace('market.', '');
      if (metrics.market && metricName && metricName in metrics.market) {
        actualValue = (metrics.market as any)[metricName] || 0;
      }
    }

    // Evaluate condition
    let triggered = false;
    const numericValue = typeof actualValue === 'number' ? actualValue : 0;

    const thresholdValue = Array.isArray(condition.value) ? condition.value[0] : condition.value;
    
    if (thresholdValue !== undefined) {
      switch (condition.operator) {
        case 'gt':
          triggered = numericValue > thresholdValue;
          break;
        case 'lt':
          triggered = numericValue < thresholdValue;
          break;
        case 'gte':
          triggered = numericValue >= thresholdValue;
          break;
        case 'lte':
          triggered = numericValue <= thresholdValue;
          break;
        case 'eq':
          triggered = numericValue === thresholdValue;
          break;
        case 'between':
          if (Array.isArray(condition.value) && condition.value.length === 2 && 
              condition.value[0] !== undefined && condition.value[1] !== undefined) {
            triggered = numericValue >= condition.value[0] && numericValue <= condition.value[1];
          }
          break;
      }
    }

    return { triggered, actualValue };
  }

  /**
   * Create a triggered alert
   */
  private async createTriggeredAlert(config: AlertConfig, actualValue: number | string, metrics: SystemMetrics): Promise<TriggeredAlert> {
    const alertId = `triggered_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: TriggeredAlert = {
      id: alertId,
      configId: config.id,
      name: config.name,
      description: config.description,
      severity: config.severity,
      condition: config.condition,
      actualValue,
      threshold: config.threshold,
      timestamp: new Date(),
      status: 'active',
      escalationLevel: 0,
      notificationsSent: [],
      metadata: {
        systemMetrics: metrics
      }
    };

    // Store in database
    await this.dbManager.storeStructuredData({
      table: 'triggered_alerts',
      data: {
        id: alert.id,
        config_id: alert.configId,
        strategy_id: alert.strategyId,
        name: alert.name,
        description: alert.description,
        severity: alert.severity,
        condition: alert.condition,
        actual_value: alert.actualValue,
        threshold: alert.threshold,
        timestamp: alert.timestamp,
        status: alert.status,
        escalation_level: alert.escalationLevel,
        notifications_sent: alert.notificationsSent,
        metadata: alert.metadata
      }
    });

    // Add to active alerts
    this.activeAlerts.set(alertId, alert);

    // Send notifications
    await this.sendAlert(alert, config.channels);

    logger.info('alert-manager', 'Alert triggered', {
      alertId,
      configId: config.id,
      severity: config.severity,
      actualValue
    });

    return alert;
  }

  /**
   * Update triggered alert in database
   */
  private async updateTriggeredAlert(alert: TriggeredAlert): Promise<void> {
    await this.dbManager.storeStructuredData({
      table: 'triggered_alerts',
      data: {
        id: alert.id,
        config_id: alert.configId,
        strategy_id: alert.strategyId,
        name: alert.name,
        description: alert.description,
        severity: alert.severity,
        condition: alert.condition,
        actual_value: alert.actualValue,
        threshold: alert.threshold,
        timestamp: alert.timestamp,
        status: alert.status,
        acknowledged_by: alert.acknowledgedBy,
        acknowledged_at: alert.acknowledgedAt,
        resolved_at: alert.resolvedAt,
        escalation_level: alert.escalationLevel,
        notifications_sent: alert.notificationsSent,
        metadata: alert.metadata
      },
      upsert: true
    });
  }

  /**
   * Ensure the manager is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('AlertManager not initialized. Call initialize() first.');
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }

    // Cleanup notification manager
    await this.notificationManager.cleanup();

    logger.info('alert-manager', 'Alert manager cleanup completed');
  }
}

/**
 * Create alert manager instance
 */
export function createAlertManager(dbManager: DatabaseManager): AlertManager {
  return new AlertManager(dbManager);
}