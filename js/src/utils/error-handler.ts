/**
 * Comprehensive Error Handling System for Trading Agents
 * 
 * This module provides:
 * - Standardized error types and classifications
 * - Retry mechanisms with exponential backoff
 * - Circuit breaker patterns
 * - Graceful degradation strategies
 * - Structured logging and monitoring
 * - Recovery mechanisms
 */

import { EventEmitter } from 'events';
import { createLogger } from './enhanced-logger.js';

// Initialize logger for error handling
const logger = createLogger('system', 'error-handler');

// ========================================
// Error Type System
// ========================================

export enum ErrorType {
  // Network and API errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // Configuration errors
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  MISSING_API_KEY = 'MISSING_API_KEY',
  INVALID_CONFIG = 'INVALID_CONFIG',
  
  // Data and validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATA_FORMAT_ERROR = 'DATA_FORMAT_ERROR',
  MISSING_DATA = 'MISSING_DATA',
  
  // Agent and processing errors
  AGENT_PROCESSING_ERROR = 'AGENT_PROCESSING_ERROR',
  LLM_ERROR = 'LLM_ERROR',
  MEMORY_ERROR = 'MEMORY_ERROR',
  STATE_ERROR = 'STATE_ERROR',
  
  // System errors
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  RESOURCE_EXHAUSTION = 'RESOURCE_EXHAUSTION',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  
  // Business logic errors
  BUSINESS_LOGIC_ERROR = 'BUSINESS_LOGIC_ERROR',
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
  MARKET_CLOSED = 'MARKET_CLOSED'
}

export enum ErrorSeverity {
  LOW = 'LOW',           // Minor issues, system can continue normally
  MEDIUM = 'MEDIUM',     // Moderate issues, may affect some functionality
  HIGH = 'HIGH',         // Serious issues, significant impact on functionality
  CRITICAL = 'CRITICAL'  // System-threatening issues, immediate attention required
}

export enum RecoveryStrategy {
  RETRY = 'RETRY',                     // Retry the operation
  FALLBACK = 'FALLBACK',               // Use alternative approach/data source
  SKIP = 'SKIP',                       // Skip this step and continue
  GRACEFUL_DEGRADATION = 'GRACEFUL_DEGRADATION', // Continue with reduced functionality
  ABORT = 'ABORT'                      // Stop the current operation
}

// ========================================
// Enhanced Error Classes
// ========================================

export interface ErrorContext {
  component: string;
  operation: string;
  agent?: string;
  ticker?: string;
  timestamp: Date;
  requestId?: string;
  metadata?: Record<string, any>;
}

export class TradingAgentError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly originalError?: Error;
  public readonly recoveryStrategy: RecoveryStrategy;
  public readonly retryable: boolean;
  public readonly retryCount: number;

  constructor(
    message: string,
    type: ErrorType,
    severity: ErrorSeverity,
    context: ErrorContext,
    options: {
      originalError?: Error;
      recoveryStrategy?: RecoveryStrategy;
      retryable?: boolean;
      retryCount?: number;
    } = {}
  ) {
    super(message);
    this.name = 'TradingAgentError';
    this.type = type;
    this.severity = severity;
    this.context = context;
    if (options.originalError !== undefined) {
      this.originalError = options.originalError;
    }
    this.recoveryStrategy = options.recoveryStrategy || RecoveryStrategy.ABORT;
    this.retryable = options.retryable ?? this.isRetryableByDefault(type);
    this.retryCount = options.retryCount || 0;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TradingAgentError);
    }
  }

  private isRetryableByDefault(type: ErrorType): boolean {
    const retryableTypes = [
      ErrorType.NETWORK_ERROR,
      ErrorType.TIMEOUT_ERROR,
      ErrorType.RATE_LIMIT_ERROR,
      ErrorType.API_ERROR
    ];
    return retryableTypes.includes(type);
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      context: this.context,
      recoveryStrategy: this.recoveryStrategy,
      retryable: this.retryable,
      retryCount: this.retryCount,
      stack: this.stack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : undefined
    };
  }
}

