/**
 * Monitoring Configuration Integration
 * 
 * Integrates monitoring system configuration with existing Docker and environment setup.
 * Ensures compatibility with current configuration management and environment variables.
 */

import { createLogger } from '../utils/enhanced-logger.js';
import { getDefaultDatabaseConfig } from '../database/database-manager.js';
import { MonitoringConfig } from './integrated-monitoring-system.js';

const logger = createLogger('system', 'monitoring-config');

export interface EnvironmentMonitoringConfig {
  // Database configuration from environment
  POSTGRES_HOST?: string;
  POSTGRES_PORT?: string;
  POSTGRES_DB?: string;
  POSTGRES_USER?: string;
  POSTGRES_PASSWORD?: string;
  POSTGRES_SSL?: string;
  POSTGRES_POOL_SIZE?: string;
  
  // Monitoring-specific environment variables
  MONITORING_ENABLED?: string;
  MONITORING_PERFORMANCE_ENABLED?: string;
  MONITORING_PERFORMANCE_INTERVAL?: string;
  MONITORING_ALERTS_ENABLED?: string;
  MONITORING_ANOMALY_DETECTION_ENABLED?: string;
  MONITORING_HEALTH_CHECK_INTERVAL?: string;
  
  // Alert configuration
  MONITORING_ALERT_COOLDOWN?: string;
  MONITORING_MAX_ALERTS_PER_HOUR?: string;
  MONITORING_SHARPE_THRESHOLD?: string;
  MONITORING_DRAWDOWN_THRESHOLD?: string;
  MONITORING_VOLATILITY_THRESHOLD?: string;
  
  // Anomaly detection configuration
  MONITORING_ZSCORE_THRESHOLD?: string;
  MONITORING_PERCENTILE_THRESHOLD?: string;
  MONITORING_ROLLING_WINDOW_SIZE?: string;
  
  // Storage configuration
  MONITORING_STORAGE_PERFORMANCE?: string;
  MONITORING_STORAGE_HEALTH?: string;
  MONITORING_STORAGE_ALERTS?: string;
  MONITORING_STORAGE_GRAPH?: string;
  
  // Logging configuration
  MONITORING_LOG_LEVEL?: string;
  MONITORING_STRUCTURED_LOGGING?: string;
  MONITORING_PERFORMANCE_LOGS?: string;
  MONITORING_HEALTH_LOGS?: string;
  
  // Zep Graphiti configuration
  ZEP_GRAPHITI_URL?: string;
  ZEP_GRAPHITI_API_KEY?: string;
  
  // Redis configuration for caching
  REDIS_HOST?: string;
  REDIS_PORT?: string;
  REDIS_PASSWORD?: string;
  REDIS_DB?: string;
}

/**
 * Load monitoring configuration from environment variables
 */
