# Operating Model Matrix

**وضعیت:** Baseline (Free-Tier & Shared Control Plane)
**هدف:** تعیین واضح مدل‌های عملیاتی پلتفرم، مرز zwischen free-tier، pro/managed tier، و جزئیات ownership هر بخش.

---

## 1. مدل‌های عملیاتی (Operating Models)

### 1.1 Free-Tier Model

**هدف:** کاربر بتواند بدون هزینه پلتفرم، اپلیکیشن بسازد و روی اکانت Cloudflare شخصی خودش دیپلوی کند.

#### مشخصات:

| aspect | توضیح |
|--------|-------|
| **Source of Truth** | GitHub Repository کاربر |
| **Build Engine** | GitHub Actions (در ریپازیتوری کاربر) |
| **Deploy Target** | Cloudflare Account خود کاربر |
| **Billing/Cost** | کاربر مستقیماً به Cloudflare پرداخت می‌کند |
| **Infra Ownership** | کاربر owns computational resources |
| **Control Plane** | Shared (پلتفرم Nexus فقط متادیتا را manage می‌کند) |
| **Data Residency** | در دیتابیس D1 shared control plane |
| **Limits** | throttlelein夾 در سمت control plane برای fairness |

#### ویژگی‌های پشتیبانی شده:
- ✅ UI-based app building
- ✅ AI-assisted code generation
- ✅ GitHub integration
- ✅ Cloudflare account connection
- ✅ Preview deploys (branch-based)
- ✅ Production deploys (main branch)
- ❌ Custom domains (بعداً اضافه می‌شود)
- ❌ Managed sandbox execution
- ❌ Platform-owned runtime

---

### 1.2 Pro / Builder Tier Model

**هدف:** کاربر می‌خواهد از born-in-cloud experience استفاده کند بدون نیاز به مدیریت شخصی Cloudflare account.

#### مشخصات:

| aspect | توضیح |
|--------|-------|
| **Source of Truth** | GitHub Repository کاربر (یا internal git در پلتفرم) |
| **Build Engine** | GitHub Actions یا Platform-managed CI |
| **Deploy Target** | Workers for Platforms dispatch worker |
| **Billing/Cost** | پلتفرم Nexus bills کاربر |
| **Infra Ownership** | پلتفرم owns computational resources |
| **Control Plane** | Fully managed |
| **Data Residency** | در دیتابیس D1 + dedicated schemas |
| **Limits** | قابل تنظیم بر اساس plan |

#### ویژگی‌های پشتیبانی شده:
- ✅ همه ویژگی‌های Free-Tier
- ✅ Managed CI/CD
- ✅ Custom domains/subdomains
- ✅ Higher rate limits
- ✅ Priority support
- ✅ Advanced monitoring
- ✅ Sandboxed preview environments

---

### 1.3 Managed Platform Tier (Enterprise)

**هدف:** سازمان‌ها می‌خواهند پلتفرم را به‌صورت private یا dedciated داشته باشند.

#### مشخصات:

| aspect | توضیح |
|--------|-------|
| **Source of Truth** | Flexible (GitHub, GitLab, or internal) |
| **Build Engine** | Fully managed BYO CI یا platform CI |
| **Deploy Target** | Dedicated Namespace در Cloudflare Account پلتفرم |
| **Billing/Cost** | Invoice-based، settlement داخلی |
| **Infra Ownership** | Dedicated resources |
| **Control Plane** | Isolated tenants در control plane |
| **Data Residency** | قابل انتخاب region |
| **Limits** | Contract-based، قابل مذاکره |

#### ویژگی‌های پشتیبانی شده:
- ✅ همه ویژگی‌های Pro Tier
- ✅ Dedicated infrastructure
- ✅ SSO/SAML
- ✅ Audit logs
- ✅ Custom SLA
- ✅ On-prem deployment option
- ✅ White-label support

---

## 2. مقایسه ویژگی‌ها (Feature Matrix)

| Feature | Free-Tier | Pro Tier | Managed Tier |
|---------|-----------|----------|--------------|
| **AI Code Generation** | ✅ Limit: 10/day | ✅ Unlimited | ✅ Unlimited |
| **GitHub Integration** | ✅ Personal repos | ✅ Personal + Orgs | ✅ Enterprise |
| **Cloudflare Deploy** | ✅ User account | ✅ Platform account | ✅ Dedicated account |
| **Preview Environments** | ✅ Branch-based | ✅ Unlimited | ✅ Unlimited |
| **Custom Domains** | ❌ | ✅ | ✅ |
| **Team Collaboration** | ❌ | ✅ Up to 10 | ✅ Unlimited |
| **Priority Support** | ❌ | ✅ | ✅ Dedicated |
| **SLA** | Best effort | 99.5% | 99.9% |
| **Audit Logs** | ❌ | ✅ 30 days | ✅ Unlimited retention |
| **SSO/SAML** | ❌ | ❌ | ✅ |
| **White-label** | ❌ | ❌ | ✅ |

