#!/usr/bin/env python3
"""
Add retry/backoff logic and improved error logging to Zep Services
"""

import os
import sys
import time
import random
from pathlib import Path

def create_retry_wrapper():
    """Create a retry wrapper for the Zep Graphiti service"""
    
    wrapper_content = '''#!/usr/bin/env python3
"""
Enhanced Zep Graphiti Startup Script with Retry Logic and Error Handling
"""

import os
import sys
import time
import random
import asyncio
import logging
import traceback
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('/tmp/zep-startup.log', mode='a')
    ]
)

logger = logging.getLogger('ZepStartup')

class RetryConfig:
    """Configuration for retry logic"""
    MAX_RETRIES = 5
    BASE_DELAY = 2.0  # Base delay in seconds
    MAX_DELAY = 60.0  # Maximum delay in seconds
    BACKOFF_MULTIPLIER = 2.0
    JITTER = True

def exponential_backoff(attempt: int, config: RetryConfig) -> float:
    """Calculate exponential backoff delay with jitter"""
    delay = min(config.BASE_DELAY * (config.BACKOFF_MULTIPLIER ** attempt), config.MAX_DELAY)
    
    if config.JITTER:
        # Add jitter (±25% of delay)
        jitter = delay * 0.25 * (2 * random.random() - 1)
        delay += jitter
    
    return max(delay, 0.1)  # Minimum 100ms delay

async def test_neo4j_connection():
    """Test Neo4j connection before starting main service"""
    try:
        from neo4j import AsyncGraphDatabase
        
        neo4j_uri = os.getenv('NEO4J_URI', 'bolt://trading-agents-neo4j:7687')
        neo4j_user = os.getenv('NEO4J_USER', 'neo4j')
        neo4j_password = os.getenv('NEO4J_PASSWORD')
        
        if not neo4j_password:
            logger.error("NEO4J_PASSWORD not set")
            return False
        
        logger.info(f"Testing Neo4j connection to {neo4j_uri}")
        
        driver = AsyncGraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))
        
        async with driver.session() as session:
            result = await session.run("RETURN 'Connection test' as message")
            record = await result.single()
            if record:
                logger.info(f"Neo4j connection successful: {record['message']}")
                await driver.close()
                return True
        
        await driver.close()
        return False
        
    except ImportError as e:
        logger.error(f"Neo4j package not available: {e}")
        return False
    except Exception as e:
        logger.error(f"Neo4j connection failed: {e}")
        logger.debug(traceback.format_exc())
        return False

def check_environment():
    """Check critical environment variables"""
    logger.info("Development Environment Detected")
    
    required_vars = {
        'NEO4J_URI': os.getenv('NEO4J_URI'),
        'NEO4J_USER': os.getenv('NEO4J_USER'),
        'NEO4J_PASSWORD': 'set' if os.getenv('NEO4J_PASSWORD') else 'NOT SET',
        'OPENAI_API_KEY': 'set' if os.getenv('OPENAI_API_KEY') else 'NOT SET',
        'OPENAI_BASE_URL': os.getenv('OPENAI_BASE_URL'),
        'EMBEDDER_PROVIDER': os.getenv('EMBEDDER_PROVIDER')
    }
    
    missing_vars = []
    for var, value in required_vars.items():
        logger.info(f"   {var}: {value}")
        if value in [None, 'NOT SET']:
            missing_vars.append(var)
    
    if missing_vars:
        logger.error(f"Missing required environment variables: {missing_vars}")
        return False
    
    return True

async def start_service_with_retry():
    """Start the Zep Graphiti service with retry logic"""
    config = RetryConfig()
    
    if not check_environment():
        logger.error("Environment check failed")
        sys.exit(1)
    
    for attempt in range(config.MAX_RETRIES):
        try:
            logger.info(f"Attempt {attempt + 1}/{config.MAX_RETRIES}: Testing Neo4j connection...")
            
            # Test Neo4j connection first
            if await test_neo4j_connection():
                logger.info("Neo4j connection successful, starting main service...")
                break
            else:
                raise Exception("Neo4j connection test failed")
                
        except Exception as e:
            logger.error(f"Attempt {attempt + 1} failed: {e}")
            
            if attempt < config.MAX_RETRIES - 1:
                delay = exponential_backoff(attempt, config)
                logger.info(f"Retrying in {delay:.1f} seconds...")
                await asyncio.sleep(delay)
            else:
                logger.error("All retry attempts exhausted")
                sys.exit(1)
    
    # If we get here, Neo4j connection is working
    logger.info("Starting Zep Graphiti service...")
    
    # Start the actual service
    try:
        import subprocess
        import uvicorn
        
        # Start uvicorn with the main app
        logger.info("Starting uvicorn server...")
        uvicorn.run(
            "graph_service.main:app",
            host="0.0.0.0",
            port=8000,
            log_level="info"
        )
        
    except Exception as e:
        logger.error(f"Service startup failed: {e}")
        logger.debug(traceback.format_exc())
        sys.exit(1)

def main():
    """Main entry point"""
    logger.info("Enhanced Zep Graphiti Startup Script")
    logger.info("=" * 50)
    
    try:
        asyncio.run(start_service_with_retry())
    except KeyboardInterrupt:
        logger.info("Shutdown requested")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        logger.debug(traceback.format_exc())
        sys.exit(1)

if __name__ == "__main__":
    main()
'''

    # Write the enhanced startup script
    script_path = Path('secrets/enhanced-init.py')
    script_path.write_text(wrapper_content)
    
    print(f"✅ Created enhanced startup script: {script_path}")
    return script_path

def update_docker_compose():
    """Update docker-compose.yml to use the enhanced startup script"""
    
    compose_file = Path('docker-compose.yml')
    if not compose_file.exists():
        print("❌ docker-compose.yml not found")
        return False
    
    content = compose_file.read_text()
    
    # Update the command to use the enhanced init script
    old_volume = './secrets/simple-init.py:/init.py:ro'
    new_volume = './secrets/enhanced-init.py:/init.py:ro'
    
    if old_volume in content:
        content = content.replace(old_volume, new_volume)
        compose_file.write_text(content)
        print("✅ Updated docker-compose.yml to use enhanced startup script")
        return True
    else:
        print("⚠️  Could not find volume mount to update in docker-compose.yml")
        return False

def main():
    """Main function to add retry/backoff logic"""
    print("🔧 Adding Retry/Backoff Logic to Zep Services")
    print("=" * 50)
    
    try:
        # Create enhanced startup script
        script_path = create_retry_wrapper()
        
        # Update docker-compose configuration
        update_docker_compose()
        
        print("\n✅ Retry/Backoff Logic Implementation Complete!")
        print("\nFeatures Added:")
        print("   • Exponential backoff with jitter")
        print("   • Neo4j connection testing before service start")
        print("   • Enhanced logging with file output")
        print("   • Environment variable validation")
        print("   • Configurable retry limits and delays")
        print("   • Graceful error handling and reporting")
        
        print("\nNext Steps:")
        print("   1. Restart services: docker-compose restart zep-graphiti")
        print("   2. Monitor logs: docker-compose logs -f zep-graphiti")
        print("   3. Check /tmp/zep-startup.log in container for detailed logs")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to add retry logic: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)