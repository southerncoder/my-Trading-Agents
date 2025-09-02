import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import * as api from '@opentelemetry/api';

const ENABLE_OTEL = process.env.ENABLE_OTEL === '1' || process.env.ENABLE_OTEL === 'true';

let sdk: NodeSDK | undefined;
let meterProviderInitialized = false;

function initOpenTelemetry() {
  if (!ENABLE_OTEL) return;
  if (sdk) return;

  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

  const serviceName = process.env.OTEL_SERVICE_NAME || 'trading-agents-js';
  const collectorUrl = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1';

  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  });

  const traceExporter = new OTLPTraceExporter({ url: `${collectorUrl}/traces` });
  const metricExporter = new OTLPMetricExporter({ url: `${collectorUrl}/metrics` });

  const metricReader = new PeriodicExportingMetricReader({ exporter: metricExporter });

  sdk = new NodeSDK({
    traceExporter,
    metricReader,
    instrumentations: [getNodeAutoInstrumentations()],
    resource,
  });

  sdk.start()
    .then(() => {
      meterProviderInitialized = true;
      diag.info('OpenTelemetry SDK started');
    })
    .catch((err) => {
      diag.error('Failed to start OpenTelemetry SDK', err as Error);
    });
}

function shutdown() {
  if (!sdk) return Promise.resolve();
  return sdk.shutdown();
}

function getTracer(name = 'trading-agents', version?: string) {
  return api.trace.getTracer(name, version);
}

function getMeter(name = 'trading-agents') {
  // Return the global meter (noop if not initialized)
  return api.metrics.getMeter(name);
}

initOpenTelemetry();

export { initOpenTelemetry, shutdown, getTracer, getMeter, ENABLE_OTEL };
