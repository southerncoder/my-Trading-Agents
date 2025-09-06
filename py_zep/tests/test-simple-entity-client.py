#!/usr/bin/env python3
"""
Simple entity creation test using Graphiti Client
Replaces HTTP-based calls with proper Graphiti client usage
"""

import asyncio
import json
import sys
import time
from pathlib import Path

# Add path for graphiti_client_utils
sys.path.insert(0, str(Path(__file__).parent))

from graphiti_client_utils import get_graphiti_client

async def test_simple_entity():
    """Test basic entity creation using Graphiti client"""
    print("Testing simple entity creation with Graphiti client...")
    
    # Test data for entity creation
    entity_data = {
        "name": "NetworkingTestEntity",
        "entity_type": "TestEntity",
        "group_id": "test-group-networking",
        "summary": "This is a test entity created using proper Graphiti client after fixing networking",
        "entity_uuid": "test-networking-entity-001"
    }
    
    try:
        async with get_graphiti_client() as client_manager:
            # Test connection first
            if not await client_manager.test_connection():
                print("FAILED: Cannot connect to Neo4j database")
                return False
            
            print("SUCCESS: Connected to Neo4j database")
            
            # Create entity using Graphiti client
            entity_uuid = await client_manager.create_entity(
                name=entity_data["name"],
                entity_type=entity_data["entity_type"],
                group_id=entity_data["group_id"],
                summary=entity_data["summary"],
                entity_uuid=entity_data["entity_uuid"]
            )
            
            if entity_uuid:
                print("SUCCESS: Entity created successfully using Graphiti client")
                print(f"Entity UUID: {entity_uuid}")
                
                # Verify entity exists
                created_entity = await client_manager.get_entity(entity_uuid)
                if created_entity:
                    print("SUCCESS: Entity verified in database")
                    print(f"Entity details: {json.dumps(created_entity, indent=2, default=str)}")
                    
                    # Clean up - delete the test entity
                    if await client_manager.delete_entity(entity_uuid):
                        print("SUCCESS: Test entity cleaned up")
                    else:
                        print("WARNING: Failed to clean up test entity")
                    
                    return True
                else:
                    print("FAILED: Created entity not found in database")
                    return False
            else:
                print("FAILED: Entity creation returned None")
                return False
                
    except Exception as e:
        print(f"UNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Main test function"""
    success = await test_simple_entity()
    print(f"\nTest result: {'PASSED' if success else 'FAILED'}")
    return success

if __name__ == "__main__":
    try:
        success = asyncio.run(main())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"Test execution failed: {e}")
        sys.exit(1)