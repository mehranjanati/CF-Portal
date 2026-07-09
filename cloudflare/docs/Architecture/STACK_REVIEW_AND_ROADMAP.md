# Cloudflare Stack Review and Roadmap

**وضعیت:** Proposed  
**هدف:** جمع‌بندی وضعیت فعلی استک `Cloudflare-first`، مشخص کردن گپ‌ها نسبت به مراجع رسمی `Cloudflare Docs`, `Agents`, `AI`, و `Cloudflare for Platforms`، و تعریف رودمپ اجرایی اسناد و توسعه

---

## 1. خلاصه اجرایی

بررسی اسناد داخلی این فولدر در کنار مراجع بیرونی Cloudflare یک نتیجه روشن می‌دهد:

1. تصمیم پایه برای `v1` درست انتخاب شده است:
   - `control plane` روی Cloudflare
   - `GitHub` به‌عنوان source of truth
   - `GitHub Actions` به‌عنوان build/deploy engine
   - runtime نهایی free tier روی `Cloudflare account` خود کاربر
2. مسیر `managed platform` هم درست شناسایی شده است:
   - `Workers for Platforms`
   - `Cloudflare for SaaS`
   - در صورت نیاز `Outbound Workers`, `custom limits`, و per-app bindings
3. مهم‌ترین gap فعلی نه در direction معماری، بلکه در **تبدیل direction به operating plan قابل اجرا** است.

به‌زبان ساده:

- ما architecture narrative خوبی داریم
- اما هنوز doc set اجرایی برای شروع ساخت production-grade کم است
- و باید دقیقاً مشخص کنیم چه چیزهایی `day-1`, `phase-1`, `paid-tier`, و `later` هستند

---

## 2. وضعیت فعلی اسناد

بر اساس اسناد فعلی این فولدر:

- `README.md`
  - جهت کلی استک جدید را مشخص می‌کند
- `CLOUDFLARE_FIRST_ECOSYSTEM.md`
  - target architecture بزرگ را تعریف می‌کند
- `ARCHITECTURE_V5_GITHUB_ACTIONS_USER_CF.md`
  - baseline عملی `free-tier` را شفاف می‌کند
- `GITOPS_WORKFLOW.md`
  - مسیر build/deploy مبتنی بر GitHub را تثبیت می‌کند
- `NEW_PORTAL_BOOTSTRAP_PLAN.md`
  - ساخت portal جدید را از منظر UI و shell توضیح می‌دهد
- `CLOUDFLARE_MULTITENANT_STRATEGY.md`
  - تفکیک `user-owned` در برابر `platform-owned` را روشن می‌کند

### جمع‌بندی وضعیت

اسناد فعلی از نظر **تصمیم‌های high-level** قوی هستند، اما در این بخش‌ها هنوز کامل نیستند:

- contractهای دقیق بین portal, platform api, agents, github, و cloudflare
- schema اولیه `D1`
- event/status model برای generation/deploy/failure/retry
- تعریف minimum lovable product برای `Builder`
- تفکیک رسمی `free-tier preview` در برابر `managed preview`
- تصمیم قطعی درباره اینکه `Agents SDK` در `v1` baseline است یا `v1.5`

---

## 3. سیگنال‌های مهم از مراجع Cloudflare

### 3.1 `cloudflare-docs`

ریپوی `cloudflare/cloudflare-docs` منبع canonical برای naming, product boundaries و best practiceها است.  
برای این پروژه، اهمیت آن بیشتر در این است که:

- namingهای داخلی باید با terminology رسمی Cloudflare هم‌راستا شوند
- routeها، deployment targetها و product naming نباید legacy یا invention داخلی باشند
- هر doc اجرایی جدید باید به صفحات رسمی Cloudflare لینک مرجع داشته باشد

### 3.2 `cloudflare/agents`

ریپوی `cloudflare/agents` و docs مربوطه نشان می‌دهند که `Agents SDK` فقط یک chat abstraction نیست، بلکه runtime رسمی برای این قابلیت‌هاست:

- stateful execution
- built-in state + local SQL
- realtime communication
- scheduling
- workflows
- MCP integration
- long-lived agent identity

نتیجه برای پروژه:

