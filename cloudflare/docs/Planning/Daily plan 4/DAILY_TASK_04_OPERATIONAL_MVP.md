# Daily Task 04: Operational MVP Hardening

**هدف این فاز:** تبدیل وضعیت فعلی `portal + platform-api` از یک دمو UI و چند endpoint مجزا به یک MVP واقعی، قابل استفاده و قابل نمایش که در آن کاربر بتواند با داده واقعی `tenant`, `project(app)`, `integration`, و `deployment` کار کند و نتیجه را در UI ببیند.

---

## چرا این پلن باید بازتعریف شود؟

پلن قبلی `Project Creation & GitHub Injection` برای مرحله فعلی بیش از حد جلوتر از وضعیت واقعی محصول بود.  
در حال حاضر چند بخش مهم هنوز در وضعیت دمو یا نیمه‌متصل هستند:

- UI هنوز بیشتر نمایشی است تا operational
- بعضی فرم‌ها بر پایه `default-tenant` و داده فرضی کار می‌کنند
- flow اصلی محصول از دید کاربر هنوز کامل نیست
- هنوز صفحه‌ای نداریم که state واقعی workspace را به شکل منسجم نمایش دهد
- قبل از GitHub repo automation باید یک `control plane UX` واقعی و پایدار داشته باشیم

بنابراین `Daily Task 04` باید قبل از اتوماسیون GitHub، روی این سؤال تمرکز کند:

**آیا کاربر الان می‌تواند با Nexus یک workspace واقعی بسازد، project ثبت کند، integrationها را ببیند، deployment record ایجاد کند و همه این‌ها را در UI متصل و واقعی ببیند؟**

اگر پاسخ منفی باشد، هنوز به MVP عملیاتی نرسیده‌ایم.

---

## خروجی قابل مشاهده این فاز

در پایان این فاز، یک کاربر باید بتواند در پورتال deployed شده:

1. یک `tenant/workspace` واقعی ایجاد کند.
2. یک `project` واقعی ایجاد کند.
3. connectionهای GitHub و Cloudflare را برای همان tenant ثبت و مشاهده کند.
4. حداقل یک `deployment record` برای project ثبت کند.
5. در یک dashboard یا project detail page، state واقعی workspace را بدون داده نمایشی مشاهده کند.
6. پس از refresh صفحه، همان داده‌ها دوباره از `platform-api + D1` خوانده شوند.

---

## Definition of Done

این فاز وقتی complete محسوب می‌شود که همه موارد زیر برقرار باشند:

1. در `platform-api` endpointهای create/list برای `tenants`, `apps`, `deployments` به‌صورت واقعی وجود داشته باشند.
2. در `platform-api` یک endpoint تجمیعی برای مصرف پورتال وجود داشته باشد تا state پایه workspace را یکجا برگرداند.
3. در `portal` دیگر از `default-tenant` یا placeholder data برای flow اصلی استفاده نشود.
4. صفحه `Projects` به داده واقعی API متصل باشد و امکان create project داشته باشد.
5. صفحه `Integrations` tenant-aware شود و فقط integrationهای همان workspace را نشان دهد.
6. یک صفحه یا view برای `Project Detail / Workspace Overview` وجود داشته باشد که `apps`, `deployments`, `integrations` و وضعیت پایه را کنار هم نشان دهد.
7. حداقل یک smoke test واقعی روی محیط remote انجام شود که create -> list -> refresh را تایید کند.
8. نتیجه نهایی روی Cloudflare Pages و Cloudflare Workers قابل نمایش باشد.

---

## وضعیت فعلی و شکاف‌ها

### چیزهایی که داریم

- [x] `platform-api` ماژولار شده و روی Cloudflare deploy شده است.
- [x] schema اصلی D1 برای domainهای پایه وجود دارد.
- [x] CRUD اولیه برای integrationها تا حدی پیاده شده است.
- [x] `portal` روی Pages قابل build/deploy است.
- [x] صفحه `Integrations` از نظر بصری بهتر شده است.

### چیزهایی که هنوز MVP را ناقص می‌کند

