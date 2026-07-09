# Daily Task 02: Platform API Control Plane Foundation

**هدف این فاز:** تبدیل `platform-api` از یک Worker بوت‌استرپ ساده به `trusted control plane API` پروژه بر پایه `Cloudflare Workers + D1` و هم‌راستا با ویژن `Cloudflare-first`.

## چرا این پلن باید به‌روزرسانی شود؟

پلن قبلی فقط برای بالا آوردن یک Worker اولیه و اتصال پایه به `D1` مناسب بود.  
اما طبق baseline جدید پروژه:

- `platform-api` باید لایه رسمی `control plane` باشد
- باید برای `portal`, `agents`, `workflows`, `builder` و `deployments` مرز مسئولیت روشن داشته باشد
- باید `module-based` طراحی شود، نه `single-file worker`
- باید entrypoint رسمی `validation`, `compile`, `deployment records`, `webhook handling`, `tenant/app metadata` باشد

---

## وضعیت فعلی repo

تا این لحظه این بخش‌ها وجود دارند و باید حفظ شوند:

- [x] پوشه `platform-api` با ساختار پایه Worker ساخته شده است
- [x] `Hono` برای routing اضافه شده است
- [x] فایل `wrangler.toml` برای `D1` وجود دارد
- [x] فایل `schema.sql` اولیه ساخته شده است
- [x] روت سلامت پایه و یک روت ابتدایی برای `tenants` وجود دارد

اما این وضعیت هنوز با معماری هدف فاصله دارد:

- [ ] `src/index.ts` هنوز بیش از حد متمرکز است
- [ ] ساختار `modules/` و `lib/` هنوز ساخته نشده است
- [ ] مرز `Portal API`, `Builder entrypoints`, `Deploy callbacks`, `Integrations` و `Workflow runs` رسمی نشده است
- [ ] schema فعلی هنوز همه domainهای اصلی روز اول را پوشش نمی‌دهد

---

## تعریف خروجی قابل اتکا (Definition of Done)

این فاز وقتی complete محسوب می‌شود که:

1. `platform-api` ساختار ماژولار داشته باشد و `src/index.ts` فقط composition root باشد.
2. فولدرهای مشترک `src/lib` و `src/types` برای primitiveها، error handling و typing ساخته شوند.
3. ماژول‌های day-1 برای `health`, `tenants`, `apps`, `deployments`, `workflow-runs`, `integrations`, `builder` ایجاد شوند.
4. endpoint naming با نیازهای `portal` و معماری `FrontEnd` هم‌راستا شود.
5. مرز مسئولیت `Platform API` با `Agents SDK` و `Workflows` در خود پلن صریح بماند.
6. schema و قراردادهای داده برای metadata و deployment tracking آماده مرحله بعد باشند.
7. تست remote روی Cloudflare برای مسیرهای پایه و `D1` قابل انجام باشد.

---

## مرز مسئولیت `Platform API`

`Platform API` در این معماری مسئول این موارد است:

- `auth/session`
- `tenant/app metadata`
- `integration records`
- `authorization checks`
- `graph validation entrypoint`
- `compile entrypoint`
- `deployment records`
- `webhook handling`

و مسئول این موارد نیست:

- conversational state per run
- interactive reasoning loop
- realtime assistant session
- sandbox execution
- اجرای مستقیم business logic ایجنت‌ها

---

## ساختار هدف در این فاز

```text
platform-api/
  src/
    index.ts
    lib/
      db.ts
      errors.ts
      json.ts
    modules/
      health/
        routes.ts
      tenants/
        routes.ts
        queries.ts
      apps/
        routes.ts
        queries.ts
      deployments/
        routes.ts
        queries.ts
      workflow-runs/
        routes.ts
        queries.ts
      integrations/
        github.ts
        cloudflare.ts
      builder/
        routes.ts
        service.ts
      artifacts/
        routes.ts
    types/
      env.ts
      api.ts
```

---

## لیست وظایف به‌روز شده

### 1. Composition Root و Shared Primitives

- [x] شکستن `src/index.ts` و نگه داشتن آن فقط به‌عنوان composition root.
- [x] ساخت `src/lib/db.ts` برای دسترسی استاندارد به `D1`.
- [x] ساخت `src/lib/json.ts` برای response helperهای یکدست.
- [x] ساخت `src/lib/errors.ts` برای error mapping و status handling.
- [x] ساخت `src/types/env.ts` و `src/types/api.ts` برای typeهای bind و قراردادهای API.

### 2. ماژول‌های دامنه‌ای Day-1

