# TASK 15-05: Durable Approval Gates with Workflows

## Objective
Implement human-in-the-loop approval workflows using Cloudflare Workflows' `sleepUntil` primitive for durable, long-running approval waits without CPU billing.

## Prerequisites
- TASK 15-01 completed (Agent Runtime Foundation)
- TASK 15-02 completed (Workflow Definition)
- TASK 15-03 completed (Tool Ecosystem)
- TASK 15-04 completed (Parallel Execution)
- Slack/Email integration configured

## Implementation

### Step 1: Approval Request/Response Protocol

Create `platform-api/src/orchestration/approval-gate.ts`:
```typescript
export enum ApprovalType {
  DEPLOY_PRODUCTION = 'deploy_production',
  CODE_REVIEW_CRITICAL = 'code_review_critical',
  AGENT_ACTION = 'agent_action',
  BUDGET_ALERT = 'budget_alert'
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  appId: number;
  sessionId: string;
  agentId: string;
  payload: {
    summary: string;
    details: Record<string, any>;
    previewUrl?: string;
    changes?: string[];
    riskLevel: 'low' | 'medium' | 'high';
  };
  requestedBy: string;
  requestedAt: number;
  expiresAt: number;
  status: ApprovalStatus;
  approver?: string;
  comment?: string;
  resolvedAt?: number;
}

export interface ApprovalResponse {
  requestId: string;
  approved: boolean;
  comment: string;
  approver: string;
}

export class ApprovalGate {
  private pendingApprovals: Map<string, ApprovalRequest> = new Map();
  private timeoutHandles: Map<string, NodeJS.Timeout> = new Map();

  constructor(private env: Env) {}

  createRequest(request: Omit<ApprovalRequest, 'id' | 'requestedAt' | 'status'>): ApprovalRequest {
    const id = `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const approval: ApprovalRequest = {
      ...request,
      id,
      requestedAt: Date.now(),
      status: ApprovalStatus.PENDING
    };

    this.pendingApprovals.set(id, approval);

    // Set expiration timeout (default 1 hour)
    const timeoutMs = (approval.expiresAt - approval.requestedAt);
    const timeoutHandle = setTimeout(() => {
      this.expireRequest(id);
    }, timeoutMs);

    this.timeoutHandles.set(id, timeoutHandle);

    console.log(`[ApprovalGate] Created request ${id} for ${request.type}`);

    return approval;
  }

  async respond(response: ApprovalResponse): Promise<ApprovalRequest | null> {
    const request = this.pendingApprovals.get(response.requestId);

    if (!request) {
      console.error(`[ApprovalGate] Request ${response.requestId} not found`);
      return null;
    }

    if (request.status !== ApprovalStatus.PENDING) {
      console.error(`[ApprovalGate] Request ${response.requestId} is not pending`);
      return null;
    }

    // Clear timeout
    const timeoutHandle = this.timeoutHandles.get(response.requestId);
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      this.timeoutHandles.delete(response.requestId);
    }

    // Update request
    request.status = response.approved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
    request.approver = response.approver;
    request.comment = response.comment;
    request.resolvedAt = Date.now();

    console.log(`[ApprovalGate] Request ${response.requestId} ${request.status}`);

    // Persist to D1
    await this.persistRequest(request);

    // Notify orchestrator
    await this.notifyOrchestrator(request);

    return request;
  }

  getRequest(id: string): ApprovalRequest | undefined {
    return this.pendingApprovals.get(id);
  }

  getPendingRequests(appId?: number): ApprovalRequest[] {
    return Array.from(this.pendingApprovals.values()).filter(req => {
      if (appId && req.appId !== appId) return false;
      return req.status === ApprovalStatus.PENDING;
    });
  }

  private expireRequest(id: string): void {
    const request = this.pendingApprovals.get(id);

    if (request && request.status === ApprovalStatus.PENDING) {
      request.status = ApprovalStatus.EXPIRED;
      request.resolvedAt = Date.now();

      console.log(`[ApprovalGate] Request ${id} expired`);

      // Notify orchestrator of expiration
      this.notifyOrchestrator(request);
    }

    this.pendingApprovals.delete(id);
    this.timeoutHandles.delete(id);
  }

  private async persistRequest(request: ApprovalRequest): Promise<void> {
    await this.env.DB.prepare(`
      INSERT INTO approval_requests (id, app_id, session_id, type, payload, status, approver, comment, requested_at, resolved_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      request.id,
      request.appId,
      request.sessionId,
      request.type,
      JSON.stringify(request.payload),
      request.status,
      request.approver,
      request.comment,
      request.requestedAt,
      request.resolvedAt
    ).run();
  }

  private async notifyOrchestrator(request: ApprovalRequest): Promise<void> {
    const orchestratorId = this.env.ORCHESTRATOR.idFromName(`app-${request.appId}`);
    const orchestrator = this.env.ORCHESTRATOR.get(orchestratorId);

    await orchestrator.fetch(
      new Request('http://internal/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved: request.status === ApprovalStatus.APPROVED,
          comment: request.comment
        })
      })
    );
  }
}
```

### Step 2: Notification Service

Create `platform-api/src/orchestration/notification.ts`:
```typescript
export interface NotificationPayload {
  to: string[];
  subject: string;
  message: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  constructor(private env: Env) {}

  async sendApprovalRequest(approval: ApprovalRequest): Promise<void> {
    const summary = this.formatApprovalSummary(approval);

    // Send Slack notification
    await this.sendSlackNotification({
      to: ['#approvals', '@on-call'],
      subject: `Approval Required: ${approval.type}`,
      message: summary,
      metadata: {
        approvalId: approval.id,
        appId: approval.appId,
        riskLevel: approval.payload.riskLevel,
        previewUrl: approval.payload.previewUrl
      }
    });

    // Send Email notification
    await this.sendEmailNotification({
      to: this.getApproverEmails(approval.type),
      subject: `[Action Required] ${approval.type}`,
      message: summary
    });

    // Send Portal notification (via WebSocket/Push)
    await this.sendPortalNotification(approval);
  }

  async sendApprovalResult(approval: ApprovalRequest): Promise<void> {
    const result = approval.status === ApprovalStatus.APPROVED ? '✅ Approved' : '❌ Rejected';
    const summary = `${result}: ${approval.type} for app ${approval.appId}`;

    await this.sendSlackNotification({
      to: ['#approvals'],
      subject: `Approval ${approval.status}`,
      message: summary,
      metadata: {
        approvalId: approval.id,
        approver: approval.approver,
        comment: approval.comment
      }
    });
  }

  private async sendSlackNotification(payload: NotificationPayload): Promise<void> {
    if (!this.env.SLACK_WEBHOOK_URL) {
      console.warn('[Notification] Slack webhook not configured');
      return;
    }

    await fetch(this.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: payload.subject,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${payload.subject}*\n${payload.message}`
            }
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Approve' },
                style: 'primary',
                value: `approve:${payload.metadata?.approvalId}`
              },
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Reject' },
                style: 'danger',
                value: `reject:${payload.metadata?.approvalId}`
              }
            ]
          }
        ]
      })
    });
  }

  private async sendEmailNotification(payload: NotificationPayload): Promise<void> {
    if (!this.env.EMAIL_API_KEY) {
      console.warn('[Notification] Email API not configured');
      return;
    }

    // Implementation using Resend/SendGrid/etc.
    console.log(`[Notification] Email to ${payload.to}: ${payload.subject}`);
  }

  private async sendPortalNotification(approval: ApprovalRequest): Promise<void> {
    // Store notification in D1 for portal to poll
    await this.env.DB.prepare(`
      INSERT INTO notifications (user_id, type, payload, read)
      VALUES (?, ?, ?, ?)
    `).bind(
      this.getApproverUserIds(approval.type),
      'approval_required',
      JSON.stringify(approval),
      false
    ).run();
  }

  private formatApprovalSummary(approval: ApprovalRequest): string {
    return `
*Type:* ${approval.type}
*App:* ${approval.appId}
*Risk Level:* ${approval.payload.riskLevel}
*Requested by:* ${approval.requestedBy}
*Expires:* ${new Date(approval.expiresAt).toLocaleString()}

${approval.payload.summary}

${approval.payload.previewUrl ? `Preview: ${approval.payload.previewUrl}` : ''}

Changes:
${approval.payload.changes?.map(c => `• ${c}`).join('\n') || 'No changes listed'}
    `.trim();
  }

  private getApproverEmails(type: ApprovalType): string[] {
    // Route to appropriate approvers based on type
    switch (type) {
      case ApprovalType.DEPLOY_PRODUCTION:
        return ['devops@company.com', 'tech-lead@company.com'];
      case ApprovalType.CODE_REVIEW_CRITICAL:
        return ['security@company.com'];
      default:
        return ['admin@company.com'];
    }
  }

  private getApproverUserIds(type: ApprovalType): number[] {
    // Get user IDs from D1 or config
    return [1, 2]; // Placeholder
  }
}
```

### Step 3: Portal Approval UI

Create `portal/src/lib/components/ApprovalPanel.svelte`:
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api';

  export let appId: number;
  export let sessionId: string;

  interface Approval {
    id: string;
    type: string;
    payload: {
      summary: string;
      riskLevel: string;
      previewUrl?: string;
      changes?: string[];
    };
    requestedAt: number;
    expiresAt: number;
  }

  let approvals: Approval[] = [];
  let loading = true;
  let comment = '';

  async function loadPendingApprovals() {
    loading = true;
    try {
      const response = await api.get(`/orchestration/apps/${appId}/approvals`);
      approvals = response.data || [];
    } catch (error) {
      console.error('Failed to load approvals:', error);
    } finally {
      loading = false;
    }
  }

  async function respond(approvalId: string, approved: boolean) {
    try {
      await api.post(`/orchestration/approvals/${approvalId}/respond`, {
        approved,
        comment
      });

      comment = '';
      await loadPendingApprovals();
    } catch (error) {
      console.error('Failed to respond:', error);
    }
  }

  onMount(() => {
    loadPendingApprovals();
    // Poll for new approvals every 30s
    const interval = setInterval(loadPendingApprovals, 30000);
    return () => clearInterval(interval);
  });
</script>

<div class="approval-panel">
  <h3>Pending Approvals</h3>

  {#if loading}
    <p>Loading approvals...</p>
  {:else if approvals.length === 0}
    <p>No pending approvals</p>
  {:else}
    {#each approvals as approval}
      <div class="approval-card risk-{approval.payload.riskLevel}">
        <div class="header">
          <span class="badge">{approval.type}</span>
          <span class="risk">{approval.payload.riskLevel}</span>
        </div>

        <p class="summary">{approval.payload.summary}</p>

        {#if approval.payload.previewUrl}
          <a href={approval.payload.previewUrl} target="_blank" class="preview-link">
            View Preview →
          </a>
        {/if}

        {#if approval.payload.changes}
          <details>
            <summary>Changes ({approval.payload.changes.length})</summary>
            <ul>
              {#each approval.payload.changes as change}
                <li>{change}</li>
              {/each}
            </ul>
          </details>
        {/if}

        <div class="actions">
          <textarea
            bind:value={comment}
            placeholder="Add a comment (optional)"
            rows="2"
          />

          <div class="buttons">
            <button
              class="approve"
              on:click={() => respond(approval.id, true)}
            >
              Approve
            </button>
            <button
              class="reject"
              on:click={() => respond(approval.id, false)}
            >
              Reject
            </button>
          </div>
        </div>

        <p class="expiry">
          Expires: {new Date(approval.expiresAt).toLocaleString()}
        </p>
      </div>
    {/each}
  {/if}
</div>

<style>
  .approval-panel {
    padding: 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #fff;
  }

  .approval-card {
    padding: 1rem;
    margin-bottom: 1rem;
    border-left: 4px solid #f59e0b;
    background: #fffbeb;
  }

  .approval-card.risk-high {
    border-left-color: #ef4444;
    background: #fef2f2;
  }

  .approval-card.risk-low {
    border-left-color: #10b981;
    background: #f0fdf4;
  }

  .header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  .badge {
    padding: 0.25rem 0.5rem;
    background: #3b82f6;
    color: white;
    border-radius: 4px;
    font-size: 0.875rem;
  }

  .risk {
    padding: 0.25rem 0.5rem;
    background: #f59e0b;
    color: white;
    border-radius: 4px;
    font-size: 0.875rem;
    text-transform: uppercase;
  }

  .preview-link {
    display: inline-block;
    margin: 0.5rem 0;
    color: #3b82f6;
    text-decoration: none;
  }

  .actions {
    margin-top: 1rem;
  }

  textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    margin-bottom: 0.5rem;
  }

  .buttons {
    display: flex;
    gap: 0.5rem;
  }

  button {
    flex: 1;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .approve {
    background: #10b981;
    color: white;
  }

  .reject {
    background: #ef4444;
    color: white;
  }

  .expiry {
    font-size: 0.875rem;
    color: #64748b;
    margin-top: 0.5rem;
  }
</style>
```

