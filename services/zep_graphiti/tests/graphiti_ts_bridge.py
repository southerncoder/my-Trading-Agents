#!/usr/bin/env python3
"""
TypeScript-compatible Graphiti Client Utilities for Node.js
Bridge between TypeScript trading agents and Python Graphiti client
"""

import asyncio
import json
import sys
from pathlib import Path
from typing import List, Dict, Any, Optional

# Add path for graphiti_client_utils
sys.path.insert(0, str(Path(__file__).parent))

from graphiti_client_utils import get_graphiti_client

class GraphitiServiceBridge:
    """Bridge between TypeScript and Python Graphiti client"""
    
    def __init__(self):
        self.client_context = None
        self.client_manager = None
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.client_context = get_graphiti_client()
        self.client_manager = await self.client_context.__aenter__()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.client_context:
            await self.client_context.__aexit__(exc_type, exc_val, exc_tb)
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test connection and return health status"""
        try:
            if not self.client_manager:
                return {"status": "error", "message": "Client not initialized"}
            
            connected = await self.client_manager.test_connection()
            return {
                "status": "healthy" if connected else "unhealthy",
                "graphiti_initialized": connected,
                "neo4j_connected": connected
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    async def add_episode(self, group_id: str, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Add episode/messages to the knowledge graph"""
        try:
            if not self.client_manager:
                return {"success": False, "error": "Client not initialized"}
            
            # Process messages and create entity or episode content
            for message in messages:
                content = message.get('content', '')
                name = message.get('name', 'Trading Episode')
                
                # Create entity for this episode content
                entity_uuid = await self.client_manager.create_entity(
                    name=name,
                    entity_type="TradingEpisode",
                    group_id=group_id,
                    summary=content
                )
                
                if not entity_uuid:
                    return {"success": False, "error": "Failed to create episode entity"}
            
            return {"success": True, "message": "Episode added successfully"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def create_entity_node(self, uuid: str, group_id: str, name: str, summary: str) -> Dict[str, Any]:
        """Create entity node"""
        try:
            if not self.client_manager:
                return {"success": False, "error": "Client not initialized"}
            
            entity_uuid = await self.client_manager.create_entity(
                name=name,
                entity_type="CustomEntity",
                group_id=group_id,
                summary=summary
            )
            
            if entity_uuid:
                return {"success": True, "uuid": entity_uuid}
            else:
                return {"success": False, "error": "Failed to create entity"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def search_memories(self, query: str, max_results: int = 10, center_node_uuid: Optional[str] = None) -> Dict[str, Any]:
        """Search for memories in the knowledge graph"""
        try:
            if not self.client_manager:
                return {"facts": [], "total_results": 0, "query": query}
            
            # Use entity search functionality
            entities = await self.client_manager.search_entities(
                group_id="default",  # Use default group for search
                entity_type=None     # Search all entity types
            )
            
            # Convert entities to fact-like format for compatibility
            facts = []
            for entity in entities[:max_results]:
                facts.append({
                    "fact": entity.get('summary', ''),
                    "confidence": 0.8,  # Default confidence
                    "timestamp": entity.get('created_at', ''),
                    "source_entity": entity.get('name', ''),
                    "metadata": {
                        "entity_type": entity.get('entity_type', ''),
                        "group_id": entity.get('group_id', ''),
                        "uuid": entity.get('uuid', '')
                    }
                })
            
            return {
                "facts": facts,
                "total_results": len(facts),
                "query": query
            }
        except Exception as e:
            return {"facts": [], "total_results": 0, "query": query, "error": str(e)}

async def handle_request(operation: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """Handle TypeScript requests to Graphiti service"""
    try:
        async with GraphitiServiceBridge() as bridge:
            if operation == "healthcheck":
                return await bridge.test_connection()
            elif operation == "messages":
                return await bridge.add_episode(
                    params.get('group_id', 'default'),
                    params.get('messages', [])
                )
            elif operation == "entity-node":
                return await bridge.create_entity_node(
                    params.get('uuid', ''),
                    params.get('group_id', 'default'),
                    params.get('name', ''),
                    params.get('summary', '')
                )
            elif operation == "search":
                return await bridge.search_memories(
                    params.get('query', ''),
                    params.get('max_results', 10),
                    params.get('center_node_uuid')
                )
            else:
                return {"error": f"Unknown operation: {operation}"}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    # Command line interface for TypeScript integration
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing operation parameter"}))
        sys.exit(1)
    
    operation = sys.argv[1]
    params = {}
    
    if len(sys.argv) > 2:
        try:
            params = json.loads(sys.argv[2])
        except json.JSONDecodeError:
            print(json.dumps({"error": "Invalid JSON parameters"}))
            sys.exit(1)
    
    try:
        result = asyncio.run(handle_request(operation, params))
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)