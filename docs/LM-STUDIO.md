# LM Studio Network Configuration Guide

## Overview

The TradingAgents framework now supports both local and network-accessible LM Studio instances, allowing for flexible deployment scenarios including remote GPU servers and shared LM Studio instances.

## Configuration Options

### 1. Local LM Studio (Default)
```typescript
import { ModelProvider } from './src/models/provider.js';

// Default local configuration
const localConfig = ModelProvider.getLMStudioConfig();
// Uses: http://your_host_ip:1234/v1
```

### 2. Network LM Studio (Environment-based)
```typescript
// Network configuration using environment variables
const networkConfig = ModelProvider.getLMStudioNetworkConfig();
// Uses: http://${process.env.LM_STUDIO_HOST || 'localhost'}:1234/v1

// Custom network host via parameter
const customNetworkConfig = ModelProvider.getLMStudioNetworkConfig(
  'llama-3.2-8b-instruct',
  'your-server-hostname'
);
```

### 3. Custom URL Configuration
```typescript
// Fully custom configuration
const customConfig = ModelProvider.getLMStudioConfig(
  'custom-model-name',
  'http://your-server-ip:1234/v1'
);
```

## Environment Variables

Set these environment variables to configure LM Studio automatically:

```powershell
# For network LM Studio
$env:LLM_PROVIDER = "openai"
$env:LM_STUDIO_HOST = "your-server-ip"
$env:LLM_BACKEND_URL = "http://your-server-ip:1234/v1"

# Or use direct backend URL override
$env:LLM_PROVIDER = "openai"
$env:LLM_BACKEND_URL = "http://your-server-ip:1234/v1"
```

```bash
# For Linux/Mac
export LLM_PROVIDER="openai"
export LM_STUDIO_HOST="your-server-ip"
export LLM_BACKEND_URL="http://your-server-ip:1234/v1"
```

## Local Configuration File

Create a `.env.local` file (ignored by git) with your actual server configuration:

```bash
# .env.local (IGNORED BY GIT)
LLM_PROVIDER=openai
LM_STUDIO_HOST=your-actual-server-ip
LLM_BACKEND_URL=http://your-actual-server-ip:1234/v1
QUICK_THINK_LLM=gpt-4o-mini
DEEP_THINK_LLM=gpt-4o
```

## Usage Examples

### CLI Configuration
```powershell
# Set network LM Studio and run CLI
$env:LLM_PROVIDER = "openai"
$env:LLM_BACKEND_URL = "http://your-server-ip:1234/v1"
npm run cli
```

### Programmatic Usage
```typescript
import { EnhancedTradingAgentsGraph } from './src/graph/enhanced-trading-graph.js';
import { ModelProvider } from './src/models/provider.js';

// Create network LM Studio configuration
const config = {
  llmProvider: 'openai',
  backendUrl: 'http://your-server-ip:1234/v1',
  quickThinkLlm: 'gpt-4o-mini',
  deepThinkLlm: 'gpt-4o'
};

// Create and run analysis
const graph = new EnhancedTradingAgentsGraph({
  enableLangGraph: true,
  config,
  selectedAnalysts: ['market', 'news']
});

const result = await graph.analyzeAndDecide('AAPL', '2025-08-28');
```

### Model Provider Direct Usage
```typescript
import { ModelProvider } from './src/models/provider.js';

// Test network connection
const networkConfig = ModelProvider.getLMStudioNetworkConfig();
const testResult = await ModelProvider.testConnection(networkConfig);

if (testResult.success) {
  console.log('✅ Network LM Studio is accessible');
  
  // Create model instance
  const model = ModelProvider.createModel(networkConfig);
  const response = await model.invoke([
    { role: 'user', content: 'Analyze the current market conditions for AAPL' }
  ]);
} else {
  console.log('❌ Connection failed:', testResult.error);
}
```

## Network Setup Requirements

### LM Studio Server Configuration
1. **Enable Network Access**: In LM Studio, go to settings and enable "Network access"
2. **Firewall**: Ensure port 1234 is open on the host machine
3. **IP Address**: Use the actual IP address of the LM Studio host (your-server-ip)

### Network Firewall Settings
```powershell
# Windows: Allow port 1234 through firewall
New-NetFirewallRule -DisplayName "LM Studio" -Direction Inbound -Port 1234 -Protocol TCP -Action Allow
```

## Testing Network Configuration

Run the network configuration test:
```powershell
cd js
npm run test-lm-studio-network
```

This will test:
- Local LM Studio configuration
- Network LM Studio configuration (from environment variable)
- Custom URL configurations
- Connection testing
- Provider status

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Verify LM Studio is running on the target machine
   - Check firewall settings on both client and server
   - Ensure correct IP address and port

2. **Model Not Found**
   - Verify the model is loaded in LM Studio
   - Check model name spelling
   - Ensure LM Studio server is ready to serve

3. **Slow Response**
   - Network latency may be higher than local inference
   - Consider adjusting timeout settings
   - Monitor network bandwidth usage

### Connection Test
```typescript
import { ModelProvider } from './src/models/provider.js';

const config = ModelProvider.getLMStudioNetworkConfig();
const result = await ModelProvider.testConnection(config);

console.log('Connection test:', result.success ? 'PASS' : 'FAIL');
if (!result.success) {
  console.log('Error:', result.error);
}
```

## Performance Considerations

- **Network Latency**: Network LM Studio will have higher latency than local
- **Bandwidth**: Large context windows consume more network bandwidth
- **Reliability**: Network connections may be less reliable than local
- **Security**: Consider VPN or secure network for sensitive data

## Benefits of Network LM Studio

- **Resource Sharing**: Multiple developers can share a powerful GPU server
- **Scalability**: Separate inference from application deployment
- **Cost Efficiency**: Centralize expensive GPU resources
- **Model Management**: Single location for model updates and management