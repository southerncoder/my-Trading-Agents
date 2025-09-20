/**
 * Circuit Breaker Implementation
 *
 * Implements circuit breaker pattern to prevent cascading failures
 * in distributed systems and external service calls.
 */

import { EventEmitter } from 'events';
import { TradingAgentError, ErrorType, ErrorSeverity, ErrorContext } from './trading-agent-error.js';

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