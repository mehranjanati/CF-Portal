# Daily Task 05: AI Builder Foundation and V0 Integration Strategy

**هدف این فاز:** عبور از `Operational MVP` به یک `AI-assisted Builder MVP` که در آن `portal` فقط authoring surface و UX تعاملی را نگه دارد، و `platform-api` مالک generation orchestration, provider abstraction, persistence, publish intent و integrationهای بیرونی باشد.

---

## چرا این فاز الان مهم است؟

با وضعیت فعلی:

- ساخت `workspace` واقعی کار می‌کند
- ساخت `project` واقعی کار می‌کند
- `portal` و `platform-api` روی Cloudflare deploy شده‌اند
- state پایه workspace از `platform-api + D1` خوانده می‌شود

بنابراین گلوگاه بعدی دیگر `CRUD MVP` نیست.

گلوگاه اصلی بعدی این است:

**چطور لایه AI code generation را وارد محصول کنیم بدون اینکه فرانت به provider lock-in, key leakage, runtime ambiguity, و debt معماری دچار شود؟**

---

## جمع‌بندی نهایی بازبینی

### 1. وضعیت Daily Task 04

`Daily Task 04` عملاً از نظر control-plane پایه موفق بوده است، چون:

- flow اصلی `Workspace -> Project` واقعی شده
- bootstrap workspace واقعی شده
- Pages/Workers deploy شده‌اند
- placeholder اصلی از flow عملیاتی حذف شده

اما هنوز چند کار residual باقی مانده که باید یا در انتهای Task 04 ثبت شوند یا به‌عنوان workstream فرعی در Task 05 بیایند:

- smoke test کامل remote برای `workspace -> project -> integrations -> deployment -> refresh`
- production-like state برای بعضی صفحه‌ها مثل `Projects`
- حذف navهای mock که فعلاً route واقعی ندارند

### 2. جمع‌بندی بازبینی فرانت

