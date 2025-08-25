/**
 * Enhanced Logging System for Trading Agents
 * 
 * Cloudflare-optimized logging with Winston integration
 * Replaces console.log statements with structured, contextual logging
 */

import winston from 'winston';
import { TradingAgentError, ErrorSeverity } from './error-handler';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';
export type LogContext = 'agent' | 'dataflow' | 'graph' | 'cli' | 'test' | 'system';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  context: LogContext;
  component: string;
  operation: string;
  message: string;
  metadata?: Record<string, any>;
  traceId?: string;
  sessionId?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableCloudflare: boolean;
  maxFileSize: string;
  maxFiles: number;
  format: 'json' | 'human';
  silent: boolean;
}

/**
 * Enhanced Logger optimized for Cloudflare deployment
 */
export class EnhancedLogger {
  private winston: winston.Logger;
  private config: LoggerConfig;
  private sessionId: string;
  private isProduction: boolean;

  constructor(config?: Partial<LoggerConfig>) {
    this.sessionId = this.generateSessionId();
    this.isProduction = process.env.NODE_ENV === 'production';
    
    this.config = {
      level: config?.level || (this.isProduction ? 'info' : 'debug'),
      enableConsole: config?.enableConsole ?? !this.isProduction,
      enableFile: config?.enableFile ?? false,
      enableCloudflare: config?.enableCloudflare ?? this.isProduction,
      maxFileSize: config?.maxFileSize || '20m',
      maxFiles: config?.maxFiles || 5,
      format: config?.format || (this.isProduction ? 'json' : 'human'),
      silent: config?.silent ?? false
    };

    this.winston = this.createWinstonLogger();
  }

  /**
   * Create Winston logger with Cloudflare-optimized configuration
   */
  private createWinstonLogger(): winston.Logger {
    const formats: winston.Logform.Format[] = [
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true })
    ];

    if (this.config.format === 'json') {
      formats.push(winston.format.json());
    } else {
      formats.push(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, context, component, operation, message, metadata, traceId }) => {
          let log = `${timestamp} [${level.toUpperCase()}] ${context}:${component}:${operation} - ${message}`;
          if (traceId) log += ` (trace: ${traceId})`;
          if (metadata && Object.keys(metadata).length > 0) {
            log += ` | ${JSON.stringify(metadata)}`;
          }
          return log;
        })
      );
    }

    const transports: winston.transport[] = [];

    // Console transport (development)
    if (this.config.enableConsole) {
      transports.push(new winston.transports.Console({
        level: this.config.level,
        silent: this.config.silent
      }));
    }

    // File transport (optional)
    if (this.config.enableFile) {
      transports.push(new winston.transports.File({
        filename: 'logs/trading-agents.log',
        level: this.config.level,
        maxsize: this.parseFileSize(this.config.maxFileSize),
        maxFiles: this.config.maxFiles,
        tailable: true
      }));
    }

    // Cloudflare-optimized transport (production)
    if (this.config.enableCloudflare) {
      // In Cloudflare Workers, console.log outputs are captured as structured logs
      transports.push(new winston.transports.Console({
        level: this.config.level,
        silent: this.config.silent,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      }));
    }

    return winston.createLogger({
      level: this.config.level,
      format: winston.format.combine(...formats),
      transports,
      defaultMeta: {
        service: 'trading-agents',
        sessionId: this.sessionId,
        environment: process.env.NODE_ENV || 'development'
      }
    });
  }

  /**
   * Main logging method with context
   */
  public log(
    level: LogLevel, 
    context: LogContext, 
    component: string, 
    operation: string, 
    message: string, 
    metadata?: Record<string, any>,
    traceId?: string
  ): void {
    this.winston.log(level, message, {
      context,
      component,
      operation,
      metadata,
      traceId: traceId || this.generateTraceId(),
      sessionId: this.sessionId
    });
  }

  /**
   * Convenience methods for different log levels
   */
  public debug(context: LogContext, component: string, operation: string, message: string, metadata?: Record<string, any>): void {
    this.log('debug', context, component, operation, message, metadata);
  }

  public info(context: LogContext, component: string, operation: string, message: string, metadata?: Record<string, any>): void {
    this.log('info', context, component, operation, message, metadata);
  }

  public warn(context: LogContext, component: string, operation: string, message: string, metadata?: Record<string, any>): void {
    this.log('warn', context, component, operation, message, metadata);
  }

  public error(context: LogContext, component: string, operation: string, message: string, metadata?: Record<string, any>): void {
    this.log('error', context, component, operation, message, metadata);
  }

  public critical(context: LogContext, component: string, operation: string, message: string, metadata?: Record<string, any>): void {
    this.log('critical', context, component, operation, message, metadata);
  }

  /**
   * Log TradingAgentError with full context
   */
  public logError(error: TradingAgentError, traceId?: string): void {
    const level = this.severityToLevel(error.severity);
    this.log(
      level,
      'system',
      error.context.component,
      error.context.operation,
      error.message,
      {
        errorType: error.type,
        severity: error.severity,
        stack: error.stack,
        retryable: error.retryable,
        retryCount: error.retryCount,
        ...error.context.metadata
      },
      traceId
    );
  }

  /**
   * Performance logging for operations
   */
  public logPerformance(
    context: LogContext,
    component: string,
    operation: string,
    startTime: number,
    metadata?: Record<string, any>
  ): void {
    const duration = Date.now() - startTime;
    this.info(context, component, operation, `Operation completed`, {
      duration_ms: duration,
      performance: true,
      ...metadata
    });
  }

  /**
   * Start a timed operation
   */
  public startTimer(context: LogContext, component: string, operation: string): () => void {
    const startTime = Date.now();
    const traceId = this.generateTraceId();
    
    this.debug(context, component, operation, 'Operation started', { traceId });
    
    return () => {
      this.logPerformance(context, component, operation, startTime, { traceId });
    };
  }

  /**
   * Log API call details
   */
  public logApiCall(
    component: string,
    url: string,
    method: string,
    statusCode?: number,
    duration?: number,
    metadata?: Record<string, any>
  ): void {
    const level = statusCode && statusCode >= 400 ? 'error' : 'info';
    this.log(level, 'dataflow', component, 'api_call', `${method} ${url}`, {
      url,
      method,
      statusCode,
      duration_ms: duration,
      api_call: true,
      ...metadata
    });
  }

  /**
   * Log agent decision/action
   */
  public logAgentAction(
    agentName: string,
    action: string,
    result: any,
    metadata?: Record<string, any>
  ): void {
    this.info('agent', agentName, action, `Agent action completed`, {
      action,
      result: typeof result === 'object' ? JSON.stringify(result) : result,
      agent_action: true,
      ...metadata
    });
  }

  /**
   * Log workflow transitions
   */
  public logWorkflowTransition(
    workflow: string,
    fromState: string,
    toState: string,
    metadata?: Record<string, any>
  ): void {
    this.info('graph', workflow, 'transition', `Workflow transition: ${fromState} -> ${toState}`, {
      workflow,
      fromState,
      toState,
      workflow_transition: true,
      ...metadata
    });
  }

  /**
   * Create child logger with context
   */
  public child(context: LogContext, component: string): ContextLogger {
    return new ContextLogger(this, context, component);
  }

  /**
   * Get logger statistics
   */
  public getStats(): Record<string, any> {
    return {
      sessionId: this.sessionId,
      config: this.config,
      isProduction: this.isProduction,
      winston_level: this.winston.level
    };
  }

  /**
   * Set log level dynamically
   */
  public setLogLevel(level: LogLevel): void {
    this.config.level = level;
    this.winston.level = level;
  }

  /**
   * Get current log level
   */
  public getLogLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * Utility methods
   */
  private severityToLevel(severity: ErrorSeverity): LogLevel {
    switch (severity) {
      case ErrorSeverity.LOW: return 'warn';
      case ErrorSeverity.MEDIUM: return 'error';
      case ErrorSeverity.HIGH: return 'error';
      case ErrorSeverity.CRITICAL: return 'critical';
      default: return 'error';
    }
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private parseFileSize(size: string): number {
    const units = { k: 1024, m: 1024 * 1024, g: 1024 * 1024 * 1024 };
    const match = size.toLowerCase().match(/^(\d+)([kmg]?)$/);
    if (!match) return 5 * 1024 * 1024; // Default 5MB
    const [, numStr, unit] = match;
    const num = parseInt(numStr || '5', 10);
    return num * (units[unit as keyof typeof units] || 1);
  }
}

