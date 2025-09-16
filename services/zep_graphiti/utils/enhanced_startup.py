#!/usr/bin/env python3
"""
Enhanced Start Wrapper for Zep-Graphiti with Improved Retry Logic

This script enhances the existing start-wrapper.sh with:
- Better retry mechanisms with exponential backoff
- Health monitoring for LM Studio and Neo4j
- Comprehensive error logging and metrics
- Circuit breaker protection
"""

import asyncio
import json
import logging
import os
import random
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional, Tuple

# Configure logging
log_dir = Path(__file__).parent.parent / "logs"
log_dir.mkdir(exist_ok=True)
log_file = log_dir / "enhanced_zep_startup.log"

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(log_file, mode='a')
    ]
)

logger = logging.getLogger('EnhancedZepStartup')


@dataclass
class RetryConfig:
    """Configuration for retry behavior"""
    max_retries: int = 5
    base_delay: float = 2.0
    max_delay: float = 60.0
    backoff_multiplier: float = 2.0
    jitter: bool = True
    jitter_range: float = 0.25


@dataclass
class ServiceHealth:
    """Health status of a service"""
    name: str
    status: str  # "healthy", "unhealthy", "unknown"
    response_time: float
    error_message: Optional[str] = None
    last_check: float = 0


class CircuitBreaker:
    """Simple circuit breaker for service protection"""
    
    def __init__(self, name: str, failure_threshold: int = 3, timeout: float = 30.0):
        self.name = name
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time = 0
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    
    def can_execute(self) -> bool:
        """Check if operation can be executed"""
        if self.state == "CLOSED":
            return True
        elif self.state == "OPEN":
            if time.time() - self.last_failure_time > self.timeout:
                self.state = "HALF_OPEN"
                logger.info(f"Circuit breaker {self.name} transitioning to HALF_OPEN")
                return True
            return False
        elif self.state == "HALF_OPEN":
            return True
        return False
    
    def on_success(self):
        """Record successful operation"""
        if self.state == "HALF_OPEN":
            self.state = "CLOSED"
            self.failure_count = 0
            logger.info(f"Circuit breaker {self.name} reset to CLOSED")
        elif self.state == "CLOSED":
            self.failure_count = max(0, self.failure_count - 1)
    
    def on_failure(self):
        """Record failed operation"""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"
            logger.warning(f"Circuit breaker {self.name} opened after {self.failure_count} failures")


