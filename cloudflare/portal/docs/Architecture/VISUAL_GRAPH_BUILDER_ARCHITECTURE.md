# Visual Graph Builder Architecture

**وضعیت:** Proposed  
**هدف:** تعریف معماری Visual Graph Builder برای Nexus روی استک `Cloudflare-first` و پاسخ دقیق به این سؤال که آیا editor باید شبیه `Rivet` داخل `Portal SPA` ساخته شود یا نه

---

## 1. جواب کوتاه

### آیا Visual Graph Builder باید داخل فرانت `Portal SPA` هندل شود؟

**بله.**

اما با این قید مهم:

- editor و canvas باید داخل `Portal SPA` باشند
- state محلی editor باید در فرانت مدیریت شود
- persistence, validation, compile, preview, agent execution, workflow execution و publish نباید داخل فرانت قفل شوند

یعنی مدل درست این است:

- `Portal SPA = visual authoring surface`
- `Platform API = persistence + validation + compilation entrypoint`
- `Cloudflare runtime = execution/orchestration/publish`

### آیا باید خود `Rivet` را embed کنیم؟

**نه، پیشنهاد اصلی این نیست.**

پیشنهاد درست این است:

- UX را `Rivet-style` بگیریم
- ولی implementation را native برای `SvelteKit` و Portal خودمان بسازیم

### چرا؟

چون ما در استک جدید این واقعیت‌ها را داریم:

- Portal روی `SvelteKit` است
- data model و publish model مخصوص خودمان است
- compile target ما `Agents SDK`, `Workflows`, `MCP`, `GitHub Actions`, و بعداً `Sandbox/WFP` است
- ما فقط یک graph canvas نمی‌خواهیم؛ یک product-grade builder می‌خواهیم

---

## 2. تصمیم نهایی پیشنهادی

### Recommendation

`Visual Graph Builder` باید به‌صورت یک feature بزرگ درون `Portal SPA` ساخته شود، نه:

- اپلیکیشن جدا
- iframe editor
- ابزار خارجی embed شده
- runtimeی که مستقیماً جای platform contractهای ما را بگیرد

### الگوی درست

در داخل Portal این بخش‌ها را می‌سازیم:

- graph canvas
- node palette
- node inspector
- edge rules
- run/debug panel
- validation panel
- publish/export panel

و این بخش‌ها را بیرون از فرانت نگه می‌داریم:

- graph persistence API
- compile service
- workflow generation
- agent run orchestration
- preview orchestration
- deploy/export orchestration

---

## 3. چرا `Portal SPA` بهترین جاست؟

## 3.1 به خاطر product cohesion

builder بخشی از همان portal است و کنار featureهای دیگر قرار می‌گیرد:

- projects
- deployments
- workflows
- integrations
- settings

اگر visual builder را اپ جدا کنیم:

- auth context جدا می‌شود
- app/project selection جدا می‌شود
- draft/publish UX تکه‌تکه می‌شود
- navigation و state sharing سخت می‌شود

---

## 3.2 به خاطر realtime UX

یک editor نودی خوب این رفتارها را می‌خواهد:

- drag/drop روان
- keyboard shortcuts
- pane zoom/pan
- quick node search
- inline validation
- side inspector
- live run status
- selection state

این‌ها همگی طبیعی‌تر هستند وقتی editor یک SPA feature باشد.

---

## 3.3 به خاطر Cloudflare model

در استک ما:

- portal روی Cloudflare می‌نشیند
- API روی Workers می‌نشیند
- agent/workflow runtime روی Cloudflare می‌نشیند

پس authoring surface هم بهتر است در همان web app اصلی زندگی کند و فقط به backend contractهای Cloudflare-native وصل شود.

---

## 4. چرا embed کردن مستقیم `Rivet` یا چیزی شبیه آن پیشنهاد اصلی نیست؟

## 4.1 mismatch در domain model

`Rivet` یک visual AI programming environment است.  
ما اما product خودمان را می‌سازیم و graph ما صرفاً graph prompt نیست.

Graph ما باید این چیزها را مدل کند:

