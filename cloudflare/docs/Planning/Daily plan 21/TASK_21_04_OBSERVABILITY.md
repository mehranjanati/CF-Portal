# TASK 21_04: Observability & Debugging

## هدف
افزودن monitoring و tracing کامپلیت.

## Files
- `cloudflare/platform-api/src/agents/observability/Tracer.ts` (CREATE)
- `cloudflare/platform-api/src/agents/observability/Metrics.ts` (CREATE)
- `cloudflare/portal/src/lib/components/ExecutionTrace.svelte` (CREATE)

## پیاده‌سازی

```typescript
// Distributed tracing
export class Tracer {
  startSpan(name: string): Span {}
  endSpan(span: Span): void {}
}

// Metrics collection
export class Metrics {
  recordLatency(operation: string, duration: number): void {}
  recordSuccess(operation: string): void {}
  recordError(operation: string, error: Error): void {}
}
```

## معیارهای موفقیت
- [ ] Traces visible in UI
- [ ] Metrics collected
- [ ] Errors classified correctly