# TASK 22_02: KV Short-Term Memory

## هدف
حافظه کوتاه‌مدت سریع با Workers KV.

## Files
- `cloudflare/platform-api/src/agents/memory/KVMemory.ts` (CREATE)

## پیاده‌سازی

```typescript
export class KVMemory {
  async get(key: string): Promise<any> {}
  async set(key: string, value: any, ttl: number): Promise<void> {}
}
```

## معیارهای موفقیت
- [ ] Session data < 50ms read
- [ ] TTL enforced