#!/usr/bin/env python3
"""
Enhanced Entity Creation Test with Comprehensive Logging
Tests the /entity-node endpoint with proper error handling, retry logic, and detailed logging
"""

import json
import requests
import time
import uuid
import logging
import sys
from datetime import datetime

# Configure detailed logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('entity-test.log', mode='a')
    ]
)

logger = logging.getLogger('EntityTest')

class RetryConfig:
    """Configuration for retry logic"""
    MAX_RETRIES = 3
    BASE_DELAY = 1.0
    MAX_DELAY = 10.0
    BACKOFF_MULTIPLIER = 2.0

def exponential_backoff(attempt: int) -> float:
    """Calculate exponential backoff delay"""
    delay = min(RetryConfig.BASE_DELAY * (RetryConfig.BACKOFF_MULTIPLIER ** attempt), RetryConfig.MAX_DELAY)
    return delay

def test_with_retry(func, *args, **kwargs):
    """Execute a test function with retry logic"""
    for attempt in range(RetryConfig.MAX_RETRIES):
        try:
            logger.info(f"Attempt {attempt + 1}/{RetryConfig.MAX_RETRIES}")
            result = func(*args, **kwargs)
            if result:
                return True
            
            if attempt < RetryConfig.MAX_RETRIES - 1:
                delay = exponential_backoff(attempt)
                logger.info(f"Retrying in {delay:.2f} seconds...")
                time.sleep(delay)
                
        except Exception as e:
            logger.error(f"Attempt {attempt + 1} failed: {e}")
            if attempt < RetryConfig.MAX_RETRIES - 1:
                delay = exponential_backoff(attempt)
                logger.info(f"Retrying in {delay:.2f} seconds...")
                time.sleep(delay)
            else:
                logger.error("All retry attempts exhausted")
                
    return False

def test_health_endpoint():
    """Test the health endpoint with detailed logging"""
    logger.info("Testing health endpoint...")
    try:
        response = requests.get("http://localhost:8000/healthcheck", timeout=10)
        logger.info(f"Health check status: {response.status_code}")
        logger.debug(f"Health check response: {response.text}")
        
        if response.status_code == 200:
            logger.info("✅ Health check passed!")
            return True
        else:
            logger.error(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"❌ Health check error: {e}")
        return False

