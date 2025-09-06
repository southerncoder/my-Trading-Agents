#!/usr/bin/env python3
"""
Comprehensive Integration Tests for Zep-Graphiti
Tests data writing and retrieval to ensure end-to-end functionality
"""
import asyncio
import json
import time
import requests
import uuid
from datetime import datetime, timezone

# Configuration
ZEP_SERVICE_URL = "http://localhost:8000"
TEST_GROUP_ID = f"integration-test-{int(time.time())}"

def log_test(message, status="INFO"):
    """Log test messages with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {status}: {message}")

def check_service_health():
    """Check if Zep-Graphiti service is healthy"""
    try:
        response = requests.get(f"{ZEP_SERVICE_URL}/docs", timeout=10)
        if response.status_code == 200:
            log_test("✅ Zep-Graphiti service is healthy", "SUCCESS")
            return True
        else:
            log_test(f"❌ Service health check failed: {response.status_code}", "ERROR")
            return False
    except Exception as e:
        log_test(f"❌ Service unreachable: {e}", "ERROR")
        return False

def test_add_episode(message_content, test_id):
    """Test adding an episode to Zep"""
    log_test(f"📝 Testing episode creation: {test_id}")
    
    episode_data = {
        "group_id": TEST_GROUP_ID,
        "messages": [
            {
                "content": message_content,
                "role_type": "user",
                "role": "integration_tester",
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
            log_test(f"✅ Episode created successfully: {test_id}", "SUCCESS")
            return True, response.json() if response.content else {"status": "created"}
        else:
            log_test(f"❌ Episode creation failed: {response.status_code} - {response.text}", "ERROR")
            return False, None
    except Exception as e:
        log_test(f"❌ Episode creation error: {e}", "ERROR")
        return False, None

def test_add_entity(entity_name, entity_data, test_id):
    """Test adding an entity to Zep"""
    log_test(f"🔗 Testing entity creation: {test_id}")
    
    entity_uuid = str(uuid.uuid4())
    entity_payload = {
        "uuid": entity_uuid,
        "group_id": TEST_GROUP_ID,
        "name": entity_name,
        "summary": f"Test entity: {entity_name} - {json.dumps(entity_data)}"
    }
    
    try:
        response = requests.post(
            f"{ZEP_SERVICE_URL}/entity-node",
            json=entity_payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code in [200, 201]:
            log_test(f"✅ Entity created successfully: {test_id}", "SUCCESS")
            return True, response.json() if response.content else {"status": "created", "uuid": entity_uuid}
        else:
            log_test(f"❌ Entity creation failed: {response.status_code} - {response.text}", "ERROR")
            return False, None
    except Exception as e:
        log_test(f"❌ Entity creation error: {e}", "ERROR")
        return False, None

def test_search_memories(query, test_id):
    """Test searching memories in Zep"""
    log_test(f"🔍 Testing memory search: {test_id}")
    
    search_data = {
        "query": query,
        "group_ids": [TEST_GROUP_ID],
        "max_facts": 10
    }
    
    try:
        response = requests.post(
            f"{ZEP_SERVICE_URL}/search",
            json=search_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            results = response.json()
            log_test(f"✅ Search completed: {test_id} - Found {len(results) if isinstance(results, list) else 'unknown'} results", "SUCCESS")
            return True, results
        else:
            log_test(f"❌ Search failed: {response.status_code} - {response.text}", "ERROR")
            return False, None
    except Exception as e:
        log_test(f"❌ Search error: {e}", "ERROR")
        return False, None

def test_get_episodes(test_id):
    """Test retrieving episodes from Zep"""
    log_test(f"📚 Testing episode retrieval: {test_id}")
    
    try:
        response = requests.get(
            f"{ZEP_SERVICE_URL}/episodes/{TEST_GROUP_ID}",
            params={"last_n": 10},
            timeout=30
        )
        
        if response.status_code == 200:
            episodes = response.json()
            log_test(f"✅ Episodes retrieved: {test_id} - Found {len(episodes) if isinstance(episodes, list) else 'unknown'} episodes", "SUCCESS")
            return True, episodes
        else:
            log_test(f"❌ Episode retrieval failed: {response.status_code} - {response.text}", "ERROR")
            return False, None
    except Exception as e:
        log_test(f"❌ Episode retrieval error: {e}", "ERROR")
        return False, None

def test_get_memory(query, test_id):
    """Test getting structured memory from Zep"""
    log_test(f"🧠 Testing memory retrieval: {test_id}")
    
    memory_data = {
        "group_id": TEST_GROUP_ID,
        "center_node_uuid": None,
        "max_facts": 10,
        "messages": [
            {
                "content": query,
                "role_type": "user", 
                "role": "integration_tester",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        ]
    }
    
    try:
        response = requests.post(
            f"{ZEP_SERVICE_URL}/get-memory",
            json=memory_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            memory = response.json()
            log_test(f"✅ Memory retrieved: {test_id} - Response received", "SUCCESS")
            return True, memory
        else:
            log_test(f"❌ Memory retrieval failed: {response.status_code} - {response.text}", "ERROR")
            return False, None
    except Exception as e:
        log_test(f"❌ Memory retrieval error: {e}", "ERROR")
        return False, None

def run_integration_tests():
    """Run comprehensive integration tests"""
    log_test("🚀 Starting Zep-Graphiti Integration Tests")
    log_test(f"   Test Group ID: {TEST_GROUP_ID}")
    log_test(f"   Service URL: {ZEP_SERVICE_URL}")
    
    # Test data
    test_data = [
        {
            "message": "I need to analyze AAPL stock performance for trading strategy",
            "entity_name": "AAPL_Stock",
            "entity_data": {
                "type": "stock",
                "symbol": "AAPL",
                "sector": "technology",
                "analysis_date": datetime.now().isoformat()
            },
            "search_query": "AAPL stock analysis"
        },
        {
            "message": "Trading strategy for Tesla requires risk assessment and momentum indicators",
            "entity_name": "Tesla_Strategy",
            "entity_data": {
                "type": "trading_strategy", 
                "company": "Tesla",
                "indicators": ["momentum", "risk_assessment"],
                "created_date": datetime.now().isoformat()
            },
            "search_query": "Tesla trading strategy"
        }
    ]
    
    results = {
        "service_health": False,
        "data_write_tests": [],
        "data_retrieval_tests": [],
        "search_tests": [],
        "total_tests": 0,
        "passed_tests": 0
    }
    
    # 1. Check service health
    log_test("=" * 60)
    log_test("PHASE 1: Service Health Check")
    results["service_health"] = check_service_health()
    if not results["service_health"]:
        log_test("❌ Service health check failed - aborting tests", "ERROR")
        return results
    
    # 2. Data Writing Tests
    log_test("=" * 60)
    log_test("PHASE 2: Data Writing Tests")
    
    for i, test in enumerate(test_data, 1):
        test_id = f"write-test-{i}"
        
        # Test episode creation
        success, response = test_add_episode(test["message"], f"{test_id}-episode")
        results["data_write_tests"].append({
            "test": f"{test_id}-episode",
            "success": success,
            "response": response
        })
        results["total_tests"] += 1
        if success:
            results["passed_tests"] += 1
        
        # Test entity creation
        success, response = test_add_entity(test["entity_name"], test["entity_data"], f"{test_id}-entity")
        results["data_write_tests"].append({
            "test": f"{test_id}-entity", 
            "success": success,
            "response": response
        })
        results["total_tests"] += 1
        if success:
            results["passed_tests"] += 1
        
        # Wait between tests to allow processing
        time.sleep(2)
    
    # 3. Data Retrieval Tests
    log_test("=" * 60)
    log_test("PHASE 3: Data Retrieval Tests")
    
    # Wait for indexing
    log_test("⏳ Waiting 10 seconds for data indexing...")
    time.sleep(10)
    
    # Test episode retrieval
    success, response = test_get_episodes("episode-retrieval")
    results["data_retrieval_tests"].append({
        "test": "episode-retrieval",
        "success": success,
        "response": response
    })
    results["total_tests"] += 1
    if success:
        results["passed_tests"] += 1
    
    # Test memory retrieval
    success, response = test_get_memory("trading strategy analysis", "memory-retrieval")
    results["data_retrieval_tests"].append({
        "test": "memory-retrieval",
        "success": success,
        "response": response
    })
    results["total_tests"] += 1
    if success:
        results["passed_tests"] += 1
    
    # 4. Search Tests
    log_test("=" * 60)
    log_test("PHASE 4: Search Tests")
    
    for i, test in enumerate(test_data, 1):
        test_id = f"search-test-{i}"
        success, response = test_search_memories(test["search_query"], test_id)
        results["search_tests"].append({
            "test": test_id,
            "query": test["search_query"],
            "success": success,
            "response": response
        })
        results["total_tests"] += 1
        if success:
            results["passed_tests"] += 1
        
        time.sleep(2)
    
    # 5. Final Summary
    log_test("=" * 60)
    log_test("INTEGRATION TEST SUMMARY")
    log_test(f"   Total Tests: {results['total_tests']}")
    log_test(f"   Passed Tests: {results['passed_tests']}")
    log_test(f"   Failed Tests: {results['total_tests'] - results['passed_tests']}")
    log_test(f"   Success Rate: {(results['passed_tests'] / results['total_tests'] * 100):.1f}%")
    
    if results["passed_tests"] == results["total_tests"]:
        log_test("🎉 ALL TESTS PASSED - Zep-Graphiti is working correctly!", "SUCCESS")
    else:
        log_test(f"⚠️  {results['total_tests'] - results['passed_tests']} tests failed - review logs above", "WARNING")
    
    return results

if __name__ == "__main__":
    results = run_integration_tests()
    
    # Save results to file
    with open("integration_test_results.json", "w") as f:
        json.dump(results, f, indent=2, default=str)
    
    log_test(f"📄 Test results saved to integration_test_results.json")
    
    # Exit with appropriate code
    exit(0 if results["passed_tests"] == results["total_tests"] else 1)