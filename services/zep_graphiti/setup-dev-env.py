#!/usr/bin/env python3
"""
Development Environment Setup Script for Zep-Graphiti
Helps developers create their local .env.local file securely
"""
import os
import sys
import secrets
import string
from pathlib import Path

def generate_password(length=16):
    """Generate a secure random password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def prompt_with_default(prompt, default=""):
    """Prompt user with a default value"""
    if default:
        response = input(f"{prompt} [{default}]: ").strip()
        return response if response else default
    else:
        return input(f"{prompt}: ").strip()

def setup_development_env():
    """Interactive setup for development environment"""
    print("🔧 Zep-Graphiti Development Environment Setup")
    print("=" * 50)
    
    env_file = Path(".env.local")
    
    if env_file.exists():
        overwrite = input(f"\n⚠️  {env_file} already exists. Overwrite? (y/N): ").strip().lower()
        if overwrite != 'y':
            print("Setup cancelled.")
            return
    
    print("\n📋 Please provide the following configuration:")
    
    # Neo4j Configuration
    print("\n🗃️  Neo4j Database Configuration:")
    neo4j_password = prompt_with_default("Neo4j password (leave empty to generate)", "")
    if not neo4j_password:
        neo4j_password = generate_password()
        print(f"   Generated Neo4j password: {neo4j_password}")
    
    # API Keys
    print("\n🔑 API Key Configuration:")
    use_openai = input("Use OpenAI API? (y/N): ").strip().lower() == 'y'
    
    if use_openai:
        openai_key = prompt_with_default("OpenAI API key (sk-...)", "")
        embedder_key = openai_key  # Use same key for embeddings
    else:
        openai_key = ""
        embedder_key = ""
    
    # Local LLM Configuration
    print("\n🤖 Local LLM Configuration:")
    use_local_llm = input("Use local LLM (LM Studio)? (Y/n): ").strip().lower() != 'n'
    
    if use_local_llm:
        lm_studio_port = prompt_with_default("LM Studio port", "1234")
        openai_base_url = f"http://localhost:{lm_studio_port}/v1"
    else:
        openai_base_url = ""
    
    # Generate .env.local file
    env_content = f"""# Generated Development Environment Configuration
# Created by setup script - DO NOT commit to version control

# =====================================
# Neo4j Database Configuration  
# =====================================
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD={neo4j_password}

# For Docker environment:
# NEO4J_URI=bolt://neo4j:7687

# =====================================
# API Configuration
# ====================================="""

    if openai_key:
        env_content += f"""
OPENAI_API_KEY={openai_key}
EMBEDDER_API_KEY={embedder_key}
OPENAI_MODEL=gpt-4o-mini
EMBEDDING_MODEL=text-embedding-3-small"""
    else:
        env_content += f"""
# OPENAI_API_KEY=sk-your_openai_api_key_here
# EMBEDDER_API_KEY=sk-your_embedder_api_key_here
# OPENAI_MODEL=gpt-4o-mini
# EMBEDDING_MODEL=text-embedding-3-small"""

    if openai_base_url:
        env_content += f"""

# =====================================
# Local LLM Configuration (LM Studio)
# =====================================
OPENAI_BASE_URL={openai_base_url}

# For Docker environment:
# OPENAI_BASE_URL=http://host.docker.internal:{lm_studio_port}/v1"""
    else:
        env_content += f"""

# =====================================
# Local LLM Configuration (LM Studio)
# =====================================
# OPENAI_BASE_URL=http://localhost:1234/v1

# For Docker environment:
# OPENAI_BASE_URL=http://host.docker.internal:1234/v1"""

    env_content += f"""

# =====================================
# Development Settings
# =====================================
ENVIRONMENT=development
LOG_LEVEL=INFO
EMBEDDER_PROVIDER=openai
SEMAPHORE_LIMIT=5
ZEP_EMBEDDER_DEBUG=false
ZEP_EMBEDDER_LOG_RAW=false
GRAPHITI_TELEMETRY_ENABLED=false

# =====================================
# Service Configuration
# =====================================
ZEP_SERVICE_HOST=localhost
ZEP_SERVICE_PORT=8000
ZEP_SERVICE_DEBUG=false
"""
    
    # Write the file
    try:
        env_file.write_text(env_content, encoding='utf-8')
        print(f"\n✅ Created {env_file}")
        
        print("\n📝 Next Steps:")
        print("1. Review and customize the generated .env.local file")
        if not openai_key and not lm_studio_url:
            print("2. Add your API keys or configure LM Studio")
        print("3. Start the services: docker-compose up -d")
        print("4. Check service health: docker-compose ps")
        
        print(f"\n🔒 Security Notes:")
        print(f"   - {env_file} is excluded from version control")
        print(f"   - Generated Neo4j password: {neo4j_password}")
        print(f"   - Store API keys securely and rotate them regularly")
        
    except Exception as e:
        print(f"\n❌ Error creating {env_file}: {e}")
        return False
    
    return True

if __name__ == "__main__":
    # Change to script directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    try:
        setup_development_env()
    except KeyboardInterrupt:
        print("\n\n⚠️  Setup cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Setup failed: {e}")
        sys.exit(1)