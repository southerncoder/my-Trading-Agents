# Docker Secrets Management

This directory contains the centralized Docker secrets management system for the Trading Agents project.

## Overview

The Trading Agents project uses Docker secrets for secure management of API keys, database credentials, and other sensitive configuration. This approach provides better security than environment variables as secrets are:

- Encrypted at rest
- Only accessible to containers that explicitly declare them
- Not visible in `docker inspect` output
- Not logged in container logs
- Managed separately from application code

## Directory Structure

```
docker/secrets/
├── migrate-secrets.sh      # Bash migration script (Linux/Mac)
├── migrate-secrets.ps1     # PowerShell migration script (Windows)
├── README.md              # This documentation
└── [secret-files].txt     # Individual secret files (created by migration)
```

## Secret Files

The following secret files are created by the migration script:

### AI Provider Secrets
- `openai_api_key.txt` - OpenAI API key (get from https://platform.openai.com/api-keys)
- `openai_base_url.txt` - OpenAI base URL (optional, defaults to https://api.openai.com/v1)
- `anthropic_api_key.txt` - Anthropic API key
- `google_api_key.txt` - Google API key
- `embedder_api_key.txt` - Embedding API key

### News Provider Secrets
- `brave_news_api_key.txt` - Brave News API key
- `news_api_key.txt` - News API key
- `yahoo_finance_api_key.txt` - Yahoo Finance API key

### Market Data Provider Secrets
- `finnhub_api_key.txt` - Finnhub API key
- `alpha_vantage_api_key.txt` - Alpha Vantage API key
- `marketstack_api_key.txt` - Marketstack API key

### Reddit API Secrets
- `reddit_client_id.txt` - Reddit OAuth client ID
- `reddit_client_secret.txt` - Reddit OAuth client secret
- `reddit_refresh_token.txt` - Reddit OAuth refresh token
- `reddit_username.txt` - Reddit username
- `reddit_password.txt` - Reddit password
- `reddit_user_agent.txt` - Reddit user agent string
- `reddit_service_api_key.txt` - Internal service API key

### Database Secrets
- `neo4j_user.txt` - Neo4j database username
- `neo4j_password.txt` - Neo4j database password
- `redis_password.txt` - Redis cache password (optional, leave empty for no auth)

### LM Studio Configuration
- `lm_studio_url.txt` - Local LM Studio base URL
- `lm_studio_remote_url.txt` - Remote LM Studio base URL

## Usage

### Initial Setup

1. **Configure Environment Variables**
   ```bash
   # Edit .env.local in project root with your actual values
   OPENAI_API_KEY=your_actual_openai_key
   BRAVE_NEWS_API_KEY=your_actual_brave_key
   # ... other variables
   ```

2. **Run Migration Script**

   **Windows (PowerShell):**
   ```powershell
   .\docker\secrets\migrate-secrets.ps1
   ```

   **Linux/Mac (Bash):**
   ```bash
   ./docker/secrets/migrate-secrets.sh
   ```

3. **Verify Secrets Created**
   ```bash
   ls -la docker/secrets/
   ```

### Docker Compose Integration

The main `docker-compose.yml` file automatically uses these secrets:

```yaml
services:
  trading-agents:
    secrets:
      - openai_api_key
      - brave_news_api_key
      # ... other secrets

secrets:
  openai_api_key:
    file: ./docker/secrets/openai_api_key.txt
  brave_news_api_key:
    file: ./docker/secrets/brave_news_api_key.txt
```

### Accessing Secrets in Containers

Secrets are mounted as files in containers at `/run/secrets/`:

```bash
# Read secret in container
OPENAI_KEY=$(cat /run/secrets/openai_api_key)

# Use in application
export OPENAI_API_KEY="$OPENAI_KEY"
```

## Security Best Practices

1. **Never commit secret files** - They are in `.gitignore`
2. **Use strong, unique values** for all secrets
3. **Rotate secrets regularly** using the migration script
4. **Limit secret access** to only necessary containers
5. **Monitor secret usage** through Docker logs
6. **Backup secrets securely** (encrypted) if needed

## Troubleshooting

### Migration Script Issues

**"Environment variable not found"**
- Ensure `.env.local` exists in project root
- Check variable name spelling in `.env.local`
- Verify variable has a non-empty value

**"Permission denied"**
- On Windows: Run PowerShell as Administrator
- On Linux/Mac: `chmod +x migrate-secrets.sh`

### Docker Secrets Issues

**"Secret file not found"**
- Run migration script to create secrets
- Check file paths in `docker-compose.yml`
- Verify secrets directory exists

**"Permission denied in container"**
- Ensure container user can read `/run/secrets/`
- Check file permissions on secret files

### Updating Secrets

To update existing secrets:

1. Update values in `.env.local`
2. Run migration script again
3. Restart containers: `docker-compose down && docker-compose up -d`

## Migration from Environment Variables

If migrating from environment variables:

1. **Backup current setup**
2. **Update docker-compose.yml** to use secrets instead of `env_file` or `environment`
3. **Run migration script** to create secret files
4. **Test thoroughly** before removing old environment variables
5. **Update documentation** to reflect new approach

## Related Files

- `../docker-compose.yml` - Main Docker Compose configuration
- `../../.env.local` - Environment variables source
- `../../.gitignore` - Ensures secrets aren't committed