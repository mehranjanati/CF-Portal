# Master Plan: Path to MVP (Daily Tasks)

**هدف:** رسیدن به یک MVP (Minimum Viable Product) عملیاتی که در آن کاربر بتواند لاگین کند، پروژه بسازد، کدها در GitHub او کامیت شود، و روی اکانت Cloudflare او دیپلوی شده و لینک Preview در پورتال نمایش داده شود.

هر `Daily Plan` باید یک **خروجی قابل مشاهده، اتکا و تست (Tangible Outcome)** داشته باشد.

---utu

## � Documentation Gaps (Phase 0) - COMPLETED

### Operating Model Matrix
**هدف:** تعیین واضح مدل‌های عملیاتی (Free-Tier, Pro, Managed) و مرزهای ownership.
- **خروجی:** `docs/Architecture/OPERATING_MODEL_MATRIX.md`
- **وضعیت:** ✅ تکمیل شده

### AI Layer Contract  
**هدف:** تعریف contract استاندارد برای تمام تعاملات هوش مصنوعی (routing, fallback, templates, cost management).
- **خروجی:** `docs/AI/AI_LAYER_CONTRACT.md`
- **وضعیت:** ✅ تکمیل شده

### Managed Tier Migration Contract
**هدف:** تعریف کامل migration path از Free-Tier به Managed Tier با rollback procedures.
- **خروجی:** `docs/Architecture/MANAGED_TIER_MIGRATION.md`
- **وضعیت:** ✅ تکمیل شده

### Frontend Stack Review
**هدف:** بررسی کامل استک فرانت‌اند و شناسایی inconsistencies با بک‌اند برای CopilotKit integration.
- **خروجی:** `docs/FrontEnd/FRONTEND_STACK_REVIEW.md`
- **وضعیت:** ✅ تکمیل شده

---

## � Technical Debt & Future Work

### Phase 5: Managed Platform Tier (Future)
- Workers for Platforms integration
- Cloudflare for SaaS multi-tenancy
- Custom domains/subdomains
- Sandboxed execution environments

### Phase 4: AI & Memory Layer (Next)
- Vectorize integration for RAG
- Advanced memory management
- Context retrieval optimization
- Prompt caching strategies

---

## 🎯 Immediate Priorities (Next 30 Days)

1. ✅ Complete Phase 0 documentation (DONE)
2. 🔄 Daily Plan 17: CopilotKit integration (IN PROGRESS - Docs complete, ready for implementation)
3. ⏳ Daily Plan 18: Frontend streaming support (Dependent on 17)
4. ⏳ Daily Plan 19: Agent tool wrappers (Dependent on 18)
5. ⏳ Daily Plan 20: Integration testing & polish (Dependent on 17-19)

### Documentation Status
- ✅ Phase 0: 4 foundational docs complete
- ✅ Daily Plan 17: 6 task files with full frontend-backend coordination
- ✅ Daily Plan 18: 7 task files complete (~28h)
- ✅ Daily Plan 19: 7 task files complete (~23h)
- ✅ Daily Plan 20: 7 task files complete (~25h)
- ✅ Daily Plan 21: 7 task files complete (~23h)
- ✅ Daily Plan 22: 7 task files complete (~22h)
- ✅ Daily Plan 23: 7 task files complete (~22h)


## 📅 Daily Plan 1: Foundation & Portal Shell (پوسته اولیه)
**خروجی قابل مشاهده:** پورتال SPA با ساختار SvelteKit روی لوکال بالا می‌آید، شامل یک Layout اصلی (Sidebar/Topbar) و کامپوننت‌های پایه UI. هیچ خطای لینت یا بیلد وجود ندارد.
- **تسک‌ها:** در فایل `DAILY_TASK_01_PORTAL_SHELL.md`

## 📅 Daily Plan 2: Platform API Control Plane Foundation
**خروجی قابل مشاهده:** `platform-api` از حالت Worker تک‌فایل خارج شده و به یک `control plane API` ماژولار تبدیل می‌شود؛ روت‌های پایه `health`, `tenants`, `apps`, `deployments` ساختار استاندارد می‌گیرند و برای مرحله‌های بعدی `builder`, `workflow-runs`, و webhookهای CI/CD آماده می‌شود.
- **تسک‌ها:** در فایل `DAILY_TASK_02_PLATFORM_API.md`

