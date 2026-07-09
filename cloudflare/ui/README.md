# UI Migration Snapshots

این فولدر snapshotهای انتخابی از `portal1` را نگه می‌دارد تا برای portal جدید Cloudflare stack به‌عنوان مرجع migration استفاده شوند.

## هدف

این فایل‌ها برای این هستند که:

- layout و visual language فعلی حفظ شود
- migration سریع‌تر شود
- بدون باز کردن مداوم `portal1`، source snapshot دم دست باشد

## نکته مهم

این فولدر:

- source of truth نیست
- پروژه اجرایی نیست
- قرارداد backend جدید را تعریف نمی‌کند

این فقط یک `reference layer` برای انتقال UI است.

## ساختار

- `layout/`
  - app shell و navigation
- `primitives/`
  - button, card, input, select و primitiveهای پایه
- `features/`
  - snapshotهای feature-level برای dashboard, projects, builder, deployments, workflows

## قاعده استفاده

وقتی portal جدید ساخته می‌شود:

1. از این فایل‌ها فقط برای reuse ساختار و UI استفاده کن
2. import pathها را با پروژه جدید تطبیق بده
3. data fetching و service layer را از صفر بازنویسی کن
4. هر coupling legacy را حذف کن
