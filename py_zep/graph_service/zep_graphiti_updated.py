"""
Updated Zep Graphiti implementation following best practices from Context7 documentation.

This implementation uses the proper Graphiti client initialization patterns,
proper LLM client configuration, and embedder setup as recommended in the
official Graphiti documentation.
"""

import logging
import os
from typing import Annotated

from fastapi import Depends, HTTPException
from graphiti_core import Graphiti
from graphiti_core.edges import EntityEdge
from graphiti_core.errors import EdgeNotFoundError, GroupsEdgesNotFoundError, NodeNotFoundError
from graphiti_core.nodes import EntityNode, EpisodicNode
from graphiti_core.llm_client import LLMConfig, OpenAIClient
from graphiti_core.embedder.openai import OpenAIEmbedder, OpenAIEmbedderConfig
from graphiti_core.driver.neo4j_driver import Neo4jDriver

from graph_service.config import ZepEnvDep
from graph_service.dto import FactResult

logger = logging.getLogger(__name__)


class ZepGraphitiBestPractice(Graphiti):
    """
    Zep Graphiti implementation following official best practices.
    
    This class uses proper Graphiti initialization patterns with:
    - Neo4jDriver for database connections
    - Proper LLM client configuration 
    - Proper embedder configuration
    - Clean configuration management
    """
    
    def __init__(
        self, 
        neo4j_driver: Neo4jDriver,
        llm_client: OpenAIClient | None = None,
        embedder: OpenAIEmbedder | None = None
    ):
        """Initialize with proper driver and client configurations."""
        super().__init__(
            graph_driver=neo4j_driver,
            llm_client=llm_client,
            embedder=embedder
        )

    async def save_entity_node(self, name: str, uuid: str, group_id: str, summary: str = ''):
        """Save entity node with proper error handling and logging."""
        logger.debug("Creating entity node", extra={
            "op": "save_entity_node",
            "name": name,
            "uuid": uuid,
            "group_id": group_id,
        })
        
        new_node = EntityNode(
            name=name,
            uuid=uuid,
            group_id=group_id,
            summary=summary,
        )
        
        try:
            logger.debug("Generating name embedding", extra={"uuid": uuid})
            await new_node.generate_name_embedding(self.embedder)
            logger.debug("Name embedding generated", extra={"uuid": uuid})
            
            logger.debug("Saving node", extra={"uuid": uuid})
            await new_node.save(self.driver)
            logger.debug("Node saved", extra={"uuid": uuid})
            
            return new_node
            
        except Exception as e:
            logger.exception("Failed to save entity node", extra={
                "uuid": uuid,
                "error": str(e),
                "error_type": str(type(e)),
            })
            raise

    async def get_entity_edge(self, uuid: str):
        """Get entity edge by UUID with proper error handling."""
        try:
            edge = await EntityEdge.get_by_uuid(self.driver, uuid)
            return edge
        except EdgeNotFoundError as e:
            raise HTTPException(status_code=404, detail=e.message) from e

    async def delete_group(self, group_id: str):
        """Delete all entities in a group."""
        try:
            edges = await EntityEdge.get_by_group_ids(self.driver, [group_id])
        except GroupsEdgesNotFoundError:
            logger.warning(f'No edges found for group {group_id}')
            edges = []

        nodes = await EntityNode.get_by_group_ids(self.driver, [group_id])
        episodes = await EpisodicNode.get_by_group_ids(self.driver, [group_id])

        for edge in edges:
            await edge.delete(self.driver)

        for node in nodes:
            await node.delete(self.driver)

        for episode in episodes:
            await episode.delete(self.driver)

    async def delete_entity_edge(self, uuid: str):
        """Delete entity edge by UUID."""
        try:
            edge = await EntityEdge.get_by_uuid(self.driver, uuid)
            await edge.delete(self.driver)
        except EdgeNotFoundError as e:
            raise HTTPException(status_code=404, detail=e.message) from e

    async def delete_episodic_node(self, uuid: str):
        """Delete episodic node by UUID."""
        try:
            episode = await EpisodicNode.get_by_uuid(self.driver, uuid)
            await episode.delete(self.driver)
        except NodeNotFoundError as e:
            raise HTTPException(status_code=404, detail=e.message) from e


def create_neo4j_driver(settings: ZepEnvDep) -> Neo4jDriver:
    """Create Neo4j driver with proper configuration."""
    return Neo4jDriver(
        uri=settings.neo4j_uri,
        user=settings.neo4j_user,
        password=settings.neo4j_password,
        # Optional: specify custom database if needed
        # database="custom_db_name"
    )


def create_llm_client(settings: ZepEnvDep) -> OpenAIClient:
    """Create LLM client with proper configuration."""
    llm_config = LLMConfig(
        api_key=settings.openai_api_key,
        model=settings.model_name or "gpt-4o-mini",
        small_model=settings.model_name or "gpt-4o-mini",
        base_url=settings.openai_base_url,
    )
    
    return OpenAIClient(config=llm_config)


def create_embedder(settings: ZepEnvDep) -> OpenAIEmbedder:
    """Create embedder with proper configuration."""
    # Prefer OPEN_AI_KEY env var if available (compatibility with existing setup)
    api_key = os.getenv('OPEN_AI_KEY') or settings.openai_api_key
    
    embedder_config = OpenAIEmbedderConfig(
        api_key=api_key,
        embedding_model=settings.embedding_model_name or "text-embedding-3-small",
        embedding_dim=1536,  # Standard dimension for text-embedding-3-small
        base_url=settings.openai_base_url,
    )
    
    return OpenAIEmbedder(config=embedder_config)


async def get_graphiti_best_practice(settings: ZepEnvDep) -> ZepGraphitiBestPractice:
    """
    Create Graphiti client using best practices from Context7 documentation.
    
    This function follows the recommended patterns for:
    - Driver initialization with proper configuration
    - LLM client setup with proper config
    - Embedder configuration with proper settings
    - Clean separation of concerns
    """
    logger.info("Initializing Graphiti with best practices")
    
    # Create driver with proper configuration
    driver = create_neo4j_driver(settings)
    
    # Create LLM client with proper configuration
    llm_client = create_llm_client(settings)
    
    # Create embedder with proper configuration
    embedder = create_embedder(settings)
    
    # Initialize Graphiti with all components
    client = ZepGraphitiBestPractice(
        neo4j_driver=driver,
        llm_client=llm_client,
        embedder=embedder
    )
    
    logger.info("Graphiti client initialized successfully with best practices")
    return client


async def initialize_graphiti_best_practice(settings: ZepEnvDep):
    """Initialize Graphiti with indices and constraints using best practices."""
    client = await get_graphiti_best_practice(settings)
    await client.build_indices_and_constraints()
    await client.close()


def get_fact_result_from_edge(edge: EntityEdge) -> FactResult:
    """Convert EntityEdge to FactResult DTO."""
    return FactResult(
        uuid=edge.uuid,
        name=edge.name,
        fact=edge.fact,
        valid_at=edge.valid_at if edge.valid_at is not None else edge.created_at,
        invalid_at=edge.invalid_at,
        created_at=edge.created_at,
        expired_at=edge.expired_at,
    )


# Dependency for FastAPI
ZepGraphitiBestPracticeDep = Annotated[ZepGraphitiBestPractice, Depends(get_graphiti_best_practice)]