---

## 3. مرز مسئولیت‌ها (Ownership Boundaries)

### 3.1 Free-Tier

```
┌─────────────────────────────────────────┐
│         Control Plane (Shared)           │
│  ┌───────────────────────────────────┐  │
│  │  Platform API                     │  │
│  │  - Auth, metadata                 │  │
│  │  - Integration records            │  │
│  │  - Deployment tracking            │  │
│  └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│         User Infrastructure              │
│  ┌───────────────────────────────────┐  │
│  │  GitHub Account                   │  │
│  │  Cloudflare Account               │  │
│  │  GitHub Actions (free minutes)    │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Ownership:**
- Code: User
- CI/CD execution: GitHub (user's minutes)
- Deployment runtime: User's Cloudflare account
- Secrets custody: Encrypted in D1, decrypted by Platform API only
- Monitoring: User (Cloudflare dashboard)

---

### 3.2 Pro Tier

```
┌─────────────────────────────────────────┐
│       Managed Control Plane              │
│  ┌───────────────────────────────────┐  │
│  │  Platform API (dedicated schema)  │  │
│  │  Managed CI/CD                    │  │
│  │  Secrets Vault                    │  │
│  └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│       Platform Infrastructure            │
│  ┌───────────────────────────────────┐  │
│  │  Workers for Platforms            │  │
│  │  Platform-managed deploy          │  │
│  │  Managed caching/edge             │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Ownership:**
- Code: User (in user's GitHub or platform git)
- CI/CD execution: Platform (or user's GitHub)
- Deployment runtime: Platform-owned Workers for Platforms
- Secrets custody: Platform Vault + D1 encryption
- Monitoring: Platform + user dashboard

---

### 3.3 Managed Tier

```
┌─────────────────────────────────────────┐
│    Dedicated Control Plane               │
│  ┌───────────────────────────────────┐  │
│  │  Isolated API cluster             │  │
│  │  Dedicated DB                     │  │
│  │  Private Vault                    │  │
│  └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│   Dedicated Infrastructure               │
│  ┌───────────────────────────────────┐  │
│  │  Dedicated Workers namespace      │  │
│  │  Dedicated KV/D1/R2               │  │
│  │  Custom domain routing            │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Ownership:**
- Code: User (flexible git provider)
- CI/CD execution: User's choice
- Deployment runtime: Dedicated Cloudflare resources
- Secrets custody: Dedicated Vault + HSM integration
- Monitoring: Dedicated observability stack

---

## 4. Data Flow per Model

### 4.1 Free-Tier Data Flow

```
User Action (Portal SPA)
    ↓
Platform API (Validate, Auth)
    ↓
GitHub API (Create repo, set secrets)
    ↓
GitHub Actions (Build + Deploy with user's CF token)
    ↓
User's Cloudflare Account (Runtime)
    ↓
Webhook callback → Platform API → Update D1
    ↓
SSE/Polling → Portal SPA (Show preview URL)
```

**Data boundaries:**
- Platform API has access to: Integration tokens (encrypted), app metadata
- GitHub Actions has access to: Source code, CF_API_TOKEN (as secret)
- User's CF account has access to: Deployed Worker execution only

---

### 4.2 Pro Tier Data Flow

```
User Action (Portal SPA)
    ↓
Platform API (Validate, Auth, Dedicated Schema)
    ↓
Platform CI/CD Manager (Trigger workflow)
    ↓
Build Environment (Ephemeral container)
    ↓
Workers for Platforms (Deploy to platform namespace)
    ↓
Platform State Machine (Update deployment status)
    ↓
SSE → Portal SPA (Real-time updates)
```

**Data boundaries:**
- Platform owns entire pipeline
- User has visibility via Portal and API
- Secrets in platform Vault, never exposed to user

---

### 4.3 Managed Tier Data Flow

```
User Action (Portal SPA / Custom UI)
    ↓
Dedicated API Cluster (Isolated tenant context)
    ↓
Platform CI/CD (BYO or managed)
    ↓
Deploy → Dedicated Cloudflare Namespace
    ↓
Custom Observability Stack
    ↓
SSE / Webhook / Custom callback
```

**Data boundaries:**
- Fully isolated by tenant
- Custom integrations allowed
- BYO monitoring/alerting supported

---

## 5. Pricing & Limits Model

### 5.1 Free-Tier Limits

| Resource | Limit | Enforcement |
|----------|-------|-------------|
| AI generations/day | 10 | Token bucket in Platform API |
| Apps | 5 | Tenant metadata limit |
| Deploys/day | 20 | Deployment run limit |
| Storage (R2/artifacts) | 1GB | Platform-managed bucket limits |
| GitHub Actions minutes | User's free quota | GitHub enforces |
| Concurrent builds | 2 | Platform API throttle |

### 5.2 Pro Tier Limits (Starter Plan)

| Resource | Limit | Enforcement |
|----------|-------|-------------|
| AI generations/day | 1000 | Token bucket |
| Apps | 50 | Tenant metadata |
| Deploys/day | 500 | Deployment run limit |
| Storage | 50GB | Platform bucket quotas |
| Custom domains | 10 | Domain registry limit |
| Concurrent builds | 10 | Platform CI manager |
| Retention (logs/artifacts) | 30 days | R2 lifecycle rules |

### 5.3 Managed Tier Limits

| Resource | Limit | Enforcement |
|----------|-------|-------------|
| Custom per contract | Negotiated | Usage metering + billing integration |
| Minimum commitment | $2,000/mo | Contract |

---

## 6. Migration Path (Free → Pro → Managed)

### 6.1 Upgrade Triggers

User is eligible for upgrade when:
1. Free-tier AI limit exceeded 3 consecutive days
2. Storage > 900MB for 7 consecutive days
3. Deploy frequency > 15/day average over 30 days
4. User explicitly requests upgrade
5. Organization invites team members (>1 user on free-tier)

### 6.2 Migration Steps (Software)

1. **Metadata migration:** Move `tenant_id` namespace in D1
2. **Secrets rotation:** Re-issue encrypted tokens for dedicated custody
3. **GitHub re-configuration:** Update Actions secrets to point to new target
4. **Deploy target switch:** Update deployment targets from user CF to platform CF
5. **State snapshot:** Capture current app states for audit
6. **Rollback plan:** Keep original free-tier metadata for 30 days

### 6.3 Downgrade Path

Allowed when:
- User explicitly requests downgrade
- User exports all app data
- User removes team members
- User connects personal Cloudflare account again

**Grace period:** 30 days of read-only access to managed tier data after downgrade request.

---

## 7. Operational Considerations

### 7.1 Multi-Tenancy Isolation

| Model | Isolation Level | Mechanism |
|-------|----------------|-----------|
| Free-Tier | Soft multi-tenancy | Tenant ID in all D1 queries, resource quotas |
| Pro Tier | Hard multi-tenancy | Dedicated schema per tenant, strict quota enforcement |
| Managed Tier | Physical isolation | Separate DB cluster, dedicated CF namespace |

### 7.2 Compliance & Audit

- Free-Tier: Basic access logs only
- Pro Tier: Audit log retained 30 days
- Managed Tier: Full audit trail, SOC2 Type II ready, custom retention

### 7.3 Support Levels

| Model | Support Channel | Response Time |
|-------|----------------|---------------|
| Free-Tier | Documentation + Community forums | Best effort |
| Pro Tier | Email support | 24 hours |
| Managed Tier | Dedicated Slack + Phone | 4 hours (P1), 1 business day (P2) |

---

## 8. göç Kararları (Final Decisions)

1. **Decision 1:** Free-tier remains the baseline for v1. No paid features block core functionality.
2. **Decision 2:** Pro tier is the primary monetization target. Managed tier is for enterprise.
3. **Decision 3:** All three models share the same Portal SPA and Platform API codebase. Schema separation happens via tenant_type discriminator.
4. **Decision 4:** Migration between tiers must be possible without re-building apps from scratch.
5. **Decision 5:** Billing and metering is platform responsibility. Users never get platform-level invoices for free-tier usage.

---

## 9. Exit Criteria (Definition of Done)

این سند زمانی کامل است که:
- [ ] هر model به‌صورت واضح تعریف شده باشد
- [ ] مرزهای ownership به صورت کد قابل enforce باشند
- [ ] pricing units و limits measurable باشند
- [ ] migration path در code reflected باشد
- [ ] Platform API قابلیت tenant_type discrimination داشته باشد