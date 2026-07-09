# Agents Integration Plan

**وضعیت:** Proposed  
**هدف:** تعریف plan اجرایی برای ورود `Cloudflare Agents SDK` به استک Nexus، با مشخص کردن agentهای day-1، مرز مسئولیت آن‌ها با `Platform API` و `Workflows`، مدل داده، lifecycle اجرا، و مسیر rollout

---

## 1. جواب کوتاه

`Agents SDK` باید از همین حالا بخشی از baseline معماری باشد، اما نه به‌عنوان جایگزین `V5`.

### یعنی چه؟

- `V5` همچنان baseline رسمی `free-tier` باقی می‌ماند
- `GitHub` همچنان source of truth کد است
- `GitHub Actions` همچنان build/deploy engine است
- `Agents SDK` لایه interactive و stateful orchestration می‌شود

### نتیجه

مدل درست این است:

- `Portal SPA = UI`
- `Platform API = control plane`
- `Agents SDK = conversational + stateful orchestration layer`
- `Workflows = durable background jobs`

---

## 2. چرا Agent لازم داریم؟

اگر فقط `Platform API` داشته باشیم، این بخش‌ها یا بسیار خشک می‌شوند یا مجبور می‌شویم دوباره آن‌ها را با abstractionهای adhoc بسازیم:

- session-aware builder
- realtime assistant
- multi-step user interaction
- approvals
- long-lived run context
- failure explanation
- tool-driven reasoning

`Agents SDK` دقیقاً برای همین دسته مسئله‌ها fit است.

### چیزهایی که Agent به ما می‌دهد

- durable identity
- local state
- local SQL
- scheduling
- realtime communication
- tool invocation
- MCP-native extensibility
- user/session scoped execution

---

## 3. اصل معماری

### Rule 1

Agent نباید source of truth کد باشد.

### Rule 2

Agent نباید deployment engine باشد.

### Rule 3

Agent نباید جای `Platform API` را بگیرد.

### Rule 4

Agent باید لایه interaction و orchestration نزدیک به user باشد.

### Rule 5

هر کار durable و multi-step که retry و schedule می‌خواهد، باید به `Workflows` سپرده شود.

### فرمول نهایی

- `Agent = interface + memory + reasoning + tool orchestration`
- `Workflow = durable executor`
- `Platform API = trusted control plane`

---

## 4. مرز مسئولیت‌ها

## 4.1 `Portal SPA`

مسئول:

- chat/workspace UI
- graph editor UI
- run trace display
- approvals UI
- settings/integrations screens

مسئول نیست:

- compile نهایی
- deploy
- secret custody
- durable job state

## 4.2 `Platform API`

مسئول:

- auth/session
- tenant/app metadata
- integration records
- authorization checks
- graph validation entrypoint
- compile entrypoint
- deployment records
- webhook handling

مسئول نیست:

- conversational state per run
- interactive reasoning loop
- realtime assistant session

## 4.3 `Agents SDK`

مسئول:

- interactive orchestration
- tool selection
- session memory
- user-facing explanation
- approvals gathering
- structured action proposals
- triggering workflows

مسئول نیست:

- owning canonical metadata tables
- owning final deploy state
- replacing CI/CD
- arbitrary compute sandbox

## 4.4 `Workflows`

مسئول:

- long-running jobs
- retries
- waits
- schedules
- compensating actions
- resumable execution

مسئول نیست:

- primary chat/session loop
- live conversational reasoning

---

## 5. agentهای day-1

برای v1 نباید agent explosion داشته باشیم.  
day-1 فقط این agentها baseline شوند:

### 5.1 `BuilderAgent`

مهم‌ترین agent سیستم.

#### مسئولیت‌ها

- فهم prompt کاربر
- تبدیل intent به template/spec
- تولید patch plan
- توضیح tradeoffها
- درخواست approval برای actions حساس
- trigger کردن flowهای generate/patch/deploy
- توضیح خطاهای build/deploy

#### مسئول نیست برای

- اجرای build محلی
- اجرای shell arbitrary
- deploy مستقیم بدون contract

### 5.2 `DeployExplainerAgent`

Agent تخصصی برای deploy و CI.

#### مسئولیت‌ها

- خواندن deployment state
- خلاصه‌سازی failure logs
- توضیح next action
- پیشنهاد repair patch
- explain کردن statusهای `draft`, `preview`, `failed`, `authorization_required`

#### ارزش

این agent بار UX پیچیدگی CI/CD را کم می‌کند.

### 5.3 `DocsAgent`

Agent تخصصی برای docs و Cloudflare guidance.

#### مسئولیت‌ها

- استفاده از docs Cloudflare
- map کردن featureها به product surfaces رسمی
- کمک به انتخاب template/capability
- explain کردن integration requirements

#### ارزش

باعث می‌شود builder guidance دقیق‌تر و Cloudflare-aligned شود.

