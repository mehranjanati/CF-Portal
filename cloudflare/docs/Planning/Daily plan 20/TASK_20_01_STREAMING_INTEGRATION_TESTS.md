# TASK 20_01: Streaming Integration Tests

## هدف
تست SSE streaming end-to-end از backend به frontend.

## فایل‌های مورد نیاز
- `cloudflare/platform-api/tests/integration/streaming-e2e.test.ts` (CREATE)
- `cloudflare/portal/tests/e2e/streaming-flow.spec.ts` (CREATE)

## پیاده‌سازی

### Backend Tests

```typescript
// tests/integration/streaming-e2e.test.ts
describe('Streaming E2E', () => {
  it('should establish SSE connection', async () => {});
  it('should stream AG-UI packets', async () => {});
  it('should handle text packets', async () => {});
  it('should handle tool_use packets', async () => {});
  it('should handle state_sync packets', async () => {});
  it('should handle stream_end', async () => {});
});
```

### Frontend Tests

```typescript
// tests/e2e/streaming-flow.spec.ts
describe('Streaming Flow E2E', () => {
  it('should display messages in real-time', async () => {});
  it('should show tool calls', async () => {});
  it('should update phase indicator', async () => {});
});
```

## معیارهای موفقیت
- [ ] تمام تست‌ها پاس می‌شوند
- [ ] Packet latency < 100ms