def test_entity_creation():
    """Test entity creation endpoint with proper payload and detailed logging"""
    logger.info("🧠 Testing Zep-Graphiti Entity Creation with Enhanced Logging")
    logger.info("=" * 70)
    
    # Test endpoint
    url = "http://localhost:8000/entity-node"
    
    # Proper payload with required fields based on API error feedback
    test_uuid = str(uuid.uuid4())
    test_group_id = f"test-group-{int(time.time())}"
    
    payload = {
        "uuid": test_uuid,
        "group_id": test_group_id,
        "name": "Test Entity",
        "entity_type": "TestType",
        "observations": ["This is a test observation for entity creation"],
        "edges": []
    }
    
    try:
        logger.info(f"🔗 Testing endpoint: {url}")
        logger.info(f"📦 Enhanced payload with required fields:")
        logger.info(f"   UUID: {test_uuid}")
        logger.info(f"   Group ID: {test_group_id}")
        logger.debug(f"Full payload: {json.dumps(payload, indent=2)}")
        
        # Add timeout and detailed headers
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        logger.info("Sending POST request...")
        start_time = time.time()
        
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        
        end_time = time.time()
        response_time = end_time - start_time
        
        logger.info(f"📊 Response Status: {response.status_code}")
        logger.info(f"⏱️ Response Time: {response_time:.3f} seconds")
        logger.info(f"📋 Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            logger.info("✅ Entity creation successful!")
            try:
                response_data = response.json()
                logger.info(f"📄 Response: {json.dumps(response_data, indent=2)}")
            except json.JSONDecodeError:
                logger.info(f"📄 Response (non-JSON): {response.text}")
            return True
        elif response.status_code == 422:
            logger.warning(f"⚠️ Validation error (422)")
            logger.warning(f"📄 Validation Response: {response.text}")
            return False
        elif response.status_code >= 500:
            logger.error(f"🚨 Server error ({response.status_code}) - This is the target error!")
            logger.error(f"📄 Server Error Response: {response.text}")
            logger.error("This indicates an internal server issue that needs investigation")
            return False
        else:
            logger.warning(f"⚠️ Unexpected status code: {response.status_code}")
            logger.warning(f"📄 Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError as e:
        logger.error(f"❌ Connection failed: {e}")
        logger.error("Is Zep-Graphiti running on localhost:8000?")
        return False
    except requests.exceptions.Timeout as e:
        logger.error(f"❌ Request timeout: {e}")
        return False
    except Exception as e:
        logger.error(f"❌ Test failed: {e}")
        logger.exception("Full exception details:")
        return False

def test_models_endpoint():
    """Test the models endpoint to verify embedder connectivity"""
    logger.info("🤖 Testing Models Endpoint...")
    try:
        response = requests.get("http://localhost:8000/models", timeout=10)
        logger.info(f"Models endpoint status: {response.status_code}")
        
        if response.status_code == 200:
            models_data = response.json()
            logger.info(f"Available models: {models_data}")
            return True
        else:
            logger.error(f"Models endpoint failed: {response.status_code}")
            logger.error(f"Response: {response.text}")
            return False
    except Exception as e:
        logger.error(f"Models endpoint error: {e}")
        return False

def stream_logs_during_test():
    """Stream Docker logs during test execution"""
    import subprocess
    import threading
    
    def log_streamer():
        try:
            proc = subprocess.Popen(
                ['docker-compose', 'logs', '-f', 'zep-graphiti'],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                cwd='.'
            )
            
            logger.info("📡 Starting log stream from zep-graphiti container...")
            if proc.stdout:
                for line in proc.stdout:
                    logger.info(f"[DOCKER] {line.strip()}")
                
        except Exception as e:
            logger.error(f"Log streaming error: {e}")
    
    # Start log streaming in background
    log_thread = threading.Thread(target=log_streamer, daemon=True)
    log_thread.start()
    
    return log_thread

if __name__ == "__main__":
    logger.info("🚀 Starting Enhanced Zep-Graphiti Entity Creation Test")
    logger.info(f"Test started at: {datetime.now()}")
    logger.info("=" * 80)
    
    # Start log streaming
    log_thread = stream_logs_during_test()
    
    # Give log streaming a moment to start
    time.sleep(2)
    
    success_count = 0
    total_tests = 0
    
    # Test 1: Health check
    logger.info("\n" + "="*50)
    logger.info("TEST 1: Health Check")
    logger.info("="*50)
    total_tests += 1
    if test_with_retry(test_health_endpoint):
        success_count += 1
        logger.info("✅ Health check test PASSED")
    else:
        logger.error("❌ Health check test FAILED")
        logger.error("Skipping remaining tests due to health check failure")
        sys.exit(1)
    
    # Test 2: Models endpoint
    logger.info("\n" + "="*50)
    logger.info("TEST 2: Models Endpoint")
    logger.info("="*50)
    total_tests += 1
    if test_with_retry(test_models_endpoint):
        success_count += 1
        logger.info("✅ Models endpoint test PASSED")
    else:
        logger.warning("⚠️ Models endpoint test FAILED (but continuing)")
    
    # Test 3: Entity creation (main test)
    logger.info("\n" + "="*50)
    logger.info("TEST 3: Entity Creation (Main Test)")
    logger.info("="*50)
    total_tests += 1
    if test_with_retry(test_entity_creation):
        success_count += 1
        logger.info("✅ Entity creation test PASSED")
    else:
        logger.error("❌ Entity creation test FAILED")
    
    # Summary
    logger.info("\n" + "="*80)
    logger.info("🏁 TEST SUMMARY")
    logger.info("="*80)
    logger.info(f"Tests passed: {success_count}/{total_tests}")
    logger.info(f"Success rate: {(success_count/total_tests)*100:.1f}%")
    logger.info(f"Test completed at: {datetime.now()}")
    
    if success_count == total_tests:
        logger.info("🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        logger.error("💥 SOME TESTS FAILED!")
        logger.error("💡 Check the log output above for detailed error information")
        logger.error("💡 Check Docker logs: docker-compose logs zep-graphiti")
        sys.exit(1)