## 📅 Daily Plan 3: Auth & Connections (اتصال به گیت‌هاب و کلادفلر)
**خروجی قابل مشاهده:** کاربر در پورتال می‌تواند روی دکمه "Connect GitHub" کلیک کند، فرآیند OAuth شبیه‌سازی/اجرا شود و توکن در دیتابیس ثبت شود. (برای Cloudflare هم فرم دریافت توکن کار کند).
- **تسک‌ها:** در فایل `DAILY_TASK_03_AUTH_CONNECTIONS.md`

## 📅 Daily Plan 4: Operational MVP Hardening
**خروجی قابل مشاهده:** کاربر می‌تواند یک workspace واقعی بسازد، project ایجاد کند، integrationهای GitHub و Cloudflare را ثبت کند، deployment record داشته باشد و همه این‌ها را در UI متصل به `platform-api + D1` ببیند.
- **تسک‌ها:** در فایل `DAILY_TASK_04_OPERATIONAL_MVP.md`

## 📅 Daily Plan 5: CI/CD Webhook & Real-time Status (مشاهده دیپلوی)
**خروجی قابل مشاهده:** GitHub Actions اجرا می‌شود، پس از پایان، Webhook به Platform API می‌خورد، و پورتال SPA بدون نیاز به رفرش (از طریق Polling یا SSE)، دکمه "View Preview" را با لینک واقعی روشن می‌کند.
- **تسک‌ها:** در فایل `DAILY_TASK_05_DEPLOY_STATUS.md`

## 📅 Daily Plan 6: AI Builder Agent MVP (تولید کد با هوش مصنوعی)
**خروجی قابل مشاهده:** یک چت‌باکس در پورتال، کاربر تایپ می‌کند "Add a counter component"، درخواست به AI Gateway می‌رود، خروجی در قالب یک کامیت جدید در برنچ `preview/feature` در گیت‌هاب کاربر اعمال می‌شود.
- **تسک‌ها:** در فایل `DAILY_TASK_06_AI_AGENT.md`

---

## 📅 Daily Plan 7: Portal Builder Foundation & Route Architecture
**خروجی قابل مشاهده:** مسیرهای `plan 7/TASK_07_01_PORTAL_BUILDER_FEATURE.md`

## 📅 Daily Plan 8: Advanced Preview & GitHub Deployment Loop
**خروجی قابل مشاهده:** UI پیش‌نمایش پیشرفته و حلقه دیپلوی GitHub کامل.
- **تسک‌ها:** در فایل `Daily plan 8/PLAN.md`

## 📅 Daily Plan 9: AGUI Parser & Tool Calling
**خروجی قابل مشاهده:** Parser برای AGUI و یکپارچه‌سازی با Svelte Runes.
- **تسک‌ها:** در فایل `Daily plan 9/PLAN.md`

## 📅 Daily Plan 10: SSE Connection & Agentic Loop
**خروجی قابل مشاهده:** اتصال SSE و حلقه اجرای Agent با مدیریت state.
- **تسک‌ها:** در فایل `Daily plan 10/PLAN.md`

## 📅 Daily Plan 11: Tools System (File, Terminal, Browser)
**خروجی قابل مشاهده:** سیستم ابزارهای File System، Terminal و Browser.
- **تسک‌ها:** در فایل `Daily plan 11/PLAN.md`

## 📅 Daily Plan 12: Advanced Preview System
**خروجی قابل مشاهده:** سیستم پیش‌نمایش پیشرفته با CodeMirror، Diff Viewer و File Explorer.
- **تسک‌ها:** در پوشه `Daily plan 12/`

## 📅 Daily Plan 13: AI Gateway Integration & Real LLM Provider
**خروجی قابل مشاهده:** جایگزینی Mock با AI Gateway واقعی، ارتباط با مدل‌های واقعی و مدیریت کش/فالبک.
- **تسک‌ها:** در پوشه `Daily plan 13/`

## 📅 Daily Plan 14: Testing, Error Handling & Production Hardening
**خروجی قابل مشاهده:** سیستم تست خودکار، پردازش خطا جامع، امنیت چند تنیانت، بهینه‌سازی عملکرد و آمادگی عملیاتی برای production.
- **تسک‌ها:** در پوشه `Daily plan 14/`
- **جزئیات:** 7 تسک کامل‌شده (~22 ساعت)

