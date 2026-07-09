# Task 05.7: Publish Path Readiness

## هدف

این بخش باید بدون پیاده‌سازی publish واقعی، contractها و مدل داده لازم برای `publish intent` و `apply intent` را آماده کند تا خروجی Builder بعداً بدون debt شدید به مسیر `GitHub Actions + Wrangler` متصل شود.

## دامنه

این workstream باید موارد زیر را پوشش دهد:

- تعریف contractهای `publish intent` و `apply intent`
- نگاشت نتیجه generation به ساختار قابل publish
- ثبت draft intent به‌عنوان artifact یا metadata
- آماده‌سازی برای export به GitHub و deployment آینده

## خارج از scope

در این فاز این موارد عمداً انجام نمی‌شوند:

- push واقعی به repo کاربر
- build farm
- deployment واقعی از Builder
- اجرای compile در مرورگر

## ریزتسک‌ها

### 1. تعریف publish intent

publish intent باید حداقل این اطلاعات را حمل کند:

- `appId`
- `sessionId`
- `generationId`
- `target` مثل GitHub
- `artifact reference`
- `requested action`
- `status`

### 2. تعریف apply intent

apply intent می‌تواند برای آینده نماینده این تصمیم باشد:

- اعمال مستقیم file plan
- ساخت branch یا PR
- آماده‌سازی preview deployment

در این فاز فقط contract کافی است، نه execution واقعی.

### 3. نگاشت BuilderResult به publishable artifact

نتیجه generation باید قابل تبدیل به این ساختارها باشد:

- file plan
- route/component suggestion
- next actions
- metadata لازم برای GitHub export

### 4. آماده‌سازی workflowهای آینده

خروجی builder باید طوری طراحی شود که در فاز بعد بتوان آن را به:

- repository update
- GitHub Actions dispatch
- Wrangler-based deployment

متصل کرد.

## فایل‌های درگیر

- typeهای backend در module `builder`
- schema یا metadata storage مرتبط با intentها
- typeهای فرانت برای نمایش next actions
- در صورت نیاز placeholder endpointهای draft publish

## جزئیات اجرایی

### مدل داده پیشنهادی

publish intent باید بین generation و deployment قرار بگیرد و نقش bridge داشته باشد.

فیلدهای پیشنهادی:

- `id`
- `app_id`
- `session_id`
- `generation_id`
- `intent_type`
- `payload_json`
- `status`
- `created_at`

### statusهای پیشنهادی

- `draft`
- `ready_for_apply`
- `blocked`
- `applied` برای آینده

### تعامل با فرانت

فرانت در این فاز فقط باید بداند:

- آیا publish intent وجود دارد یا نه
- next actionهای قابل نمایش چه هستند
- وضعیت فعلی intent چیست

## وابستگی‌ها

- builder result و file plan در Task 05.1 و 05.2
- backend persistence در Task 05.3 و 05.6
- project scoping در Task 05.5

## معیار پذیرش

- contract مشخص برای `publish intent` تعریف شده است.
- contract مشخص برای `apply intent` تعریف شده است.
- نتیجه generation به ساختار قابل نگاشت برای publish تبدیل می‌شود.
- فرانت می‌تواند next actionهای مرتبط را بدون دانستن جزئیات deploy نمایش دهد.
- طراحی با GitHub Actions و Cloudflare deployment path آینده سازگار است.

## تست‌ها

### تست‌های contract

- result generation بتواند به draft publish intent تبدیل شود.
- فیلدهای لازم برای action آینده در metadata حضور داشته باشند.
- نبودن artifact reference باعث تولید intent ناقص نشود.

### تست‌های سازگاری

- فرانت next actions را از contract داخلی بخواند، نه از متن خام provider.
- تغییر provider نباید shape publish intent را تغییر دهد.
- project/app context در intent حفظ شود.

### تست‌های آینده‌نگر

- draft intent بتواند به‌راحتی به GitHub export flow متصل شود.
- metadata برای dispatch آینده GitHub Actions کافی باشد.

## خروجی مورد انتظار

در پایان این بخش، Builder هنوز publish واقعی انجام نمی‌دهد، اما contractهای لازم برای عبور به فاز publish/deploy واقعی از قبل طراحی و ثبت شده‌اند.
