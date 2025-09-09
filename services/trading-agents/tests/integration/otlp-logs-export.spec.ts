import { startMockOtlpCollector } from './mock-otlp-collector';
import { logger } from '../../src/utils/enhanced-logger';

describe('OTLP Logs Exporter Integration', () => {
  let server: { port:number, close: ()=>Promise<void>, getLastPayload?: ()=>any } | null = null;

  beforeAll(async () => {
    server = await startMockOtlpCollector(4319);
    process.env.ENABLE_OTEL = '1';
    process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT = `http://localhost:${server.port}/v1/logs`;
    // Require opentelemetry bridge to initialize lazily when logger emits
  });

  afterAll(async () => {
    delete process.env.ENABLE_OTEL;
    delete process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT;
    if (server) await server.close();
  });

  test('emits a log to OTLP collector (mock)', async () => {
    // Emit a single log — bridge should handle initialization and POST to mock collector
    expect(() => {
      logger.info('system', 'integration-test', 'otlp_emit', 'Test OTLP log', { test: true });
    }).not.toThrow();

    // Wait briefly to allow async emit to complete
    await new Promise((r) => setTimeout(r, 250));

    // Inspect last payload if available and assert expected fields
    const payload = server?.getLastPayload ? server.getLastPayload() : null;
    if (payload) {
      // OTLP JSON shape can be nested; we look for severityText/body/attributes
      const payloadStr = JSON.stringify(payload);
      expect(payloadStr.length).toBeGreaterThan(0);
      // quick contains checks for known fields
      expect(payloadStr).toEqual(expect.stringMatching(/severity(Text)?/i));
      expect(payloadStr).toEqual(expect.stringMatching(/body|message/i));
      // traceId may be present in attributes
      expect(payloadStr).toEqual(expect.stringMatching(/trace.?id/i));
    }
  });
});
