/**
 * Main Error Management System
 *
 * Orchestrates error handling, retry logic, circuit breakers, and logging
 * to provide comprehensive error management for the trading agents system.
 */

import { TradingAgentError, ErrorType, ErrorSeverity, ErrorContext, RecoveryStrategy } from './trading-agent-error.js';
import { CircuitBreaker, CircuitBreakerConfig, DEFAULT_CIRCUIT_BREAKER_CONFIG } from './circuit-breaker.js';
import { RetryHandler, RetryConfig, DEFAULT_RETRY_CONFIG } from './retry-handler.js';
import { ErrorHandlerRegistry } from './error-handler-registry.js';
import { StructuredLogger } from './structured-logger.js';

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