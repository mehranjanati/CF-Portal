# New Portal Bootstrap Plan

## هدف

این سند plan اجرایی برای ساخت portal جدید استک `Cloudflare-first` است؛ با این فرض که:

- `portal1` فقط منبع reuse انتخابی است
- baseline جدید باید مستقل از backend و deployment model قدیمی باشد
- runtime نهایی روی `Cloudflare` می‌نشیند
- ما سرور اجرایی جداگانه از خودمان برای app runtime نداریم

## نتیجه مورد انتظار

در پایان bootstrap، باید یک portal جدید داشته باشیم که:

- روی `SvelteKit + Cloudflare adapter` build شود
- با `GitHub Actions` تست و deploy شود
- به `Cloudflare Pages` یا `Cloudflare Workers` متصل باشد
- از `portal1` فقط UI و layout مفید را reuse کرده باشد
- هیچ contract قدیمی `supernode` را با خود حمل نکند

## اصل تصمیم

### Rule 1

`portal1` donor app است، نه foundation app.

### Rule 2

UI می‌تواند migrate شود، ولی service layer باید از صفر طراحی شود.

### Rule 3

deployment, routing, env model و data contracts باید کاملاً Cloudflare-oriented باشند.

## ساختار پیشنهادی portal جدید

### گزینه پیشنهادی

اگر portal به‌عنوان پروژه مستقل شروع شود، این ساختار مناسب است:

```text
portal-cloudflare/
  src/
    lib/
      components/
        ui/
        layout/
        features/
          builder/
          dashboard/
          deployments/
          workflows/
          projects/
      services/
      stores/
      types/
      utils/
    routes/
      (app)/
      settings/
      deployments/
      projects/
  static/
  tests/
  wrangler.toml
  package.json
  svelte.config.js
```

## Target Folder Plan برای repo فعلی

### هدف این بخش

این بخش، plan را از سطح معماری کلی به سطح **فایل و فولدر قابل پیاده‌سازی در همین repo** می‌آورد.
قاعده کار این است که تا قبل از تبدیل repo به monorepo کامل:

- `portal/` نقش `control-plane frontend` را نگه می‌دارد
- `platform-api/` نقش `control-plane API` را نگه می‌دارد
- featureهای جدید به‌صورت domain-based داخل همین دو پروژه اضافه می‌شوند
- هر چیزی که به `Agents`, `Dispatch`, `Templates` و `Publish Plane` مربوط است از ابتدا طوری سازمان‌دهی می‌شود که بعداً به monorepo target بدون جراحی سنگین منتقل شود

### Stage 1: ساختار هدف در همین repo

#### `portal/`

```text
portal/
  src/
    lib/
      api/
        http.ts
        portal-client.ts
      components/
        layout/
          AppShell.svelte
          Sidebar.svelte
          Topbar.svelte
        ui/
          Button.svelte
          Card.svelte
          Input.svelte
          Select.svelte
      features/
        common/
          SurfaceStatusIndicator.svelte
        projects/
          ProjectsPage.svelte
          ProjectList.svelte
          ProjectCard.svelte
        deployments/
          DeploymentList.svelte
          DeploymentStatusBadge.svelte
        builder/
          BuilderPage.svelte
          BuilderPromptForm.svelte
          BuilderRunPanel.svelte
        workflows/
          WorkflowRunsPage.svelte
        settings/
          SettingsPage.svelte
          GitHubIntegrationCard.svelte
          CloudflareIntegrationCard.svelte
      stores/
        ui.ts
        projects.ts
        deployments.ts
        builder.ts
      types/
        apps.ts
        deployments.ts
        integrations.ts
        workflow-runs.ts
      utils/
        navigation.ts
        format.ts
      index.ts
      utils.ts
    routes/
      +layout.svelte
      +layout.ts
      +page.svelte
      (app)/
        projects/
          +page.svelte
        deployments/
          +page.svelte
        builder/
          +page.svelte
        workflows/
          +page.svelte
        settings/
          +page.svelte
```

#### `platform-api/`

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

### مسئولیت هر لایه

#### `portal/src/lib/api`

- فقط wrapper برای تماس با `platform-api`
- بدون business logic
- بدون host assumption قدیمی
- تنها محل استاندارد برای `fetch`, headers, auth token forwarding و error translation

#### `portal/src/lib/features`

- هر feature فقط UI, local state و view composition را نگه می‌دارد
- تماس با API فقط از طریق `lib/api` یا `stores` انجام می‌شود
- naming باید domain-based باشد: `apps`, `deployments`, `workflow-runs`, `integrations`

#### `portal/src/lib/stores`

- storeها باید domain-specific باشند، نه page-specific
- store مربوط به `projects` معادل app registry است
- store مربوط به `builder` باید draft state, prompt state و generate/publish action state را نگه دارد

#### `portal/src/lib/types`

- typeها باید به فایل‌های domain split شوند
- از یک `types/index.ts` monolithic پرهیز شود مگر فقط برای re-export
- هیچ type قدیمی با نام‌های `supernode`, `agent task`, `legacy deployment` وارد نشود

