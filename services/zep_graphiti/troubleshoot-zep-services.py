#!/usr/bin/env python3
"""
Comprehensive Zep Services Troubleshooting Script
"""

import os
import time
import requests
from pathlib import Path

def check_environment_variables():
    """Check critical environment variables"""
    print("🔍 Environment Variables Check")
    print("=" * 40)
    
    required_vars = [
        'NEO4J_URI', 'NEO4J_USER', 'NEO4J_PASSWORD',
        'OPENAI_API_KEY', 'OPENAI_BASE_URL', 'EMBEDDING_MODEL'
    ]
    
    # Load from .env.local
    env_file = Path('.env.local')
    if env_file.exists():
        print(f"✅ Found .env.local file")
        with open(env_file) as f:
            lines = f.readlines()
        
        env_vars = {}
        for line in lines:
            if '=' in line and not line.strip().startswith('#'):
                key, value = line.strip().split('=', 1)
                env_vars[key] = value
        
        for var in required_vars:
            if var in env_vars:
                if var.endswith('PASSWORD') or var.endswith('KEY'):
                    print(f"   {var}: {'*' * min(len(env_vars[var]), 8)} (length: {len(env_vars[var])})")
                else:
                    print(f"   {var}: {env_vars[var]}")
            else:
                print(f"   ❌ {var}: NOT SET")
    else:
        print("❌ .env.local file not found")

def check_secrets_files():
    """Check secrets directory"""
    print("\n🔐 Secrets Directory Check")
    print("=" * 40)
    
    secrets_dir = Path('secrets')
    if not secrets_dir.exists():
        print("❌ Secrets directory does not exist")
        return
    
    required_files = ['neo4j_user.txt', 'neo4j_password.txt']
    for file_name in required_files:
        file_path = secrets_dir / file_name
        if file_path.exists():
            content = file_path.read_text().strip()
            if file_name.endswith('password.txt'):
                print(f"✅ {file_name}: {'*' * min(len(content), 8)} (length: {len(content)})")
            else:
                print(f"✅ {file_name}: {content}")
        else:
            print(f"❌ {file_name}: NOT FOUND")

def test_neo4j_connection():
    """Test direct Neo4j connection"""
    print("\n🗄️ Neo4j Connection Test")
    print("=" * 40)
    
    try:
        from neo4j import GraphDatabase
        
        # Load credentials
        secrets_dir = Path('secrets')
        user_file = secrets_dir / 'neo4j_user.txt'
        password_file = secrets_dir / 'neo4j_password.txt'
        
        if not user_file.exists() or not password_file.exists():
            print("❌ Credentials files not found")
            return False
            
        user = user_file.read_text().strip()
        password = password_file.read_text().strip()
        
        # Test connection
        uri = "bolt://localhost:7687"
        print(f"🔌 Testing connection to {uri}")
        
        driver = GraphDatabase.driver(uri, auth=(user, password))
        with driver.session() as session:
            result = session.run("RETURN 'Connection successful' as message")
            record = result.single()
            if record:
                print(f"✅ Neo4j connection successful: {record['message']}")
                return True
        
        driver.close()
        
    except ImportError:
        print("❌ neo4j package not installed")
        return False
    except Exception as e:
        print(f"❌ Neo4j connection failed: {e}")
        return False

def test_zep_service():
    """Test Zep-Graphiti service"""
    print("\n🚀 Zep-Graphiti Service Test")
    print("=" * 40)
    
    base_url = "http://localhost:8000"
    
    # Test health endpoint
    try:
        print(f"🔍 Testing health endpoint: {base_url}/docs")
        response = requests.get(f"{base_url}/docs", timeout=5)
        if response.status_code == 200:
            print("✅ Service is responding")
            
            # Test API endpoint
            print(f"🔍 Testing API endpoint: {base_url}/healthcheck")
            health_response = requests.get(f"{base_url}/healthcheck", timeout=5)
            print(f"   Health check status: {health_response.status_code}")
            
            return True
        else:
            print(f"❌ Service returned status: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Service is not responding (connection refused)")
        return False
    except requests.exceptions.Timeout:
        print("❌ Service timeout")
        return False
    except Exception as e:
        print(f"❌ Service test failed: {e}")
        return False

def check_docker_containers():
    """Check Docker container status"""
    print("\n🐳 Docker Container Status")
    print("=" * 40)
    
    import subprocess
    
    try:
        # Check container status
        result = subprocess.run(['docker-compose', 'ps'], 
                              capture_output=True, text=True, cwd='.')
        print("Container Status:")
        print(result.stdout)
        
        # Check Zep-Graphiti logs
        print("\nRecent Zep-Graphiti Logs:")
        log_result = subprocess.run(['docker-compose', 'logs', '--tail=10', 'zep-graphiti'], 
                                  capture_output=True, text=True, cwd='.')
        print(log_result.stdout)
        
    except subprocess.SubprocessError as e:
        print(f"❌ Docker command failed: {e}")

def main():
    """Run comprehensive troubleshooting"""
    print("🔧 Zep Services Comprehensive Troubleshooting")
    print("=" * 50)
    
    # Run all checks
    check_environment_variables()
    check_secrets_files()
    neo4j_ok = test_neo4j_connection()
    zep_ok = test_zep_service()
    check_docker_containers()
    
    # Summary
    print("\n📋 Summary")
    print("=" * 40)
    print(f"   Neo4j Connection: {'✅ OK' if neo4j_ok else '❌ FAILED'}")
    print(f"   Zep Service: {'✅ OK' if zep_ok else '❌ FAILED'}")
    
    if neo4j_ok and zep_ok:
        print("\n🎉 All services are working correctly!")
        return True
    else:
        print("\n💥 Issues detected - see details above")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)