# Managed Tier Migration Contract

**وضعیت:** Proposed (Future / Exploratory)
**هدف:** تعریف کامل migration path از Free-Tier به Managed Platform Tier، شامل software steps، contract changes، data residency transfer، و rollback procedures.

---

## 1. چرا این سند لازم است؟

این سند قابلیت upgrade را از یک "امید به خدا" به یک **engineered migration** تبدیل می‌کند.

### without this contract:
- کاربر نمی‌داند چه چیزی بعد از upgrade تغییر می‌کند
- team نمی‌داند codebase چه تغییراتی نیاز دارد
- data residency و privacy commitments زیر سوال می‌روند
- rolling back ممکن است داده‌ها را از بین ببرد

### with this contract:
- هر zone of change تصریح شده
- به驗 tests برای migration وجود دارد
- rollback plan به‌صورت reversible است
- تبدیل self-service است

---

## 2. Migration Strategy Principles

### 2.1 Core Principles

1. **Non-destructive:** هیچ داده یا app کاربر از بین نمی‌رود
2. **Reversible:** کاربر بتواند به free-tier بازگردد (با grace period)
3. **Progressive:** можна step-by-step انجام شود، نه big-bang
4. **Self-service:** کاربر بتواند بدون đãng support انجام دهد
5. **Transparent:** کاربر بفهمد چه تغییراتی در حال رخ دادن است

### 2.2 What Stays the Same

| Aspect | Free-Tier | Managed Tier | Notes |
|--------|-----------|--------------|-------|
| Source code | GitHub | GitHub | No change |
| Portal SPA | Same | Same | Same UI |
| D1 schemas | Same tables | Same tables | Tenant discriminator only |
| API contracts | REST | REST | Backward compatible |
| AG-UI Protocol | Same | Same | Protocol unchanged |
| CopilotKit integration | Same | Same | Extends features, doesn't replace |

### 2.3 What Changes

| Aspect | Free-Tier | Managed Tier | Impact |
|--------|-----------|--------------|--------|
| Build engine | GitHub Actions | Platform CI or BYO | Transparent to user |
| Deploy target | User's CF account | Platform CF namespace | URL may change |
| Secrets storage | D1 encrypted | Dedicated Vault | Seamless rotation |
| Multi-tenancy | Soft (tenant_id) | Hard (dedicated schema) | Transparent |
| Rate limits | Shared quotas | Dedicated quotas | User sees increase |
| Monitoring | User's CF dashboard | Platform + user dashboards | Enhanced |
| Support tier | Community | Dedicated support | New channel |
| Billing | User → CF directly | Platform invoices user | New invoice flow |

---

## 3. Migration Phases

### Phase 1: Environment Provisioning (Platform Side)

**Goal:** Set up dedicated infrastructure for the tenant.

**Steps:**
1. Provision dedicated D1 schema `tenant_{id}`
2. Create dedicated Cloudflare namespace/account
3. Initialize KV namespace `TENANT_MEMORY_{id}`
4. Create R2 bucket `tenant-artifacts-{id}`
5. Set up CI/CD pipeline configuration
6. Configure routing rules in Workers for Platforms
7. Set up Observability tenant context

**Duration:** 5-10 minutes
**Rollback:** Delete provisioned resources

**API Call:**
```typescript
POST /api/admin/tenants/{tenant_id}/provision-managed
Authorization: platform-admin-token

{
  "plan": "pro", // or "managed"
  "cloudflare_account_id": "user-provided-or-new",
  "ci_provider": "github-actions", // or "platform-managed"
  "custom_domain": "app.example.com" // optional
}
```

---

### Phase 2: Data Migration

**Goal:** Copy existing app metadata and state to dedicated infrastructure.

**Steps:**
1. Export `apps` metadata for tenant
2. Export `deployment_runs` history (read-only archival)
3. Export `integration_connections` (token rotation needed)
4. Import into dedicated schema with new tenant context
5. Update `tenant_type` discriminator from `free` to `managed`
6. Validate data integrity (row counts, checksums)