// ========================================
// Retry Configuration
// ========================================

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;          // Initial delay in ms
  maxDelay: number;           // Maximum delay in ms
  backoffMultiplier: number;  // Exponential backoff multiplier
  jitter: boolean;            // Add random jitter to prevent thundering herd
  retryableTypes: ErrorType[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  retryableTypes: [
    ErrorType.NETWORK_ERROR,
    ErrorType.TIMEOUT_ERROR,
    ErrorType.RATE_LIMIT_ERROR,
    ErrorType.API_ERROR
  ]
};

// ========================================
// Circuit Breaker Configuration
// ========================================

export interface CircuitBreakerConfig {
  failureThreshold: number;     // Number of failures before opening circuit
  recoveryTimeout: number;      // Time to wait before attempting recovery (ms)
  monitoringWindow: number;     // Window for monitoring failures (ms)
  minimumRequests: number;      // Minimum requests before evaluating failures
}

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeout: 60000,    // 1 minute
  monitoringWindow: 300000,  // 5 minutes
  minimumRequests: 3
};

// ========================================
// Circuit Breaker Implementation
// ========================================

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit is open, rejecting requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service has recovered
}

export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number[] = [];
  private lastFailureTime: number = 0;
  private nextAttemptTime: number = 0;

  constructor(
    private config: CircuitBreakerConfig = DEFAULT_CIRCUIT_BREAKER_CONFIG,
    private name: string = 'default'
  ) {
    super();
  }

  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        throw new TradingAgentError(
          `Circuit breaker is OPEN for ${this.name}`,
          ErrorType.SYSTEM_ERROR,
          ErrorSeverity.HIGH,
          {
            component: 'CircuitBreaker',
            operation: 'execute',
            timestamp: new Date()
          }
        );
      } else {
        this.state = CircuitState.HALF_OPEN;
        this.emit('stateChange', { from: CircuitState.OPEN, to: CircuitState.HALF_OPEN });
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = [];
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      this.emit('stateChange', { from: CircuitState.HALF_OPEN, to: CircuitState.CLOSED });
      this.emit('recovered', { circuitBreaker: this.name });
    }
  }

  private onFailure(): void {
    const now = Date.now();
    this.failures.push(now);
    this.lastFailureTime = now;

    // Clean old failures outside monitoring window
    this.failures = this.failures.filter(
      time => now - time < this.config.monitoringWindow
    );

    // Check if we should open the circuit
    if (this.failures.length >= this.config.minimumRequests &&
        this.failures.length >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = now + this.config.recoveryTimeout;
      this.emit('stateChange', { from: CircuitState.CLOSED, to: CircuitState.OPEN });
      this.emit('opened', { circuitBreaker: this.name, failures: this.failures.length });
    }
  }

  public getState(): CircuitState {
    return this.state;
  }

  public getStats() {
    return {
      state: this.state,
      failures: this.failures.length,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime
    };
  }
}

// ========================================
// Retry Mechanism with Exponential Backoff
// ========================================

export class RetryHandler {
  constructor(private config: RetryConfig = DEFAULT_RETRY_CONFIG) {}

