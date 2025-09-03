#!/usr/bin/env python3
"""
Simple Integration Test for Zep-Graphiti Data Flow
Tests basic data writing and retrieval functionality
"""
import requests
import time
import json
from datetime import datetime, timezone

# Configuration
ZEP_SERVICE_URL = "http://localhost:8000"
TEST_GROUP_ID = f"simple-test-{int(time.time())}"

def log(message):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {message}")

def test_basic_functionality():
    """Test basic Zep-Graphiti functionality"""
    log("🚀 Starting Simple Integration Test")
    
    # Test 1: Service Health
    log("Testing service health...")
    try:
        response = requests.get(f"{ZEP_SERVICE_URL}/docs", timeout=10)
        if response.status_code == 200:
            log("✅ Service is healthy")
        else:
            log(f"❌ Service health check failed: {response.status_code}")
            return False
    except Exception as e:
        log(f"❌ Service unreachable: {e}")
        return False
    
    # Test 2: Add a Message
    log("Testing message creation...")
    episode_data = {
        "group_id": TEST_GROUP_ID,
        "messages": [
            {
                "content": "I want to analyze Tesla stock for potential trading opportunities",
                "role_type": "user",
                "role": "trader",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        ]
    }
    
    try:
        response = requests.post(
            f"{ZEP_SERVICE_URL}/messages",
            json=episode_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code in [200, 201, 202]:
            log("✅ Message created successfully")
            log(f"   Response: {response.json()}")
        else:
            log(f"❌ Message creation failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        log(f"❌ Message creation error: {e}")
        return False
    
    # Test 3: Wait and Check Processing
    log("⏳ Waiting 15 seconds for data processing...")
    time.sleep(15)
    
    # Test 4: Retrieve Episodes
    log("Testing episode retrieval...")
    try:
        response = requests.get(
            f"{ZEP_SERVICE_URL}/episodes/{TEST_GROUP_ID}",
            params={"last_n": 10},
            timeout=30
        )
        
        if response.status_code == 200:
            episodes = response.json()
            log(f"✅ Episodes retrieved: Found {len(episodes)} episodes")
            if episodes:
                log(f"   Episode content preview: {episodes[0].get('content', 'N/A')[:50]}...")
            return len(episodes) > 0
        else:
            log(f"❌ Episode retrieval failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        log(f"❌ Episode retrieval error: {e}")
        return False

if __name__ == "__main__":
    success = test_basic_functionality()
    
    if success:
        log("🎉 Basic integration test PASSED - data is being written and retrieved!")
    else:
        log("💥 Basic integration test FAILED - check service configuration")
    
    exit(0 if success else 1)