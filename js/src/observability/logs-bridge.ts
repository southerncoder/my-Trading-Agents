let initialized = false;
let otelLogger: any = undefined;
let SeverityNumber: any = undefined;

async function initLogsBridge() {
  if (initialized) return;
  initialized = true;

  try {
    const sdkLogs: any = await import('@opentelemetry/sdk-logs');
    const exporterMod: any = await import('@opentelemetry/exporter-logs-otlp-http');
    const apiLogs: any = await import('@opentelemetry/api-logs');

    const collectorUrl = process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1';
    const logExporter = new exporterMod.OTLPLogExporter({ url: collectorUrl.endsWith('/logs') ? collectorUrl : `${collectorUrl}/logs` });

    const LoggerProvider = sdkLogs.LoggerProvider || sdkLogs.default?.LoggerProvider;
    const BatchLogRecordProcessor = sdkLogs.BatchLogRecordProcessor || sdkLogs.default?.BatchLogRecordProcessor;

    const provider = new LoggerProvider();
    provider.addLogRecordProcessor(new BatchLogRecordProcessor(logExporter));

    otelLogger = provider.getLogger('trading-agents', '1.0.0');
    SeverityNumber = apiLogs.SeverityNumber || apiLogs.default?.SeverityNumber;
  } catch (_err) {
    // Fail-safe: do not throw if OTEL logs packages are not installed
    initialized = true;
    otelLogger = undefined;
  }
}

export async function emitLog(entry: any): Promise<void> {
  if (!process.env.ENABLE_OTEL || (process.env.ENABLE_OTEL !== '1' && process.env.ENABLE_OTEL !== 'true')) return;

  try {
    if (!initialized) await initLogsBridge();
    if (!otelLogger) return;

    const sevText = (entry.level || 'info').toUpperCase();
    const sev = (SeverityNumber && SeverityNumber[sevText]) || SeverityNumber?.INFO || 9;

    const body = entry.message;
    const attributes = {
      context: entry.context,
      component: entry.component,
      operation: entry.operation,
      ...entry.metadata
    };

    try {
      otelLogger.emit({
        severityNumber: sev,
        severityText: sevText,
        body,
        attributes: { ...attributes, traceId: entry.traceId, sessionId: entry.sessionId }
      });
    } catch (_emitErr) {
      // ignore emit errors
    }
  } catch (_err) {
    // ignore initialization errors
  }
}

export default { initLogsBridge, emitLog };
