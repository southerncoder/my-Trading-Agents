/**
 * Production Alerting Configuration Templates
 * 
 * Pre-configured alert templates for production monitoring including:
 * - System health alerts
 * - Performance degradation alerts
 * - Trading strategy alerts
 * - Infrastructure alerts
 * - Security alerts
 */

import { createLogger } from '../utils/enhanced-logger.js';

const logger = createLogger('system', 'production-alerting');

export interface AlertTemplate {
  id: string;
  name: string;
  description: string;
  category: 'system' | 'performance' | 'trading' | 'infrastructure' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  condition: AlertCondition;
  threshold: number;
  timeframe: number; // minutes
  cooldownPeriod: number; // minutes
  escalationRules: EscalationRule[];
  notificationChannels: NotificationChannel[];
  enabled: boolean;
  tags: string[];
}

export interface AlertCondition {
  type: 'threshold' | 'anomaly' | 'pattern' | 'composite';
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'ne' | 'gte' | 'lte';
  value?: any;
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
  window?: number; // minutes
  conditions?: AlertCondition[]; // for composite conditions
  logic?: 'and' | 'or'; // for composite conditions
}

export interface EscalationRule {
  level: number;
  delay: number; // minutes
  channels: NotificationChannel[];
  condition?: 'unacknowledged' | 'unresolved' | 'recurring';
}

export interface NotificationChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'console' | 'pagerduty';
  name: string;
  config: Record<string, any>;
  enabled: boolean;
  retryAttempts: number;
  retryDelay: number; // seconds
}

/**
 * Production Alert Templates
 */
