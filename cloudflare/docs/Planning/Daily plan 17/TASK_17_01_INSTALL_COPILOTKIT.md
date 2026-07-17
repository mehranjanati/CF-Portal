# TASK 17_01: Install & Configure CopilotKit Dependencies

## هدف
نصب و پیکربندی وابستگی‌های CopilotKit در backend و frontend پروژه.

## فایل‌های مورد نیاز
- `cloudflare/platform-api/package.json` - اضافه کردن `@copilotkit/runtime`
- `cloudflare/portal/package.json` - اضافه کردن `@copilotkit/sdk` (Headless SDK)
- `cloudflare/platform-api/wrangler.toml` - بررسی bindings


## مراحل اجرا

### 1. نصب CopilotKit Runtime در Backend
```bash
cd cloudflare/platform-api
npm install @copilotkit/runtime
```

### 2. نصب CopilotKit Headless SDK در Frontend (Portal)
```bash
cd cloudflare/portal
npm install @copilotkit/sdk
```

**توضیح:** استفاده از CopilotKit Headless SDK به جای React-based packages.
- حجم کم (~15KB)
- Framework-agnostic (با Svelte سازگار)
- مستقیم روی AG-UI Protocol کار می‌کند
- نیازمند wrapper سفاری برای Svelte Runes است


### 3. بررسی Compatibility
- اطمینان از compatibility با `hono` v4
- اطمینان از compatibility با `@cloudflare/agents` v0.0.9
- بررسی TypeScript types
- تست import و type definitions در Svelte


### 4. به‌روزرسانی wrangler.toml
اطمینان از وجود bindings مورد نیاز:
- `AI` binding برای Workers AI
- `MEMORY` KV namespace برای حافظه agent
- `DB` D1 database برای persistence

## خروجی قابل مشاهده
- وابستگی‌ها در `package.json` هر دو پروژه اضافه شده
- `npm install` بدون خطا اجرا می‌شود
- `npx wrangler deploy` بدون خطا اجرا می‌شود

## وابستگی‌ها
- Node.js >= 18
- npm >= 9
- Cloudflare account با Workers plan فعال