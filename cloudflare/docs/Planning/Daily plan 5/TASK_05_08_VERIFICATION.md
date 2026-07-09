# Task 05.8: Verification

## هدف

این بخش مسئول ثبت روش verify کردن کل فاز `Daily Task 05` است تا سناریوی `prompt -> generation -> refresh -> history` فقط در سطح طراحی نماند و به یک smoke test واقعی و قابل تکرار تبدیل شود.

## دامنه

این workstream باید شامل موارد زیر باشد:

- تعریف smoke test سراسری فاز
- تعیین پیش‌نیازهای تست remote
- ثبت expected result برای هر مرحله
- مشخص کردن شواهد مورد نیاز برای تایید completion

## سناریوی اصلی تست

سناریوی مرجع این فاز:

1. ساخت workspace
2. ساخت project
3. شروع builder session
4. ارسال prompt
5. مشاهده result
6. refresh
7. مشاهده history

## پیش‌نیازها

- `portal` و `platform-api` در محیط remote یا production-like در دسترس باشند.
- workspace/app context واقعی ایجاد شود.
- provider backend config شده باشد یا mock production-like وجود داشته باشد.
- persistence در D1 آماده باشد.

## ریزتسک‌ها

### 1. تعریف smoke checklist

برای هر گام باید این موارد ثبت شود:

- action
- expected result
- actual result
- evidence

### 2. تست ایجاد session

باید تأیید شود که:

- session واقعی در backend ساخته می‌شود
- app context درست attach می‌شود
- فرانت status مناسب را نشان می‌دهد

### 3. تست generate

باید تأیید شود که:

- prompt از فرانت ارسال می‌شود
- backend orchestration اجرا می‌شود
- provider response normalize می‌شود
- summary و file plan در UI دیده می‌شوند

### 4. تست refresh و history

باید تأیید شود که:

- پس از refresh داده از API دوباره خوانده می‌شود
- history generation برای همان app نمایش داده می‌شود
- session یا result صرفاً در state موقت فرانت نگه نداشته شده‌اند

### 5. تست failure path

حداقل یک failure path باید ثبت شود:

- provider unavailable
- invalid prompt
- missing config

هدف این است که behavior سیستم در failure هم production-like باشد.

## ماتریس verify

### UI

- route `/builder` بالا می‌آید.
- stateهای `idle/loading/success/error` درست نمایش داده می‌شوند.
- history پس از refresh دیده می‌شود.

### API

- session create موفق است.
- generate موفق یا failure expected دارد.
- history برای app صحیح داده برمی‌گرداند.

### Persistence

- session در D1 ثبت می‌شود.
- generation result در D1 یا R2-linked metadata ثبت می‌شود.
- latest status قابل بازیابی است.

## شواهد مورد نیاز

برای کامل شدن verify بهتر است این موارد ثبت شوند:

- screenshot از صفحه Builder قبل و بعد از generation
- نمونه response از APIهای session/generate/history
- رکوردهای مرتبط در D1 یا لاگ تاییدکننده persistence
- یادداشت کوتاه از نتیجه smoke test

## معیار پذیرش

- smoke test انتها به انتها یک بار با موفقیت اجرا شده باشد.
- سناریوی refresh و history به‌صورت واقعی تایید شده باشد.
- failure path حداقل در یک سناریو بررسی شده باشد.
- شواهد کافی برای review تیمی وجود داشته باشد.

## تست‌ها

### تست end-to-end

- workspace جدید ساخته شود.
- project جدید ساخته شود.
- Builder با app جدید باز شود.
- session ساخته شود.
- prompt ارسال شود.
- result نمایش داده شود.
- refresh انجام شود.
- history همان generation برگردد.

### تست regression

- flow جدید نباید project creation موجود را خراب کند.
- navigation بین project detail و builder نباید بشکند.
- نبود history نباید باعث crash UI شود.

### تست خطا

- backend error باید به UI message قابل فهم تبدیل شود.
- retry بعد از failure باید کار کند یا به‌وضوح block شود.

## خروجی مورد انتظار

در پایان این بخش، completion فاز بر اساس شواهد و سناریوی verify واقعی قابل دفاع است، نه صرفاً بر اساس ساخته شدن routeها و componentها.