- [ ] `tenant` واقعی در UI انتخاب/ایجاد نمی‌شود.
- [ ] `Projects` هنوز flow create واقعی و متصل به API ندارد.
- [ ] `Deployments` در UI هنوز به‌شکل عملیاتی دیده نمی‌شود.
- [ ] داده‌ها هنوز در چند صفحه پراکنده‌اند و state کلی workspace دیده نمی‌شود.
- [ ] endpoint تجمیعی برای bootstrap پورتال نداریم.
- [ ] smoke test واقعی create/read/refresh برای user flow اصلی هنوز ثبت نشده است.

---

## مرز مسئولیت این فاز

### این فاز باید انجام دهد

- ساخت flow واقعی `Workspace -> Project -> Integrations -> Deployment Record`
- حذف dependency به mock/placeholder data در UI اصلی
- ساخت state management حداقلی ولی واقعی برای workspace فعال
- ساخت view عملیاتی و قابل‌نمایش برای demo واقعی محصول
- **استفاده از Cloudflare Flagship (Feature Flags) برای توسعه امن و کنترل‌شده صفحات جدید (Workspace Overview و Project Detail)**

### این فاز فعلاً نباید انجام دهد

- OAuth کامل GitHub
- ساخت repo واقعی در GitHub
- commit کردن template code در مخزن کاربر
- اجرای واقعی GitHub Actions
- realtime status با SSE/WebSocket
- AI agent generation flow

این‌ها مهم هستند، اما برای رسیدن سریع به MVP عملیاتی، باید بعد از پایدار شدن flow اصلی control plane ساخته شوند.

---

## ساختار هدف در این فاز

```text
portal/
  src/
    lib/
      api.ts
      stores/
        workspace.ts
        toast.ts
    routes/
      (app)/
        projects/
          +page.svelte
        projects/[projectId]/
          +page.svelte
        settings/
          integrations/
            +page.svelte
        workspace/
          +page.svelte

platform-api/
  src/
    modules/
      tenants/
        routes.ts
        queries.ts
      apps/
        routes.ts
        queries.ts
      deployments/
        routes.ts
        queries.ts
      portal/
        routes.ts
        service.ts
```

---

## لیست وظایف دقیق

### 1. Backend: واقعی کردن domain flow

- [x] افزودن `POST /api/tenants` برای ساخت workspace جدید.
- [x] افزودن `POST /api/apps` برای ساخت project جدید با اتصال به `tenant_id`.
- [x] افزودن `POST /api/deployments` برای ثبت deployment record اولیه.
- [x] افزودن validation حداقلی برای payloadهای create.
- [x] بازگرداندن responseهای استاندارد با `success/data/meta/error`.
- [x] جلوگیری از insertهای ناقص با پیام خطای قابل‌فهم برای UI.

### 2. Backend: endpoint تجمیعی برای پورتال

- [x] ساخت ماژول جدید `modules/portal`.
- [x] تعریف endpoint مثل `GET /api/portal/workspace/:tenantId/bootstrap`.
- [x] برگرداندن payload تجمیعی شامل:
- [x] `tenant`
- [x] `apps`
- [x] `github integrations`
- [x] `cloudflare accounts`
- [x] `deployments`
- [x] طراحی contract این endpoint طوری که پورتال مجبور به چند request پراکنده در اولین load نباشد.

### 3. Frontend: state واقعی workspace

- [x] ساخت store برای `activeTenantId` در `portal/src/lib/stores/workspace.ts`.
- [x] حذف hardcodeهایی مثل `default-tenant` از فرم‌ها.
- [x] اگر tenant هنوز وجود ندارد، UI باید کاربر را به ساخت workspace هدایت کند.
- [x] active workspace باید بعد از refresh در `localStorage` حفظ شود.

### 4. Frontend: صفحه Projects واقعی

- [x] اتصال صفحه `Projects` به `GET /api/apps?tenantId=...`.
- [x] افزودن فرم `Create Project` با فیلدهای حداقلی:
- [x] `name`
- [x] `description`
- [x] `tenant`
- [x] نمایش لیست projectها با status و زمان ایجاد.
- [ ] نمایش stateهای `loading`, `empty`, `error` به‌صورت production-like.

### 5. Frontend: صفحه Workspace Overview

