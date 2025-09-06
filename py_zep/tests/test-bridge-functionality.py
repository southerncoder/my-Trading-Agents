#!/usr/bin/env python3
"""
Test script for the TypeScript bridge
"""

import asyncio
import json
import sys
from pathlib import Path

# Add path for graphiti_client_utils
sys.path.insert(0, str(Path(__file__).parent))

from graphiti_ts_bridge import handle_request

async def test_bridge():
    print("🧠 Testing Graphiti TypeScript Bridge")
    print("=" * 50)
    
    # Test 1: Health check
    print("1. Testing health check...")
    health_result = await handle_request("healthcheck", {})
    print(f"Health: {json.dumps(health_result, indent=2)}")
    
    if health_result.get("status") != "healthy":
        print("❌ Health check failed")
        return False
    
    print("✅ Health check passed")
    
    # Test 2: Add episode
    print("\n2. Testing episode creation...")
    episode_params = {
        "group_id": "test-bridge-group",
        "messages": [
            {
                "content": "Testing bridge episode functionality",
                "name": "Bridge Test Episode",
                "role": "trading_agent",
                "role_type": "assistant"
            }
        ]
    }
    
    episode_result = await handle_request("messages", episode_params)
    print(f"Episode: {json.dumps(episode_result, indent=2)}")
    
    if not episode_result.get("success"):
        print("❌ Episode creation failed")
        return False
    
    print("✅ Episode creation passed")
    
    # Test 3: Entity creation
    print("\n3. Testing entity node creation...")
    entity_params = {
        "uuid": f"test-entity-{int(asyncio.get_event_loop().time())}",
        "group_id": "test-bridge-group",
        "name": "Test Bridge Entity",
        "summary": "Entity created through TypeScript bridge"
    }
    
    entity_result = await handle_request("entity-node", entity_params)
    print(f"Entity: {json.dumps(entity_result, indent=2)}")
    
    if not entity_result.get("success"):
        print("❌ Entity creation failed")
        return False
    
    print("✅ Entity creation passed")
    
    # Test 4: Search
    print("\n4. Testing memory search...")
    search_params = {
        "query": "bridge test",
        "max_results": 5
    }
    
    search_result = await handle_request("search", search_params)
    print(f"Search: {json.dumps(search_result, indent=2)}")
    
    print("✅ Search completed (results may be empty for new entities)")
    
    print("\n" + "=" * 50)
    print("🎉 ALL BRIDGE TESTS PASSED!")
    print("✅ TypeScript bridge is working correctly")
    print("✅ Ready for TypeScript integration")
    print("=" * 50)
    
    return True

if __name__ == "__main__":
    try:
        success = asyncio.run(test_bridge())
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"❌ Bridge test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)