### 5.4 `SupportAgent`

Agent برای support و troubleshooting سطح محصول.

#### مسئولیت‌ها

- triage اولیه
- explain کردن integration issues
- ارجاع کاربر به reconnect/setup steps
- summarize کردن وضعیت app و deployment

---

## 6. agentهایی که day-1 نیستند

این agentها می‌توانند بعداً اضافه شوند، اما baseline اولیه نیستند:

- `MarketplaceAgent`
- `WorkspaceAgent` چندکاربره
- `BillingAgent`
- `DomainSetupAgent`
- `MigrationAgent`

دلیل:

- scope v1 را زیاد می‌کنند
- قبل از تثبیت core builder ارزش کمتری دارند

---

## 7. مدل execution

## 7.1 Session model

هر interaction مهم باید داخل یک session یا thread قابل‌فهم اجرا شود.

### entityهای مفهومی

- `agent_session`
- `agent_run`
- `agent_message`
- `tool_call`
- `approval_request`

### اصل مهم

session state نزدیک خود Agent نگه داشته شود،  
ولی metadata مرجع در control plane ثبت شود.

---

## 7.2 Run model

هر run باید این مراحل را بتواند طی کند:

- `created`
- `planning`
- `awaiting_input`
- `awaiting_approval`
- `executing`
- `waiting_for_workflow`
- `completed`
- `failed`
- `cancelled`

### چرا مهم است؟

چون UI و audit trail باید از day-1 status model روشن داشته باشند.

---

## 7.3 Approval model

بعضی actionها نباید بدون تایید کاربر انجام شوند:

- commit/push
- trigger deploy
- connect/disconnect integration
- destructive changes
- production promotion

### flow

1. agent action proposal می‌سازد
2. UI approval card نشان می‌دهد
3. user approve/reject می‌کند
4. result به agent session برمی‌گردد
5. agent ادامه می‌دهد یا plan را بازنویسی می‌کند

---

## 8. Tooling contract

Agent نباید با APIهای پراکنده و آزاد کار کند.  
باید یک tool surface typed و محدود داشته باشد.

## 8.1 Tool families day-1

- `AppsTool`
- `TemplatesTool`
- `GraphTool`
- `GitHubTool`
- `CloudflareTool`
- `DeploymentsTool`
- `DocsTool`
- `ArtifactsTool`
- `ApprovalsTool`

### توضیح

این toolها لایه‌ای بالاتر از raw APIها هستند و باید business-safe باشند.

---

## 8.2 نمونه capabilityها

### `AppsTool`

- get app summary
- create app draft
- update app intent
- list app environments

### `TemplatesTool`

- list templates
- resolve best-fit template
- list capability packs

### `GraphTool`

- validate graph draft
- compile graph draft
- summarize graph issues

### `GitHubTool`

- connect repo metadata
- create branch plan
- create patch proposal
- read workflow status

### `CloudflareTool`

- list connected accounts
- get authorization status
- explain missing permissions

### `DeploymentsTool`

- list deployments
- get deployment detail
- summarize latest failure
- request preview deploy

### `DocsTool`

- fetch Cloudflare doc context
- explain product fit
- resolve recommended feature pattern

### `ApprovalsTool`

- create approval request
- read approval result

---

## 9. MCP strategy

`MCP` باید از day-1 در طراحی agentها دیده شود، ولی rollout آن کنترل‌شده باشد.

## 9.1 day-1 use

day-1 بهتر است این MCP surfaceها را داشته باشیم:

- docs/context MCP
- internal platform MCP tools
- later optional GitHub/Cloudflare external MCP alignment

## 9.2 اصل امنیتی

Agent نباید به ابزارهای unbounded دسترسی بگیرد.

یعنی:

- no arbitrary shell
- no arbitrary network
- no raw secret exposure
- no unrestricted file mutation خارج از flowهای رسمی

---

## 10. Data model پیشنهادی

در `D1` باید حداقل این entityها برای agent integration ثبت شوند:

- `agent_sessions`
- `agent_runs`
- `agent_messages`
- `agent_tool_calls`
- `approval_requests`
- `approval_events`

### ارتباط با entityهای دیگر

- `agent_sessions` به `users`, `tenants`, `apps` وصل می‌شوند
- `agent_runs` به `deployments` یا `workflow_runs` می‌توانند reference بدهند
- `approval_requests` باید به actor و target action وصل شوند

---

## 10.1 `agent_sessions`

- id
- tenant_id
- user_id
- app_id nullable
- agent_kind
- title
- status
- created_at
- updated_at

## 10.2 `agent_runs`

- id
- session_id
- agent_kind
- trigger_type
- input_snapshot_ref
- status
- started_at
- completed_at

## 10.3 `agent_messages`

- id
- session_id
- role = `user | agent | system | tool`
- content_ref or text
- created_at

