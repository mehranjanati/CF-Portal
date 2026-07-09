# Task 05.2: Frontend Architecture

## هدف

هدف این بخش ساختن اسکلت واقعی feature `builder` در `portal` است؛ به شکلی که UI، state، types و API layer از همان ابتدا تمیز، domain-based و قابل گسترش باشند.

## دامنه

این workstream باید موارد زیر را تحویل دهد:

- ساخت feature folder مستقل برای `builder`
- انتقال منطق state از route به store و componentها
- تعریف typeهای مجزا برای session، result، file plan و template
- حفظ route file به‌عنوان thin wrapper
- آماده‌سازی API client فرانت برای contractهای `platform-api`

## فایل‌های هدف

- `portal/src/lib/features/builder/BuilderPage.svelte`
- `portal/src/lib/features/builder/BuilderPromptPanel.svelte`
- `portal/src/lib/features/builder/BuilderResultPanel.svelte`
- `portal/src/lib/features/builder/BuilderFilePlan.svelte`
- `portal/src/lib/features/builder/BuilderSessionList.svelte`
- `portal/src/lib/stores/builder.svelte.ts`
- `portal/src/lib/types/builder.ts`
- `portal/src/lib/api.ts` یا client اختصاصی builder
- `portal/src/routes/(app)/builder/+page.svelte`

## ساختار پیشنهادی

```text
portal/src/
  lib/
    features/
      builder/
        BuilderPage.svelte
        BuilderPromptPanel.svelte
        BuilderResultPanel.svelte
        BuilderFilePlan.svelte
        BuilderSessionList.svelte
    stores/
      builder.svelte.ts
    types/
      builder.ts
    api.ts
  routes/
    (app)/
      builder/
        +page.svelte
```

## ریزتسک‌ها

### 1. Feature folder

- تمام componentهای builder باید داخل `features/builder` قرار بگیرند.
- route نباید به container ضخیم تبدیل شود.
- componentها باید بر اساس نقش UX جدا شوند، نه بر اساس layout تصادفی.

### 2. Store طراحی شود

store باید حداقل stateهای زیر را مدیریت کند:

- `activeTemplate`
- `session`
- `prompt`
- `history`
- `result`
- `status`
- `error`

همچنین actionهای پایه:

- `createSession()`
- `generate()`
- `loadHistory()`
- `selectSession()`
- `reset()`

### 3. Typeهای مستقل

typeهای حداقلی که باید تعریف شوند:

- `BuilderSession`
- `BuilderResult`
- `BuilderFilePlan`
- `BuilderTemplate`
- `BuilderHistoryItem`
- `BuilderStatus`

این typeها باید contract فرانت را از response خام provider جدا نگه دارند.

### 4. API integration layer

- API callها نباید مستقیماً در componentها پخش شوند.
- ترجیحاً یک لایه client یا helper برای builder وجود داشته باشد.
- mapping خطا و response normalization باید قبل از ورود به component انجام شود.

### 5. Route file thin بماند

فایل `+page.svelte` باید:

- context route را بخواند
- page container را mount کند
- در صورت نیاز app/project context را به feature inject کند

منطق اصلی session و generate نباید در route نگهداری شود.

## جزئیات طراحی

### توزیع مسئولیت

- `BuilderPage`: orchestration سطح صفحه
- `BuilderPromptPanel`: ورودی intent/template/prompt و CTAها
- `BuilderResultPanel`: نمایش summary، state و next actions
- `BuilderFilePlan`: نمایش فایل‌ها و actionهای پیشنهادی
- `BuilderSessionList`: history و session switching
- `builder.svelte.ts`: source of truth فرانت

### الگوی state

پیشنهاد می‌شود state سطح بالا با status-based rendering کنترل شود:

- `idle`
- `creating-session`
- `loading-history`
- `generating`
- `success`
- `error`

این statusها باید واحد باشند تا از if/elseهای پراکنده در componentها جلوگیری شود.

## وابستگی‌ها

- contractهای backend برای `sessions`, `generate`, `history`
- model پروژه فعال در `portal`
- تصمیم UX مربوط به templateها و history list

## معیار پذیرش

- feature `builder` ساختار فولدری مستقل و واضح دارد.
- store واحد برای state session/result/history وجود دارد.
- route file نازک و قابل نگهداری مانده است.
- typeها از response خام backend جدا و قابل استفاده مجدد هستند.
- componentها مسئولیت‌پذیر و قابل تست هستند.

## تست‌ها

### تست‌های ساختاری

- import pathها بدون cycle کار کنند.
- route بدون وارد کردن منطق سنگین render شود.
- store بتواند stateهای مختلف را بدون leakage مدیریت کند.

### تست‌های رفتاری

- `createSession()` پس از success، state session را به‌روزرسانی کند.
- `generate()` status را به `generating` و سپس `success/error` ببرد.
- `loadHistory()` با refresh صفحه همان history را دوباره hydrate کند.
- `reset()` state باقی‌مانده از app قبلی را پاک کند.

### تست‌های type/contract

- responseهای backend به typeهای داخلی map شوند.
- نبودن فیلد اختیاری باعث crash UI نشود.
- error object قبل از نمایش به message قابل فهم تبدیل شود.

## خروجی مورد انتظار

در پایان این بخش، فرانت `builder` باید یک feature مستقل، maintainable و آماده برای رشد به stateهای پیچیده‌تر مثل diff preview، publish intent و multi-step authoring باشد.
