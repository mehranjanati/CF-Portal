# Cloudflare Multitenant Strategy

## هدف

این سند یک تحلیل عمیق برای این سوال است:

**با توجه به مدل چندمستاجری Cloudflare، آیا می‌توانیم از منابع پلن رایگان خود کاربر در استک خودمان برای همان کاربر استفاده کنیم، و اگر بله در چه مدلی؟**

این تحلیل بر پایه این مراجع است:

- `AI Vibe Coding Platform`
- `Cloudflare for Platforms`
- `Cloudflare for SaaS`
- `Agent setup`
- `Flagship`

## جواب کوتاه

**بله، اما فقط در مدل user-owned deployment.**

اگر بخواهیم از منابع پلن رایگان خود کاربر استفاده کنیم:

- deploy باید روی **Cloudflare account خود کاربر** انجام شود
- build/deploy path باید از `GitHub Actions` یا مسیر مشابه روی repo کاربر عبور کند
- runtime نهایی باید در account خود کاربر باشد

اما اگر بخواهیم:

- multitenant hosting واقعی
- programmable routing
- per-tenant worker isolation
- centralized controls
- custom limits
- outbound policy

داشته باشیم، وارد مدل `Cloudflare for Platforms` می‌شویم که عملاً **platform-owned** است، نه user-free-tier-owned.

## سه مدل اجرایی که باید از هم جدا شوند

### Model A: User-Owned Cloudflare Account

در این مدل:

- user repository روی GitHub source of truth است
- `GitHub Actions` build/test/deploy را اجرا می‌کند
- `wrangler deploy` یا `wrangler pages deploy` به account خود کاربر می‌رود
- مصرف quota و limits از پلن خود کاربر کم می‌شود

### مزایا

- با free tier کاربر هم قابل شروع است
- ما runtime cost مستقیم برای app کاربر نمی‌دهیم
- blame boundary روشن است
- ownership برای user واضح است

### معایب

- multitenant control plane روی app runtime نداریم
- observability و policy enforcement محدودتر است
- white-label و routing سراسری platform-style سخت‌تر می‌شود
- UX و onboarding پیچیده‌تر از managed platform است

### بهترین کاربرد

- free tier
- v1
- مدل «بدون سرور جداگانه از خودمان»
- سناریویی که کاربر باید روی account خودش deploy بگیرد

## Model B: Platform-Owned Multitenant on Cloudflare for Platforms

در این مدل:

- appهای کاربران روی namespace و account خود platform deploy می‌شوند
- هر user app یک Worker ایزوله خودش را دارد
- routing از طریق `dynamic dispatch Worker` انجام می‌شود
- platform limits, egress, bindings و hostname routing را کنترل می‌کند

### چیزهایی که `Cloudflare for Platforms` می‌دهد

طبق docs:

- isolation و multitenancy
- dispatch-based routing
- per-customer limits
- bindings per user Worker
- custom domains/subdomains
- outbound control

### نکته کلیدی

این مدل **از منابع account خود platform** استفاده می‌کند، نه از free tier user.

یعنی اگر ما `Workers for Platforms` را مبنا بگیریم:

- execution plane روی account ماست
- quota و product limits مربوط به setup ماست
- حتی اگر tenant app ایزوله باشد، باز هم user-owned free-tier execution محسوب نمی‌شود

### بهترین کاربرد

- managed tier
- paid plan
- large-scale multitenancy
- زمانی که بخواهیم appهای user-generated را خودمان host کنیم

## Model C: Hybrid

این مدل برای شما از همه منطقی‌تر است.

### در این مدل:

- control plane روی Cloudflare account خود ماست
- portal, metadata, orchestration, integrations روی استک Cloudflare ما می‌نشینند
- app runtime در free tier روی account خود کاربر deploy می‌شود
- در upgrade path، app runtime می‌تواند به `Workers for Platforms` روی account ما migrate شود

### نتیجه

این مدل هم با free tier سازگار است، هم با آینده managed tier.

## تحلیل `AI Vibe Coding Platform`

این reference architecture سه بخش را به‌عنوان هسته پلتفرم می‌بیند:

1. AI layer
2. sandboxed execution
3. scalable deployment plane

### برداشت درست برای پروژه شما

این سند **target architecture** خیلی خوبی است، اما لزوماً بهترین day-1 architecture نیست.

چون:

- برای full vibe coding platform به `Sandboxes/Containers` نیاز دارد
- برای publish-at-scale به `Workers for Platforms` تکیه می‌کند
- برای managed production model طراحی شده است

### نتیجه برای ما

اگر بخواهیم free tier را با quota خود user جلو ببریم، این reference را باید **به عنوان مسیر آینده** ببینیم، نه baseline v1.

## تحلیل `Cloudflare for Platforms`

این محصول مناسب وقتی است که ما:

- host platform باشیم
- tenant appها را خودمان deploy کنیم
- dispatch namespace و routing را خودمان کنترل کنیم

### نکات مهم docs

#### 1. `Workers for Platforms` روی paid plans است

پس این محصول راه‌حل «استفاده از free plan user» نیست.

#### 2. Dynamic Dispatch Worker

این بخش برای routing چندمستاجری فوق‌العاده است:

- subdomain-based routing
- path-based routing
- KV-based routing
- routing logic در code

برای managed tier، این دقیقاً چیزی است که لازم دارید.

#### 3. Custom Limits

می‌توانید per-tenant محدودیت بگذارید:

- `cpuMs`
- `subRequests`

این برای abuse control و pricing tiers حیاتی است.

