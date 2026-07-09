# Master Plan: Path to MVP (Daily Tasks)

**هدف:** رسیدن به یک MVP (Minimum Viable Product) عملیاتی که در آن کاربر بتواند لاگین کند، پروژه بسازد، کدها در GitHub او کامیت شود، و روی اکانت Cloudflare او دیپلوی شده و لینک Preview در پورتال نمایش داده شود.

هر `Daily Plan` باید یک **خروجی قابل مشاهده، اتکا و تست (Tangible Outcome)** داشته باشد.

---

## 📅 Daily Plan 1: Foundation & Portal Shell (پوسته اولیه)
**خروجی قابل مشاهده:** پورتال SPA با ساختار SvelteKit روی لوکال بالا می‌آید، شامل یک Layout اصلی (Sidebar/Topbar) و کامپوننت‌های پایه UI. هیچ خطای لینت یا بیلد وجود ندارد.
- **تسک‌ها:** در فایل `DAILY_TASK_01_PORTAL_SHELL.md`

## 📅 Daily Plan 2: Platform API Control Plane Foundation
**خروجی قابل مشاهده:** `platform-api` از حالت Worker تک‌فایل خارج شده و به یک `control plane API` ماژولار تبدیل می‌شود؛ روت‌های پایه `health`, `tenants`, `apps`, `deployments` ساختار استاندارد می‌گیرند و برای مرحله‌های بعدی `builder`, `workflow-runs`, و webhookهای CI/CD آماده می‌شود.
- **تسک‌ها:** در فایل `DAILY_TASK_02_PLATFORM_API.md`

## 📅 Daily Plan 3: Auth & Connections (اتصال به گیت‌هاب و کلادفلر)
**خروجی قابل مشاهده:** کاربر در پورتال می‌تواند روی دکمه "Connect GitHub" کلیک کند، فرآیند OAuth شبیه‌سازی/اجرا شود و توکن در دیتابیس ثبت شود. (برای Cloudflare هم فرم دریافت توکن کار کند).
- **تسک‌ها:** در فایل `DAILY_TASK_03_AUTH_CONNECTIONS.md`

## 📅 Daily Plan 4: Operational MVP Hardening
**خروجی قابل مشاهده:** کاربر می‌تواند یک workspace واقعی بسازد، project ایجاد کند، integrationهای GitHub و Cloudflare را ثبت کند، deployment record داشته باشد و همه این‌ها را در UI متصل به `platform-api + D1` ببیند.
- **تسک‌ها:** در فایل `DAILY_TASK_04_OPERATIONAL_MVP.md`

## 📅 Daily Plan 5: CI/CD Webhook & Real-time Status (مشاهده دیپلوی)
**خروجی قابل مشاهده:** GitHub Actions اجرا می‌شود، پس از پایان، Webhook به Platform API می‌خورد، و پورتال SPA بدون نیاز به رفرش (از طریق Polling یا SSE)، دکمه "View Preview" را با لینک واقعی روشن می‌کند.
- **تسک‌ها:** در فایل `DAILY_TASK_05_DEPLOY_STATUS.md`

## 📅 Daily Plan 6: AI Builder Agent MVP (تولید کد با هوش مصنوعی)
**خروجی قابل مشاهده:** یک چت‌باکس در پورتال، کاربر تایپ می‌کند "Add a counter component"، درخواست به AI Gateway می‌رود، خروجی در قالب یک کامیت جدید در برنچ `preview/feature` در گیت‌هاب کاربر اعمال می‌شود.
- **تسک‌ها:** در فایل `DAILY_TASK_06_AI_AGENT.md`
