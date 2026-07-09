# Task 05.5: Project Coupling

## هدف

این بخش مسئول وصل کردن `Builder` به context واقعی `project/app` است تا generationها به‌صورت مستقل و قابل رهگیری برای هر پروژه ثبت و بازیابی شوند.

## دامنه

این workstream باید موارد زیر را پوشش دهد:

- اتصال هر session به `tenantId` و `appId`
- امکان ورود به Builder از صفحه جزئیات پروژه
- نمایش latest generation status در context پروژه
- جلوگیری از sessionهای بدون project context

## اصل محصولی

`Builder` نباید یک playground جدا از محصول باشد. هر generation باید مشخصاً متعلق به یک app/project باشد تا history، publish intent و deploymentهای بعدی قابل ردیابی شوند.

## ریزتسک‌ها

### 1. اتصال session به app

در زمان ساخت session باید این context ثبت شود:

- `tenantId`
- `appId`
- در صورت نیاز `workspaceId`

هیچ sessionی نباید بدون project binding ایجاد شود، مگر اینکه عمداً یک mode مجزا برای exploration تعریف شده باشد که در این فاز خارج از scope است.

### 2. ورود از Project Detail

- صفحه `Project Detail` باید CTA مشخصی مثل `Open Builder` داشته باشد.
- کلیک روی این CTA باید کاربر را با context همان app به `/builder` ببرد.
- Builder باید در اولین render بداند app فعال کدام است.

### 3. نمایش latest generation status

در summary پروژه یا app card باید بتوان آخرین وضعیت generation را دید، مانند:

- `No generations yet`
- `Last generation completed`
- `Generation failed`
- `Draft publish intent ready`

### 4. همگام‌سازی history و project state

- history در Builder باید متعلق به app جاری باشد.
- اگر کاربر app را عوض کرد، history و session فعال باید همگام شوند.
- داده app قبلی نباید به app جدید leak شود.

## فایل‌های درگیر

- `portal` صفحات project detail و navigation مرتبط
- `portal/src/routes/(app)/builder/+page.svelte`
- `portal/src/lib/features/builder/*`
- APIهای project summary یا app detail در `platform-api`
- module `builder` برای enforce کردن app binding

## جزئیات اجرایی

### contract سمت backend

session create باید `tenantId` و `appId` را اجباری کند.

history endpoint باید بر پایه `appId` فیلتر شود.

latest status می‌تواند از یکی از این مسیرها تأمین شود:

- join سبک روی latest session در API پروژه
- endpoint جدا برای project summary
- enrichment در response پروژه

### contract سمت frontend

فرانت باید context app را از یکی از مسیرهای زیر دریافت کند:

- route params
- store مرکزی workspace/project
- navigation state

در هر حالت، fallback مبهم نباید وجود داشته باشد.

## وابستگی‌ها

- session persistence در Task 05.6
- route و UX در Task 05.1
- store و state management در Task 05.2
- backend builder routes در Task 05.3

## معیار پذیرش

- هر session به app مشخص متصل است.
- Builder از داخل `Project Detail` با context درست باز می‌شود.
- history فقط generationهای همان app را نشان می‌دهد.
- project summary یا detail قادر به نمایش latest generation status است.
- switching بین appها باعث data leakage یا state اشتباه نمی‌شود.

## تست‌ها

### تست‌های navigation

- CTA `Open Builder` از project detail کاربر را به `/builder` ببرد.
- app انتخاب‌شده در Builder با پروژه مبدأ یکسان باشد.

### تست‌های data scoping

- session ساخته‌شده برای `app A` در history `app B` دیده نشود.
- changing active app باید state فرانت را reset/reload کند.
- refresh صفحه Builder باید app context را حفظ کند.

### تست‌های summary

- وقتی هیچ generationی وجود ندارد، project summary حالت empty را نشان دهد.
- پس از generation موفق، latest status در project summary به‌روز شود.
- پس از generation ناموفق، failure status قابل مشاهده باشد.

## خروجی مورد انتظار

در پایان این بخش، Builder از نظر داده و UX بخشی از lifecycle واقعی پروژه خواهد بود، نه یک feature جدا و disconnected.