#### 4. Bindings

برای هر user Worker می‌توان bindingهای مجزا attach کرد:

- KV
- R2
- D1
- Durable Objects
- Analytics Engine

این یعنی isolation واقعی per-tenant.

#### 5. Outbound Workers

این بخش یکی از مهم‌ترین قابلیت‌ها برای managed platform است:

- log کردن همه fetchهای خروجی
- allowlist/blocklist
- تزریق auth به APIهای خودتان

این برای زمانی عالی است که appهای کاربر را روی account خودتان host می‌کنید.

### نتیجه

`Cloudflare for Platforms` راه‌حل عالی برای **managed multitenant hosting** است، اما نه برای مدل «از free-tier user resources استفاده کنیم».

## تحلیل `Cloudflare for SaaS`

`Cloudflare for SaaS` بیشتر **delivery plane** است تا execution plane.

### کاری که می‌دهد

- custom domains
- vanity domains
- hostname onboarding
- TLS و managed traffic path

### نکته مهم

این محصول app runtime را روی account user نمی‌برد؛ فقط domain delivery را platform-style می‌کند.

### نکات مهم plans

طبق docs:

- روی non-Enterprise هم available است
- روی Free/Pro/Business تعداد محدودی hostname included دارد
- `custom metadata` فقط Enterprise add-on است
- `apex proxying` در Free/Pro/Business نیست

### نتیجه

برای v1 free tier:

- لازم نیست حتماً از `Cloudflare for SaaS` شروع کنید
- subdomain داخلی platform کافی است

برای managed/white-label tier:

- `Cloudflare for SaaS` تقریباً ضروری می‌شود

## تحلیل `Agent setup`

این بخش بیشتر به setup agentها در IDE/terminal مربوط است، نه runtime product architecture.

### ارزش واقعی آن برای پروژه شما

- نشان می‌دهد Cloudflare مسیر agent-centric development را جدی گرفته
- `Skills` و `MCP` در ecosystem جدید first-class شده‌اند
- برای internal developer workflow و future builder tooling مفید است

### اما

این صفحه تصمیمی درباره:

- tenant compute model
- quota ownership
- hosting plane

نمی‌دهد.

پس در طراحی platform باید آن را **supporting signal** ببینیم، نه core architecture source.

## تحلیل `Flagship`

`Flagship` برای این پروژه surprisingly مهم است، ولی نه در execution plane.

### بهترین استفاده‌های آن

- rollout featureها per tenant
- فعال/غیرفعال کردن featureهای beta
- plan-based gating
- configuration blocks per environment/tenant

### چرا مهم است

ارزیابی flag در Workers local است و round-trip ندارد. این برای portal/control plane خیلی ارزشمند است.

### مثال‌های مناسب

- آیا tenant به preview جدید دسترسی دارد؟
- آیا GitHub integration UI فعال باشد؟
- آیا Cloudflare managed publish برای این tenant روشن باشد؟
- آیا managed domain flow برای plan خاص فعال شود؟

### نتیجه

`Flagship` execution plane را حل نمی‌کند، ولی برای product rollout و tenant-aware configuration بسیار مناسب است.

## پاسخ دقیق به سوال اصلی شما

### آیا می‌توانیم از free plan خود user در استک خودمان برای همان user استفاده کنیم؟

**بله، اگر و فقط اگر app runtime روی account خود user deploy شود.**

یعنی:

- deploy روی account user
- quota از plan user
- ownership با user

### آیا می‌توانیم هم‌زمان یک platform multitenant واقعی مثل Workers for Platforms هم داشته باشیم و باز هم از free tier user استفاده کنیم؟

**نه، نه به همان معنی.**

وقتی وارد `Workers for Platforms` می‌شویم:

- app runtime روی account platform می‌نشیند
- quota و limits از setup platform می‌آید
- user دیگر owner مستقیم execution plane نیست

## recommendation نهایی

### برای Free Tier

مدل پیشنهادی:

- `Portal` روی Cloudflare account خود ما
- `Platform API` روی Cloudflare account خود ما
- metadata روی `D1`
- artifacts روی `R2`
- GitHub source of truth
- build/deploy با `GitHub Actions`
- runtime نهایی روی account خود user

این همان مدل `GitHub Actions + User Cloudflare Account` است و بهترین گزینه برای v1 است.

### برای Paid / Managed Tier

مدل پیشنهادی:

- `Workers for Platforms`
- `Dynamic Dispatch Worker`
- `Outbound Worker`
- per-tenant bindings
- `Cloudflare for SaaS`
- `Flagship` برای gating و rollout

این مدل execution plane را به platform account منتقل می‌کند.

## migration path پیشنهادی

### Phase 1

- free tier روی account خود user
- بدون `Workers for Platforms`
- بدون managed sandbox requirement

### Phase 2

- preview/runtime بهتر
- maybe sandbox-backed dev flow
- managed observability بهتر

### Phase 3

- paid managed hosting با `Workers for Platforms`
- custom domains با `Cloudflare for SaaS`
- per-tenant policy با `Outbound Workers`
- staged rollout با `Flagship`

## تصمیم نهایی

اگر اولویت شما این است که:

- سرور جداگانه‌ای از خودتان نداشته باشید
- از منابع free tier خود user استفاده کنید
- v1 سریع و sustainable باشد

پس باید:

- **execution plane رایگان را user-owned نگه دارید**
- **control plane را platform-owned روی Cloudflare نگه دارید**
- و `Cloudflare for Platforms` را برای **paid managed tier** رزرو کنید، نه برای free tier baseline
