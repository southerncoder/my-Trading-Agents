#!/usr/bin/env python3
"""
Test Zep-Graphiti Entity Creation
Tests the /entity-node endpoint with proper error handling and logging
"""

import json
import requests
import time

def test_entity_creation():
    """Test entity creation endpoint with proper payload"""
    print("🧠 Testing Zep-Graphiti Entity Creation")
    print("=======================================")
    
    # Test endpoint
    url = "http://localhost:8000/entity-node"
    
    # Proper payload based on API requirements
    payload = {
        "name": "Test Entity",
        "entity_type": "TestType",
        "observations": ["This is a test observation"],
        "edges": []
    }
    
    try:
        print(f"🔗 Testing endpoint: {url}")
        print(f"📦 Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(url, json=payload)
        
        print(f"📊 Response Status: {response.status_code}")
        print(f"📋 Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("✅ Entity creation successful!")
            print(f"📄 Response: {response.json()}")
            return True
        else:
            print(f"❌ Entity creation failed")
            print(f"📄 Error Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed - is Zep-Graphiti running on localhost:8000?")
        return False
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

def test_health_endpoint():
    """Test the health endpoint"""
    try:
        response = requests.get("http://localhost:8000/healthcheck")
        if response.status_code == 200:
            print("✅ Health check passed!")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

if __name__ == "__main__":
    print("Starting Zep-Graphiti API tests...")
    print()
    
    # Test health first
    if not test_health_endpoint():
        print("💥 Health check failed, skipping entity test")
        exit(1)
    
    print()
    
    # Test entity creation
    success = test_entity_creation()
    
    print()
    if success:
        print("💚 All tests passed!")
    else:
        print("💥 Some tests failed!")
        print("💡 Check Docker logs: docker-compose logs zep-graphiti")