/**
 * Retry Handler with Exponential Backoff
 */

import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'retry-handler' },
  transports: [new winston.transports.Console()],
});

export const DEFAULT_RETRY_CONFIG = {
  maxAttempts: Number(process.env.RETRY_MAX_ATTEMPTS) || 3,
  baseDelay: Number(process.env.RETRY_BASE_DELAY) || 1000,
  maxDelay: Number(process.env.RETRY_MAX_DELAY) || 30000,
  backoffMultiplier: Number(process.env.RETRY_BACKOFF_MULTIPLIER) || 2,
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'],
  retryableStatuses: [429, 500, 502, 503, 504],
};

export class RetryHandler {
  constructor(config = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  async execute(operation, context = {}) {
    let lastError;
    const { provider, query } = context;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        logger.debug('Attempting operation', { attempt, maxAttempts: this.config.maxAttempts, provider, query });
        const result = await operation();
        if (attempt > 1) {
          logger.info('Operation succeeded after retry', { attempt, provider, query });
        }
        return result;
      } catch (error) {
        lastError = error;
        const isRetryable = this.isRetryable(error);
        const isLastAttempt = attempt === this.config.maxAttempts;
        logger.warn('Operation failed', { attempt, maxAttempts: this.config.maxAttempts, provider, query, error: error.message, isRetryable, isLastAttempt });
        if (!isRetryable || isLastAttempt) break;
        const delay = Math.min(this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1), this.config.maxDelay);
        logger.debug('Waiting before retry', { attempt, delay, provider });
        await this.sleep(delay);
      }
    }

    logger.error('All retry attempts exhausted', { attempts: this.config.maxAttempts, provider, query, error: lastError?.message });
    throw lastError;
  }

  isRetryable(error) {
    if (error.code && this.config.retryableErrors.includes(error.code)) return true;
    if (error.response?.status && this.config.retryableStatuses.includes(error.response.status)) return true;
    const message = (error.message || '').toLowerCase();
    const retryablePatterns = ['timeout', 'rate limit', 'too many requests', 'temporarily unavailable'];
    return retryablePatterns.some(p => message.includes(p));
  }

  sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}
