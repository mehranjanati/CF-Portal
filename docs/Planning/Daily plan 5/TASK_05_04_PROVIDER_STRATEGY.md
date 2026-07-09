# Task 05.4: Provider Strategy

## هدف

این بخش باید لایه provider را به شکل استاندارد و قابل تعویض تعریف کند تا `platform-api` بتواند از `v0` یا هر provider بعدی بدون آلودگی contractهای محصولی استفاده کند.

## دامنه

این workstream شامل موارد زیر است:

- تعریف interface استاندارد provider
- پیاده‌سازی adapter اولیه برای `v0`
- جداسازی response خام provider از model داخلی
- map کردن خطاها به contract پایدار API
- جلوگیری از direct dependency فرانت به provider SDK

## اصل معماری

فرانت فقط باید با contract داخلی محصول صحبت کند.

مدل درست:

```text
Portal -> Platform API -> Provider Adapter -> External Model
```

مدل نادرست:

```text
Portal -> Provider SDK
Portal -> Platform API
```

## ریزتسک‌ها

### 1. تعریف interface provider

interface حداقلی provider باید این مسئولیت‌ها را پوشش دهد:

- `generate()`
- `normalizeResult()`
- `mapError()`

در صورت نیاز، متدهای کمکی زیر هم می‌توانند اضافه شوند:

- `validateConfig()`
- `supportsTemplate()`
- `healthCheck()`

### 2. پیاده‌سازی `v0`

- `v0` به‌عنوان provider اول در backend اضافه شود.
- تمام credentialها فقط در server نگهداری شوند.
- adapter باید response خام `v0` را به `BuilderResult` داخلی map کند.

### 3. طراحی result normalization

خروجی provider باید حداقل به این مدل داخلی تبدیل شود:

- `summary`
- `files`
- `suggestedRoutes`
- `suggestedComponents`
- `nextActions`
- `metadata`

### 4. طراحی error mapping

خطاها باید به دسته‌های قابل فهم تبدیل شوند:

- `configuration_error`
- `rate_limit`
- `provider_unavailable`
- `invalid_prompt`
- `unknown_provider_error`

فرانت نباید stack trace یا متن خام provider را ببیند.

## فایل‌های درگیر

- `platform-api/src/modules/builder/providers/index.ts`
- `platform-api/src/modules/builder/providers/v0.ts`
- typeها یا interfaceهای provider در module builder
- config/env handling مرتبط

## جزئیات اجرایی

### ورودی provider

provider نباید payload خام UI را مستقیماً بگیرد. ورودی باید از قبل توسط service آماده شده باشد و شامل context معنادار باشد:

- `tenantId`
- `appId`
- `template`
- `intent`
- `prompt`
- metadata لازم برای tracing

### خروجی provider

provider باید خروجی را به یک model نرمال‌شده برگرداند تا routeها و فرانت با shape ثابت کار کنند.

### config

- کلیدها و tokenها فقط از env backend خوانده شوند.
- نبود config باید به خطای واضح setup تبدیل شود.
- dependency روی provider باید opt-in و قابل تعویض باشد.

## ملاحظات طراحی

- adapter باید قابل mock شدن برای تست باشد.
- provider selection بهتر است از ابتدا به صورت registry یا factory ساده پیاده شود.
- حتی اگر فعلاً فقط `v0` داریم، naming نباید تک-providerی باشد.

## وابستگی‌ها

- orchestration backend در Task 05.3
- schema result در Task 05.6
- نیازهای UX نتیجه generation در Task 05.1

## معیار پذیرش

- interface استاندارد provider تعریف شده است.
- `v0` به‌عنوان یک adapter backend پیاده‌سازی شده است.
- response خام provider به مدل داخلی normalize می‌شود.
- خطاهای provider به error contract قابل فهم API map می‌شوند.
- هیچ بخشی از `portal` به SDK خام provider وابسته نیست.

## تست‌ها

### تست‌های adapter

- provider با config معتبر بتواند `generate()` را اجرا کند.
- خروجی provider به shape داخلی expected تبدیل شود.
- response ناقص provider باعث crash service نشود.

### تست‌های خطا

- نبودن API key به `configuration_error` map شود.
- خطای rate limit به error type پایدار تبدیل شود.
- خطای ناشناخته به `unknown_provider_error` map شود.

### تست‌های معماری

- فرانت بدون import کردن SDK provider build شود.
- service بتواند provider mock را به‌جای provider واقعی inject کند.
- تعویض provider بدون تغییر contract فرانت ممکن باشد.

## خروجی مورد انتظار

در پایان این بخش، `platform-api` باید یک abstraction تمیز برای AI generation داشته باشد که هم با `v0` کار کند و هم راه مهاجرت به providerهای آینده را باز نگه دارد.
