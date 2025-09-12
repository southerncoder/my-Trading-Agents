/**
 * Standardized error class for context retrieval components
 */
export class ContextRetrievalError extends Error {
  public component: string;
  public originalError: Error | undefined;
  public metadata: any | undefined;

  constructor(
    message: string,
    component: string,
    originalError?: Error,
    metadata?: any
  ) {
    super(message);
    this.name = 'ContextRetrievalError';
    this.component = component;
    this.originalError = originalError;
    this.metadata = metadata;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
