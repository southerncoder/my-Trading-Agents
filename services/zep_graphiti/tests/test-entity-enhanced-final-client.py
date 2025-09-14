#!/usr/bin/env python3
"""
Enhanced Entity Creation Test using Graphiti Client
Replaces HTTP-based /entity-node endpoint with proper Graphiti client usage
Includes comprehensive logging, retry logic, and error handling
"""

import asyncio
import json
import time
import logging
import sys
from datetime import datetime
from pathlib import Path

# Add path for graphiti_client_utils
sys.path.insert(0, str(Path(__file__).parent))

from graphiti_client_utils import get_graphiti_client

# Configure detailed logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('entity-enhanced-client-test.log', mode='a')
    ]
)

logger = logging.getLogger('EntityEnhancedClientTest')

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

async def test_client_connection():
    """Test Graphiti client connection with detailed logging"""
    logger.info("Testing Graphiti client connection...")
    try:
        async with get_graphiti_client() as client_manager:
            connection_success = await client_manager.test_connection()
            
            if connection_success:
                logger.info("✅ Graphiti client connection successful!")
                return True
            else:
                logger.error("❌ Graphiti client connection failed")
                return False
                
    except Exception as e:
        logger.error(f"❌ Client connection error: {e}")
        return False

async def test_enhanced_entity_creation():
    """Test enhanced entity creation using Graphiti client with detailed logging"""
    logger.info("🧠 Testing Enhanced Zep-Graphiti Entity Creation with Client")
    logger.info("=" * 70)
    
    test_group_id = f"enhanced-test-group-{int(time.time())}"
    
    # Multiple entity test data
    entity_configs = [
        {
            "name": "Enhanced Test Entity 1",
            "entity_type": "TestTypeA",
            "summary": "First enhanced test entity with comprehensive data",
            "metadata": {
                "test_id": 1,
                "complexity": "high",
                "features": ["logging", "retry", "validation"]
            }
        },
        {
            "name": "Enhanced Test Entity 2", 
            "entity_type": "TestTypeB",
            "summary": "Second enhanced test entity for batch testing",
            "metadata": {
                "test_id": 2,
                "complexity": "medium",
                "features": ["batch", "performance", "cleanup"]
            }
        },
        {
            "name": "Enhanced Test Entity 3",
            "entity_type": "TestTypeC", 
            "summary": "Third enhanced test entity for edge case testing",
            "metadata": {
                "test_id": 3,
                "complexity": "low",
                "features": ["edge_case", "minimal", "robustness"]
            }
        }
    ]
    
    created_entities = []
    
    try:
        async with get_graphiti_client() as client_manager:
            # Test connection first
            logger.info("🔗 Testing client connection...")
            if not await client_manager.test_connection():
                logger.error("❌ Client connection failed")
                return False
            
            logger.info("✅ Client connection verified")
            
            # Create multiple entities
            logger.info(f"📦 Creating {len(entity_configs)} enhanced test entities...")
            
            for i, config in enumerate(entity_configs, 1):
                logger.info(f"\n--- Creating Entity {i}/{len(entity_configs)} ---")
                logger.info(f"Name: {config['name']}")
                logger.info(f"Type: {config['entity_type']}")
                logger.debug(f"Full config: {json.dumps(config, indent=2)}")
                
                start_time = time.time()
                
                entity_uuid = await client_manager.create_entity(
                    name=config["name"],
                    entity_type=config["entity_type"],
                    group_id=test_group_id,
                    summary=config["summary"]
                )
                
                end_time = time.time()
                creation_time = end_time - start_time
                
                if entity_uuid:
                    logger.info(f"✅ Entity {i} created successfully!")
                    logger.info(f"📋 Entity UUID: {entity_uuid}")
                    logger.info(f"⏱️ Creation Time: {creation_time:.3f} seconds")
                    created_entities.append(entity_uuid)
                    
                    # Verify entity exists
                    logger.info(f"🔍 Verifying entity {i}...")
                    entity_data = await client_manager.get_entity(entity_uuid)
                    if entity_data:
                        logger.info(f"✅ Entity {i} verification successful")
                        logger.debug(f"Entity data: {json.dumps(entity_data, indent=2, default=str)}")
                    else:
                        logger.warning(f"⚠️ Entity {i} verification failed")
                else:
                    logger.error(f"❌ Entity {i} creation failed")
                    return False
            
            # Test search functionality
            logger.info(f"\n🔍 Testing search across all entities...")
            search_results = await client_manager.search_entities(
                group_id=test_group_id,
                entity_type=None  # Search all types
            )
            
            logger.info(f"✅ Search completed: found {len(search_results)} entities")
            logger.info("📋 Search results summary:")
            for j, result in enumerate(search_results, 1):
                logger.info(f"   {j}. {result.get('name', 'Unknown')} ({result.get('entity_type', 'Unknown')})")
            
            # Test entity type filtering
            logger.info(f"\n🔍 Testing filtered search by entity type...")
            for entity_type in ["TestTypeA", "TestTypeB", "TestTypeC"]:
                filtered_results = await client_manager.search_entities(
                    group_id=test_group_id,
                    entity_type=entity_type
                )
                logger.info(f"   {entity_type}: {len(filtered_results)} entities found")
            
            # Performance metrics
            logger.info(f"\n📊 Performance Summary:")
            logger.info(f"   Total entities created: {len(created_entities)}")
            logger.info(f"   Total entities found in search: {len(search_results)}")
            logger.info(f"   Test group: {test_group_id}")
            
            return True
            
    except Exception as e:
        logger.error(f"❌ Enhanced entity creation test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        # Cleanup created entities
        if created_entities:
            logger.info(f"\n🧹 Cleaning up {len(created_entities)} test entities...")
            try:
                async with get_graphiti_client() as client_manager:
                    for i, entity_uuid in enumerate(created_entities, 1):
                        if await client_manager.delete_entity(entity_uuid):
                            logger.info(f"✅ Entity {i} cleaned up successfully")
                        else:
                            logger.warning(f"⚠️ Failed to clean up entity {i}")
                logger.info("✅ Cleanup completed")
            except Exception as cleanup_error:
                logger.error(f"❌ Cleanup error: {cleanup_error}")

async def test_error_handling():
    """Test error handling scenarios with Graphiti client"""
    logger.info("\n🧪 Testing Error Handling Scenarios")
    logger.info("=" * 40)
    
    try:
        async with get_graphiti_client() as client_manager:
            # Test 1: Empty entity name
            logger.info("1. Testing empty entity name...")
            try:
                result = await client_manager.create_entity(
                    name="",
                    entity_type="ErrorTest",
                    group_id="error-test-group"
                )
                if result:
                    logger.warning("⚠️ Empty name should have failed but didn't")
                    await client_manager.delete_entity(result)
                else:
                    logger.info("✅ Empty name properly handled")
            except Exception as e:
                logger.info(f"✅ Empty name properly rejected: {e}")
            
            # Test 2: Very long entity name
            logger.info("2. Testing very long entity name...")
            long_name = "Very" * 100  # 400 characters
            try:
                result = await client_manager.create_entity(
                    name=long_name,
                    entity_type="ErrorTest",
                    group_id="error-test-group",
                    summary="Testing long name handling"
                )
                if result:
                    logger.info("✅ Long name handled successfully")
                    await client_manager.delete_entity(result)
                else:
                    logger.info("✅ Long name properly rejected")
            except Exception as e:
                logger.info(f"✅ Long name error handled: {e}")
            
            # Test 3: Invalid group ID characters
            logger.info("3. Testing invalid group ID...")
            try:
                result = await client_manager.create_entity(
                    name="Invalid Group Test",
                    entity_type="ErrorTest",
                    group_id="invalid/group@id#",
                    summary="Testing invalid group ID"
                )
                if result:
                    logger.info("✅ Invalid group ID handled successfully")
                    await client_manager.delete_entity(result)
                else:
                    logger.info("✅ Invalid group ID properly rejected")
            except Exception as e:
                logger.info(f"✅ Invalid group ID error handled: {e}")
            
        return True
        
    except Exception as e:
        logger.error(f"❌ Error handling test failed: {e}")
        return False

async def main():
    """Main test orchestrator with comprehensive error handling"""
    logger.info("Starting Enhanced Entity Creation Tests with Graphiti Client")
    logger.info("=" * 80)
    logger.info(f"Test started at: {datetime.now().isoformat()}")
    
    test_results = []
    
    # Test 1: Client connection with retry
    logger.info("\n=== TEST 1: CLIENT CONNECTION ===")
    connection_result = await test_with_retry_async(test_client_connection)
    test_results.append(("Client Connection", connection_result))
    
    if not connection_result:
        logger.error("❌ Aborting tests due to connection failure")
        return False
    
    # Test 2: Enhanced entity creation with retry
    logger.info("\n=== TEST 2: ENHANCED ENTITY CREATION ===")
    creation_result = await test_with_retry_async(test_enhanced_entity_creation)
    test_results.append(("Enhanced Entity Creation", creation_result))
    
    # Test 3: Error handling
    logger.info("\n=== TEST 3: ERROR HANDLING ===")
    error_handling_result = await test_error_handling()
    test_results.append(("Error Handling", error_handling_result))
    
    # Results summary
    logger.info("\n" + "=" * 80)
    logger.info("ENHANCED TEST RESULTS SUMMARY")
    logger.info("=" * 80)
    
    all_passed = True
    for test_name, result in test_results:
        status = "PASSED" if result else "FAILED"
        logger.info(f"{test_name}: {status}")
        if not result:
            all_passed = False
    
    overall_result = "ALL TESTS PASSED" if all_passed else "SOME TESTS FAILED"
    logger.info(f"\nOverall Result: {overall_result}")
    logger.info(f"Test completed at: {datetime.now().isoformat()}")
    
    return all_passed

if __name__ == "__main__":
    try:
        success = asyncio.run(main())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        logger.info("\nTests interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Test execution failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)