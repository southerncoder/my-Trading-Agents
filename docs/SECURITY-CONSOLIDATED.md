# Security Guide - Trading Agents Framework

## 🛡️ Overview
TradingAgents implements comprehensive security practices to protect sensitive data, API keys, and ensure secure deployment across different environments. This document consolidates all security requirements and best practices.

## 🔍 Latest Security Audit Results (August 30, 2025)

### ✅ Security Status: CLEAN
- **No hardcoded secrets found** in source files
- **No API keys exposed** in documentation or tests
- **No private IP addresses** in committed code
- **All configuration externalized** via environment variables
- **Zero npm vulnerabilities** (verified via `npm audit`)

### Audit Scope
- ✅ All TypeScript source files (`js/src/**/*.ts`)
- ✅ All test files (`js/tests/**/*.js`)
- ✅ All configuration files (`.env*`, `docker-compose.yml`)
- ✅ All documentation (`docs/**/*.md`)
- ✅ All script files (`.ps1`, `.sh`, `.js`)

## 🔐 Environment Variable Security

### Required Environment Variables
```bash
# LLM Provider Configuration
LLM_PROVIDER=lm_studio|openai|anthropic|google
LLM_BACKEND_URL=http://your_host:1234/v1  # replace with your LM Studio base URL

# API Keys (choose based on provider)
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
GOOGLE_API_KEY=your_google_key_here

# Data Source APIs
FINNHUB_API_KEY=your_finnhub_key_here
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
REDDIT_USERNAME=your_reddit_username
REDDIT_PASSWORD=your_reddit_password

# LM Studio Network Configuration
LM_STUDIO_HOST=your_host_ip
LM_STUDIO_PORT=1234
```

### Environment Files Structure
```
.env.local          # Local development (gitignored)
.env.example        # Template with placeholders (committed)
.env.template       # Alternative template (committed)
py_zep/.env.example # Zep service template (committed)
```

## 🚫 Security Restrictions

### Never Commit These Items
- ❌ Actual API keys or tokens
- ❌ Private IP addresses (192.168.x.x, 10.x.x.x, 172.x.x.x)
- ❌ Passwords or credentials
- ❌ Personal or company-specific URLs
- ❌ Database connection strings with credentials

### Always Use Placeholders
- ✅ `your_api_key_here`
- ✅ `your_host_ip`
- ✅ `your_username`
- ✅ `localhost` or `127.0.0.1` for local services

## 🔧 Secure Configuration Patterns

### Docker Compose Security
```yaml
environment:
  - OPENAI_API_KEY=${OPENAI_API_KEY}
  - EMBEDDING_MODEL=${EMBEDDING_MODEL:-<your_embedding_model_id>}
  - OPENAI_BASE_URL=${OPENAI_BASE_URL:-<your_lm_studio_base_url>}
  - NEO4J_PASSWORD=${NEO4J_PASSWORD:-your_strong_password_here}
```

### TypeScript Configuration
```typescript
const config = {
  llmProvider: process.env.LLM_PROVIDER || 'lm_studio',
  backendUrl: process.env.LLM_BACKEND_URL || '<your_lm_studio_base_url>',
  apiKey: process.env.OPENAI_API_KEY, // No default for sensitive data
};
```

## 🏗️ Deployment Security

### Production Environment
1. **Use secrets management** (Azure Key Vault, AWS Secrets Manager)
2. **Rotate API keys regularly**
3. **Monitor API usage** for anomalies
4. **Use HTTPS** for all external communications
5. **Implement rate limiting** on API endpoints
6. **Enable audit logging** for all API calls

### Container Security
1. **Use official Docker images** only (zepai/graphiti:latest, neo4j:5.26.0)
2. **Set strong passwords** for database services
3. **Use network isolation** between services
4. **Regular security updates** for base images
5. **Scan containers** for vulnerabilities

## 🔍 Security Validation

### Pre-Commit Checks
Run these commands before committing:
```powershell
# Search for potential secrets
Select-String -Pattern "sk-|pk-|[A-Za-z0-9_-]{40,}" -Path js/src/**, js/tests/** -Exclude *.json

# Search for IP addresses
Select-String -Pattern "192\.168\.|10\.|172\." -Path js/**, docs/** -Exclude *.md

# NPM security audit
npm audit --audit-level=moderate
```

### Automated Security Scanning
The project uses:
- **npm audit** for dependency vulnerabilities
- **ESLint** for code security patterns
- **TypeScript** for type safety
- **Git pre-commit hooks** (recommended)

## 📋 Security Checklist

### Before Each Release
- [ ] Run `npm audit` and fix any vulnerabilities
- [ ] Verify no secrets in committed files
- [ ] Check all `.env.example` files use placeholders
- [ ] Validate Docker security settings
- [ ] Test with minimal permissions
- [ ] Review access logs for anomalies

### For New Team Members
- [ ] Set up `.env.local` with actual credentials
- [ ] Never commit `.env.local` to version control
- [ ] Use company-approved API keys
- [ ] Follow secure coding guidelines
- [ ] Report security issues immediately

## 🚨 Incident Response

### If Secrets Are Accidentally Committed
1. **Immediately rotate** all exposed credentials
2. **Notify security team** if applicable
3. **Remove from git history** using `git filter-branch` or BFG
4. **Force push** cleaned history
5. **Update documentation** with lessons learned

### Emergency Contacts
- Security issues: [Follow your organization's security reporting process]
- API key rotation: [Contact your API provider's support]
- Infrastructure issues: [Contact your DevOps team]

---

**Last Updated**: August 30, 2025  
**Next Review**: September 30, 2025  
**Security Level**: Production Ready ✅