#!/usr/bin/env python3
"""
Enhanced Retry/Backoff Logic for Zep-Graphiti Services

This module provides improved retry mechanisms with:
- Exponential backoff with jitter
- Circuit breaker pattern
- Comprehensive error categorization
- Detailed metrics and monitoring
- Configurable retry policies
"""

import asyncio
import logging
import random
import time
from dataclasses import dataclass
from enum import Enum
from typing import Any, Awaitable, Callable, Dict, List, Optional, TypeVar, Union
from functools import wraps
import os

# Type variables for generic functions
T = TypeVar('T')

logger = logging.getLogger(__name__)


class ErrorCategory(Enum):
    """Error categories for different retry behaviors"""
    NETWORK = "network"           # Temporary network issues
    TIMEOUT = "timeout"           # Request timeouts
    RATE_LIMIT = "rate_limit"     # Rate limiting (should backoff longer)
    AUTH = "auth"                 # Authentication failures (don't retry)
    SERVER_ERROR = "server_error" # 5xx server errors (retry with caution)
    CLIENT_ERROR = "client_error" # 4xx client errors (usually don't retry)
    EMBEDDING = "embedding"       # Embedding service specific errors
    DATABASE = "database"         # Database connection/query errors
    UNKNOWN = "unknown"           # Unclassified errors


class CircuitState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"     # Normal operation
    OPEN = "open"         # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if service recovered