export const PRODUCTION_ALERT_TEMPLATES: AlertTemplate[] = [
  // ==================== SYSTEM HEALTH ALERTS ====================
  {
    id: 'system-health-critical',
    name: 'System Health Critical',
    description: 'Alert when overall system health becomes critical',
    category: 'system',
    severity: 'critical',
    condition: {
      type: 'threshold',
      metric: 'system.health',
      operator: 'eq',
      value: 'unhealthy'
    },
    threshold: 1,
    timeframe: 1,
    cooldownPeriod: 5,
    escalationRules: [
      {
        level: 1,
        delay: 0,
        channels: [
          {
            type: 'console',
            name: 'immediate_console',
            config: { logLevel: 'error' },
            enabled: true,
            retryAttempts: 1,
            retryDelay: 0
          }
        ]
      },
      {
        level: 2,
        delay: 5,
        channels: [
          {
            type: 'email',
            name: 'critical_email',
            config: {
              to: ['admin@company.com', 'oncall@company.com'],
              subject: '[CRITICAL] Trading System Health Alert',
              template: 'critical_system_alert'
            },
            enabled: true,
            retryAttempts: 3,
            retryDelay: 30
          }
        ],
        condition: 'unacknowledged'
      },
      {
        level: 3,
        delay: 15,
        channels: [
          {
            type: 'pagerduty',
            name: 'pagerduty_escalation',
            config: {
              integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY,
              severity: 'critical',
              component: 'trading-system'
            },
            enabled: true,
            retryAttempts: 5,
            retryDelay: 60
          }
        ],
        condition: 'unacknowledged'
      }
    ],
    notificationChannels: [],
    enabled: true,
    tags: ['system', 'health', 'critical']
  },

  {
    id: 'database-connection-lost',
    name: 'Database Connection Lost',
    description: 'Alert when database connection is lost',
    category: 'infrastructure',
    severity: 'critical',
    condition: {
      type: 'threshold',
      metric: 'database.connectionHealth',
      operator: 'eq',
      value: false
    },
    threshold: 1,
    timeframe: 1,
    cooldownPeriod: 10,
    escalationRules: [
      {
        level: 1,
        delay: 0,
        channels: [
          {
            type: 'console',
            name: 'db_console_alert',
            config: { logLevel: 'error' },
            enabled: true,
            retryAttempts: 1,
            retryDelay: 0
          },
          {
            type: 'slack',
            name: 'db_slack_alert',
            config: {
              webhookUrl: process.env.SLACK_WEBHOOK_URL,
              channel: '#trading-alerts',
              username: 'Trading System',
              iconEmoji: ':warning:',
              template: 'database_alert'
            },
            enabled: true,
            retryAttempts: 3,
            retryDelay: 10
          }
        ]
      }
    ],
    notificationChannels: [],
    enabled: true,
    tags: ['database', 'infrastructure', 'critical']
  },

  {
    id: 'high-memory-usage',
    name: 'High Memory Usage',
    description: 'Alert when memory usage exceeds threshold',
    category: 'system',
    severity: 'high',
    condition: {
      type: 'threshold',
      metric: 'system.memoryUsage.percentage',
      operator: 'gt',
      value: 85,
      aggregation: 'avg',
      window: 5
    },
    threshold: 85,
    timeframe: 5,
    cooldownPeriod: 15,
    escalationRules: [
      {
        level: 1,
        delay: 0,
        channels: [
          {
            type: 'console',
            name: 'memory_console',
            config: { logLevel: 'warn' },
            enabled: true,
            retryAttempts: 1,
            retryDelay: 0
          }
        ]
      },
      {
        level: 2,
        delay: 10,
        channels: [
          {
            type: 'email',
            name: 'memory_email',
            config: {
              to: ['devops@company.com'],
              subject: '[HIGH] Memory Usage Alert',
              template: 'memory_usage_alert'
            },
            enabled: true,
            retryAttempts: 2,
            retryDelay: 30
          }
        ],
        condition: 'unresolved'
      }
    ],
    notificationChannels: [],
    enabled: true,
    tags: ['memory', 'system', 'performance']
  },

  // ==================== PERFORMANCE ALERTS ====================
  {
    id: 'low-sharpe-ratio',
    name: 'Low Sharpe Ratio Alert',
    description: 'Alert when strategy Sharpe ratio falls below threshold',
    category: 'performance',
    severity: 'medium',
    condition: {
      type: 'threshold',
      metric: 'performance.sharpeRatio',
      operator: 'lt',
      value: 0.5,
      aggregation: 'avg',
      window: 60
    },
    threshold: 0.5,
    timeframe: 60,
    cooldownPeriod: 30,
    escalationRules: [
      {
        level: 1,
        delay: 0,
        channels: [
          {
            type: 'console',
            name: 'sharpe_console',
            config: { logLevel: 'warn' },
            enabled: true,
            retryAttempts: 1,
            retryDelay: 0
          },
          {
            type: 'slack',
            name: 'performance_slack',
            config: {
              webhookUrl: process.env.SLACK_WEBHOOK_URL,
              channel: '#trading-performance',
              username: 'Trading System',
              iconEmoji: ':chart_with_downwards_trend:',
              template: 'performance_alert'
            },
            enabled: true,
            retryAttempts: 2,
            retryDelay: 15
          }
        ]
      }
    ],
    notificationChannels: [],
    enabled: true,
    tags: ['performance', 'sharpe-ratio', 'trading']
  },

  {
    id: 'high-drawdown',
    name: 'High Drawdown Alert',
    description: 'Alert when maximum drawdown exceeds threshold',
    category: 'performance',
    severity: 'high',
    condition: {
      type: 'threshold',
      metric: 'performance.maxDrawdown',
      operator: 'gt',
      value: 0.2,
      aggregation: 'max',
      window: 30
    },
    threshold: 0.2,
    timeframe: 30,
    cooldownPeriod: 60,
    escalationRules: [
      {
        level: 1,
        delay: 0,
        channels: [
          {
            type: 'console',
            name: 'drawdown_console',
            config: { logLevel: 'error' },
            enabled: true,
            retryAttempts: 1,
            retryDelay: 0
          },
          {
            type: 'email',
            name: 'drawdown_email',
            config: {
              to: ['risk@company.com', 'portfolio@company.com'],
              subject: '[HIGH] Drawdown Alert',
              template: 'drawdown_alert'
            },
            enabled: true,
            retryAttempts: 3,
            retryDelay: 30
          }
        ]
      }
    ],
    notificationChannels: [],
    enabled: true,
    tags: ['performance', 'drawdown', 'risk']
  },

  {
    id: 'strategy-performance-degradation',
    name: 'Strategy Performance Degradation',
    description: 'Alert when strategy performance degrades significantly',
    category: 'performance',
    severity: 'medium',
    condition: {
      type: 'composite',
      logic: 'and',
      conditions: [
        {
          type: 'threshold',
          metric: 'performance.totalReturn',
          operator: 'lt',
          value: -0.05,
          aggregation: 'avg',
          window: 24 * 60 // 24 hours
        },
        {
          type: 'threshold',
          metric: 'performance.winRate',
          operator: 'lt',
          value: 0.4,
          aggregation: 'avg',
          window: 24 * 60
        }
      ]
    },
    threshold: 1,
    timeframe: 60,
    cooldownPeriod: 120,
    escalationRules: [
      {
        level: 1,
        delay: 0,
        channels: [
          {
            type: 'slack',
            name: 'strategy_degradation_slack',
            config: {
              webhookUrl: process.env.SLACK_WEBHOOK_URL,
              channel: '#trading-strategies',
              username: 'Trading System',
              iconEmoji: ':warning:',
              template: 'strategy_degradation_alert'
            },
            enabled: true,
            retryAttempts: 2,
            retryDelay: 15
          }
        ]
      }
    ],
    notificationChannels: [],
    enabled: true,
    tags: ['performance', 'strategy', 'degradation']
  },

  // ==================== TRADING ALERTS ====================
  {
    id: 'large-position-size',
    name: 'Large Position Size Alert',
    description: 'Alert when position size exceeds risk limits',
    category: 'trading',
    severity: 'high',
    condition: {
      type: 'threshold',
      metric: 'trading.positionSize.percentage',
      operator: 'gt',
      value: 10 // 10% of portfolio
    },
    threshold: 10,
    timeframe: 1,
    cooldownPeriod: 30,
    escalationRules: [
      {
        level: 1,
        delay: 0,
        channels: [
          {
            type: 'console',
            name: 'position_console',
            config: { logLevel: 'warn' },
            enabled: true,
            retryAttempts: 1,
            retryDelay: 0
          },
          {
            type: 'email',
            name: 'position_email',
            config: {
              to: ['risk@company.com'],
              subject: '[HIGH] Large Position Size Alert',
              template: 'position_size_alert'
            },
            enabled: true,
            retryAttempts: 2,
            retryDelay: 30
          }
        ]
      }
    ],
    notificationChannels: [],
    enabled: true,
    tags: ['trading', 'position-size', 'risk']
  },

  {
    id: 'consecutive-losses',
    name: 'Consecutive Losses Alert',
    description: 'Alert when strategy has consecutive losing trades',
    category: 'trading',
    severity: 'medium',
    condition: {
      type: 'pattern',
      metric: 'trading.consecutiveLosses',
      operator: 'gte',
      value: 5
    },
    threshold: 5,
    timeframe: 60,
    cooldownPeriod: 120,
    escalationRules: [
      {
        level: 1,
        delay: 0,
        channels: [
          {
            type: 'slack',
            name: 'losses_slack',
            config: {
              webhookUrl: process.env.SLACK_WEBHOOK_URL,
              channel: '#trading-alerts',
              username: 'Trading System',
              iconEmoji: ':red_circle:',
              template: 'consecutive_losses_alert'
            },
            enabled: true,
            retryAttempts: 2,
            retryDelay: 15
          }
        ]
      }
    ],
    notificationChannels: [],
    enabled: true,
    tags: ['trading', 'losses', 'pattern']
  },

  // ==================== INFRASTRUCTURE ALERTS ====================
  {
    id: 'api-rate-limit-exceeded',
    name: 'API Rate Limit Exceeded',
    description: 'Alert when external API rate limits are exceeded',
    category: 'infrastructure',
    severity: 'medium',
    condition: {
      type: 'threshold',
      metric: 'api.rateLimitExceeded',
      operator: 'gt',
      value: 0,
      aggregation: 'sum',
      window: 5
    },
    threshold: 1,
    timeframe: 5,
    cooldownPeriod: 15,
    escalationRules: [
      {
        level: 1,
        delay: 0,
        channels: [
          {
            type: 'console',
            name: 'rate_limit_console',
            config: { logLevel: 'warn' },
            enabled: true,
            retryAttempts: 1,
            retryDelay: 0
          }
        ]
      }
    ],
    notificationChannels: [],
    enabled: true,
    tags: ['infrastructure', 'api', 'rate-limit']
  },

  {
    id: 'service-response-time-high',
    name: 'Service Response Time High',
    description: 'Alert when service response time exceeds threshold',
    category: 'infrastructure',
    severity: 'medium',
    condition: {
      type: 'threshold',
      metric: 'service.responseTime',
      operator: 'gt',
      value: 5000, // 5 seconds
      aggregation: 'avg',
      window: 10
    },
    threshold: 5000,
    timeframe: 10,
    cooldownPeriod: 20,
    escalationRules: [
      {
        level: 1,
        delay: 0,
        channels: [
          {
            type: 'console',
            name: 'response_time_console',
            config: { logLevel: 'warn' },
            enabled: true,
            retryAttempts: 1,
            retryDelay: 0
          }
        ]
      }
    ],
    notificationChannels: [],
    enabled: true,
    tags: ['infrastructure', 'performance', 'response-time']
  },

  // ==================== SECURITY ALERTS ====================
  {
    id: 'authentication-failures',
    name: 'Authentication Failures',
    description: 'Alert on multiple authentication failures',
    category: 'security',
    severity: 'high',
    condition: {
      type: 'threshold',
      metric: 'security.authFailures',
      operator: 'gt',
      value: 5,
      aggregation: 'sum',
      window: 15
    },
    threshold: 5,
    timeframe: 15,
    cooldownPeriod: 30,
    escalationRules: [
      {
        level: 1,
        delay: 0,
        channels: [
          {
            type: 'console',
            name: 'auth_failures_console',
            config: { logLevel: 'error' },
            enabled: true,
            retryAttempts: 1,
            retryDelay: 0
          },
          {
            type: 'email',
            name: 'security_email',
            config: {
              to: ['security@company.com'],
              subject: '[SECURITY] Authentication Failures Alert',
              template: 'security_alert'
            },
            enabled: true,
            retryAttempts: 3,
            retryDelay: 30
          }
        ]
      }
    ],
    notificationChannels: [],
    enabled: true,
    tags: ['security', 'authentication', 'failures']
  },

  {
    id: 'unusual-api-activity',
    name: 'Unusual API Activity',
    description: 'Alert on unusual API usage patterns',
    category: 'security',
    severity: 'medium',
    condition: {
      type: 'anomaly',
      metric: 'api.requestRate',
      operator: 'gt',
      value: 2.0, // 2 standard deviations
      window: 30
    },
    threshold: 2.0,
    timeframe: 30,
    cooldownPeriod: 60,
    escalationRules: [
      {
        level: 1,
        delay: 0,
        channels: [
          {
            type: 'console',
            name: 'api_activity_console',
            config: { logLevel: 'warn' },
            enabled: true,
            retryAttempts: 1,
            retryDelay: 0
          }
        ]
      }
    ],
    notificationChannels: [],
    enabled: true,
    tags: ['security', 'api', 'anomaly']
  }
];

