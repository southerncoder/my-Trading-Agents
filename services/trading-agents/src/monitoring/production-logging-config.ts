/**
 * Production Logging Configuration
 * 
 * Optimized logging configuration for production deployment with:
 * - Structured JSON logging for log aggregation systems
 * - Performance-optimized log levels and filtering
 * - Security-conscious log sanitization
 * - Integration with monitoring and alerting systems
 */

import winston from 'winston';
import { createLogger } from '../utils/enhanced-logger.js';

const logger = createLogger('system', 'production-logging');

export interface ProductionLoggingConfig {
  // Core logging settings
  level: 'error' | 'warn' | 'info' | 'debug';
  format: 'json' | 'structured';
  enableConsole: boolean;
  enableFile: boolean;
  enableSyslog: boolean;
  enableCloudLogging: boolean;
  
  // File logging settings
  fileConfig: {
    directory: string;
    filename: string;
    maxSize: string;
    maxFiles: number;
    compress: boolean;
    datePattern: string;
  };
  
  // Syslog settings (for centralized logging)
  syslogConfig: {
    host: string;
    port: number;
    protocol: 'tcp' | 'udp';
    facility: string;
    app_name: string;
  };
  
  // Cloud logging settings
  cloudConfig: {
    provider: 'aws' | 'gcp' | 'azure' | 'datadog' | 'splunk';
    endpoint?: string;
    apiKey?: string;
    region?: string;
    logGroup?: string;
    logStream?: string;
  };
  
  // Security and filtering
  security: {
    sanitizeSecrets: boolean;
    sanitizePersonalData: boolean;
    maxLogSize: number; // bytes
    rateLimiting: {
      enabled: boolean;
      maxLogsPerSecond: number;
      burstSize: number;
    };
  };
  
  // Performance optimization
  performance: {
    asyncLogging: boolean;
    bufferSize: number;
    flushInterval: number; // milliseconds
    enableSampling: boolean;
    samplingRate: number; // 0.0 to 1.0
  };
  
  // Monitoring integration
  monitoring: {
    enableMetrics: boolean;
    enableTracing: boolean;
    enableHealthChecks: boolean;
    alertOnErrors: boolean;
    errorThreshold: number; // errors per minute
  };
}

/**
 * Default production logging configuration
 */
export const DEFAULT_PRODUCTION_LOGGING_CONFIG: ProductionLoggingConfig = {
  level: 'info',
  format: 'json',
  enableConsole: true,
  enableFile: true,
  enableSyslog: false,
  enableCloudLogging: false,
  
  fileConfig: {
    directory: process.env.TRADINGAGENTS_LOGS_DIR || './logs',
    filename: 'trading-agents-%DATE%.log',
    maxSize: '100m',
    maxFiles: 30, // 30 days retention
    compress: true,
    datePattern: 'YYYY-MM-DD'
  },
  
  syslogConfig: {
    host: process.env.SYSLOG_HOST || 'localhost',
    port: parseInt(process.env.SYSLOG_PORT || '514'),
    protocol: 'udp',
    facility: 'local0',
    app_name: 'trading-agents'
  },
  
  cloudConfig: {
    provider: (process.env.CLOUD_LOGGING_PROVIDER as any) || 'aws',
    endpoint: process.env.CLOUD_LOGGING_ENDPOINT,
    apiKey: process.env.CLOUD_LOGGING_API_KEY,
    region: process.env.CLOUD_LOGGING_REGION || 'us-east-1',
    logGroup: process.env.CLOUD_LOG_GROUP || '/trading-agents/production',
    logStream: process.env.CLOUD_LOG_STREAM || 'main'
  },
  
  security: {
    sanitizeSecrets: true,
    sanitizePersonalData: true,
    maxLogSize: 10 * 1024 * 1024, // 10MB max log entry
    rateLimiting: {
      enabled: true,
      maxLogsPerSecond: 100,
      burstSize: 500
    }
  },
  
  performance: {
    asyncLogging: true,
    bufferSize: 1000,
    flushInterval: 5000, // 5 seconds
    enableSampling: false, // Disabled by default for production
    samplingRate: 1.0
  },
  
  monitoring: {
    enableMetrics: true,
    enableTracing: true,
    enableHealthChecks: true,
    alertOnErrors: true,
    errorThreshold: 10 // 10 errors per minute triggers alert
  }
};

