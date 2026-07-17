# TASK 23_05: Fault Tolerance

## هدف
مدیریت خطاهای agentها.

## Files
- `cloudflare/platform-api/src/agents/fault/Resilience.ts` (CREATE)

## پیاده‌سازی

```typescript
export class Resilience {
  retry(task: Task): Result {}
  fallback(task: Task): Result {}
  compensate(task: Task): void {}
}
```

## معیارهای موفقیت
- [ ] Failed tasks retried
- [ ] Fallback agents available