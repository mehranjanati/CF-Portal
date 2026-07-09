# GitHub Actions Deployment Contract

**وضعیت:** Baseline (برای تمام Tierها از جمله Free-Tier و Managed-Tier)
**هدف:** استانداردسازی فایل‌های YAML در GitHub Actions که مسئولیت بیلد و دیپلوی کدها را به عهده دارند و ارتباط (Callback) آن‌ها با پلتفرم اصلی ما (Platform API).

---

## 1. اصل کلیدی: GitHub متعلق به کاربر است
یکی از مهم‌ترین تصمیمات معماری ما این است که **GitHub منبع حقیقت (Source of Truth) متعلق به خود کاربر است.** 
چه کاربر در Free-Tier باشد و چه در Managed-Tier (پولی)، کدهای او روی اکانت GitHub شخصی (یا سازمانی) خودش قرار می‌گیرد. 
در نتیجه:
- `GitHub Actions` برای **تمام پلن‌ها** وجود دارد و به عنوان موتور بیلد (Build Engine) ثابت است.
- تفاوت Tierها صرفاً در محیط دیپلوی (Deployment Target) است؛ در Free-Tier کد روی Cloudflare اکانت خود کاربر دیپلوی می‌شود و در Managed-Tier روی پلتفرم ما (Workers for Platforms).

---

## 2. ساختار فایل `.github/workflows/deploy.yml`

این فایل به صورت خودکار توسط پلتفرم ما هنگام ساخت ریپازیتوری اولیه برای کاربر تولید و کامیت می‌شود.

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches:
      - main
      - 'preview/**'
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Dependencies
        run: npm ci

      - name: Build Project
        run: npm run build

      - name: Notify Platform - Deployment Started
        if: always()
        run: |
          curl -X POST "https://api.your-platform.com/v1/deployments/callback" \
          -H "Authorization: Bearer ${{ secrets.PLATFORM_WEBHOOK_TOKEN }}" \
          -H "Content-Type: application/json" \
          -d '{
            "repo": "${{ github.repository }}",
            "commit_sha": "${{ github.sha }}",
            "branch": "${{ github.ref_name }}",
            "status": "building",
            "run_id": "${{ github.run_id }}"
          }'

      - name: Deploy to Cloudflare (Free-Tier - User Account)
        # در مدل Free-Tier توکن کلادفلر خود کاربر استفاده می‌شود
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: deploy ${{ github.ref_name != 'main' && format('--env preview-{0}', github.ref_name) || '' }}
        id: cf_deploy

      - name: Notify Platform - Deployment Completed
        if: always()
        run: |
          STATUS="failed"
          URL=""
          if [ "${{ steps.cf_deploy.outcome }}" == "success" ]; then
            STATUS="success"
            URL="${{ steps.cf_deploy.outputs.deployment-url }}"
          fi
          
          curl -X POST "https://api.your-platform.com/v1/deployments/callback" \
          -H "Authorization: Bearer ${{ secrets.PLATFORM_WEBHOOK_TOKEN }}" \
          -H "Content-Type: application/json" \
          -d '{
            "repo": "${{ github.repository }}",
            "commit_sha": "${{ github.sha }}",
            "branch": "${{ github.ref_name }}",
            "status": "'$STATUS'",
            "url": "'$URL'",
            "run_id": "${{ github.run_id }}"
          }'
```

---

## 3. مدیریت Secretها در GitHub (تزریق توسط Platform API)

وقتی پلتفرم ما ریپازیتوری کاربر را می‌سازد، باید Secretهای زیر را از طریق GitHub API به ریپازیتوری او تزریق کند:

1. `CLOUDFLARE_API_TOKEN`:
   - **در حالت Free-Tier:** توکن کلادفلر خود کاربر (که قبلاً در پورتال وارد کرده و در دیتابیس D1 رمزنگاری شده است).
   - **در حالت Managed-Tier:** توکنی موقت یا محدود شده از پلتفرم ما (Cloudflare for Platforms) که فقط دسترسی دیپلوی روی Dispatch Namespace ما را دارد.
2. `PLATFORM_WEBHOOK_TOKEN`:
   - یک توکن JWT برای احراز هویت GitHub Actions هنگام ارسال Webhook (Callback) به API ما جهت آپدیت وضعیت دیپلوی در پورتال SPA.

---

## 4. استراتژی برنچ‌ها (Branch Strategy)

- **برنچ `main` (Production):** هر پوش روی این برنچ منجر به یک دیپلوی مستقیم روی Production می‌شود.
- **برنچ‌های `preview/*` (Preview Environments):** زمانی که Agent یا خود کاربر ویژگی جدیدی را تست می‌کند، یک برنچ جدید (مثلاً `preview/add-auth`) ساخته می‌شود. GitHub Action با استفاده از قابلیت Environment در Wrangler، یک نسخه ایزوله از برنامه را دیپلوی کرده و لینک Preview را برمی‌گرداند.