- [x] استخراج `health` به `modules/health/routes.ts`.
- [x] انتقال `tenants` به `modules/tenants/routes.ts` و `queries.ts`.
- [x] ساخت `modules/apps/*` به‌عنوان API رسمی feature `projects`.
- [x] ساخت `modules/deployments/*` برای deployment records و status polling.
- [x] ساخت `modules/workflow-runs/*` برای سطح metadata و tracking.
- [x] ساخت `modules/integrations/*` برای GitHub و Cloudflare integration metadata.
- [x] ساخت `modules/builder/*` فقط به‌عنوان `validation + compile entrypoint` و نه runtime ایجنت.
- [x] ایجاد `modules/artifacts/routes.ts` به‌عنوان نقطه extension برای bundle/log/download.

### 3. Data Model و Contract Alignment

- [x] بازبینی `schema.sql` بر اساس domainهای `users`, `tenants`, `memberships`, `apps`, `deployments`, `deployment_runs`, `integrations`.
- [x] افزودن `workflow_runs` به‌عنوان جدول مستقل برای metadata و tracking سطح پلتفرم.
- [x] افزودن `artifacts` به‌عنوان index دیتابیسی برای ارجاع به خروجی‌ها، bundleها و logها.
- [x] هم‌راستا کردن naming بین `portal` و `platform-api` تا `projects` در UI معادل `apps` در API باشد.
- [x] تثبیت route prefixهای رسمی برای مصرف از سمت پورتال.
- [x] مشخص کردن contract اولیه برای `deploy callback` از GitHub Actions.

### 4. Orchestration Entry Points

- [x] تعریف endpoint اولیه برای `builder validate`.
- [x] تعریف endpoint اولیه برای `builder compile`.
- [x] تعریف endpoint اولیه برای ثبت و خواندن `deployment status`.
- [x] تعریف endpoint اولیه برای webhookهای CI/CD.
- [x] تعریف endpointهای واقعی برای `workflow-runs` جهت list/upsert در سطح metadata.
- [x] تعریف endpointهای واقعی برای `artifacts` جهت list/create به‌عنوان artifact registry اولیه.

### 5. Remote Verification

با توجه به محدودیت اجرای محلی `workerd` روی سیستم فعلی، تست نهایی باید روی Cloudflare انجام شود:

- [x] ورود به حساب Cloudflare با `npx wrangler login` توسط کاربر انجام شود.
- [x] از داخل پوشه `platform-api` دستور `npx wrangler d1 create nexus-db` اجرا شود.
- [x] مقدار `database_id` واقعی از خروجی مرحله قبل برداشته و در `wrangler.toml` جای‌گذاری شود.
- [x] اسکیمای اولیه با `npx wrangler d1 execute nexus-db --remote --file=./schema.sql` روی D1 اعمال شود.
- [x] Worker با `npm run deploy` روی Cloudflare منتشر شود.
- [ ] URL نهایی Worker از خروجی deploy ثبت شود تا مبنای smoke test باشد.
- [ ] مسیرهای `GET /api/health`, `GET /api/tenants`, `GET /api/apps` و `POST /api/builder/validate` روی remote تست شوند.
- [ ] نتیجه هر تست در همین پلن یا لاگ روزانه ثبت شود تا وضعیت completion قابل پیگیری بماند.

#### چک‌لیست اجرایی دقیق

1. **آماده‌سازی ترمینال**
   از مسیر زیر وارد پروژه شوید:

   ```bash
   cd /Users/elbaan/Documents/cloudflare/platform-api
   ```

2. **احراز هویت Cloudflare**
   این مرحله باید توسط کاربر انجام شود چون نیاز به login تعاملی دارد:

   ```bash
   npx wrangler login
   ```

   معیار موفقیت:
   - مرورگر برای احراز هویت باز شود.
   - پس از تکمیل login، ترمینال خطای authorization نداشته باشد.

3. **ساخت دیتابیس D1**
   دیتابیس اصلی control plane را بسازید:

   ```bash
   npx wrangler d1 create nexus-db
   ```

   خروجی مورد انتظار:
   - `database_name`
   - `database_id`
   - snippet پیشنهادی `wrangler.toml`

4. **به‌روزرسانی تنظیمات Worker**
   مقدار placeholder فعلی در `platform-api/wrangler.toml` را با `database_id` واقعی جایگزین کنید.

   فایل هدف:
   - `platform-api/wrangler.toml`

   معیار موفقیت:
   - دیگر مقدار `xxxx-xxxx-xxxx-xxxx-xxxx` در فایل وجود نداشته باشد.