#### `portal/src/lib/utils`

- utilityهای عمومی مثل navigation label mapping, formatting, class merge
- state یا mock domain logic نباید اینجا بماند
- `utils.ts` فعلی فقط موقت است و باید سبک شود

#### `platform-api/src/modules`

- هر module یک surface دامنه‌ای مستقل است
- هر module حداقل دو لایه دارد: `routes.ts` و `queries.ts` یا `service.ts`
- `index.ts` فقط composition root باشد، نه محل انباشتن همه endpointها

#### `platform-api/src/lib`

- primitiveهای مشترک API
- اتصال `D1`
- response helpers
- error mapping

### mapping دقیق feature به فولدر در repo فعلی

| feature | محل فعلی | مقصد در `portal/` | مقصد در `platform-api/` | وضعیت اجرایی |
| :--- | :--- | :--- | :--- | :--- |
| portal shell | `src/lib/components/layout/*` | همان مسیر فعلی | ندارد | `keep + rewrite` |
| projects dashboard | `src/routes/(app)/projects/+page.svelte` | `lib/features/projects/*` + route thin page | `modules/apps/*` و `modules/tenants/*` | `expand` |
| deployments | فقط nav mock | `lib/features/deployments/*` | `modules/deployments/*` | `new` |
| builder | فقط nav mock | `lib/features/builder/*` | `modules/builder/*` | `new` |
| workflows | فقط nav mock | `lib/features/workflows/*` | `modules/workflow-runs/*` | `new` |
| settings/integrations | فقط nav mock | `lib/features/settings/*` | `modules/integrations/*` | `new` |
| app/api client | وجود ندارد | `lib/api/http.ts`, `portal-client.ts` | ندارد | `new` |
| types split | `src/lib/utils.ts` و پراکنده | `lib/types/*` | `src/types/*` | `new` |
| tenant registry | `/api/tenants` در `index.ts` | از طریق `projects` و `settings` consume می‌شود | `modules/tenants/*` | `split` |
| publish control | وجود ندارد | action UI در `builder` و `deployments` | بعداً `modules/deployments/*` و `modules/artifacts/*` | `defer-ready` |

### چیزهایی که باید همین حالا از ساختار فعلی حذف شوند

- hash-based navigation assumptions
- نگه‌داری page title و active route داخل `utils.ts` به‌صورت mock
- چسباندن مستقیم feature logic به route file
- متمرکز کردن endpointها داخل `platform-api/src/index.ts`

### چیزهایی که فعلاً نباید ساخته شوند

- `apps/agents`
- `apps/dispatch`
- `packages/templates`
- `packages/shared`
- sandbox runtime واقعی
- Workers for Platforms publish flow واقعی

این‌ها target مهم هستند، اما در این stage فقط باید **نقاط extension** آن‌ها را در naming و folder boundaries رعایت کنیم.

### Stage 2: مسیر migration به monorepo target

وقتی repo آماده شد، mapping این‌گونه خواهد بود:

```text
portal/              -> apps/portal
platform-api/        -> apps/platform-api
portal/src/lib/types -> packages/shared/types
portal/src/lib/api   -> packages/shared/http (در صورت نیاز)
builder templates    -> packages/templates
publish routing      -> apps/dispatch
agent runtime        -> apps/agents
```

### ترتیب دقیق پیاده‌سازی بعدی

#### Step 1: تمیز کردن shell موجود

- `Sidebar` از hash route به pathname route منتقل شود
- `Topbar` title را از route واقعی بگیرد
- `utils.ts` از mock state خالی شود

#### Step 2: ایجاد ستون featureها در `portal`

- ساخت فولدرهای `lib/features/projects`
- ساخت فولدرهای `lib/features/deployments`
- ساخت فولدرهای `lib/features/builder`
- ساخت فولدرهای `lib/features/workflows`
- ساخت فولدرهای `lib/features/settings`

#### Step 3: شکستن `platform-api/src/index.ts`

- استخراج `health`
- استخراج `tenants`
- ساخت moduleهای خالی `apps`, `deployments`, `workflow-runs`, `integrations`, `builder`

#### Step 4: تعریف contractهای domain

- `AppSummary`
- `AppDetail`
- `DeploymentSummary`
- `WorkflowRunSummary`
- `IntegrationStatus`
- `BuilderDraft`

#### Step 5: اتصال feature اول

اولین feature واقعی باید `projects` باشد، چون:

- هم‌اکنون route آن وجود دارد
- به schema پایه `tenants/apps` وصل می‌شود
- foundation مناسبی برای `builder` و `deployments` ایجاد می‌کند

### Definition of Done برای این Target Folder Plan

این plan درست اجرا شده وقتی که:

- هر feature جدید قبل از ساخت، destination folder مشخص داشته باشد
- هیچ feature تازه‌ای مستقیماً داخل route file انباشته نشود
- `platform-api/src/index.ts` فقط composition root بماند
- naming پروژه از `agent-mvp` به `app/deployment/workflow` منتقل شده باشد
- مسیر migration به `apps/portal`, `apps/platform-api`, `apps/agents`, `apps/dispatch` بدون rename گسترده ممکن باشد