## 10.4 `agent_tool_calls`

- id
- run_id
- tool_name
- input_json
- output_json_ref
- status
- started_at
- completed_at

## 10.5 `approval_requests`

- id
- run_id
- action_type
- target_type
- target_id
- summary
- status = `pending | approved | rejected | expired`
- requested_at
- resolved_at

---

## 11. Realtime model

برای UX خوب، agentها باید نتیجه را به‌صورت stream به UI برگردانند.

### UI باید این eventها را بفهمد

- message delta
- tool started
- tool completed
- approval requested
- workflow linked
- run completed
- run failed

### نتیجه

builder experience زنده و قابل‌درک می‌شود، بدون اینکه execution واقعی در browser اتفاق بیفتد.

---

## 12. رابطه با Graph Builder

در استک جدید visual graph builder و agent باید مکمل هم باشند، نه رقیب.

### الگوی درست

- user می‌تواند graph را دستی ویرایش کند
- user می‌تواند از agent بخواهد graph را بسازد یا اصلاح کند
- agent فقط از طریق `GraphTool` و contractهای رسمی روی graph عمل کند

### چیزی که نباید رخ دهد

- agent نباید graph را خارج از schema mutate کند
- UI نباید bypass مستقیم compiler داشته باشد

---

## 13. رابطه با `V5`

`Agents SDK` در `V5` باید این نقش را بگیرد:

- builder interaction
- patch planning
- failure explanation
- deploy assistance

### و عمداً این نقش‌ها را نگیرد

- build execution
- deployment runtime
- canonical source of code

### خلاصه

`V5` را نمی‌شکند؛  
بلکه آن را از حالت static control plane به product-grade assistant control plane ارتقا می‌دهد.

---

## 14. Error handling model

Agentها باید failure را ساختاریافته ببینند، نه به‌صورت log blob خام.

### categories

- `validation_error`
- `authorization_error`
- `integration_error`
- `workflow_error`
- `deployment_error`
- `unknown_error`

### expected behavior

- classify
- summarize
- propose next step
- request approval if needed
- optionally trigger retry workflow

---

## 15. Observability

حداقل observability لازم برای agent layer:

- session count
- run success/failure rates
- tool latency
- approval rate
- deployment assist success rate
- top failure categories

### storage

- summary metadata در `D1`
- detailed artifacts/logs در `R2`

---

## 16. rollout plan

## Phase 1: Foundation

### خروجی‌ها

- `agent_sessions` و `agent_runs` schema
- `BuilderAgent` skeleton
- typed tool surface اولیه
- realtime run stream به Portal

## Phase 2: Deploy Assist

### خروجی‌ها

- `DeployExplainerAgent`
- failure summarization
- approval flows برای deploy/commit
- workflow linkage

## Phase 3: Docs + Context

### خروجی‌ها

- `DocsAgent`
- docs/context retrieval
- Cloudflare pattern guidance

## Phase 4: Support Consolidation

### خروجی‌ها

- `SupportAgent`
- support triage
- integration troubleshooting

---

## 17. چیزهایی که عمداً خارج از scope هستند

- multi-agent swarm architecture
- arbitrary code execution by agents
- autonomous production deploy بدون approval
- fully autonomous repo mutation بدون guardrails
- cross-tenant shared memory
- collaborative multi-user agent sessions در v1

---

## 18. تصمیم‌های پیشنهادی

### Decision 1

`Agents SDK` baseline رسمی لایه interactive orchestration باشد.

### Decision 2

`BuilderAgent`, `DeployExplainerAgent`, `DocsAgent`, و `SupportAgent` تنها agentهای day-1 باشند.

### Decision 3

همه tool accessها typed و policy-controlled باشند.

### Decision 4

approval برای actionهای حساس اجباری باشد.

### Decision 5

`Workflows` برای jobهای durable و retry-heavy استفاده شوند، نه Agent session loop.

### Decision 6

source of truth کد همچنان `GitHub` بماند.

### Decision 7

`TypeScript` زبان اصلی تمام agentها و tool surfaces باشد.

---

## 19. نتیجه نهایی

`Agents SDK` برای Nexus یک feature فرعی نیست؛  
لایه‌ای است که محصول را از یک control plane صرف به یک builder platform واقعی تبدیل می‌کند.

اما موفقیت آن به این شرط است که مرزها شفاف بمانند:

- `Agent` برای گفتگو، state و orchestration
- `Workflow` برای durable execution
- `Platform API` برای control plane
- `GitHub Actions` برای build/deploy

### فرمول نهایی

- `Agent thinks and guides`
- `Workflow waits and executes`
- `Platform API governs`
- `GitHub Actions builds and deploys`

این مدل هم با `Cloudflare-first` سازگار است، هم با `V5`، و هم کم‌ریسک‌ترین مسیر برای آوردن agent-native experience به محصول است.