export function loadMonitoringConfigFromEnvironment(env: EnvironmentMonitoringConfig = process.env): MonitoringConfig {
  logger.info('monitoring-config', 'Loading monitoring configuration from environment');

  // Database configuration
  const databaseConfig = getDefaultDatabaseConfig();
  
  // Override with environment-specific values
  if (env.POSTGRES_HOST) databaseConfig.postgresql.host = env.POSTGRES_HOST;
  if (env.POSTGRES_PORT) databaseConfig.postgresql.port = parseInt(env.POSTGRES_PORT);
  if (env.POSTGRES_DB) databaseConfig.postgresql.database = env.POSTGRES_DB;
  if (env.POSTGRES_USER) databaseConfig.postgresql.username = env.POSTGRES_USER;
  if (env.POSTGRES_PASSWORD) databaseConfig.postgresql.password = env.POSTGRES_PASSWORD;
  if (env.POSTGRES_SSL) databaseConfig.postgresql.ssl = env.POSTGRES_SSL === 'true';
  if (env.POSTGRES_POOL_SIZE) databaseConfig.postgresql.poolSize = parseInt(env.POSTGRES_POOL_SIZE);

  const config: MonitoringConfig = {
    database: {
      enabled: env.MONITORING_ENABLED !== 'false', // Default to enabled
      config: databaseConfig
    },
    
    performance: {
      enabled: env.MONITORING_PERFORMANCE_ENABLED !== 'false', // Default to enabled
      trackingInterval: parseInt(env.MONITORING_PERFORMANCE_INTERVAL || '30000'), // 30 seconds
      rollingWindowSizes: [30, 90, 365], // days
      alertThresholds: {
        sharpeRatio: parseFloat(env.MONITORING_SHARPE_THRESHOLD || '0.5'),
        maxDrawdown: parseFloat(env.MONITORING_DRAWDOWN_THRESHOLD || '0.2'), // 20%
        volatility: parseFloat(env.MONITORING_VOLATILITY_THRESHOLD || '0.3') // 30%
      }
    },
    
    anomalyDetection: {
      enabled: env.MONITORING_ANOMALY_DETECTION_ENABLED !== 'false', // Default to enabled
      zScoreThreshold: parseFloat(env.MONITORING_ZSCORE_THRESHOLD || '2.0'),
      percentileThreshold: parseFloat(env.MONITORING_PERCENTILE_THRESHOLD || '95'),
      rollingWindowSize: parseInt(env.MONITORING_ROLLING_WINDOW_SIZE || '30'), // days
      enableRealTimeAlerts: true
    },
    
    alerting: {
      enabled: env.MONITORING_ALERTS_ENABLED !== 'false', // Default to enabled
      channels: loadNotificationChannelsFromEnvironment(env),
      cooldownPeriod: parseInt(env.MONITORING_ALERT_COOLDOWN || '15'), // minutes
      maxAlertsPerHour: parseInt(env.MONITORING_MAX_ALERTS_PER_HOUR || '10')
    },
    
    healthMonitoring: {
      enabled: true, // Always enabled for system health
      checkInterval: parseInt(env.MONITORING_HEALTH_CHECK_INTERVAL || '60000'), // 1 minute
      alertOnFailure: true
    },
    
    logging: {
      enableStructuredLogging: env.MONITORING_STRUCTURED_LOGGING !== 'false', // Default to enabled
      logLevel: (env.MONITORING_LOG_LEVEL as any) || 'info',
      enablePerformanceLogs: env.MONITORING_PERFORMANCE_LOGS !== 'false', // Default to enabled
      enableHealthLogs: env.MONITORING_HEALTH_LOGS !== 'false' // Default to enabled
    },
    
    storage: {
      performanceMetrics: (env.MONITORING_STORAGE_PERFORMANCE as any) || 'postgresql',
      healthData: (env.MONITORING_STORAGE_HEALTH as any) || 'postgresql',
      alertHistory: 'postgresql', // Always PostgreSQL for alerts
      graphRelationships: (env.MONITORING_STORAGE_GRAPH as any) || 'zep_graphiti'
    }
  };

  logger.info('monitoring-config', 'Monitoring configuration loaded', {
    databaseEnabled: config.database.enabled,
    performanceEnabled: config.performance.enabled,
    alertingEnabled: config.alerting.enabled,
    anomalyDetectionEnabled: config.anomalyDetection.enabled,
    logLevel: config.logging.logLevel
  });

  return config;
}

/**
 * Load notification channels from environment variables
 */
function loadNotificationChannelsFromEnvironment(env: EnvironmentMonitoringConfig): any[] {
  const channels: any[] = [];

  // Console notification (always available)
  channels.push({
    type: 'console',
    name: 'console_alerts',
    config: {
      logLevel: 'warn',
      template: 'Trading Agents Alert: {{message}}'
    },
    enabled: true,
    retryAttempts: 1,
    retryDelay: 0
  });

  // Email notifications (if configured)
  if (env.SMTP_HOST && env.SMTP_USER && env.ALERT_EMAIL_TO) {
    channels.push({
      type: 'email',
      name: 'email_alerts',
      config: {
        to: env.ALERT_EMAIL_TO.split(','),
        subject: 'Trading Agents Alert',
        template: 'alert_email'
      },
      enabled: true,
      retryAttempts: 3,
      retryDelay: 30 // seconds
    });
  }

  // Slack notifications (if configured)
  if (env.SLACK_WEBHOOK_URL) {
    channels.push({
      type: 'slack',
      name: 'slack_alerts',
      config: {
        webhookUrl: env.SLACK_WEBHOOK_URL,
        channel: env.SLACK_CHANNEL || '#trading-alerts',
        username: 'Trading Agents',
        iconEmoji: ':warning:',
        template: 'slack_alert'
      },
      enabled: true,
      retryAttempts: 3,
      retryDelay: 10 // seconds
    });
  }

  // Webhook notifications (if configured)
  if (env.WEBHOOK_URL) {
    channels.push({
      type: 'webhook',
      name: 'webhook_alerts',
      config: {
        url: env.WEBHOOK_URL,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TradingAgents/1.0'
        },
        template: 'webhook_alert',
        authentication: env.WEBHOOK_AUTH_TOKEN ? {
          type: 'bearer',
          token: env.WEBHOOK_AUTH_TOKEN
        } : undefined
      },
      enabled: true,
      retryAttempts: 3,
      retryDelay: 15 // seconds
    });
  }

  logger.info('monitoring-config', 'Notification channels loaded', {
    channelCount: channels.length,
    channelTypes: channels.map(c => c.type)
  });

  return channels;
}

