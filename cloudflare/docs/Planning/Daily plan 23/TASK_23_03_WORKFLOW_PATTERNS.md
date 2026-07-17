# TASK 23_03: Workflow Patterns

## هدف
الگوهای رایج برای هماهنگی agentها.

## Files
- `cloudflare/platform-api/src/agents/workflows/Patterns.ts` (CREATE)

## پیاده‌سازی

```typescript
export class Patterns {
  sequential(steps: Step[]): Workflow {}
  parallel(tasks: Task[]): Workflow {}
  fanOutFanIn(branches: Branch[]): Workflow {}
  saga(actions: Action[]): Workflow {}
}
```

## معیارهای موفقیت
- [ ] All patterns implemented
- [ ] Patterns composable