### Step 4: Register Approval Gate in OrchestratorDO

Update `platform-api/src/orchestration/OrchestratorDO.ts`:
```typescript
import { ApprovalGate, ApprovalType, ApprovalStatus } from './approval-gate';

export class OrchestratorDO extends DurableObject<Env> {
  private approvalGate: ApprovalGate;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.approvalGate = new ApprovalGate(env);
    // ... existing code ...
  }

  private async triggerNextAgent(): Promise<void> {
    const state = this.ctx!.currentState;

    // ... existing cases ...

    case OrchestrationState.DEPLOYING:
      const deployInput = { appId: this.ctx!.appId };
      
      // Check if deployment requires approval
      if (deployInput.environment === 'production') {
        const approval = this.approvalGate.createRequest({
          type: ApprovalType.DEPLOY_PRODUCTION,
          appId: this.ctx!.appId,
          sessionId: this.ctx!.sessionId,
          agentId: 'deployer',
          payload: {
            summary: `Deploy app ${this.ctx!.appId} to production`,
            details: { artifactPath: deployInput.artifactPath },
            previewUrl: `https://${this.ctx!.appId}-preview.nexus.dev`,
            changes: ['Added new feature', 'Updated dependencies'],
            riskLevel: 'high'
          },
          requestedBy: 'builder-agent',
          expiresAt: Date.now() + 3600000 // 1 hour
        });

        // Send notifications
        await this.notificationService.sendApprovalRequest(approval);

        // State transition handled by approval response
        break;
      }

      await this.eventBus.publish('agent.execute', {
        agentType: 'deployer',
        input: deployInput
      });
      break;
  }
}
```

### Step 5: API Endpoints for Approval

Add to `platform-api/src/routes/orchestration.ts`:
```typescript
orchestrationRoutes.get('/apps/:appId/approvals', async (c) => {
  const appId = parseInt(c.req.param('appId'));
  const orchestratorId = c.env.ORCHESTRATOR.idFromName(`app-${appId}`);
  const orchestrator = c.env.ORCHESTRATOR.get(orchestratorId);

  const response = await orchestrator.fetch(
    new Request('http://internal/approvals', { method: 'GET' })
  );

  return c.json(await response.json());
});

