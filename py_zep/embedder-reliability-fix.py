#!/usr/bin/env python3
"""
Enhanced Embedder Reliability Solution
Fixes the root cause of 500 errors by ensuring model loading and improving retry logic
"""

import os
import json
import requests
import time
import asyncio
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class EmbedderReliabilityFix:
    """Enhanced embedder reliability with model management and improved retry logic"""
    
    def __init__(self):
        self.lm_studio_url = os.getenv('OPENAI_BASE_URL', 'http://host.docker.internal:5432')
        self.embedding_model = os.getenv('EMBEDDING_MODEL', 'text-embedding-qwen3-embedding-4b')
        self.max_retries = 5
        self.base_delay = 1.0
        self.max_delay = 30.0
        
    def check_model_loaded(self) -> bool:
        """Check if the embedding model is loaded in LM Studio"""
        try:
            models_url = f"{self.lm_studio_url.rstrip('/v1')}/v1/models"
            logger.info(f"Checking loaded models at: {models_url}")
            
            response = requests.get(models_url, timeout=10)
            if response.status_code == 200:
                models_data = response.json()
                loaded_models = [model['id'] for model in models_data.get('data', [])]
                logger.info(f"Loaded models: {loaded_models}")
                
                if self.embedding_model in loaded_models:
                    logger.info(f"✅ Target embedding model '{self.embedding_model}' is loaded")
                    return True
                else:
                    logger.warning(f"❌ Target embedding model '{self.embedding_model}' is NOT loaded")
                    logger.info(f"Available models: {loaded_models}")
                    return False
            else:
                logger.error(f"Failed to check models: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Error checking model status: {e}")
            return False
    
    def load_model(self) -> bool:
        """Attempt to load the embedding model in LM Studio"""
        try:
            admin_url = f"{self.lm_studio_url.rstrip('/v1')}/v1/api/admin/load"
            logger.info(f"Attempting to load model via: {admin_url}")
            
            payload = {"model": self.embedding_model}
            response = requests.post(admin_url, json=payload, timeout=30)
            
            if response.status_code == 200:
                logger.info(f"✅ Model load request successful")
                # Wait for model to actually load
                for attempt in range(10):
                    time.sleep(3)
                    if self.check_model_loaded():
                        logger.info(f"✅ Model '{self.embedding_model}' successfully loaded")
                        return True
                    logger.info(f"Waiting for model to load... (attempt {attempt + 1}/10)")
                
                logger.warning("Model load request accepted but model not available after waiting")
                return False
            else:
                logger.error(f"Model load request failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            return False
    
    def test_embeddings_endpoint(self) -> bool:
        """Test the embeddings endpoint directly"""
        try:
            embeddings_url = f"{self.lm_studio_url}/embeddings"
            logger.info(f"Testing embeddings endpoint: {embeddings_url}")
            
            payload = {
                "model": self.embedding_model,
                "input": ["test embedding"]
            }
            
            response = requests.post(embeddings_url, json=payload, timeout=30)
            
            if response.status_code == 200:
                logger.info("✅ Embeddings endpoint test successful")
                return True
            else:
                logger.error(f"Embeddings endpoint test failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error testing embeddings endpoint: {e}")
            return False
    
    def ensure_model_ready(self) -> bool:
        """Ensure the embedding model is loaded and ready"""
        logger.info("🔧 Ensuring embedding model is ready...")
        
        # Step 1: Check if model is already loaded
        if self.check_model_loaded():
            # Step 2: Test the endpoint
            if self.test_embeddings_endpoint():
                logger.info("✅ Embedding model is ready!")
                return True
            else:
                logger.warning("Model is loaded but endpoint test failed")
        
        # Step 3: Try to load the model
        logger.info("🔄 Attempting to load embedding model...")
        if self.load_model():
            # Step 4: Test again after loading
            if self.test_embeddings_endpoint():
                logger.info("✅ Model loaded and endpoint working!")
                return True
        
        logger.error("❌ Failed to ensure model is ready")
        return False
    
    def create_enhanced_wrapper_script(self):
        """Create an enhanced wrapper script for Zep startup"""
        
        wrapper_script = '''#!/usr/bin/env python3
"""
Enhanced Zep Graphiti Startup with Model Management
Ensures embedding model is loaded before starting the service
"""

import os
import sys
import time
import requests
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('/tmp/zep-enhanced-startup.log', mode='a')
    ]
)

logger = logging.getLogger('ZepEnhancedStartup')

def ensure_embedding_model_ready():
    """Ensure the embedding model is loaded before starting Zep"""
    lm_studio_url = os.getenv('OPENAI_BASE_URL', 'http://host.docker.internal:5432')
    embedding_model = os.getenv('EMBEDDING_MODEL', 'text-embedding-qwen3-embedding-4b')
    
    logger.info(f"Ensuring embedding model '{embedding_model}' is ready...")
    logger.info(f"LM Studio URL: {lm_studio_url}")
    
    max_attempts = 10
    for attempt in range(max_attempts):
        try:
            # Check models endpoint
            models_url = f"{lm_studio_url.rstrip('/v1')}/v1/models"
            response = requests.get(models_url, timeout=10)
            
            if response.status_code == 200:
                models_data = response.json()
                loaded_models = [model['id'] for model in models_data.get('data', [])]
                
                if embedding_model in loaded_models:
                    logger.info(f"✅ Embedding model '{embedding_model}' is ready!")
                    
                    # Test embeddings endpoint
                    embeddings_url = f"{lm_studio_url}/embeddings"
                    test_payload = {
                        "model": embedding_model,
                        "input": ["startup test"]
                    }
                    
                    embed_response = requests.post(embeddings_url, json=test_payload, timeout=15)
                    if embed_response.status_code == 200:
                        logger.info("✅ Embeddings endpoint test successful!")
                        return True
                    else:
                        logger.warning(f"Embeddings test failed: {embed_response.status_code}")
                else:
                    logger.warning(f"Model '{embedding_model}' not loaded. Available: {loaded_models}")
                    
                    # Try to load the model
                    admin_url = f"{lm_studio_url.rstrip('/v1')}/v1/api/admin/load"
                    load_payload = {"model": embedding_model}
                    
                    load_response = requests.post(admin_url, json=load_payload, timeout=30)
                    if load_response.status_code == 200:
                        logger.info(f"Model load request sent, waiting...")
                        time.sleep(5)  # Wait for model to load
                    else:
                        logger.warning(f"Failed to request model load: {load_response.status_code}")
            else:
                logger.warning(f"Failed to check models: {response.status_code}")
                
        except Exception as e:
            logger.warning(f"Attempt {attempt + 1}/{max_attempts} failed: {e}")
        
        if attempt < max_attempts - 1:
            wait_time = min(5 * (attempt + 1), 30)
            logger.info(f"Retrying in {wait_time} seconds...")
            time.sleep(wait_time)
    
    logger.error("❌ Failed to ensure embedding model is ready!")
    logger.error("⚠️ Starting Zep anyway, but expect embedding failures")
    return False

def main():
    """Enhanced startup with model readiness check"""
    logger.info("🚀 Enhanced Zep Graphiti Startup")
    logger.info("=" * 50)
    
    # Step 1: Ensure embedding model is ready
    ensure_embedding_model_ready()
    
    # Step 2: Import and run the original startup
    logger.info("Starting Zep Graphiti service...")
    
    # Import the original startup script
    import subprocess
    import sys
    
    # Run the original Zep startup
    try:
        subprocess.run([sys.executable, "-m", "uvicorn", "graph_service.main:app", 
                       "--host", "0.0.0.0", "--port", "8000"], check=True)
    except subprocess.CalledProcessError as e:
        logger.error(f"Zep startup failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
'''
        
        # Write the enhanced wrapper script
        script_path = Path("enhanced-zep-startup.py")
        with open(script_path, 'w') as f:
            f.write(wrapper_script)
        
        # Make it executable
        script_path.chmod(0o755)
        logger.info(f"✅ Enhanced wrapper script created: {script_path}")
        
        return script_path

def main():
    """Main function to run the embedder reliability fix"""
    logger.info("🔧 Embedder Reliability Fix")
    logger.info("=" * 50)
    
    fix = EmbedderReliabilityFix()
    
    # Step 1: Ensure model is ready
    if fix.ensure_model_ready():
        logger.info("✅ Embedding model is ready for Zep service")
    else:
        logger.error("❌ Failed to prepare embedding model")
        logger.info("Manual action required:")
        logger.info("1. Open LM Studio")
        logger.info(f"2. Load the model: {fix.embedding_model}")
        logger.info("3. Restart this script")
        return False
    
    # Step 2: Create enhanced startup script
    script_path = fix.create_enhanced_wrapper_script()
    logger.info(f"Enhanced startup script ready: {script_path}")
    
    logger.info("🎉 Embedder reliability fix complete!")
    logger.info("Next steps:")
    logger.info("1. Update Docker compose to use the enhanced startup script")
    logger.info("2. Restart Zep services")
    logger.info("3. Test entity creation")
    
    return True

if __name__ == "__main__":
    main()