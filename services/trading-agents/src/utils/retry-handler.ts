/**
 * Retry Mechanism with Exponential Backoff
 *
 * Implements intelligent retry logic with exponential backoff and jitter
 * to handle transient failures gracefully.
 */

import { TradingAgentError, ErrorType, ErrorSeverity, ErrorContext } from './trading-agent-error.js';

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