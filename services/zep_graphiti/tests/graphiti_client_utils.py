#!/usr/bin/env python3
"""
Graphiti Client Utility Module

This module provides a standardized way to use the Graphiti client across all code,
replacing HTTP-based calls with proper client usage patterns.

Usage:
    from graphiti_client_utils import GraphitiClientManager
    
    async with GraphitiClientManager() as client_manager:
        await client_manager.create_entity(name="Test", entity_type="TestType", group_id="test-group")
        entities = await client_manager.search_entities(group_id="test-group")
"""

import asyncio
import logging
import uuid
from pathlib import Path
from typing import Dict, List, Optional, Any
from contextlib import asynccontextmanager

# Import Graphiti components
try:
    from graphiti_core import Graphiti
    from graphiti_core.llm_client import LLMConfig, OpenAIClient
    from graphiti_core.embedder.openai import OpenAIEmbedder, OpenAIEmbedderConfig
    from graphiti_core.driver.neo4j_driver import Neo4jDriver
    from graphiti_core.nodes import EntityNode
except ImportError as e:
    raise ImportError(f"Failed to import Graphiti modules. Ensure Zep Graphiti service is running: {e}")

logger = logging.getLogger(__name__)

class GraphitiClientConfig:
    """Configuration for Graphiti client connections"""
    
    def __init__(self, 
                 neo4j_uri: str = "bolt://localhost:7687",
                 neo4j_user: str = "neo4j",
            openai_base_url: str = "http://localhost:1234/v1",
                 api_key: str = "sk-local",
                 model_name: str = "gpt-3.5-turbo",
                 embedding_model: str = "text-embedding-ada-002",
                 embedding_dim: int = 1536):
        
        self.neo4j_uri = neo4j_uri
        self.neo4j_user = neo4j_user
        self.openai_base_url = openai_base_url
        self.api_key = api_key
        self.model_name = model_name
        self.embedding_model = embedding_model
        self.embedding_dim = embedding_dim
        
        # Load Neo4j password from secrets file
        self.neo4j_password = self._load_neo4j_password()
    
    def _load_neo4j_password(self) -> str:
        """Load Neo4j password from secrets file"""
        try:
            # Try to find secrets file in common locations
            possible_paths = [
                Path(__file__).parent / "secrets" / "neo4j_password.txt",
                Path(__file__).parent.parent / "secrets" / "neo4j_password.txt",
                Path(__file__).parent.parent.parent / "py_zep" / "secrets" / "neo4j_password.txt"
            ]
            
            for path in possible_paths:
                if path.exists():
                    password = path.read_text().strip()
                    logger.debug(f"Loaded Neo4j password from {path}")
                    return password
            
            # Fallback to default password
            logger.warning("Neo4j password file not found, using default password")
            return "password"
            
        except Exception as e:
            logger.error(f"Error loading Neo4j password: {e}")
            return "password"

