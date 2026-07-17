# TASK 21_05: Security Hardening

## هدف
افزایش امنیت برای production.

## Files
- `cloudflare/platform-api/src/agents/security/AuthZ.ts` (CREATE)
- `cloudflare/platform-api/src/agents/security/RateLimiter.ts` (UPDATE)

## پیاده‌سازی

```typescript
// Role-based access control
export class AuthZ {
  checkPermission(agentId: string, tool: string): boolean {}
  enforceTenantIsolation(tenantId: string): void {}
}

// Rate limiting
export class RateLimiter {
  checkLimit(agentId: string, tool: string): boolean {}
  getRemainingQuota(agentId: string): number {}
}
```

## معیارهای موفقیت
- [ ] Agents have minimal permissions
- [ ] All actions audited
- [ ] Secrets never exposed