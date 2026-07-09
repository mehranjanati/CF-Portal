# Cloudflare D1 Schema V1 (Foundation)

**وضعیت:** Baseline (Free-Tier & Shared Control Plane)
**هدف:** تعریف ساختار دیتابیس رابطه‌ای (Relational) در Cloudflare D1 برای مدیریت متادیتا، کاربران، پروژه‌ها و دیپلوی‌ها.

این شماتیک نقطه حقیقت (Source of Truth) برای Control Plane پلتفرم ماست که روی Cloudflare Workers اجرا می‌شود و پورتال SPA مستقیماً با آن ارتباط می‌گیرد.

---

## 1. Core Entities (Identity & Tenancy)

مدیریت کاربران و ورک‌اسپیس‌ها (Tenants). ما از ابتدا سیستم را Multi-tenant می‌بینیم.

```sql
-- Users
CREATE TABLE users (
    id TEXT PRIMARY KEY, -- UUID
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tenants (Workspaces)
CREATE TABLE tenants (
    id TEXT PRIMARY KEY, -- UUID
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Memberships (User <-> Tenant)
CREATE TABLE memberships (
    user_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, tenant_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
```

## 2. Connections & Integrations

ذخیره اطلاعات مربوط به اتصال GitHub و اکانت Cloudflare کاربر (برای مدل Free-Tier).

```sql
-- GitHub Integrations
CREATE TABLE integration_connections (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    provider TEXT NOT NULL, -- e.g., 'github'
    provider_account_id TEXT NOT NULL, -- e.g., GitHub User ID or Org ID
    provider_account_name TEXT NOT NULL,
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- User's Cloudflare Accounts (For Free-Tier Deployment)
CREATE TABLE cloudflare_accounts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    cf_account_id TEXT NOT NULL, -- The actual Cloudflare Account ID of the user
    cf_account_name TEXT,
    api_token_encrypted TEXT NOT NULL, -- Token with permissions to deploy Workers/Pages
    status TEXT DEFAULT 'active', -- 'active', 'invalid_token'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
```

## 3. App & Deployment Model

موجودیت‌های مربوط به اپلیکیشن‌های ساخته شده و سوابق دیپلوی.

```sql
-- Apps (Projects)
CREATE TABLE apps (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft', -- 'draft', 'initializing', 'active', 'archived'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Repositories (GitHub source for the App)
CREATE TABLE repositories (
    id TEXT PRIMARY KEY,
    app_id TEXT UNIQUE NOT NULL,
    connection_id TEXT NOT NULL, -- Ref to integration_connections (GitHub)
    repo_full_name TEXT NOT NULL, -- e.g., 'username/my-app'
    default_branch TEXT DEFAULT 'main',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE,
    FOREIGN KEY (connection_id) REFERENCES integration_connections(id)
);

-- Deployments (Environments tracking: preview vs production)
CREATE TABLE deployments (
    id TEXT PRIMARY KEY,
    app_id TEXT NOT NULL,
    environment TEXT NOT NULL, -- 'preview', 'production'
    url TEXT, -- The final *.workers.dev or pages.dev URL
    current_run_id TEXT, -- Ref to the latest deployment_runs
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
);

-- Deployment Runs (Historical CI/CD executions from GitHub Actions)
CREATE TABLE deployment_runs (
    id TEXT PRIMARY KEY,
    deployment_id TEXT NOT NULL,
    commit_sha TEXT NOT NULL,
    branch TEXT NOT NULL,
    status TEXT NOT NULL, -- 'queued', 'building', 'success', 'failed'
    logs_url TEXT, -- Link to GitHub Actions run logs
    error_message TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (deployment_id) REFERENCES deployments(id) ON DELETE CASCADE
);
```

## 4. Agents & AI State

ذخیره وضعیت و لاگ‌های اجراهای Agent (برای اتصال به Agents SDK).

```sql
-- Agent Runs (For Builder, Support, or Workflow agents)
CREATE TABLE agent_runs (
    id TEXT PRIMARY KEY,
    app_id TEXT NOT NULL,
    agent_type TEXT NOT NULL, -- 'builder', 'explainer', 'support'
    status TEXT NOT NULL, -- 'running', 'completed', 'failed', 'awaiting_approval'
    state_snapshot TEXT, -- JSON snapshot of the workflow/agent state
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
);

-- Artifacts (Generated code, assets, or temporary files by Agents)
CREATE TABLE artifacts (
    id TEXT PRIMARY KEY,
    agent_run_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    content_hash TEXT NOT NULL, -- Reference to R2 or direct hash if small
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_run_id) REFERENCES agent_runs(id) ON DELETE CASCADE
);
```

## نکات اجرایی (Implementation Notes)

1. **امنیت (Security):** تمام توکن‌ها (`access_token_encrypted`, `api_token_encrypted`) باید قبل از ذخیره در D1 توسط یک کلید سراسری (Secret در Worker) رمزنگاری شوند.
2. **اندیس‌گذاری (Indexing):** در فاز بعدی باید روی فیلدهای پرکاربرد مثل `tenant_id` و `app_id` ایندکس اضافه شود تا سرعت کوئری‌ها در Portal SPA بهینه بماند.
3. **مایگریشن (Migrations):** از ابزار `wrangler d1 migrations` برای اعمال این ساختار استفاده خواهد شد.