5. **اعمال schema روی D1 remote**
   اسکیمای day-1 را روی دیتابیس remote اجرا کنید:

   ```bash
   npx wrangler d1 execute nexus-db --remote --file=./schema.sql
   ```

   معیار موفقیت:
   - اجرای command بدون error تمام شود.
   - جدول‌های `tenants`, `apps`, `deployments`, `workflow_runs`, `artifacts` در D1 ایجاد شده باشند.

6. **انتشار Worker**
   نسخه فعلی `platform-api` را deploy کنید:

   ```bash
   npm run deploy
   ```

   معیار موفقیت:
   - خروجی `wrangler deploy` بدون خطا تمام شود.
   - URL نهایی Worker در خروجی دیده شود.

7. **ثبت URL محیط remote**
   مقدار URL خروجی deploy را در یک متغیر محلی یا لاگ کاری ثبت کنید:

   ```bash
   export PLATFORM_API_URL="https://<your-worker>.workers.dev"
   ```

   اگر کاربر از shell session جدید استفاده کند باید مقدار بالا را دوباره تنظیم کند.

8. **Smoke Test مسیر سلامت**
   ابتدا availability عمومی سرویس بررسی شود:

   ```bash
   curl "$PLATFORM_API_URL/api/health"
   ```

   انتظار:
   - HTTP `200`
   - `success: true`
   - `service: "platform-api"`

9. **Smoke Test endpointهای read-only**
   این endpointها بدون seed هم باید پاسخ معتبر بدهند:

   ```bash
   curl "$PLATFORM_API_URL/api/tenants"
   curl "$PLATFORM_API_URL/api/apps"
   curl "$PLATFORM_API_URL/api/deployments"
   curl "$PLATFORM_API_URL/api/workflow-runs"
   ```

   انتظار:
   - HTTP `200`
   - بدنه JSON معتبر
   - اگر داده‌ای وجود نداشته باشد، `data` می‌تواند آرایه خالی باشد

10. **Smoke Test endpoint ماژولار Builder**
    برای اطمینان از wiring صحیح ماژول `builder`:

   ```bash
   curl -X POST "$PLATFORM_API_URL/api/builder/validate" \
     -H "content-type: application/json" \
     -d '{"graph":{}}'
   ```

   انتظار:
   - HTTP `200`
   - پاسخ JSON معتبر با فیلد `success`
   - نتیجه validation بدون crash شدن Worker

11. **مواردی که فعلاً در smoke test اولیه نباید اجباری شوند**
    این endpointها برای تست واقعی نیازمند داده پایه یا integration آماده هستند:

   - `POST /api/deployments/callback`
   - `POST /api/workflow-runs`
   - `POST /api/artifacts`
   - endpointهای integration وابسته به داده واقعی provider

   دلیل:
   - برخی از آن‌ها به رکوردهای موجود در `apps`, `deployments`, `tenants` وابسته‌اند.
   - بدون seed اولیه، احتمال خطاهای `foreign key` طبیعی است.

12. **معیار نهایی completion برای Remote Verification**
   این بخش فقط زمانی complete محسوب شود که همه موارد زیر برقرار باشند:

   - login موفق انجام شده باشد
   - D1 remote ساخته و به `wrangler.toml` متصل شده باشد
   - `schema.sql` بدون خطا روی remote اجرا شده باشد
   - Worker با موفقیت deploy شده باشد
   - حداقل `health`, `tenants`, `apps`, `builder/validate` روی remote پاسخ معتبر داده باشند
   - URL deploy شده و زمان آخرین verification در لاگ روزانه ثبت شده باشد

---

## ترتیب اجرای پیشنهادی

1. اول `health` و `tenants` از `index.ts` جدا شوند.
2. بعد `apps` و `deployments` ساخته شوند چون مستقیم به `projects` و `deployments` در portal وصل می‌شوند.
3. سپس `builder` و `workflow-runs` فقط در حد contract و skeleton اضافه شوند.
4. در پایان `integrations` و `artifacts` به‌عنوان نقاط extension استاندارد شوند.

---

## چیزهایی که فعلاً نباید در این فاز ساخته شوند

- runtime واقعی `Agents SDK`
- sandbox execution واقعی
- publish flow واقعی با `Workers for Platforms`
- self-hosted runtime برای `Track C`
- stateful chat/session logic داخل `Platform API`

این‌ها مهم هستند، اما در این فاز فقط باید `Platform API` طوری طراحی شود که بعداً بدون جراحی سنگین آن‌ها را بپذیرد.
