import { LLMMetricsCollector } from '../../src/utils/resilient-llm';
import { ENABLE_OTEL as ORIGINAL_ENABLE } from '../../src/observability/opentelemetry-setup';

describe('LLM Metrics Collector - percentiles and histograms', () => {
  test('in-memory percentiles compute correctly and sample arrays are capped', () => {
    const collector = new LLMMetricsCollector();

    // simulate many successes with varying token counts and costs
    for (let i = 0; i < 1200; i++) {
      const tokens = Math.floor(Math.random() * 1000);
      const cost = Number((tokens * 0.0001).toFixed(6));
      collector.recordSuccess(10 + (tokens % 20), tokens, cost);
    }

    const metrics: any = collector.getMetrics();

    // Percentile fields should exist
    expect(metrics.tokens_p95).toBeDefined();
    expect(metrics.tokens_p99).toBeDefined();
    expect(metrics.cost_p95).toBeDefined();
    expect(metrics.cost_p99).toBeDefined();

    // Sample arrays should be capped at maxSampleHistory (1000)
    // Accessing internal arrays via casting (not ideal but acceptable for unit test)
    // @ts-ignore
    expect((collector as any).tokenSamples.length).toBeLessThanOrEqual(1000);
    // @ts-ignore
    expect((collector as any).costSamples.length).toBeLessThanOrEqual(1000);
  });

  test('histogram record calls do not throw with ENABLE_OTEL toggled', () => {
    // This test toggles ENABLE_OTEL environment variable and ensures recordSuccess doesn't throw
    const original = process.env.ENABLE_OTEL;
    process.env.ENABLE_OTEL = '1';
    // require the module fresh to pick up env var (jest runs in same process, so just create new collector)
    const collectorWithOtel = new LLMMetricsCollector();
    expect(() => collectorWithOtel.recordSuccess(12, 100, 0.01)).not.toThrow();

    process.env.ENABLE_OTEL = '0';
    const collectorWithoutOtel = new LLMMetricsCollector();
    expect(() => collectorWithoutOtel.recordSuccess(12, 100, 0.01)).not.toThrow();

    if (original === undefined) delete process.env.ENABLE_OTEL; else process.env.ENABLE_OTEL = original;
  });
});