@dataclass
class RetryConfig:
    """Configuration for retry behavior"""
    max_retries: int = 3
    base_delay: float = 1.0          # Base delay in seconds
    max_delay: float = 60.0          # Maximum delay in seconds
    backoff_multiplier: float = 2.0  # Exponential backoff multiplier
    jitter: bool = True              # Add random jitter to prevent thundering herd
    jitter_range: float = 0.25       # Jitter range (±25% of delay)
    
    # Category-specific retry counts
    category_retries: Optional[Dict[ErrorCategory, int]] = None
    
    # Category-specific delays
    category_delays: Optional[Dict[ErrorCategory, float]] = None
    
    def __post_init__(self):
        if self.category_retries is None:
            self.category_retries = {
                ErrorCategory.NETWORK: 5,        # Network issues - retry more
                ErrorCategory.TIMEOUT: 3,        # Timeouts - moderate retries
                ErrorCategory.RATE_LIMIT: 2,     # Rate limits - fewer retries with longer delays
                ErrorCategory.AUTH: 0,           # Auth errors - don't retry
                ErrorCategory.SERVER_ERROR: 3,   # Server errors - moderate retries
                ErrorCategory.CLIENT_ERROR: 0,   # Client errors - don't retry
                ErrorCategory.EMBEDDING: 4,      # Embedding service - retry more
                ErrorCategory.DATABASE: 3,       # Database - moderate retries
                ErrorCategory.UNKNOWN: 2,        # Unknown - conservative retries
            }
        
        if self.category_delays is None:
            self.category_delays = {
                ErrorCategory.NETWORK: 1.0,
                ErrorCategory.TIMEOUT: 2.0,      # Longer delays for timeouts
                ErrorCategory.RATE_LIMIT: 5.0,   # Much longer delays for rate limits
                ErrorCategory.AUTH: 0.0,         # No delay for non-retryable
                ErrorCategory.SERVER_ERROR: 2.0,
                ErrorCategory.CLIENT_ERROR: 0.0,
                ErrorCategory.EMBEDDING: 1.5,    # Slightly longer for embedding
                ErrorCategory.DATABASE: 3.0,     # Longer delays for database
                ErrorCategory.UNKNOWN: 2.0,
            }


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker"""
    failure_threshold: int = 5       # Failures before opening circuit
    timeout: float = 60.0           # Time in seconds before trying again
    reset_timeout: float = 300.0    # Time to wait before resetting to closed
    half_open_max_calls: int = 3    # Max calls to test in half-open state


class RetryableError(Exception):
    """Enhanced error with retry metadata"""
    def __init__(self, message: str, category: ErrorCategory, retryable: bool = True, 
                 original_error: Optional[Exception] = None, status_code: Optional[int] = None):
        super().__init__(message)
        self.category = category
        self.retryable = retryable
        self.original_error = original_error
        self.status_code = status_code
        self.timestamp = time.time()


class CircuitBreaker:
    """Circuit breaker implementation for service protection"""
    
    def __init__(self, config: CircuitBreakerConfig, name: str = "unknown"):
        self.config = config
        self.name = name
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = 0
        self.success_count = 0
        self._lock = asyncio.Lock()
    
    async def call(self, func: Callable[[], Awaitable[T]]) -> T:
        """Execute function with circuit breaker protection"""
        async with self._lock:
            if self.state == CircuitState.OPEN:
                if time.time() - self.last_failure_time < self.config.timeout:
                    raise RetryableError(
                        f"Circuit breaker '{self.name}' is OPEN",
                        ErrorCategory.UNKNOWN,
                        retryable=False
                    )
                else:
                    # Try transitioning to half-open
                    self.state = CircuitState.HALF_OPEN
                    self.success_count = 0
                    logger.info(f"Circuit breaker '{self.name}' transitioning to HALF_OPEN")
            
            elif self.state == CircuitState.HALF_OPEN:
                if self.success_count >= self.config.half_open_max_calls:
                    raise RetryableError(
                        f"Circuit breaker '{self.name}' is testing (HALF_OPEN)",
                        ErrorCategory.UNKNOWN,
                        retryable=False
                    )
        
        try:
            result = await func()
            await self._on_success()
            return result
        except Exception as e:
            await self._on_failure()
            raise
    
    async def _on_success(self):
        """Handle successful call"""
        async with self._lock:
            if self.state == CircuitState.HALF_OPEN:
                self.success_count += 1
                if self.success_count >= self.config.half_open_max_calls:
                    self.state = CircuitState.CLOSED
                    self.failure_count = 0
                    logger.info(f"Circuit breaker '{self.name}' reset to CLOSED")
            elif self.state == CircuitState.CLOSED:
                self.failure_count = max(0, self.failure_count - 1)  # Gradual recovery
    
    async def _on_failure(self):
        """Handle failed call"""
        async with self._lock:
            self.failure_count += 1
            self.last_failure_time = time.time()
            
            if self.state == CircuitState.CLOSED and self.failure_count >= self.config.failure_threshold:
                self.state = CircuitState.OPEN
                logger.warning(f"Circuit breaker '{self.name}' opened after {self.failure_count} failures")
            elif self.state == CircuitState.HALF_OPEN:
                self.state = CircuitState.OPEN
                logger.warning(f"Circuit breaker '{self.name}' reopened during test")


class RetryMetrics:
    """Metrics collection for retry operations"""
    
    def __init__(self):
        self.total_calls = 0
        self.total_retries = 0
        self.success_count = 0
        self.failure_count = 0
        self.category_stats: Dict[ErrorCategory, Dict[str, int]] = {}
        self.response_times: List[float] = []
        self.last_reset = time.time()
    
    def record_call(self, success: bool, retries: int, response_time: float, 
                   category: Optional[ErrorCategory] = None):
        """Record call metrics"""
        self.total_calls += 1
        self.total_retries += retries
        self.response_times.append(response_time)
        
        if success:
            self.success_count += 1
        else:
            self.failure_count += 1
        
        if category:
            if category not in self.category_stats:
                self.category_stats[category] = {"calls": 0, "failures": 0, "retries": 0}
            
            self.category_stats[category]["calls"] += 1
            self.category_stats[category]["retries"] += retries
            if not success:
                self.category_stats[category]["failures"] += 1
        
        # Keep only recent response times
        if len(self.response_times) > 1000:
            self.response_times = self.response_times[-500:]
    
    def get_summary(self) -> Dict[str, Any]:
        """Get metrics summary"""
        if not self.response_times:
            return {"status": "no_data"}
        
        sorted_times = sorted(self.response_times)
        p95_idx = int(len(sorted_times) * 0.95)
        p99_idx = int(len(sorted_times) * 0.99)
        
        return {
            "total_calls": self.total_calls,
            "success_rate": self.success_count / self.total_calls if self.total_calls > 0 else 0,
            "avg_retries": self.total_retries / self.total_calls if self.total_calls > 0 else 0,
            "avg_response_time": sum(self.response_times) / len(self.response_times),
            "p95_response_time": sorted_times[p95_idx] if p95_idx < len(sorted_times) else 0,
            "p99_response_time": sorted_times[p99_idx] if p99_idx < len(sorted_times) else 0,
            "category_stats": self.category_stats,
            "uptime": time.time() - self.last_reset
        }


def categorize_error(error: Exception) -> ErrorCategory:
    """Categorize error for appropriate retry behavior"""
    error_str = str(error).lower()
    error_type = type(error).__name__.lower()
    
    # Network-related errors
    if any(term in error_str for term in ["connection", "network", "dns", "resolve"]):
        return ErrorCategory.NETWORK
    
    # Timeout errors
    if any(term in error_str for term in ["timeout", "timed out", "read timeout"]):
        return ErrorCategory.TIMEOUT
    
    # Rate limiting
    if any(term in error_str for term in ["rate limit", "too many requests", "429"]):
        return ErrorCategory.RATE_LIMIT
    
    # Authentication errors
    if any(term in error_str for term in ["unauthorized", "authentication", "401", "403"]):
        return ErrorCategory.AUTH
    
    # Server errors
    if any(term in error_str for term in ["server error", "internal server", "502", "503", "504"]):
        return ErrorCategory.SERVER_ERROR
    
    # Client errors
    if any(term in error_str for term in ["bad request", "not found", "400", "404"]):
        return ErrorCategory.CLIENT_ERROR
    
    # Embedding specific
    if any(term in error_str for term in ["embedding", "model", "openai"]):
        return ErrorCategory.EMBEDDING
    
    # Database errors
    if any(term in error_str for term in ["neo4j", "database", "bolt", "cypher"]):
        return ErrorCategory.DATABASE
    
    # HTTP client errors
    if "httpx" in error_type or "aiohttp" in error_type:
        return ErrorCategory.NETWORK
    
    return ErrorCategory.UNKNOWN


def calculate_delay(attempt: int, config: RetryConfig, category: ErrorCategory) -> float:
    """Calculate delay with exponential backoff and jitter"""
    base_delay = config.base_delay
    if config.category_delays:
        base_delay = config.category_delays.get(category, config.base_delay)
    
    delay = min(base_delay * (config.backoff_multiplier ** attempt), config.max_delay)
    
    if config.jitter and delay > 0:
        jitter = delay * config.jitter_range * (2 * random.random() - 1)
        delay = max(0.1, delay + jitter)  # Minimum 100ms delay
    
    return delay


# Global metrics and circuit breakers
_global_metrics = RetryMetrics()
_circuit_breakers: Dict[str, CircuitBreaker] = {}


def get_or_create_circuit_breaker(name: str, config: Optional[CircuitBreakerConfig] = None) -> CircuitBreaker:
    """Get or create a circuit breaker for a service"""
    if name not in _circuit_breakers:
        cb_config = config or CircuitBreakerConfig()
        _circuit_breakers[name] = CircuitBreaker(cb_config, name)
    return _circuit_breakers[name]


async def retry_with_backoff(
    func: Callable[[], Awaitable[T]],
    config: Optional[RetryConfig] = None,
    circuit_breaker_name: Optional[str] = None,
    operation_name: str = "unknown"
) -> T:
    """
    Execute function with enhanced retry logic and circuit breaker protection
    
    Args:
        func: Async function to execute
        config: Retry configuration
        circuit_breaker_name: Name of circuit breaker to use (optional)
        operation_name: Name for logging/metrics
    
    Returns:
        Function result
        
    Raises:
        RetryableError: When all retries exhausted
    """
    if config is None:
        config = RetryConfig()
    
    circuit_breaker = None
    if circuit_breaker_name:
        circuit_breaker = get_or_create_circuit_breaker(circuit_breaker_name)
    
    start_time = time.time()
    last_error = None
    category = ErrorCategory.UNKNOWN
    
    for attempt in range(config.max_retries + 1):  # +1 for initial attempt
        try:
            if circuit_breaker:
                result = await circuit_breaker.call(func)
            else:
                result = await func()
            
            # Record successful call
            response_time = time.time() - start_time
            _global_metrics.record_call(True, attempt, response_time, category)
            
            if attempt > 0:
                logger.info(f"Operation '{operation_name}' succeeded after {attempt} retries")
            
            return result
            
        except Exception as error:
            last_error = error
            category = categorize_error(error)
            
            # Check if error is retryable
            max_retries_for_category = config.max_retries
            if config.category_retries:
                max_retries_for_category = config.category_retries.get(category, config.max_retries)
            
            if attempt >= max_retries_for_category:
                logger.error(f"Operation '{operation_name}' failed after {attempt} attempts", extra={
                    "error": str(error),
                    "category": category.value,
                    "max_retries": max_retries_for_category
                })
                break
            
            # Calculate delay for this category
            delay = calculate_delay(attempt, config, category)
            
            logger.warning(f"Operation '{operation_name}' failed, retrying in {delay:.2f}s", extra={
                "attempt": attempt + 1,
                "max_retries": max_retries_for_category,
                "error": str(error),
                "category": category.value,
                "delay": delay
            })
            
            if delay > 0:
                await asyncio.sleep(delay)
    
    # All retries exhausted
    response_time = time.time() - start_time
    _global_metrics.record_call(False, config.max_retries, response_time, category)
    
    raise RetryableError(
        f"Operation '{operation_name}' failed after {config.max_retries} retries: {last_error}",
        category,
        retryable=False,
        original_error=last_error
    )


def retry_decorator(
    config: Optional[RetryConfig] = None,
    circuit_breaker_name: Optional[str] = None,
    operation_name: Optional[str] = None
):
    """Decorator for adding retry logic to async functions"""
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            op_name = operation_name or f"{func.__module__}.{func.__name__}"
            
            async def call_func():
                return await func(*args, **kwargs)
            
            return await retry_with_backoff(
                call_func,
                config,
                circuit_breaker_name,
                op_name
            )
        
        return wrapper
    return decorator


def get_global_metrics() -> Dict[str, Any]:
    """Get global retry metrics"""
    return _global_metrics.get_summary()


def get_circuit_breaker_status() -> Dict[str, Dict[str, Any]]:
    """Get status of all circuit breakers"""
    return {
        name: {
            "state": cb.state.value,
            "failure_count": cb.failure_count,
            "success_count": cb.success_count,
            "last_failure_time": cb.last_failure_time
        }
        for name, cb in _circuit_breakers.items()
    }


def reset_metrics():
    """Reset global metrics"""
    global _global_metrics
    _global_metrics = RetryMetrics()


# Configuration from environment variables
def load_config_from_env() -> RetryConfig:
    """Load retry configuration from environment variables"""
    return RetryConfig(
        max_retries=int(os.getenv("RETRY_MAX_RETRIES", "3")),
        base_delay=float(os.getenv("RETRY_BASE_DELAY", "1.0")),
        max_delay=float(os.getenv("RETRY_MAX_DELAY", "60.0")),
        backoff_multiplier=float(os.getenv("RETRY_BACKOFF_MULTIPLIER", "2.0")),
        jitter=os.getenv("RETRY_JITTER", "true").lower() in ("true", "1", "yes"),
        jitter_range=float(os.getenv("RETRY_JITTER_RANGE", "0.25"))
    )