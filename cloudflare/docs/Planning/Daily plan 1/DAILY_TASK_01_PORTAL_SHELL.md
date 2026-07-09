# Daily Task 01: Portal Shell Bootstrap

**هدف روز:** راه‌اندازی پایه پورتال SPA با SvelteKit، اعمال Cloudflare Adapter، و انتقال کامپوننت‌های UI قدیمی به ساختار جدید به طوری که پروژه روی لوکال بیلد و اجرا شود.

**خروجی قابل اتکا (Definition of Done):**
1. اجرای `npm run dev` در پوشه `portal` با موفقیت یک صفحه وب شامل Sidebar و Topbar را نمایش دهد.
2. اجرای `npm run build` بدون خطای لینت و تایپ‌اسکریپت تمام شود.

---

## لیست وظایف (To-Do)

### 1. Initialize SvelteKit
- [ ] اجرای دستور ساخت پروژه: `npm create svelte@latest portal` (انتخاب Skeleton project و TypeScript).
- [ ] نصب وابستگی‌ها: `npm install`.
- [ ] نصب آداپتور کلادفلر: `npm i -D @sveltejs/adapter-cloudflare`.
- [ ] آپدیت `svelte.config.js` برای استفاده از `adapter-cloudflare`.

### 2. Setup TailwindCSS & UI Library
- [ ] نصب TailwindCSS: `npx smui-theme template ...` (یا نصب مستقیم Tailwind و تنظیم `tailwind.config.js`).
- [ ] انتقال (Copy) فایل‌های پایه UI از پروژه قدیمی (`ui/primitives/*` مثل Button, Input, Card) به `src/lib/components/ui/`.
- [ ] رفع خطاهای احتمالی ایمپورت در کامپوننت‌های کپی شده.

### 3. Create Layout Shell
- [ ] انتقال `ui/layout/Sidebar.svelte` به `src/lib/components/layout/`.
- [ ] انتقال `ui/layout/Topbar.svelte` به `src/lib/components/layout/`.
- [ ] انتقال `ui/layout/AppShell.svelte` به `src/lib/components/layout/`.
- [ ] تنظیم فایل `src/routes/+layout.svelte` برای استفاده از `AppShell`.

### 4. Create Placeholder Routes
- [ ] ساخت فایل `src/routes/(app)/projects/+page.svelte` (صفحه خالی داشبورد پروژه‌ها).
- [ ] تنظیم Redirect پیش‌فرض از `/` به `/projects`.

### 5. Verification (تست نهایی روز)
- [ ] اجرای `npm run check` برای بررسی تایپ‌ها.
- [ ] اجرای `npm run build` برای اطمینان از صحت خروجی کلادفلر.

---
**نکته برای توسعه‌دهنده:** 
در این مرحله هیچ اتصال واقعی به بک‌اند (Platform API) انجام نمی‌شود. همه دیتاها باید Mock باشند تا فقط پوسته (UI Shell) تثبیت شود.
