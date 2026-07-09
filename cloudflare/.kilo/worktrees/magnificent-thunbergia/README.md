# Cloudflare Stack Docs

این فولدر مرجع فعال برای استک جدید پروژه است.

## Canonical Statement

جمله مرجع این repo از این به بعد این است:

**Nexus یک `Cloudflare-first control plane` با `Cloudflare-native default runtime` و `optional self-hosted execution plane via wasmCloud` است؛ در آن `GitHub` منبع حقیقت کد می‌ماند و محصول نهایی یک `global AI execution network` برای appها، agentها و workflowها است.**

## تصمیم فعلی

از این نقطه به بعد، baseline رسمی توسعه روی مدل زیر جلو می‌رود:

- `Cloudflare-first control plane`
- `Cloudflare-native default runtime`
- `Optional self-hosted execution plane via wasmCloud`

- `GitHub` منبع حقیقت کد است
- build و deploy با `GitHub Actions` انجام می‌شود
- control plane, metadata, orchestration و portal به‌صورت پیش‌فرض روی Cloudflare services می‌نشینند
- runtime پیش‌فرض برای featureها و appهای استاندارد روی `Cloudflare account` خود کاربر اجرا می‌شود
- برای سناریوهای پیشرفته، private integrationها، edge nodeها یا محیط‌های on-prem می‌توان execution plane اختیاری self-hosted داشت
- ما برای اپ کاربر **سرور اجرایی جداگانه platform-managed از سمت خودمان** را baseline پیش‌فرض نمی‌گیریم
- اگر self-hosted runtime وارد شود، مالکیت و عملیات آن با customer-owned infra یا nodeهای اختصاصی خواهد بود، نه با runtime مرکزی از سمت ما

## ترتیب مطالعه

1. [STACK_REVIEW_AND_ROADMAP.md](docs/Architecture/STACK_REVIEW_AND_ROADMAP.md)
   - جمع‌بندی وضعیت فعلی، گپ‌های اسنادی، و رودمپ اجرایی از `v1 free-tier` تا `managed platform`
2. [AGENTS_WORKFLOWS_AND_VISUAL_BUILDER_ON_CLOUDFLARE.md](docs/Agent/AGENTS_WORKFLOWS_AND_VISUAL_BUILDER_ON_CLOUDFLARE.md)
   - تحلیل عمیق اینکه agent runtime, workflows, MCP, visual builder و publish plane را چطور روی اکوسیستم Cloudflare می‌نبندیم
3. [VISUAL_GRAPH_BUILDER_ARCHITECTURE.md](docs/Architecture/VISUAL_GRAPH_BUILDER_ARCHITECTURE.md)
   - معماری Visual Graph Builder داخل Portal SPA، تصمیم درباره Rivet-style UX، و تفکیک UI از compile/runtime
4. [CLOUDFLARE_FIRST_ECOSYSTEM.md](docs/Architecture/CLOUDFLARE_FIRST_ECOSYSTEM.md)
   - نمای کلان استک جدید، سرویس‌های Cloudflare، و مسیر target architecture
5. [ARCHITECTURE_V5_GITHUB_ACTIONS_USER_CF.md](docs/Architecture/ARCHITECTURE_V5_GITHUB_ACTIONS_USER_CF.md)
   - معماری v1 برای مدل `GitHub Actions + User Cloudflare Account`
6. [GITOPS_WORKFLOW.md](docs/Ops/GITOPS_WORKFLOW.md)
   - قرارداد build/test/deploy و مسیر GitHub-first
7. [NEW_PORTAL_BOOTSTRAP_PLAN.md](docs/FrontEnd/NEW_PORTAL_BOOTSTRAP_PLAN.md)
   - plan اجرایی برای ساخت portal جدید روی استک Cloudflare
8. [PORTAL_FILE_MAPPING.md](docs/FrontEnd/PORTAL_FILE_MAPPING.md)
   - mapping فایل‌به‌فایل `portal1` به ساختار portal جدید
9. [CLOUDFLARE_MULTITENANT_STRATEGY.md](docs/Architecture/CLOUDFLARE_MULTITENANT_STRATEGY.md)
   - تحلیل عمیق مدل user-owned free tier در برابر platform-owned multitenancy
10. [PORTAL1_REUSE_DECISION.md](docs/FrontEnd/PORTAL1_REUSE_DECISION.md)
    - تصمیم نهایی درباره اینکه `portal1` چه چیزهایی را باید و نباید به استک جدید بیاورد
11. [PORTAL1_UI_REUSE_INVENTORY.md](docs/FrontEnd/PORTAL1_UI_REUSE_INVENTORY.md)
    - inventory بخش‌های UI و layout قابل reuse از `portal1`
12. [docs/FrontEnd/FEATURE_PATTERNS.md](docs/FrontEnd/FEATURE_PATTERNS.md)
    - snapshotهای انتخابی از layout, primitives و patternهای UI برای migration
13. [LEGACY_CONTEXT_FOR_CLOUDFLARE.md](docs/Architecture/LEGACY_CONTEXT_FOR_CLOUDFLARE.md)
    - بخش‌هایی از استک قبلی که هنوز به عنوان context یا design input مفید هستند

## چه چیزهایی فعلاً کنار گذاشته شده‌اند

این بخش‌ها دیگر baseline اجرایی استک جدید نیستند:

- `Go Gateway` به عنوان runtime اصلی
- `BFF` جداگانه
- `Temporal`
- `Podman` / container execution برای v1
- `Redis`, `Redpanda`, `Postgres/TiDB`, `MinIO`, `IPFS` به عنوان اجزای ضروری شروع
- `Wazero` / `TinyGo` یا `wasmCloud` به عنوان مسیر پیش‌فرض runtime

## تفسیر baseline جدید

قاعده اجرایی از این به بعد این است:

- اگر یک capability روی Cloudflare به‌خوبی قابل اجرا است، Cloudflare target پیش‌فرض است
- اگر یک capability به private network, host access, on-prem deployment, edge gateway یا runtime سفارشی نیاز دارد، self-hosted execution plane مجاز است
- `Cloudflare` هنوز target اصلی برای portal, control plane, auth, metadata, orchestration و default publish path است
- `wasmCloud` یا runtimeهای self-hosted فقط به‌عنوان target اختیاری و advanced برای customer-owned execution دیده می‌شوند
- خروجی محصول فقط code generation نیست؛ هدف، ساخت یک `global AI execution network` برای appها، agentها و workflowها است

## قاعده تصمیم

اگر یک سند قدیمی با این فولدر تعارض داشت:

- برای استک جدید، تصمیم این فولدر اولویت دارد
- از اسناد قدیمی فقط insight, naming, template ideas و data model hints را نگه می‌داریم
- execution model قدیمی baseline رسمی نیست
