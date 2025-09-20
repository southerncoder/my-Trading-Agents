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

// Re-export all error handling components
export * from './trading-agent-error.js';
export * from './circuit-breaker.js';
export * from './retry-handler.js';
export * from './error-handler-registry.js';
export * from './structured-logger.js';
export * from './error-manager.js';

// ========================================
// Global Error Manager Instance
// ========================================

import { ErrorManager } from './error-manager.js';

export const globalErrorManager = new ErrorManager();

// ========================================
// Utility Functions
// ========================================

import { ErrorContext } from './trading-agent-error.js';

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
  retryConfig?: Partial<import('./retry-handler.js').RetryConfig>
): () => Promise<T> {
  return () => globalErrorManager.executeWithRetry(operation, context, retryConfig);
}