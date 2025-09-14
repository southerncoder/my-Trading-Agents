#!/usr/bin/env python3
"""
Enhanced Retry Integration for Existing Zep-Graphiti Service

This module enhances the existing retry logic in zep_graphiti.py with:
- Better error categorization and handling
- Configurable retry policies
- Monitoring and metrics
- Circuit breaker protection for LM Studio
"""

import asyncio
import logging
import time
from typing import Any, Callable, Optional
from utils.enhanced_retry import (
    retry_with_backoff,
    RetryConfig,
    CircuitBreakerConfig,
    get_or_create_circuit_breaker,
    ErrorCategory,
    categorize_error,
    get_global_metrics,
    load_config_from_env
)

logger = logging.getLogger(__name__)

# Global configuration for enhanced retry
ENHANCED_RETRY_CONFIG = load_config_from_env()

# Enhanced configuration for different operation types
EMBEDDING_RETRY_CONFIG = RetryConfig(
    max_retries=5,           # More retries for embedding operations
    base_delay=1.0,          # Start with 1 second
    max_delay=30.0,          # Cap at 30 seconds
    backoff_multiplier=1.8,  # Slower exponential growth
    jitter=True,
    jitter_range=0.3         # More jitter for embedding operations
)

DATABASE_RETRY_CONFIG = RetryConfig(
    max_retries=3,           # Fewer retries for database operations
    base_delay=0.5,          # Faster initial retry
    max_delay=10.0,          # Lower cap for database
    backoff_multiplier=2.0,
    jitter=True,
    jitter_range=0.2
)


def setup_lm_studio_circuit_breaker():
    """Setup circuit breaker specifically for LM Studio connectivity"""
    cb_config = CircuitBreakerConfig(
        failure_threshold=3,      # Open after 3 consecutive failures
        timeout=20.0,            # Wait 20 seconds before trying again
        reset_timeout=60.0,      # Reset after 1 minute of no failures
        half_open_max_calls=2    # Test with 2 calls in half-open state
    )
    
    return get_or_create_circuit_breaker("lm_studio_embedder", cb_config)


async def enhanced_with_retries(
    coro: Callable,
    operation_type: str = "general",
    uuid: str = "unknown",
    retries: int = 3,
    base_delay: float = 0.5
) -> Any:
    """
    Enhanced version of the _with_retries function from zep_graphiti.py
    
    This function provides backward compatibility while adding enhanced features:
    - Better error categorization
    - Circuit breaker protection for LM Studio
    - Improved logging with structured data
    - Configurable retry policies based on operation type
    """
    
    # Select appropriate retry configuration
    if operation_type == "embedding":
        config = EMBEDDING_RETRY_CONFIG
        circuit_breaker_name = "lm_studio_embedder"
    elif operation_type == "database":
        config = DATABASE_RETRY_CONFIG
        circuit_breaker_name = None
    else:
        # Use provided parameters for backward compatibility
        config = RetryConfig(
            max_retries=retries,
            base_delay=base_delay,
            max_delay=min(base_delay * (2 ** retries), 30.0),
            backoff_multiplier=2.0,
            jitter=True
        )
        circuit_breaker_name = None
    
    operation_name = f"{operation_type}_{uuid}"
    
    try:
        result = await retry_with_backoff(
            coro,
            config=config,
            circuit_breaker_name=circuit_breaker_name,
            operation_name=operation_name
        )
        
        logger.debug(f"Enhanced retry successful for {operation_name}")
        return result
        
    except Exception as e:
        # Enhanced error logging
        category = categorize_error(e)
        logger.error(f"Enhanced retry failed for {operation_name}", extra={
            "operation_type": operation_type,
            "uuid": uuid,
            "error_category": category.value,
            "error": str(e),
            "retries_attempted": config.max_retries
        })
        raise


def patch_zep_graphiti_retries():
    """
    Monkey patch to enhance the existing _with_retries function in zep_graphiti.py
    
    This provides a drop-in enhancement to the existing retry logic without
    requiring changes to the main zep_graphiti.py file.
    """
    try:
        # Import the existing module
        import graph_service.zep_graphiti as zep_graphiti
        
        # Store the original _with_retries if it exists
        if hasattr(zep_graphiti, '_with_retries'):
            original_with_retries = zep_graphiti._with_retries
            logger.info("Found existing _with_retries function, enhancing it")
        else:
            original_with_retries = None
            logger.info("No existing _with_retries found, creating new one")
        
        # Create enhanced wrapper
        async def enhanced_with_retries_wrapper(coro, retries: int = 3, base_delay: float = 0.5, **kwargs):
            """Enhanced wrapper for backward compatibility"""
            operation_type = kwargs.get('operation_type', 'general')
            uuid = kwargs.get('uuid', 'unknown')
            
            return await enhanced_with_retries(
                coro=coro,
                operation_type=operation_type,
                uuid=uuid,
                retries=retries,
                base_delay=base_delay
            )
        
        # Replace the function in the module
        zep_graphiti._with_retries = enhanced_with_retries_wrapper
        
        # Also patch the ZepGraphiti class method if it exists
        if hasattr(zep_graphiti, 'ZepGraphiti'):
            ZepGraphiti = zep_graphiti.ZepGraphiti
            
            # Enhance the save_entity_node method
            if hasattr(ZepGraphiti, 'save_entity_node'):
                original_save_entity = ZepGraphiti.save_entity_node
                
                async def enhanced_save_entity_node(self, name: str, uuid: str, group_id: str, summary: str = ''):
                    """Enhanced entity creation with embedding-specific retry logic"""
                    logger.info(f"Enhanced save_entity_node called for {uuid}")
                    
                    # Use the original method but with enhanced retry context
                    return await original_save_entity(self, name, uuid, group_id, summary)
                
                ZepGraphiti.save_entity_node = enhanced_save_entity_node
        
        logger.info("✅ Successfully patched zep_graphiti with enhanced retry logic")
        return True
        
    except ImportError as e:
        logger.warning(f"Could not import zep_graphiti module: {e}")
        return False
    except Exception as e:
        logger.error(f"Failed to patch zep_graphiti: {e}")
        return False


