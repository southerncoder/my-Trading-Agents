#!/usr/bin/env python3
"""
Enhanced Entity Creation Test with Graphiti Client
Replaces HTTP-based entity-node testing with proper Graphiti client usage
"""

import asyncio
import json
import time
import uuid
import logging
import sys
from datetime import datetime
from pathlib import Path

# Configure detailed logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('entity-test-client.log', mode='a')
    ]
)

logger = logging.getLogger('EntityTestClient')

# Add the graph_service directory to Python path to import Graphiti modules
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

class RetryConfig:
    """Configuration for retry logic"""
    MAX_RETRIES = 3
    BASE_DELAY = 1.0
    MAX_DELAY = 10.0
    BACKOFF_MULTIPLIER = 2.0

def exponential_backoff(attempt: int) -> float:
    """Calculate exponential backoff delay"""
    delay = min(RetryConfig.BASE_DELAY * (RetryConfig.BACKOFF_MULTIPLIER ** attempt), RetryConfig.MAX_DELAY)
    return delay

async def test_with_retry_async(func, *args, **kwargs):
    """Execute an async test function with retry logic"""
    for attempt in range(RetryConfig.MAX_RETRIES):
        try:
            logger.info(f"Attempt {attempt + 1}/{RetryConfig.MAX_RETRIES}")
            result = await func(*args, **kwargs)
            if result:
                return True
            
            if attempt < RetryConfig.MAX_RETRIES - 1:
                delay = exponential_backoff(attempt)
                logger.info(f"Retrying in {delay:.2f} seconds...")
                await asyncio.sleep(delay)
                
        except Exception as e:
            logger.error(f"Attempt {attempt + 1} failed: {e}")
            if attempt < RetryConfig.MAX_RETRIES - 1:
                delay = exponential_backoff(attempt)
                logger.info(f"Retrying in {delay:.2f} seconds...")
                await asyncio.sleep(delay)
            else:
                logger.error("All retry attempts exhausted")
                return False
    return False

class GraphitiEntityTester:
    """Enhanced entity testing using proper Graphiti client"""
    
    def __init__(self):
        self.client = None
    
    async def setup_client(self):
        """Initialize Graphiti client with proper configuration"""
        try:
            # Read password from secrets
            password_file = Path(__file__).parent.parent / "secrets" / "neo4j_password.txt"
            neo4j_password = password_file.read_text().strip()
            
            # Configure components
            neo4j_driver = Neo4jDriver(
                uri="bolt://localhost:7687",
                user="neo4j",
                password=neo4j_password
            )
            
            # LLM client configuration
            llm_config = LLMConfig(
                api_key="sk-local",
                model="gpt-3.5-turbo",
                base_url="http://localhost:1234/v1",
            )
            llm_client = OpenAIClient(config=llm_config)
            
            # Embedder configuration
            embedder_config = OpenAIEmbedderConfig(
                api_key="sk-local",
                base_url="http://localhost:1234/v1",
                embedding_model="text-embedding-ada-002",
                embedding_dim=1536
            )
            embedder = OpenAIEmbedder(config=embedder_config)
            
            # Initialize Graphiti client
            self.client = Graphiti(
                graph_driver=neo4j_driver,
                llm_client=llm_client,
                embedder=embedder
            )
            
            logger.info("✅ Graphiti client initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to setup Graphiti client: {e}")
            return False
    
    async def test_neo4j_connection(self):
        """Test Neo4j connection health"""
        try:
            logger.info("🔍 Testing Neo4j connection...")
            result = await self.client.driver.execute_query("RETURN 'Hello' AS message")
            logger.info("✅ Neo4j connection healthy")
            return True
        except Exception as e:
            logger.error(f"❌ Neo4j connection failed: {e}")
            return False
    
    async def test_entity_creation_enhanced(self):
        """Test enhanced entity creation with proper Graphiti client usage"""
        logger.info("🧠 Testing Enhanced Entity Creation with Graphiti Client")
        logger.info("=" * 70)
        
        try:
            # Generate test data
            test_uuid = str(uuid.uuid4())
            test_group_id = f"test-group-{int(time.time())}"
            
            entity_data = {
                "uuid": test_uuid,
                "group_id": test_group_id,
                "name": "Enhanced Test Entity",
                "entity_type": "TestType",
                "summary": "Enhanced test entity created using Graphiti client",
                "observations": ["This is a test observation for enhanced entity creation"]
            }
            
            logger.info(f"📦 Enhanced entity data:")
            logger.info(f"   UUID: {test_uuid}")
            logger.info(f"   Group ID: {test_group_id}")
            logger.info(f"   Name: {entity_data['name']}")
            logger.debug(f"Full entity data: {json.dumps(entity_data, indent=2)}")
            
            # Measure creation time
            start_time = time.time()
            
            # Create entity using Graphiti client
            query = """
            CREATE (e:Entity {
                uuid: $uuid,
                group_id: $group_id,
                name: $name,
                entity_type: $entity_type,
                summary: $summary,
                created_at: datetime()
            })
            RETURN e.uuid AS uuid, e.name AS name
            """
            
            result = await self.client.driver.execute_query(
                query,
                uuid=entity_data["uuid"],
                group_id=entity_data["group_id"],
                name=entity_data["name"],
                entity_type=entity_data["entity_type"],
                summary=entity_data["summary"]
            )
            
            end_time = time.time()
            response_time = end_time - start_time
            
            if result and len(result.records) > 0:
                record = result.records[0]
                logger.info(f"✅ Entity created successfully!")
                logger.info(f"   UUID: {record['uuid']}")
                logger.info(f"   Name: {record['name']}")
                logger.info(f"⏱️ Creation Time: {response_time:.3f} seconds")
                
                # Verify entity exists
                verify_result = await self.client.driver.execute_query(
                    "MATCH (e:Entity {uuid: $uuid}) RETURN count(e) AS count",
                    uuid=test_uuid
                )
                
                if verify_result.records[0]["count"] == 1:
                    logger.info("✅ Entity verification successful")
                    
                    # Clean up
                    await self.client.driver.execute_query(
                        "MATCH (e:Entity {uuid: $uuid}) DELETE e",
                        uuid=test_uuid
                    )
                    logger.info("🧹 Test entity cleaned up")
                    
                    return True
                else:
                    logger.error("❌ Entity verification failed")
                    return False
            else:
                logger.error("❌ Entity creation failed - no result returned")
                return False
                
        except Exception as e:
            logger.error(f"❌ Enhanced entity creation test failed: {e}")
            logger.exception("Full exception details:")
            return False
    
    async def test_multiple_entities(self):
        """Test creation of multiple entities"""
        logger.info("📊 Testing Multiple Entity Creation")
        
        try:
            test_group_id = f"multi-test-{int(time.time())}"
            entity_count = 3
            created_uuids = []
            
            for i in range(entity_count):
                entity_uuid = str(uuid.uuid4())
                entity_name = f"Multi_Test_Entity_{i+1}"
                
                query = """
                CREATE (e:Entity {
                    uuid: $uuid,
                    group_id: $group_id,
                    name: $name,
                    entity_type: 'MultiTestType',
                    summary: $summary,
                    created_at: datetime()
                })
                RETURN e.uuid AS uuid
                """
                
                result = await self.client.driver.execute_query(
                    query,
                    uuid=entity_uuid,
                    group_id=test_group_id,
                    name=entity_name,
                    summary=f"Multi-test entity {i+1} of {entity_count}"
                )
                
                if result and len(result.records) > 0:
                    created_uuids.append(entity_uuid)
                    logger.info(f"✅ Created entity {i+1}/{entity_count}: {entity_name}")
            
            if len(created_uuids) == entity_count:
                logger.info(f"✅ Successfully created {entity_count} entities")
                
                # Clean up all entities
                cleanup_query = "MATCH (e:Entity {group_id: $group_id}) DELETE e"
                await self.client.driver.execute_query(cleanup_query, group_id=test_group_id)
                logger.info("🧹 All test entities cleaned up")
                
                return True
            else:
                logger.error(f"❌ Only created {len(created_uuids)}/{entity_count} entities")
                return False
                
        except Exception as e:
            logger.error(f"❌ Multiple entity test failed: {e}")
            return False
    
    async def cleanup(self):
        """Clean up resources"""
        if self.client:
            try:
                await self.client.close()
                logger.info("Graphiti client closed successfully")
            except Exception as e:
                logger.error(f"Error closing client: {e}")