/**
 * Production-optimized Winston logger factory
 */
export class ProductionLogger {
  private config: ProductionLoggingConfig;
  private winston: winston.Logger;
  private logCounter: Map<string, number> = new Map();
  private lastFlush: number = Date.now();
  private errorCount: number = 0;
  private lastErrorReset: number = Date.now();

  constructor(config: Partial<ProductionLoggingConfig> = {}) {
    this.config = { ...DEFAULT_PRODUCTION_LOGGING_CONFIG, ...config };
    this.winston = this.createWinstonLogger();
    this.setupPerformanceOptimizations();
    this.setupMonitoring();
  }

  /**
   * Create optimized Winston logger for production
   */
  private createWinstonLogger(): winston.Logger {
    const transports: winston.transport[] = [];
    const formats: winston.Logform.Format[] = [
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      this.createSecuritySanitizer(),
      this.createPerformanceFormatter()
    ];

    // JSON format for production
    if (this.config.format === 'json') {
      formats.push(winston.format.json());
    } else {
      formats.push(winston.format.simple());
    }

    // Console transport (for Docker/Kubernetes)
    if (this.config.enableConsole) {
      transports.push(new winston.transports.Console({
        level: this.config.level,
        format: winston.format.combine(...formats)
      }));
    }

    // File transport with rotation
    if (this.config.enableFile) {
      const DailyRotateFile = require('winston-daily-rotate-file');
      transports.push(new DailyRotateFile({
        level: this.config.level,
        dirname: this.config.fileConfig.directory,
        filename: this.config.fileConfig.filename,
        datePattern: this.config.fileConfig.datePattern,
        maxSize: this.config.fileConfig.maxSize,
        maxFiles: this.config.fileConfig.maxFiles,
        compress: this.config.fileConfig.compress,
        format: winston.format.combine(...formats)
      }));
    }

    // Syslog transport for centralized logging
    if (this.config.enableSyslog) {
      const winston_syslog = require('winston-syslog');
      transports.push(new winston_syslog.Syslog({
        host: this.config.syslogConfig.host,
        port: this.config.syslogConfig.port,
        protocol: this.config.syslogConfig.protocol,
        facility: this.config.syslogConfig.facility,
        app_name: this.config.syslogConfig.app_name,
        format: winston.format.combine(...formats)
      }));
    }

    // Cloud logging transport
    if (this.config.enableCloudLogging) {
      transports.push(this.createCloudTransport(formats));
    }

    return winston.createLogger({
      level: this.config.level,
      transports,
      defaultMeta: {
        service: 'trading-agents',
        environment: process.env.NODE_ENV || 'production',
        version: process.env.npm_package_version || '1.0.0',
        hostname: process.env.HOSTNAME || require('os').hostname(),
        pid: process.pid
      },
      exitOnError: false
    });
  }

  /**
   * Create security sanitizer format
   */
  private createSecuritySanitizer(): winston.Logform.Format {
    return winston.format((info) => {
      if (this.config.security.sanitizeSecrets) {
        info = this.sanitizeSecrets(info);
      }
      
      if (this.config.security.sanitizePersonalData) {
        info = this.sanitizePersonalData(info);
      }
      
      // Limit log entry size
      const logSize = JSON.stringify(info).length;
      if (logSize > this.config.security.maxLogSize) {
        info.message = info.message?.substring(0, 1000) + '... [truncated]';
        info.metadata = { truncated: true, originalSize: logSize };
      }
      
      return info;
    })();
  }

