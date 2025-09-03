This folder contains a minimal OpenTelemetry bootstrap for the project.

Environment variables

- `ENABLE_OTEL` (boolean): when `1` or `true`, OpenTelemetry SDK will be initialized at process start.
- `OTEL_EXPORTER_OTLP_ENDPOINT` (string): base URL of the OTLP HTTP endpoint. Default: `http://localhost:4318/v1`.
- `OTEL_SERVICE_NAME` (string): service name reported with telemetry. Default: `trading-agents-js`.

Quick run

- Install dependencies in the `js` folder (project root):

```powershell
cd js
npm install
```

- Run the logger/test script without telemetry:

```powershell
npx vite-node test-logger.js
```

- Run with telemetry enabled (OTLP collector running locally):

```powershell
$env:ENABLE_OTEL = '1'
$env:OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318/v1'
npx vite-node test-logger.js
```

Collector

Run an OpenTelemetry Collector or Jaeger/Zipkin locally to receive traces. For quick testing, start Jaeger all-in-one:

```powershell
docker run --rm -e COLLECTOR_OTLP_ENABLED=true -p 16686:16686 -p 4317:4317 jaegertracing/all-in-one:latest
```

Logger → OTEL bridge

- The project includes a safe, best-effort logger bridge that forwards structured logs from the Winston-based `EnhancedLogger` into OpenTelemetry Logs when `ENABLE_OTEL` is set.
- The bridge is implemented in `js/src/observability/logs-bridge.ts` and uses the HTTP OTLP exporter when available. Initialization is lazy — missing packages will not break the application.

Integration tests

- A lightweight mock OTLP collector is included in `js/tests/integration/mock-otlp-collector.ts` and is used by `js/tests/integration/otlp-logs-export.spec.ts` to verify logs are emitted to an OTLP endpoint in CI.

Shutdown integration

- For deterministic shutdown and flush of telemetry, the opentelemetry setup exports a `shutdown()` function. You can import `shutdownObservability` from the package root or call `shutdown()` directly from `js/src/observability/opentelemetry-setup.ts`.
- A helper `attachShutdownHandlers()` is provided in `js/src/cli/shutdown-hook.ts` and is wired into the CLI entrypoint so the CLI flushes telemetry records on exit.

Developer notes

- To strictly validate OTLP payload contents (e.g., protobuf-encoded payloads), update the mock collector to decode OTLP protobufs or run tests against a real OpenTelemetry Collector in CI.
- Keep `ENABLE_OTEL` disabled for fast local unit tests; the OTEL initializer is opt-in to avoid heavy runtime dependencies during test runs.

