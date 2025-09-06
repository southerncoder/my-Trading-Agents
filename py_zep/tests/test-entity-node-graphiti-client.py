#!/usr/bin/env python3
"""
Test entity_node endpoint using proper Graphiti client
This test creates a unified approach for all code to use the Graphiti client consistently
"""

import asyncio
import logging
import os
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Configure logging for Windows console compatibility
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Add the graph_service directory to Python path to import Graphiti modules
sys.path.insert(0, str(Path(__file__).parent.parent / "graph_service"))

try:
    from graphiti_core import Graphiti
    from graphiti_core.llm_client import LLMConfig, OpenAIClient
    from graphiti_core.embedder.openai import OpenAIEmbedder, OpenAIEmbedderConfig
    from graphiti_core.nodes import EpisodeType, EntityNode
    from graphiti_core.driver.neo4j_driver import Neo4jDriver
except ImportError as e:
    logger.error(f"Failed to import Graphiti modules: {e}")
    logger.error("Make sure the Graphiti service is running and the modules are available")
    sys.exit(1)

class GraphitiEntityTester:
    """
    Test class that demonstrates proper Graphiti client usage for entity operations.
    This serves as the reference implementation for all code that needs to talk to Graphiti.
    """
    
    def __init__(self):
        self.client = None
        self.test_group = f"entity-test-{int(time.time())}"
        
    async def setup_graphiti_client(self):
        """
        Initialize Graphiti client using best practices.
        This is the standard way to connect to Graphiti - all other code should follow this pattern.
        """
        logger.info("Setting up Graphiti client with best practices...")
        
        try:
            # Get configuration from environment and secrets files
            neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
            neo4j_user = os.getenv("NEO4J_USER", "neo4j")
            
            # Read Neo4j password from secrets file (preferred) or environment
            password_file = Path(__file__).parent.parent / "secrets" / "neo4j_password.txt"
            if password_file.exists():
                neo4j_password = password_file.read_text().strip()
                logger.info("Neo4j password loaded from secrets file")
            else:
                neo4j_password = os.getenv("NEO4J_PASSWORD", "")
                logger.warning("Using environment NEO4J_PASSWORD as fallback")
            
            # API key configuration with secrets file support
            api_key_file = Path(__file__).parent.parent / "secrets" / "embedder_api_key.txt"
            if api_key_file.exists():
                openai_api_key = api_key_file.read_text().strip()
                logger.info("API key loaded from secrets file")
            else:
                openai_api_key = os.getenv("OPENAI_API_KEY", "dummy-key")
                logger.warning("Using environment OPENAI_API_KEY as fallback")
            
            # LM Studio URL from secrets file
            lm_studio_file = Path(__file__).parent.parent / "secrets" / "lm_studio_url.txt"
            if lm_studio_file.exists():
                openai_base_url = lm_studio_file.read_text().strip()
                logger.info("LM Studio URL loaded from secrets file")
            else:
                openai_base_url = os.getenv("OPENAI_BASE_URL", "http://host.docker.internal:5432/v1")
                logger.warning("Using environment OPENAI_BASE_URL as fallback")
            
            # Model configuration
            model_name = os.getenv("OPENAI_MODEL", "text-embedding-qwen3-embedding-4b")
            
            logger.info(f"Connecting to Neo4j at: {neo4j_uri}")
            logger.info(f"Using LM Studio at: {openai_base_url}")
            logger.info(f"Using embedding model: {model_name}")
            
            # Create Neo4j driver
            neo4j_driver = Neo4jDriver(
                uri=neo4j_uri,
                user=neo4j_user,
                password=neo4j_password
            )
            
            # Create LLM client with proper configuration
            llm_config = LLMConfig(
                api_key=openai_api_key,
                model=model_name,
                base_url=openai_base_url,
            )
            llm_client = OpenAIClient(config=llm_config)
            
            # Create embedder with proper configuration
            embedder_config = OpenAIEmbedderConfig(
                api_key=openai_api_key,
                base_url=openai_base_url,
                embedding_model=model_name,
                embedding_dim=2560  # Dimension for text-embedding-qwen3-embedding-4b
            )
            embedder = OpenAIEmbedder(config=embedder_config)
            
            # Initialize Graphiti client with all components
            self.client = Graphiti(
                graph_driver=neo4j_driver,
                llm_client=llm_client,
                embedder=embedder
            )
            
            logger.info("Graphiti client initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to setup Graphiti client: {e}")
            logger.exception("Full exception details:")
            self.client = None
            return False
    
    async def test_entity_creation_with_client(self):
        """
        Test entity creation using the proper Graphiti client.
        This is the correct way to create entities - all code should use this pattern.
        """
        logger.info("Testing entity creation with Graphiti client...")
        
        if not self.client:
            logger.error("Graphiti client not initialized")
            return False, "Client not initialized"
        
        try:
            # Create entity node using proper Graphiti client methods
            entity_name = "TestEntity"
            entity_uuid = str(uuid.uuid4())
            summary = "This is a test entity created using the proper Graphiti client"
            
            logger.info(f"Creating entity: {entity_name} (UUID: {entity_uuid})")
            
            # Create EntityNode directly using Graphiti core classes
            entity_node = EntityNode(
                name=entity_name,
                uuid=entity_uuid,
                group_id=self.test_group,
                summary=summary
            )
            
            # Generate embeddings using the configured embedder
            logger.info("Generating name embedding...")
            await entity_node.generate_name_embedding(self.client.embedder)
            
            # Save the entity node to the database
            logger.info("Saving entity node to database...")
            await entity_node.save(self.client.driver)
            
            logger.info("Entity created successfully using Graphiti client!")
            return True, entity_node
            
        except Exception as e:
            logger.error(f"Entity creation failed: {e}")
            logger.exception("Full exception details:")
            return False, str(e)
    
    async def test_entity_search(self):
        """
        Test entity search functionality using the Graphiti client.
        """
        logger.info("Testing entity search with Graphiti client...")
        
        if not self.client:
            logger.error("Graphiti client not initialized")
            return False, "Client not initialized"
        
        try:
            # Search using proper client method
            results = await self.client.search(
                query="test entity",
                num_results=5
            )
            
            logger.info(f"Search completed successfully. Found {len(results)} results")
            return True, results
            
        except Exception as e:
            logger.error(f"Search failed: {e}")
            logger.exception("Full exception details:")
            return False, str(e)
    
    async def test_episode_integration(self):
        """
        Test episode creation to ensure full Graphiti functionality.
        """
        logger.info("Testing episode creation with Graphiti client...")
        
        if not self.client:
            logger.error("Graphiti client not initialized")
            return False, "Client not initialized"
        
        try:
            # Create episode using proper client method
            episode_name = "EntityTestEpisode"
            episode_body = "This episode demonstrates entity creation with Graphiti client integration"
            
            await self.client.add_episode(
                name=episode_name,
                episode_body=episode_body,
                source=EpisodeType.message,
                source_description="Entity creation test episode",
                reference_time=datetime.now(timezone.utc),
                group_id=self.test_group
            )
            
            logger.info("Episode created successfully")
            return True, "Episode created"
            
        except Exception as e:
            logger.error(f"Episode creation failed: {e}")
            logger.exception("Full exception details:")
            return False, str(e)
    
    async def cleanup(self):
        """Clean up resources"""
        if self.client:
            try:
                await self.client.close()
                logger.info("Graphiti client closed successfully")
            except Exception as e:
                logger.error(f"Error closing client: {e}")