orchestrationRoutes.post('/approvals/:approvalId/respond', async (c) => {
  const approvalId = c.req.param('approvalId');
  const { approved, comment } = await c.req.json();

  // Find approval request
  const approval = await c.env.DB.prepare(
    'SELECT * FROM approval_requests WHERE id = ?'
  ).bind(approvalId).first();

  if (!approval) {
    return c.json({ error: 'Approval not found' }, 500);
  }

  // Update approval
  await c.env.DB.prepare(`
    UPDATE approval_requests
    SET status = ?, approver = ?, comment = ?, resolved_at = ?
    WHERE id = ?
  `).bind(
    approved ? 'approved' : 'rejected',
    c.get('userId'),
    comment,
    Date.now(),
    approvalId
  ).run();

  // Notify orchestrator
  const orchestratorId = c.env.ORCHESTRATOR.idFromName(`app-${approval.app_id}`);
  const orchestrator = c.env.ORCHESTRATOR.get(orchestratorId);

  await orchestrator.fetch(
    new Request('http://internal/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: approvalId,
        approved,
        comment,
        approver: c.get('userId')
      })
    })
  );

  return c.json({ success: true });
});
```

### Step 6: Database Schema for Approvals

Create migration `platform-api/migrations/0003_approval_system.sql`:
```sql
CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY,
  app_id INTEGER NOT NULL,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  approver TEXT,
  comment TEXT,
  requested_at INTEGER NOT NULL,
  resolved_at INTEGER,
  FOREIGN KEY (app_id) REFERENCES apps(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_approvals_app_id ON approval_requests(app_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
```

## Deliverables
- [ ] ApprovalGate class with request/response handling
- [ ] NotificationService (Slack, Email, Portal)
- [ ] ApprovalPanel.svelte UI component
- [ ] API endpoints for approval management
- [ ] Database migrations for approvals and notifications

## Acceptance Criteria
- [ ] Approval requests created for production deploys
- [ ] Notifications sent to Slack and Email
- [ ] Portal UI shows pending approvals
- [ ] Approver can approve/reject with comment
- [ ] Expired approvals are handled gracefully
- [ ] Orchestrator waits for approval before proceeding
- [ ] All approval actions logged in D1