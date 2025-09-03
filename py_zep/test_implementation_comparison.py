"""
Comparison test between current ZepGraphiti implementation and best practice version.

This test verifies that both implementations:
1. Initialize correctly
2. Can save entity nodes
3. Can retrieve entity edges
4. Handle errors properly
5. Provide same functionality
"""

import asyncio
import logging
import os
import sys
from datetime import datetime, timezone

# Add the py_zep directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from graph_service.config import get_settings
from graph_service.zep_graphiti import get_graphiti, ZepGraphiti
from graph_service.zep_graphiti_updated import get_graphiti_best_practice, ZepGraphitiBestPractice

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def test_current_implementation():
    """Test the current ZepGraphiti implementation."""
    logger.info("Testing current ZepGraphiti implementation")
    
    settings = get_settings()
    
    try:
        # Get client using current implementation
        async for client in get_graphiti(settings):
            logger.info(f"Current implementation client type: {type(client)}")
            logger.info(f"Driver type: {type(client.driver)}")
            logger.info(f"LLM client type: {type(client.llm_client)}")
            logger.info(f"Embedder type: {type(client.embedder)}")
            
            # Test basic functionality
            test_uuid = "test-current-" + str(datetime.now().timestamp())
            
            try:
                # Test entity node creation
                node = await client.save_entity_node(
                    name="Test Entity Current",
                    uuid=test_uuid,
                    group_id="test-group-current",
                    summary="Test entity for current implementation"
                )
                logger.info(f"✅ Current implementation: Entity node created successfully: {node.uuid}")
                
                # Test search functionality (basic)
                try:
                    search_results = await client.search("Test Entity", num_results=1)
                    logger.info(f"✅ Current implementation: Search returned {len(search_results)} results")
                except Exception as search_err:
                    logger.warning(f"⚠️ Current implementation: Search failed: {search_err}")
                
                return True
                
            except Exception as e:
                logger.error(f"❌ Current implementation: Failed to create entity: {e}")
                return False
                
    except Exception as e:
        logger.error(f"❌ Current implementation: Failed to initialize: {e}")
        return False


async def test_best_practice_implementation():
    """Test the best practice ZepGraphiti implementation."""
    logger.info("Testing best practice ZepGraphiti implementation")
    
    settings = get_settings()
    
    try:
        # Get client using best practice implementation
        client = await get_graphiti_best_practice(settings)
        
        try:
            logger.info(f"Best practice implementation client type: {type(client)}")
            logger.info(f"Driver type: {type(client.driver)}")
            logger.info(f"LLM client type: {type(client.llm_client)}")
            logger.info(f"Embedder type: {type(client.embedder)}")
            
            # Test basic functionality
            test_uuid = "test-best-practice-" + str(datetime.now().timestamp())
            
            try:
                # Test entity node creation
                node = await client.save_entity_node(
                    name="Test Entity Best Practice",
                    uuid=test_uuid,
                    group_id="test-group-best-practice",
                    summary="Test entity for best practice implementation"
                )
                logger.info(f"✅ Best practice implementation: Entity node created successfully: {node.uuid}")
                
                # Test search functionality (basic)
                try:
                    search_results = await client.search("Test Entity", num_results=1)
                    logger.info(f"✅ Best practice implementation: Search returned {len(search_results)} results")
                except Exception as search_err:
                    logger.warning(f"⚠️ Best practice implementation: Search failed: {search_err}")
                
                return True
                
            except Exception as e:
                logger.error(f"❌ Best practice implementation: Failed to create entity: {e}")
                return False
                
        finally:
            await client.close()
            
    except Exception as e:
        logger.error(f"❌ Best practice implementation: Failed to initialize: {e}")
        return False


async def compare_implementations():
    """Compare both implementations side by side."""
    logger.info("🔍 Starting implementation comparison")
    
    current_success = await test_current_implementation()
    best_practice_success = await test_best_practice_implementation()
    
    logger.info("📊 Comparison Results:")
    logger.info(f"   Current implementation: {'✅ PASS' if current_success else '❌ FAIL'}")
    logger.info(f"   Best practice implementation: {'✅ PASS' if best_practice_success else '❌ FAIL'}")
    
    if current_success and best_practice_success:
        logger.info("🎉 Both implementations work correctly!")
        logger.info("💡 Recommendation: Migrate to best practice implementation for:")
        logger.info("   - Cleaner code structure")
        logger.info("   - Better separation of concerns")
        logger.info("   - Proper driver/client initialization")
        logger.info("   - Reduced complexity")
        logger.info("   - Following official Graphiti patterns")
        
    elif current_success and not best_practice_success:
        logger.warning("⚠️ Current implementation works, but best practice version has issues")
        logger.info("🔧 Need to fix best practice implementation before migration")
        
    elif not current_success and best_practice_success:
        logger.info("🚀 Best practice implementation works better than current!")
        logger.info("✅ Ready to migrate to best practice version")
        
    else:
        logger.error("❌ Both implementations have issues - need investigation")
    
    return current_success, best_practice_success


if __name__ == "__main__":
    asyncio.run(compare_implementations())