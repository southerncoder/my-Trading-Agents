# TradingAgents Docker CLI Test Setup

This directory contains test configuration and scripts for running the TradingAgents CLI in Docker with repeatable configurations.

## Files Overview

### Configuration Files
- **`test-config.json`** - Sample configuration file with all available options
- **`services/trading-agents/config.json`** - Default configuration file (can be customized)

### Test Scripts
- **`run-trading-agents-test.ps1`** - PowerShell script for running tests (recommended)
- **`run-trading-agents-test.bat`** - Batch file alternative for Windows CMD

## Prerequisites

1. **Docker Services Running**: Make sure all Docker services are started:
   ```powershell
   docker compose up -d
   ```

2. **Environment Variables**: Ensure all required environment variables are set:
   ```powershell
   # Required for LM Studio
   LOCAL_LM_STUDIO_BASE_URL=http://localhost:1234/v1
   LOCAL_LM_STUDIO_API_KEY=your_local_api_key_here
  REMOTE_LM_STUDIO_BASE_URL=http://your-remote-server:1234/v1
   REMOTE_LM_STUDIO_API_KEY=your_remote_api_key_here

   # Required for other providers (if used)
   OPENAI_API_KEY=your_openai_key
   ANTHROPIC_API_KEY=your_anthropic_key
   # etc.
   ```

## Quick Start

### Using PowerShell (Recommended)
```powershell
# Run with default settings (AAPL, test-config.json)
.\run-trading-agents-test.ps1

# Run with custom ticker
.\run-trading-agents-test.ps1 -Ticker NVDA

# Run with custom config file
.\run-trading-agents-test.ps1 -ConfigFile my-config.json

# Run with custom ticker and date
.\run-trading-agents-test.ps1 -Ticker TSLA -AnalysisDate 2025-09-12

# Run in verbose mode
.\run-trading-agents-test.ps1 -Verbose

# Run in interactive mode (shows CLI menu)
.\run-trading-agents-test.ps1 -Interactive
```

### Using Batch File
```batch
# Run with default settings
run-trading-agents-test.bat

# Run with custom ticker
run-trading-agents-test.bat NVDA

# Run with custom ticker and config
run-trading-agents-test.bat NVDA custom-config.json
```

## Configuration File Structure

The `test-config.json` file demonstrates all available configuration options:

```json
{
  "version": "1.0.0",
  "analysis": {
    "defaultTicker": "AAPL",
    "defaultAnalysisDate": "2025-09-13",
    "defaultAnalysts": ["market", "social", "news", "fundamentals"],
    "models": {
      "quickThinking": {
        "provider": "remote_lmstudio",
        "model": "llama-3.1-8b-instruct"
      },
      "deepThinking": {
        "provider": "remote_lmstudio",
        "model": "llama-3.1-70b-instruct"
      },
      "embedding": {
        "provider": "local_lmstudio",
        "model": "text-embedding-nomic-embed-text-v1.5"
      }
    }
  },
  "flow": {
    "maxDebateRounds": 3,
    "enableOnlineTools": true,
    "enableAdvancedMemory": true
  }
}
```

### Embedding Model Configuration

The system supports a dedicated embedding model for memory and vector operations:

```json
{
  "models": {
    "embedding": {
      "provider": "local_lmstudio",
      "model": "text-embedding-nomic-embed-text-v1.5"
    }
  }
}
```

**Supported Embedding Providers:**
- `local_lmstudio` - Local LM Studio instance (localhost) - **For Trading Agents App**
- `remote_lmstudio` - Remote/Network LM Studio instance - **For Trading Agents App**
- `openai` - OpenAI embedding models

**Required Environment Variables for Embedding:**
- **Local LM Studio (Trading Agents):**
  - `LOCAL_LMSTUDIO_BASE_URL` - Local LM Studio server URL (e.g., `http://localhost:1234/v1`)
  - `LOCAL_LMSTUDIO_API_KEY` - Local LM Studio API key
- **Remote LM Studio (Trading Agents):**
  - `REMOTE_LMSTUDIO_BASE_URL` - Remote LM Studio server URL
  - `REMOTE_LMSTUDIO_API_KEY` - Remote LM Studio API key
