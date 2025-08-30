# 🔧 Debug Scripts

## Overview

This directory contains debug and diagnostic scripts for the TradingAgents framework. These scripts help with troubleshooting, development, and testing various components of the system.

## 📁 Debug Scripts

### Agent Execution
- **`debug-agent-execution.js`** - Debug agent execution flow and state management
- **`debug-startup.js`** - Debug application startup and initialization

### CLI and Interface
- **`debug-cli.js`** - Debug CLI functionality and command processing
- **`debug-minimal-cli.js`** - Minimal CLI debugging for basic functionality testing

### Provider Integration
- **`debug-lm-studio.js`** - Debug LM Studio connection and model interaction

### Framework Integration
- **`check-langgraph.js`** - Validate LangGraph integration and workflow
- **`pyproject.toml`** - Python project configuration for cross-platform debugging

## 🚀 Usage

### Basic Debugging
```bash
# Debug agent execution
node debugScripts/debug-agent-execution.js

# Debug CLI functionality
node debugScripts/debug-cli.js

# Test LM Studio connection
node debugScripts/debug-lm-studio.js
```

### Startup Debugging
```bash
# Debug application startup
node debugScripts/debug-startup.js

# Minimal CLI testing
node debugScripts/debug-minimal-cli.js
```

### Framework Validation
```bash
# Check LangGraph integration
node debugScripts/check-langgraph.js
```

## 🔍 Common Debug Scenarios

### 1. Agent Not Responding
```bash
# Check agent execution flow
node debugScripts/debug-agent-execution.js

# Verify startup sequence
node debugScripts/debug-startup.js
```

### 2. CLI Issues
```bash
# Debug full CLI
node debugScripts/debug-cli.js

# Test minimal CLI
node debugScripts/debug-minimal-cli.js
```

### 3. LM Studio Connection Problems
```bash
# Debug LM Studio integration
node debugScripts/debug-lm-studio.js
```

### 4. LangGraph Workflow Issues
```bash
# Validate LangGraph setup
node debugScripts/check-langgraph.js
```

## 📊 Debug Output

These scripts provide detailed logging and diagnostic information:
- **Configuration validation**
- **Connection status**
- **Error traces**
- **Performance metrics**
- **State information**

## 🎯 Development Guidelines

### Adding New Debug Scripts
1. Follow naming convention: `debug-[component].js`
2. Include detailed logging
3. Add error handling
4. Document usage in this README
5. Test with various scenarios

### Best Practices
- Use consistent logging format
- Include timestamps in output
- Provide clear error messages
- Add configuration validation
- Test edge cases

## 🚨 Troubleshooting

### Script Not Running
```bash
# Ensure dependencies are installed
npm install

# Build TypeScript files
npm run build

# Run script with full path
node debugScripts/[script-name].js
```

### Missing Modules
```bash
# Install missing dependencies
npm install

# Check module paths
node -e "console.log(require.resolve('[module-name]'))"
```

---

**💡 Pro Tip**: Start with `debug-startup.js` to ensure basic system configuration before debugging specific components.