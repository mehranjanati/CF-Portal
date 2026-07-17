# TASK 23_04: Load Balancing

## هدف
توزیع کار بین agentهای مختلف.

## Files
- `cloudflare/platform-api/src/agents/balance/LoadBalancer.ts` (CREATE)

## پیاده‌سازی

```typescript
export class LoadBalancer {
  distribute(task: Task): Agent {}
  healthCheck(agent: Agent): boolean {}
}
```

## معیارهای موفقیت
- [ ] Work distributed evenly
- [ ] Failed agents detected