- app/module intent
- tool calls
- workflows
- approvals
- publish semantics
- deploy/export targets
- product capability packs

پس اگر editor خارجی را مستقیم وارد کنیم، خیلی زود domain mismatch به‌وجود می‌آید.

---

## 4.2 mismatch در runtime targets

targetهای ما این‌ها هستند:

- `Agents SDK`
- `Cloudflare Workflows`
- `MCP`
- `GitHub Actions`
- `Sandbox SDK`
- `Workers for Platforms`

این‌ها دقیقاً معادل runtimeهای Rivet نیستند.

پس بهتر است:

- UX الهام‌گرفته باشد
- ولی graph IR و compiler کاملاً مخصوص خودمان باشند

---

## 4.3 mismatch در frontend stack

Portal جدید `SvelteKit` است.  
بردن یک editor سنگین React-based یا runtime خارجی به داخل Portal احتمالاً این مشکلات را می‌آورد:

- bridge complexity
- styling inconsistency
- shared state complexity
- harder SSR/hydration boundaries
- maintenance burden

### نتیجه

اگر قرار است editor داخل Portal زندگی کند، بهتر است implementation هم تا حد ممکن Svelte-native باشد.

---

## 5. پس چه چیزی را باید از `Rivet` بگیریم؟

### چیزهایی که باید الهام بگیریم

- node palette UX
- context menu add-node
- port-based connections
- subgraph mental model
- live debugging
- run trace visualization
- node config inspector
- graph readability patterns

### چیزهایی که نباید import خام شوند

- domain/runtime assumptions
- node taxonomy آماده
- execution semantics آماده
- project model آماده

### فرمول درست

- `Rivet-style UX`
- `Nexus-native schema and compiler`

---

## 6. گزینه‌های پیاده‌سازی canvas

## Option A: ساخت editor از صفر

### مزایا

- کنترل کامل
- domain-first design
- بدون dependency سنگین

### معایب

- هزینه توسعه خیلی بالا
- ریسک بالا در drag/drop, pan/zoom, handles, selection
- زمان‌بر برای رسیدن به quality مناسب

### نتیجه

برای MVP توصیه نمی‌شود.

---

## Option B: استفاده از graph engine سازگار با `Svelte`

### Recommendation

این بهترین گزینه است.

به‌جای ساخت همه‌چیز از صفر، باید از یک graph/canvas engine استفاده کنیم و product layer را روی آن بسازیم.

### candidate اصلی

- `@xyflow/svelte` / `Svelte Flow`

### چرا این گزینه خوب است؟

- مخصوص `Svelte` است
- node-based UI برای use caseهای مشابه دارد
- custom nodes و custom edges می‌دهد
- controls, minimap, background می‌دهد
- پایه خوبی برای editor product-grade است

### چیزی که این library حل نمی‌کند

- graph schema
- domain semantics
- validation rules
- compile pipeline
- publish logic
- permission model

پس این library باید **rendering engine** باشد، نه کل architecture.

---

## Option C: آوردن React-based graph editor درون Portal

### مزایا

- ecosystem بزرگ‌تر
- مثال‌های زیاد

### معایب

- mismatch با `SvelteKit`
- boundary complexity
- maintenance و styling pain
- integration cost

### نتیجه

فقط اگر واقعاً feature criticalی داشته باشد که در Svelte-equivalent پیدا نشود، بررسی شود.  
برای baseline توصیه نمی‌شود.

---

## Option D: استفاده مستقیم از خود `Rivet`

### مزایا

- editor آماده
- mental model جاافتاده

### معایب

- domain mismatch
- runtime mismatch
- compile target mismatch
- integration سنگین
- احتمال قفل شدن product semantics به ابزار بیرونی

### نتیجه

به‌عنوان مرجع UX خوب است،  
به‌عنوان foundation رسمی builder پیشنهاد نمی‌شود.

---

## 7. معماری پیشنهادی

## 7.1 لایه‌ها

### Layer 1: Graph UI Layer

داخل `Portal SPA`:

- canvas
- nodes
- edges
- palette
- inspector
- shortcuts
- local undo/redo
- selection state

### Layer 2: Graph State Layer

