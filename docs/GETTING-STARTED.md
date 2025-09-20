# Getting Started with TradingAgents

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** and npm
- **Docker & Docker Compose** (for advanced memory system)
- **API Keys** for cloud providers (OpenAI, Anthropic, Google)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/southerncoder/my-Trading-Agents
   cd my-Trading-Agents/services/trading-agents
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys and preferences
   ```

4. **Start advanced memory services** (optional but recommended)
   ```bash
   cd ../services/zep_graphiti
   ./start-zep-services.ps1
   ```

5. **Build and run**
   ```bash
   cd ../js
   npm run build
   npm run cli
   ```

## 🧠 Advanced Memory System

The TradingAgents framework includes a sophisticated AI/ML memory system with:

- **Temporal Relationship Mapping**: Statistical correlation analysis
- **Memory Consolidation**: ML clustering and pattern recognition  
- **Context Retrieval**: Multi-dimensional intelligent search
- **Performance Learning**: Reinforcement learning with agent optimization

### Memory System Setup

1. **Start Docker services**
   ```powershell
   cd services/zep_graphiti
   .\start-zep-services.ps1
   ```

2. **Test memory system**
   ```bash
   cd js
   npm run test-memory-advanced
   ```

3. **View memory analytics**
   - Access Neo4j Browser: http://localhost:7474
   - Username: neo4j, Password: (set via NEO4J_PASSWORD environment variable; do NOT commit real values)

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env.local` and configure your API keys:

```bash
# Required: Choose your LLM provider(s)
OPENAI_API_KEY=your_openai_api_key
# OR for local LLM
LM_STUDIO_BASE_URL=http://localhost:1234/v1

# Optional: Additional providers
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_API_KEY=your_google_key

# Optional: Market data providers
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
MARKETSTACK_API_KEY=your_marketstack_key
```

**📖 For detailed configuration options, see [CONFIGURATION.md](CONFIGURATION.md)**

## 🎯 Running Your First Analysis

### Interactive CLI

1. **Start the CLI**
   ```bash
   cd js
   node run-cli-safe.js
   ```

2. **Select "🚀 Run New Analysis"**

3. **Enter configuration:**
   - **Stock Symbol**: AAPL, MSFT, TSLA, etc.
   - **Analysis Date**: YYYY-MM-DD format
   - **Analysts**: Choose your analysis team
   - **Research Depth**: Shallow/Deep analysis
   - **LLM Provider**: Your preferred provider

4. **Watch the analysis**: Real-time progress with agent collaboration

### Command Line Usage

```bash
# Run with development tools
npm run cli:analyze

# Run specific commands
npm run cli:menu
npm run cli:export
npm run cli:historical
```

## 🏗️ LM Studio Setup (Optional)

### Local Inference Configuration