/**
 * Validate monitoring configuration
 */
export function validateMonitoringConfig(config: MonitoringConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate database configuration
  if (config.database.enabled) {
    if (!config.database.config) {
      errors.push('Database configuration is required when database is enabled');
    } else {
      const dbConfig = config.database.config;
      if (!dbConfig.postgresql.host) errors.push('PostgreSQL host is required');
      if (!dbConfig.postgresql.database) errors.push('PostgreSQL database name is required');
      if (!dbConfig.postgresql.username) errors.push('PostgreSQL username is required');
      if (!dbConfig.postgresql.password) errors.push('PostgreSQL password is required');
    }
  }

  // Validate performance configuration
  if (config.performance.enabled) {
    if (config.performance.trackingInterval < 1000) {
      errors.push('Performance tracking interval must be at least 1000ms');
    }
    if (config.performance.alertThresholds.sharpeRatio < 0) {
      errors.push('Sharpe ratio threshold must be positive');
    }
    if (config.performance.alertThresholds.maxDrawdown < 0 || config.performance.alertThresholds.maxDrawdown > 1) {
      errors.push('Max drawdown threshold must be between 0 and 1');
    }
    if (config.performance.alertThresholds.volatility < 0 || config.performance.alertThresholds.volatility > 2) {
      errors.push('Volatility threshold must be between 0 and 2');
    }
  }

  // Validate anomaly detection configuration
  if (config.anomalyDetection.enabled) {
    if (config.anomalyDetection.zScoreThreshold < 1 || config.anomalyDetection.zScoreThreshold > 5) {
      errors.push('Z-score threshold must be between 1 and 5');
    }
    if (config.anomalyDetection.percentileThreshold < 90 || config.anomalyDetection.percentileThreshold > 99.9) {
      errors.push('Percentile threshold must be between 90 and 99.9');
    }
    if (config.anomalyDetection.rollingWindowSize < 7 || config.anomalyDetection.rollingWindowSize > 365) {
      errors.push('Rolling window size must be between 7 and 365 days');
    }
  }

  // Validate alerting configuration
  if (config.alerting.enabled) {
    if (config.alerting.cooldownPeriod < 1 || config.alerting.cooldownPeriod > 1440) {
      errors.push('Alert cooldown period must be between 1 and 1440 minutes');
    }
    if (config.alerting.maxAlertsPerHour < 1 || config.alerting.maxAlertsPerHour > 100) {
      errors.push('Max alerts per hour must be between 1 and 100');
    }
    if (config.alerting.channels.length === 0) {
      errors.push('At least one notification channel is required when alerting is enabled');
    }
  }

  // Validate health monitoring configuration
  if (config.healthMonitoring.enabled) {
    if (config.healthMonitoring.checkInterval < 10000 || config.healthMonitoring.checkInterval > 600000) {
      errors.push('Health check interval must be between 10 seconds and 10 minutes');
    }
  }

  // Validate logging configuration
  const validLogLevels = ['debug', 'info', 'warn', 'error'];
  if (!validLogLevels.includes(config.logging.logLevel)) {
    errors.push(`Log level must be one of: ${validLogLevels.join(', ')}`);
  }

  // Validate storage configuration
  const validStorageOptions = ['postgresql', 'both'];
  if (!validStorageOptions.includes(config.storage.performanceMetrics)) {
    errors.push(`Performance metrics storage must be one of: ${validStorageOptions.join(', ')}`);
  }
  if (!validStorageOptions.includes(config.storage.healthData)) {
    errors.push(`Health data storage must be one of: ${validStorageOptions.join(', ')}`);
  }
  if (config.storage.alertHistory !== 'postgresql') {
    errors.push('Alert history storage must be postgresql');
  }
  if (config.storage.graphRelationships !== 'zep_graphiti') {
    errors.push('Graph relationships storage must be zep_graphiti');
  }

  const valid = errors.length === 0;

  if (valid) {
    logger.info('monitoring-config', 'Monitoring configuration validation passed');
  } else {
    logger.error('monitoring-config', 'Monitoring configuration validation failed', {
      errorCount: errors.length,
      errors
    });
  }

  return { valid, errors };
}

/**
 * Create Docker-compatible environment variables for monitoring
 */
