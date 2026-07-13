# Daily Task 09: Post-Review Improvements

**هدف روز:** بهبود پایداری و observability پورتال بر اساس پیشنهادهای بررسی کد (Code Review).

**خروجی قابل اتکا (Definition of Done):**
1. در صورت شکست ابزار (Tool)، پیام خطا به ایجنت ارسال شود.
2. استراتژی بازاتصال (Reconnection) SSE از حالت ثابت به Exponential Backoff تغییر کند.
3. لاگ‌های کنسول در محیط تولید (Production) محدود شوند.

---

## لیست وظایف (To-Do)

### 1. Implement Tool Error Feedback
- [ ] در فایل `src/lib/features/builder/tool-handler.ts` کد را طوری تغییر دهید که در صورت بروز خطا، یک پیغام خطا (error message) به ایجنت ارسال شود (مثلاً از طریق `builderStore`).

### 2. Refine SSE Reconnection Strategy
- [ ] در فایل `src/lib/services/agent-connection.ts` استراتژی بازاتصال را از یک تاخیر ثابت (5 ثانیه) به استراتجی Exponential Backoff تغییر دهید.

### 3. Conditional Logging
- [ ] در فایل `src/lib/api.ts` تمام `console.log`ها را با استفاده از `import.meta.env.DEV` کنترل کنید تا در محیط production نمایش داده نشوند.

### 4. Review Browser Tool Stubs
- [ ] بررسی کنید که آیا ابزارهای مرورگر (`src/lib/features/builder/tools/browser.ts`) نیاز به منطق بیشتری در سمت کلاینت دارند یا خیر.

---

**نکته برای توسعه‌دهنده:** 
این تسک‌ها تمرکز بر روی پایداری (Stability) و قابلیت مشاهده (Observability) سیستم دارند و مستقیماً بر روی تجربه کاربری در زمان استفاده از AI Builder تاثیر می‌گذارند.
