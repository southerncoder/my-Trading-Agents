import requests
import json
import uuid

url = "http://localhost:8000/entity-node"
data = {
    "uuid": str(uuid.uuid4()),
    "group_id": "test_group",
    "name": "AAPL",
    "summary": "Apple Inc. is a multinational technology company that trades on NASDAQ"
}

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    # Accept 201 Created as success
    if response.status_code in (200, 201):
        print("✅ SUCCESS: Entity created successfully!")
    else:
        print(f"❌ FAILED: Entity creation failed (status: {response.status_code})")
        
except Exception as e:
    print(f"❌ ERROR: {e}")