/**
 * Government Data Service Alert Templates
 */
export const GOVERNMENT_DATA_ALERT_TEMPLATES: AlertTemplate[] = [
  {
    id: 'sec-api-rate-limit',
    name: 'SEC API Rate Limit Alert',
    description: 'Alert when SEC API rate limit is approached or exceeded',
    category: 'infrastructure',
    severity: 'medium',
    condition: {
      type: 'threshold',
      metric: 'government.sec.requestsPerSecond',
      operator: 'gt',
      value: 8 // SEC allows 10 requests/second, alert at 8
    },
    threshold: 8,
    timeframe: 1,
    cooldownPeriod: 5,
    escalationRules: [
      {
        level: 1,
        delay: 0,
        channels: [
          {
            type: 'console',
            name: 'sec_rate_limit_console',
            config: { logLevel: 'warn' },
            enabled: true,
            retryAttempts: 1,
            retryDelay: 0
          }
        ]
      }
    ],
    notificationChannels: [],
    enabled: true,
    tags: ['government-data', 'sec', 'rate-limit']
  },

  {
    id: 'fred-api-failure',
    name: 'FRED API Service Failure',
    description: 'Alert when FRED API service becomes unavailable',
    category: 'infrastructure',
    severity: 'high',
    condition: {
      type: 'threshold',
      metric: 'government.fred.errorRate',
      operator: 'gt',
      value: 0.5, // 50% error rate
      aggregation: 'avg',
      window: 10
    },
    threshold: 0.5,
    timeframe: 10,
    cooldownPeriod: 15,
    escalationRules: [
      {
        level: 1,
        delay: 0,
        channels: [
          {
            type: 'console',
            name: 'fred_failure_console',
            config: { logLevel: 'error' },
            enabled: true,
            retryAttempts: 1,
            retryDelay: 0
          },
          {
            type: 'slack',
            name: 'fred_failure_slack',
            config: {
              webhookUrl: process.env.SLACK_WEBHOOK_URL,
              channel: '#data-alerts',
              username: 'Trading System',
              iconEmoji: ':warning:',
              template: 'government_data_alert'
            },
            enabled: true,
            retryAttempts: 2,
            retryDelay: 15
          }
        ]
      }
    ],
    notificationChannels: [],
    enabled: true,
    tags: ['government-data', 'fred', 'api-failure']
  },

  {
    id: 'government-data-stale',
    name: 'Government Data Stale',
    description: 'Alert when government data becomes stale',
    category: 'infrastructure',
    severity: 'medium',
    condition: {
      type: 'threshold',
      metric: 'government.data.staleness',
      operator: 'gt',
      value: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
      aggregation: 'max',
      window: 60
    },
    threshold: 24 * 60 * 60 * 1000,
    timeframe: 60,
    cooldownPeriod: 120,
    escalationRules: [
      {
        level: 1,
        delay: 0,
        channels: [
          {
            type: 'console',
            name: 'data_stale_console',
            config: { logLevel: 'warn' },
            enabled: true,
            retryAttempts: 1,
            retryDelay: 0
          }
        ]
      }
    ],
    notificationChannels: [],
    enabled: true,
    tags: ['government-data', 'staleness', 'data-quality']
  }
];

