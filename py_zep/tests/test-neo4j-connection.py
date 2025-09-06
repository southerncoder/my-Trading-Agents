#!/usr/bin/env python3
"""
Test Neo4j Connection
Tests secure Neo4j connection with random password authentication
"""

import os
import sys
from pathlib import Path

def load_secrets():
    """Load Neo4j credentials from secrets directory"""
    try:
        secrets_dir = Path(__file__).parent.parent / "secrets"
        
        # Load Neo4j user
        user_file = secrets_dir / "neo4j_user.txt"
        if user_file.exists():
            neo4j_user = user_file.read_text().strip()
        else:
            neo4j_user = "neo4j"
        
        # Load Neo4j password
        password_file = secrets_dir / "neo4j_password.txt" 
        if password_file.exists():
            neo4j_password = password_file.read_text().strip()
        else:
            print("❌ Neo4j password file not found in secrets directory")
            return None, None
            
        return neo4j_user, neo4j_password
        
    except Exception as e:
        print(f"❌ Error loading secrets: {e}")
        return None, None

def test_neo4j_connection():
    """Test Neo4j connection with secure authentication"""
    print("🔒 Testing Secure Neo4j Connection")
    print("==================================")
    
    try:
        from neo4j import GraphDatabase
        
        # Load credentials
        neo4j_user, neo4j_password = load_secrets()
        if not neo4j_user or not neo4j_password:
            return False
            
        print("✅ Loaded credentials from secrets directory")
        print(f"   User: {neo4j_user}")
        print(f"   Password length: {len(neo4j_password)} characters")
        
        # Test connection
        neo4j_uri = "bolt://localhost:7687"
        print(f"🔌 Connecting to: {neo4j_uri}")
        
        driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))
        
        with driver.session() as session:
            result = session.run("RETURN 'Connection test' as message")
            record = result.single()
            if record:
                print(f"✅ Connection successful: {record['message']}")
                driver.close()
                return True
        
        driver.close()
        return False
        
    except ImportError:
        print("❌ Neo4j package not installed. Install with: pip install neo4j")
        return False
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

if __name__ == "__main__":
    success = test_neo4j_connection()
    if success:
        print("💚 Neo4j connection test passed!")
        sys.exit(0)
    else:
        print("💥 Neo4j connection test failed!")
        sys.exit(1)