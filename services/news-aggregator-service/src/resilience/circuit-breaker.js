/**
 * Circuit Breaker Implementation for News Aggregator Service
 * Adapted from trading-agents service pattern
 */

import { EventEmitter } from 'events';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'circuit-breaker' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  ],
});

export const CircuitState = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
};

export const DEFAULT_CIRCUIT_CONFIG = {
  failureThreshold: 5,
  recoveryTimeout: 60000,
  monitoringWindow: 300000,
  minimumRequests: 3,
};

/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by stopping requests to failing services
 */
export class CircuitBreaker extends EventEmitter {
  constructor(name = 'default', config = {}) {
    super();
    this.name = name;
    this.config = { ...DEFAULT_CIRCUIT_CONFIG, ...config };
    this.state = CircuitState.CLOSED;
    this.failures = [];
    this.lastFailureTime = 0;
    this.nextAttemptTime = 0;
    this.successCount = 0;
    this.requestCount = 0;
  }

  async execute(operation) {
    this.requestCount++;

    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        const error = new Error(`Circuit breaker is OPEN for ${this.name}`);
        error.circuitBreakerOpen = true;
        throw error;
      } else {
        this.state = CircuitState.HALF_OPEN;
        this.emit('stateChange', { 
          from: CircuitState.OPEN, 
          to: CircuitState.HALF_OPEN,
          name: this.name,
        });
        logger.info('Circuit breaker entering HALF_OPEN state', { name: this.name });
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  onSuccess() {
    this.successCount++;
    this.failures = [];
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      this.emit('stateChange', { 
        from: CircuitState.HALF_OPEN, 
        to: CircuitState.CLOSED,
        name: this.name,
      });
      this.emit('recovered', { name: this.name });
      logger.info('Circuit breaker recovered to CLOSED state', { name: this.name });
    }
  }

  onFailure(error) {
    const now = Date.now();
    this.failures.push(now);
    this.lastFailureTime = now;

    // Clean old failures outside monitoring window
    this.failures = this.failures.filter(
      time => now - time < this.config.monitoringWindow,
    );

    // Check if we should open the circuit
    if (
      this.failures.length >= this.config.minimumRequests &&
      this.failures.length >= this.config.failureThreshold
    ) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = now + this.config.recoveryTimeout;
      
      this.emit('stateChange', { 
        from: CircuitState.CLOSED, 
        to: CircuitState.OPEN,
        name: this.name,
      });
      this.emit('opened', { 
        name: this.name, 
        failures: this.failures.length,
        error: error.message,
      });
      
      logger.error('Circuit breaker opened', {
        name: this.name,
        failures: this.failures.length,
        threshold: this.config.failureThreshold,
        error: error.message,
      });
    }
  }

  getState() {
    return this.state;
  }

  getStats() {
    return {
      state: this.state,
      name: this.name,
      failures: this.failures.length,
      successCount: this.successCount,
      requestCount: this.requestCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      errorRate: this.requestCount > 0 
        ? ((this.failures.length / this.requestCount) * 100).toFixed(2) + '%'
        : '0%',
    };
  }

  reset() {
    this.state = CircuitState.CLOSED;
    this.failures = [];
    this.successCount = 0;
    this.requestCount = 0;
    this.lastFailureTime = 0;
    this.nextAttemptTime = 0;
    logger.info('Circuit breaker reset', { name: this.name });
  }
}
