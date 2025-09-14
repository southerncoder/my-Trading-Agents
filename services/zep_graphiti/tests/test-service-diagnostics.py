#!/usr/bin/env python3
"""
Test Service Diagnostics and Troubleshooting
Comprehensive health check and diagnostics for all services
"""

import requests
import subprocess
import json
import os
from pathlib import Path

def test_docker_services():
    """Test Docker service status"""
    print("🐳 Testing Docker Services")
    print("==========================")
    
    try:
        # Check if services are running
        result = subprocess.run(
            ["docker-compose", "ps", "--services", "--filter", "status=running"], 
            capture_output=True, text=True, cwd=Path(__file__).parent.parent
        )
        
        if result.returncode == 0:
            running_services = result.stdout.strip().split('\n')
            print(f"✅ Running services: {running_services}")
            return len(running_services) >= 2  # neo4j and zep-graphiti
        else:
            print(f"❌ Docker compose error: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Docker test failed: {e}")
        return False

def test_environment_config():
    """Test environment configuration"""
    print("\n🔧 Testing Environment Configuration")
    print("====================================")
    
    env_file = Path(__file__).parent.parent / ".env.local"
    
    if not env_file.exists():
        print("❌ .env.local file not found")
        return False
    
    try:
        with open(env_file, 'r') as f:
            content = f.read()
            
        # Check for required variables
        required_vars = [
            'NEO4J_URI',
            'NEO4J_USER', 
            'OPENAI_BASE_URL',
            'EMBEDDER_PROVIDER'
        ]
        
        missing_vars = []
        for var in required_vars:
            if var not in content:
                missing_vars.append(var)
        
        if missing_vars:
            print(f"❌ Missing environment variables: {missing_vars}")
            return False
        else:
            print("✅ All required environment variables present")
            return True
            
    except Exception as e:
        print(f"❌ Environment config test failed: {e}")
        return False

def test_secrets_security():
    """Test that secrets are properly secured"""
    print("\n🔒 Testing Secrets Security")
    print("===========================")
    
    secrets_dir = Path(__file__).parent.parent / "secrets"
    
    if not secrets_dir.exists():
        print("❌ Secrets directory not found")
        return False
    
    # Check for required secret files
    required_secrets = [
        'neo4j_password.txt',
        'openai_api_key.txt',
        'embedder_api_key.txt'
    ]
    
    missing_secrets = []
    for secret in required_secrets:
        secret_file = secrets_dir / secret
        if not secret_file.exists():
            missing_secrets.append(secret)
    
    if missing_secrets:
        print(f"❌ Missing secret files: {missing_secrets}")
        return False
    else:
        print("✅ All required secret files present")
        return True

def run_all_tests():
    """Run comprehensive service tests"""
    print("🚀 Running Comprehensive Service Tests")
    print("======================================")
    
    tests = [
        ("Docker Services", test_docker_services),
        ("Environment Config", test_environment_config), 
        ("Secrets Security", test_secrets_security)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        try:
            results[test_name] = test_func()
        except Exception as e:
            print(f"❌ {test_name} test crashed: {e}")
            results[test_name] = False
    
    # Summary
    print("\n📊 Test Results Summary")
    print("======================")
    
    passed = 0
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1
    
    print(f"\n📈 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("💚 All tests passed!")
        return True
    else:
        print("💥 Some tests failed!")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)