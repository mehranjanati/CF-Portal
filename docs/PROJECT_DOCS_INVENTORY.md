# Project Documentation Inventory (Cloudflare-first Platform)

در یک پروژه واقعی، مقیاس‌پذیر و Production-grade با استک Cloudflare (SPA + Workers + D1 + GitHub Actions + AI Gateway)، برای اینکه تیم توسعه، دواپس و پروداکت بدون اصطکاک کار کنند، به داکیومنت‌های زیر نیاز است.

---

## 1. داکیومنت‌های معماری و قراردادها (Architecture & Contracts)
*این دسته مشخص می‌کنند که سیستم در سطح کلان چگونه کار می‌کند.*

- [x] [D1_SCHEMA_V1.md](Ops/D1_SCHEMA_V1.md): ساختار دیتابیس رابطه‌ای، روابط بین Tenant، User و App.
- [x] [FREE_TIER_DEPLOY_FLOW.md](Ops/FREE_TIER_DEPLOY_FLOW.md): مسیر دیپلوی کاربر (SPA -> GitHub -> CF Account).
- [x] [GITHUB_ACTIONS_DEPLOYMENT_CONTRACT.md](Ops/GITHUB_ACTIONS_DEPLOYMENT_CONTRACT.md): ساختار فایل YML و نحوه تعامل GitHub با Platform API (Webhook).
- [x] [AI_LAYER_CONTRACT.md](AI/AI_LAYER_CONTRACT.md): معماری AI Gateway و Cloudflare Agents.
- [ ] `API_CONTRACT_V1.md`: لیست دقیق اندپوینت‌های REST/RPC بین Portal SPA و Platform Worker (ورودی‌ها و خروجی‌ها).
- [ ] `AUTH_AND_SESSION_MODEL.md`: نحوه مدیریت توکن‌ها (JWT/OAuth) بین SPA و Worker و حفظ امنیت.

## 2. داکیومنت‌های عملیاتی توسعه (Developer Experience & Runbooks)
*این دسته برای برنامه‌نویسانی است که می‌خواهند روی پروژه کد بزنند.*

- [ ] `LOCAL_DEVELOPMENT_GUIDE.md`: نحوه اجرای پروژه به صورت لوکال (اجرای Wrangler، SvelteKit، و شبیه‌سازی D1/KV در لوکال).
- [ ] `ENVIRONMENT_VARIABLES_CATALOG.md`: لیست تمام متغیرهای محیطی (`.dev.vars`) و سکرت‌های مورد نیاز برای اجرای پروژه.
- [ ] `TESTING_STRATEGY.md`: قوانین نوشتن Unit Test و E2E (Playwright) و نحوه اجرای Smoke Testها.

## 3. داکیومنت‌های محصول و UI (Product & Frontend)
*این دسته رفتار رابط کاربری را تعریف می‌کنند.*

- [ ] `PORTAL_ROUTES_AND_STATES.md`: ساختار Routeهای SPA، مدیریت Stateهای سراسری (مثل انتخاب Tenant فعلی).
- [ ] `UI_COMPONENT_LIBRARY.md`: قوانین استفاده از کامپوننت‌های پایه (Button, Card, Input) و استایل‌گاید (Tailwind).

## 4. داکیومنت‌های برنامه‌ریزی (Planning & Management)
*این دسته برای مدیریت تسک‌ها و مسیر رسیدن به MVP است.*

- [ ] [DAILY_TASKS_MASTER.md](Planning/Daily%20plan%201/DAILY_TASKS_MASTER.md): نقشه راه کلان (Master Plan) تقسیم شده به برنامه‌های روزانه.
- [ ] `DAILY_TASK_*.md`: جزئیات اجرایی هر روز (یک فایل مجزا برای هر روز).

## 5. Architectural Locks (Core Decisions)
*این دسته تصمیمات قطعی معماری هستند که نباید هرگز فراموش یا نقض شوند.*

- [x] [ARCH_LOCK_SPA_PAGES.md](Architecture/ARCH_LOCK_SPA_PAGES.md): قفل کردن معماری فرانت‌اند به عنوان Strict SPA (بدون SSR) و دیپلوی روی Cloudflare Pages.