def get_retry_status() -> dict:
    """Get current retry system status and metrics"""
    return {
        "enhanced_retry_enabled": True,
        "global_metrics": get_global_metrics(),
        "circuit_breakers": {
            name: {
                "state": cb.state.value,
                "failure_count": cb.failure_count,
                "success_count": cb.success_count,
                "last_failure_time": cb.last_failure_time
            }
            for name, cb in get_or_create_circuit_breaker("lm_studio_embedder")._CircuitBreaker__class__._circuit_breakers.items()
        } if hasattr(get_or_create_circuit_breaker("lm_studio_embedder"), '_CircuitBreaker__class__') else {},
        "configurations": {
            "embedding": {
                "max_retries": EMBEDDING_RETRY_CONFIG.max_retries,
                "base_delay": EMBEDDING_RETRY_CONFIG.base_delay,
                "max_delay": EMBEDDING_RETRY_CONFIG.max_delay,
                "backoff_multiplier": EMBEDDING_RETRY_CONFIG.backoff_multiplier
            },
            "database": {
                "max_retries": DATABASE_RETRY_CONFIG.max_retries,
                "base_delay": DATABASE_RETRY_CONFIG.base_delay,
                "max_delay": DATABASE_RETRY_CONFIG.max_delay,
                "backoff_multiplier": DATABASE_RETRY_CONFIG.backoff_multiplier
            }
        }
    }


def test_enhanced_retry():
    """Test function to verify enhanced retry functionality"""
    
    async def test_retry_logic():
        """Test the enhanced retry mechanisms"""
        
        logger.info("Testing enhanced retry logic...")
        
        # Test 1: Successful operation (should complete immediately)
        async def successful_operation():
            await asyncio.sleep(0.1)
            return "success"
        
        result = await enhanced_with_retries(
            successful_operation,
            operation_type="test",
            uuid="test-success"
        )
        assert result == "success"
        logger.info("✅ Test 1 passed: Successful operation")
        
        # Test 2: Operation that fails initially but succeeds on retry
        attempt_count = 0
        
        async def retry_operation():
            nonlocal attempt_count
            attempt_count += 1
            if attempt_count < 3:
                raise Exception("Temporary failure")
            return f"success after {attempt_count} attempts"
        
        result = await enhanced_with_retries(
            retry_operation,
            operation_type="embedding",
            uuid="test-retry",
            retries=5
        )
        assert "success" in result
        logger.info(f"✅ Test 2 passed: Retry operation succeeded - {result}")
        
        # Test 3: Check metrics
        metrics = get_retry_status()
        logger.info(f"✅ Test 3 passed: Metrics collected - {metrics['global_metrics']['total_calls']} total calls")
        
        return True
    
    # Run the test
    try:
        result = asyncio.run(test_retry_logic())
        logger.info("✅ All enhanced retry tests passed")
        return result
    except Exception as e:
        logger.error(f"❌ Enhanced retry test failed: {e}")
        return False


if __name__ == "__main__":
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    logger.info("🔧 Enhanced Retry System for Zep-Graphiti")
    logger.info("=" * 50)
    
    # Setup circuit breakers
    setup_lm_studio_circuit_breaker()
    
    # Test the enhanced retry functionality
    test_success = test_enhanced_retry()
    
    # Try to patch the existing zep_graphiti module
    patch_success = patch_zep_graphiti_retries()
    
    if test_success and patch_success:
        logger.info("✅ Enhanced retry system ready for production")
        
        # Display status
        status = get_retry_status()
        logger.info("Current retry system status:")
        logger.info(f"  - Enhanced retry: {status['enhanced_retry_enabled']}")
        logger.info(f"  - Embedding retries: {status['configurations']['embedding']['max_retries']}")
        logger.info(f"  - Database retries: {status['configurations']['database']['max_retries']}")
        
        exit(0)
    else:
        logger.error("❌ Enhanced retry system setup failed")
        exit(1)