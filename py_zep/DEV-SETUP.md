# Development Environment Setup Guide

This guide helps you securely configure your local development environment for the Zep-Graphiti trading agents system.

## 🔧 Quick Setup

### Automated Setup (Recommended)

Run the interactive setup script:

**Windows (PowerShell):**
```powershell
cd py_zep
.\setup-dev-env.ps1
```

**Linux/Mac (Python):**
```bash
cd py_zep
python3 setup-dev-env.py
```

### Manual Setup

1. **Copy the template:**
   ```bash
   cp .env.example .env.local
   ```

2. **Edit `.env.local`** with your actual values:
   - Set a secure Neo4j password
   - Add your OpenAI API key (if using OpenAI)
   - Configure LM Studio URL (if using local LLM)

## 🔑 Required Configuration

### Essential Settings

| Variable | Description | Example |
|----------|-------------|---------|
| `NEO4J_PASSWORD` | Secure password for Neo4j database | `your_secure_password_123` |
| `OPENAI_API_KEY` | OpenAI API key (if using OpenAI) | `sk-proj-...` |
| `LM_STUDIO_URL` | LM Studio URL (if using local LLM) | `http://localhost:1234` |

### Environment Options

**Option 1: OpenAI API**
```bash
OPENAI_API_KEY=sk-proj-your-key-here
EMBEDDER_API_KEY=sk-proj-your-key-here
OPENAI_MODEL=gpt-4o-mini
EMBEDDING_MODEL=text-embedding-3-small
```

**Option 2: Local LLM (LM Studio)**
```bash
LM_STUDIO_URL=http://localhost:1234
OPENAI_BASE_URL=http://localhost:1234/v1
# API key can be empty for local LLM
```

**Option 3: Hybrid (OpenAI for embeddings, local for chat)**
```bash
OPENAI_API_KEY=sk-proj-your-key-here
EMBEDDER_API_KEY=sk-proj-your-key-here
LM_STUDIO_URL=http://localhost:1234
OPENAI_BASE_URL=http://localhost:1234/v1
```

## 🐳 Docker Configuration

The system now prioritizes environment variables over secret files:

1. **Environment variables** (from `.env.local`)
2. **Docker secrets** (fallback for production)
3. **Default values** (demo values)

### Start Services

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs zep-graphiti
```

## 🔍 Troubleshooting

### Common Issues

**1. Neo4j Authentication Failed**
```bash
# Check Neo4j logs
docker-compose logs neo4j

# Verify environment variables
docker-compose config
```

**2. LM Studio Connection Failed**
```bash
# For Docker containers to reach host LM Studio:
LM_STUDIO_URL=http://host.docker.internal:1234
```

**3. Missing API Keys**
```bash
# Check if variables are set
docker exec trading-agents-zep-graphiti env | grep API_KEY
```

### Health Checks

```bash
# Check Neo4j health
curl http://localhost:7474

# Check Zep-Graphiti health  
curl http://localhost:8000/docs
```

## 🔒 Security Best Practices

### Development
- ✅ Use `.env.local` for local configuration
- ✅ Generate strong passwords (use setup script)
- ✅ Never commit `.env.local` to version control
- ✅ Use different passwords for dev/prod

### Production
- ✅ Use proper secrets management (Azure Key Vault, etc.)
- ✅ Rotate API keys regularly
- ✅ Use Docker secrets for sensitive data
- ✅ Enable audit logging

## 📁 File Structure

```
py_zep/
├── .env.example          # Template (committed)
├── .env.local           # Your config (ignored)
├── setup-dev-env.py     # Python setup script
├── setup-dev-env.ps1    # PowerShell setup script
├── docker-compose.yml   # Service definitions
└── secrets/
    ├── simple-init.py   # Environment loader
    └── *.txt           # Demo values (ignored)
```

## 🎯 Environment Priority

The system loads configuration in this order:

1. **Environment Variables** (highest priority)
2. **Docker Secrets** (production fallback)
3. **Demo Values** (development defaults)

This allows you to:
- Use environment variables for development
- Use Docker secrets for production
- Have working defaults for quick testing

## ⚡ Quick Start Commands

```bash
# Clone and setup
git clone <repo>
cd py_zep

# Run setup (choose Windows or Linux version)
.\setup-dev-env.ps1      # Windows
python3 setup-dev-env.py # Linux/Mac

# Start services
docker-compose up -d

# Test connection
curl http://localhost:8000/docs
```

## 🆘 Getting Help

If you encounter issues:

1. Check the logs: `docker-compose logs`
2. Verify configuration: `docker-compose config`
3. Test connectivity: Use the health check endpoints
4. Review security: Ensure `.env.local` is in `.gitignore`

---

**⚠️ Remember:** Never commit real API keys or passwords to version control!