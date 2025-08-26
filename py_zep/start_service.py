"""
Startup script for Zep Graphiti service
"""

import asyncio
import sys
import os

# Add src to path so we can import zep_service
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from zep_service.main import app
import uvicorn

if __name__ == "__main__":
    host = os.getenv("ZEP_SERVICE_HOST", "0.0.0.0")
    port = int(os.getenv("ZEP_SERVICE_PORT", "8080"))
    debug = os.getenv("ZEP_SERVICE_DEBUG", "false").lower() == "true"
    
    print(f"Starting Zep Graphiti service on {host}:{port}")
    print(f"Debug mode: {debug}")
    
    if debug:
        # Use import string for reload mode
        uvicorn.run(
            "zep_service.main:app",
            host=host,
            port=port,
            reload=True,
            log_level="info"
        )
    else:
        # Use app object for production mode
        uvicorn.run(
            app,
            host=host,
            port=port,
            reload=False,
            log_level="info"
        )