داخل Portal:

- current graph draft
- dirty state
- local validation markers
- panel layout state
- selected node/edge
- transient run/debug state

### Layer 3: Graph Schema Layer

یک schema typed که تعریف می‌کند:

- node kinds
- input/output ports
- edge constraints
- config forms
- default values
- allowed targets

### Layer 4: IR Layer

یک representation میانی که از UI مستقل است:

- graph metadata
- typed nodes
- typed edges
- execution boundaries
- approvals
- runtime intents
- publishability flags

### Layer 5: Compile Layer

Backend-driven:

- IR -> agent plan
- IR -> workflow definition
- IR -> MCP tool bindings
- IR -> GitHub/export contract

### Layer 6: Execution Layer

روی Cloudflare:

- `Agents SDK`
- `Workflows`
- `D1/R2`
- optional `Sandbox SDK`
- later `Workers for Platforms`

---

## 7.2 قانون طلایی

UI هیچ‌وقت نباید مستقیماً runtime primitiveها را مدل نهایی بداند.

یعنی:

- UI نباید مستقیم `Workflows` JSON نهایی باشد
- UI نباید مستقیم `Agent` code نهایی باشد
- UI نباید مستقیم `GitHub Action` YAML نهایی باشد

بلکه باید:

- UI -> Graph Schema -> IR -> Compiler -> Runtime Targets

باشد.

این مهم‌ترین تصمیم معماری این سند است.

---

## 8. ساختار پیشنهادی feature در Portal

```text
src/lib/components/features/builder/
  GraphWorkspace.svelte
  GraphCanvas.svelte
  GraphToolbar.svelte
  GraphPalette.svelte
  GraphInspector.svelte
  GraphSidebar.svelte
  GraphMiniMap.svelte
  GraphRunPanel.svelte
  GraphValidationPanel.svelte
  GraphPublishPanel.svelte
  nodes/
    PromptNode.svelte
    ToolNode.svelte
    AgentNode.svelte
    WorkflowNode.svelte
    ApprovalNode.svelte
    TemplateNode.svelte
  edges/
    DefaultEdge.svelte
    ConditionalEdge.svelte
    ErrorEdge.svelte
src/lib/stores/builder/
  graph.ts
  selection.ts
  inspector.ts
  validation.ts
  runs.ts
src/lib/types/builder/
  graph.ts
  node-schema.ts
  ir.ts
  runtime-target.ts
src/lib/services/
  graph-definitions.ts
  graph-validation.ts
  graph-compile.ts
  graph-runs.ts
```

---

## 9. Node model پیشنهادی

## 9.1 Day-1 node families

به‌جای انفجار node typeها، day-1 فقط چند خانواده اصلی داشته باشیم:

- `InputNode`
- `PromptNode`
- `TransformNode`
- `ToolNode`
- `DecisionNode`
- `ApprovalNode`
- `AgentNode`
- `WorkflowNode`
- `TemplateNode`
- `PublishNode`

### چرا این کمینه خوب است؟

- یادگیری ساده‌تر
- compile ساده‌تر
- graphهای قابل‌فهم‌تر
- scope کنترل‌شده‌تر

---

## 9.2 Node config model

هر node باید schema-driven باشد:

- `kind`
- `title`
- `description`
- `ports`
- `configSchema`
- `defaults`
- `capabilityTags`
- `runtimeSupport`

### نتیجه

editor لازم نیست برای هر node hardcode-heavy شود.  
بخش زیادی از inspector و validation از schema تغذیه می‌شود.

---

## 10. تجربه کاربری پیشنهادی

## 10.1 الگوی interaction

الگوی editor بهتر است شبیه این باشد:

- click-to-select
- space/right-click برای add node
- drag from port to connect
- command palette برای node search
- side inspector برای config
- bottom panel برای runs/logs/errors

این همان چیزی است که از `Rivet` و editorهای mature باید بگیریم.

---

## 10.2 layout پیشنهادی

- center: graph canvas
- left: node palette / graph outline
- right: inspector / config forms
- bottom: run trace / validation / publish

### چرا این layout خوب است؟

