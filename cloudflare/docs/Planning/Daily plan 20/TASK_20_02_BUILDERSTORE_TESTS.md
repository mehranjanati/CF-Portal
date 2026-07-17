# TASK 20_02: BuilderStore Tests

## هدف
تست BuilderStore state management و reactivity.

## فایل‌های مورد نیاز
- `cloudflare/portal/tests/stores/builder-streaming.test.ts` (CREATE)
- `cloudflare/portal/tests/stores/builder-state.test.ts` (CREATE)

## پیاده‌سازی

### BuilderStore Streaming Tests

```typescript
// tests/stores/builder-streaming.test.ts
describe('BuilderStore Streaming', () => {
  it('should update messages on text packet', async () => {});
  it('should add tool calls on tool_use packet', async () => {});
  it('should complete tool calls on tool_result packet', async () => {});
  it('should update state on state_sync packet', async () => {});
  it('should handle errors gracefully', async () => {});
});
```

### BuilderStore State Tests

```typescript
// tests/stores/builder-state.test.ts
describe('BuilderStore State', () => {
  it('should persist state to localStorage', async () => {});
  it('should restore state after reload', async () => {});
  it('should clear state on session end', async () => {});
  it('should handle state conflicts', async () => {});
});
```

## معیارهای موفقیت
- [ ] تمام تست‌ها پاس می‌شوند
- [ ] State persistence کار می‌کند
- [ ] No memory leaks