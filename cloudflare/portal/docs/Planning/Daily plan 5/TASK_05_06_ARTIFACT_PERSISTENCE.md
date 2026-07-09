# Task 05.6: Artifact / Persistence

## هدف

این بخش مسئول ثبت، نگهداری و بازیابی داده‌های `builder` است تا sessionها، promptها و نتیجه generation بعد از refresh یا بازگشت کاربر از بین نروند و lineage حداقلی برای artifactها شکل بگیرد.

## دامنه

این workstream باید موارد زیر را پوشش دهد:

- ذخیره metadata مربوط به session و result در D1
- تعریف مرز بین داده‌های سبک در D1 و snapshotهای بزرگ‌تر در R2
- امکان بازیابی history برای هر app
- حفظ audit trail پایه برای prompt/result/failure

## مدل داده پیشنهادی

حداقل entityهای این فاز:

- `builder_sessions`
- `builder_generations`
- در صورت نیاز `builder_artifacts`

## داده‌هایی که باید ذخیره شوند

### session

- `id`
- `tenant_id`
- `app_id`
- `template`
- `intent`
- `status`
- `created_at`
- `updated_at`

### generation

- `id`
- `session_id`
- `prompt`
- `summary`
- `result_json`
- `status`
- `error_code`
- `error_message`
- `created_at`

### artifact metadata

- `file_plan`
- `suggested_routes`
- `suggested_components`
- `next_actions`
- pointer به R2 در صورت بزرگ بودن payload

## ریزتسک‌ها

### 1. طراحی schema

- migration برای جدول‌های builder ایجاد شود.
- کلیدهای foreign key یا روابط منطقی session/generation مشخص باشند.
- index روی `app_id` و `session_id` برای queryهای history در نظر گرفته شود.

### 2. ذخیره result

- result نرمال‌شده provider باید ذخیره شود.
- اگر payload کوچک است در D1 باقی بماند.
- اگر snapshot بزرگ شد، فقط metadata در D1 و body در R2 ذخیره شود.

### 3. بازیابی history

- history باید با `appId` قابل query باشد.
- latest generation باید سریع‌تر از کل history در دسترس باشد.
- مرتب‌سازی زمانی و status برای UI قابل اتکا باشد.

### 4. ثبت failure

- failure نباید فقط در log بماند.
- reason، error type و timestamp باید ذخیره شوند.
- retry analysis در آینده باید بر اساس همین داده‌ها ممکن باشد.

## فایل‌های درگیر

- migrationها و schemaهای D1 در `platform-api`
- `platform-api/src/modules/builder/sessions.ts`
- `platform-api/src/modules/builder/artifacts.ts`
- `platform-api/src/modules/builder/service.ts`
- در صورت نیاز helperهای R2

## جزئیات اجرایی

### D1 در این فاز

D1 برای metadata و queryهای سریع مناسب است:

- session status
- prompt history
- result summary
- latest generation lookup

### R2 در این فاز

R2 فقط زمانی استفاده شود که payload نتیجه یا snapshot فایل‌ها بزرگ‌تر از حد مناسب D1 شود.

### اصل طراحی

- D1 source of truth metadata باشد.
- R2 optional extension برای bodyهای بزرگ باشد.
- فرانت نباید بداند body در D1 است یا R2.

## وابستگی‌ها

- backend orchestration در Task 05.3
- provider normalization در Task 05.4
- project scoping در Task 05.5

## معیار پذیرش

- session و generation metadata در D1 ذخیره می‌شوند.
- history پس از refresh قابل بازیابی است.
- latest generation برای app فعلی قابل استخراج است.
- failureها با metadata کافی ثبت می‌شوند.
- در صورت نیاز، معماری آماده استفاده از R2 برای snapshotهای بزرگ‌تر است.

## تست‌ها

### تست‌های persistence

- بعد از create session، رکورد session در D1 وجود داشته باشد.
- بعد از generate موفق، summary و file plan ذخیره شوند.
- بعد از generate ناموفق، status و error metadata ذخیره شوند.

### تست‌های بازیابی

- `GET history` پس از refresh همان داده‌ها را بازگرداند.
- latest generation برای app درست بازیابی شود.
- history برای app دیگر برنگردد.

### تست‌های مرز D1/R2

- payloadهای کوچک بدون نیاز به R2 در D1 ذخیره شوند.
- اگر snapshot بزرگ شد، pointer ذخیره شود و metadata همچنان از D1 خوانده شود.

## خروجی مورد انتظار

در پایان این بخش، `builder` یک حافظه واقعی در backend دارد و نتیجه generation دیگر transient و وابسته به state موقت فرانت نیست.
