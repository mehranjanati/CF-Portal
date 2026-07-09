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