## 📅 Daily Plan 15: Multi-Agent Orchestration & Coordination
**خروجی قابل مشاهده:** چند ایجنت تخصصی (Builder, Reviewer, Tester, Deployer) با هماهنگی کامل، اجرای موازی و状態 machine برای مدیریت lifecycle کامل اپ.
- **تسک‌ها:** در پوشه `Daily plan 15/`
- **جزئیات:** 6 تسک کامل‌شده (~24 ساعت) - Cloudflare Workflows + Agents SDK

## 📅 Daily Plan 16: Agent Coder Ecosystem
**خروجی قابل مشاهده:** یک Agent Coder مرکزی که intent کاربر را می‌فهمد، ۶ ایجنت تخصصی را orchestrate می‌کند، گراف‌هایvisual builder را به Workflows کامپایل می‌کند و از طریق ۱۵ ابزار一站‌ای با Cloudflare تعامل دارد.
- **تسک‌ها:** در پوشه `Daily plan 16/`
- **جزئیات:** 6 تسک کامل‌شده (~24 ساعت) - Agent Coder + Visual Builder

## 📅 Daily Plan 17: CopilotKit Headless SDK Integration
**خروجی قابل مشاهده:** یکپارچه‌سازی کامل CopilotKit Headless SDK با پلتفرم - agent loop واقعی با streaming، state sync و AG-UI Protocol بین Svelte SPA و Cloudflare Workers.
- **تسک‌ها:** در پوشه `Daily plan 17/`
- **مستندات مرتبط:** `docs/FrontEnd/FRONTEND_STACK_REVIEW.md`

## 📅 Daily Plan 18: Frontend Streaming & State Sync
**خروجی قابل مشاهده:** اتصال کامل فرانت‌اند Svelte به backend با streaming واقعی - SSE infrastructure، Agent Phase Indicator، Tool Visualization، BuilderChat، Error HandlingUI و State Synchronization.
- **تسک‌ها:** در پوشه `Daily plan 18/` (پیش‌نیاز: Plan 17)
- **جزئیات:** 7 تسک کامل‌شده (~28 ساعت)

## 📅 Daily Plan 19: Agent Tool Wrappers
**خروجی قابل مشاهده:** وابسته‌سازی تمام toolهای موجود (AI, GitHub, Cloudflare, Browser) برای CopilotKit با schema validation، timeout/retry logic و circuit breaker.
- **تسک‌ها:** در پوشه `Daily plan 19/` (پیش‌نیاز: Plan 18)
- **جزئیات:** 7 تسک کامل‌شده (~23 ساعت)

## 📅 Daily Plan 20: Integration Testing & Polish
**خروجی قابل مشاهده:** تست‌های جامع integration، performance testing، error scenarios و آمادگی production.
- **تسک‌ها:** در پوشه `Daily plan 20/` (پیش‌نیاز: Plans 17-19)
- **جزئیات:** 7 تسک کامل‌شده (~25 ساعت)

## 📅 Daily Plan 21: Agent Tool Execution with Sandbox
**خروجی قابل مشاهده:** اجرای امن toolهای agent با sandbox، approval gates، observability و security hardening.
- **تسک‌ها:** در پوشه `Daily plan 21/` (پیش‌نیاز: Plans 17-20)
- **جزئیات:** 7 تسک کامل‌شده (~23 ساعت)

## 📅 Daily Plan 22: Memory & Context
**خروجی قابل مشاهده:** سیستم حافظه هوشمند با Vectorize (semantic)، KV (short-term)، D1 (persistent)، context management و prompt caching.
- **تسک‌ها:** در پوشه `Daily plan 22/` (پیش‌نیاز: Plans 17-21)
- **جزئیات:** 7 تسک کامل‌شده (~22 ساعت)

## 📅 Daily Plan 23: Multi-Agent Coordination
**خروجی قابل مشاهده:** سیستم هماهنگی چند ایجنت با orchestration، message bus، workflow patterns، load balancing و fault tolerance.
- **تسک‌ها:** در پوشه `Daily plan 23/` (پیش‌نیاز: Plans 17-22)
- **جزئیات:** 7 تسک کامل‌شده (~22 ساعت)

## 🎉 Milestone: Complete Agent Platform
**وضعیت:** تمام Plans 17-23 تکمیل شده ✅
**خروجی نهایی:** پلتفرم کامل Agent Builder با CopilotKit، streaming، tools، testing، sandbox، memory و multi-agent coordination.

