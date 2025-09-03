import { getTracer, ENABLE_OTEL } from './opentelemetry-setup';

type SpanLike = any;

export function startSpan(name: string, opts?: { attributes?: Record<string, any> }): SpanLike | undefined {
  if (!ENABLE_OTEL) return undefined;
  try {
    const tracer = getTracer('tracing-helper');
    const span = opts && opts.attributes ? tracer.startSpan(name, { attributes: opts.attributes }) : tracer.startSpan(name);
    return span as SpanLike;
  } catch (_err) {
    // Fail safe: do not throw if tracing isn't available
    return undefined;
  }
}

export function endSpan(span?: SpanLike): void {
  if (!span) return;
  try {
    span.end();
  } catch (_err) {
    // ignore
  }
}

export function setSpanAttribute(span: SpanLike | undefined, key: string, value: any): void {
  if (!span) return;
  try { span.setAttribute?.(key, value); } catch (_e) { /* ignore */ }
}

export function setSpanStatus(span: SpanLike | undefined, status: { code?: number; message?: string } | undefined): void {
  if (!span) return;
  try { (span as any).setStatus?.(status); } catch (_e) { /* ignore */ }
}

export function getSpanTraceId(span: SpanLike | undefined): string | undefined {
  if (!span) return undefined;
  try { return span.spanContext?.()?.traceId || (span as any).spanContext?.().traceId; } catch (_e) { return undefined; }
}

export default {
  startSpan,
  endSpan,
  setSpanAttribute,
  setSpanStatus,
  getSpanTraceId
};
