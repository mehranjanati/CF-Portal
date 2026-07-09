# Master Plan: Path to MVP (Daily Tasks)

**هدف:** رسیدن به یک MVP (Minimum Viable Product) عملیاتی که در آن کاربر بتواند لاگین کند، پروژه بسازد، کدها در GitHub او کامیت شود، و روی اکانت Cloudflare او دیپلوی شده و لینک Preview در پورتال نمایش داده شود.

هر `Daily Plan` باید یک **خروجی قابل مشاهده، اتکا و تست (Tangible Outcome)** داشته باشد.

---

## 📅 Daily Plan 1: Foundation & Portal Shell (پوسته اولیه)
**خروجی قابل مشاهده:** پورتال SPA با ساختار SvelteKit روی لوکال بالا می‌آید، شامل یک Layout اصلی (Sidebar/Topbar) و کامپوننت‌های پایه UI. هیچ خطای لینت یا بیلد وجود ندارد.
- **تسک‌ها:** در فایل `DAILY_TASK_01_PORTAL_SHELL.md`

## 📅 Daily Plan 2: Platform API & Database (بک‌اند پایه)
**خروجی قابل مشاهده:** دیتابیس D1 روی لوکال (Wrangler) ایجاد شده است. Worker بالا می‌آید و می‌توان از طریق Postman یا Curl به آن درخواست زد و یک User یا Tenant تستی ایجاد کرد.
- **تسک‌ها:** در فایل `DAILY_TASK_02_PLATFORM_API.md`

## 📅 Daily Plan 3: Auth & Connections (اتصال به گیت‌هاب و کلادفلر)
**خروجی قابل مشاهده:** کاربر در پورتال می‌تواند روی دکمه "Connect GitHub" کلیک کند، فرآیند OAuth شبیه‌سازی/اجرا شود و توکن در دیتابیس ثبت شود. (برای Cloudflare هم فرم دریافت توکن کار کند).
- **تسک‌ها:** در فایل `DAILY_TASK_03_AUTH_CONNECTIONS.md`

## 📅 Daily Plan 4: Project Creation & GitHub Injection (تزریق کد به گیت‌هاب)
**خروجی قابل مشاهده:** با زدن دکمه "Create Project" در پورتال، یک ریپازیتوری واقعی در اکانت گیت‌هاب کاربر ساخته می‌شود، فایل `deploy.yml` و `wrangler.toml` در آن کامیت می‌شود و Secretها ست می‌شوند.
- **تسک‌ها:** در فایل `DAILY_TASK_04_PROJECT_CREATION.md`

## 📅 Daily Plan 5: CI/CD Webhook & Real-time Status (مشاهده دیپلوی)
**خروجی قابل مشاهده:** GitHub Actions اجرا می‌شود، پس از پایان، Webhook به Platform API می‌خورد، و پورتال SPA بدون نیاز به رفرش (از طریق Polling یا SSE)، دکمه "View Preview" را با لینک واقعی روشن می‌کند.
- **تسک‌ها:** در فایل `DAILY_TASK_05_DEPLOY_STATUS.md`

## 📅 Daily Plan 6: AI Builder Agent MVP (تولید کد با هوش مصنوعی)
**خروجی قابل مشاهده:** یک چت‌باکس در پورتال، کاربر تایپ می‌کند "Add a counter component"، درخواست به AI Gateway می‌رود، خروجی در قالب یک کامیت جدید در برنچ `preview/feature` در گیت‌هاب کاربر اعمال می‌شود.
- **تسک‌ها:** در فایل `DAILY_TASK_06_AI_AGENT.md`
