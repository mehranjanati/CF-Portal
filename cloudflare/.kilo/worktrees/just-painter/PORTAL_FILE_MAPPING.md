# Portal File Mapping

## هدف

این سند mapping عملی بین ساختار فعلی `portal1` و ساختار portal جدید Cloudflare stack است.
هدف این mapping این است که migration:

- انتخابی باشد
- debt قدیمی را منتقل نکند
- data layer جدید را از UI layer جدا نگه دارد

## قاعده کلی mapping

برای هر فایل یکی از این statusها استفاده می‌شود:

- `keep`
  - تقریباً با همان نقش به ساختار جدید منتقل می‌شود
- `rewrite`
  - ایده و UI آن حفظ می‌شود، اما implementation باید بازنویسی شود
- `split`
  - فایل فعلی بزرگ یا mixed-responsibility است و باید به چند فایل شکسته شود
- `archive`
  - فعلاً برای استک جدید نیاز فوری ندارد، اما به عنوان reference نگه داشته می‌شود
- `drop`
  - نباید وارد baseline جدید شود

## target structure

ساختار پیشنهادی مقصد:

```text
src/
  lib/
    api/
    components/
      ui/
      layout/
      features/
        builder/
        dashboard/
        deployments/
        workflows/
        projects/
        settings/
        integrations/
    services/
    stores/
    types/
    utils/
  routes/
    (app)/
    projects/
    builder/
    deployments/
    workflows/
    settings/
    integrations/
```

## route mapping

| فایل فعلی | مقصد پیشنهادی | status | توضیح |
| :--- | :--- | :--- | :--- |
| `src/routes/+layout.svelte` | `src/routes/+layout.svelte` | `rewrite` | layout اصلی باید با env و auth مدل جدید Cloudflare هماهنگ شود |
| `src/routes/+layout.ts` | `src/routes/+layout.ts` | `rewrite` | هر dependency قدیمی به backend قبلی حذف شود |
| `src/routes/(app)/+layout.svelte` | `src/routes/(app)/+layout.svelte` | `rewrite` | app shell جدید روی layoutهای reusable سوار می‌شود |
| `src/routes/(app)/+page.svelte` | `src/routes/(app)/+page.svelte` یا redirect به `/projects` | `rewrite` | home state باید بر اساس portal جدید تعریف شود |
| `src/routes/admin/+page.svelte` | `src/routes/settings/admin/+page.svelte` یا `archive` | `archive` | admin در فاز اول ضروری نیست |
| `src/routes/marketplace/+page.svelte` | `src/routes/marketplace/+page.svelte` | `archive` | marketplace فاز بعدی است |

## layout mapping

| فایل فعلی | مقصد پیشنهادی | status | توضیح |
| :--- | :--- | :--- | :--- |
| `src/lib/components/layout/AppShell.svelte` | `src/lib/components/layout/AppShell.svelte` | `rewrite` | dependency به `GlobalChat` و assumptions فعلی حذف شود |
| `src/lib/components/layout/Sidebar.svelte` | `src/lib/components/layout/Sidebar.svelte` | `rewrite` | hash-based nav به pathname-based nav تبدیل شود |
| `src/lib/components/layout/Topbar.svelte` | `src/lib/components/layout/Topbar.svelte` | `rewrite` | breadcrumb, search, tenant/app selector با مدل جدید بازنویسی شود |

## ui primitives mapping

این بخش‌ها بهترین کاندید برای reuse هستند.

| فایل فعلی | مقصد پیشنهادی | status | توضیح |
| :--- | :--- | :--- | :--- |
| `src/lib/components/ui/Button.svelte` | `src/lib/components/ui/Button.svelte` | `keep` | primitive مناسب برای انتقال مستقیم |
| `src/lib/components/ui/Card.svelte` | `src/lib/components/ui/Card.svelte` | `keep` | primitive مناسب برای انتقال مستقیم |
| `src/lib/components/ui/Input.svelte` | `src/lib/components/ui/Input.svelte` | `keep` | primitive مناسب برای انتقال مستقیم |
| `src/lib/components/ui/Select.svelte` | `src/lib/components/ui/Select.svelte` | `keep` | primitive مناسب برای انتقال مستقیم |
| `src/lib/components/ui/badge/*` | `src/lib/components/ui/badge/*` | `keep` | presentation-focused |
| `src/lib/components/ui/button/*` | `src/lib/components/ui/button/*` | `keep` | presentation-focused |
| `src/lib/components/ui/card/*` | `src/lib/components/ui/card/*` | `keep` | presentation-focused |
| `src/lib/components/ui/input/*` | `src/lib/components/ui/input/*` | `keep` | presentation-focused |
| `src/lib/components/ui/separator/*` | `src/lib/components/ui/separator/*` | `keep` | presentation-focused |
| `src/lib/components/ui/Badge.svelte` | `src/lib/components/ui/Badge.svelte` | `keep` | قابل انتقال مستقیم |
| `src/lib/components/ui/Input.svelte` | `src/lib/components/ui/Input.svelte` | `keep` | قابل انتقال مستقیم |

