# Automated CLI Testing for LangGraph Workflow

This directory contains automated testing tools for the TradingAgents CLI that run the full LangGraph workflow without requiring user interaction. Perfect for debugging and iterative development.

## Quick Start

### Windows (Recommended)

**PowerShell (Best option):**
```powershell
.\test-cli-auto.ps1
```

**Command Prompt:**
```cmd
test-cli-auto.bat
```

### Cross-Platform

**Using npm:**
```bash
npm run cli:test
```

**Direct execution:**
```bash
npx vite-node tests/cli/automated-cli-test.ts
```

## Features

### Automated Test Script (`automated-cli-test.ts`)

- ✅ **No User Interaction Required** - Runs with predefined configuration
- ✅ **Full LangGraph Workflow** - Tests the complete analysis pipeline
- ✅ **Detailed Output** - Shows progress and results
- ✅ **Easy Configuration** - Modify `TEST_CONFIG` to test different scenarios
- ✅ **Debugging Friendly** - Shows detailed error messages and stack traces

### Test Configuration

Edit the `test-config.json` file to customize test parameters:

```json
{
  "ticker": "AAPL",
  "analysisDate": "auto",
  "analysts": ["market", "social", "news", "fundamentals"],
  "researchDepth": 1,
  "llmProvider": "openai",
  "shallowThinker": "gpt-4o-mini",
  "deepThinker": "gpt-4o-mini",
  "description": "Test configuration for automated CLI testing"
}
```

**Configuration Options:**
- `ticker`: Stock ticker symbol (e.g., "AAPL", "MSFT", "TSLA")
- `analysisDate`: Date in YYYY-MM-DD format, or "auto" for today's date
- `analysts`: Array of analyst types: "market", "social", "news", "fundamentals"
- `researchDepth`: Research depth level (1-3)
- `llmProvider`: LLM provider: "openai", "anthropic", "google", "local_lmstudio", "remote_lmstudio"
- `shallowThinker`: Model for quick analysis (e.g., "gpt-4o-mini", "claude-3-haiku")
- `deepThinker`: Model for deep analysis (e.g., "gpt-4o", "claude-3-opus")

**Provider-Specific Models:**
- OpenAI: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`
- Anthropic: `claude-3-opus`, `claude-3-sonnet`, `claude-3-haiku`
- Google: `gemini-pro`, `gemini-pro-vision`
- LM Studio: Any loaded model name

## Available Commands

### npm Scripts

```bash
# Run automated test once
npm run cli:test

# Run in watch mode (reruns on file changes)
npm run cli:test:watch
```

### PowerShell Script Features

```powershell
# Basic run
.\test-cli-auto.ps1

# Watch mode - automatic rerun on file changes
.\test-cli-auto.ps1 -Watch

# Verbose logging for debugging
.\test-cli-auto.ps1 -Verbose

# Combined
.\test-cli-auto.ps1 -Watch -Verbose
```

## Output

The automated test provides:

1. **Configuration Summary** - Shows what's being tested
2. **Progress Updates** - Real-time status of workflow execution
3. **Analysis Results** - Final decision and reasoning
4. **Agent Reports** - Excerpts from each analyst's analysis
5. **Error Details** - Comprehensive error information if something fails

### Example Output

```
═══════════════════════════════════════════════════════
       🤖 Automated CLI Test - LangGraph Workflow
═══════════════════════════════════════════════════════

📋 Test Configuration:
   Ticker: AAPL
   Date: 2025-10-04
   Provider: remote_lmstudio
   Analysts: market, social, news, fundamentals
   Quick Model: microsoft/phi-4-reasoning-plus
   Deep Model: microsoft/phi-4-reasoning-plus

📁 Loading configuration...
✓ Configuration loaded

🔧 Creating EnhancedTradingAgentsGraph...
✓ Graph created successfully

🔄 Initializing LangGraph workflow...
✓ Workflow initialized

📊 Executing analysis for AAPL...
✓ Execution completed in 45.23s

🎯 Getting analysis decision...
✓ Analysis complete

