# TASK 20_03: Agent Loop Integration Tests

## هدف
تست کامل agentic loop (Plan→Execute→Observe).

## فایل‌های مورد نیاز
- `cloudflare/platform-api/tests/integration/agent-loop.test.ts` (CREATE)
- `cloudflare/platform-api/tests/integration/copilotkit-agent.test.ts` (CREATE)

## پیاده‌سازی

```typescript
// tests/integration/agent-loop.test.ts
describe('Agent Loop Integration', () => {
  it('should receive prompt and start planning', async () => {});
  it('should generate execution plan', async () => {});
  it('should execute tools in order', async () => {});
  it('should observe results and iterate', async () => {});
  it('should complete when goal achieved', async () => {});
  it('should handle max iterations', async () => {});
});
```

## معیارهای موفقیت
- [ ] تمام تست‌ها پاس می‌شوند
- [ ] Agent loop completes successfully