- [x] **(Feature Flag)** تعریف فلگ `enable-workspace-overview` برای کنترل نمایش این صفحه.
- [x] افزودن صفحه جدید `/workspace` یا dashboard معادل برای دید کلی (پشت فلگ).
- [x] این صفحه باید state workspace فعال را از endpoint تجمیعی بخواند.
- [x] نمایش summary card برای:
  - [x] تعداد projectها
  - [x] تعداد deploymentها
  - [x] وضعیت GitHub connection
  - [x] وضعیت Cloudflare connection
- [x] نمایش آخرین deployment records و quick actions.

### 6. Frontend: کامل کردن صفحه Integrations

- [x] اتصال فرم GitHub به tenant فعال به‌جای tenant فرضی.
- [x] اتصال فرم Cloudflare به tenant فعال.
- [x] اگر tenant انتخاب نشده باشد، CTA واضح برای ساخت workspace نشان داده شود.
- [x] بعد از create/delete، state صفحه و overview هم‌زمان refresh شود.

### 7. Frontend: Project Detail

- [x] **(Feature Flag)** تعریف فلگ `enable-project-detail` برای کنترل دسترسی به این صفحه.
- [x] ساخت route جدید `/projects/[projectId]` (پشت فلگ).
- [x] نمایش اطلاعات پایه project.
- [x] نمایش deployment records مربوط به همان project.
- [x] افزودن action ساده `Create Deployment Record` برای شروع flow مرحله بعد.

### 8. UX / Product Hardening

- [x] یک الگوی واحد برای empty states ایجاد شود.
- [x] خطاهای API در قالب toast یا inline state یکدست شوند.
- [x] دکمه‌های اصلی مثل `Create Workspace`, `Create Project`, `Connect GitHub`, `Connect Cloudflare` در جای درست قرار گیرند.
- [x] متن‌ها از حالت مهندسی/دمو به متن‌های محصولی و قابل‌فهم‌تر تبدیل شوند.

### 9. Remote Verification

- [ ] تعیین `VITE_API_BASE_URL` واقعی برای Pages.
- [ ] deploy مجدد `portal` بعد از تکمیل flowهای واقعی.
- [ ] smoke test روی محیط remote با این سناریو:
1. ساخت tenant
2. ساخت project
3. ثبت GitHub integration
4. ثبت Cloudflare account
5. ثبت deployment record
6. refresh صفحه و مشاهده persistence داده
- [ ] ثبت نتیجه تست‌ها در پلن یا لاگ روزانه.

---

## قرارداد داده پیشنهادی

### Tenant Create

```json
{
  "id": "tenant_demo_001",
  "name": "Acme Workspace",
  "slug": "acme-workspace"
}
```

### App Create

```json
{
  "id": "app_demo_001",
  "tenantId": "tenant_demo_001",
  "name": "marketing-site",
  "description": "Main landing page",
  "status": "draft"
}
```

### Deployment Create

```json
{
  "id": "dep_demo_001",
  "appId": "app_demo_001",
  "environment": "preview",
  "url": null
}
```

### Portal Bootstrap Response

```json
{
  "tenant": {},
  "apps": [],
  "deployments": [],
  "integrations": {
    "github": [],
    "cloudflare": []
  }
}
```

---

## ترتیب اجرای پیشنهادی

1. اول `tenants/apps/deployments` را از نظر create API کامل کنید.
2. بعد endpoint تجمیعی `portal bootstrap` را بسازید.
3. سپس store `activeTenant` را در پورتال اضافه کنید.
4. بعد صفحه `Projects` را واقعی کنید.
5. سپس `Workspace Overview` را اضافه کنید.
6. بعد `Integrations` را tenant-aware کنید.
7. در پایان `Project Detail` و smoke test remote را انجام دهید.

---

## Definition of Success برای Demo واقعی

اگر در پایان این فاز بتوانیم در یک دمو زنده این سناریو را بدون دست‌کاری دیتابیس و بدون mock نشان دهیم، این فاز موفق است:

1. کاربر پورتال را باز می‌کند.
2. workspace جدید می‌سازد.
3. project جدید می‌سازد.
4. GitHub و Cloudflare connection ثبت می‌کند.
5. deployment record می‌سازد.
6. همه این داده‌ها بعد از refresh باقی می‌مانند.
7. overview صفحه وضعیت واقعی workspace را نمایش می‌دهد.

این همان نقطه‌ای است که محصول از حالت `demo UI` به `operational MVP` عبور می‌کند.
