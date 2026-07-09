# Task 05.3: Backend Architecture

## هدف

این بخش مسئول ارتقای `platform-api` از یک skeleton اولیه به orchestration واقعی برای `builder` است. backend باید مالک session، generation، persistence، history و abstraction روی provider باشد.

## دامنه

این workstream باید شامل موارد زیر باشد:

- ساخت یا تکمیل module مستقل `builder`
- تعریف routeهای session, generate و history
- پیاده‌سازی service لایه orchestration
- اتصال persistence حداقلی به D1
- جداسازی provider adapter از routeها

## ساختار پیشنهادی

```text
platform-api/src/modules/builder/
  routes.ts
  service.ts
  sessions.ts
  prompts.ts
  artifacts.ts
  providers/
    index.ts
    v0.ts
```

## endpointهای مورد نیاز

### 1. ایجاد session

`POST /api/builder/sessions`

ورودی:

- `tenantId`
- `appId`
- `template`
- `intent`

خروجی:

- session id
- app context
- status اولیه

### 2. دریافت session

`GET /api/builder/sessions/:sessionId`

مسئول نمایش وضعیت فعلی session و آخرین result ثبت‌شده.

### 3. generate

`POST /api/builder/sessions/:sessionId/generate`

ورودی:

- `prompt`

خروجی:

- session status
- normalized result
- metadata پایه generation

### 4. history

`GET /api/builder/apps/:appId/history`

خروجی:

- فهرست sessionها یا generationهای مرتبط با app
- latest status
- summary مختصر
- timestampها

## ریزتسک‌ها

### 1. طراحی routeها

- validation ورودی در همان boundary route انجام شود.
- routeها فقط request parsing و response shaping انجام دهند.
- منطق orchestration در service بماند.

### 2. service orchestration

service باید مراحل زیر را کنترل کند:

- verify کردن tenant/app context
- ساخت session
- ثبت prompt
- فراخوانی provider
- normalize کردن result
- ذخیره metadata و artifact summary
- برگرداندن response قابل مصرف برای فرانت

### 3. persistence حداقلی

حداقل داده‌هایی که باید ذخیره شوند:

- session metadata
- prompt history
- result summary
- file plan
- status
- failure reason
- timestamps

### 4. handling خطا

- خطاهای validation از خطاهای provider جدا شوند.
- خطاهای provider باید map شده و پیام مناسب API تولید کنند.
- failure باید traceable باشد اما response برای فرانت تمیز بماند.

## فایل‌های درگیر

- `platform-api/src/modules/builder/routes.ts`
- `platform-api/src/modules/builder/service.ts`
- `platform-api/src/modules/builder/sessions.ts`
- `platform-api/src/modules/builder/prompts.ts`
- `platform-api/src/modules/builder/artifacts.ts`
- فایل‌های registration module در `platform-api`
- schema یا migrationهای D1

## جزئیات اجرایی

### مسئولیت route

- parse و validate کردن body و params
- call به service
- بازگرداندن status code مناسب

### مسئولیت service

- business flow
- orchestration
- provider dispatch
- persistence
- error normalization

### مسئولیت storage layer

- create/update/read session
- append history
- read history by app

## وابستگی‌ها

- strategy provider در Task 05.4
- طراحی schema در Task 05.6
- contractهای فرانت در Task 05.2
- context معتبر tenant/app از لایه‌های موجود

## معیار پذیرش

- `platform-api` routeهای builder را expose می‌کند.
- service واقعی generation orchestration را انجام می‌دهد.
- session و result حداقل در D1 ذخیره می‌شوند.
- history بر اساس `appId` قابل بازیابی است.
- responseها برای فرانت پایدار و provider-agnostic هستند.

## تست‌ها

### تست‌های API

- `POST /api/builder/sessions` با payload معتبر، session ایجاد کند.
- payload نامعتبر باید `4xx` مناسب برگرداند.
- `GET /api/builder/sessions/:sessionId` برای session موجود داده درست بدهد.
- `GET /api/builder/apps/:appId/history` فقط history همان app را برگرداند.

### تست‌های orchestration

- generate باید prompt را ثبت و سپس provider را call کند.
- result خام provider باید normalize شود.
- در failure، session status به `failed` برسد و reason ثبت شود.

### تست‌های persistence

- session تازه ایجادشده بعد از refresh API قابل خواندن باشد.
- history به ترتیب زمانی قابل بازیابی باشد.
- app دیگر نباید history app فعلی را ببیند.

## خروجی مورد انتظار

در انتهای این بخش، `platform-api` باید owner واقعی generation flow باشد و فرانت فقط با contract داخلی همین لایه کار کند.
