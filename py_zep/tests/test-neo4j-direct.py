#!/usr/bin/env python3
"""
Direct Neo4j connection test to debug authentication issues.
"""

import asyncio
from neo4j import AsyncGraphDatabase
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_neo4j_direct():
    """Test Neo4j connection directly"""
    
    # Read password from secrets
    with open("../secrets/neo4j_password.txt", "r") as f:
        password = f.read().strip()
    
    logger.info(f"Testing Neo4j connection with password: {password[:10]}...")
    
    try:
        driver = AsyncGraphDatabase.driver(
            "bolt://localhost:7687",
            auth=("neo4j", password)
        )
        
        async with driver.session() as session:
            result = await session.run("RETURN 'Hello Neo4j' AS message")
            record = await result.single()
            message = record["message"]
            logger.info(f"✅ Neo4j connection successful: {message}")
            
        await driver.close()
        return True
        
    except Exception as e:
        logger.error(f"❌ Neo4j connection failed: {e}")
        
        # Try with default password
        logger.info("Trying with default password 'password'...")
        try:
            driver = AsyncGraphDatabase.driver(
                "bolt://localhost:7687",
                auth=("neo4j", "password")
            )
            
            async with driver.session() as session:
                result = await session.run("RETURN 'Neo4j with default password' AS message")
                record = await result.single()
                message = record["message"]
                logger.info(f"✅ Neo4j connection with default password successful: {message}")
                
            await driver.close()
            return True
            
        except Exception as e2:
            logger.error(f"❌ Neo4j connection with default password also failed: {e2}")
            return False

if __name__ == "__main__":
    success = asyncio.run(test_neo4j_direct())
    if success:
        print("Neo4j connection working!")
    else:
        print("Neo4j connection failed!")