- اگر `Builder`, `Support`, `Workspace Assistant`, یا `Deploy Explainer` user-facing باشند، `Agents SDK` مسیر طبیعی آن‌هاست
- اگر بخواهیم session و state را دوباره با BFF-style abstraction بسازیم، در خلاف جهت ecosystem Cloudflare حرکت می‌کنیم

### 3.3 `cloudflare/ai`

ریپوی `cloudflare/ai` نشان می‌دهد Cloudflare الان فقط inference endpoint نمی‌دهد؛ بلکه adapterها و provider pattern برای این use caseها دارد:

- chat
- embeddings
- transcription
- text-to-speech
- reranking
- routing از طریق `AI Gateway`

نتیجه برای پروژه:

- لایه AI باید از روز اول با `AI Gateway` طراحی شود، نه با providerهای مستقیم و پراکنده
- abstraction داخلی model access باید provider-agnostic ولی gateway-first باشد
- builder loop, failure summarization, prompt refinement, و RAG باید همگی روی همین لایه سوار شوند

### 3.4 `Cloudflare for Platforms`

docs رسمی Cloudflare for Platforms به‌صراحت این را target می‌کنند:

- اجرای کد untrusted متعلق به user یا AI
- multitenant isolation
- programmable routing
- per-customer limits
- per-app bindings
- custom domains/subdomains

نتیجه برای پروژه:

- این stack بهترین مسیر برای `managed paid tier` است
- اما baseline صحیح برای `free-tier user-owned` نیست
- پس نباید اسناد free-tier و managed-tier را با هم ترکیب کنیم

### 3.5 `AI Vibe Coding Platform`

reference architecture رسمی Cloudflare برای vibe coding سه ستون را برجسته می‌کند:

1. AI integration
2. secure execution sandbox
3. scalable deployment plane

نتیجه برای پروژه:

- این مرجع برای `target product vision` بسیار مهم است
- اما برای day-1 free-tier نباید کورکورانه به sandbox-first تبدیل شود
- باید آن را به‌عنوان **north star برای paid/managed experience** ببینیم

---

## 4. گپ‌های اصلی که باید اضافه شوند

در حال حاضر مهم‌ترین چیزهایی که باید به doc set اضافه شوند این‌ها هستند:

### Gap 1: `Operating Model Matrix`

ما به یک doc صریح نیاز داریم که سه مدل را کنار هم بگذارد:

- `Free Tier`
- `Pro / Builder Tier`
- `Managed Platform Tier`

و برای هرکدام مشخص کند:

- source of truth
- preview model
- deploy target
- billing/cost ownership
- supported features
- infra ownership

### Gap 2: `D1 Schema V1`

در چند سند به `D1` اشاره شده، اما schema هنوز رسمی و اجرایی نشده است.  
حداقل باید این entityها تثبیت شوند:

- `users`
- `tenants`
- `memberships`
- `apps`
- `repositories`
- `cloudflare_accounts`
- `deployments`
- `deployment_runs`
- `agent_runs`
- `artifacts`
- `integration_connections`

### Gap 3: `GitHub Actions Deployment Contract`

این سند قبلاً هم در V5 به‌عنوان next step اشاره شده، اما هنوز نوشته نشده است.  
باید دقیق کند:

- workflow inputs
- required secrets
- branch strategy
- preview vs production behavior
- deployment callbacks
- failure payload shape

### Gap 4: `Free-Tier Deploy Flow`

باید flow کامل این مسیر روشن شود:

1. user connects GitHub
2. user connects Cloudflare
3. repo selected or created
4. template committed
5. workflow runs
6. preview URL generated
7. production deployment promoted

بدون این سند، `v1` هنوز از نظر onboarding و UX ناقص است.

### Gap 5: `Agents Integration Plan`

هنوز مشخص نشده:

- `Agents SDK` در کدام فاز وارد baseline می‌شود
- کدام agentها day-1 هستند
- مرز بین `Platform API` و `Agent Runtime` دقیقاً کجاست

این doc باید روشن کند:

- `BuilderAgent`
- `SupportAgent`
- `DeployAgent`
- `DocsAgent`

هرکدام چه مسئولیتی دارند و چه چیزهایی خارج از scope آن‌هاست.

### Gap 6: `AI Layer Contract`

باید یک سند مجزا تعریف کند:

