# Directory Configuration Environment Variables

This document lists all directory-related environment variables that have been implemented to replace hardcoded paths in the Trading Agents codebase.

## Environment Variables

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `TRADINGAGENTS_RESULTS_DIR` | `./results` | Directory for storing analysis results and trading outputs |
| `TRADINGAGENTS_DATA_DIR` | `./data` | Directory for storing raw data files and downloads |
| `TRADINGAGENTS_EXPORTS_DIR` | `./exports` | Directory for exported files (reports, configs, etc.) |
| `TRADINGAGENTS_CACHE_DIR` | `./cache` | Directory for cached data and temporary files |
| `TRADINGAGENTS_LOGS_DIR` | `./logs` | Directory for application log files |
| `TRADINGAGENTS_PROJECT_DIR` | `./project` | Base project directory for relative path resolution |

## Configuration Files Updated

The following configuration files have been updated to include these environment variables:

- `js/.env.example` - Example environment file
- `js/.env.template` - Template environment file  
- `js/.env.local` - Local development environment file

## Source Files Updated

### Core Configuration
- `js/src/config/default.ts` - Default configuration with environment variable support
- `js/src/config/modern-config.ts` - Modern configuration loader
- `js/src/types/config.ts` - TypeScript configuration interface

### Graph Files
- `js/src/graph/enhanced-trading-graph.ts` - Enhanced trading graph configuration
- `js/src/graph/langgraph-working.ts` - Working LangGraph implementation
- `js/src/graph/langgraph-simple.ts` - Simple LangGraph implementation

### CLI Components
- `js/src/cli/export-manager.ts` - Export functionality with configurable paths
- `js/src/cli/historical-analyzer.ts` - Historical analysis with configurable results directory

### Utilities
- `js/src/utils/enhanced-logger.ts` - Logger with configurable log directory

## Path Resolution Logic

All environment variables support both relative and absolute paths:

- **Relative paths** are resolved relative to the current working directory
- **Absolute paths** are used as-is
- **Fallback** to sensible defaults if environment variable is not set or empty

## Security Benefits

- **No hardcoded paths** in source code
- **Configurable deployment** - different environments can use different directories
- **Container-friendly** - easy to mount volumes at different paths
- **Development flexibility** - developers can organize files as needed
- **Production security** - sensitive files can be placed in secure locations

## Usage Examples

```bash
# Development setup (relative paths)
TRADINGAGENTS_RESULTS_DIR=./results
TRADINGAGENTS_EXPORTS_DIR=./exports

# Production setup (absolute paths)
TRADINGAGENTS_RESULTS_DIR=/app/data/results
TRADINGAGENTS_EXPORTS_DIR=/secure/exports
TRADINGAGENTS_LOGS_DIR=/var/log/trading-agents

# Container setup (volume mounts)
TRADINGAGENTS_RESULTS_DIR=/data/results
TRADINGAGENTS_EXPORTS_DIR=/data/exports
TRADINGAGENTS_CACHE_DIR=/tmp/cache
```

## Verification

All directory paths in the core source code now use environment variables with appropriate fallbacks. No hardcoded directory paths remain in the source code.