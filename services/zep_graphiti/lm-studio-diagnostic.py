#!/usr/bin/env python3
"""
LM Studio Connectivity Diagnostic and Fix
Diagnoses LM Studio connectivity issues and provides solutions
"""

import os
import requests
import time
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class LMStudioDiagnostic:
    """Diagnose and fix LM Studio connectivity issues"""
    
    def __init__(self):
        self.common_ports = [5432, 1234, 5000, 8080, 8000]
        self.embedding_model = 'text-embedding-qwen3-embedding-4b'
        self.discovered_url = None
        
    def test_port(self, host, port):
        """Test if LM Studio is running on a specific port"""
        try:
            url = f"http://{host}:{port}/v1/models"
            logger.info(f"Testing {url}...")
            
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                data = response.json()
                models = [model['id'] for model in data.get('data', [])]
                logger.info(f"✅ LM Studio found on port {port}")
                logger.info(f"Available models: {models}")
                return True, models
            else:
                logger.debug(f"Port {port} responded with {response.status_code}")
                return False, []
        except Exception as e:
            logger.debug(f"Port {port} failed: {e}")
            return False, []
    
    def discover_lm_studio(self):
        """Discover where LM Studio is running"""
        logger.info("🔍 Discovering LM Studio...")
        
        hosts = ['localhost', '127.0.0.1', 'host.docker.internal']
        
        for host in hosts:
            for port in self.common_ports:
                is_running, models = self.test_port(host, port)
                if is_running:
                    self.discovered_url = f"http://{host}:{port}"
                    logger.info(f"🎉 LM Studio discovered at: {self.discovered_url}")
                    return True, models
        
        logger.error("❌ LM Studio not found on any common ports")
        return False, []
    
    def check_model_loaded(self, base_url, models_list):
        """Check if the required embedding model is loaded"""
        if self.embedding_model in models_list:
            logger.info(f"✅ Required model '{self.embedding_model}' is loaded")
            return True
        else:
            logger.warning(f"❌ Required model '{self.embedding_model}' is NOT loaded")
            logger.info(f"Available models: {models_list}")
            return False
    
    def load_model(self, base_url):
        """Attempt to load the required embedding model"""
        try:
            admin_url = f"{base_url}/v1/api/admin/load"
            payload = {"model": self.embedding_model}
            
            logger.info(f"Attempting to load model via: {admin_url}")
            response = requests.post(admin_url, json=payload, timeout=30)
            
            if response.status_code == 200:
                logger.info("✅ Model load request accepted")
                
                # Wait and check if model is loaded
                for attempt in range(10):
                    time.sleep(3)
                    is_running, models = self.test_port(base_url.split('://', 1)[1].split(':', 1)[0], 
                                                        int(base_url.split(':', 2)[2]))
                    if is_running and self.embedding_model in models:
                        logger.info(f"✅ Model '{self.embedding_model}' successfully loaded!")
                        return True
                    logger.info(f"Waiting for model to load... (attempt {attempt + 1}/10)")
                
                logger.warning("Model load request accepted but model not available after waiting")
                return False
            else:
                logger.error(f"Model load failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            return False
    
    def test_embeddings(self, base_url):
        """Test the embeddings endpoint"""
        try:
            embeddings_url = f"{base_url}/v1/embeddings"
            payload = {
                "model": self.embedding_model,
                "input": ["test embedding"]
            }
            
            logger.info(f"Testing embeddings at: {embeddings_url}")
            response = requests.post(embeddings_url, json=payload, timeout=15)
            
            if response.status_code == 200:
                logger.info("✅ Embeddings endpoint working correctly!")
                return True
            else:
                logger.error(f"Embeddings test failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Embeddings test error: {e}")
            return False
    
    def update_secrets_configuration(self):
        """Update the secrets configuration with the discovered URL"""
        if not self.discovered_url:
            logger.error("No LM Studio URL discovered to update")
            return False
        
        try:
            secrets_dir = Path("secrets")
            lm_studio_file = secrets_dir / "lm_studio_url.txt"
            
            # Backup existing file
            if lm_studio_file.exists():
                backup_file = secrets_dir / "lm_studio_url.txt.backup"
                lm_studio_file.rename(backup_file)
                logger.info(f"Backed up existing config to: {backup_file}")
            
            # Write new URL
            with open(lm_studio_file, 'w') as f:
                f.write(f"{self.discovered_url}\\n")
            
            logger.info(f"✅ Updated LM Studio URL in secrets: {self.discovered_url}")
            
            # Also update the embedder base URL format
            openai_base_url = f"{self.discovered_url}/v1"
            logger.info(f"Zep should use OPENAI_BASE_URL: {openai_base_url}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error updating secrets configuration: {e}")
            return False
    
    def provide_manual_instructions(self):
        """Provide manual instructions if automatic fix fails"""
        logger.info("📋 Manual Instructions:")
        logger.info("1. Start LM Studio application")
        logger.info("2. Go to the 'My Models' tab")
        logger.info(f"3. Load the model: {self.embedding_model}")
        logger.info("4. Go to the 'Developer' tab")
        logger.info("5. Start the local server")
        logger.info("6. Note the port number (usually 1234 or 5432)")
        logger.info("7. Update zep_graphiti/secrets/lm_studio_url.txt with the correct URL")
        logger.info("8. Restart the Zep services")

def main():
    """Main diagnostic and fix function"""
    logger.info("🔧 LM Studio Connectivity Diagnostic")
    logger.info("=" * 50)
    
    diagnostic = LMStudioDiagnostic()
    
    # Step 1: Discover LM Studio
    is_running, models = diagnostic.discover_lm_studio()
    
    if not is_running:
        logger.error("❌ LM Studio not found!")
        diagnostic.provide_manual_instructions()
        return False
    
    # Step 2: Check if required model is loaded
    model_loaded = diagnostic.check_model_loaded(diagnostic.discovered_url, models)
    
    if not model_loaded:
        logger.info("🔄 Attempting to load required model...")
        if not diagnostic.load_model(diagnostic.discovered_url):
            logger.error("❌ Failed to load model automatically")
            diagnostic.provide_manual_instructions()
            return False
    
    # Step 3: Test embeddings endpoint
    if not diagnostic.test_embeddings(diagnostic.discovered_url):
        logger.error("❌ Embeddings endpoint test failed")
        return False
    
    # Step 4: Update configuration
    if diagnostic.update_secrets_configuration():
        logger.info("✅ Configuration updated successfully")
    
    logger.info("🎉 LM Studio connectivity fix complete!")
    logger.info(f"LM Studio URL: {diagnostic.discovered_url}")
    logger.info(f"Embedding model: {diagnostic.embedding_model}")
    logger.info("Next steps:")
    logger.info("1. Restart Zep services: docker-compose restart zep-graphiti")
    logger.info("2. Test entity creation again")
    
    return True

if __name__ == "__main__":
    main()