## feature component mapping

### dashboard

| فایل فعلی | مقصد پیشنهادی | status | توضیح |
| :--- | :--- | :--- | :--- |
| `src/lib/components/dashboard/Dashboard.svelte` | `src/lib/components/features/dashboard/DashboardPage.svelte` | `rewrite` | health checks قدیمی حذف و با Cloudflare surfaces جایگزین شود |
| `src/lib/components/dashboard/AlertFeed.svelte` | `src/lib/components/features/dashboard/AlertFeed.svelte` | `keep` | pattern مناسب برای alert stream |
| `src/lib/components/dashboard/MetricCard.svelte` | `src/lib/components/features/dashboard/MetricCard.svelte` | `keep` | reusable |
| `src/lib/components/dashboard/SparklineChart.svelte` | `src/lib/components/features/dashboard/SparklineChart.svelte` | `keep` | reusable |

### projects

| فایل فعلی | مقصد پیشنهادی | status | توضیح |
| :--- | :--- | :--- | :--- |
| `src/lib/components/projects/Projects.svelte` | `src/lib/components/features/projects/ProjectsPage.svelte` | `rewrite` | agent draft model فعلی باید به app/project model جدید ترجمه شود |
| `src/lib/components/projects/ProjectBuilder.svelte` | `src/lib/components/features/projects/ProjectBuilderPanel.svelte` | `rewrite` | فقط UX pattern حفظ شود |

### builder

| فایل فعلی | مقصد پیشنهادی | status | توضیح |
| :--- | :--- | :--- | :--- |
| `src/lib/components/builder/Builder.svelte` | `src/lib/components/features/builder/BuilderWorkspace.svelte` | `split` | manifest, execution panel, logs, deploy form باید از هم جدا شوند |

### deployments

| فایل فعلی | مقصد پیشنهادی | status | توضیح |
| :--- | :--- | :--- | :--- |
| `src/lib/components/deployments/Deployments.svelte` | `src/lib/components/features/deployments/DeploymentList.svelte` | `split` | table view و detail drawer بهتر است جدا شوند |

### workflows

| فایل فعلی | مقصد پیشنهادی | status | توضیح |
| :--- | :--- | :--- | :--- |
| `src/lib/components/workflows/Workflows.svelte` | `src/lib/components/features/workflows/WorkflowBoard.svelte` | `rewrite` | terminology قدیمی `Temporal` باید حذف و CI-backed wording جایگزین شود |

### settings

| فایل فعلی | مقصد پیشنهادی | status | توضیح |
| :--- | :--- | :--- | :--- |
| `src/lib/components/settings/Settings.svelte` | `src/lib/components/features/settings/SettingsPage.svelte` | `rewrite` | settings جدید باید GitHub/Cloudflare integrations را هم بپوشاند |

### common

| فایل فعلی | مقصد پیشنهادی | status | توضیح |
| :--- | :--- | :--- | :--- |
| `src/lib/components/common/BackendStatusIndicator.svelte` | `src/lib/components/features/common/SurfaceStatusIndicator.svelte` | `rewrite` | عنوان و semantics آن باید از backend legacy به platform surface health تغییر کند |

## low-priority or archive mapping

