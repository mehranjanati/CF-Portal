# Legacy Context Imported for Cloudflare Stack

این سند فقط بخش‌های مفید استک قبلی را برای شروع استک جدید نگه می‌دارد.
هدف این نیست که معماری قبلی را ادامه دهیم؛ هدف این است که ایده‌های قابل استفاده را از آن استخراج کنیم.

## چیزهایی که از استک قبلی نگه می‌داریم

### 1. Template-Driven App Generation

از استک قبلی این ایده ارزشمند باقی می‌ماند:

- به‌جای تولید کامل کد از صفر، از templateهای آماده استفاده کنیم
- AI بیشتر نقش `configurator` و `patch generator` داشته باشد تا code generator مطلق
- template registry بخشی از product foundation باشد

این ایده از نظر Cloudflare stack هم مفید است، چون:

- buildها سریع‌تر می‌شوند
- failure surface کوچک‌تر می‌شود
- preview/deploy با `GitHub Actions` و `Cloudflare` قابل‌اتکاتر می‌شود

### 2. SvelteKit as Primary UI Layer

از اسناد قبلی روشن است که `SvelteKit` برای portal و app-facing frontend انتخاب مناسبی بوده و این تصمیم همچنان معتبر است.

در استک جدید:

- `Portal` با `SvelteKit + Workers` یا `Pages` می‌نشیند
- app templateهای frontend نیز می‌توانند SvelteKit-first باقی بمانند

### 3. User-Centric Git Ownership

منطق قدیمی `GitOps` هنوز مفید است:

- repo روی account کاربر باشد
- workflowها داخل repo کاربر ذخیره شوند
- کاربر مالک کامل سورس‌کد و CI/CD باشد

اما در استک جدید، target نهایی دیگر `GitHub Pages/Vercel/Wazero` نیست؛ target نهایی `Cloudflare Pages/Workers` است.

### 4. Clear Separation Between Control Plane and Runtime

از معماری قبلی یک اصل مهم را حفظ می‌کنیم:

- لایه builder/control plane از runtime اپ کاربر جدا باشد
- metadata, audit trail, deployment history و orchestration state در لایه platform نگه‌داری شوند
- execution نهایی در محیطی جدا از کنترل‌پلین انجام شود

در استک جدید این اصل به این صورت ترجمه می‌شود:

- `control plane` روی Cloudflare services مربوط به خود محصول
- `runtime` روی Cloudflare account خود کاربر

### 5. Artifact and Metadata Separation

تفکیک artifact و metadata از قبل ایده درستی بوده و باید حفظ شود:

- metadata در `D1`
- artifactها, log summaries, snapshots در `R2`

این تصمیم جایگزین خوبی برای مدل قدیمی `Postgres/TiDB + MinIO/IPFS` در فاز شروع است.

## چیزهایی که دیگر baseline نیستند

این اجزا در استک جدید فقط historical context هستند و نباید به عنوان پیش‌فرض implementation استفاده شوند:

- `Go Server`
- `Bun BFF`
- `Temporal`
- `Podman`
- `Redis`
- `Redpanda`
- `Postgres`
- `TiDB`
- `MinIO`
- `IPFS`
- `Wazero` runtime
- `TinyGo` as default execution model

## چیزهایی که فقط در صورت نیاز بعدی برمی‌گردند

برخی ایده‌های قدیمی ممکن است بعداً به شکل محدود برگردند، اما فعلاً پایه طراحی نیستند:

- `Rust/Wasm` برای performance modules
- advanced orchestration patterns
- richer event pipelines
- enterprise integration layers

## ترجمه نهایی به زبان استک جدید

اگر بخواهیم essence استک قبلی را به استک جدید ترجمه کنیم:

- `Portal` حفظ می‌شود، اما روی Cloudflare
- `GitOps` حفظ می‌شود، اما با deploy به Cloudflare account کاربر
- `Template registry` حفظ می‌شود، اما برای buildهای سبک‌تر و production-friendly
- `Metadata discipline` حفظ می‌شود، اما با `D1 + R2`
- `Runtime server of our own` حذف می‌شود
