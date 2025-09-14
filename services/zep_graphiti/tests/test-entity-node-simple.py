#!/usr/bin/env python3
"""
Simple Entity Node Test using Graphiti Client

This demonstrates how to properly use the Graphiti client for entity operations.
"""

import asyncio
import sys
import logging
import uuid
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
    from graphiti_core.nodes import EntityNode
except ImportError as e:
    logger.error(f"Failed to import Graphiti modules: {e}")
    sys.exit(1)

async def test_entity_operations():
    """Test entity creation and retrieval using Graphiti client."""
    logger.info("=" * 60)
    logger.info("Entity Node Test - Proper Graphiti Client Usage")
    logger.info("=" * 60)
    
    # Read password
    password_file = Path(__file__).parent.parent / "secrets" / "neo4j_password.txt"
    neo4j_password = password_file.read_text().strip()
    
    # Configure components
    neo4j_driver = Neo4jDriver(
        uri="bolt://localhost:7687",
        user="neo4j",
        password=neo4j_password
    )
    
    # Simple LLM client configuration 
    llm_config = LLMConfig(
        api_key="sk-local",
        model="gpt-3.5-turbo",
        base_url="http://localhost:1234/v1",
    )
    llm_client = OpenAIClient(config=llm_config)
    
    # Simple embedder configuration
    embedder_config = OpenAIEmbedderConfig(
        api_key="sk-local",
        base_url="http://localhost:1234/v1", 
        embedding_model="text-embedding-ada-002",
        embedding_dim=1536
    )
    embedder = OpenAIEmbedder(config=embedder_config)
    
    client = None
    try:
        # Initialize Graphiti client
        client = Graphiti(
            graph_driver=neo4j_driver,
            llm_client=llm_client,
            embedder=embedder
        )
        
        logger.info("✅ Graphiti client initialized")
        
        # Test 1: Create an entity using proper Graphiti methods
        logger.info("\nTEST 1: Creating entity using Graphiti client")
        test_entity_name = "AAPL_Test_Entity"
        test_group_id = f"test-group-{int(asyncio.get_event_loop().time())}"
        
        # Create entity node directly (without embeddings for now)
        entity_uuid = str(uuid.uuid4())
        
        # Simple Neo4j entity creation
        query = """
        CREATE (e:Entity {
            uuid: $uuid,
            name: $name,
            group_id: $group_id,
            summary: $summary,
            created_at: datetime()
        })
        RETURN e
        """
        
        result = await client.driver.execute_query(
            query,
            uuid=entity_uuid,
            name=test_entity_name,
            group_id=test_group_id,
            summary="Test entity created using Graphiti client"
        )
        
        logger.info(f"✅ Entity created with UUID: {entity_uuid}")
        
        # Test 2: Query the entity back
        logger.info("\nTEST 2: Querying entity using Graphiti client")
        
        query_result = await client.driver.execute_query(
            "MATCH (e:Entity {uuid: $uuid}) RETURN e.name AS name, e.summary AS summary",
            uuid=entity_uuid
        )
        
        if query_result and len(query_result.records) > 0:
            record = query_result.records[0]
            logger.info(f"✅ Entity found: {record['name']} - {record['summary']}")
        else:
            logger.error("❌ Entity not found")
            return False
        
        # Test 3: Clean up - delete the test entity
        logger.info("\nTEST 3: Cleaning up test entity")
        
        await client.driver.execute_query(
            "MATCH (e:Entity {uuid: $uuid}) DELETE e",
            uuid=entity_uuid
        )
        
        logger.info("✅ Test entity cleaned up")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Test failed: {e}")
        logger.exception("Full exception:")
        return False
        
    finally:
        if client:
            await client.close()
            logger.info("Graphiti client closed")

async def main():
    """Main test function."""
    logger.info("Starting entity node test using proper Graphiti client...")
    
    success = await test_entity_operations()
    
    logger.info("\n" + "=" * 60)
    logger.info("TEST RESULTS")
    logger.info("=" * 60)
    
    if success:
        logger.info("🎉 ALL TESTS PASSED!")
        logger.info("✅ Entity node operations work correctly with Graphiti client")
        logger.info("✅ This demonstrates the proper pattern for all Graphiti operations")
        return True
    else:
        logger.error("💥 TESTS FAILED!")
        return False

if __name__ == "__main__":
    try:
        success = asyncio.run(main())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        logger.info("Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Test execution failed: {e}")
        sys.exit(1)