| فایل فعلی | مقصد پیشنهادی | status | توضیح |
| :--- | :--- | :--- | :--- |
| `src/lib/components/billing/Billing.svelte` | `src/lib/components/features/billing/BillingPage.svelte` | `archive` | فاز بعدی |
| `src/lib/components/foundry/Foundry.svelte` | `src/lib/components/features/foundry/FoundryPage.svelte` | `archive` | scope فاز اول نیست |
| `src/lib/components/logs/Logs.svelte` | `src/lib/components/features/logs/LogsPage.svelte` | `archive` | بعد از تثبیت deployment/workflow data layer |
| `src/lib/components/marketplace/Marketplace.svelte` | `src/lib/components/features/marketplace/MarketplacePage.svelte` | `archive` | scope بعدی |
| `src/lib/components/streams/Streams.svelte` | `src/lib/components/features/streams/StreamsPage.svelte` | `archive` | به stack فعلی فوری ربط ندارد |
| `src/lib/components/handoff/Handoff.svelte` | `src/lib/components/features/handoff/HandoffPage.svelte` | `archive` | خارج از scope فعلی |
| `src/lib/components/meet/SessionInterface.svelte` | `src/lib/components/features/meet/SessionInterface.svelte` | `archive` | خارج از scope فعلی |
| `src/lib/components/global/cms-view.svelte` | `src/lib/components/features/cms/CmsView.svelte` | `archive` | بعداً در صورت نیاز |
| `src/lib/components/global/main-router.svelte` | `drop` | `drop` | portal جدید نباید بر hash router قدیمی تکیه کند |
| `src/lib/components/chat/GlobalChat.svelte` | `src/lib/components/features/chat/GlobalChat.svelte` | `archive` | chat باید با Agent/Workers contract جدید بازطراحی شود |

## api and service layer mapping

| فایل فعلی | مقصد پیشنهادی | status | توضیح |
| :--- | :--- | :--- | :--- |
| `src/lib/api/client.ts` | `src/lib/api/http.ts` | `rewrite` | host assumptions و auth model جدید شود |
| `src/lib/services/supernode.ts` | `src/lib/services/apps.ts`, `deployments.ts`, `integrations.ts`, `workflow-runs.ts` | `drop` | فایل monolithic قدیمی نباید مستقیم منتقل شود |

## stores mapping

| فایل فعلی | مقصد پیشنهادی | status | توضیح |
| :--- | :--- | :--- | :--- |
| `src/lib/stores/agents.ts` | `src/lib/stores/projects.ts`, `apps.ts`, `builder.ts` | `rewrite` | state جدید باید domain-based باشد نه agent-MVP-based |

## data and types mapping

| فایل فعلی | مقصد پیشنهادی | status | توضیح |
| :--- | :--- | :--- | :--- |
| `src/lib/data/mcp-registry.json` | `src/lib/data/mcp-registry.json` یا `packages/shared` | `archive` | فقط اگر MCP در phase فعلی لازم شد |
| `src/lib/data/mcp-registry.ts` | `src/lib/data/mcp-registry.ts` | `archive` | phase بعدی |
| `src/lib/types/index.ts` | `src/lib/types/apps.ts`, `deployments.ts`, `integrations.ts`, `workflow-runs.ts` | `split` | domain types باید تفکیک شوند |
| `src/lib/types/mcp.ts` | `src/lib/types/mcp.ts` | `archive` | فعلاً اختیاری |
| `src/lib/utils.ts` | `src/lib/utils/index.ts` | `rewrite` | فقط utilهای عمومی نگه داشته شوند |
| `src/lib/index.ts` | `src/lib/index.ts` | `rewrite` | export surface جدید تعریف شود |

## page-level migration order

1. `layout/*`
2. `ui/*`
3. `dashboard/*`
4. `projects/*`
5. `builder/*`
6. `deployments/*`
7. `workflows/*`
8. `settings/*`

## files that must not cross the boundary unchanged

این فایل‌ها نباید بدون rewrite وارد portal جدید شوند:

- `src/lib/services/supernode.ts`
- `src/lib/api/client.ts`
- `src/lib/components/global/main-router.svelte`
- `src/lib/components/chat/GlobalChat.svelte`
- هر فایلی که مستقیم `fetch` به hostهای قدیمی می‌زند
- هر فایلی که hash-based navigation را مبنا می‌گیرد

## final migration rule

برای هر فایل، قبل از ورود به portal جدید این سه سوال باید پاسخ داده شود:

1. آیا این فایل فقط UI است یا data contract هم داخل خودش دارد؟
2. آیا domain language آن هنوز متعلق به stack قدیمی است؟
3. آیا deployment/runtime assumption قدیمی را به استک جدید نشت می‌دهد؟

اگر پاسخ هرکدام مثبت بود، status آن فایل باید `rewrite`, `split`, یا `drop` بماند، نه `keep`.
