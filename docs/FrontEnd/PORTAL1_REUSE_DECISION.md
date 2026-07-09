# Portal1 Reuse Decision for Cloudflare Stack

## وضعیت تصمیم

**تصمیم نهایی:** `portal1` برای استک جدید **به‌عنوان مبنای معماری و implementation baseline مناسب نیست**، اما به‌عنوان **منبع reuse انتخابی برای UI, UX, layout و بعضی screenها کاملاً ارزشمند است**.

## حکم اجرایی

برای استک جدید:

- یک پروژه جدید `Cloudflare-first` ساخته شود
- `portal1` fork معماری نشود
- `portal1` فقط به‌عنوان `donor app` برای انتقال بخش‌های قابل استفاده نگه داشته شود

## چرا `portal1` baseline مناسب نیست

### 1. deployment model قدیمی است

`portal1` برای `GitHub Pages` و SPA static تنظیم شده و با execution model جدید که باید روی `Cloudflare Pages/Workers` بنشیند هم‌راستا نیست.

### 2. قراردادهای backend آن legacy هستند

بخش‌های اصلی UI به endpointها و flowهای قدیمی متصل‌اند:

- `workflows`
- `logs`
- `deployments`
- `internal/tools`
- `localhost`-based development assumptions

این قراردادها با مدل جدید `TypeScript Workers + GitHub Actions + User Cloudflare Account` سازگار نیستند.

### 3. ذهنیت پروژه هنوز متعلق به استک قبلی است

در `portal1` هنوز نشانه‌های واضحی از مدل قبلی وجود دارد:

- `GitHub Pages`
- `Vercel/serverless` assumptions
- `WebContainer`
- `Matrix`
- `LiveKit`
- service contracts وابسته به `supernode`

این‌ها برای شروع stack جدید نویز معماری ایجاد می‌کنند.

### 4. migration مستقیم باعث carry-over debt می‌شود

اگر `portal1` را همان‌طور که هست مبنا قرار دهیم:

- مسیرهای قدیمی API وارد سیستم جدید می‌شوند
- deployment configها باید به‌زور اصلاح شوند
- naming و abstractionهای قدیمی به استک جدید نشت می‌کنند
- سرعت شروع کم می‌شود

## چرا با این حال `portal1` ارزش نگه‌داری دارد

### 1. UI shell آماده دارد

ساختارهای زیر قابل reuse هستند:

- app shell
- sidebar
- topbar
- page layout
- card/input/button primitives

### 2. screenهای product-facing دارد

برای portal جدید می‌توان از تجربه و ساختار این صفحه‌ها استفاده کرد:

- builder
- deployments
- workflows
- dashboard
- projects
- settings

### 3. SvelteKit foundation آن مفید است

با اینکه deployment model آن قدیمی است، ولی برای این موارد هنوز مفید است:

- composition در Svelte
- organization کامپوننت‌ها
- تست‌های frontend
- route grouping

## مدل پیشنهادی reuse

### Reuse Strategy: Copy Selectively, Not Migrate Blindly

قاعده کار این باشد:

- UI primitives را کپی کن
- layout و screen structure را کپی یا بازطراحی سبک کن
- data layer را از صفر بازنویسی کن
- endpoint contractها را از صفر برای استک جدید تعریف کن
- deployment config را از صفر برای Cloudflare بنویس

## چیزهایی که باید reuse شوند

- `src/lib/components/ui`
- `src/lib/components/layout`
- بخش‌هایی از `dashboard`
- بخش‌هایی از `builder`
- بخش‌هایی از `deployments`
- بخش‌هایی از `workflows`
- الگوی route organization
- بخشی از تست‌های UI و component tests

## چیزهایی که نباید reuse شوند

- service layer فعلی
- endpoint naming فعلی
- `VITE_API_BASE_URL` assumptions
- `supernode` data contracts
- `GitHub Pages` deployment setup
- base path فعلی repository-based
- هر coupling مستقیم به `localhost:3000/3001`
- فرضیات `Vercel` یا backend جداگانه

## تصمیم معماری پیشنهادی برای پروژه جدید

پروژه جدید باید این مبنا را داشته باشد:

- `Portal`: `SvelteKit + Cloudflare adapter`
- `Platform API`: `TypeScript Workers`
- `Build/Deploy`: `GitHub Actions`
- `Runtime target`: `Cloudflare Pages` یا `Cloudflare Workers`
- `Metadata`: `D1`
- `Artifacts / logs / snapshots`: `R2`

## نسبت این تصمیم با اسناد Cloudflare

این تصمیم با این اسناد هم‌راستا است:

1. `README.md`
   - استک جدید را `Cloudflare-first / Cloudflare-only` تعریف می‌کند
2. `ARCHITECTURE_V5_GITHUB_ACTIONS_USER_CF.md`
   - v1 را بر پایه `GitHub Actions + User Cloudflare Account` می‌چیند
3. `CLOUDFLARE_FIRST_ECOSYSTEM.md`
   - target architecture را `Cloudflare-Only / TS+Rust / VibeSDK-First` می‌بیند
4. `GITOPS_WORKFLOW.md`
   - build/deploy contract جدید را روی GitHub-first و Cloudflare target تعریف می‌کند

## نتیجه عملی

اگر هدف شما **شروع سریع استک جدید بدون backend جداگانه** باشد:

- از `portal1` فقط UI و screen ideas را بردار
- پروژه جدید را از صفر با config و contracts جدید بساز
- naming, data flow و deployment model را از `portal1` به ارث نبر

## Definition of Done برای reuse

تصمیم reuse وقتی درست اجرا شده که:

- portal جدید مستقل از `portal1` build شود
- هیچ endpoint legacy از `supernode` در baseline جدید وجود نداشته باشد
- deployment path جدید فقط Cloudflare-oriented باشد
- UI/UX خوب `portal1` حفظ شود، بدون حمل debt معماری قبلی