/**
 * Alert Template Manager
 */
export class AlertTemplateManager {
  private templates: Map<string, AlertTemplate> = new Map();

  constructor() {
    this.loadDefaultTemplates();
    logger.info('production-alerting', 'Alert template manager initialized', {
      templateCount: this.templates.size
    });
  }

  /**
   * Load default alert templates
   */
  private loadDefaultTemplates(): void {
    const allTemplates = [...PRODUCTION_ALERT_TEMPLATES, ...GOVERNMENT_DATA_ALERT_TEMPLATES];
    
    for (const template of allTemplates) {
      this.templates.set(template.id, template);
    }
  }

  /**
   * Get alert template by ID
   */
  getTemplate(id: string): AlertTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Get all alert templates
   */
  getAllTemplates(): AlertTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string): AlertTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.category === category);
  }

  /**
   * Get templates by severity
   */
  getTemplatesBySeverity(severity: string): AlertTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.severity === severity);
  }

  /**
   * Get enabled templates
   */
  getEnabledTemplates(): AlertTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.enabled);
  }

  /**
   * Add custom alert template
   */
  addTemplate(template: AlertTemplate): void {
    this.templates.set(template.id, template);
    logger.info('production-alerting', 'Alert template added', {
      templateId: template.id,
      templateName: template.name
    });
  }

  /**
   * Update alert template
   */
  updateTemplate(id: string, updates: Partial<AlertTemplate>): boolean {
    const template = this.templates.get(id);
    if (!template) {
      return false;
    }

    const updatedTemplate = { ...template, ...updates };
    this.templates.set(id, updatedTemplate);
    
    logger.info('production-alerting', 'Alert template updated', {
      templateId: id,
      updates: Object.keys(updates)
    });

    return true;
  }

  /**
   * Remove alert template
   */
  removeTemplate(id: string): boolean {
    const removed = this.templates.delete(id);
    if (removed) {
      logger.info('production-alerting', 'Alert template removed', { templateId: id });
    }
    return removed;
  }

  /**
   * Enable/disable alert template
   */
  setTemplateEnabled(id: string, enabled: boolean): boolean {
    return this.updateTemplate(id, { enabled });
  }

  /**
   * Validate alert template
   */
  validateTemplate(template: AlertTemplate): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation
    if (!template.id) errors.push('Template ID is required');
    if (!template.name) errors.push('Template name is required');
    if (!template.condition) errors.push('Alert condition is required');
    if (template.threshold === undefined) errors.push('Threshold is required');
    if (!template.timeframe || template.timeframe <= 0) errors.push('Timeframe must be positive');
    if (!template.cooldownPeriod || template.cooldownPeriod < 0) errors.push('Cooldown period must be non-negative');

    // Severity validation
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(template.severity)) {
      errors.push(`Severity must be one of: ${validSeverities.join(', ')}`);
    }

    // Category validation
    const validCategories = ['system', 'performance', 'trading', 'infrastructure', 'security'];
    if (!validCategories.includes(template.category)) {
      errors.push(`Category must be one of: ${validCategories.join(', ')}`);
    }

    // Condition validation
    if (template.condition) {
      const conditionErrors = this.validateCondition(template.condition);
      errors.push(...conditionErrors);
    }

    // Escalation rules validation
    if (template.escalationRules) {
      for (const rule of template.escalationRules) {
        if (rule.level < 1) errors.push('Escalation level must be at least 1');
        if (rule.delay < 0) errors.push('Escalation delay must be non-negative');
        if (!rule.channels || rule.channels.length === 0) {
          errors.push('Escalation rule must have at least one notification channel');
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate alert condition
   */
  private validateCondition(condition: AlertCondition): string[] {
    const errors: string[] = [];

    const validTypes = ['threshold', 'anomaly', 'pattern', 'composite'];
    if (!validTypes.includes(condition.type)) {
      errors.push(`Condition type must be one of: ${validTypes.join(', ')}`);
    }

    if (!condition.metric) {
      errors.push('Condition metric is required');
    }

    const validOperators = ['gt', 'lt', 'eq', 'ne', 'gte', 'lte'];
    if (!validOperators.includes(condition.operator)) {
      errors.push(`Condition operator must be one of: ${validOperators.join(', ')}`);
    }

    if (condition.type === 'composite') {
      if (!condition.conditions || condition.conditions.length === 0) {
        errors.push('Composite condition must have sub-conditions');
      }
      if (!condition.logic || !['and', 'or'].includes(condition.logic)) {
        errors.push('Composite condition logic must be "and" or "or"');
      }
      
      // Recursively validate sub-conditions
      if (condition.conditions) {
        for (const subCondition of condition.conditions) {
          const subErrors = this.validateCondition(subCondition);
          errors.push(...subErrors);
        }
      }
    }

    return errors;
  }

  /**
   * Export templates to JSON
   */
  exportTemplates(): string {
    const templates = Array.from(this.templates.values());
    return JSON.stringify(templates, null, 2);
  }

  /**
   * Import templates from JSON
   */
  importTemplates(json: string): { imported: number; errors: string[] } {
    try {
      const templates: AlertTemplate[] = JSON.parse(json);
      let imported = 0;
      const errors: string[] = [];

      for (const template of templates) {
        const validation = this.validateTemplate(template);
        if (validation.valid) {
          this.addTemplate(template);
          imported++;
        } else {
          errors.push(`Template ${template.id}: ${validation.errors.join(', ')}`);
        }
      }

      logger.info('production-alerting', 'Templates imported', {
        imported,
        errorCount: errors.length
      });

      return { imported, errors };

    } catch (error) {
      logger.error('production-alerting', 'Failed to import templates', {
        error: (error as Error).message
      });
      return { imported: 0, errors: [(error as Error).message] };
    }
  }

  /**
   * Create template from environment variables
   */
  createTemplateFromEnvironment(prefix: string): AlertTemplate | null {
    const env = process.env;
    const id = env[`${prefix}_ID`];
    const name = env[`${prefix}_NAME`];
    
    if (!id || !name) {
      return null;
    }

    const template: AlertTemplate = {
      id,
      name,
      description: env[`${prefix}_DESCRIPTION`] || '',
      category: (env[`${prefix}_CATEGORY`] as any) || 'system',
      severity: (env[`${prefix}_SEVERITY`] as any) || 'medium',
      condition: {
        type: 'threshold',
        metric: env[`${prefix}_METRIC`] || 'system.health',
        operator: (env[`${prefix}_OPERATOR`] as any) || 'gt',
        value: env[`${prefix}_VALUE`] ? parseFloat(env[`${prefix}_VALUE`]) : 1
      },
      threshold: env[`${prefix}_THRESHOLD`] ? parseFloat(env[`${prefix}_THRESHOLD`]) : 1,
      timeframe: env[`${prefix}_TIMEFRAME`] ? parseInt(env[`${prefix}_TIMEFRAME`]) : 5,
      cooldownPeriod: env[`${prefix}_COOLDOWN`] ? parseInt(env[`${prefix}_COOLDOWN`]) : 15,
      escalationRules: [],
      notificationChannels: [],
      enabled: env[`${prefix}_ENABLED`] !== 'false',
      tags: env[`${prefix}_TAGS`] ? env[`${prefix}_TAGS`].split(',') : []
    };

    return template;
  }
}

/**
 * Create alert template manager
 */
export function createAlertTemplateManager(): AlertTemplateManager {
  return new AlertTemplateManager();
}