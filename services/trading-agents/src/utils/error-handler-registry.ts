/**
 * Error Handler Registry
 *
 * Manages registration and execution of error handlers for different error types,
 * providing a flexible system for error processing and recovery.
 */

import { TradingAgentError, ErrorType, ErrorContext } from './trading-agent-error.js';
import { createLogger } from './enhanced-logger.js';

// Initialize logger for error handling
const logger = createLogger('system', 'error-handler-registry');

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