## استک پیشنهادی

- `SvelteKit`
- `@sveltejs/adapter-cloudflare`
- `TypeScript`
- `Vitest`
- `Playwright`
- `GitHub Actions`
- optional bindings به `D1`, `R2`, `KV` فقط وقتی واقعاً لازم شدند

## فازهای bootstrap

### Phase 0: Foundation

خروجی این فاز:

- ساخت پروژه جدید SvelteKit
- تنظیم `adapter-cloudflare`
- تنظیم `wrangler`
- تعریف env model جدید
- تعریف route skeleton

### Phase 1: UI Shell Migration

در این فاز از `portal1` این بخش‌ها منتقل می‌شوند:

- `layout/AppShell`
- `layout/Sidebar`
- `layout/Topbar`
- `components/ui` primitives

اما هم‌زمان باید این کارها انجام شود:

- حذف hash routing assumptions
- حذف coupling به route labels قدیمی
- حذف dependency مستقیم به `GlobalChat`
- بازتعریف navigation مطابق scope جدید Cloudflare portal

### Phase 2: Feature Screen Migration

featureها به‌ترتیب زیر migrate شوند:

1. `dashboard`
2. `projects`
3. `builder`
4. `deployments`
5. `workflows`

قاعده migration:

- اول فقط layout و structure
- بعد fake/mock state
- بعد اتصال به service layer جدید

### Phase 3: Cloudflare-native Data Layer

در این فاز:

- `services/` از صفر نوشته می‌شود
- endpoint contractها برای `Workers` تعریف می‌شوند
- naming جدید مطابق docs/cloudflare تثبیت می‌شود
- status modelها از execution model جدید پیروی می‌کنند

نمونه surfaceهای محتمل:

- `/api/apps`
- `/api/deployments`
- `/api/workflow-runs`
- `/api/integrations/github`
- `/api/integrations/cloudflare`

### Phase 4: GitHub-First Deployment Path

در این فاز:

- CI برای check/build/test فعال می‌شود
- deployment path به Cloudflare تنظیم می‌شود
- branch preview strategy مشخص می‌شود
- environment mapping برای `dev/staging/prod` تعریف می‌شود

## چیزهایی که باید از روز اول حذف شوند

- `GitHub Pages` assumptions
- base path وابسته به نام repo
- `VITE_API_BASE_URL` با hostهای localhost قدیمی
- service contractهای `supernode`
- فرضیات `Vercel`
- هرگونه dependency محصولی به `Go/BFF/Temporal`

## چیزهایی که از `portal1` باید نگه داریم

- visual language
- layout composition
- card/button/input patterns
- page section patterns
- بعضی dashboard widgets
- بعضی deployment/workflow views به‌عنوان UX reference

## چیزهایی که باید از صفر نوشته شوند

- service layer
- auth/session integration
- GitHub integration flows
- Cloudflare integration flows
- deployment state model
- workflow status mapping
- error model

## تعریف routeهای پیشنهادی

```text
/
/projects
/builder
/deployments
/workflows
/settings
/integrations/github
/integrations/cloudflare
```

## تعریف اولیه feature ownership

### Layout Layer

- navigation
- shell
- top actions
- global search

### Feature Layer

- `builder`
  - prompt, draft, generate, publish actions
- `deployments`
  - deployment list, status, detail
- `workflows`
  - CI-backed progress and failure summaries
- `projects`
  - app list, template selection, metadata

### Data Layer

- read models from Workers APIs
- mutations for builder/deploy/integration actions

## ترتیب انتقال از `docs/cloudflare/ui`

1. `ui/layout/*`
2. `ui/primitives/*`
3. `ui/features/dashboard/*`
4. `ui/features/projects/*`
5. `ui/features/builder/*`
6. `ui/features/deployments/*`
7. `ui/features/workflows/*`

## Definition of Done

bootstrap زمانی done است که:

- portal جدید بدون dependency به `portal1` اجرا شود
- layout و primitives از donor app وارد شده باشند
- حداقل `projects`, `builder`, `deployments` routeها بالا آمده باشند
- service layer جدید به استک Cloudflare اشاره کند، نه stack قدیمی
- مسیر build/deploy با docs این فولدر هم‌راستا باشد

## ریسک‌های اصلی

- انتقال ناآگاهانه contractهای legacy
- reuse بیش از حد featureها بدون decouple کردن data layer
- آمیختگی تصمیم V5 با assumptions قدیمی portal1
- بزرگ شدن scope قبل از تثبیت portal shell

## کنترل ریسک

- migration را feature-by-feature انجام بده
- اول UI را جدا کن، بعد data را وصل کن
- هر reusable file را قبل از ورود به repo جدید rename یا refactor کن اگر naming آن legacy است
- `docs/cloudflare/ui` را فقط reference snapshot ببین، نه source of truth
