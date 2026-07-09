# Free-Tier Deploy Flow (GitHub Actions + User CF Account)

**وضعیت:** Baseline (Free-Tier)
**معماری کلاینت:** Portal SPA (Single Page Application) متصل به Platform API (Cloudflare Workers)

## هدف

این سند مسیر کامل و قدم‌به‌قدم کاربر از زمان ورود به پورتال تا دیدن URL خروجی دیپلوی شده روی اکانت خودش را تعریف می‌کند. این فرآیند بر اساس معماری V5 (GitHub Actions به عنوان موتور بیلد و Cloudflare اکانت کاربر به عنوان Runtime) طراحی شده است.

---

## 1. Flow Diagram (مراحل اصلی)

```text
[Portal SPA] --> [Platform API (Worker)] --> [GitHub] --> [GitHub Actions] --> [User CF Account]
```

---

## 2. شرح مراحل (Step-by-Step)

### مرحله 1: Onboarding و اتصال حساب‌ها (Connections)
از آنجایی که پورتال یک **SPA** است، وضعیت لاگین و نشست‌ها (Sessions) در سمت کلاینت مدیریت شده و با توکن به Platform API ارسال می‌شود.

1. **ورود:** کاربر وارد Portal SPA می‌شود.
2. **اتصال GitHub:** کاربر روی "Connect GitHub" کلیک می‌کند. SPA او را به مسیر OAuth می‌فرستد. پس از بازگشت، توکن گیت‌هاب در D1 (جدول `integration_connections`) رمزنگاری و ذخیره می‌شود.
3. **اتصال Cloudflare:** کاربر روی "Connect Cloudflare" کلیک می‌کند. او باید یک API Token از کلادفلر با دسترسی‌های (Workers/Pages, D1, R2) بسازد و در SPA وارد کند. این توکن در D1 (جدول `cloudflare_accounts`) ذخیره می‌شود.

### مرحله 2: ساخت پروژه (App Creation)
1. **درخواست:** کاربر در SPA اطلاعات پروژه جدید (نام، قالب اولیه/Template) را انتخاب می‌کند.
2. **API Call:** کلاینت درخواست ساخت اپلیکیشن را به Platform API می‌فرستد.
3. **ایجاد ریپازیتوری:** Platform API با استفاده از توکن GitHub کاربر، یک ریپازیتوری جدید در اکانت گیت‌هاب او می‌سازد.
4. **تزریق Template:** کدهای پایه (Boilerplate) به همراه تنظیمات `wrangler.toml` (تنظیم شده برای اکانت کاربر) و فایل‌های `.github/workflows/deploy.yml` توسط API روی ریپازیتوری کامیت می‌شود.
5. **ثبت در دیتابیس:** رکورد پروژه در جداول `apps` و `repositories` در D1 ثبت می‌شود.

### مرحله 3: اجرای Workflow (CI/CD)
پس از اولین کامیت (یا هر کامیت بعدی توسط کاربر/Agent):
1. **Trigger:** اکشن گیت‌هاب (فایل `deploy.yml`) به صورت خودکار تریگر می‌شود.
2. **Build:** کدها بیلد می‌شوند (مثلاً `npm run build`).
3. **Deploy:** اکشن با استفاده از توکن Cloudflare کاربر (که به عنوان Secret در GitHub Repository تزریق شده است)، دستور `npx wrangler deploy` را اجرا می‌کند.

### مرحله 4: بازخورد و آپدیت وضعیت (Status Sync)
برای اینکه SPA بدون نیاز به رفرش وضعیت دیپلوی را نمایش دهد:
1. **Webhook / Callback:** در پایان اجرای GitHub Actions (موفق یا ناموفق)، یک درخواست HTTP به Platform API ارسال می‌شود تا وضعیت (جدول `deployment_runs`) آپدیت شود.
2. **ارسال URL:** در صورت موفقیت، لینک تولید شده (مثلاً `app-name.username.workers.dev`) به API ارسال می‌شود.
3. **آپدیت کلاینت (SPA):** پورتال SPA با استفاده از Polling سبک یا از طریق اتصال Real-time (مثلاً WebSocket یا SSE از طریق Agent/Durable Objects) وضعیت را دریافت کرده و دکمه "View Preview" را به کاربر نشان می‌دهد.

---

## 3. مدیریت Secretها و توکن‌ها در این مسیر

یکی از چالش‌های مدل Free-Tier، انتقال امن توکن Cloudflare کاربر به GitHub Actions است.

- **Platform API** توکن Cloudflare را از دیتابیس D1 می‌خواند (دیکریپت می‌کند).
- هنگام ساخت ریپازیتوری در گیت‌هاب، **Platform API** این توکن را به عنوان یک **GitHub Actions Secret** (با نام `CLOUDFLARE_API_TOKEN`) در ریپازیتوری ست می‌کند.
- از این پس، GitHub Actions بدون نیاز به ارتباط با پورتال، به طور مستقیم به اکانت Cloudflare کاربر متصل می‌شود.

---

## 4. Preview vs Production

- **Preview (Branch-based):** اگر کامیت روی برنچی غیر از `main` باشد، GitHub Actions دستور دیپلوی را به محیط Preview می‌فرستد و لینک منحصر‌به‌فرد تولید می‌کند.
- **Production (Main branch):** اگر کامیت روی برنچ `main` باشد، روی محیط Production کاربر در Cloudflare جایگزین می‌شود.
