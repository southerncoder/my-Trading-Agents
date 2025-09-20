/**
 * Structured Logger for Errors
 *
 * Provides structured logging capabilities for error tracking and monitoring,
 * with integration to Winston logger and fallback console logging.
 */

import { TradingAgentError, ErrorSeverity } from './trading-agent-error.js';
import { createLogger } from './enhanced-logger.js';

// Initialize logger for structured logging
const logger = createLogger('system', 'structured-logger');

// ========================================
// Structured Logger for Errors
// ========================================

export interface LogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  component: string;
  operation: string;
  message: string;
  error?: TradingAgentError;
  metadata?: Record<string, any>;
}

export class StructuredLogger {
  private logs: LogEntry[] = [];
  private maxLogs: number = 10000;

  public log(level: LogEntry['level'], component: string, operation: string, message: string, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      component,
      operation,
      message,
      ...(metadata && { metadata })
    };

    this.logs.push(entry);
    this.trimLogs();

    // Console output with appropriate formatting
    this.outputToConsole(entry);
  }

  public logError(error: TradingAgentError): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: this.severityToLevel(error.severity),
      component: error.context.component,
      operation: error.context.operation,
      message: error.message,
      error,
      ...(error.context.metadata && { metadata: error.context.metadata })
    };

    this.logs.push(entry);
    this.trimLogs();
    this.outputToConsole(entry);
  }

  private severityToLevel(severity: ErrorSeverity): LogEntry['level'] {
    switch (severity) {
      case ErrorSeverity.LOW: return 'warn';
      case ErrorSeverity.MEDIUM: return 'error';
      case ErrorSeverity.HIGH: return 'error';
      case ErrorSeverity.CRITICAL: return 'critical';
      default: return 'error';
    }
  }

  private outputToConsole(entry: LogEntry): void {
    // Try to use Winston logger first, fall back to console if Winston fails
    try {
      const operation = `${entry.component}:${entry.operation}`;
      const metadata = {
        component: entry.component,
        operation: entry.operation,
        ...(entry.metadata || {}),
        ...(entry.error && { error: entry.error.toJSON() })
      };

      switch (entry.level) {
        case 'debug':
          logger.debug(operation, entry.message, metadata);
          break;
        case 'info':
          logger.info(operation, entry.message, metadata);
          break;
        case 'warn':
          logger.warn(operation, entry.message, metadata);
          break;
        case 'error':
        case 'critical':
          logger.error(operation, entry.message, metadata);
          break;
      }
    } catch (loggerError) {
      // Fallback to console if Winston logger fails (bootstrap/circular dependency issue)
      const timestamp = entry.timestamp.toISOString();
      const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.component}:${entry.operation}]`;

      switch (entry.level) {
        case 'debug':
          // eslint-disable-next-line no-console
          console.debug(`${prefix} ${entry.message}`, entry.metadata || '');
          break;
        case 'info':
          // eslint-disable-next-line no-console
          console.info(`${prefix} ${entry.message}`, entry.metadata || '');
          break;
        case 'warn':
          // eslint-disable-next-line no-console
          console.warn(`${prefix} ${entry.message}`, entry.metadata || '');
          break;
        case 'error':
        case 'critical':
          // eslint-disable-next-line no-console
          console.error(`${prefix} ${entry.message}`);
          if (entry.error) {
            // eslint-disable-next-line no-console
            console.error('Error details:', entry.error.toJSON());
          }
          break;
      }
    }
  }

  private trimLogs(): void {
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  public getLogs(level?: LogEntry['level'], component?: string): LogEntry[] {
    return this.logs.filter(log =>
      (!level || log.level === level) &&
      (!component || log.component === component)
    );
  }

  public getErrorStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const log of this.logs) {
      if (log.error) {
        const key = `${log.error.type}_${log.error.severity}`;
        stats[key] = (stats[key] || 0) + 1;
      }
    }
    return stats;
  }
}