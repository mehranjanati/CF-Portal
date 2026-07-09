# تحلیل عمیق `wasmCloud` برای استک پلتفرم و سناریوهای self-hosted

## هدف این سند

این سند برای پاسخ به این سوال نوشته شده است:

- آیا `wasmCloud` واقعاً می‌تواند workloadهای کاربر را روی سرور شخصی، edge node یا حتی دسکتاپ خود کاربر اجرا کند؟
- آیا می‌شود agentهایی مثل crawler، fetcher، connector یا data processor را با `Go/TinyGo` یا زبان‌های دیگر ساخت و روی `wasmCloud` اجرا کرد؟
- آیا `Redis`، دیتابیس‌ها، secretها، messaging و backendهای مختلف در این مدل قابل استفاده هستند؟
- این قابلیت‌ها برای استک فعلی ما چه مزیت و چه هزینه‌ای دارند؟

این سند مکمل addendum موجود در [CLOUDFLARE_FIRST_ECOSYSTEM.md](file:///Users/elbaan/Documents/cloudflare/CLOUDFLARE_FIRST_ECOSYSTEM.md) است و به‌صورت خاص روی `Track C: wasmCloud Self-Hosted Runtime` تمرکز دارد.

## پاسخ کوتاه

بله. `wasmCloud` برای این سناریوها مناسب است:

- اجرای agent یا module روی سرور شخصی مشتری
- اجرای capabilityهای نزدیک به داده یا نزدیک به شبکه خصوصی
- اجرای workload روی edge gateway یا دستگاه سبک
- اجرای محلی روی `macOS`، `Windows` یا `Linux`
- اتصال componentها به `Redis`، `Blobstore`، `HTTP`، messaging و بعضی دیتابیس‌ها از طریق interface و binding

اما چند نکته مهم وجود دارد:

- `wasmCloud` یک platform/runtime fabric است، نه یک محصول builder کامل شبیه `VibeSDK`
- مدل آن بر پایه `Wasm components + services + host plugins + manifests + OCI artifacts` است
- برای `Go` باید فعلاً روی `TinyGo` حساب کرد، نه standard Go compiler
- همه backendها first-party و آماده نیستند؛ بعضی‌ها interface رسمی دارند، بعضی‌ها نیاز به plugin یا service سفارشی دارند
- برای استک ما، `wasmCloud` بهترین نقش را به‌عنوان `optional self-hosted execution plane` دارد، نه جایگزین کل Cloudflare control plane

## برداشت مستقیم از مستندات

### 1. مدل workload در `wasmCloud`

طبق مستندات رسمی `wasmCloud v2`، هر workload از یک یا چند `component` و در صورت نیاز یک `service` تشکیل می‌شود:

- `Components` باینری‌های `.wasm` قابل‌حمل و معمولاً stateless هستند
- `Services` پردازه‌های long-running و stateful داخل boundary همان workload هستند

مرجع:

- [Workloads](https://wasmcloud.com/docs/overview/workloads/)

این distinction برای ما خیلی مهم است:

- crawler logic، parser، transformer، ranking و ingestion lightweight معمولاً بهتر است `component` باشند
- connection pool، cron loop، TCP listener، bridge به serviceهای محلی یا cache/local daemon بهتر است `service` باشند

### 2. مدل امنیتی

در `wasmCloud`، Wasm component به‌صورت `deny-by-default` اجرا می‌شود.  
یعنی component خودش:

- file access ندارد
- network access آزاد ندارد
- syscall دلخواه ندارد
- فقط interfaceهایی را دارد که صریحاً bind شده‌اند

مراجع:

- [wasmCloud v2 overview](https://wasmcloud.com/blog/wasmcloud-v2-is-here/)
- [Platform overview](https://wasmcloud.com/docs/)

برای استک ما این نکته بسیار مهم است، چون اگر third-party agent، template-generated module، یا user-authored automation بخواهد اجرا شود، این مدل امنیتی بسیار طبیعی‌تر از اجرای container باز است.

### 3. اجرای روی سرور شخصی و دسکتاپ

مستندات `v2` و `v2 RC` صراحتاً می‌گویند runtime می‌تواند به‌صورت standalone روی hostهای `Linux`، `macOS` و `Windows` اجرا شود:

- bare metal
- VM
- IoT gateway
- CI runner
- edge node
- دسکتاپ کاربر

مراجع:

- [wasmCloud v2 RC overview](https://wasmcloud.com/docs/v2.0.0-rc/)
- [Installation](https://wasmcloud.com/docs/installation/)

بنابراین پاسخ عملی این است:

- بله، می‌توان local runtime برای developer یا customer داشت
- بله، می‌توان agent را روی لپ‌تاپ یا مینی‌سرور کاربر اجرا کرد
- بله، می‌توان cluster چند host یا single-host mode داشت

اما:

- برای desktop product باید runtime را بسته‌بندی، آپدیت، مانیتور و bootstrap کنید
- `wasmCloud` خودش desktop app framework نیست؛ بیشتر یک host/runtime است که می‌تواند در پشت یک desktop app یا local service اجرا شود

## قابلیت‌های واقعی مرتبط با `Redis`، دیتابیس و سرویس‌های backend

### 1. `Redis`

بله، این بخش کاملاً واقعی و مستند است.

در capability catalog قدیمی‌تر `wasmCloud` برای `wasi:keyvalue` providerهای زیر دیده می‌شوند:

- `Redis`
- `NATS`
- `Vault`

مراجع:

- [Capability Catalog](https://wasmcloud.com/docs/capabilities/)
- [Linking at Runtime](https://wasmcloud.com/docs/concepts/linking-components/linking-at-runtime/)
- [Deploy and Scale](https://wasmcloud.com/docs/tour/deploy-and-scale/)

نکته مهم:

- سند catalog بیشتر از lineage نسخه `v1` می‌آید و naming امروز `v2` تغییر کرده
- در `v2` به‌جای تمرکز روی واژه قدیمی `capability provider`، بیشتر با `host plugins` و `services` روبه‌رو هستیم
- اما از نظر عملی، اتصال یک component به key-value backend مثل `Redis` همچنان یک الگوی رسمی و مستند است

برای سناریوی شما:

- agent crawler می‌تواند داده crawl شده را از طریق `wasi:keyvalue` یا یک interface مشابه داخل Redis بنویسد
- خود component لازم نیست بداند backend واقعی `Redis` است یا implementation دیگری
- binding در manifest/runtime تعیین می‌شود

### 2. دیتابیس

بله، ولی با یک تفاوت مهم:

- `wasmCloud` برای بعضی backendها interface/adapter روشن‌تری دارد
- برای بعضی backendها باید custom plugin, bridge service یا external API استفاده کنید

در capability catalog قدیمی، `Postgres` به‌عنوان interface/provider جداگانه آمده است:

- [Capability Catalog](https://wasmcloud.com/docs/capabilities/)

اما برای دیتابیس‌ها باید این را دقیق بفهمیم:

- `wasmCloud` دیتابیس نیست
- `wasmCloud` لایه abstraction و execution است
- component شما ideally فقط یک contract را می‌بیند
- host/runtime/plugin تصمیم می‌گیرد درخواست به چه backendی برود

### 3. درباره `TiDB`

در مستندات رسمی‌ای که بررسی شد، `TiDB` به‌عنوان first-party target رسمی و مستقیم ذکر نشده است.

پس نتیجه دقیق این است:

- می‌شود backendهای توزیع‌شده مثل `TiDB` را پشت service/plugin قرار داد
- ولی نباید فعلاً ادعا کنیم `TiDB` همان‌قدر first-class و آماده‌ی مصرف است که `Redis` یا `Postgres`
- اگر `TiDB` را بخواهیم، مسیر واقع‌بینانه یکی از این‌هاست:
  - bridge service با پروتکل `HTTP/gRPC`
  - plugin سفارشی
  - استفاده از compatibility layer در صورتی که workload عملاً از contract سازگار بهره ببرد

### 4. Secret و config

در `v2`، config و secretها از طریق environment/configuration model و در operator docs به‌شکل صریح تعریف شده‌اند.

مراجع:

- [Secrets and Configuration Management](https://wasmcloud.com/docs/kubernetes-operator/operator-manual/secrets-and-configuration/)
- [Inject Config from ConfigMaps and Secrets](https://wasmcloud.com/docs/recipes/inject-configuration-from-configmaps-and-secrets/)

برای self-hosted track این خیلی مهم است:

- customer می‌تواند secretهای runtime خودش را نگه دارد
- component فقط config contract را می‌بیند
- لازم نیست secretها از control plane ما عبور کنند

### 5. `HTTP`، messaging و blob/object storage

در capability docs و examples، این نوع integrationها هم بخشی از الگوی رسمی هستند:

- `wasi:http`
- `wasi:blobstore`
- `wasi:keyvalue`
- messaging interfaceها مثل `NATS` یا `Kafka` در نسل provider model

مراجع:

- [Capability Catalog](https://wasmcloud.com/docs/capabilities/)
- [Go language guide](https://wasmcloud.com/docs/wash/developer-guide/language-support/go/)

برای استک ما این یعنی:

- ingestion از HTTP endpoint
- ذخیره در Redis
- ارسال event به message bus
- انتقال artifact به blob/object storage

همه در مرز abstraction `wasmCloud` قابل مدل‌سازی هستند.

## تحلیل سناریوی شما: crawler agent + Redis

### آیا شدنی است؟

بله، کاملاً.

یک سناریوی استاندارد می‌تواند این‌گونه باشد:

1. یک `component` با `Go/TinyGo` یا `Rust` صفحه‌ها/APIها را fetch می‌کند
2. crawler محتوا را parse و normalize می‌کند
3. خروجی در `Redis` یا store دیگری از طریق interface نوشته می‌شود
4. یک `service` اختیاری queue polling، scheduler یا connection pool را نگه می‌دارد
5. در صورت نیاز، داده بعداً به DB سنگین‌تر یا search index منتقل می‌شود

### component بهتر است یا service؟

برای crawler دو الگوی درست وجود دارد:

- `Stateless Crawl Worker`
  - با `component`
  - مناسب jobهای کوتاه، پردازش صفحه، transform، summarize، extract
- `Long-running Crawl Coordinator`
  - با `service`
  - مناسب scheduler، retry loop، rate limit coordination، persistent connection و state محلی

بهترین مدل برای شما معمولاً hybrid داخل یک workload است:

- یک `service` coordinator
- چند `component` worker

### آیا برای Go مناسب است؟

بله، ولی با قید `TinyGo`.

طبق راهنمای `Go (TinyGo)`:

- build target باید `wasip2` باشد
- codegen با `wit-bindgen-go` انجام می‌شود
- subset بزرگی از Go پشتیبانی می‌شود
- goroutineها و بخش زیادی از stdlib قابل استفاده‌اند

مرجع:

- [Go (TinyGo) Language Guide](https://wasmcloud.com/docs/wash/developer-guide/language-support/go/)

اما باید واقع‌بین بود:

- این تجربه برابر با اجرای کامل standard Go روی لینوکس نیست
- بعضی libraryها به دلیل تکیه بر syscallها، CGO یا runtime assumptions قابل‌استفاده نیستند
- اگر crawler شما به browser automation کامل، headless Chromium یا libraryهای سنگین native نیاز دارد، Wasm component انتخاب اول نیست

### نتیجه برای crawler

اگر crawler شما:

- HTTP fetch می‌کند
- HTML parse می‌کند
- data extract می‌کند
- به Redis/DB/store می‌نویسد
- scheduling سبک یا queue-based دارد

`wasmCloud` گزینه خوبی است.

اگر crawler شما:

- مرورگر واقعی می‌خواهد
- JS runtime سنگین می‌خواهد
- rendering کامل DOM لازم دارد
- به binary dependencyهای native وابسته است

باید آن قسمت را خارج از Wasm نگه دارید یا در `Super Node`/service خارجی اجرا کنید.

## قابلیت‌های مهم برای استک ما

### 1. runtime link و backend swapping

یکی از مهم‌ترین قابلیت‌های `wasmCloud` این است که component به interface وصل می‌شود، نه به vendor خاص.

مرجع:

- [Linking at Runtime](https://wasmcloud.com/docs/concepts/linking-components/linking-at-runtime/)

برای ما این یعنی:

- همان crawler می‌تواند در dev به Redis لوکال وصل شود
- در production به Redis managed وصل شود
- یا حتی به implementation دیگری از key-value بدون تغییر business logic وصل شود

این دقیقاً همان چیزی است که user request شما می‌خواست:

- تست و production با کمترین تغییر
- backend independence
- جایگزینی storage بدون بازنویسی Wasm logic

### 2. localhost داخلی workload

در community callهای `v2` و feature notes، مفهوم `localhost` داخلی workload و ارتباط component با service روی TCP مطرح شده است.

مراجع:

- [Community transcript, Feb 2026](https://wasmcloud.com/community/2026-02-18-community-meeting-transcript/)
- [Community transcript, Jan 2026](https://wasmcloud.com/community/2026-01-21-community-meeting-transcript/)

این برای ما فوق‌العاده مهم است چون اجازه می‌دهد:

- یک service long-running داخل workload روی TCP گوش کند
- component stateless به آن وصل شود
- connection pooling، bridge service، local adapter و protocol translation داخل همان workload انجام شود

این الگو برای موارد زیر عالی است:

- DB connection pool
- local inference bridge
- protocol adapter
- queue bridge
- scraper coordinator

### 3. custom hosts و host plugins

طبق مستندات `v2` و معرفی `wash-runtime`:

- می‌توان custom host ساخت
- می‌توان host را با pluginها و قابلیت‌های اختصاصی توسعه داد

مراجع:

- [wasmCloud v2 is here](https://wasmcloud.com/blog/wasmcloud-v2-is-here/)
- [Hosts (v2 RC)](https://wasmcloud.com/docs/v2.0.0-rc/overview/hosts/)

برای ما این یعنی:

- اگر customer سخت‌افزار خاص، شبکه خاص یا backend خاص دارد، می‌توان host سفارشی‌تر داشت
- اگر بخواهیم integration proprietary داشته باشیم، لزوماً مجبور نیستیم component را آلوده به vendor logic کنیم

## سناریوهایی که کاربر می‌تواند روی سرور خودش یا دسکتاپ خودش داشته باشد

### 1. Local Crawler Node

روی لپ‌تاپ یا mini PC کاربر:

- runtime محلی اجرا می‌شود
- crawler از APIها یا سایت‌ها fetch می‌کند
- خروجی را در Redis محلی یا remote ذخیره می‌کند
- portal فقط health و job summary را می‌بیند

### 2. Private Connector Agent

داخل شبکه شرکت مشتری:

- component به CRM/ERP/DB داخلی وصل می‌شود
- داده خصوصی از شبکه خارج نمی‌شود
- فقط result summary یا sync metadata به control plane می‌آید

### 3. Edge Gateway Worker

روی gateway نزدیک device:

- eventها ingest می‌شوند
- فیلتر/aggregate محلی انجام می‌شود
- فقط داده لازم به cloud sync می‌شود

### 4. Super Node + Edge Agent

همان معماری نامتقارنی که قبلاً ثبت شد:

- `Super Node` برای query سنگین، queue، cache و DB bridge
- `Edge Agent` برای access محلی، crawl سبک، device adjacency و automation نزدیک به کاربر

### 5. Local Dev Parity

توسعه‌دهنده یا customer می‌تواند:

- artifact یکسان را لوکال اجرا کند
- بعداً همان artifact را روی host دیگر یا Kubernetes ببرد
- بدون recompilation بین محیط‌ها جابه‌جا شود

## محدودیت‌ها و واقعیت‌های عملی

### 1. `Go` یعنی `TinyGo`

این نکته باید در baseline تیم کاملاً شفاف باشد:

- `wasmCloud` برای Go فعلاً روی `TinyGo` بنا شده
- همه libraryهای Go سازگار نیستند
- اگر تیم شما heavily به runtime استاندارد Go، CGO یا native libs وابسته باشد، friction خواهید داشت

### 2. `wasmCloud` جایگزین browser automation کامل نیست

برای crawling سبک و HTTP-centric خوب است.  
برای سناریوهایی مثل:

- Playwright
- Chromium
- full JS rendering
- anti-bot heavy browsing

به‌تنهایی کافی نیست و باید از service خارجی یا node غیر-Wasm کمک بگیرید.

### 3. catalog و naming در حال گذار است

مستندات `v1`, `v2`, `v2 RC` و community notes هم‌زمان در دسترس‌اند.  
این یعنی:

- بعضی اصطلاحات مثل `capability provider` در lineage قدیمی‌تر هستند
- در `v2` بیشتر از `host plugins`, `services`, `workloads` و `runtime` حرف زده می‌شود
- برای design ما باید روی model مفهومی تکیه کنیم، نه اسم‌گذاری گذرا

### 4. عملیات و observability

اگر `wasmCloud` را وارد stack کنیم، باید این‌ها را هم طراحی کنیم:

- host registration
- cluster enrollment
- heartbeat summary
- target health
- OCI artifact lifecycle
- secret injection policy
- runtime update strategy
- log shipping

خود runtime فقط بخشی از مسئله را حل می‌کند.

## نتیجه برای استک ما

### چیزهایی که `wasmCloud` برای ما عالی حل می‌کند

- self-hosted execution
- on-prem and edge deployment
- Redis-backed agents
- runtime portability
- backend abstraction
- secure-by-default sandboxing
- local-to-prod artifact parity
- super-node / edge-agent topology

### چیزهایی که `wasmCloud` برای ما کامل حل نمی‌کند

- portal UX
- tenant control plane
- billing
- identity
- white-label delivery
- Cloudflare-native public edge delivery
- builder product experience شبیه `VibeSDK`

### جای درست آن در معماری ما

بنابراین جای درست `wasmCloud` در استک ما این است:

- `Cloudflare` برای control plane
- `Durable Objects` برای cluster/session coordination در سطح کنترل‌پلین
- `D1/R2/KV` برای metadata و artifact index
- `wasmCloud` برای execution plane اختیاری
- `Redis`, `Postgres`, `TiDB`, یا سایر backendها پشت service/plugin/contract

## جمع‌بندی تصمیم

### آیا `wasmCloud` برای crawler + Redis + self-hosted server منطقی است؟

بله.

### آیا برای desktop/local execution هم منطقی است؟

بله، اگر آن را به‌عنوان local runtime/service ببینیم، نه desktop app framework.

### آیا برای دیتابیس‌ها جواب می‌دهد؟

بله، اما با شدت‌های مختلف:

- `Redis`: بله، کاملاً نزدیک به الگوی رسمی
- `Postgres`: قابل‌پشتیبانی و مستند در lineage provider docs
- `TiDB`: ممکن است، ولی به‌عنوان target غیرمستقیم یا با bridge/plugin سفارشی

### آیا برای استک ما توصیه می‌شود؟

بله، به‌عنوان:

- `Optional self-hosted execution plane`
- نه به‌عنوان replacement برای کل Cloudflare stack

## پیشنهاد اجرایی

اگر بخواهیم این مسیر را عملی کنیم، ترتیب منطقی این است:

1. یک POC کوچک `crawler -> Redis` با `Go/TinyGo` یا `Rust` بسازیم
2. publish artifact را به OCI registry ببندیم
3. deployment target دوم `self-hosted-wasmcloud` را در metadata model رسمی کنیم
4. cluster-level control plane را با `Durable Objects` نگه داریم
5. فقط health summary و deployment status را از runtimeهای self-hosted به Cloudflare بیاوریم
6. قبل از ورود به `TiDB`، اول الگو را روی `Redis` و `Postgres` validate کنیم

## حکم نهایی

`wasmCloud` برای استک ما یک runtime جدی، واقعی و معماری‌ساز است؛ مخصوصاً برای:

- agentهای self-hosted
- connectorهای private
- crawlerهای نزدیک به داده
- edge execution
- topology نامتقارن `Super Node / Edge Agent`

اما باید آن را در جای درست خود نگه داریم:

- نه به‌عنوان جایگزین `Cloudflare control plane`
- نه به‌عنوان builder product
- بلکه به‌عنوان execution fabric برای Track C

