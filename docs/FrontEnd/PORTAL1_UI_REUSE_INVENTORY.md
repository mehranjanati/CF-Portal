# Portal1 UI Reuse Inventory

این سند inventory بخش‌هایی از `portal1` است که برای portal جدید Cloudflare stack می‌توانند مبنای reuse باشند.

## اولویت بالا

این بخش‌ها بیشترین شانس reuse را دارند:

- `src/lib/components/ui`
- `src/lib/components/layout`
- `src/lib/components/dashboard`
- `src/lib/components/deployments`
- `src/lib/components/workflows`
- `src/lib/components/projects`

## UI primitives

این‌ها مناسب‌ترین گزینه‌ها برای انتقال مستقیم یا با تغییر بسیار کم هستند:

- `ui/badge`
- `ui/button`
- `ui/card`
- `ui/input`
- `ui/separator`
- `ui/Badge.svelte`
- `ui/Button.svelte`
- `ui/Card.svelte`
- `ui/Input.svelte`
- `ui/Select.svelte`

### دلیل reuse

- presentation-focused هستند
- coupling کمی با backend دارند
- برای شروع portal جدید time-to-market را بهتر می‌کنند

## Layout

این بخش‌ها برای skeleton اولیه portal جدید مفیدند:

- `layout/AppShell.svelte`
- `layout/Sidebar.svelte`
- `layout/Topbar.svelte`

### دلیل reuse

- چارچوب کلی navigation را آماده می‌کنند
- برای builder/admin/deployments screens مناسب‌اند
- با data layer جدید هم قابل تطبیق هستند

## Screen-level candidates

### مناسب برای reuse جزئی

- `builder/Builder.svelte`
- `dashboard/Dashboard.svelte`
- `dashboard/AlertFeed.svelte`
- `dashboard/MetricCard.svelte`
- `dashboard/SparklineChart.svelte`
- `deployments/Deployments.svelte`
- `workflows/Workflows.svelte`
- `projects/Projects.svelte`
- `projects/ProjectBuilder.svelte`
- `settings/Settings.svelte`

### قاعده reuse

برای این فایل‌ها:

- structure و UX pattern را نگه دار
- fetch logic و data model را بازنویسی کن
- status naming و workflow labels را با استک جدید هماهنگ کن

## بخش‌های کم‌اولویت یا مشروط

این بخش‌ها فقط اگر در product جدید واقعاً نیاز باشند بررسی شوند:

- `billing/Billing.svelte`
- `foundry/Foundry.svelte`
- `handoff/Handoff.svelte`
- `marketplace/Marketplace.svelte`
- `streams/Streams.svelte`
- `meet/SessionInterface.svelte`
- `global/cms-view.svelte`

### دلیل احتیاط

- یا scope فاز اول نیستند
- یا احتمال coupling محصولی/معماری بیشتری دارند
- یا هنوز معلوم نیست در stack جدید زود لازم شوند

## بخش‌هایی که فعلاً نباید منتقل شوند

- `services/supernode.ts`
- `api/client.ts` با قرارداد فعلی
- هر چیز متصل به `supernode` endpointها
- chat flow فعلی اگر بر backend legacy تکیه دارد
- health checks فعلی با hostهای local

## قواعد انتقال

### Rule 1

فقط componentهای presentational یا layout-first را مستقیم کپی کن.

### Rule 2

هر componentی که:

- خودش `fetch` دارد
- environment variable قدیمی می‌خواند
- status model قدیمی دارد

باید قبل از reuse شکسته و لایه data آن جدا شود.

### Rule 3

برای portal جدید بهتر است این ساختار را داشته باشیم:

- `components/ui`
- `components/layout`
- `components/features/builder`
- `components/features/deployments`
- `components/features/workflows`
- `components/features/dashboard`

## خروجی پیشنهادی migration

در پروژه جدید:

1. اول `ui` و `layout` منتقل شوند
2. بعد screenها به‌صورت feature-by-feature بازسازی شوند
3. service layer کاملاً جدید نوشته شود
4. endpoint contracts بر اساس Cloudflare docs تعریف شوند

## نتیجه

`portal1` یک منبع خوب برای:

- design language
- page composition
- component structure
- navigation skeleton

است، اما منبع خوبی برای:

- data layer
- runtime model
- deployment assumptions
- backend contracts

نیست.
