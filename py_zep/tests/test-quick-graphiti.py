#!/usr/bin/env python3
"""
Quick Graphiti client connection test.
"""

import asyncio
import sys
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add the graph_service directory to Python path
sys.path.insert(0, str(Path(__file__).parent.parent / "graph_service"))

try:
    from graphiti_core import Graphiti
    from graphiti_core.llm_client import LLMConfig, OpenAIClient
    from graphiti_core.embedder.openai import OpenAIEmbedder, OpenAIEmbedderConfig
    from graphiti_core.driver.neo4j_driver import Neo4jDriver
except ImportError as e:
    logger.error(f"Failed to import Graphiti modules: {e}")
    sys.exit(1)

async def quick_test():
    """Quick connection test."""
    logger.info("Testing Graphiti client connection...")
    
    # Read password
    password_file = Path(__file__).parent.parent / "secrets" / "neo4j_password.txt"
    neo4j_password = password_file.read_text().strip()
    
    # Configure components
    neo4j_driver = Neo4jDriver(
        uri="bolt://localhost:7687",
        user="neo4j",
        password=neo4j_password
    )
    
    # Simple LLM client (we'll skip embeddings for now)
    llm_config = LLMConfig(
        api_key="sk-local",
        model="gpt-3.5-turbo",  # Simpler model
        base_url="http://localhost:1234/v1",
    )
    llm_client = OpenAIClient(config=llm_config)
    
    # Skip embedder for now to test just Neo4j
    embedder_config = OpenAIEmbedderConfig(
        api_key="sk-local",
        base_url="http://localhost:1234/v1",
        embedding_model="text-embedding-ada-002",
        embedding_dim=1536
    )
    embedder = OpenAIEmbedder(config=embedder_config)
    
    try:
        # Initialize Graphiti client
        client = Graphiti(
            graph_driver=neo4j_driver,
            llm_client=llm_client,
            embedder=embedder
        )
        
        logger.info("Graphiti client created successfully")
        
        # Test Neo4j connection directly
        result = await client.driver.execute_query("RETURN 'Hello' AS message")
        logger.info(f"✅ Neo4j connection successful!")
        
        await client.close()
        return True
        
    except Exception as e:
        logger.error(f"❌ Connection failed: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(quick_test())
    print(f"Result: {'SUCCESS' if success else 'FAILED'}")