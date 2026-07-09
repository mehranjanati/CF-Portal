# Task 05.1: Product / UX

## هدف

این بخش مسئول تبدیل `Builder` از یک ایده معماری به یک تجربه واقعی و قابل استفاده در `portal` است. تمرکز اصلی این workstream روی UX محصولی، ناوبری واقعی، stateهای قابل فهم و layout مناسب برای authoring و preview است.

## دامنه

این بخش باید موارد زیر را پوشش دهد:

- فعال شدن route واقعی `/builder`
- طراحی page واقعی بر اساس الگوی `2-pane`
- نمایش ورودی prompt، انتخاب template و خروجی generation در یک flow واحد
- تعریف stateهای `empty`, `loading`, `success`, `error`, `retry`
- هم‌راستا کردن navigation با featureهای واقعاً موجود

## فایل‌های درگیر

فایل‌های اصلی که انتظار می‌رود در این بخش ساخته یا ویرایش شوند:

- `portal/src/routes/(app)/builder/+page.svelte`
- `portal/src/lib/features/builder/BuilderPage.svelte`
- `portal/src/lib/features/builder/BuilderPromptPanel.svelte`
- `portal/src/lib/features/builder/BuilderResultPanel.svelte`
- `portal/src/lib/features/builder/BuilderFilePlan.svelte`
- `portal/src/lib/features/builder/BuilderSessionList.svelte`
- فایل‌های navigation یا layout مرتبط در `portal`

## ریزتسک‌ها

### 1. فعال‌سازی route

- [x] route واقعی `/builder` باید در ساختار `(app)` اضافه شود.
- [x] route file باید thin باشد و فقط page container اصلی را mount کند.
- [x] دسترسی به route باید با workspace/app فعال سازگار باشد.

### 2. طراحی تجربه 2-pane

- [x] pane سمت چپ: template، intent، prompt، CTAها، state session
- [x] pane سمت راست: summary، file plan، next actions، history یا latest result
- [x] layout باید در desktop دو ستونه و در mobile به حالت stack شده degrade شود.

### 3. تعریف CTAهای اصلی

CTAهای پایه این فاز:

- [x] `Start Session`
- [x] `Generate`
- [x] `Retry`
- [x] `Open From Project`
- [x] `Refresh History`

در این فاز لازم نیست CTAهای publish واقعی باشند، اما placeholder آن‌ها باید با label و gating واضح نمایش داده شوند.

### 4. همسان‌سازی nav

- [x] فقط featureهای واقعی در nav دیده شوند.
- [x] اگر بخشی هنوز آماده نیست، باید با gating روشن مثل `Coming Soon` جدا شود.
- [x] `Builder` باید از داخل context پروژه قابل کشف باشد، نه فقط از nav اصلی.

### 5. طراحی stateها

برای تجربه production-like باید این stateها طراحی شوند:

- [x] `idle`: هنوز session شروع نشده
- [x] `loading`: در حال ایجاد session یا دریافت history
- [x] `generating`: prompt ارسال شده و نتیجه در حال آماده‌سازی است
- [x] `success`: summary و file plan آماده است
- [x] `error`: failure با پیام قابل فهم و CTA برای retry
- [x] `empty-history`: هنوز generationی برای app فعلی ثبت نشده

## جزئیات اجرایی

### ورودی‌های UX

- `template`
- `intent`
- `prompt`
- `active app`
- `latest session status`

### خروجی‌های UX

- `summary`
- `files`
- `suggested routes/components`
- `next actions`
- `history list`

### اصول طراحی

- کاربر همیشه باید بداند روی کدام `app/project` کار می‌کند.
- state changeها باید واضح باشند و بدون ambiguity نمایش داده شوند.
- failure message نباید provider-specific یا خام باشد.
- نتیجه generation باید preview-first باشد، نه code editor-first.

## وابستگی‌ها

- contractهای backend برای session و generate
- store فرانت برای نگهداری state
- context پروژه فعال در `portal`
- feature patternهای تعریف‌شده در اسناد فرانت

## معیار پذیرش

- `/builder` بدون mock route و با صفحه واقعی بالا می‌آید.
- کاربر می‌تواند template یا intent انتخاب کند.
- کاربر می‌تواند prompt وارد کرده و generate را شروع کند.
- خروجی generation به‌صورت summary و file plan نمایش داده می‌شود.
- خطاها و retry path واضح و قابل استفاده هستند.
- nav فقط featureهای واقعی یا featureهای gated را نشان می‌دهد.

## تست‌ها

### تست‌های UI

- ورود به `/builder` با app فعال، صفحه را بدون crash نمایش دهد.
- در حالت بدون session، empty state درست نمایش داده شود.
- در زمان create/generate، loading state و disabled state CTAها درست باشد.
- بعد از success، summary و file plan رندر شوند.
- در failure، پیام خطا و دکمه retry نمایش داده شوند.

### تست‌های رفتار

- تغییر app فعال باید context صفحه Builder را به‌روزرسانی کند.
- باز شدن Builder از صفحه Project Detail باید app درست را carry کند.
- refresh صفحه نباید باعث از دست رفتن context history همان app شود.

### تست‌های responsive

- layout در desktop دو ستونه باشد.
- layout در viewport کوچک به صورت stacked و خوانا نمایش داده شود.
- CTAها در mobile قابل دسترس باقی بمانند.

## خروجی مورد انتظار

در انتهای این بخش، `Builder` باید از دید محصولی یک surface واقعی برای authoring باشد؛ حتی اگر publish نهایی هنوز draft/mock باقی بماند.
