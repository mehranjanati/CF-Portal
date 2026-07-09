# Cloudflare Stack Docs

این فولدر مرجع فعال برای استک جدید پروژه است.

## تصمیم فعلی

از این نقطه به بعد، مسیر اصلی توسعه روی مدل `Cloudflare-first` و `Cloudflare-only` جلو می‌رود:

- `GitHub` منبع حقیقت کد است
- build و deploy با `GitHub Actions` انجام می‌شود
- runtime نهایی روی `Cloudflare account` خود کاربر اجرا می‌شود
- ما برای اپ کاربر **سرور اجرایی جداگانه‌ای از خودمان** نگه نمی‌داریم
- control plane, metadata, orchestration و portal روی Cloudflare services می‌نشینند

## ترتیب مطالعه

1. `STACK_REVIEW_AND_ROADMAP.md`
   - جمع‌بندی وضعیت فعلی، گپ‌های اسنادی، و رودمپ اجرایی از `v1 free-tier` تا `managed platform`
2. `AGENTS_WORKFLOWS_AND_VISUAL_BUILDER_ON_CLOUDFLARE.md`
   - تحلیل عمیق اینکه agent runtime, workflows, MCP, visual builder و publish plane را چطور روی اکوسیستم Cloudflare می‌بندیم
3. `VISUAL_GRAPH_BUILDER_ARCHITECTURE.md`
   - معماری Visual Graph Builder داخل Portal SPA، تصمیم درباره Rivet-style UX، و تفکیک UI از compile/runtime
4. `CLOUDFLARE_FIRST_ECOSYSTEM.md`
   - نمای کلان استک جدید، سرویس‌های Cloudflare، و مسیر target architecture
5. `ARCHITECTURE_V5_GITHUB_ACTIONS_USER_CF.md`
   - معماری v1 برای مدل `GitHub Actions + User Cloudflare Account`
6. `GITOPS_WORKFLOW.md`
   - قرارداد build/test/deploy و مسیر GitHub-first
7. `NEW_PORTAL_BOOTSTRAP_PLAN.md`
   - plan اجرایی برای ساخت portal جدید روی استک Cloudflare
8. `PORTAL_FILE_MAPPING.md`
   - mapping فایل‌به‌فایل `portal1` به ساختار portal جدید
9. `CLOUDFLARE_MULTITENANT_STRATEGY.md`
   - تحلیل عمیق مدل user-owned free tier در برابر platform-owned multitenancy
10. `PORTAL1_REUSE_DECISION.md`
   - تصمیم نهایی درباره اینکه `portal1` چه چیزهایی را باید و نباید به استک جدید بیاورد
11. `PORTAL1_UI_REUSE_INVENTORY.md`
   - inventory بخش‌های UI و layout قابل reuse از `portal1`
12. `ui/`
   - snapshotهای انتخابی از layout, primitives و patternهای UI برای migration
13. `LEGACY_CONTEXT_FOR_CLOUDFLARE.md`
   - بخش‌هایی از استک قبلی که هنوز به عنوان context یا design input مفید هستند

## چه چیزهایی فعلاً کنار گذاشته شده‌اند

این بخش‌ها دیگر baseline اجرایی استک جدید نیستند:

- `Go Gateway` به عنوان runtime اصلی
- `BFF` جداگانه
- `Temporal`
- `Podman` / container execution برای v1
- `Redis`, `Redpanda`, `Postgres/TiDB`, `MinIO`, `IPFS` به عنوان اجزای ضروری شروع
- `Wazero` / `TinyGo` به عنوان مسیر پیش‌فرض runtime

## قاعده تصمیم

اگر یک سند قدیمی با این فولدر تعارض داشت:

- برای استک جدید، تصمیم این فولدر اولویت دارد
- از اسناد قدیمی فقط insight, naming, template ideas و data model hints را نگه می‌داریم
- execution model قدیمی baseline رسمی نیست