**Duration:** 2-5 minutes (depends on data volume)
**Rollback:** Revert `tenant_type`, keep free-tier data intact

**Implementation:**
```typescript
class TenantDataMigrator {
  async migrateTenant(
    tenantId: string,
    targetSchema: string
  ): Promise<MigrationResult> {
    const transaction = await this.db.transaction();
    
    try {
      // 1. Snapshot current state
      const snapshot = await this.createSnapshot(tenantId);
      
      // 2. Export data
      const apps = await this.getApps(tenantId);
      const deployments = await this.getDeployments(tenantId);
      const connections = await this.getConnections(tenantId);
      
      // 3. Rotate secrets (re-encrypt for dedicated custody)
      const rotatedConnections = await this.rotateSecrets(connections);
      
      // 4. Import to dedicated schema
      await this.importToSchema(targetSchema, {
        apps,
        deployments,
        connections: rotatedConnections
      });
      
      // 5. Update tenant type
      await this.updateTenantType(tenantId, 'managed');
      
      // 6. Validate
      await this.validateMigration(tenantId, targetSchema, snapshot);
      
      await transaction.commit();
      
      return {
        success: true,
        apps_migrated: apps.length,
        deployments_migrated: deployments.length
      };
      
    } catch (error) {
      await transaction.rollback();
      throw new MigrationError('Data migration failed', { cause: error });
    }
  }
}
```

---

### Phase 3: Secrets Rotation

**Goal:** Move encrypted tokens from shared D1 custody to dedicated Vault.

**Why:** In managed tier, platform owns the deployment credentials.

**Steps:**
1. Generate new platform-owned API tokens for:
   - GitHub (if using platform CI)
   - Cloudflare (deployment credentials)
2. Encrypt tokens with dedicated KMS key
3. Store in Vault (or encrypted D1 with dedicated key)
4. Update all workflow references
5. Revoke old user-provided tokens (grace period: 24 hours)

**Rollback:** Restore original encrypted tokens from snapshot

**Security Note:**
- Platform NEVER sees plaintext tokens
- Rotation happens via encrypted envelope
- Audit log of all rotation events

```typescript
class SecretsRotationService {
  async rotateToManagedVault(
    tenantId: string,
    connections: IntegrationConnection[]
  ): Promise<RotationResult> {
    const vaultClient = await this.getVaultClient(tenantId);
    
    for (const connection of connections) {
      // 1. Decrypt with old key (shared)
      const plaintext = await this.decryptWithSharedKey(
        connection.encrypted_token
      );
      
      // 2. Re-encrypt with dedicated tenant key
      const newEncrypted = await this.encryptWithTenantKey(
        plaintext,
        tenantId
      );
      
      // 3. Store in dedicated Vault
      await vaultClient.storeSecret(
        `integration/${connection.provider}/token`,
        newEncrypted
      );
      
      // 4. Update reference in dedicated D1 schema
      await this.updateConnectionReference(
        tenantId,
        connection.id,
        { vault_path: `integration/${connection.provider}/token` }
      );
    }
    
    // 5. Schedule old token revocation (24h grace period)
    await this.scheduleTokenRevocation(tenantId, connections, 24);
    
    return { rotated: connections.length };
  }
}
```

---

### Phase 4: CI/CD Pipeline Migration

**Goal:** Switch build/deploy from user's GitHub Actions to platform-managed pipeline.

**Options:**
- **Option A:** Keep user's GitHub Actions (configure secrets to point to new target)
- **Option B:** Migrate to platform-managed CI
- **Option C:** Hybrid - user's Actions for build, platform for deploy

**Steps for Option A (least invasive):**
1. Generate new Cloudflare API token scoped to platform namespace
2. Update GitHub Actions secret `CLOUDFLARE_API_TOKEN` in user's repo
3. Update deployment target in `wrangler.toml` to platform namespace
4. Update webhook callbacks to point to platform API endpoints
5. Run test deploy to verify configuration