async def run_enhanced_tests():
    """Run comprehensive enhanced entity tests using Graphiti client"""
    logger.info("🚀 Starting Enhanced Entity Tests with Graphiti Client")
    logger.info(f"📅 Test started at: {datetime.now()}")
    
    tester = GraphitiEntityTester()
    total_tests = 4
    passed_tests = 0
    
    try:
        # Test 1: Setup client
        logger.info("\n" + "="*50)
        logger.info("TEST 1: Graphiti Client Setup")
        logger.info("="*50)
        if await test_with_retry_async(tester.setup_client):
            passed_tests += 1
            logger.info("✅ Client setup: PASSED")
        else:
            logger.error("❌ Client setup: FAILED - Cannot proceed")
            return False
        
        # Test 2: Connection health
        logger.info("\n" + "="*50)
        logger.info("TEST 2: Neo4j Connection Health")
        logger.info("="*50)
        if await test_with_retry_async(tester.test_neo4j_connection):
            passed_tests += 1
            logger.info("✅ Connection health: PASSED")
        else:
            logger.error("❌ Connection health: FAILED")
        
        # Test 3: Enhanced entity creation
        logger.info("\n" + "="*50)
        logger.info("TEST 3: Enhanced Entity Creation")
        logger.info("="*50)
        if await test_with_retry_async(tester.test_entity_creation_enhanced):
            passed_tests += 1
            logger.info("✅ Enhanced entity creation: PASSED")
        else:
            logger.error("❌ Enhanced entity creation: FAILED")
        
        # Test 4: Multiple entities
        logger.info("\n" + "="*50)
        logger.info("TEST 4: Multiple Entity Creation")
        logger.info("="*50)
        if await test_with_retry_async(tester.test_multiple_entities):
            passed_tests += 1
            logger.info("✅ Multiple entity creation: PASSED")
        else:
            logger.error("❌ Multiple entity creation: FAILED")
        
    finally:
        await tester.cleanup()
    
    # Results summary
    logger.info("\n" + "="*70)
    logger.info("ENHANCED TEST RESULTS SUMMARY")
    logger.info("="*70)
    logger.info(f"Total Tests: {total_tests}")
    logger.info(f"Passed Tests: {passed_tests}")
    logger.info(f"Failed Tests: {total_tests - passed_tests}")
    logger.info(f"Success Rate: {(passed_tests / total_tests * 100):.1f}%")
    
    if passed_tests == total_tests:
        logger.info("🎉 ALL ENHANCED TESTS PASSED!")
        logger.info("✅ Entity operations work perfectly with Graphiti client")
        return True
    else:
        logger.error("💥 SOME TESTS FAILED")
        return False

if __name__ == "__main__":
    try:
        success = asyncio.run(run_enhanced_tests())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        logger.info("Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Test execution failed: {e}")
        logger.exception("Full exception details:")
        sys.exit(1)