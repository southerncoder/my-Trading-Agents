#!/usr/bin/env python3
"""
Enhanced Zep Graphiti Integration with Improved Retry/Backoff Logic

This module enhances the existing Zep Graphiti service with:
- Better retry mechanisms for embedding operations
- Circuit breaker protection for LM Studio connectivity  
- Improved error handling and monitoring
- Comprehensive metrics collection
"""

import asyncio
import logging
import os
import time
from datetime import datetime, timezone
from typing import Optional

from graphiti_core import Graphiti
from graphiti_core.llm_client import LLMConfig, OpenAIClient
from graphiti_core.embedder.openai import OpenAIEmbedder, OpenAIEmbedderConfig
from graphiti_core.nodes import EntityNode, EpisodeType
from utils.enhanced_retry import (
    retry_with_backoff, 
    RetryConfig, 
    CircuitBreakerConfig,
    get_or_create_circuit_breaker,
    categorize_error,
    ErrorCategory,
    get_global_metrics,
    get_circuit_breaker_status,
    load_config_from_env
)

logger = logging.getLogger(__name__)


class EnhancedZepGraphiti(Graphiti):
    """Enhanced Zep Graphiti with improved retry logic and monitoring"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Load retry configuration
        self.retry_config = load_config_from_env()
        
        # Configure circuit breakers for different services
        self._setup_circuit_breakers()
        
        # Enhanced metrics
        self.operation_metrics = {}
        
        logger.info("Enhanced Zep Graphiti initialized with retry logic")
    
    def _setup_circuit_breakers(self):
        """Setup circuit breakers for different services"""
        
        # LM Studio embedder circuit breaker
        embedder_cb_config = CircuitBreakerConfig(
            failure_threshold=3,      # Open after 3 failures
            timeout=30.0,            # Wait 30s before trying again
            reset_timeout=120.0,     # Reset after 2 minutes of no failures
            half_open_max_calls=2    # Test with 2 calls in half-open state
        )
        get_or_create_circuit_breaker("lm_studio_embedder", embedder_cb_config)
        
        # Neo4j database circuit breaker
        neo4j_cb_config = CircuitBreakerConfig(
            failure_threshold=5,      # More tolerant for database
            timeout=60.0,            # Wait 1 minute
            reset_timeout=300.0,     # Reset after 5 minutes
            half_open_max_calls=3
        )
        get_or_create_circuit_breaker("neo4j_database", neo4j_cb_config)
        
        logger.info("Circuit breakers configured for LM Studio and Neo4j")
    
    async def save_entity_node_enhanced(self, name: str, uuid: str, group_id: str, summary: str = ''):
        """Enhanced entity node creation with improved retry logic"""
        
        async def create_entity():
            """Internal function for entity creation"""
            new_node = EntityNode(
                uuid=uuid,
                name=name,
                summary=summary,
                group_id=group_id,
                created_at=datetime.utcnow()
            )
            
            # Generate name embedding with retry logic
            async def generate_name_embedding():
                return await new_node.generate_name_embedding(self.embedder)
            
            await retry_with_backoff(
                generate_name_embedding,
                config=self.retry_config,
                circuit_breaker_name="lm_studio_embedder",
                operation_name=f"generate_name_embedding_for_{uuid}"
            )
            
            # Generate summary embedding with retry logic
            async def generate_summary_embedding():
                return await new_node.generate_summary_embedding(self.embedder)
            
            await retry_with_backoff(
                generate_summary_embedding,
                config=self.retry_config,
                circuit_breaker_name="lm_studio_embedder",
                operation_name=f"generate_summary_embedding_for_{uuid}"
            )
            
            # Save to database with retry logic
            async def save_to_database():
                return await self.driver.create_node(new_node)
            
            return await retry_with_backoff(
                save_to_database,
                config=self.retry_config,
                circuit_breaker_name="neo4j_database",
                operation_name=f"save_entity_node_{uuid}"
            )
        
        # Execute the entire operation with top-level retry
        return await retry_with_backoff(
            create_entity,
            config=self.retry_config,
            operation_name=f"save_entity_node_{name}"
        )
    
    async def add_episode_enhanced(self, name: str, episode_body: str, source, 
                                 source_description: str = "", reference_time=None, group_id: str = None):
        """Enhanced episode addition with retry logic"""
        
        async def create_episode():
            """Internal function for episode creation"""
            
            # Create episode with retry logic for embeddings
            async def generate_embeddings():
                # This will internally call the embedder which we've enhanced
                return await self.add_episode(
                    name=name,
                    episode_body=episode_body,
                    source=source,
                    source_description=source_description,
                    reference_time=reference_time,
                    group_id=group_id
                )
            
            return await retry_with_backoff(
                generate_embeddings,
                config=self.retry_config,
                circuit_breaker_name="lm_studio_embedder",
                operation_name=f"add_episode_{name}"
            )
        
        return await retry_with_backoff(
            create_episode,
            config=self.retry_config,
            operation_name=f"add_episode_enhanced_{name}"
        )
    
    async def search_enhanced(self, query: str, num_results: int = 10, **kwargs):
        """Enhanced search with retry logic"""
        
        async def perform_search():
            """Internal function for search operation"""
            return await self.search(query=query, num_results=num_results, **kwargs)
        
        return await retry_with_backoff(
            perform_search,
            config=self.retry_config,
            circuit_breaker_name="lm_studio_embedder",
            operation_name=f"search_enhanced"
        )
    
    async def health_check(self) -> dict:
        """Comprehensive health check including retry metrics"""
        health_status = {
            "service": "enhanced_zep_graphiti",
            "status": "healthy",
            "timestamp": time.time(),
            "components": {}
        }
        
        # Test Neo4j connectivity
        try:
            async def test_neo4j():
                result = await self.driver.execute_query("RETURN 1 as test")
                return result
            
            await retry_with_backoff(
                test_neo4j,
                config=RetryConfig(max_retries=1, base_delay=0.5),
                operation_name="neo4j_health_check"
            )
            health_status["components"]["neo4j"] = {"status": "healthy"}
        except Exception as e:
            health_status["components"]["neo4j"] = {"status": "unhealthy", "error": str(e)}
            health_status["status"] = "degraded"
        
        # Test embedder connectivity
        try:
            async def test_embedder():
                # Simple embedding test
                test_config = OpenAIEmbedderConfig(
                    api_key=self.embedder.config.api_key,
                    base_url=self.embedder.config.base_url,
                    embedding_model=self.embedder.config.embedding_model,
                    embedding_dim=self.embedder.config.embedding_dim
                )
                test_embedder = OpenAIEmbedder(config=test_config)
                result = await test_embedder.embed_text("health check test")
                return len(result) > 0
            
            await retry_with_backoff(
                test_embedder,
                config=RetryConfig(max_retries=1, base_delay=0.5),
                circuit_breaker_name="lm_studio_embedder",
                operation_name="embedder_health_check"
            )
            health_status["components"]["embedder"] = {"status": "healthy"}
        except Exception as e:
            health_status["components"]["embedder"] = {"status": "unhealthy", "error": str(e)}
            health_status["status"] = "degraded"
        
        # Add retry metrics
        health_status["metrics"] = get_global_metrics()
        health_status["circuit_breakers"] = get_circuit_breaker_status()
        
        return health_status
    
    def get_performance_metrics(self) -> dict:
        """Get detailed performance metrics"""
        return {
            "global_retry_metrics": get_global_metrics(),
            "circuit_breaker_status": get_circuit_breaker_status(),
            "operation_metrics": self.operation_metrics,
            "config": {
                "max_retries": self.retry_config.max_retries,
                "base_delay": self.retry_config.base_delay,
                "max_delay": self.retry_config.max_delay,
                "backoff_multiplier": self.retry_config.backoff_multiplier,
                "jitter_enabled": self.retry_config.jitter
            }
        }


async def create_enhanced_graphiti(
    neo4j_uri: str,
    neo4j_user: str, 
    neo4j_password: str,
    openai_api_key: str,
    openai_base_url: str,
    embedding_model: str = "text-embedding-qwen3-embedding-4b",
    embedding_dim: int = 2560
) -> EnhancedZepGraphiti:
    """Create enhanced Graphiti client with retry logic"""
    
    # Create LLM client
    llm_config = LLMConfig(
        api_key=openai_api_key,
        base_url=openai_base_url,
        model="gpt-3.5-turbo"  # Default model
    )
    llm_client = OpenAIClient(config=llm_config)
    
    # Create embedder with retry-friendly configuration
    embedder_config = OpenAIEmbedderConfig(
        api_key=openai_api_key,
        base_url=openai_base_url,
        embedding_model=embedding_model,
        embedding_dim=embedding_dim
    )
    embedder = OpenAIEmbedder(config=embedder_config)
    
    # Create enhanced Graphiti client
    client = EnhancedZepGraphiti(
        neo4j_uri,
        neo4j_user,
        neo4j_password,
        llm_client=llm_client,
        embedder=embedder
    )
    
    logger.info("Enhanced Graphiti client created successfully")
    return client


# Environment variable helpers
def load_enhanced_config_from_env() -> dict:
    """Load all configuration from environment variables"""
    return {
        "neo4j_uri": os.getenv("NEO4J_URI", "bolt://localhost:7687"),
        "neo4j_user": os.getenv("NEO4J_USER", "neo4j"),
        "neo4j_password": os.getenv("NEO4J_PASSWORD", ""),
        "openai_api_key": os.getenv("OPENAI_API_KEY", "dummy-key"),
        "openai_base_url": os.getenv("OPENAI_BASE_URL", "http://host.docker.internal:5432/v1"),
        "embedding_model": os.getenv("EMBEDDING_MODEL", "text-embedding-qwen3-embedding-4b"),
        "embedding_dim": int(os.getenv("EMBEDDING_DIM", "2560"))
    }


async def test_enhanced_functionality():
    """Test the enhanced retry functionality"""
    config = load_enhanced_config_from_env()
    
    # Read password from secrets file if not in environment
    if not config["neo4j_password"]:
        try:
            from pathlib import Path
            password_file = Path(__file__).parent.parent / "secrets" / "neo4j_password.txt"
            if password_file.exists():
                config["neo4j_password"] = password_file.read_text().strip()
        except Exception as e:
            logger.warning(f"Could not read password from secrets file: {e}")
    
    try:
        # Create enhanced client
        client = await create_enhanced_graphiti(**config)
        
        # Test health check
        health = await client.health_check()
        logger.info(f"Health check result: {health}")
        
        # Test enhanced operations
        test_uuid = f"test-enhanced-{int(time.time())}"
        
        # Test entity creation with retry logic
        logger.info("Testing enhanced entity creation...")
        result = await client.save_entity_node_enhanced(
            name="Enhanced Test Entity",
            uuid=test_uuid,
            group_id="test-group",
            summary="This is a test entity to validate enhanced retry logic"
        )
        logger.info(f"Entity created successfully: {result}")
        
        # Get performance metrics
        metrics = client.get_performance_metrics()
        logger.info(f"Performance metrics: {metrics}")
        
        # Close client
        await client.close()
        
        return True
        
    except Exception as e:
        logger.error(f"Enhanced functionality test failed: {e}")
        return False


if __name__ == "__main__":
    import time
    from datetime import datetime
    
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    async def main():
        success = await test_enhanced_functionality()
        if success:
            logger.info("✅ Enhanced retry functionality test completed successfully")
        else:
            logger.error("❌ Enhanced retry functionality test failed")
        return success
    
    result = asyncio.run(main())
    exit(0 if result else 1)