**Steps for Option B (fully managed):**
1. Export GitHub Actions workflow config
2. Create equivalent workflow in platform CI system
3. Set up webhook from GitHub (push/PR events) → Platform CI
4. Migrate build cache and artifacts
5. Update repository webhooks
6. Test end-to-end deploy

**Duration:** 10-15 minutes
**Rollback:** Restore original secrets and webhook configuration

---

### Phase 5: Runtime Migration

**Goal:** Switch active deployments from user's CF account to platform CF namespace.

**Steps:**
1. Trigger production deploy to new target (platform namespace)
2. Verify new deployment is healthy (smoke tests)
3. Update DNS/custom domain records (if applicable)
4. Switch traffic (instant with Cloudflare routing)
5. Keep old deployment running for 30 minutes (blue-green)
6. Decommission old deployment after validation period

**Zero-Downtime Strategy:**
```typescript
class ZeroDowntimeDeploymentMigrator {
  async migrateRuntime(
    appId: string,
    oldTarget: DeploymentTarget,
    newTarget: DeploymentTarget
  ): Promise<MigrationResult> {
    // 1. Deploy to new target (staging)
    const newDeployment = await this.deployToTarget(appId, newTarget, {
      environment: 'preview'
    });
    
    // 2. Run smoke tests
    await this.runSmokeTests(newDeployment.url);
    
    // 3. Deploy to production (new target)
    const newProduction = await this.deployToTarget(appId, newTarget, {
      environment: 'production'
    });
    
    // 4. Update route to point to new target
    await this.updateRoute(appId, {
      worker_name: newTarget.worker_name,
      route_pattern: oldTarget.route_pattern // keep old pattern
    });
    
    // 5. Verify traffic is flowing to new target
    await this.verifyTrafficRouting(appId, newTarget);
    
    // 6. Keep old target alive for rollback window (1 hour)
    await this.scheduleDecommission(oldTarget, 1);
    
    return {
      new_url: newProduction.url,
      rollback_deadline: new Date(Date.now() + 60 * 60 * 1000)
    };
  }
}
```

---

### Phase 6: Observability & Monitoring Migration

**Goal:** Transfer monitoring, logging, and alerting to platform-managed systems.

**Steps:**
1. Set up platform Analytics Engine dataset for tenant
2. Configure Logpush to tenant-specific R2 bucket
3. Migrate existing deployment logs (last 30 days)
4. Set up platform dashboard for tenant
5. Configure alerts (error rate, latency, quota)
6. Grant user access to platform observability dashboard

**Duration:** 5 minutes

---

### Phase 7: Validation & Cutover

**Goal:** Validate everything works, then officially switch tenant to managed mode.

**Validation Checklist:**
- [ ] All apps accessible via new URLs
- [ ] New deploys succeed on platform CI
- [ ] Secrets rotated and workflows functional
- [ ] Monitoring dashboards showing data
- [ ] User can access portal with enhanced features
- [ ] Support team notified of migration
- [ ] Billing system updated for new plan

**Cutover Command:**
```typescript
POST /api/admin/tenants/{tenant_id}/complete-migration
{
  "new_plan": "managed",
  "effective_date": "2024-01-15T10:00:00Z",
  "grandfather_until": "2024-01-22T10:00:00Z" // 7-day rollback window
}
```

**Post-Migration Notifications:**
1. Email to user: "Your account has been upgraded to Managed Tier"
2. In-app banner: "You're now on Managed Tier with enhanced features"
3. Support team: New tenant onboarded to managed tier

---

## 4. Rollback Procedures

### 4.1 Grace Period Rollback (0-7 days)

**Allowed:** Yes, automatic
**Procedure:**
1. User clicks "Downgrade to Free-Tier" in settings
2. System validates no data loss (apps, deployments intact)
3. Execute reverse migration:
   - Re-encrypt secrets with shared key
   - Copy data back to shared schema
   - Update CI/CD secrets back to user tokens
   - Switch deploy target back to user CF account
4. Trigger test deploy to validate
5. Decommission managed infrastructure

**Duration:** 15-30 minutes
**Data Loss:** None