چون با app shell فعلی Portal هم‌راستا است و featureهای دیگر را هم راحت کنار آن نگه می‌دارد.

---

## 11. persistence و collaboration

## 11.1 persistence

فرانت باید draft را سریع و محلی نگه دارد، ولی source of truth نهایی باید backend باشد.

### مدل پیشنهادی

- local in-memory state برای interaction سریع
- autosave debounced به Platform API
- draft versions در `D1`
- snapshots یا exports در `R2`

---

## 11.2 collaboration

day-1 collaborative editing لازم نیست baseline باشد.

### دلیل

- scope را خیلی بزرگ می‌کند
- conflict resolution را پیچیده می‌کند
- قبل از تثبیت graph schema ورودش زود است

### مسیر بعدی

اگر later خواستیم:

- presence و session state روی `Durable Objects`
- lock/lease model
- shared cursors
- optimistic patch stream

---

## 12. run/debug/publish flow

## 12.1 Run

وقتی کاربر روی `Run` می‌زند:

1. Portal graph draft را serialize می‌کند
2. Platform API validation را اجرا می‌کند
3. graph به IR compile می‌شود
4. target مناسب انتخاب می‌شود
5. agent/workflow run شروع می‌شود
6. trace به UI stream می‌شود

---

## 12.2 Publish

وقتی کاربر روی `Publish` می‌زند:

1. graph finalize می‌شود
2. capability/template contracts validate می‌شوند
3. output target تعیین می‌شود
4. artifactها تولید می‌شوند
5. GitHub/export/deploy path شروع می‌شود

---

## 13. آیا builder باید SPA-only باشد؟

### جواب دقیق

**authoring بله، execution نه.**

یعنی:

- authoring surface در SPA
- compile و publish در backend
- execution در Cloudflare runtime

اگر بخواهیم همه‌چیز را در فرانت نگه داریم، خیلی زود به این مشکلات می‌خوریم:

- security issues
- compile drift
- unstable publish semantics
- browser-limited execution

---

## 14. پیشنهاد نهایی درباره `Rivet-like` بودن

### بله به این‌ها

- editor نودی
- پورت‌ها و edgeها
- node inspector
- live traces
- subgraph patterns
- command-palette-driven authoring

### نه به این‌ها

- embed کردن خود ابزار بیرونی
- وابسته کردن product semantics به runtime آن
- قفل شدن روی taxonomy آماده

### فرمول اجرایی

- `Rivet-like experience`
- `Svelte-native implementation`
- `Cloudflare-native execution`

---

## 15. تصمیم‌های پیشنهادی

### Decision 1

`Visual Graph Builder` به‌عنوان feature رسمی داخل `Portal SPA` ساخته شود.

### Decision 2

برای canvas engine از یک graph library سازگار با `Svelte` استفاده شود، نه ساخت editor از صفر.

### Decision 3

`Svelte Flow` candidate baseline برای MVP باشد.

### Decision 4

graph model باید schema-driven و typed باشد.

### Decision 5

UI به IR compile شود و فقط IR به runtime targets ترجمه شود.

### Decision 6

خود `Rivet` فقط به‌عنوان reference UX و design inspiration دیده شود.

### Decision 7

collaborative editing از day-1 خارج از scope بماند.

---

## 16. نتیجه نهایی

اگر سؤال این باشد که:

**«visual builder را شبیه Rivet داخل فرانت Portal SPA بسازیم یا نه؟»**

جواب:

**بله، از نظر product architecture باید داخل Portal SPA باشد.**

اما:

- نه با embed مستقیم `Rivet`
- نه با runtime semantics خارجی
- نه با React-heavy bridge مگر مجبور شویم

### توصیه نهایی

بهترین مسیر برای این پروژه:

- `Portal SPA` به‌عنوان authoring surface
- `Svelte-native graph engine` برای canvas
- `schema-driven node system`
- `IR compiler`
- `Cloudflare-native execution targets`

این مسیر هم با `SvelteKit` هم‌راستاست، هم با تصمیم `Cloudflare-first`، و هم کم‌ریسک‌ترین جایگزین برای تجربه‌ای شبیه `Rivet` است.
