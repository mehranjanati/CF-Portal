# TASK 22_05: Prompt Caching

## هدف
کش کردن promptهای متداول.

## Files
- `cloudflare/platform-api/src/agents/cache/PromptCache.ts` (CREATE)

## پیاده‌سازی

```typescript
export class PromptCache {
  async get(key: string): Promise<string | null> {}
  async set(key: string, value: string): Promise<void> {}
  async invalidate(key: string): Promise<void> {}
}
```

## معیارهای موفقیت
- [ ] Cache hit > 60%
- [ ] Latency reduced