1. **Install LM Studio** from [lmstudio.ai](https://lmstudio.ai/)
2. **Load models** and enable API server on port 1234
3. **Configure environment**:
   ```bash
   LM_STUDIO_BASE_URL=http://localhost:1234/v1
   DEFAULT_LLM_PROVIDER=openai
   ```

## 🔍 Example Analysis Flow

### Sample Configuration
```bash
# Mix providers for optimal results
ANALYSTS_LLM_PROVIDER=openai          # Fast analysis
RESEARCHERS_LLM_PROVIDER=anthropic    # Deep reasoning
TRADER_LLM_PROVIDER=openai           # Quick decisions
```

### Expected Output
```
🚀 Starting Trading Analysis...
📊 Analyzing AAPL for 2025-08-29
👥 Agents: market_analyst, news_analyst, fundamentals_analyst

✅ Market Analyst: Positive momentum detected
✅ News Analyst: Favorable sentiment in recent headlines  
✅ Fundamentals Analyst: Strong financial metrics
✅ Research Team: Bull case supported by growth prospects
✅ Risk Management: Moderate risk, suitable for portfolio
✅ Final Decision: BUY with 0.78 confidence
```

## 🛠️ Development Workflow

### Development Mode
```bash
npm run dev    # Hot reload development
npm run cli    # Interactive CLI with TypeScript
```

### Production Build
```bash
npm run build  # Build for production
npm test       # Run test suite
```

### Testing
```bash
npm run test:all              # Complete test suite
npm run test-enhanced         # Enhanced graph workflow tests
npm run test-langgraph        # LangGraph integration tests
```

### Lean Workflow Test Suite (September 2025)
The project now uses a minimal core workflow suite located at:
`services/trading-agents/tests/workflow/`

Included tests:
- `basic-config.test.ts` – Enhanced configuration loader sanity.
- `agent-memory.test.ts` – Per-agent memory provider selection & operations.
- `trading-graph-memory.test.ts` – Trading graph agents + memory integration.
- `client-memory-integration.test.ts` – Graphiti client-based memory provider & wrapper.
- `environment-validation.test.ts` – Environment & infrastructure readiness.

Run the lean suite:
```bash
cd services/trading-agents
npm run test:workflow
```

Legacy, experimental, performance, API, Reddit, learning, and CLI tests were archived to:
`services/trading-agents/archive/legacy-tests/`

Rationale:
- Faster CI feedback
- Focus on decision pipeline correctness
- Removes deprecated or placeholder patterns

To restore a legacy test, move it back under `tests/workflow/` and (if necessary) update `package.json` scripts.

### Workflow Test Suite Controls & Environment Variables

You can tune pass/fail policy, export structured JSON, and enforce regression thresholds via environment variables or CLI flags:

Core flags / scripts:
```bash
# Run lean suite
npm run test:workflow

# Export JSON to stdout
npm run test:workflow -- --json

# Export JSON and write to file
npm run test:workflow -- --json --logfile=workflow-results.json
```

Environment / CLI options:
```bash
WORKFLOW_FAIL_ON_ERRORS=true          # (default true) Fail if any test records errors
WORKFLOW_FAIL_ON_WARNINGS=true        # (default false) Fail on any warning
WORKFLOW_MAX_WARNINGS=5               # Maximum allowed (effective) warnings
WORKFLOW_WARNING_ALLOWLIST=pattern1,pattern2  # Substring allowlist, removed before counting

WORKFLOW_MIN_TOTAL_MATCHES=4          # Minimum agent memory matches (agent-memory test)
WORKFLOW_MIN_TOTAL_QUERY_ANSWERS=6    # Minimum answered queries (trading-graph-memory)
WORKFLOW_MIN_TOTAL_SITUATIONS=8       # Minimum situations stored (trading-graph-memory)

WORKFLOW_EXPORT_JSON=true             # Same as --json flag
# If set to a non-"true" value, treat as output file path:
WORKFLOW_EXPORT_JSON=workflow-results.json

# CLI alternative to file export (takes precedence over env path) :
--logfile=workflow-results.json
```

Output Parsing:
The runner prints a machine-parsable line beginning with `__WORKFLOW_JSON__ ` followed by a compact JSON object. Example integration (bash / PowerShell equivalent):
```bash
RESULT_JSON_LINE=$(npm run test:workflow --silent -- --json | grep '__WORKFLOW_JSON__')
PAYLOAD=${RESULT_JSON_LINE#*__WORKFLOW_JSON__ }
echo "$PAYLOAD" | jq '.summary'
```

JSON Schema (top-level keys):
- `summary`: High-level counts (passed, failed, skipped, warnings, metrics, policyFailed)
- `results[]`: Per-test objects with `name`, `passed`, `warnings[]`, `metrics{}`
- `warnings[]`: Flattened list of all warnings with source test
- `effectiveWarnings[]`: Warnings after allowlist filtering
- `config`: Echo of policy & threshold settings used this run

Failure Conditions (any true triggers non-zero exit):
- Errors present AND `WORKFLOW_FAIL_ON_ERRORS != false`
- Effective warnings present AND `WORKFLOW_FAIL_ON_WARNINGS == true`
- Effective warnings exceed `WORKFLOW_MAX_WARNINGS`
- Observed metrics below any set minimum threshold env var

Recommended CI Thresholds (example):
```bash
WORKFLOW_MIN_TOTAL_MATCHES=4 \
WORKFLOW_MIN_TOTAL_QUERY_ANSWERS=6 \
WORKFLOW_MIN_TOTAL_SITUATIONS=8 \
WORKFLOW_FAIL_ON_ERRORS=true \
WORKFLOW_MAX_WARNINGS=10
```

Use lower thresholds initially; tighten as capabilities stabilize.

### Security & Secret Scanning
This project uses layered secret scanning (pre-commit, Gitleaks, heuristic script, workflow runner). For full details, environment variables, and remediation steps see `SECURITY-SCANNING.md`.

Essential runtime env vars (examples only – never commit real values):
```
NEO4J_PASSWORD=<your_neo4j_password>
OPENAI_API_KEY=<your_openai_api_key>
```

Notes:
- ANSI color codes are stripped before scanning.
- Default allowlist includes model names, dates, times, trace IDs.
- Findings are appended into JSON under `secretScan`.

### LangGraph Enforcement Policy

All workflows now execute through LangGraph regardless of user-provided `enableLangGraph` flag.

Behavior:
- If `enableLangGraph: false` is passed, it is forcibly overridden to `true`.
- Enforcement mode recorded as `langGraphEnforcement: forced | explicit` in test metrics.
- Provider derivation order (when `llmProvider` absent):
   1. `remote_lmstudio` if `REMOTE_LM_STUDIO_BASE_URL` present
   2. `local_lmstudio` if `LOCAL_LM_STUDIO_BASE_URL` present
   3. `openai` if (`EMBEDDING_LLM_URL` or `OPENAI_BASE_URL`) and `OPENAI_API_KEY` present
   4. Fallback placeholder `remote_lmstudio` (non-fatal, logs a warning)

Test: `langgraph-enforcement.test.ts` validates enforcement and records metrics.

JSON Export Keys Added:
- `secretScan.enabled`
- `secretScan.findings[]`
- `secretScan.violated`
- `results[].metrics.langGraphEnforcement`

Recommended CI Policy Additions:
```bash
WORKFLOW_FAIL_ON_SECRETS=true
WORKFLOW_SECRET_MAX_FINDINGS=0   # tighten once stable
WORKFLOW_SECRET_STRICT=true      # optional harder mode
```


## 🔒 Security Best Practices

### API Key Management
- Never commit API keys to version control
- Use `.env.local` for sensitive configuration
- Rotate API keys regularly

### Network Security
- Configure firewall rules for LM Studio
- Use HTTPS for production deployments

## 🚨 Troubleshooting

### Common Issues

**CLI Not Starting**
```bash
# Check Node.js version
node --version  # Should be 18+

# Rebuild if needed
npm run clean && npm run build
```

**LM Studio Connection Failed**
```bash
# Test connectivity
curl http://your_ip:1234/v1/models

# Check firewall settings
# Verify LM Studio API server is running
```

**Missing Dependencies**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Debug Mode
```bash
# Enable verbose logging
npm run cli -- --verbose --log-level debug
```

## 📚 Next Steps

- **[Architecture Guide](./ARCHITECTURE.md)** - Understand the system design
- **[CLI Reference](./CLI-GUIDE.md)** - Detailed CLI documentation
- **[API Documentation](./API-REFERENCE.md)** - Programmatic usage
- **[Performance Guide](./PERFORMANCE.md)** - Optimization techniques

---

**Ready to analyze your first stock? Start with the interactive CLI! 🚀**