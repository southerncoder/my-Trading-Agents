#!/usr/bin/env python3
"""
Main FastAPI application for Zep Graphiti service
"""

import logging
from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware

from config import ZepEnvDep
from zep_graphiti import (
    ZepGraphitiDep,
    initialize_graphiti,
    get_fact_result_from_edge
)
from dto import FactResult

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("Starting Zep Graphiti service...")

    # Initialize Graphiti on startup
    try:
        settings = ZepEnvDep.__dependency__()  # Get settings
        await initialize_graphiti(settings)
        logger.info("Graphiti initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Graphiti: {e}")
        raise

    yield

    logger.info("Shutting down Zep Graphiti service...")

# Create FastAPI app
app = FastAPI(
    title="Zep Graphiti API",
    description="Enhanced memory and knowledge graph service",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Zep Graphiti API is running", "version": "1.0.0"}

@app.get("/health")
async def health():
    """Detailed health check"""
    return {
        "status": "healthy",
        "service": "zep-graphiti",
        "version": "1.0.0"
    }

@app.post("/entities")
async def create_entity(
    name: str,
    uuid: str,
    group_id: str,
    summary: str = "",
    graphiti: ZepGraphitiDep = None
):
    """Create a new entity node"""
    try:
        await graphiti.save_entity_node(name, uuid, group_id, summary)
        return {"message": "Entity created successfully", "uuid": uuid}
    except Exception as e:
        logger.error(f"Failed to create entity: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/entities/{uuid}")
async def get_entity(uuid: str, graphiti: ZepGraphitiDep = None):
    """Get entity edge by UUID"""
    try:
        edge = await graphiti.get_entity_edge(uuid)
        if not edge:
            raise HTTPException(status_code=404, detail="Entity not found")
        return get_fact_result_from_edge(edge)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get entity: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/entities/{uuid}")
async def delete_entity(uuid: str, graphiti: ZepGraphitiDep = None):
    """Delete entity edge by UUID"""
    try:
        await graphiti.delete_entity_edge(uuid)
        return {"message": "Entity deleted successfully"}
    except Exception as e:
        logger.error(f"Failed to delete entity: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/groups/{group_id}")
async def delete_group(group_id: str, graphiti: ZepGraphitiDep = None):
    """Delete all entities in a group"""
    try:
        await graphiti.delete_group(group_id)
        return {"message": f"Group {group_id} deleted successfully"}
    except Exception as e:
        logger.error(f"Failed to delete group: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/episodes/{uuid}")
async def delete_episode(uuid: str, graphiti: ZepGraphitiDep = None):
    """Delete episodic node by UUID"""
    try:
        await graphiti.delete_episodic_node(uuid)
        return {"message": "Episode deleted successfully"}
    except Exception as e:
        logger.error(f"Failed to delete episode: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Add more endpoints as needed for episodes, search, etc.

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)