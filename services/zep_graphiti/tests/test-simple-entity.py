#!/usr/bin/env python3
"""
Simple entity creation test without Unicode characters
"""

import requests
import json
import sys
import time

def test_simple_entity():
    """Test basic entity creation"""
    print("Testing simple entity creation...")
    
    # Test data for entity-node endpoint
    entity_data = {
        "uuid": "test-networking-entity-001",
        "group_id": "test-group-networking",
        "name": "NetworkingTestEntity",
        "summary": "This is a test entity created after fixing the host.docker.internal networking issue"
    }
    
    try:
        response = requests.post(
            "http://localhost:8000/entity-node",
            json=entity_data,
            timeout=30
        )
        
        print(f"Response Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            result = response.json()
            print("SUCCESS: Entity created successfully")
            print(f"Response: {json.dumps(result, indent=2)}")
            return True
        else:
            print(f"FAILED: HTTP {response.status_code}")
            print(f"Response text: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"REQUEST ERROR: {e}")
        return False
    except Exception as e:
        print(f"UNEXPECTED ERROR: {e}")
        return False

if __name__ == "__main__":
    success = test_simple_entity()
    print(f"\nTest result: {'PASSED' if success else 'FAILED'}")
    sys.exit(0 if success else 1)