export function createDockerEnvironmentVariables(config: MonitoringConfig): Record<string, string> {
  const envVars: Record<string, string> = {};

  // Database configuration
  if (config.database.enabled && config.database.config) {
    const dbConfig = config.database.config;
    envVars.POSTGRES_HOST = dbConfig.postgresql.host;
    envVars.POSTGRES_PORT = dbConfig.postgresql.port.toString();
    envVars.POSTGRES_DB = dbConfig.postgresql.database;
    envVars.POSTGRES_USER = dbConfig.postgresql.username;
    envVars.POSTGRES_PASSWORD = dbConfig.postgresql.password;
    envVars.POSTGRES_SSL = dbConfig.postgresql.ssl.toString();
    envVars.POSTGRES_POOL_SIZE = dbConfig.postgresql.poolSize.toString();
  }

  // Monitoring configuration
  envVars.MONITORING_ENABLED = config.database.enabled.toString();
  envVars.MONITORING_PERFORMANCE_ENABLED = config.performance.enabled.toString();
  envVars.MONITORING_PERFORMANCE_INTERVAL = config.performance.trackingInterval.toString();
  envVars.MONITORING_ALERTS_ENABLED = config.alerting.enabled.toString();
  envVars.MONITORING_ANOMALY_DETECTION_ENABLED = config.anomalyDetection.enabled.toString();
  envVars.MONITORING_HEALTH_CHECK_INTERVAL = config.healthMonitoring.checkInterval.toString();

  // Alert thresholds
  envVars.MONITORING_SHARPE_THRESHOLD = config.performance.alertThresholds.sharpeRatio.toString();
  envVars.MONITORING_DRAWDOWN_THRESHOLD = config.performance.alertThresholds.maxDrawdown.toString();
  envVars.MONITORING_VOLATILITY_THRESHOLD = config.performance.alertThresholds.volatility.toString();

  // Anomaly detection
  envVars.MONITORING_ZSCORE_THRESHOLD = config.anomalyDetection.zScoreThreshold.toString();
  envVars.MONITORING_PERCENTILE_THRESHOLD = config.anomalyDetection.percentileThreshold.toString();
  envVars.MONITORING_ROLLING_WINDOW_SIZE = config.anomalyDetection.rollingWindowSize.toString();

  // Alert configuration
  envVars.MONITORING_ALERT_COOLDOWN = config.alerting.cooldownPeriod.toString();
  envVars.MONITORING_MAX_ALERTS_PER_HOUR = config.alerting.maxAlertsPerHour.toString();

  // Storage configuration
  envVars.MONITORING_STORAGE_PERFORMANCE = config.storage.performanceMetrics;
  envVars.MONITORING_STORAGE_HEALTH = config.storage.healthData;
  envVars.MONITORING_STORAGE_ALERTS = config.storage.alertHistory;
  envVars.MONITORING_STORAGE_GRAPH = config.storage.graphRelationships;

  // Logging configuration
  envVars.MONITORING_LOG_LEVEL = config.logging.logLevel;
  envVars.MONITORING_STRUCTURED_LOGGING = config.logging.enableStructuredLogging.toString();
  envVars.MONITORING_PERFORMANCE_LOGS = config.logging.enablePerformanceLogs.toString();
  envVars.MONITORING_HEALTH_LOGS = config.logging.enableHealthLogs.toString();

  logger.info('monitoring-config', 'Docker environment variables created', {
    variableCount: Object.keys(envVars).length
  });

  return envVars;
}

/**
 * Generate Docker Compose service configuration for monitoring
 */
export function generateDockerComposeMonitoringConfig(config: MonitoringConfig): any {
  const monitoringService = {
    environment: createDockerEnvironmentVariables(config),
    depends_on: [] as string[],
    volumes: [] as string[],
    networks: ['trading-agents']
  };

  // Add PostgreSQL dependency if database is enabled
  if (config.database.enabled) {
    monitoringService.depends_on.push('postgresql');
  }

  // Add Redis dependency if caching is enabled
  if (config.storage.performanceMetrics === 'both' || config.storage.healthData === 'both') {
    monitoringService.depends_on.push('redis');
  }

  // Add Zep Graphiti dependency if graph storage is enabled
  if (config.storage.graphRelationships === 'zep_graphiti') {
    monitoringService.depends_on.push('zep-graphiti');
  }

  // Add volume mounts for logs and data
  monitoringService.volumes.push('./logs:/app/logs:rw');
  monitoringService.volumes.push('./data/monitoring:/app/data/monitoring:rw');

  logger.info('monitoring-config', 'Docker Compose monitoring configuration generated', {
    dependencies: monitoringService.depends_on.length,
    volumes: monitoringService.volumes.length
  });

  return monitoringService;
}

