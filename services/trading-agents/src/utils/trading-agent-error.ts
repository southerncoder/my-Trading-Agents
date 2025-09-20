/**
 * Trading Agent Error Class
 *
 * Standardized error type for the trading agents system with enhanced context
 * and recovery strategy information.
 */

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

export interface ErrorContext {
  component: string;
  operation: string;
  agent?: string;
  ticker?: string;
  timestamp: Date;
  requestId?: string;
  metadata?: Record<string, any>;
}

// ========================================
// Enhanced Error Classes
// ========================================

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