  /**
   * Create performance formatter
   */
  private createPerformanceFormatter(): winston.Logform.Format {
    return winston.format((info) => {
      // Add performance metadata
      info.timestamp_ms = Date.now();
      info.memory_usage = process.memoryUsage().heapUsed;
      
      // Apply sampling if enabled
      if (this.config.performance.enableSampling) {
        if (Math.random() > this.config.performance.samplingRate) {
          return false; // Skip this log entry
        }
      }
      
      return info;
    })();
  }

  /**
   * Create cloud logging transport
   */
  private createCloudTransport(formats: winston.Logform.Format[]): winston.transport {
    switch (this.config.cloudConfig.provider) {
      case 'aws':
        return this.createAWSCloudWatchTransport(formats);
      case 'gcp':
        return this.createGCPCloudLoggingTransport(formats);
      case 'azure':
        return this.createAzureLogAnalyticsTransport(formats);
      case 'datadog':
        return this.createDatadogTransport(formats);
      case 'splunk':
        return this.createSplunkTransport(formats);
      default:
        throw new Error(`Unsupported cloud logging provider: ${this.config.cloudConfig.provider}`);
    }
  }

  /**
   * Create AWS CloudWatch transport
   */
  private createAWSCloudWatchTransport(formats: winston.Logform.Format[]): winston.transport {
    const WinstonCloudWatch = require('winston-cloudwatch');
    return new WinstonCloudWatch({
      logGroupName: this.config.cloudConfig.logGroup,
      logStreamName: this.config.cloudConfig.logStream,
      awsRegion: this.config.cloudConfig.region,
      jsonMessage: true,
      format: winston.format.combine(...formats)
    });
  }

  /**
   * Create GCP Cloud Logging transport
   */
  private createGCPCloudLoggingTransport(formats: winston.Logform.Format[]): winston.transport {
    const { LoggingWinston } = require('@google-cloud/logging-winston');
    return new LoggingWinston({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      logName: 'trading-agents',
      format: winston.format.combine(...formats)
    });
  }

  /**
   * Create Azure Log Analytics transport
   */
  private createAzureLogAnalyticsTransport(formats: winston.Logform.Format[]): winston.transport {
    const WinstonAzureApplicationInsights = require('winston-azure-application-insights');
    return new WinstonAzureApplicationInsights.AzureApplicationInsightsLogger({
      insights: require('applicationinsights'),
      treatErrorsAsExceptions: true,
      format: winston.format.combine(...formats)
    });
  }

  /**
   * Create Datadog transport
   */
  private createDatadogTransport(formats: winston.Logform.Format[]): winston.transport {
    const WinstonDatadog = require('winston-datadog');
    return new WinstonDatadog({
      apiKey: this.config.cloudConfig.apiKey,
      hostname: process.env.HOSTNAME || require('os').hostname(),
      service: 'trading-agents',
      ddsource: 'nodejs',
      ddtags: `env:${process.env.NODE_ENV || 'production'}`,
      format: winston.format.combine(...formats)
    });
  }

  /**
   * Create Splunk transport
   */
  private createSplunkTransport(formats: winston.Logform.Format[]): winston.transport {
    const WinstonSplunk = require('winston-splunk-httplogger');
    return new WinstonSplunk({
      token: this.config.cloudConfig.apiKey,
      host: this.config.cloudConfig.endpoint,
      source: 'trading-agents',
      sourcetype: 'nodejs',
      index: 'main',
      format: winston.format.combine(...formats)
    });
  }

  /**
   * Setup performance optimizations
   */
  private setupPerformanceOptimizations(): void {
    if (this.config.performance.asyncLogging) {
      // Implement async logging buffer
      setInterval(() => {
        this.flushLogs();
      }, this.config.performance.flushInterval);
    }

    // Setup rate limiting
    if (this.config.security.rateLimiting.enabled) {
      setInterval(() => {
        this.resetRateLimits();
      }, 1000); // Reset every second
    }
  }

