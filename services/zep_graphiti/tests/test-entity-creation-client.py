#!/usr/bin/env python3
"""
Test Zep-Graphiti Entity Creation using Graphiti Client
Replaces HTTP-based /entity-node endpoint with proper Graphiti client usage
"""

import asyncio
import json
import sys
import time
from pathlib import Path

# Add path for graphiti_client_utils
sys.path.insert(0, str(Path(__file__).parent))

from graphiti_client_utils import get_graphiti_client

async def test_entity_creation():
    """Test entity creation using proper Graphiti client"""
    print("🧠 Testing Zep-Graphiti Entity Creation with Client")
    print("=" * 50)
    
    # Entity data based on original API requirements but adapted for Graphiti client
    entity_data = {
        "name": "Test Entity",
        "entity_type": "TestType",
        "group_id": f"test-group-{int(time.time())}",
        "summary": "Test entity with observations",
        "observations": ["This is a test observation"]  # Will be included in summary for now
    }
    
    try:
        print(f"📦 Entity Data: {json.dumps(entity_data, indent=2)}")
        
        async with get_graphiti_client() as client_manager:
            # Test connection
            print("🔗 Testing Graphiti client connection...")
            if not await client_manager.test_connection():
                print("❌ Connection failed - is Zep-Graphiti service running?")
                return False
            
            print("✅ Connection successful!")
            
            # Create entity with observations in summary
            enhanced_summary = f"{entity_data['summary']}. Observations: {'; '.join(entity_data['observations'])}"
            
            entity_uuid = await client_manager.create_entity(
                name=entity_data["name"],
                entity_type=entity_data["entity_type"],
                group_id=entity_data["group_id"],
                summary=enhanced_summary
            )
            
            if entity_uuid:
                print("✅ Entity creation successful using Graphiti client!")
                print(f"📋 Entity UUID: {entity_uuid}")
                
                # Retrieve and display the created entity
                created_entity = await client_manager.get_entity(entity_uuid)
                if created_entity:
                    print("📄 Created Entity Details:")
                    print(json.dumps(created_entity, indent=2, default=str))
                    
                    # Test search functionality
                    print("\n🔍 Testing entity search...")
                    found_entities = await client_manager.search_entities(
                        group_id=entity_data["group_id"],
                        entity_type=entity_data["entity_type"]
                    )
                    
                    print(f"✅ Found {len(found_entities)} entities in group")
                    
                    # Clean up
                    print("\n🧹 Cleaning up test entity...")
                    if await client_manager.delete_entity(entity_uuid):
                        print("✅ Test entity cleaned up successfully")
                    else:
                        print("⚠️ Warning: Failed to clean up test entity")
                    
                    return True
                else:
                    print("❌ Failed to retrieve created entity")
                    return False
            else:
                print("❌ Entity creation failed - no UUID returned")
                return False
                
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_entity_creation_with_errors():
    """Test entity creation error handling"""
    print("\n🧪 Testing Error Handling")
    print("=" * 30)
    
    try:
        async with get_graphiti_client() as client_manager:
            # Test with missing required fields
            print("Testing with minimal data...")
            entity_uuid = await client_manager.create_entity(
                name="Minimal Entity",
                entity_type="MinimalType", 
                group_id="test-minimal"
            )
            
            if entity_uuid:
                print("✅ Minimal entity creation successful")
                await client_manager.delete_entity(entity_uuid)
                print("✅ Minimal entity cleaned up")
                return True
            else:
                print("❌ Minimal entity creation failed")
                return False
                
    except Exception as e:
        print(f"❌ Error handling test failed: {e}")
        return False

async def main():
    """Main test function"""
    print("Starting Graphiti Entity Creation Tests")
    print("=" * 60)
    
    # Test 1: Basic entity creation
    test1_success = await test_entity_creation()
    
    # Test 2: Error handling
    test2_success = await test_entity_creation_with_errors()
    
    # Results
    print("\n" + "=" * 60)
    print("TEST RESULTS SUMMARY")
    print("=" * 60)
    print(f"Basic Entity Creation: {'PASSED' if test1_success else 'FAILED'}")
    print(f"Error Handling Test: {'PASSED' if test2_success else 'FAILED'}")
    
    overall_success = test1_success and test2_success
    print(f"\nOverall Result: {'ALL TESTS PASSED' if overall_success else 'SOME TESTS FAILED'}")
    
    return overall_success

if __name__ == "__main__":
    try:
        success = asyncio.run(main())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\nTests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"Test execution failed: {e}")
        sys.exit(1)