- AI Gateway routing policy
- model classes
- fallback strategy
- prompt templates
- structured outputs
- error/failure summaries
- RAG and memory usage

### Gap 7: `Managed Tier Migration Contract`

چون در اسناد فعلی upgrade path مهم است، باید explicitly بنویسیم:

- چه چیزهایی بین free-tier و managed tier ثابت می‌مانند
- چه چیزهایی فقط execution plane را عوض می‌کنند
- migration from user-owned to platform-owned چگونه انجام می‌شود

---

## 5. تصمیم‌های پیشنهادی که باید رسمی شوند

### Decision 1

`V5` باید baseline رسمی `v1` باقی بماند.

یعنی:

- بدون `Sandbox SDK` در free-tier baseline
- بدون `Workers for Platforms` در free-tier baseline
- preview به‌صورت `CI-backed` و branch-based

### Decision 2

`Agents SDK` باید از همین حالا در target implementation وارد شود، اما **نه به‌عنوان بهانه‌ای برای شکستن V5**.

ترجمه عملی:

- code source و deploy source همچنان `GitHub + GitHub Actions` بماند
- اما stateful agent runtime برای builder/support روی `Agents SDK` ساخته شود

### Decision 3

`AI Gateway` باید entrypoint رسمی تمام model traffic باشد.

نباید:

- OpenAI direct path
- Anthropic direct path
- Gemini direct path

به‌صورت ad-hoc در بخش‌های مختلف سیستم پخش شوند.

### Decision 4

`Workers for Platforms + Cloudflare for SaaS` فقط برای `managed / paid path` baseline شوند.

نه برای:

- free-tier
- day-1 launch
- onboarding اولیه

### Decision 5

`Portal bootstrap` باید بر اساس `SvelteKit + Cloudflare adapter` جلو برود، اما service layer آن از همان ابتدا با contractهای جدید control plane طراحی شود.

### Decision 6

هر doc جدید باید به‌وضوح یکی از این برچسب‌ها را داشته باشد:

- `free-tier baseline`
- `shared control plane`
- `managed tier`
- `future / exploratory`

تا ambiguity اسناد کاهش پیدا کند.

---

## 6. رودمپ پیشنهادی

## Phase 0: Documentation Closure

هدف این فاز بستن gapهای اسنادی قبل از اجرای گسترده است.

### خروجی‌ها

- `Free-Tier Deploy Flow`
- `D1 Schema V1`
- `GitHub Actions Deployment Contract`
- `Agents Integration Plan`
- `AI Layer Contract`
- `Operating Model Matrix`

### چرا این فاز ضروری است

اگر بدون این اسناد وارد implementation شویم:

- portal contractها نامشخص می‌مانند
- onboarding و deployment UX بارها عوض می‌شود
- free-tier و managed-tier در code به هم می‌ریزند

## Phase 1: Control Plane MVP

هدف:

- ساخت `portal`
- ساخت `platform-api`
- تثبیت auth/integration/deployment metadata

### scope

- user identity
- tenant/app metadata
- GitHub connect
- Cloudflare connect
- app CRUD
- deployment status pages

### خارج از scope

- live sandbox preview
- managed hosting
- custom domains

## Phase 2: Builder Loop on V5

هدف:

- prompt -> generate -> commit -> CI -> preview -> production deploy

### اجزای الزامی

- template system
- agent patch generation
- CI failure summarization
- deployment registry
- retry loop

### تعریف موفقیت

کاربر بتواند یک template app را از prompt تا deploy روی account خودش جلو ببرد.

## Phase 3: Agent-Native Expansion

هدف:

- اضافه کردن `Agents SDK` برای user-facing stateful flows

### day-1 agent candidates

- `BuilderAgent`
- `DeployExplainerAgent`
- `SupportAgent`

### خروجی‌ها

- persistent sessions
- realtime builder state
- structured tool calling
- MCP-ready runtime

## Phase 4: AI and Memory Layer

هدف:

- استانداردسازی AI layer
- شروع RAG و context retrieval

### خروجی‌ها

- `AI Gateway` policy
- `Vectorize` index design
- docs/context retrieval
- build failure summarization pipeline

## Phase 5: Managed Platform Tier

هدف:

- migration path به `Workers for Platforms`
- custom domains با `Cloudflare for SaaS`

### خروجی‌ها