  /**
   * Setup monitoring and alerting
   */
  private setupMonitoring(): void {
    if (this.config.monitoring.enableMetrics) {
      // Track logging metrics
      setInterval(() => {
        this.collectLoggingMetrics();
      }, 60000); // Every minute
    }

    if (this.config.monitoring.alertOnErrors) {
      // Check error threshold
      setInterval(() => {
        this.checkErrorThreshold();
      }, 60000); // Every minute
    }
  }

  /**
   * Sanitize secrets from log entries
   */
  private sanitizeSecrets(info: any): any {
    const secretPatterns = [
      /api[_-]?key[s]?[\s]*[:=][\s]*['"]*([a-zA-Z0-9_\-]{20,})['"]*$/gi,
      /password[s]?[\s]*[:=][\s]*['"]*([^'"\\s]{8,})['"]*$/gi,
      /token[s]?[\s]*[:=][\s]*['"]*([a-zA-Z0-9_\-\.]{20,})['"]*$/gi,
      /secret[s]?[\s]*[:=][\s]*['"]*([a-zA-Z0-9_\-]{16,})['"]*$/gi,
      /bearer[\s]+([a-zA-Z0-9_\-\.]{20,})$/gi,
      /authorization[\s]*:[\s]*bearer[\s]+([a-zA-Z0-9_\-\.]{20,})$/gi
    ];

    const sanitizeValue = (value: any): any => {
      if (typeof value === 'string') {
        let sanitized = value;
        secretPatterns.forEach(pattern => {
          sanitized = sanitized.replace(pattern, (match, secret) => {
            return match.replace(secret, '[REDACTED]');
          });
        });
        return sanitized;
      } else if (typeof value === 'object' && value !== null) {
        const sanitized: any = Array.isArray(value) ? [] : {};
        for (const key in value) {
          if (value.hasOwnProperty(key)) {
            sanitized[key] = sanitizeValue(value[key]);
          }
        }
        return sanitized;
      }
      return value;
    };

    return sanitizeValue(info);
  }

  /**
   * Sanitize personal data from log entries
   */
  private sanitizePersonalData(info: any): any {
    const personalDataPatterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card numbers
      /\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/g // Phone numbers
    ];

    const sanitizeValue = (value: any): any => {
      if (typeof value === 'string') {
        let sanitized = value;
        personalDataPatterns.forEach(pattern => {
          sanitized = sanitized.replace(pattern, '[PII_REDACTED]');
        });
        return sanitized;
      } else if (typeof value === 'object' && value !== null) {
        const sanitized: any = Array.isArray(value) ? [] : {};
        for (const key in value) {
          if (value.hasOwnProperty(key)) {
            sanitized[key] = sanitizeValue(value[key]);
          }
        }
        return sanitized;
      }
      return value;
    };

    return sanitizeValue(info);
  }

  /**
   * Flush buffered logs
   */
  private flushLogs(): void {
    // Implementation would depend on buffering strategy
    this.lastFlush = Date.now();
  }

  /**
   * Reset rate limiting counters
   */
  private resetRateLimits(): void {
    this.logCounter.clear();
  }

  /**
   * Collect logging metrics
   */
  private collectLoggingMetrics(): void {
    const metrics = {
      timestamp: new Date(),
      totalLogs: this.logCounter.size,
      errorCount: this.errorCount,
      memoryUsage: process.memoryUsage(),
      lastFlush: this.lastFlush
    };

    // Send metrics to monitoring system
    logger.info('production-logging', 'Logging metrics collected', metrics);
  }

  /**
   * Check error threshold and alert if exceeded
   */
  private checkErrorThreshold(): void {
    const now = Date.now();
    const timeSinceReset = now - this.lastErrorReset;
    
    if (timeSinceReset >= 60000) { // 1 minute
      const errorsPerMinute = this.errorCount;
      
      if (errorsPerMinute >= this.config.monitoring.errorThreshold) {
        logger.error('production-logging', 'Error threshold exceeded', {
          errorsPerMinute,
          threshold: this.config.monitoring.errorThreshold,
          alertLevel: 'critical'
        });
      }
      
      // Reset counters
      this.errorCount = 0;
      this.lastErrorReset = now;
    }
  }

  /**
   * Log with rate limiting
   */
  public log(level: string, message: string, meta?: any): void {
    // Apply rate limiting
    if (this.config.security.rateLimiting.enabled) {
      const key = `${level}:${message.substring(0, 50)}`;
      const count = this.logCounter.get(key) || 0;
      
      if (count >= this.config.security.rateLimiting.maxLogsPerSecond) {
        return; // Skip this log entry
      }
      
      this.logCounter.set(key, count + 1);
    }

    // Track error count
    if (level === 'error') {
      this.errorCount++;
    }

    // Log through Winston
    this.winston.log(level, message, meta);
  }

  /**
   * Get logger instance
   */
  public getLogger(): winston.Logger {
    return this.winston;
  }

  /**
   * Get logging configuration
   */
  public getConfig(): ProductionLoggingConfig {
    return this.config;
  }

  /**
   * Update logging configuration
   */
  public updateConfig(config: Partial<ProductionLoggingConfig>): void {
    this.config = { ...this.config, ...config };
    this.winston.level = this.config.level;
  }

  /**
   * Get logging statistics
   */
  public getStatistics(): any {
    return {
      config: this.config,
      errorCount: this.errorCount,
      lastFlush: this.lastFlush,
      memoryUsage: process.memoryUsage(),
      logCounter: Object.fromEntries(this.logCounter)
    };
  }

  /**
   * Shutdown logger gracefully
   */
  public async shutdown(): Promise<void> {
    return new Promise((resolve) => {
      this.winston.end(() => {
        resolve();
      });
    });
  }
}

/**
 * Create production logger instance
 */
export function createProductionLogger(config?: Partial<ProductionLoggingConfig>): ProductionLogger {
  return new ProductionLogger(config);
}

/**
 * Load production logging configuration from environment
 */
export function loadProductionLoggingConfig(): ProductionLoggingConfig {
  const config: Partial<ProductionLoggingConfig> = {};

  // Core settings
  if (process.env.PRODUCTION_LOG_LEVEL) {
    config.level = process.env.PRODUCTION_LOG_LEVEL as any;
  }
  if (process.env.PRODUCTION_LOG_FORMAT) {
    config.format = process.env.PRODUCTION_LOG_FORMAT as any;
  }

  // Transport settings
  if (process.env.PRODUCTION_LOG_CONSOLE !== undefined) {
    config.enableConsole = process.env.PRODUCTION_LOG_CONSOLE === 'true';
  }
  if (process.env.PRODUCTION_LOG_FILE !== undefined) {
    config.enableFile = process.env.PRODUCTION_LOG_FILE === 'true';
  }
  if (process.env.PRODUCTION_LOG_SYSLOG !== undefined) {
    config.enableSyslog = process.env.PRODUCTION_LOG_SYSLOG === 'true';
  }
  if (process.env.PRODUCTION_LOG_CLOUD !== undefined) {
    config.enableCloudLogging = process.env.PRODUCTION_LOG_CLOUD === 'true';
  }

  // Security settings
  if (process.env.PRODUCTION_LOG_SANITIZE_SECRETS !== undefined) {
    config.security = {
      ...DEFAULT_PRODUCTION_LOGGING_CONFIG.security,
      sanitizeSecrets: process.env.PRODUCTION_LOG_SANITIZE_SECRETS === 'true'
    };
  }

  // Performance settings
  if (process.env.PRODUCTION_LOG_ASYNC !== undefined) {
    config.performance = {
      ...DEFAULT_PRODUCTION_LOGGING_CONFIG.performance,
      asyncLogging: process.env.PRODUCTION_LOG_ASYNC === 'true'
    };
  }

  return { ...DEFAULT_PRODUCTION_LOGGING_CONFIG, ...config };
}