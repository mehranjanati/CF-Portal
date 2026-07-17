# TASK 22_04: Context Retrieval

## هدف
مدیریت هوشمند context window.

## Files
- `cloudflare/platform-api/src/agents/context/ContextManager.ts` (CREATE)

## پیاده‌سازی

```typescript
export class ContextManager {
  countTokens(text: string): number {}
  prioritize(messages: Message[]): Message[] {}
  compress(context: Context): Context {}
}
```

## معیارهای موفقیت
- [ ] Context within limits
- [ ] Relevant info preserved