### 4.2 Emergency Rollback (>7 days)

**Allowed:** Yes, with support assistance
**Procedure:** Same as above, but:
- Requires platform admin approval
- May incur data export fees if >7 days
- Some platform-specific features lost (custom domains may need reconfiguration)

### 4.3 Rollback Triggers (Platform-Initiated)

Platform may initiate rollback if:
- Critical bug in managed tier infrastructure
- Security incident
- User request with extenuating circumstances

---

## 5. Downgrade Contract

### 5.1 Eligibility for Downgrade

User can downgrade when:
1. All team members removed (if pro tier > 1 user)
2. Custom domains transferred or deleted
3. No active service contracts
4. Account in good standing (no overdue invoices)

### 5.2 Data Export (Right to Leave)

Before downgrade, platform must provide:
1. Full app source code export (already in GitHub)
2. Deployment history export (CSV/JSON)
3. Agent run logs (if applicable)
4. Integration credentials (user's own tokens)
5. Audit logs for compliance

**Format:** Machine-readable JSON/CSV
**Retention:** Available for 30 days post-downgrade

### 5.3 Post-Downgrade State

After downgrade:
- Apps continue running on free-tier infrastructure
- User gets back shared D1 schema access
- Team collaboration disabled
- Custom domains removed (user must reconfigure)
- Enhanced features disabled (AG-UI streaming limited)
- Billing stops at end of current billing period

---

## 6. Codebase Implications

### 6.1 Platform API Changes

**New endpoint:**
```typescript
// Tenant provisioning
POST /api/admin/tenants/{id}/provision-managed
POST /api/admin/tenants/{id}/migrate-data
POST /api/admin/tenants/{id}/rotate-secrets
POST /api/admin/tenants/{id}/complete-migration
POST /api/admin/tenants/{id}/rollback-to-free
GET /api/admin/tenants/{id}/migration-status
```

**New middleware:**
```typescript
// Tenant type discriminator
function withTenantType(c: Context, next: Next) {
  const tenant = await getTenant(c.req.param('tenant_id'));
  
  if (tenant.type === 'managed') {
    // Use dedicated schema
    c.set('db_schema', `tenant_${tenant.id}`);
    c.set('vault_namespace', `tenant_${tenant.id}`);
  } else {
    // Use shared schema
    c.set('db_schema', 'shared');
    c.set('vault_namespace', 'shared');
  }
  
  return next();
}
```

### 6.2 Database Changes

**New schemas:**
- `tenant_{id}` - Dedicated schema per managed tenant
- `shared` - Existing schema for free-tier tenants

**Migration queries:**
```sql
-- Copy data from shared to dedicated schema
INSERT INTO tenant_123.apps SELECT * FROM shared.apps 
WHERE tenant_id = 'tenant-uuid';

-- Update tenant type
UPDATE tenants SET type = 'managed' WHERE id = 'tenant-uuid';
```

### 6.3 Worker Changes

**multi-binding support:**
```typescript
// wrangler.toml per tenant (dynamic)
export default {
  // ...
  
  d1_databases: [
    { binding: "DB", database_name: "nexus-db" },
    // Managed tenant gets additional binding
    ...(tenant.type === 'managed' ? [
      { binding: "TENANT_DB", database_name: `tenant-${tenant.id}` }
    ] : [])
  ],
  
  kv_namespaces: [
    { binding: "MEMORY" },
    ...(tenant.type === 'managed' ? [
      { binding: "TENANT_MEMORY", id: "kv-tenant-123" }
    ] : [])
  ]
};
```

---

## 7. Testing Strategy

### 7.1 Migration Integration Tests

```typescript
describe('Managed Tier Migration', () => {
  let testTenant: Tenant;
  
  beforeEach(async () => {
    // Create free-tier tenant with sample data
    testTenant = await createTestTenant({ type: 'free' });
    await seedTestData(testTenant.id);
  });
  
  it('should migrate tenant successfully', async () => {
    // 1. Provision managed resources
    await provisionManagedResources(testTenant.id);
    
    // 2. Migrate data
    const result = await migrateData(testTenant.id);
    expect(result.apps_migrated).toBeGreaterThan(0);
    
    // 3. Verify apps still accessible
    const apps = await getApps(testTenant.id);
    expect(apps).toHaveLength(result.apps_migrated);
    
    // 4. Verify new deployment works
    const deployment = await deployToManagedTarget(testTenant.id);
    expect(deployment.url).toContain('platform.workers.dev');
  });
  
  it('should rollback successfully', async () => {
    // Migrate to managed
    await migrateToManaged(testTenant.id);
    
    // Rollback
    await rollbackToFree(testTenant.id);
    
    // Verify free-tier state restored
    const tenant = await getTenant(testTenant.id);
    expect(tenant.type).toBe('free');
    
    // Verify apps still work
    const apps = await getApps(testTenant.id);
    expect(apps).toHaveLength(0); // or verify in shared schema
  });
});
```

### 7.2 Contract Tests

```typescript
describe('Managed Tier Contracts', () => {
  it('should maintain API backward compatibility', async () => {
    const freeResponse = await api.getApps({ tenantType: 'free' });
    const managedResponse = await api.getApps({ tenantType: 'managed' });
    
    expect(freeResponse.shape).toEqual(managedResponse.shape);
  });
  
  it('should enforce resource limits', async () => {
    // Free-tier limit: 5 apps
    const freeTenant = await createTenant({ type: 'free' });
    await expect(
      createApps(freeTenant.id, 6)
    ).rejects.toThrow('quota_exceeded');
    
    // Managed limit: 50 apps
    const managedTenant = await migrateToManaged(freeTenant.id);
    await createApps(managedTenant.id, 6); // Should succeed
  });
});
```

---

## 8. Business Rules

### 8.1 When Migration Is Allowed

```typescript
function canMigrateToManaged(tenant: Tenant): MigrationEligibility {
  const checks = [
    // 1. Tenant must be in good standing
    checkAccountStatus(tenant),
    
    // 2. No pending billing issues
    checkBillingStatus(tenant),
    
    // 3. Within upgrade window (e.g., not in first 7 days)
    checkUpgradeWindow(tenant),
    
    // 4. No active contracts that forbid migration
    checkContracts(tenant)
  ];
  
  const failed = checks.filter(c => !c.passed);
  
  if (failed.length > 0) {
    return {
      eligible: false,
      reasons: failed.map(f => f.reason)
    };
  }
  
  return { eligible: true };
}
```

### 8.2 Proration Logic

```typescript
interface ProrationResult {
  credit_remaining: number;
  charge_for_managed: number;
  total_due: number;
  next_billing_date: Date;
}

function calculateProration(
  currentPlan: Plan,
  newPlan: Plan,
  currentPeriodEnd: Date
): ProrationResult {
  const now = new Date();
  const daysRemaining = daysBetween(now, currentPeriodEnd);
  const totalDays = daysBetween(currentPeriodStart, currentPeriodEnd);
  
  // Refund unused portion of current plan
  const dailyRate = currentPlan.price / totalDays;
  const creditRemaining = dailyRate * daysRemaining;
  
  // Charge pro-rated amount for new plan
  const newDailyRate = newPlan.price / totalDays;
  const chargeForManaged = newDailyRate * daysRemaining;
  
  const totalDue = chargeForManaged - creditRemaining;
  
  return {
    credit_remaining,
    charge_for_managed: chargeForManaged,
    total_due: Math.max(0, totalDue),
    next_billing_date: currentPeriodEnd
  };
}
```

### 8.3 Billing Transition

```
Day 0: User requests upgrade
  ↓
System calculates proration
  ↓
Show user: "You'll be charged $X for the remainder of this billing period"
  ↓
User confirms
  ↓
System:
  1. Creates invoice for prorated amount
  2. Processes payment
  3. Updates tenant plan
  4. Triggers migration workflow
  ↓
Day 0+5min: Migration completes
  ↓
Day 30: New billing cycle starts (full price)
```

---

## 9. Monitoring & Alerts

### 9.1 Migration Health Metrics

```yaml
metrics:
  - name: migration_attempt_total
    labels: [tenant_id, target_plan, status]
    description: "Count of migration attempts"
    
  - name: migration_duration_seconds
    labels: [tenant_id, target_plan]
    description: "Time taken to complete migration"
    
  - name: migration_data_bytes
    labels: [tenant_id, entity_type]
    description: "Volume of data migrated"
    
  - name: migration_failure_total
    labels: [tenant_id, phase, error_type]
    description: "Count of migration failures"
```

### 9.2 Alerts

```yaml
alerts:
  - name: MigrationFailureRate
    condition: "rate(migration_failure_total[5m]) > 0.1"
    severity: warning
    action: notify-platform-team
    
  - name: MigrationDurationHigh
    condition: "histogram_quantile(0.95, migration_duration_seconds) > 600"
    severity: warning
    action: investigate-slow-migrations
    
  - name: DataLossDetected
    condition: "migration_data_bytes{phase='validation'} < migration_data_bytes{phase='export'}"
    severity: critical
    action: page-oncall
```

---

## 10. Definition of Done

This contract is complete when:
- [ ] All 7 migration phases defined and tested
- [ ] Rollback procedures documented and tested
- [ ] End-to-end integration tests passing
- [ ] Platform API endpoints implemented
- [ ] Database schema changes deployed
- [ ] Observability metrics shipped
- [ ] Runbooks written for oncall team
- [ ] User-facing migration guide written
- [ ] Pricing and billing integration complete
- [ ] Security review passed (data residency, encryption)
- [ ] Load testing completed (100 concurrent migrations)

---

## 11. Open Questions

1. **Q:** Should managed tier support BYO CI (user's GitHub Actions) or force platform CI?
   **A:** Support both, default to platform CI for convenience.

2. **Q:** What happens to user's GitHub Actions minutes quota after migration?
   **A:** They remain available for other projects, but platform CI uses platform resources.

3. **Q:** Can user switch back to free-tier after 90 days on managed?
   **A:** Yes, but custom domains and advanced features will be removed.

4. **Q:** Is there a migration fee?
   **A:** No, but pro-rated charges apply for the remainder of billing period.

5. **Q:** What if user's Cloudflare account is deleted during managed tier?
   **A:** Platform-owned namespace ensures apps remain operational.

---

## 12. Appendix: Timeline

```
Day 0: User requests upgrade
  ↓
Hours 0-1:
  - Provision infrastructure
  - Migrate data
  - Rotate secrets
  - Update CI/CD
  ↓
Hours 1-2:
  - Migrate runtime
  - Validate deployments
  - Transfer monitoring
  ↓
Hours 2-3:
  - Final validation
  - Cutover to managed mode
  - Notify user
  ↓
Day 1-7:
  - Grace period (rollback available)
  - Monitor for issues
  ↓
Day 7+:
  - Grace period ends
  - Full managed tier active
```

---

## 13. Success Criteria

Migration is successful when:
1. User can access all apps via portal
2. New deploys succeed on platform infrastructure
3. No data loss (apps, deployments, history)
4. Monitoring shows normal error rates (<1%)
5. User confirms functionality in acceptance test
6. Billing transitioned smoothly
7. Support tickets resolved within SLA

---

## 14. Related Documents

- `FREE_TIER_DEPLOY_FLOW.md` - Original free-tier flow
- `OPERATING_MODEL_MATRIX.md` - Feature/pricing matrix
- `GITHUB_ACTIONS_DEPLOYMENT_CONTRACT.md` - CI/CD contract
- `D1_SCHEMA_V1.md` - Database schema
- `AGENTS_INTEGRATION_PLAN.md` - Agent layer

---

## 15. Changelog

- **v0.1** (2024-01-10): Initial draft
- **v0.2** (2024-01-12): Added rollback procedures and billing logic
- **v1.0** (2024-01-15): Baseline for Phase 1 implementation