# TASK 20_06: Error Scenario Testing

## هدف
تست error handling و recovery.

## فایل‌های مورد نیاز
- `cloudflare/platform-api/tests/integration/error-scenarios.test.ts` (CREATE)
- `cloudflare/portal/tests/e2e/error-handling.spec.ts` (CREATE)

## پیاده‌سازی

```typescript
// Error scenarios to test
const SCENARIOS = [
  'network_failure',
  'tool_timeout',
  'agent_reasoning_error',
  'database_connection_loss',
  'rate_limit_exceeded',
  'invalid_user_input',
  'concurrent_requests',
  'backend_restart'
];
```

## معیارهای موفقیت
- [ ] تمام خطاها handling می‌شوند
- [ ] System recovers automatically
- [ ] No data loss