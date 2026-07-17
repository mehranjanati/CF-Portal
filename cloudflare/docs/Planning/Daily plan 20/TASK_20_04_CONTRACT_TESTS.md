# TASK 20_04: Frontend-Backend Contract Tests

## هدف
تست contractهای API بین فرانت‌اند و بک‌اند.

## فایل‌های مورد نیاز
- `cloudflare/platform-api/tests/contract/api-contract.test.ts` (CREATE)
- `cloudflare/portal/tests/contract/api-client.test.ts` (CREATE)

## پیاده‌سازی

```typescript
// tests/contract/api-contract.test.ts
describe('API Contract Tests', () => {
  it('POST /api/builder/sessions creates session', async () => {});
  it('POST /api/builder/sessions/:id/stream returns SSE', async () => {});
  it('GET /api/builder/sessions/:id/status returns status', async () => {});
  it('Error responses have correct format', async () => {});
  it('Authentication works', async () => {});
  it('Rate limiting enforced', async () => {});
});
```

## معیارهای موفقیت
- [ ] تمام تست‌ها پاس می‌شوند
- [ ] API contracts verified