async def run_entity_node_tests():
    """
    Run comprehensive entity node tests using the proper Graphiti client.
    This serves as the reference implementation for all Graphiti interactions.
    """
    logger.info("=" * 70)
    logger.info("Entity Node Tests with Proper Graphiti Client")
    logger.info("This demonstrates the correct way to use Graphiti for all operations")
    logger.info("=" * 70)
    
    tester = GraphitiEntityTester()
    results = {
        "client_setup": False,
        "entity_creation": False,
        "episode_creation": False,
        "entity_search": False,
        "total_tests": 4,
        "passed_tests": 0
    }
    
    try:
        # 1. Setup Graphiti client (this is the foundation for all operations)
        logger.info("\nPHASE 1: Graphiti Client Setup")
        logger.info("=" * 40)
        setup_success = await tester.setup_graphiti_client()
        results["client_setup"] = setup_success
        if setup_success:
            results["passed_tests"] += 1
            logger.info("✅ Client setup: PASSED")
        else:
            logger.error("❌ Client setup: FAILED - Cannot proceed with tests")
            return results
        
        # 2. Test entity creation (main functionality)
        logger.info("\nPHASE 2: Entity Creation Test")
        logger.info("=" * 40)
        success, result = await tester.test_entity_creation_with_client()
        results["entity_creation"] = success
        if success:
            results["passed_tests"] += 1
            logger.info("✅ Entity creation: PASSED")
            if hasattr(result, 'uuid'):
                logger.info(f"   Created entity with UUID: {getattr(result, 'uuid', 'unknown')}")
            else:
                logger.info(f"   Entity creation result: {result}")
        else:
            logger.error("❌ Entity creation: FAILED")
            logger.error(f"   Error: {result}")
        
        # 3. Test episode creation (integration test)
        logger.info("\nPHASE 3: Episode Creation Test")
        logger.info("=" * 40)
        success, result = await tester.test_episode_integration()
        results["episode_creation"] = success
        if success:
            results["passed_tests"] += 1
            logger.info("✅ Episode creation: PASSED")
        else:
            logger.error("❌ Episode creation: FAILED")
            logger.error(f"   Error: {result}")
        
        # Wait for operations to complete
        logger.info("\nWaiting 3 seconds for operations to complete...")
        await asyncio.sleep(3)
        
        # 4. Test search functionality
        logger.info("\nPHASE 4: Entity Search Test")
        logger.info("=" * 40)
        success, result = await tester.test_entity_search()
        results["entity_search"] = success
        if success:
            results["passed_tests"] += 1
            logger.info("✅ Entity search: PASSED")
            logger.info(f"   Found {len(result)} search results")
        else:
            logger.error("❌ Entity search: FAILED")
            logger.error(f"   Error: {result}")
        
    except Exception as e:
        logger.error(f"Test execution failed: {e}")
        logger.exception("Full exception details:")
    finally:
        await tester.cleanup()
    
    # Summary
    logger.info("\n" + "=" * 70)
    logger.info("TEST SUMMARY")
    logger.info("=" * 70)
    logger.info(f"Total Tests: {results['total_tests']}")
    logger.info(f"Passed Tests: {results['passed_tests']}")
    logger.info(f"Failed Tests: {results['total_tests'] - results['passed_tests']}")
    logger.info(f"Success Rate: {(results['passed_tests'] / results['total_tests'] * 100):.1f}%")
    
    if results["passed_tests"] == results["total_tests"]:
        logger.info("SUCCESS: All tests passed! Entity node is working correctly with Graphiti client.")
        logger.info("")
        logger.info("IMPLEMENTATION GUIDANCE:")
        logger.info("- All code should use the Graphiti client patterns shown in this test")
        logger.info("- Use GraphitiEntityTester.setup_graphiti_client() as the reference for client setup")
        logger.info("- Use EntityNode class for entity operations, not direct HTTP calls")
        logger.info("- Always configure embedder and LLM client properly")
        return True
    else:
        logger.error(f"FAILURE: {results['total_tests'] - results['passed_tests']} tests failed.")
        logger.error("")
        logger.error("DEBUGGING STEPS:")
        logger.error("1. Check that Zep Graphiti service is running: docker-compose ps")
        logger.error("2. Check service logs: docker-compose logs zep-graphiti")
        logger.error("3. Verify Neo4j connectivity: docker-compose logs neo4j")
        logger.error("4. Check secrets files in py_zep/secrets/")
        return False

if __name__ == "__main__":
    try:
        success = asyncio.run(run_entity_node_tests())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        logger.info("Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Test execution failed: {e}")
        logger.exception("Full exception details:")
        sys.exit(1)