بر اساس [NEW_PORTAL_BOOTSTRAP_PLAN.md](file:///Users/elbaan/Documents/cloudflare/docs/FrontEnd/NEW_PORTAL_BOOTSTRAP_PLAN.md)، [FEATURE_PATTERNS.md](file:///Users/elbaan/Documents/cloudflare/docs/FrontEnd/FEATURE_PATTERNS.md) و [PORTAL1_REUSE_DECISION.md](file:///Users/elbaan/Documents/cloudflare/docs/FrontEnd/PORTAL1_REUSE_DECISION.md):

- `portal1` فقط donor برای UI/UX است، نه baseline معماری
- featureهای `builder`, `deployments`, `workflows` باید در `portal` به‌صورت feature-folder و domain-based ساخته شوند
- authoring باید داخل `Portal SPA` بماند
- execution / compile / publish نباید در browser انجام شود
- data contracts و provider contracts باید از صفر و Cloudflare-first تعریف شوند

### 3. جمع‌بندی بازبینی AI / Builder

بر اساس [CLOUDFLARE_FIRST_ECOSYSTEM.md](file:///Users/elbaan/Documents/cloudflare/docs/Architecture/CLOUDFLARE_FIRST_ECOSYSTEM.md)، [VISUAL_GRAPH_BUILDER_ARCHITECTURE.md](file:///Users/elbaan/Documents/cloudflare/docs/Architecture/VISUAL_GRAPH_BUILDER_ARCHITECTURE.md) و [ARCHITECTURE_V5_GITHUB_ACTIONS_USER_CF.md](file:///Users/elbaan/Documents/cloudflare/docs/Architecture/ARCHITECTURE_V5_GITHUB_ACTIONS_USER_CF.md):

- `builder` باید در `Portal SPA` به‌عنوان authoring surface ساخته شود
- compile/publish باید در backend انجام شود
- runtime نهایی باید Cloudflare-native باشد
- `VibeSDK` reference خوب برای productization است، نه dependency معماری اصلی
- برای v1 باید execution model روی `GitHub Actions + User Cloudflare Account` بماند، نه sandbox-heavy

---

## تصمیم معماری درباره V0 SDK

### سوال اصلی

آیا باید `v0 SDK client` را مستقیماً در فرانت استفاده کنیم و یک نسخه server-side جدا هم در `platform-api` داشته باشیم؟

### پاسخ کوتاه

**برای flow اصلی محصول: نه، فرانت نباید مستقیماً مالک provider SDK باشد.**

### تصمیم پیشنهادی

#### Rule 1

`portal` باید **Builder UX / prompt UX / streaming UI / file diff preview / generation session view** را نگه دارد.

#### Rule 2

`platform-api` باید **تنها entrypoint رسمی generation** باشد.

#### Rule 3

اگر قرار است `v0` استفاده شود:

- در `platform-api` به‌صورت `provider adapter` استفاده شود
- در `portal` فقط contractهای خودمان consume شوند، نه API خام provider

#### Rule 4

اگر استفاده از `v0 client SDK` در فرانت واقعاً لازم شد، فقط برای لایه‌های کم‌ریسک و موقتی باشد:

- stream rendering
- optimistic UX
- prompt iteration preview

و حتی در این حالت هم:

- session باید از `platform-api` صادر شود
- secret/key نباید در browser بماند
- source of truth باید همچنان `platform-api` باشد

### نتیجه معماری

مدل درست این است:

```text
Portal SPA
  -> Builder prompt / template / stream / diff UX
  -> talks only to Platform API

Platform API
  -> builder orchestration
  -> provider adapters (v0 / future models)
  -> persistence in D1/R2
  -> publish intent creation
  -> GitHub / Cloudflare orchestration
```

---

## چرا direct client-side V0 برای flow اصلی اشتباه است؟

### 1. امنیت

- key management سخت می‌شود
- provider session control ضعیف می‌شود
- abuse/rate limiting سخت‌تر می‌شود

### 2. auditability

- prompt history
- artifact lineage
- generation metadata
- failure reasons

همه این‌ها باید server-owned باشند.

### 3. provider lock-in

اگر فرانت مستقیماً به `v0 SDK` بچسبد:

- تعویض provider سخت می‌شود
- migration به providerهای دیگر یا hybrid strategy سخت می‌شود
- contract محصولی ما به contract provider آلوده می‌شود

### 4. publish semantics

builder واقعی فقط text generation نیست.

builder باید بعداً این چیزها را هم بداند:

- template selection
- file plan
- artifact generation
- validation
- GitHub export
- deployment intent
- deployment run tracking

این‌ها browser-owned نیستند.

---

## مدل پیشنهادی لایه‌ها

## Layer 1: Portal

مسئول:

- prompt input
- template selection
- generation chat/session UI
- file tree preview
- diff preview
- generate / regenerate / apply / publish CTA
- نمایش stateهای `queued / generating / ready / failed`

نباید مسئول باشد:

- provider SDK ownership
- secret management
- compile logic
- publish logic
- GitHub write path

## Layer 2: Platform API

مسئول:

- `builder session`
- `prompt persistence`
- `provider abstraction`
- `generation job orchestration`
- validation/compile entrypoint
- artifact snapshot metadata
- publish request creation
- workflow/deployment record creation

پیشنهاد naming:

```text
platform-api/src/modules/builder/
  routes.ts
  service.ts
  providers/
    v0.ts
    index.ts
  prompts.ts
  artifacts.ts
  sessions.ts
```

## Layer 3: GitHub / Deploy Path

برای v1:

- generation خروجی را به file-plan تبدیل می‌کند
- file-plan در artifact/snapshot ثبت می‌شود
- بعداً با integration واقعی به repo کاربر push می‌شود
- build/deploy از مسیر `GitHub Actions + Wrangler` انجام می‌شود

---

## Daily Task 05 باید چه چیزی را عمداً انجام ندهد؟

- visual graph builder کامل
- sandbox runtime
- in-browser code execution
- managed build farm
- full agent runtime
- collaborative editing
- multi-provider routing پیچیده

این‌ها مهم‌اند ولی برای فاز بعد زود هستند.

---

## خروجی قابل مشاهده این فاز

در پایان این فاز، کاربر باید بتواند:

1. داخل `Builder` یک template یا intent را انتخاب کند.
2. یک prompt واقعی وارد کند.
3. generation را شروع کند.
4. خروجی را به‌صورت structured preview ببیند:
   - summary
   - file plan
   - suggested routes/components
   - next actions
5. نتیجه generation به project فعال وصل شود.
6. history generation برای همان project دوباره از API خوانده شود.
7. publish هنوز می‌تواند mock یا draft-intent باشد، ولی contract آن واقعی باشد.

---

## Definition of Done

این فاز وقتی complete محسوب می‌شود که:

1. route واقعی `/builder` در `portal` بالا آمده باشد.
2. `portal` دارای feature-folder واقعی برای builder باشد، نه route-file ضخیم.
3. `platform-api` دارای builder orchestration واقعی باشد، نه فقط validate/compile skeleton.
4. contract session-based برای generation تعریف شده باشد.
5. provider adapter برای `v0` یا provider اولیه داخل `platform-api` اضافه شده باشد.
6. prompt history و generation result در D1 یا artifact metadata ثبت شوند.
7. Builder UI بتواند stateهای `idle/loading/success/error` را production-like نشان دهد.
8. smoke test واقعی برای `prompt -> generation -> refresh -> history` ثبت شود.

---

## ساختار هدف

```text
portal/
  src/
    lib/
      features/
        builder/
          BuilderPage.svelte
          BuilderPromptPanel.svelte
          BuilderResultPanel.svelte
          BuilderFilePlan.svelte
          BuilderSessionList.svelte
      stores/
        builder.svelte.ts
      types/
        builder.ts
      api.ts
    routes/
      (app)/
        builder/
          +page.svelte

platform-api/
  src/
    modules/
      builder/
        routes.ts
        service.ts
        providers/
          v0.ts
          index.ts
```

---

## قراردادهای پیشنهادی

### Builder Session Create

```json
{
  "tenantId": "tenant_x",
  "appId": "app_x",
  "template": "landing-page",
  "intent": "Build a modern ecommerce landing page"
}
```

### Builder Generate Request

```json
{
  "sessionId": "bs_x",
  "prompt": "Use a dark theme and add pricing and testimonials"
}
```

### Builder Generate Response

```json
{
  "session": {
    "id": "bs_x",
    "status": "completed"
  },
  "result": {
    "summary": "Generated a landing page with pricing and testimonials",
    "files": [
      {
        "path": "src/routes/+page.svelte",
        "action": "create"
      }
    ],
    "nextActions": [
      "review-files",
      "apply-to-repo",
      "create-preview-deployment"
    ]
  }
}
```

---

## لیست وظایف دقیق

### 1. Product / UX
- [x] route واقعی `/builder` فعال شود.
- [x] nav فعلی فقط featureهای واقعی را نشان دهد یا featureهای mock با gating واضح جدا شوند.
- [x] builder page بر اساس الگوی `2-pane` از [FEATURE_PATTERNS.md](file:///Users/elbaan/Documents/cloudflare/docs/FrontEnd/FEATURE_PATTERNS.md) ساخته شود.
- [x] UX واحد برای generation state, retry, failure, empty state تعریف شود.

### 2. Frontend Architecture
- [x] فولدر `portal/src/lib/features/builder` ساخته شود.
- [x] store جدید `builder.svelte.ts` برای session state, prompt state, result state ساخته شود.
- [x] typeهای `BuilderSession`, `BuilderResult`, `BuilderFilePlan`, `BuilderTemplate` جدا شوند.
- [x] route file فقط thin wrapper باشد.

### 3. Backend Architecture
- [x] module `builder` از skeleton فعلی به orchestration واقعی ارتقا یابد.
- [x] routeهای جدید اضافه شوند:
- [x] `POST /api/builder/sessions`
- [x] `GET /api/builder/sessions/:sessionId`
- [x] `POST /api/builder/sessions/:sessionId/generate`
- [x] `GET /api/builder/apps/:appId/history`
- [x] persistence حداقلی برای session/result در D1 تعریف شود.

### 4. Provider Strategy
- [x] adapter استاندارد provider تعریف شود:
- [x] `generate()`
- [x] `normalizeResult()`
- [x] `mapError()`
- [x] پیاده‌سازی `v0` در backend به‌عنوان provider اول اضافه شود.
- [x] فرانت فقط با contract داخلی ما حرف بزند، نه SDK خام provider.

### 5. Project Coupling
- [x] هر generation session به `tenantId` و `appId` متصل باشد.
- [x] صفحه `Project Detail` لینک مستقیم به `Open Builder` داشته باشد.
- [x] project summary بتواند latest generation status را نشان دهد.

### 6. Artifact / Persistence
- [x] metadata session/result در D1 ذخیره شود.
- [ ] اگر لازم شد snapshotهای بزرگ‌تر در R2 ذخیره شوند.
- [x] generation history بعد از refresh قابل مشاهده باشد.

### 7. Publish Path Readiness
- [x] فعلاً publish واقعی لازم نیست.
- [x] ولی `publish intent` و `apply intent` contract باید تعریف شوند.
- [x] خروجی builder باید برای مسیر GitHub Actions آینده قابل نگاشت باشد.

### 8. Verification
- [ ] smoke test remote برای سناریوی زیر ثبت شود:
- [ ] 1. ساخت workspace
- [ ] 2. ساخت project
- [ ] 3. شروع builder session
- [ ] 4. ارسال prompt
- [ ] 5. مشاهده result
- [ ] 6. refresh
- [ ] 7. مشاهده history

---

## تصمیم اجرایی نهایی

### توصیه نهایی

برای فاز بعد:

- `v0` را در **backend** به‌عنوان provider adapter بگذار
- `portal` را فقط authoring/preview UX نگه دار
- از `VibeSDK` و `portal1` برای UX و product semantics الهام بگیر
- اما contract, orchestration و persistence را داخل `platform-api` بساز

### فرمول اجرایی

```text
Portal SPA = authoring surface
Platform API = AI orchestration surface
GitHub Actions = build/deploy surface
Cloudflare = runtime surface
```

این دقیقاً همان مدلی است که:

- با Cloudflare-first هم‌راستاست
- با Pure SPA بودن فرانت سازگار است
- با planهای قبلی repo تضاد ندارد
- و مسیر رشد به visual builder و publish plane را بدون debt شدید باز نگه می‌دارد

