import requests
import json
import uuid

# Test healthcheck first
print("=== Testing Healthcheck ===")
try:
    response = requests.get("http://localhost:8000/healthcheck", timeout=10)
    print(f"Healthcheck Status: {response.status_code}")
    print(f"Healthcheck Response: {response.text}")
except Exception as e:
    print(f"Healthcheck failed: {e}")

print("\n=== Testing Settings ===")
# Test a simple endpoint that might show us configuration
try:
    response = requests.post("http://localhost:8000/clear", timeout=10)
    print(f"Clear Status: {response.status_code}")
    print(f"Clear Response: {response.text}")
except Exception as e:
    print(f"Clear failed: {e}")

print("\n=== Testing Entity Creation ===")
# Test entity creation endpoint
url = "http://localhost:8000/entity-node"
data = {
    "uuid": str(uuid.uuid4()),
    "group_id": "test-group-123",
    "name": "test_entity",
    "summary": "This is a test entity for verifying the embedding functionality works correctly."
}

try:
    print(f"Request data: {json.dumps(data, indent=2)}")
    response = requests.post(url, json=data, timeout=30)
    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    print(f"Response Content: {response.text}")
    
    if response.status_code == 201:
        print("✅ SUCCESS: Entity created successfully!")
        try:
            result = response.json()
            print(f"Created entity: {json.dumps(result, indent=2)}")
        except:
            print("Response is not JSON")
    else:
        print(f"❌ FAILED: Got status code {response.status_code}")
        
except requests.exceptions.RequestException as e:
    print(f"❌ CONNECTION ERROR: {e}")
except Exception as e:
    print(f"❌ UNEXPECTED ERROR: {e}")