class EnhancedStartupManager:
    """Enhanced startup manager with improved retry logic"""
    
    def __init__(self):
        self.config = RetryConfig()
        self.services: Dict[str, ServiceHealth] = {}
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}
        self.startup_metrics = {
            "total_attempts": 0,
            "successful_starts": 0,
            "failed_starts": 0,
            "total_startup_time": 0,
            "service_checks": {}
        }
        
        # Initialize circuit breakers
        self.circuit_breakers["lm_studio"] = CircuitBreaker("lm_studio", failure_threshold=3, timeout=30.0)
        self.circuit_breakers["neo4j"] = CircuitBreaker("neo4j", failure_threshold=5, timeout=60.0)
        
    def calculate_delay(self, attempt: int) -> float:
        """Calculate delay with exponential backoff and jitter"""
        delay = min(
            self.config.base_delay * (self.config.backoff_multiplier ** attempt),
            self.config.max_delay
        )
        
        if self.config.jitter and delay > 0:
            jitter = delay * self.config.jitter_range * (2 * random.random() - 1)
            delay = max(0.1, delay + jitter)
        
        return delay
    
    async def check_neo4j_health(self) -> ServiceHealth:
        """Check Neo4j database health"""
        start_time = time.time()
        
        try:
            # Use the existing Neo4j credentials
            neo4j_uri = os.getenv('NEO4J_URI', 'bolt://trading-agents-neo4j:7687')
            neo4j_user = os.getenv('NEO4J_USER', 'neo4j')
            neo4j_password = os.getenv('NEO4J_PASSWORD')
            
            # Read password from secrets if not in environment
            if not neo4j_password:
                password_file = Path(__file__).parent.parent / "secrets" / "neo4j_password.txt"
                if password_file.exists():
                    neo4j_password = password_file.read_text().strip()
            
            if not neo4j_password:
                raise Exception("Neo4j password not found")
            
            # Simple connection test using Python neo4j driver
            try:
                from neo4j import AsyncGraphDatabase
                
                async with AsyncGraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password)) as driver:
                    async with driver.session() as session:
                        result = await session.run("RETURN 1 as test")
                        await result.consume()
                
                response_time = time.time() - start_time
                self.circuit_breakers["neo4j"].on_success()
                
                return ServiceHealth(
                    name="neo4j",
                    status="healthy",
                    response_time=response_time,
                    last_check=time.time()
                )
                
            except ImportError:
                # Fall back to HTTP health check if neo4j driver not available
                import aiohttp
                async with aiohttp.ClientSession() as session:
                    async with session.get('http://localhost:7474') as resp:
                        if resp.status == 200:
                            response_time = time.time() - start_time
                            self.circuit_breakers["neo4j"].on_success()
                            return ServiceHealth(
                                name="neo4j",
                                status="healthy",
                                response_time=response_time,
                                last_check=time.time()
                            )
                        else:
                            raise Exception(f"HTTP {resp.status}")
            
        except Exception as e:
            response_time = time.time() - start_time
            self.circuit_breakers["neo4j"].on_failure()
            
            return ServiceHealth(
                name="neo4j",
                status="unhealthy",
                response_time=response_time,
                error_message=str(e),
                last_check=time.time()
            )
    
    async def check_lm_studio_health(self) -> ServiceHealth:
        """Check LM Studio health and model availability (now uses OPENAI_BASE_URL only)"""
        start_time = time.time()
        try:
            base_url = os.getenv('OPENAI_BASE_URL', 'http://localhost:1234/v1')
            import aiohttp
            async with aiohttp.ClientSession() as session:
                # Try /models endpoint (modern LM Studio)
                models_url = f"{base_url.rstrip('/v1')}/models"
                async with session.get(models_url) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        embedding_model = os.getenv('EMBEDDING_MODEL', 'text-embedding-qwen3-embedding-4b')
                        models_available = []
                        if isinstance(data, dict) and 'data' in data:
                            models_available = [model.get('id', '') for model in data['data']]
                        if embedding_model in models_available:
                            response_time = time.time() - start_time
                            self.circuit_breakers["lm_studio"].on_success()
                            return ServiceHealth(
                                name="lm_studio",
                                status="healthy",
                                response_time=response_time,
                                last_check=time.time()
                            )
                        else:
                            raise Exception(f"Embedding model {embedding_model} not found in {models_available}")
                    else:
                        raise Exception(f"HTTP {resp.status}")
        except Exception as e:
            response_time = time.time() - start_time
            self.circuit_breakers["lm_studio"].on_failure()
            return ServiceHealth(
                name="lm_studio",
                status="unhealthy",
                response_time=response_time,
                error_message=str(e),
                last_check=time.time()
            )
    
    async def ensure_lm_studio_model(self) -> bool:
        """Ensure LM Studio has the required embedding model loaded"""
        if not self.circuit_breakers["lm_studio"].can_execute():
            logger.warning("LM Studio circuit breaker is open, skipping model load")
            return False
        
        embedding_model = os.getenv('EMBEDDING_MODEL', 'text-embedding-qwen3-embedding-4b')
        embedder_provider = os.getenv('EMBEDDER_PROVIDER', '')
        
        if embedder_provider != 'lm_studio':
            logger.info("Embedder provider is not lm_studio, skipping model load")
            return True
        
        for attempt in range(self.config.max_retries):
            try:
                logger.info(f"Attempt {attempt + 1}/{self.config.max_retries}: Ensuring LM Studio model {embedding_model}")
                
                # Use the existing start-wrapper.sh logic but with enhanced retry
                result = subprocess.run(
                    ['/bin/sh', '/start-wrapper.sh', 'echo', 'model-check'],
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                if result.returncode == 0:
                    logger.info("LM Studio model load successful")
                    self.circuit_breakers["lm_studio"].on_success()
                    return True
                else:
                    raise Exception(f"Model load failed: {result.stderr}")
            
            except Exception as e:
                self.circuit_breakers["lm_studio"].on_failure()
                logger.warning(f"Attempt {attempt + 1} failed: {e}")
                
                if attempt < self.config.max_retries - 1:
                    delay = self.calculate_delay(attempt)
                    logger.info(f"Retrying in {delay:.1f} seconds...")
                    await asyncio.sleep(delay)
                else:
                    logger.error(f"All {self.config.max_retries} attempts failed for LM Studio model load")
                    return False
        
        return False
    
    async def comprehensive_health_check(self) -> Dict[str, ServiceHealth]:
        """Perform comprehensive health check of all services"""
        logger.info("Performing comprehensive health check...")
        
        # Check all services concurrently
        neo4j_task = asyncio.create_task(self.check_neo4j_health())
        lm_studio_task = asyncio.create_task(self.check_lm_studio_health())
        
        neo4j_health = await neo4j_task
        lm_studio_health = await lm_studio_task
        
        self.services["neo4j"] = neo4j_health
        self.services["lm_studio"] = lm_studio_health
        
        # Log results
        for service_name, health in self.services.items():
            status_emoji = "✅" if health.status == "healthy" else "❌"
            logger.info(f"{status_emoji} {service_name}: {health.status} ({health.response_time:.2f}s)")
            if health.error_message:
                logger.warning(f"  Error: {health.error_message}")
        
        return self.services
    
    async def enhanced_startup_sequence(self) -> bool:
        """Enhanced startup sequence with comprehensive checks"""
        startup_start = time.time()
        self.startup_metrics["total_attempts"] += 1
        
        try:
            logger.info("🚀 Starting Enhanced Zep-Graphiti Startup Sequence")
            logger.info("=" * 60)
            
            # Step 1: Environment validation
            logger.info("Step 1: Environment validation")
            if not self.validate_environment():
                raise Exception("Environment validation failed")
            logger.info("✅ Environment validation passed")
            
            # Step 2: Service health checks
            logger.info("Step 2: Service health checks")
            services = await self.comprehensive_health_check()
            
            unhealthy_services = [name for name, health in services.items() if health.status != "healthy"]
            if unhealthy_services:
                raise Exception(f"Unhealthy services: {unhealthy_services}")
            logger.info("✅ All services are healthy")
            
            # Step 3: LM Studio model preparation
            logger.info("Step 3: LM Studio model preparation")
            model_ready = await self.ensure_lm_studio_model()
            if not model_ready:
                logger.warning("⚠️ LM Studio model preparation failed, but continuing startup")
            else:
                logger.info("✅ LM Studio model is ready")
            
            # Step 4: Start main application
            logger.info("Step 4: Starting main application")
            startup_time = time.time() - startup_start
            self.startup_metrics["successful_starts"] += 1
            self.startup_metrics["total_startup_time"] += startup_time
            
            logger.info(f"🎉 Enhanced startup completed successfully in {startup_time:.2f}s")
            return True
            
        except Exception as e:
            startup_time = time.time() - startup_start
            self.startup_metrics["failed_starts"] += 1
            self.startup_metrics["total_startup_time"] += startup_time
            
            logger.error(f"💥 Enhanced startup failed after {startup_time:.2f}s: {e}")
            return False
    
    def validate_environment(self) -> bool:
        """Validate required environment variables"""
        required_vars = [
            'NEO4J_URI', 'NEO4J_USER', 'NEO4J_PASSWORD',
            'OPENAI_API_KEY', 'OPENAI_BASE_URL'
        ]
        
        missing_vars = []
        for var in required_vars:
            value = os.getenv(var)
            if not value:
                # Check secrets files for missing variables
                if var == 'NEO4J_PASSWORD':
                    password_file = Path(__file__).parent.parent / "secrets" / "neo4j_password.txt"
                    if password_file.exists():
                        continue
                missing_vars.append(var)
        
        if missing_vars:
            logger.error(f"Missing required environment variables: {missing_vars}")
            return False
        
        return True
    
    def get_startup_metrics(self) -> Dict:
        """Get startup metrics and status"""
        total_attempts = self.startup_metrics["total_attempts"]
        success_rate = (
            self.startup_metrics["successful_starts"] / total_attempts * 100
            if total_attempts > 0 else 0
        )
        avg_startup_time = (
            self.startup_metrics["total_startup_time"] / total_attempts
            if total_attempts > 0 else 0
        )
        
        return {
            "startup_metrics": self.startup_metrics,
            "success_rate": f"{success_rate:.1f}%",
            "avg_startup_time": f"{avg_startup_time:.2f}s",
            "services": {
                name: {
                    "status": health.status,
                    "last_check": health.last_check,
                    "response_time": health.response_time,
                    "error": health.error_message
                }
                for name, health in self.services.items()
            },
            "circuit_breakers": {
                name: {
                    "state": cb.state,
                    "failure_count": cb.failure_count,
                    "last_failure": cb.last_failure_time
                }
                for name, cb in self.circuit_breakers.items()
            }
        }


async def main():
    """Main enhanced startup function"""
    manager = EnhancedStartupManager()
    
    # Perform enhanced startup
    success = await manager.enhanced_startup_sequence()
    
    if success:
        # Get final metrics
        metrics = manager.get_startup_metrics()
        logger.info("📊 Final Startup Metrics:")
        logger.info(f"  Success rate: {metrics['success_rate']}")
        logger.info(f"  Average startup time: {metrics['avg_startup_time']}")
        
        # Save metrics for monitoring
        metrics_dir = Path(__file__).parent.parent / "logs"
        metrics_dir.mkdir(exist_ok=True)
        metrics_file = metrics_dir / "zep_startup_metrics.json"
        with open(metrics_file, 'w') as f:
            json.dump(metrics, f, indent=2)
        
        logger.info(f"📁 Metrics saved to {metrics_file}")
        
        # Start the actual application
        logger.info("🏃 Starting main Zep-Graphiti application...")
        
        # Execute the real startup command (passed as arguments)
        if len(sys.argv) > 1:
            exec_args = sys.argv[1:]
            logger.info(f"Executing: {' '.join(exec_args)}")
            os.execvp(exec_args[0], exec_args)
        else:
            logger.info("No command specified, startup complete")
        
        return 0
    else:
        logger.error("❌ Enhanced startup failed")
        return 1


if __name__ == "__main__":
    # Install required packages if not available
    try:
        import aiohttp
    except ImportError:
        logger.info("Installing aiohttp...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "aiohttp"])
        import aiohttp
    
    # Run the enhanced startup
    exit_code = asyncio.run(main())
    sys.exit(exit_code)