class GraphitiClientManager:
    """
    Manager for Graphiti client operations with proper resource management.
    
    This class provides a standardized interface for all Graphiti operations,
    ensuring consistent client usage across the codebase.
    """
    
    def __init__(self, config: Optional[GraphitiClientConfig] = None):
        self.config = config or GraphitiClientConfig()
        self.client: Optional[Graphiti] = None
        self._is_initialized = False
    
    async def __aenter__(self):
        """Async context manager entry"""
        await self.initialize()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()
    
    async def initialize(self) -> bool:
        """
        Initialize the Graphiti client with proper configuration.
        
        Returns:
            bool: True if initialization successful, False otherwise
        """
        if self._is_initialized:
            return True
        
        try:
            logger.info("Initializing Graphiti client...")
            
            # Create Neo4j driver
            neo4j_driver = Neo4jDriver(
                uri=self.config.neo4j_uri,
                user=self.config.neo4j_user,
                password=self.config.neo4j_password
            )
            
            # Create LLM client
            llm_config = LLMConfig(
                api_key=self.config.api_key,
                model=self.config.model_name,
                    base_url=self.config.openai_base_url,
            )
            llm_client = OpenAIClient(config=llm_config)
            
            # Create embedder
            embedder_config = OpenAIEmbedderConfig(
                api_key=self.config.api_key,
                    base_url=self.config.openai_base_url,
                embedding_model=self.config.embedding_model,
                embedding_dim=self.config.embedding_dim
            )
            embedder = OpenAIEmbedder(config=embedder_config)
            
            # Initialize Graphiti client
            self.client = Graphiti(
                graph_driver=neo4j_driver,
                llm_client=llm_client,
                embedder=embedder
            )
            
            self._is_initialized = True
            logger.info("✅ Graphiti client initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Graphiti client: {e}")
            self.client = None
            self._is_initialized = False
            return False
    
    async def close(self):
        """Close the Graphiti client and clean up resources"""
        if self.client:
            try:
                await self.client.close()
                logger.debug("Graphiti client closed successfully")
            except Exception as e:
                logger.error(f"Error closing Graphiti client: {e}")
            finally:
                self.client = None
                self._is_initialized = False
    
    def _ensure_initialized(self):
        """Ensure client is initialized before operations"""
        if not self._is_initialized or not self.client:
            raise RuntimeError("Graphiti client not initialized. Use 'async with GraphitiClientManager()' or call initialize() first.")
    
    async def test_connection(self) -> bool:
        """
        Test the connection to Neo4j database.
        
        Returns:
            bool: True if connection successful, False otherwise
        """
        self._ensure_initialized()
        
        try:
            result = await self.client.driver.execute_query("RETURN 'Connection OK' AS message")
            logger.debug("Neo4j connection test successful")
            return True
        except Exception as e:
            logger.error(f"Neo4j connection test failed: {e}")
            return False
    
    async def create_entity(self, 
                          name: str,
                          entity_type: str,
                          group_id: str,
                          summary: Optional[str] = None,
                          entity_uuid: Optional[str] = None,
                          additional_properties: Optional[Dict[str, Any]] = None) -> Optional[str]:
        """
        Create an entity using proper Graphiti client.
        
        Args:
            name: Entity name
            entity_type: Type of entity
            group_id: Group ID for organizing entities
            summary: Optional summary description
            entity_uuid: Optional UUID (will be generated if not provided)
            additional_properties: Optional additional properties
            
        Returns:
            str: UUID of created entity, None if creation failed
        """
        self._ensure_initialized()
        
        try:
            # Generate UUID if not provided
            if not entity_uuid:
                entity_uuid = str(uuid.uuid4())
            
            # Prepare base properties
            properties = {
                "uuid": entity_uuid,
                "name": name,
                "entity_type": entity_type,
                "group_id": group_id,
                "summary": summary or f"Entity {name} of type {entity_type}",
                "created_at": "datetime()"
            }
            
            # Add additional properties if provided
            if additional_properties:
                properties.update(additional_properties)
            
            # Build Cypher query dynamically
            prop_assignments = []
            query_params = {}
            
            for key, value in properties.items():
                if key == "created_at" and value == "datetime()":
                    prop_assignments.append(f"{key}: datetime()")
                else:
                    param_name = f"prop_{key}"
                    prop_assignments.append(f"{key}: ${param_name}")
                    query_params[param_name] = value
            
            query = f"""
            CREATE (e:Entity {{
                {', '.join(prop_assignments)}
            }})
            RETURN e.uuid AS uuid, e.name AS name
            """
            
            result = await self.client.driver.execute_query(query, **query_params)
            
            if result and len(result.records) > 0:
                created_uuid = result.records[0]["uuid"]
                logger.info(f"✅ Entity '{name}' created with UUID: {created_uuid}")
                return created_uuid
            else:
                logger.error(f"❌ Failed to create entity '{name}' - no result returned")
                return None
                
        except Exception as e:
            logger.error(f"❌ Failed to create entity '{name}': {e}")
            return None
    
    async def get_entity(self, entity_uuid: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve an entity by UUID.
        
        Args:
            entity_uuid: UUID of the entity to retrieve
            
        Returns:
            Dict containing entity properties, None if not found
        """
        self._ensure_initialized()
        
        try:
            query = "MATCH (e:Entity {uuid: $uuid}) RETURN e"
            result = await self.client.driver.execute_query(query, uuid=entity_uuid)
            
            if result and len(result.records) > 0:
                entity_node = result.records[0]["e"]
                # Convert Neo4j node to dictionary
                entity_dict = dict(entity_node)
                logger.debug(f"Found entity: {entity_dict.get('name', 'Unknown')}")
                return entity_dict
            else:
                logger.debug(f"Entity with UUID {entity_uuid} not found")
                return None
                
        except Exception as e:
            logger.error(f"Failed to get entity {entity_uuid}: {e}")
            return None
    
    async def search_entities(self, 
                            group_id: Optional[str] = None,
                            entity_type: Optional[str] = None,
                            name_pattern: Optional[str] = None,
                            limit: int = 100) -> List[Dict[str, Any]]:
        """
        Search for entities with optional filters.
        
        Args:
            group_id: Optional group ID filter
            entity_type: Optional entity type filter
            name_pattern: Optional name pattern (supports CONTAINS)
            limit: Maximum number of results
            
        Returns:
            List of entity dictionaries
        """
        self._ensure_initialized()
        
        try:
            # Build query with optional filters
            where_clauses = []
            query_params = {"limit": limit}
            
            if group_id:
                where_clauses.append("e.group_id = $group_id")
                query_params["group_id"] = group_id
            
            if entity_type:
                where_clauses.append("e.entity_type = $entity_type")
                query_params["entity_type"] = entity_type
            
            if name_pattern:
                where_clauses.append("e.name CONTAINS $name_pattern")
                query_params["name_pattern"] = name_pattern
            
            where_clause = " AND ".join(where_clauses)
            if where_clause:
                where_clause = "WHERE " + where_clause
            
            query = f"""
            MATCH (e:Entity)
            {where_clause}
            RETURN e
            LIMIT $limit
            """
            
            result = await self.client.driver.execute_query(query, **query_params)
            
            entities = []
            if result:
                for record in result.records:
                    entity_node = record["e"]
                    entity_dict = dict(entity_node)
                    entities.append(entity_dict)
            
            logger.debug(f"Found {len(entities)} entities matching criteria")
            return entities
            
        except Exception as e:
            logger.error(f"Failed to search entities: {e}")
            return []
    
    async def delete_entity(self, entity_uuid: str) -> bool:
        """
        Delete an entity by UUID.
        
        Args:
            entity_uuid: UUID of the entity to delete
            
        Returns:
            bool: True if deletion successful, False otherwise
        """
        self._ensure_initialized()
        
        try:
            query = "MATCH (e:Entity {uuid: $uuid}) DELETE e"
            result = await self.client.driver.execute_query(query, uuid=entity_uuid)
            
            logger.debug(f"Entity {entity_uuid} deleted")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete entity {entity_uuid}: {e}")
            return False
    
    async def delete_entities_by_group(self, group_id: str) -> int:
        """
        Delete all entities in a group.
        
        Args:
            group_id: Group ID of entities to delete
            
        Returns:
            int: Number of entities deleted
        """
        self._ensure_initialized()
        
        try:
            query = """
            MATCH (e:Entity {group_id: $group_id})
            DELETE e
            RETURN count(e) AS deleted_count
            """
            result = await self.client.driver.execute_query(query, group_id=group_id)
            
            # Note: The count in the RETURN won't work with DELETE, so we'll check another way
            # Let's count before deletion
            count_query = "MATCH (e:Entity {group_id: $group_id}) RETURN count(e) AS count"
            count_result = await self.client.driver.execute_query(count_query, group_id=group_id)
            count = count_result.records[0]["count"] if count_result.records else 0
            
            # Now delete
            delete_query = "MATCH (e:Entity {group_id: $group_id}) DELETE e"
            await self.client.driver.execute_query(delete_query, group_id=group_id)
            
            logger.info(f"Deleted {count} entities from group '{group_id}'")
            return count
            
        except Exception as e:
            logger.error(f"Failed to delete entities from group {group_id}: {e}")
            return 0

# Convenience functions for common operations
@asynccontextmanager
async def get_graphiti_client(config: Optional[GraphitiClientConfig] = None):
    """
    Async context manager for getting a Graphiti client.
    
    Usage:
        async with get_graphiti_client() as client_manager:
            await client_manager.create_entity(...)
    """
    manager = GraphitiClientManager(config)
    try:
        await manager.initialize()
        yield manager
    finally:
        await manager.close()

async def create_entity_simple(name: str, entity_type: str, group_id: str, **kwargs) -> Optional[str]:
    """
    Convenience function to create an entity with minimal setup.
    
    Args:
        name: Entity name
        entity_type: Entity type
        group_id: Group ID
        **kwargs: Additional properties
        
    Returns:
        str: UUID of created entity, None if failed
    """
    async with get_graphiti_client() as client_manager:
        return await client_manager.create_entity(
            name=name,
            entity_type=entity_type,
            group_id=group_id,
            additional_properties=kwargs
        )

async def search_entities_simple(group_id: Optional[str] = None, **filters) -> List[Dict[str, Any]]:
    """
    Convenience function to search entities with minimal setup.
    
    Args:
        group_id: Optional group ID filter
        **filters: Additional filters (entity_type, name_pattern, etc.)
        
    Returns:
        List of entity dictionaries
    """
    async with get_graphiti_client() as client_manager:
        return await client_manager.search_entities(group_id=group_id, **filters)

# Example usage and testing
if __name__ == "__main__":
    async def example_usage():
        """Example of how to use the GraphitiClientManager"""
        
        print("Graphiti Client Utility - Example Usage")
        print("=" * 50)
        
        # Method 1: Using context manager (recommended)
        async with get_graphiti_client() as client_manager:
            # Test connection
            if await client_manager.test_connection():
                print("✅ Connection test successful")
                
                # Create test entities
                test_group = f"example-group-{int(asyncio.get_event_loop().time())}"
                
                entity1_uuid = await client_manager.create_entity(
                    name="Example Entity 1",
                    entity_type="ExampleType",
                    group_id=test_group,
                    summary="First example entity"
                )
                
                entity2_uuid = await client_manager.create_entity(
                    name="Example Entity 2", 
                    entity_type="ExampleType",
                    group_id=test_group,
                    summary="Second example entity"
                )
                
                if entity1_uuid and entity2_uuid:
                    print(f"✅ Created entities: {entity1_uuid}, {entity2_uuid}")
                    
                    # Search entities
                    entities = await client_manager.search_entities(group_id=test_group)
                    print(f"✅ Found {len(entities)} entities in group")
                    
                    # Clean up
                    deleted_count = await client_manager.delete_entities_by_group(test_group)
                    print(f"✅ Cleaned up {deleted_count} entities")
                
            else:
                print("❌ Connection test failed")
        
        # Method 2: Using convenience functions
        print("\nUsing convenience functions:")
        test_group_2 = f"convenience-group-{int(asyncio.get_event_loop().time())}"
        
        entity_uuid = await create_entity_simple(
            name="Convenience Entity",
            entity_type="ConvenienceType", 
            group_id=test_group_2
        )
        
        if entity_uuid:
            print(f"✅ Created entity via convenience function: {entity_uuid}")
            
            entities = await search_entities_simple(group_id=test_group_2)
            print(f"✅ Found {len(entities)} entities via convenience function")
    
    # Run example
    asyncio.run(example_usage())