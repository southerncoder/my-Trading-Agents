"""
Zep Graphiti HTTP Service
Provides REST API for temporal knowledge graph operations using Graphiti
"""

import os
import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from graphiti_core import Graphiti
from graphiti_core.nodes import EpisodeType
from graphiti_core.edges import EntityEdge
from graphiti_core.llm_client.openai_client import OpenAIClient
from graphiti_core.llm_client.config import LLMConfig
from graphiti_core.embedder.openai import OpenAIEmbedder, OpenAIEmbedderConfig
from graphiti_core.cross_encoder.openai_reranker_client import OpenAIRerankerClient

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Global Graphiti client
graphiti_client: Optional[Graphiti] = None


class EpisodeRequest(BaseModel):
    """Request model for adding episodes"""
    name: str
    content: str
    episode_type: str = Field(default="text", description="Type of episode: text, json, message, event")
    source_description: Optional[str] = Field(default="Trading Agent", description="Description of the source")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class SearchRequest(BaseModel):
    """Request model for searching the graph"""
    query: str
    max_results: Optional[int] = Field(default=10, ge=1, le=100)
    center_node_uuid: Optional[str] = None


class FactRequest(BaseModel):
    """Request model for adding facts"""
    source_entity: str
    target_entity: str
    relationship: str
    confidence: Optional[float] = Field(default=1.0, ge=0.0, le=1.0)
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class SearchResponse(BaseModel):
    """Response model for search results"""
    facts: List[Dict[str, Any]]
    total_results: int
    query: str
    center_node_uuid: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    graphiti_initialized: bool
    neo4j_connected: bool
    timestamp: datetime