- **LM Studio (Zep Graphiti Memory Service):**
  - `LOCAL_LM_STUDIO_BASE_URL` / `REMOTE_LM_STUDIO_BASE_URL` - LM Studio URLs for Zep Graphiti embedding operations

### Setting Environment Variables

#### Option 1: .env.local file (Recommended for local development)
Add to your `.env.local` file in the project root:
```bash
# Local LM Studio for Embeddings
LOCAL_LMSTUDIO_BASE_URL=http://localhost:1234/v1
LOCAL_LMSTUDIO_API_KEY=your_actual_api_key_here
```

#### Option 2: Docker Secrets (For containerized deployment)
The Docker secrets are automatically configured in `docker-compose.yml`:
- `docker/secrets/local_lmstudio_base_url.txt`
- `docker/secrets/local_lmstudio_api_key.txt`

Update these files with your actual values before running Docker services.

#### Option 3: System Environment Variables
Set them in your system environment or terminal session:
```bash
export LOCAL_LMSTUDIO_BASE_URL=http://localhost:1234/v1
export LOCAL_LMSTUDIO_API_KEY=your_actual_api_key_here
```

## Available Options

### PowerShell Script Options
- `-ConfigFile <file>` - Path to config file (default: test-config.json)
- `-Ticker <symbol>` - Stock ticker symbol (default: AAPL)
- `-AnalysisDate <date>` - Analysis date in YYYY-MM-DD format (default: 2025-09-13)
- `-Verbose` - Enable verbose logging
- `-Interactive` - Run in interactive mode (shows CLI menu)
- `-Help` - Show help message

### Batch Script Options
- `ticker` - Stock ticker symbol (positional argument 1)
- `config_file` - Config file name (positional argument 2)

## Output and Results

### Console Output
The scripts will show:
- Docker service health status
- Command being executed
- CLI output and results
- Success/failure status

### Result Files
Analysis results are saved to:
- `data/exports/` - JSON, CSV, and other export formats
- `logs/` - Detailed execution logs
- `data/results/` - Raw analysis data

## Troubleshooting

### Common Issues

1. **"Container is restarting"**
   - The CLI is designed to exit after completion
   - This is normal behavior for non-interactive runs

2. **"Config file not found"**
   - Ensure config file exists in `services/trading-agents/` directory
   - Use absolute paths if needed

3. **"Docker services not healthy"**
   - Run `docker compose up -d` to start all services
   - Check `docker compose logs` for service-specific errors

4. **"LLM provider connection failed"**
   - Verify environment variables are set correctly
   - Check LM Studio or other LLM services are running
   - Ensure API keys are valid

### Debug Mode
Run with verbose logging to see detailed execution:
```powershell
.\run-trading-agents-test.ps1 -Verbose
```

### Manual Testing
You can also run commands manually:
```powershell
# Check service status
docker compose ps

# Run CLI directly
docker compose exec trading-agents node cli.js analyze --ticker AAPL --config /app/test-config.json

# View logs
docker compose logs trading-agents
```

## Customization

### Creating Custom Config Files
1. Copy `test-config.json` to a new file
2. Modify the settings as needed
3. Run the script with `-ConfigFile your-config.json`

### Environment-Specific Configs
Create different config files for different environments:
- `dev-config.json` - Development settings
- `prod-config.json` - Production settings
- `test-config.json` - Testing settings

## Integration Testing

### Automated Testing
The scripts can be integrated into CI/CD pipelines:
```yaml
# Example GitHub Actions step
- name: Run TradingAgents Test
  run: .\run-trading-agents-test.ps1 -ConfigFile ci-config.json
```

### Performance Testing
Run multiple times to test consistency:
```powershell
for ($i = 1; $i -le 5; $i++) {
    Write-Host "Test run $i"
    .\run-trading-agents-test.ps1 -Ticker $ticker
}
```

## Security Notes

- **Never commit sensitive data** to config files
- **Use environment variables** for API keys and secrets
- **Validate config files** before running in production
- **Monitor logs** for sensitive data exposure

## Support

For issues or questions:
1. Check the logs: `docker compose logs trading-agents`
2. Verify environment variables are set
3. Ensure Docker services are healthy
4. Review the configuration file syntax

---

**Last Updated**: September 13, 2025
**Version**: 1.0.0