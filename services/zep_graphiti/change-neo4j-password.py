#!/usr/bin/env python3
"""
Change Neo4j password from default to our secure password
"""

import os
from pathlib import Path

def load_secure_password():
    """Load our secure password from secrets directory"""
    secrets_dir = Path(__file__).parent / "secrets"
    password_file = secrets_dir / "neo4j_password.txt"
    
    if not password_file.exists():
        print(f"❌ Password file not found: {password_file}")
        return None
        
    try:
        password = password_file.read_text().strip()
        print(f"✅ Loaded secure password from secrets directory")
        print(f"   Password length: {len(password)} characters")
        return password
    except Exception as e:
        print(f"❌ Error reading password: {e}")
        return None

def change_neo4j_password():
    """Change Neo4j password from default to secure password"""
    print("🔐 Changing Neo4j Password to Secure Version")
    print("=============================================")
    
    # Load our secure password
    new_password = load_secure_password()
    if not new_password:
        print("❌ Could not load secure password")
        return False
    
    try:
        from neo4j import GraphDatabase
        
        # Try connecting with default password first
        uri = "bolt://localhost:7687"
        default_passwords = ["password", "neo4j", ""]
        
        driver = None
        working_password = None
        
        for default_password in default_passwords:
            try:
                print(f"🔍 Trying default password: {'(empty)' if not default_password else default_password}")
                test_driver = GraphDatabase.driver(uri, auth=("neo4j", default_password))
                with test_driver.session() as session:
                    session.run("RETURN 1")
                working_password = default_password
                driver = test_driver
                print(f"✅ Connected with password: {'(empty)' if not default_password else default_password}")
                break
            except Exception as e:
                print(f"   ❌ Failed: {str(e)[:100]}...")
                continue
        
        if not driver:
            print("❌ Could not connect with any default password")
            return False
        
        # Change password to our secure one
        print(f"🔄 Changing password to secure version...")
        with driver.session() as session:
            # Use parameterized query for security
            session.run("ALTER USER neo4j SET PASSWORD $password", password=new_password)
            print("✅ Password changed successfully!")
        
        driver.close()
        
        # Test new password
        print("🔍 Testing new password...")
        new_driver = GraphDatabase.driver(uri, auth=("neo4j", new_password))
        with new_driver.session() as session:
            result = session.run("RETURN 'Password change successful!' as message")
            record = result.single()
            if record:
                print(f"✅ New password works: {record['message']}")
        
        new_driver.close()
        print("✅ Neo4j password change completed successfully!")
        return True
        
    except ImportError:
        print("❌ neo4j package not installed. Run: pip install neo4j")
        return False
    except Exception as e:
        print(f"❌ Password change failed: {e}")
        return False

if __name__ == "__main__":
    success = change_neo4j_password()
    if success:
        print("\n🎉 Neo4j password successfully changed to secure version!")
        print("   • Database now uses randomly generated password")
        print("   • Password stored securely in secrets directory")
        print("   • Ready for production use")
    else:
        print("\n💥 Neo4j password change failed!")
        exit(1)