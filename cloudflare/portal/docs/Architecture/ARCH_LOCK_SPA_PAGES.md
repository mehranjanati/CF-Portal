# Architecture Lock: Strict SPA on Cloudflare Pages

**وضعیت:** LOCKED (غیر قابل تغییر مگر با تایید صریح کاربر)

## 1. مدل رندرینگ فرانت‌اند (Rendering Model)
پورتال ما یک **Strict SPA (Single Page Application)** است.
- **بدون SSR (Server-Side Rendering):** فریم‌ورک SvelteKit باید با تنظیم `export const ssr = false;` در فایل `src/routes/+layout.ts` پیکربندی شود.
- **Prerendering:** فایل `index.html` (و یک صفحه Fallback) به صورت استاتیک بیلد می‌شوند (`export const prerender = true;`).
- تمام لاجیک‌ها، استیت‌ها و روتینگ‌ها در سمت کلاینت (مرورگر) اجرا می‌شوند.

## 2. مدل دیپلوی فرانت‌اند
- فرانت‌اند پورتال مستقیماً روی **Cloudflare Pages** دیپلوی می‌شود.
- پورتال SPA فقط و فقط از طریق API (روی Cloudflare Workers) با دیتابیس (D1) و سایر سرویس‌ها صحبت می‌کند و به هیچ وجه نباید در سمت سرور SvelteKit لاجیک بک‌اندی نوشته شود (مثل فایل‌های `+page.server.ts`).

## 3. کامپوننت‌های UI (Shadcn-Svelte)
- کتابخانه مورد تایید برای UI، **`shadcn-svelte`** است.
- این کتابخانه در پس‌زمینه از `bits-ui` (برای لاجیک Headless و Accessibility) استفاده می‌کند، اما ما برای سرعت و یکپارچگی استایل‌ها با TailwindCSS، مستقیماً از Shadcn استفاده می‌کنیم.

## نتیجه‌گیری برای هوش مصنوعی
هر زمان که کدی برای SvelteKit تولید می‌کنی:
1. فایل‌های `.server.ts` ایجاد **نکن**.
2. از نوشتن کدهای SSR پرهیز کن.
3. فرض کن تمام درخواست‌های شبکه با `fetch` سمت کلاینت به یک دامنه مجزا (API Worker) ارسال می‌شوند.
