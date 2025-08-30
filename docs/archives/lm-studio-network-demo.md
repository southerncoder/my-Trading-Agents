# LM Studio Network Configuration Demo

## Setting Up Network LM Studio

### PowerShell Configuration

```powershell
# Set environment variables for network LM Studio
$env:LLM_PROVIDER = "lm_studio"
$env:LM_STUDIO_HOST = "your-server-ip"
$env:LLM_BACKEND_URL = "http://your-server-ip:1234/v1"

# Verify settings
Write-Host "LLM Provider: $env:LLM_PROVIDER"
Write-Host "LM Studio Host: $env:LM_STUDIO_HOST"
Write-Host "Backend URL: $env:LLM_BACKEND_URL"

# Run the CLI with network LM Studio
npm run cli
```

### Alternative: Direct Backend URL

```powershell
# Simpler approach - just set the backend URL
$env:LLM_PROVIDER = "lm_studio"
$env:LLM_BACKEND_URL = "http://your-server-ip:1234/v1"

npm run cli
```

### Using .env.local File (Recommended)

Create a `.env.local` file with your actual configuration:

```bash
# .env.local (IGNORED BY GIT)
LLM_PROVIDER=lm_studio
LM_STUDIO_HOST=your-actual-server-ip
LLM_BACKEND_URL=http://your-actual-server-ip:1234/v1
QUICK_THINK_LLM=llama-3.2-3b-instruct
DEEP_THINK_LLM=llama-3.2-8b-instruct
```

Then just run:
```powershell
npm run cli
```

### Testing Different Network Hosts

```powershell
# For different network hosts, just change the variables
$env:LM_STUDIO_HOST = "your-server-ip"            # Different subnet
$env:LM_STUDIO_HOST = "my-gpu-server"                # Hostname
$env:LLM_BACKEND_URL = "http://my-gpu-server:1234/v1" # Direct URL
```

## Testing the Configuration

```powershell
# Test the network configuration
npm run test-lm-studio-network

# Run a quick CLI test
npm run cli
```

## Benefits

- ✅ **Resource Sharing**: Multiple developers use one powerful GPU server
- ✅ **Scalability**: Separate inference from application servers  
- ✅ **Cost Efficiency**: Centralize expensive GPU hardware
- ✅ **Easy Setup**: Just change environment variables