═══════════════════════════════════════════════════════
                     📈 Analysis Results
═══════════════════════════════════════════════════════

Final Decision: BUY
Confidence: 0.85

Reasoning:
  1. Strong market fundamentals with positive momentum
  2. Favorable social sentiment across major platforms
  3. Recent news indicating product innovation
  4. Financial metrics show solid growth trajectory

✅ Test completed successfully!
```

## Debugging Tips

### Common Issues

**1. CLI flashing through without stopping**
- ✅ **Solved by this automated test** - No user interaction needed
- The test runs programmatically and waits for completion

**2. LangGraph workflow not executing**
- Check the debug output in the test results
- Ensure your LLM provider is accessible (OpenAI API, LM Studio, etc.)
- Verify API keys are set in `.env.local`

**3. Configuration errors**
- Review `test-config.json` for correct settings
- Ensure `.env.local` has required API keys (OPENAI_API_KEY, etc.)
- Check `config.json` for correct base configuration

**4. Timeout errors**
- Increase timeout in `config.json` under `flow.timeout`
- Check network connectivity to LLM provider
- For OpenAI: Verify API key is valid and has credits
- For LM Studio: Ensure server is running and models are loaded

**5. API Key Issues**
- OpenAI: Set `OPENAI_API_KEY` in `.env.local`
- Anthropic: Set `ANTHROPIC_API_KEY` in `.env.local`
- Google: Set `GOOGLE_API_KEY` in `.env.local`
- Check that your API key has sufficient credits/quota

### Enable Debug Logging

Set environment variable before running:

```powershell
$env:LOG_LEVEL = "debug"
.\test-cli-auto.ps1
```

Or use verbose flag:
```powershell
.\test-cli-auto.ps1 -Verbose
```

## Watch Mode for Development

Watch mode automatically reruns tests when files change - perfect for iterative development:

```powershell
# PowerShell
.\test-cli-auto.ps1 -Watch

# npm
npm run cli:test:watch
```

Files watched:
- `src/**/*.ts` - All source files
- `tests/cli/**/*.ts` - Test files

Press `Ctrl+C` to stop watch mode.

## Integration with Main CLI

The automated test uses the same components as the interactive CLI:

1. **EnhancedTradingAgentsGraph** - Same workflow engine
2. **Configuration System** - Same config.json and environment variables
3. **LangGraph Integration** - Same graph initialization and execution
4. **Agent System** - Same 12 specialized trading agents

This ensures that testing the automated CLI is equivalent to testing the interactive CLI.

## Troubleshooting

### Test Won't Run

1. **Check node_modules**
   ```bash
   npm install
   ```

2. **Verify configuration**
   - Ensure `config.json` exists in `services/trading-agents/`
   - Check `.env.local` for required variables

3. **Test LM Studio connection**
   ```bash
   npm run test:manual:lmstudio-connection
   ```

### Workflow Execution Fails

1. **Check graph initialization**
   - Look for "Workflow initialized" message
   - Review any error messages during initialization

2. **Verify analyst configuration**
   - Ensure selected analysts are valid
   - Check that models are accessible

3. **Review full error output**
   - Stack traces show exact failure point
   - Error messages indicate root cause

### Getting Help

If you encounter issues:

1. Run with verbose logging: `.\test-cli-auto.ps1 -Verbose`
2. Check the error message and stack trace
3. Review the "Debugging Tips" section above
4. Check that services are running: `npm run services:status`
5. Ensure LM Studio is accessible and models are loaded

## Files

- `automated-cli-test.ts` - Main test script
- `test-cli-auto.ps1` - PowerShell runner with advanced features
- `test-cli-auto.bat` - Simple Windows batch file
- `README.md` - This file

## Related Documentation

- [Configuration Guide](../../../../docs/CONFIGURATION.md)
- [Quick Start Guide](../../../../docs/QUICK-START.md)
- [Git Hooks](../../../../docs/GIT-HOOKS.md)
- [Implementation Gap Analysis](../../../../docs/todos/IMPLEMENTATION-GAP-ANALYSIS.md)