/**
 * Context-aware logger for specific components
 */
export class ContextLogger {
  constructor(
    private parent: EnhancedLogger,
    private context: LogContext,
    private component: string
  ) {}

  public debug(operation: string, message: string, metadata?: Record<string, any>): void {
    this.parent.debug(this.context, this.component, operation, message, metadata);
  }

  public info(operation: string, message: string, metadata?: Record<string, any>): void {
    this.parent.info(this.context, this.component, operation, message, metadata);
  }

  public warn(operation: string, message: string, metadata?: Record<string, any>): void {
    this.parent.warn(this.context, this.component, operation, message, metadata);
  }

  public error(operation: string, message: string, metadata?: Record<string, any>): void {
    this.parent.error(this.context, this.component, operation, message, metadata);
  }

  public critical(operation: string, message: string, metadata?: Record<string, any>): void {
    this.parent.critical(this.context, this.component, operation, message, metadata);
  }

  public startTimer(operation: string): () => void {
    return this.parent.startTimer(this.context, this.component, operation);
  }
}

/**
 * Global logger instance
 */
export const logger = new EnhancedLogger({
  level: process.env.LOG_LEVEL as LogLevel || 'info',
  enableConsole: process.env.NODE_ENV !== 'production',
  enableCloudflare: process.env.NODE_ENV === 'production',
  format: process.env.NODE_ENV === 'production' ? 'json' : 'human'
});

/**
 * Convenience function to replace console.log
 */
export function createLogger(context: LogContext, component: string): ContextLogger {
  return logger.child(context, component);
}

/**
 * Migration helper: drop-in replacement for console.log
 * @deprecated Use structured logging instead
 */
export function logInfo(message: string, ...args: any[]): void {
  const fullMessage = args.length > 0 ? `${message} ${args.map(String).join(' ')}` : message;
  logger.info('system', 'legacy', 'console_log', fullMessage);
}

/**
 * Migration helper: drop-in replacement for console.error
 * @deprecated Use structured logging instead
 */
export function logError(message: string, ...args: any[]): void {
  const fullMessage = args.length > 0 ? `${message} ${args.map(String).join(' ')}` : message;
  logger.error('system', 'legacy', 'console_error', fullMessage);
}

/**
 * Migration helper: drop-in replacement for console.warn
 * @deprecated Use structured logging instead
 */
export function logWarn(message: string, ...args: any[]): void {
  const fullMessage = args.length > 0 ? `${message} ${args.map(String).join(' ')}` : message;
  logger.warn('system', 'legacy', 'console_warn', fullMessage);
}

/**
 * Global log level management
 */
export function setGlobalLogLevel(level: LogLevel): void {
  logger.setLogLevel(level);
}

export function getGlobalLogLevel(): LogLevel {
  return logger.getLogLevel();
}