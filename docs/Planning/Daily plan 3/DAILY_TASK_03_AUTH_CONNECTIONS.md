# Daily Task 03: Auth & Connections (اتصال به گیت‌هاب و کلادفلر)

**هدف این فاز:** پیاده‌سازی مکانیزم ذخیره‌سازی و مدیریت اتصال‌های خارجی (Integrations) در `platform-api` و فراهم کردن رابط کاربری اولیه در `portal` برای مدیریت این اتصال‌ها.

---

## وضعیت فعلی
- [x] زیرساخت `platform-api` ماژولار شده است.
- [x] دیتابیس D1 با جداول `integration_connections` و `cloudflare_accounts` آماده است.
- [x] پورتال دارای شل اولیه و سایدبار است.

---

## تعریف خروجی قابل اتکا (Definition of Done)
1. پیاده‌سازی لاجیک CRUD برای `integration_connections` (GitHub) در `platform-api`.
2. پیاده‌سازی لاجیک CRUD برای `cloudflare_accounts` در `platform-api`.
3. ایجاد صفحه "Settings" یا "Integrations" در پورتال SvelteKit.
4. قابلیت ثبت دستی `GitHub Personal Access Token` و `Cloudflare API Token` از طریق UI (به عنوان فاز اول قبل از OAuth کامل).
5. اعتبارسنجی (Validation) اولیه توکن‌ها (آیا فرمت درست است؟).

---

## لیست وظایف (Task List)

### 1. توسعه Platform API (Backend)
- [ ] تکمیل `queries.ts` در ماژول `integrations` برای GitHub.
- [ ] تکمیل `queries.ts` در ماژول `integrations` برای Cloudflare.
- [ ] افزودن روت‌های `POST` برای ثبت اتصال جدید (Create Integration).
- [ ] افزودن روت‌های `DELETE` برای قطع اتصال.
- [ ] پیاده‌سازی یک Helper ساده برای شبیه‌سازی رمزنگاری توکن‌ها (فعلاً Plaintext یا Base64 ساده تا در فاز امنیت کامل شود).

### 2. توسعه Portal (Frontend)
- [ ] ایجاد مسیر جدید `/settings/integrations` در SvelteKit.
- [ ] طراحی کامپوننت `IntegrationCard` برای نمایش وضعیت اتصال گیت‌هاب و کلادفلر.
- [ ] ایجاد فرم "Add Connection" (Modal یا صفحه جدا).
- [ ] اتصال فرم‌ها به API های مربوطه در `platform-api`.

### 3. Verification & Smoke Test
- [ ] ثبت یک GitHub Token نمونه از طریق پورتال و مشاهده رکورد در D1.
- [ ] ثبت یک Cloudflare Account نمونه و مشاهده رکورد در D1.
- [ ] تست حذف اتصال و اطمینان از پاک شدن رکورد.

---

## نکات فنی
- **امنیت:** در این فاز توکن‌ها را به صورت امن در دیتابیس ذخیره نمی‌کنیم (فقط برای پیشبرد سریع MVP)، اما در `wrangler.toml` باید متغیرهای محیطی لازم برای فازهای بعدی پیش‌بینی شود.
- **Naming:** از اسامی جداول موجود در `schema.sql` استفاده شود (`integration_connections` و `cloudflare_accounts`).