async def initialize_graphiti() -> Graphiti:
    """Initialize Graphiti client with LM Studio configuration"""
    try:
        # Configure LLM client for LM Studio
        llm_config = LLMConfig(
            api_key=os.getenv("OPENAI_API_KEY", "lm-studio"),
            base_url=os.getenv("OPENAI_BASE_URL", "http://localhost:1234/v1"),
            model=os.getenv("OPENAI_MODEL", "microsoft/phi-4-mini-reasoning"),
            small_model=os.getenv("OPENAI_MODEL", "microsoft/phi-4-mini-reasoning"),
        )
        
        llm_client = OpenAIClient(config=llm_config)
        
        # Configure embeddings (use same LM Studio endpoint)
        embedder_config = OpenAIEmbedderConfig(
            api_key=llm_config.api_key,
            base_url=llm_config.base_url,
            embedding_model="text-embedding-nomic-embed-text-v1.5",  # Available in LM Studio
            embedding_dim=768  # Nomic embed text v1.5 dimension
        )
        
        embedder = OpenAIEmbedder(config=embedder_config)
        
        # Configure cross-encoder (reranker)
        cross_encoder = OpenAIRerankerClient(
            client=llm_client,
            config=llm_config
        )
        
        # Initialize Graphiti with Neo4j
        neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        neo4j_user = os.getenv("NEO4J_USER", "neo4j")
        neo4j_password = os.getenv("NEO4J_PASSWORD", "password")
        
        client = Graphiti(
            neo4j_uri,
            neo4j_user,
            neo4j_password,
            llm_client=llm_client,
            embedder=embedder,
            cross_encoder=cross_encoder
        )
        
        # Build indices and constraints
        await client.build_indices_and_constraints()
        
        logger.info("Graphiti client initialized successfully")
        return client
        
    except Exception as e:
        logger.error(f"Failed to initialize Graphiti: {e}")
        raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager"""
    global graphiti_client
    
    # Startup
    logger.info("Starting Zep Graphiti service...")
    try:
        graphiti_client = await initialize_graphiti()
        logger.info("Service started successfully")
        yield
    except Exception as e:
        logger.error(f"Failed to start service: {e}")
        raise
    finally:
        # Shutdown
        logger.info("Shutting down Zep Graphiti service...")
        if graphiti_client:
            try:
                # Close any open connections
                pass  # Graphiti doesn't expose explicit close method
            except Exception as e:
                logger.error(f"Error during shutdown: {e}")


# Create FastAPI app
app = FastAPI(
    title="Zep Graphiti Service",
    description="HTTP API for Graphiti temporal knowledge graph operations",
    version="0.1.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    neo4j_connected = False
    graphiti_initialized = graphiti_client is not None
    
    if graphiti_client:
        try:
            # Test Neo4j connection
            # This is a simple way to check if the connection works
            await graphiti_client.search("test", num_results=1)
            neo4j_connected = True
        except Exception as e:
            logger.warning(f"Neo4j connection test failed: {e}")
    
    return HealthResponse(
        status="healthy" if graphiti_initialized and neo4j_connected else "degraded",
        graphiti_initialized=graphiti_initialized,
        neo4j_connected=neo4j_connected,
        timestamp=datetime.now(timezone.utc)
    )


@app.post("/memory/add")
async def add_episode(request: EpisodeRequest, background_tasks: BackgroundTasks):
    """Add an episode to the knowledge graph"""
    if not graphiti_client:
        raise HTTPException(status_code=503, detail="Graphiti client not initialized")
    
    try:
        # Debug logging
        logger.info(f"Received episode request: name={request.name}, episode_type={request.episode_type}")
        
        # Map episode type string to EpisodeType enum
        episode_type_map = {
            "text": EpisodeType.text,
            "json": EpisodeType.json,
            "message": EpisodeType.message,
            "event": EpisodeType.event
        }
        
        episode_type = episode_type_map.get(request.episode_type.lower(), EpisodeType.text)
        logger.info(f"Mapped episode type: {request.episode_type} -> {episode_type}")
        
        # Add episode synchronously for better error handling during development
        await graphiti_client.add_episode(
            name=request.name,
            episode_body=request.content,
            source=episode_type,
            source_description=request.source_description,
            reference_time=datetime.now(timezone.utc),
        )
        
        return {"status": "success", "message": "Episode added successfully"}
        
    except Exception as e:
        logger.error(f"Failed to add episode: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add episode: {str(e)}")


@app.post("/memory/search", response_model=SearchResponse)
async def search_memory(request: SearchRequest):
    """Search the knowledge graph"""
    if not graphiti_client:
        raise HTTPException(status_code=503, detail="Graphiti client not initialized")
    
    try:
        # Perform search
        results = await graphiti_client.search(
            query=request.query,
            num_results=request.max_results,
            center_node_uuid=request.center_node_uuid
        )
        
        # Convert results to serializable format
        facts = []
        for result in results:
            fact_data = {
                "fact": result.fact,
                "confidence": getattr(result, 'confidence', 0.8),
                "timestamp": getattr(result, 'created_at', datetime.now(timezone.utc)).isoformat(),
                "source_entity": getattr(result, 'source_entity', ''),
                "target_entity": getattr(result, 'target_entity', ''),
                "metadata": getattr(result, 'metadata', {})
            }
            facts.append(fact_data)
        
        return SearchResponse(
            facts=facts,
            total_results=len(facts),
            query=request.query,
            center_node_uuid=request.center_node_uuid
        )
        
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@app.post("/memory/facts/add")
async def add_fact(request: FactRequest, background_tasks: BackgroundTasks):
    """Add a structured fact/relationship to the graph"""
    if not graphiti_client:
        raise HTTPException(status_code=503, detail="Graphiti client not initialized")
    
    try:
        # Create episode content from fact
        fact_content = f"{request.source_entity} {request.relationship} {request.target_entity}"
        
        # Add as structured episode in background
        background_tasks.add_task(
            graphiti_client.add_episode,
            name=f"Fact: {request.relationship}",
            episode_body=fact_content,
            source=EpisodeType.text,
            source_description="Trading Agent - Structured Fact",
            reference_time=datetime.now(timezone.utc),
        )
        
        return {"status": "success", "message": "Fact added to processing queue"}
        
    except Exception as e:
        logger.error(f"Failed to add fact: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add fact: {str(e)}")


@app.get("/memory/facts/search")
async def search_facts(query: str, max_results: int = 10, center_node_uuid: Optional[str] = None):
    """Search for specific facts in the knowledge graph"""
    if not graphiti_client:
        raise HTTPException(status_code=503, detail="Graphiti client not initialized")
    
    try:
        # Use general search for facts (Graphiti doesn't separate fact vs node search in basic API)
        results = await graphiti_client.search(
            query=query,
            num_results=max_results,
            center_node_uuid=center_node_uuid
        )
        
        # Filter for more fact-like results (containing relationships)
        relationship_keywords = ["is", "has", "contains", "owns", "manages", "trades", "analyzes"]
        fact_results = []
        
        for result in results:
            fact_text = result.fact.lower()
            if any(keyword in fact_text for keyword in relationship_keywords):
                fact_results.append({
                    "fact": result.fact,
                    "confidence": getattr(result, 'confidence', 0.8),
                    "timestamp": getattr(result, 'created_at', datetime.now(timezone.utc)).isoformat(),
                    "metadata": getattr(result, 'metadata', {})
                })
        
        return {
            "facts": fact_results,
            "total_results": len(fact_results),
            "query": query
        }
        
    except Exception as e:
        logger.error(f"Fact search failed: {e}")
        raise HTTPException(status_code=500, detail=f"Fact search failed: {str(e)}")


@app.delete("/memory/clear")
async def clear_memory():
    """Clear all data from the knowledge graph (use with caution)"""
    if not graphiti_client:
        raise HTTPException(status_code=503, detail="Graphiti client not initialized")
    
    try:
        from graphiti_core.utils.maintenance.graph_data_operations import clear_data
        
        # Clear all data
        await clear_data(graphiti_client.driver)
        
        # Rebuild indices and constraints
        await graphiti_client.build_indices_and_constraints()
        
        logger.warning("Knowledge graph cleared and reinitialized")
        return {"status": "success", "message": "Knowledge graph cleared"}
        
    except Exception as e:
        logger.error(f"Failed to clear graph: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to clear graph: {str(e)}")


@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "Zep Graphiti Service",
        "version": "0.1.0",
        "description": "HTTP API for Graphiti temporal knowledge graph operations",
        "endpoints": {
            "health": "/health",
            "add_episode": "POST /memory/add",
            "search": "POST /memory/search",
            "add_fact": "POST /memory/facts/add",
            "search_facts": "GET /memory/facts/search",
            "clear": "DELETE /memory/clear"
        }
    }


if __name__ == "__main__":
    host = os.getenv("ZEP_SERVICE_HOST", "0.0.0.0")
    port = int(os.getenv("ZEP_SERVICE_PORT", "8080"))
    debug = os.getenv("ZEP_SERVICE_DEBUG", "false").lower() == "true"
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info"
    )