- dispatch worker
- per-tenant/app isolation
- managed publish
- subdomain routing
- custom hostname onboarding

---

## 7. اولویت‌های واقعی 30 روز آینده

اگر فقط بخواهیم روی impactful next steps تمرکز کنیم، این‌ها باید اول انجام شوند:

1. نوشتن `D1 Schema V1`
2. نوشتن `GitHub Actions Deployment Contract`
3. نوشتن `Free-Tier Deploy Flow`
4. تثبیت `Portal Route Map + API Surface`
5. تصمیم نهایی درباره baseline ورود `Agents SDK`
6. تعریف `AI Gateway` به‌عنوان unified AI entrypoint

### چیزی که نباید در 30 روز آینده زودتر از موعد وارد شود

- sandbox/containers-first implementation
- workers-for-platforms-first free-tier
- custom domain automation
- marketplace عمومی
- multi-template explosion

---

## 8. پیشنهاد ساختار doc set جدید

برای اینکه این فولدر به‌جای collection of ideas به execution handbook تبدیل شود، این ساختار پیشنهادی است:

```text
docs/cloudflare/
  README.md
  STACK_REVIEW_AND_ROADMAP.md
  ARCHITECTURE_V5_GITHUB_ACTIONS_USER_CF.md
  GITOPS_WORKFLOW.md
  FREE_TIER_DEPLOY_FLOW.md
  D1_SCHEMA_V1.md
  GITHUB_ACTIONS_DEPLOYMENT_CONTRACT.md
  AGENTS_INTEGRATION_PLAN.md
  AI_LAYER_CONTRACT.md
  OPERATING_MODEL_MATRIX.md
  MANAGED_TIER_MIGRATION.md
  NEW_PORTAL_BOOTSTRAP_PLAN.md
  PORTAL_FILE_MAPPING.md
  CLOUDFLARE_MULTITENANT_STRATEGY.md
  CLOUDFLARE_FIRST_ECOSYSTEM.md
```

---

## 9. Definition of Ready برای شروع توسعه

توسعه جدی implementation زمانی باید شروع شود که حداقل این موارد done باشند:

- baseline `v1` به‌صورت رسمی همان `V5` باشد
- schema اولیه `D1` نهایی شده باشد
- contract رسمی deployment workflow نوشته شده باشد
- routeهای اصلی portal مشخص شده باشند
- model status برای `draft`, `preview`, `production`, `failed`, `authorization_required` نهایی شده باشد
- جایگاه `Agents SDK` در معماری اجرایی شفاف شده باشد

---

## 10. Definition of Done برای فاز بعدی اسناد

این فاز اسنادی done است اگر:

- همه docهای حیاتی فاز 0 نوشته شوند
- هر سند برچسب `free-tier`, `shared`, یا `managed` داشته باشد
- تناقض بین `sandbox-first` و `git-first` برطرف شود
- ترتیب مطالعه از `README.md` کاملاً روشن باشد

---

## 11. نتیجه نهایی

جهت معماری فعلی درست است و لازم نیست pivot اساسی انجام شود.  
چیزی که الان باید اضافه شود، **معماری جدید دیگر** نیست؛ بلکه این‌هاست:

- docهای اجرایی missing
- operating model matrix
- contracts دقیق data/deploy/agent/ai
- roadmap رسمی از `v1 free-tier` تا `managed platform`

### توصیه نهایی

برای همین پروژه، اولویت رسمی باید این باشد:

1. `V5` را baseline اجرای `v1` نگه داریم
2. `Agents SDK` را به‌عنوان لایه agentic روی همان baseline اضافه کنیم
3. `AI Gateway` را از روز اول canonical کنیم
4. `Workers for Platforms` را برای paid/managed path نگه داریم
5. قبل از implementation بزرگ، doc set اجرایی را کامل کنیم

---

## 12. اسناد بعدی که باید بلافاصله نوشته شوند

1. `FREE_TIER_DEPLOY_FLOW.md`
2. `D1_SCHEMA_V1.md`
3. `GITHUB_ACTIONS_DEPLOYMENT_CONTRACT.md`
4. `AGENTS_INTEGRATION_PLAN.md`
5. `AI_LAYER_CONTRACT.md`
6. `OPERATING_MODEL_MATRIX.md`