/**
 * Create monitoring configuration for different environments
 */
export function createEnvironmentSpecificConfig(environment: 'development' | 'staging' | 'production'): Partial<MonitoringConfig> {
  const baseConfig: Partial<MonitoringConfig> = {};

  switch (environment) {
    case 'development':
      return {
        ...baseConfig,
        performance: {
          enabled: true,
          trackingInterval: 10000, // 10 seconds for faster feedback
          rollingWindowSizes: [7, 30, 90], // Shorter windows for development
          alertThresholds: {
            sharpeRatio: 0.3, // More lenient for development
            maxDrawdown: 0.3, // 30%
            volatility: 0.5 // 50%
          }
        },
        anomalyDetection: {
          enabled: true,
          zScoreThreshold: 2.5, // Slightly more lenient
          percentileThreshold: 90, // Lower threshold for more alerts
          rollingWindowSize: 14, // 2 weeks
          enableRealTimeAlerts: true
        },
        alerting: {
          enabled: true,
          channels: [], // Will be populated from environment
          cooldownPeriod: 5, // 5 minutes for development
          maxAlertsPerHour: 20 // More alerts allowed in development
        },
        logging: {
          enableStructuredLogging: true,
          logLevel: 'debug', // Verbose logging for development
          enablePerformanceLogs: true,
          enableHealthLogs: true
        }
      };

    case 'staging':
      return {
        ...baseConfig,
        performance: {
          enabled: true,
          trackingInterval: 30000, // 30 seconds
          rollingWindowSizes: [30, 90, 365],
          alertThresholds: {
            sharpeRatio: 0.4,
            maxDrawdown: 0.25, // 25%
            volatility: 0.4 // 40%
          }
        },
        anomalyDetection: {
          enabled: true,
          zScoreThreshold: 2.0,
          percentileThreshold: 95,
          rollingWindowSize: 30, // 1 month
          enableRealTimeAlerts: true
        },
        alerting: {
          enabled: true,
          channels: [], // Will be populated from environment
          cooldownPeriod: 10, // 10 minutes
          maxAlertsPerHour: 15
        },
        logging: {
          enableStructuredLogging: true,
          logLevel: 'info',
          enablePerformanceLogs: true,
          enableHealthLogs: true
        }
      };

    case 'production':
      return {
        ...baseConfig,
        performance: {
          enabled: true,
          trackingInterval: 60000, // 1 minute
          rollingWindowSizes: [30, 90, 365],
          alertThresholds: {
            sharpeRatio: 0.5,
            maxDrawdown: 0.2, // 20%
            volatility: 0.3 // 30%
          }
        },
        anomalyDetection: {
          enabled: true,
          zScoreThreshold: 2.0,
          percentileThreshold: 95,
          rollingWindowSize: 30, // 1 month
          enableRealTimeAlerts: true
        },
        alerting: {
          enabled: true,
          channels: [], // Will be populated from environment
          cooldownPeriod: 15, // 15 minutes
          maxAlertsPerHour: 10
        },
        logging: {
          enableStructuredLogging: true,
          logLevel: 'info',
          enablePerformanceLogs: false, // Reduce log volume in production
          enableHealthLogs: true
        }
      };

    default:
      return baseConfig;
  }
}

/**
 * Load configuration with environment-specific overrides
 */
export function loadEnvironmentAwareConfig(environment?: string): MonitoringConfig {
  const env = environment || process.env.NODE_ENV || 'development';
  
  // Load base configuration from environment variables
  const baseConfig = loadMonitoringConfigFromEnvironment();
  
  // Get environment-specific overrides
  const envSpecificConfig = createEnvironmentSpecificConfig(env as any);
  
  // Merge configurations (environment-specific overrides base config)
  const mergedConfig: MonitoringConfig = {
    database: { ...baseConfig.database, ...envSpecificConfig.database },
    performance: { ...baseConfig.performance, ...envSpecificConfig.performance },
    anomalyDetection: { ...baseConfig.anomalyDetection, ...envSpecificConfig.anomalyDetection },
    alerting: { ...baseConfig.alerting, ...envSpecificConfig.alerting },
    healthMonitoring: { ...baseConfig.healthMonitoring, ...envSpecificConfig.healthMonitoring },
    logging: { ...baseConfig.logging, ...envSpecificConfig.logging },
    storage: { ...baseConfig.storage, ...envSpecificConfig.storage }
  };

  logger.info('monitoring-config', 'Environment-aware configuration loaded', {
    environment: env,
    databaseEnabled: mergedConfig.database.enabled,
    logLevel: mergedConfig.logging.logLevel
  });

  return mergedConfig;
}