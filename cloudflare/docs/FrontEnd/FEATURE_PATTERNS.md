# Feature Patterns From Portal1

این سند به‌جای dump کامل همه feature componentها، patternهای مفید `portal1` را برای portal جدید خلاصه می‌کند.

## Dashboard Pattern

الگوی dashboard فعلی این ویژگی‌ها را دارد:

- health/status cards
- KPI summary widgets
- alert feed
- sparkline mini charts
- quick navigation actions

### چیزهای قابل reuse

- header structure
- metric card layout
- alert feed composition
- section spacing و card rhythm

### چیزهایی که باید حذف یا بازنویسی شوند

- checks مربوط به `Go Gateway`
- checks مربوط به `BFF`
- endpointهای legacy
- `localhost`-based health probing

## Projects Pattern

الگوی `Projects` در `portal1` به‌جای لیست static، draftهای agent را نشان می‌دهد.

### چیزهای قابل reuse

- grid card layout
- item selection behavior
- CTA pattern برای ساخت draft جدید
- status/meta rows در پایین هر card

### چیزهایی که باید بازنویسی شوند

- storeهای فعلی agents
- type modelهای agent قبلی
- runtime summaryهای وابسته به MVP قدیم

## Builder Pattern

الگوی `Builder` در `portal1` این قطعات UX را دارد:

- manifest/tool browser
- deploy form
- execution result panel
- workflow polling
- recent workflows and logs

### چیزهای قابل reuse

- 2-pane layout
- form/result split
- workflow feedback UI
- status surfacing pattern

### چیزهایی که باید از صفر نوشته شوند

- execute/poll contract
- manifest loading
- workflow data layer
- action naming

## Deployments Pattern

الگوی `Deployments` برای portal جدید هنوز خیلی مفید است چون:

- list + detail flow دارد
- status chips خوب دارد
- build/deploy metadata layout واضحی دارد
- right-side detail drawer pattern مناسبی دارد

### تغییر لازم

- متن‌ها از `WASM module deployments` به `Cloudflare app deployments` تغییر کنند
- actions با GitHub/Cloudflare terminology بازنویسی شوند

## Workflows Pattern

الگوی `Workflows` یک board-style view می‌دهد:

- running
- completed
- failed

### چیزهای قابل reuse

- kanban grouping
- workflow card layout
- priority pill
- artifact links area

### چیزهایی که باید عوض شوند

- عنوان `Temporal Workflows`
- step model قدیمی
- workflow status mapping قدیمی

## Migration Rule

برای هر feature این ترتیب رعایت شود:

1. اول UI pattern را نگه دار
2. متن و domain language را Cloudflare-first کن
3. dependencyهای service/store را حذف کن
4. data contract جدید را جداگانه وصل کن
