# 🧪 Agent Testing Suite for LM Studio

## Overview

This comprehensive testing suite validates that all 12 TradingAgents work correctly with LM Studio using the `microsoft/phi-4-mini-reasoning` model. The tests ensure proper connectivity, agent instantiation, processing capabilities, and performance characteristics.

## 🎯 Agents Tested

| Agent Type | Agent Name | Primary Function |
|------------|------------|------------------|
| **Analysts** | MarketAnalyst | Technical analysis and market data |
| | SocialAnalyst | Social media sentiment analysis |
| | NewsAnalyst | News event impact analysis |
| | FundamentalsAnalyst | Financial metrics and company analysis |
| **Researchers** | BullResearcher | Positive investment thesis development |
| | BearResearcher | Risk identification and negative thesis |
| **Managers** | ResearchManager | Research synthesis and recommendations |
| | PortfolioManager | Final trading decisions |
| **Risk Management** | RiskyAnalyst | Aggressive strategy advocacy |
| | SafeAnalyst | Conservative risk management |
| | NeutralAnalyst | Balanced risk assessment |
| **Trading** | Trader | Concrete trading plan creation |

## 🚀 Quick Start

### 1. Setup LM Studio
```bash
# First, verify LM Studio is properly configured
npm run test-lmstudio-setup
```

### 2. Run Comprehensive Tests
```bash
# Run all tests in sequence with full reporting
npm run test-agents-comprehensive
```

## 🔧 Individual Test Commands

### Setup and Connectivity
```bash
# Verify LM Studio server status and model availability
npm run test-lmstudio-setup

# Test basic LangChain connectivity
npm run test-agent-validation
```

### Agent Testing
```bash
# Quick validation of all 12 agents
npm run test-agent-validation

# Comprehensive integration testing
npm run test-agent-integration

# Performance benchmarks and stress testing
npm run test-agent-performance
```

### Additional Test Files (Moved from Root)
```bash
# CLI-specific debug testing
node tests/test-cli-debug.js

# Detailed output format testing
node tests/test-detailed-output.js

# Display system testing
node tests/test-display-system.js

# Final integration testing
node tests/test-final-integration.js
```

## 📋 Prerequisites

### LM Studio Configuration
1. **Download and Install LM Studio**: https://lmstudio.ai
2. **Download Model**: Search for `microsoft/phi-4-mini-reasoning`
3. **Start Local Server**:
   - Go to "Local Server" tab
   - Load `microsoft/phi-4-mini-reasoning` model
   - Start server on port 1234
   - Verify server shows: "Server running on http://localhost:1234"

### System Requirements
- **Node.js**: Version 18.0.0 or higher
- **Memory**: 8GB+ RAM recommended for phi-4-mini-reasoning
- **Network**: LM Studio server on localhost:1234

## 🎯 Test Categories

### 1. Setup Verification (`test-lmstudio-setup`)
- ✅ Server connectivity check
- ✅ Model availability verification
- ✅ Basic completion test
- ✅ Setup guidance if issues found

### 2. Agent Validation (`test-agent-validation`)
- ✅ All 12 agents instantiate correctly
- ✅ Basic processing capability
- ✅ Model provider integration
- ✅ Error handling validation

### 3. Integration Testing (`test-agent-integration`)
- ✅ Complete workflow processing
- ✅ Agent state management
- ✅ Cross-agent data flow
- ✅ Response format validation
- ✅ Error recovery testing

### 4. Performance Testing (`test-agent-performance`)
- ⚡ Response latency measurement
- ⚡ Concurrent processing tests
- ⚡ Stress scenario validation
- ⚡ Resource usage analysis
- ⚡ Throughput benchmarks

### 5. Comprehensive Suite (`test-agents-comprehensive`)
- 🎯 Runs all test categories in sequence
- 📊 Generates detailed reports
- 🏆 Provides success/failure analysis
- 💡 Offers troubleshooting guidance

## 📊 Understanding Test Results

### Success Indicators
- ✅ **All Critical Tests Pass**: Ready for production use
- ✅ **Green Success Rate**: >90% indicates excellent setup
- ✅ **Response Times**: <5s average indicates good performance

### Common Issues and Solutions

#### LM Studio Not Running
```
❌ Connection refused - LM Studio server not running
🔧 Solution: Start LM Studio and click "Start Server"
```

#### Model Not Loaded
```
❌ No models loaded
🔧 Solution: Load microsoft/phi-4-mini-reasoning in LM Studio
```

#### Slow Responses
```
⚠️ Response times >15s
🔧 Solution: Check system resources, consider smaller model
```

#### Agent Instantiation Failures
```
❌ Agent instantiation failed
🔧 Solution: npm run build && run tests again
```

## 🎯 Expected Performance Baselines

### Response Times (with phi-4-mini-reasoning)
- **Connection Test**: <1000ms
- **Agent Processing**: 3000-8000ms
- **Complex Analysis**: 5000-15000ms

### Success Rates
- **Setup Tests**: 100%
- **Agent Instantiation**: 100%
- **Basic Processing**: >95%
- **Integration Tests**: >90%

## 🔍 Troubleshooting Guide

### 1. Connection Issues
```bash
# Check if LM Studio is accessible
curl http://localhost:1234/v1/models

# Expected response: JSON with model list
```

### 2. Module Not Found Errors
```bash
# Rebuild TypeScript files
npm run build

# Run tests again
npm run test-agents-comprehensive
```

### 3. Timeout Errors
```bash
# Increase timeout in test files or
# Use a smaller/faster model in LM Studio
```

### 4. Memory Issues
```bash
# Close other applications
# Use smaller model like phi-3-mini-4k-instruct
# Adjust maxTokens in test configuration
```

## 🚀 Using Test Results

### After Successful Tests
```bash
# Ready to use the framework!
npm run cli:menu          # Interactive CLI
npm run cli:analyze       # Direct analysis
tsx src/index.ts          # Programmatic usage
```

### Integration with CI/CD
```json
{
  "scripts": {
    "test:agents": "npm run test-lmstudio-setup && npm run test-agent-validation",
    "test:full": "npm run test-agents-comprehensive"
  }
}
```

## 📝 Test Configuration

### Default Settings
```javascript
const TEST_CONFIG = {
  provider: 'lm_studio',
  modelName: 'microsoft/phi-4-mini-reasoning',
  baseURL: 'http://localhost:1234/v1',
  temperature: 0.3,
  maxTokens: 1024,
  timeout: 30000
};
```

### Customization
Edit test files to modify:
- Model names
- Response timeouts
- Test companies/dates
- Performance thresholds

## 🎉 Success Criteria

Your setup is ready when:
- ✅ LM Studio server responds on port 1234
- ✅ microsoft/phi-4-mini-reasoning model is loaded
- ✅ All 12 agents instantiate without errors
- ✅ Basic agent processing completes successfully
- ✅ Response times are reasonable for your use case

## 📚 Additional Resources

- [LM Studio Documentation](https://lmstudio.ai/docs)
- [TradingAgents Framework Guide](../README.md)
- [Agent Architecture Documentation](../docs/agents/)
- [Performance Optimization Guide](../docs/performance/)

---

**💡 Pro Tip**: Run `npm run test-lmstudio-setup` first to avoid wasting time on agent tests if the basic setup isn't working!