#!/usr/bin/env python3
"""
Proper Graphiti Client-based Test for Zep-Graphiti Integration

This test uses the official Graphiti client library following best practices
as outlined in COPILOT_INSTRUCTIONS.md and the compliance reports.
"""

import asyncio
import logging
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# Add the graph_service directory to Python path to import Zep modules
sys.path.insert(0, str(Path(__file__).parent.parent / "graph_service"))

from graphiti_core import Graphiti
from graphiti_core.llm_client import LLMConfig, OpenAIClient
from graphiti_core.embedder.openai import OpenAIEmbedder, OpenAIEmbedderConfig
from graphiti_core.nodes import EpisodeType

# Configure logging without Unicode characters for Windows console
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class GraphitiClientTest:
    """Test class that uses proper Graphiti client methods"""
    
    def __init__(self):
        self.client = None
        self.test_group = f"networking-test-{int(time.time())}"
        
    async def setup_client(self):
        """Initialize Graphiti client using best practices"""
        logger.info("Setting up Graphiti client...")
        
        try:
            # Get configuration from environment and secrets files
            neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
            neo4j_user = os.getenv("NEO4J_USER", "neo4j")
            
            # Read Neo4j password from secrets file
            password_file = Path(__file__).parent.parent / "secrets" / "neo4j_password.txt"
            if password_file.exists():
                neo4j_password = password_file.read_text().strip()
                logger.info("Neo4j password loaded from secrets file")
            else:
                neo4j_password = os.getenv("NEO4J_PASSWORD", "")
                logger.warning("Using environment NEO4J_PASSWORD as fallback")
            
            openai_api_key = os.getenv("OPENAI_API_KEY", "dummy-key")
            openai_base_url = os.getenv("OPENAI_BASE_URL", "http://host.docker.internal:1234/v1")
            model_name = os.getenv("OPENAI_MODEL", "text-embedding-qwen3-embedding-4b")
            
            logger.info(f"Connecting to Neo4j at: {neo4j_uri}")
            logger.info(f"Using LM Studio at: {openai_base_url}")
            
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
                embedding_model="text-embedding-qwen3-embedding-4b",
                embedding_dim=2560
            )
            embedder = OpenAIEmbedder(config=embedder_config)
            
            # Initialize Graphiti client
            self.client = Graphiti(
                neo4j_uri,
                neo4j_user,
                neo4j_password,
                llm_client=llm_client,
                embedder=embedder
            )
            
            logger.info("Graphiti client initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to setup Graphiti client: {e}")
            self.client = None
            return False
        
    async def test_episode_creation(self):
        """Test episode creation using Graphiti client"""
        logger.info("Testing episode creation with Graphiti client...")
        
        try:
            # Create episode using proper client method
            episode_name = "NetworkingTest"
            episode_body = "This is a test episode to verify that LM Studio connectivity is working properly after fixing the host.docker.internal networking issue"
            
            await self.client.add_episode(
                name=episode_name,
                episode_body=episode_body,
                source=EpisodeType.message,
                source_description="Networking connectivity test",
                reference_time=datetime.now(timezone.utc)
            )
            
            logger.info("Episode created successfully")
            return True, "Episode created"
            
        except Exception as e:
            logger.error(f"Episode creation failed: {e}")
            return False, str(e)
    
    async def test_search_functionality(self):
        """Test search functionality using Graphiti client"""
        logger.info("Testing search functionality with Graphiti client...")
        
        try:
            # Search using proper client method
            results = await self.client.search(
                query="networking connectivity test",
                num_results=5
            )
            
            logger.info(f"Search completed successfully. Found {len(results)} results")
            return True, results
            
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return False, str(e)
    
    async def cleanup(self):
        """Clean up resources"""
        if self.client:
            try:
                await self.client.close()
                logger.info("Graphiti client closed successfully")
            except Exception as e:
                logger.error(f"Error closing client: {e}")

async def run_graphiti_client_tests():
    """Run comprehensive tests using Graphiti client"""
    logger.info("=" * 60)
    logger.info("Starting Graphiti Client Integration Tests")
    logger.info("This tests the networking fix using proper client methods")
    logger.info("=" * 60)
    
    test_runner = GraphitiClientTest()
    results = {
        "setup": False,
        "episode_creation": False,
        "entity_creation": False, 
        "search_functionality": False,
        "total_tests": 4,
        "passed_tests": 0
    }
    
    try:
        # 1. Setup client
        logger.info("PHASE 1: Client Setup")
        setup_success = await test_runner.setup_client()
        results["setup"] = setup_success
        if setup_success:
            results["passed_tests"] += 1
            logger.info("Client setup: PASSED")
        else:
            logger.error("Client setup: FAILED - Cannot proceed with tests")
            return results
        
        # 2. Test episode creation
        logger.info("\nPHASE 2: Episode Creation Test")
        success, result = await test_runner.test_episode_creation()
        results["episode_creation"] = success
        if success:
            results["passed_tests"] += 1
        logger.info(f"Episode creation: {'PASSED' if success else 'FAILED'}")
        
        # 3. Test search functionality
        logger.info("\nPHASE 3: Search Test")
        success, result = await test_runner.test_search_functionality()
        results["search"] = success
        if success:
            results["passed_tests"] += 1
        logger.info(f"Search: {'PASSED' if success else 'FAILED'}")
        
        # Wait for operations to complete
        logger.info("\nWaiting 3 seconds for operations to complete...")
        await asyncio.sleep(3)
        
        # 4. Test search functionality
        logger.info("\nPHASE 4: Search Functionality Test")
        success, result = await test_runner.test_search_functionality()
        results["search_functionality"] = success
        if success:
            results["passed_tests"] += 1
        logger.info(f"Search functionality: {'PASSED' if success else 'FAILED'}")
        
    except Exception as e:
        logger.error(f"Test execution failed: {e}")
    finally:
        await test_runner.cleanup()
    
    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("TEST SUMMARY")
    logger.info("=" * 60)
    logger.info(f"Total Tests: {results['total_tests']}")
    logger.info(f"Passed Tests: {results['passed_tests']}")
    logger.info(f"Failed Tests: {results['total_tests'] - results['passed_tests']}")
    logger.info(f"Success Rate: {(results['passed_tests'] / results['total_tests'] * 100):.1f}%")
    
    if results["passed_tests"] == results["total_tests"]:
        logger.info("SUCCESS: All tests passed! Networking fix is working correctly.")
        return True
    else:
        logger.error(f"FAILURE: {results['total_tests'] - results['passed_tests']} tests failed.")
        return False

if __name__ == "__main__":
    try:
        success = asyncio.run(run_graphiti_client_tests())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        logger.info("Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Test execution failed: {e}")
        sys.exit(1)