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
