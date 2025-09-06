
<p align="center">
	<img src="https://avatars.githubusercontent.com/u/10604394?v=4" alt="SouthernCoder" width="120" style="border-radius: 50%;"/>
</p>

# TradingAgents

<p align="center">
	<b>Maintained by <a href="https://github.com/southerncoder">SouthernCoder</a></b><br>
	<sub>Originally created by Tauric Research</sub>
</p>

**Production-Ready TypeScript Multi-Agent LLM Trading Framework** with enterprise-grade memory system, client-based architecture, and comprehensive infrastructure enhancements.

## 🎯 Current Status: **Production Ready** ✅
- ✅ **Entity_Node Functionality**: Fully operational with complete CRUD operations
- ✅ **Client-Based Architecture**: All Graphiti integrations use proper client libraries
- ✅ **Infrastructure Enhanced**: Docker networking, retry mechanisms, security hardening
- ✅ **TypeScript-Python Bridge**: Seamless cross-language integration
- ✅ **100% Test Coverage**: Comprehensive test suite with enterprise-grade validation

See [`docs/PRODUCT-OVERVIEW.md`](docs/PRODUCT-OVERVIEW.md) for a concise summary, features, and quick start.

## Documentation
- [Product Overview](docs/PRODUCT-OVERVIEW.md)
- [Getting Started](docs/GETTING-STARTED.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Configuration](docs/CONFIGURATION.md)
- [Advanced Memory System](docs/ADVANCED-MEMORY-SYSTEM.md)

## Latest Enhancements
- [Entity Node Completion Report](py_zep/ENTITY_NODE_COMPLETION_REPORT.md) - Complete client migration
- [Final Completion Report](py_zep/FINAL_COMPLETION_REPORT.md) - Infrastructure achievements
- [Infrastructure Enhancement Guide](py_zep/INFRASTRUCTURE_ENHANCEMENT_GUIDE.md) - Production-ready features

## Memory System
**Zep Graphiti Integration** - Production-ready memory system with:
- ✅ **Official Client Library**: All interactions use proper Graphiti client (no HTTP calls)
- ✅ **TypeScript-Python Bridge**: Seamless cross-language integration
- ✅ **Entity Operations**: Complete CRUD functionality for knowledge graph management
- ✅ **Enhanced Infrastructure**: Docker networking, retry mechanisms, security hardening
- ✅ **Episode Storage**: Persistent memory across trading sessions

## Examples & Demos
- See `js/examples/` for memory and provider demos
- See `py_zep/tests/` for client-based Graphiti integration examples
- TypeScript Bridge: `js/src/providers/graphiti-client-bridge.ts`
- Client-Based Provider: `js/src/providers/zep-graphiti-memory-provider-client.ts`

## Quick Start
```bash
# Start enhanced Zep Graphiti services
cd py_zep
.\start-services-secure.ps1

# Run TypeScript trading agents
cd js
npm install
npm run cli  # Interactive trading interface
```

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md) if available, or open a pull request.

## License
MIT License - see [LICENSE](LICENSE) file for details

---
<p align="center">
	<sub>Attribution: TradingAgents was originally developed by Tauric Research. All major contributions and ongoing maintenance are by <a href="https://github.com/southerncoder">SouthernCoder</a>.</sub>
</p>

## Observability

The JavaScript service includes an OpenTelemetry-based observability integration that supports Traces, Metrics, and Logs. Key features:

- OTLP exporter support (traces, metrics, logs) configurable by environment variables.
- A safe, optional logger → OpenTelemetry logs bridge that forwards structured Winston logs to an OTLP collector when `ENABLE_OTEL` is set.
- Integration tests and a mock OTLP collector used in CI to validate emissions.

How to enable locally:

```bash
# Enable OpenTelemetry features
export ENABLE_OTEL=1
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1
export OTEL_SERVICE_NAME=trading-agents-js
```

Run the Node app or tests as usual; the OTEL initializer lazily loads heavy packages and will not break tests or dev workflows when disabled.

CI: The repository contains a CI job that runs a lightweight mock-collector integration test to assert logs are emitted to an OTLP endpoint when enabled.

## Secrets Handling

Short guidance for contributors:

- Do not commit secrets, API keys, or private keys to the repository. Use environment variables or a secrets manager.
- Add any runtime `.env` files to `.gitignore` (already configured in this repo).
- If a secret is accidentally committed, immediately rotate the credential and follow the history-rewrite steps in `tools/remove-secrets.md`.
- Use the provided pre-commit hooks (`.pre-commit-config.yaml`) and the CI `gitleaks` job to detect secrets before merging.
- For development, use `.env.example` files with placeholder values and document how to obtain test credentials.

