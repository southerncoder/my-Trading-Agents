import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import * as api from '@opentelemetry/api';

const ENABLE_OTEL = process.env.ENABLE_OTEL === '1' || process.env.ENABLE_OTEL === 'true';

let sdk: any | undefined;
let _meterProviderInitialized = false;
let _loggerProvider: any | undefined;

async function initOpenTelemetry() {
  if (!ENABLE_OTEL) return;
  if (sdk) return;

  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

  const serviceName = process.env.OTEL_SERVICE_NAME || 'trading-agents-js';
  const collectorUrl = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1';

  try {
    const { NodeSDK } = await import('@opentelemetry/sdk-node');
    const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-proto');
    const { OTLPMetricExporter } = await import('@opentelemetry/exporter-metrics-otlp-proto');
  const { PeriodicExportingMetricReader } = await import('@opentelemetry/sdk-metrics');
  const resourcesMod: any = await import('@opentelemetry/resources');
  const semanticMod: any = await import('@opentelemetry/semantic-conventions');
  const Resource = resourcesMod.Resource || resourcesMod.default || resourcesMod;
  const SemanticResourceAttributes = semanticMod.SemanticResourceAttributes || semanticMod.default || semanticMod;

    let instrumentations: any[] = [];
    try {
      const autoInst = await import('@opentelemetry/auto-instrumentations-node');
      if (autoInst && typeof autoInst.getNodeAutoInstrumentations === 'function') {
        instrumentations = [autoInst.getNodeAutoInstrumentations()];
      }
    } catch (e) {
      diag.warn('Auto-instrumentations could not be loaded; continuing without them', e as Error);
    }

    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    });

    const traceExporter = new OTLPTraceExporter({ url: `${collectorUrl}/traces` });
    const metricExporter = new OTLPMetricExporter({ url: `${collectorUrl}/metrics` });
    // Try to initialize logs exporter if available
    try {
      const logsSdk: any = await import('@opentelemetry/sdk-logs');
      const { OTLPLogExporter } = await import('@opentelemetry/exporter-logs-otlp-http');

      const LoggerProvider = logsSdk.LoggerProvider || logsSdk.default?.LoggerProvider;
      const BatchLogRecordProcessor = logsSdk.BatchLogRecordProcessor || logsSdk.default?.BatchLogRecordProcessor;

      const logExporter = new OTLPLogExporter({ url: `${collectorUrl}/logs` });
      _loggerProvider = new LoggerProvider({ resource });
      _loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(logExporter));
    } catch (_err) {
      diag.info('OTEL logs exporter not available; skipping log provider initialization');
    }

    const metricReader = new PeriodicExportingMetricReader({ exporter: metricExporter });

    sdk = new NodeSDK({
      traceExporter,
      metricReader,
      instrumentations,
      resource,
    });

    sdk.start()
      .then(() => {
        _meterProviderInitialized = true;
        diag.info('OpenTelemetry SDK started');
      })
      .catch((err: Error) => {
        diag.error('Failed to start OpenTelemetry SDK', err);
      });
  } catch (err) {
    diag.error('Failed to initialize OpenTelemetry components', err as Error);
  }
}

async function shutdown() {
  const promises: Promise<any>[] = [];
  if (_loggerProvider && typeof _loggerProvider.shutdown === 'function') {
    try {
      promises.push(_loggerProvider.shutdown());
    } catch (_e) {
      // swallow
    }
  }

  if (sdk && typeof sdk.shutdown === 'function') {
    try {
      promises.push(sdk.shutdown());
    } catch (_e) {
      // swallow
    }
  }

  if (promises.length === 0) return Promise.resolve();
  return Promise.all(promises);
}

// Ensure graceful shutdown on process exit signals
process.on('exit', () => {
  void shutdown();
});
process.on('SIGINT', () => {
  void shutdown().finally(() => process.exit(0));
});
process.on('SIGTERM', () => {
  void shutdown().finally(() => process.exit(0));
});

function getTracer(name = 'trading-agents', version?: string) {
  return api.trace.getTracer(name, version);
}

function getMeter(name = 'trading-agents') {
  // Return the global meter (noop if not initialized)
  return api.metrics.getMeter(name);
}

initOpenTelemetry();

export { initOpenTelemetry, shutdown, getTracer, getMeter, ENABLE_OTEL };