  public async execute<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.config, ...customConfig };
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is retryable
        if (!this.isRetryable(error, config)) {
          throw error;
        }

        // Don't wait after the last attempt
        if (attempt < config.maxAttempts - 1) {
          const delay = this.calculateDelay(attempt, config);
          await this.sleep(delay);
        }
      }
    }

    // If we get here, all retries have been exhausted
    const options: {
      originalError?: Error;
      retryCount: number;
    } = {
      retryCount: config.maxAttempts
    };
    
    if (lastError) {
      options.originalError = lastError;
    }

    throw new TradingAgentError(
      `Operation failed after ${config.maxAttempts} attempts`,
      ErrorType.SYSTEM_ERROR,
      ErrorSeverity.HIGH,
      { ...context, timestamp: new Date() },
      options
    );
  }

  private isRetryable(error: any, config: RetryConfig): boolean {
    if (error instanceof TradingAgentError) {
      return error.retryable && config.retryableTypes.includes(error.type);
    }

    // For non-TradingAgentError, check common patterns
    if (error.code === 'ECONNRESET' || 
        error.code === 'ETIMEDOUT' || 
        error.message?.includes('timeout')) {
      return true;
    }

    if (error.response?.status >= 500) {
      return true;
    }

    if (error.response?.status === 429) { // Rate limit
      return true;
    }

    return false;
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
    delay = Math.min(delay, config.maxDelay);

    if (config.jitter) {
      // Add random jitter (±25%)
      const jitter = delay * 0.25 * (Math.random() - 0.5) * 2;
      delay += jitter;
    }

    return Math.max(delay, 0);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ========================================
// Error Handler Registry
// ========================================

export type ErrorHandler = (error: TradingAgentError, context: ErrorContext) => Promise<void>;

export class ErrorHandlerRegistry {
  private handlers: Map<ErrorType, ErrorHandler[]> = new Map();
  private globalHandlers: ErrorHandler[] = [];

  public registerHandler(errorType: ErrorType, handler: ErrorHandler): void {
    if (!this.handlers.has(errorType)) {
      this.handlers.set(errorType, []);
    }
    this.handlers.get(errorType)!.push(handler);
  }

  public registerGlobalHandler(handler: ErrorHandler): void {
    this.globalHandlers.push(handler);
  }

  public async handleError(error: TradingAgentError): Promise<void> {
    // Execute type-specific handlers
    const typeHandlers = this.handlers.get(error.type) || [];
    for (const handler of typeHandlers) {
      try {
        await handler(error, error.context);
      } catch (handlerError) {
        logger.error('handler-execution', 'Error in error handler', { 
          originalError: error.type,
          handlerError: handlerError instanceof Error ? handlerError.message : String(handlerError),
          stack: handlerError instanceof Error ? handlerError.stack : undefined
        });
      }
    }

    // Execute global handlers
    for (const handler of this.globalHandlers) {
      try {
        await handler(error, error.context);
      } catch (handlerError) {
        logger.error('global-handler-execution', 'Error in global error handler', { 
          originalError: error.type,
          handlerError: handlerError instanceof Error ? handlerError.message : String(handlerError),
          stack: handlerError instanceof Error ? handlerError.stack : undefined
        });
      }
    }
  }
}

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

// ========================================
// Main Error Management System
// ========================================

export class ErrorManager {
  private retryHandler: RetryHandler;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private handlerRegistry: ErrorHandlerRegistry;
  private logger: StructuredLogger;

  constructor(
    retryConfig?: Partial<RetryConfig>,
    _circuitBreakerConfig?: Partial<CircuitBreakerConfig>
  ) {
    this.retryHandler = new RetryHandler({ ...DEFAULT_RETRY_CONFIG, ...retryConfig });
    this.handlerRegistry = new ErrorHandlerRegistry();
    this.logger = new StructuredLogger();

    // Register default error handlers
    this.registerDefaultHandlers();
  }

  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    retryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    return this.retryHandler.execute(operation, context, retryConfig);
  }

  public getCircuitBreaker(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.circuitBreakers.has(name)) {
      const fullConfig = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
      const breaker = new CircuitBreaker(fullConfig, name);
      
      // Log circuit breaker events
      breaker.on('opened', (data) => {
        this.logger.log('error', 'CircuitBreaker', 'opened', 
          `Circuit breaker ${data.circuitBreaker} opened after ${data.failures} failures`);
      });
      
      breaker.on('recovered', (data) => {
        this.logger.log('info', 'CircuitBreaker', 'recovered', 
          `Circuit breaker ${data.circuitBreaker} recovered`);
      });

      this.circuitBreakers.set(name, breaker);
    }
    return this.circuitBreakers.get(name)!;
  }

  public async handleError(error: any, context: ErrorContext): Promise<TradingAgentError> {
    let tradingError: TradingAgentError;

    if (error instanceof TradingAgentError) {
      tradingError = error;
    } else {
      // Convert regular errors to TradingAgentError
      tradingError = this.classifyError(error, context);
    }

    // Log the error
    this.logger.logError(tradingError);

    // Execute registered handlers
    await this.handlerRegistry.handleError(tradingError);

    return tradingError;
  }

  private classifyError(error: any, context: ErrorContext): TradingAgentError {
    let type = ErrorType.INTERNAL_ERROR;
    let severity = ErrorSeverity.MEDIUM;
    let recoveryStrategy = RecoveryStrategy.ABORT;

    // Classification logic based on error characteristics
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      type = ErrorType.NETWORK_ERROR;
      severity = ErrorSeverity.LOW;
      recoveryStrategy = RecoveryStrategy.RETRY;
    } else if (error.response?.status === 401) {
      type = ErrorType.AUTHENTICATION_ERROR;
      severity = ErrorSeverity.HIGH;
      recoveryStrategy = RecoveryStrategy.ABORT;
    } else if (error.response?.status === 429) {
      type = ErrorType.RATE_LIMIT_ERROR;
      severity = ErrorSeverity.MEDIUM;
      recoveryStrategy = RecoveryStrategy.RETRY;
    } else if (error.response?.status >= 500) {
      type = ErrorType.API_ERROR;
      severity = ErrorSeverity.MEDIUM;
      recoveryStrategy = RecoveryStrategy.RETRY;
    } else if (error.message?.includes('timeout')) {
      type = ErrorType.TIMEOUT_ERROR;
      severity = ErrorSeverity.LOW;
      recoveryStrategy = RecoveryStrategy.RETRY;
    }

    return new TradingAgentError(
      error.message || 'Unknown error occurred',
      type,
      severity,
      context,
      {
        originalError: error,
        recoveryStrategy
      }
    );
  }

  private registerDefaultHandlers(): void {
    // Rate limit handler
    this.handlerRegistry.registerHandler(ErrorType.RATE_LIMIT_ERROR, async (error, context) => {
      this.logger.log('warn', context.component, context.operation, 
        'Rate limit encountered, implementing backoff strategy');
    });

    // Authentication error handler
    this.handlerRegistry.registerHandler(ErrorType.AUTHENTICATION_ERROR, async (error, context) => {
      this.logger.log('error', context.component, context.operation, 
        'Authentication failed - check API keys and permissions');
    });

    // Critical error handler
    this.handlerRegistry.registerGlobalHandler(async (error, context) => {
      if (error.severity === ErrorSeverity.CRITICAL) {
        this.logger.log('critical', context.component, context.operation, 
          'CRITICAL ERROR DETECTED - System may require immediate attention');
      }
    });
  }

  public getLogger(): StructuredLogger {
    return this.logger;
  }

  public getStats() {
    return {
      errorStats: this.logger.getErrorStats(),
      circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([name, breaker]) => ({
        name,
        stats: breaker.getStats()
      }))
    };
  }
}

// ========================================
// Global Error Manager Instance
// ========================================

export const globalErrorManager = new ErrorManager();

// ========================================
// Utility Functions
// ========================================

export function createErrorContext(
  component: string,
  operation: string,
  additionalContext?: Partial<ErrorContext>
): ErrorContext {
  return {
    component,
    operation,
    timestamp: new Date(),
    ...additionalContext
  };
}

export function wrapWithErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: ErrorContext
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const tradingError = await globalErrorManager.handleError(error, context);
      throw tradingError;
    }
  };
}

export function createRetryableOperation<T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  retryConfig?: Partial<RetryConfig>
): () => Promise<T> {
  return () => globalErrorManager.executeWithRetry(operation, context, retryConfig);
}