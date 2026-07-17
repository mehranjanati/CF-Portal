# Daily Plan 15: Multi-Agent Orchestration with Cloudflare Workflows

## Status: PENDING

## Goal
Implement a comprehensive multi-agent orchestration system using **Cloudflare Workflows** as the backbone for durable, reliable coordination of specialized agents (Builder, Tester, Reviewer, Deployer) throughout the complete app lifecycle.

## Why Cloudflare Workflows?
Cloudflare Workflows provides the perfect primitive for agent orchestration:
- **Durable execution:** Multi-step workflows survive Worker restarts
- **Automatic retries:** Built-in exponential backoff and error handling
- **Timeout management:** Native support for phase and total timeouts
- **State persistence:** Automatic state checkpoints between steps
- **Long-running:** Can run for hours/days (approval gates)
- **Fan-out/fan-in:** Parallel execution of Reviewer + Tester
- **Scheduling:** Cron-based re-checks and retries
- **Observability:** Built-in logging and tracing

## Architecture: Cloudflare Workflows + Agents SDK

```
┌─────────────────────────────────────────────────────────────┐
│                    Nexus Multi-Agent Platform                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │           Cloudflare Workflow Engine                  │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │ │
│  │  │ Build Step   │─▶│ Review Step │─▶│ Test Step   │ │ │
│  │  │ ( Builder    │  │ ( Reviewer  │  │ ( Tester    │ │ │
│  │  │   Agent )    │  │   Agent )   │  │   Agent )   │ │ │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │ │
│  │         │                 │                 │         │ │
│  │  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐ │ │
│  │  │ Workflow    │  │ Workflow    │  │ Workflow    │ │ │
│  │  │ Step        │  │ Step        │  │ Step        │ │ │
│  │  │ (Parallel)  │  │ (Parallel)  │  │ (Sequential│ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘ │ │
│  └──────────────────────────────────────────────────────┘ │
│                            │                               │
│                            ▼                               │
│  ┌──────────────────────────────────────────────────────┐ │
│  │              Deployment Step                          │ │
│  │         (Deployer Agent + Approval Gate)              │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Supporting Infrastructure:
├── Agents SDK (Agent runtime)
├── Durable Objects (Session state, coordination)
├── D1 (Metadata, history)
├── R2 (Artifacts, files)
├── Queue (Async event fanout)
└── AI Gateway (Code generation)
```

## Key Patterns

### 1. **Workflow-as-Orchestrator**

```typescript
// Workflow definition for app building
export interface AppBuildWorkflow {
  id: string;
  appId: number;
  userId: number;
  steps: WorkflowStep[];
  state: WorkflowState;
}

// Each step is an agent execution
type WorkflowStep = 
  | { type: 'build'; agent: 'builder-agent' }
  | { type: 'review'; agent: 'reviewer-agent' }
  | { type: 'test'; agent: 'tester-agent' }
  | { type: 'deploy'; agent: 'deployer-agent' }
  | { type: 'approval'; required: boolean };

// Workflow instance handles orchestration
export class AppBuildWorkflowInstance {
  async execute() {
    // Step 1: Build (with retry)
    const buildResult = await this.step('build', {
      do: async () => this.runAgent('builder', { appId: this.appId, prompt }),
      retries: 3,
      timeout: 60000
    });

    if (!buildResult.success) {
      await this.fail('Build failed');
      return;
    }

    // Step 2 & 3: Review + Test in parallel (fan-out)
    const [review, test] = await this.parallel([
      this.step('review', () => this.runAgent('reviewer', { files: buildResult.files })),
      this.step('test', () => this.runAgent('tester', { files: buildResult.files }))
    ], {
      maxConcurrency: 2,
      continueOnError: false
    });

    // Step 4: Deploy (with approval gate)
    const deployResult = await this.step('deploy', {
      do: async () => {
        if (this.environment === 'production') {
          await this.waitForApproval('production_deploy', {
            timeout: 3600000 // 1 hour
          });
        }
        return this.runAgent('deployer', { artifact: buildResult.artifact });
      },
      retries: 2,
      timeout: 120000
    });

    if (deployResult.success) {
      await this.complete(deployResult.url);
    }
  }
}
```

### 2. **State Machine via Workflow Steps**

```typescript
// Workflow state is automatically persisted by Cloudflare
interface WorkflowState {
  status: 'running' | 'waiting_approval' | 'completed' | 'failed';
  currentStep: number;
  artifacts: {
    buildResult?: any;
    reviewResult?: any;
    testResult?: any;
  };
  history: Array<{
    step: string;
    startedAt: number;
    completedAt: number;
    result: 'success' | 'failure';
  }>;
}
```

### 3. **Durable Approval Gates**

```typescript
// Workflow can pause for hours waiting for human approval
async function waitForApproval(workflow: Workflow, approvalId: string) {
  // This pauses the workflow (no CPU billing)
  // Workflow resumes when approval is received
  await workflow.sleepUntil(
    async () => {
      const approval = await getApproval(approvalId);
      if (approval.status === 'approved') return true;
      if (approval.status === 'rejected') throw new Error('Approval rejected');
      return false; // Continue sleeping
    },
    { timeout: '1 hour' }
  );
}
```

## Migration from Plan 15

### What Changes?

| Component | Plan 15 (Original) | Plan 15 (Updated) |
|-----------|-------------------|-------------------|
| Orchestration | Durable Objects (state machine) | Cloudflare Workflows (built-in) |
| State Management | Manual(Map/D1) | Automatic (Workflow state) |
| Retries | Custom RetryPolicy | Built-in step retries |
| Parallel Execution | ParallelExecutor | Fan-out steps |
| Timeouts | TimeoutManager | Built-in step timeouts |
| Approval Gates | Custom ApprovalGate | `workflow.sleepUntil()` |

### What Stays?

- ✅ Agents SDK for agent runtime
- ✅ Tools ecosystem (FileSystem, Terminal, Browser, GitHub, Cloudflare)
- ✅ Circuit breakers and resilience patterns
- ✅ Monitoring and distributed tracing
- ✅ Approval notifications (Slack/Email)

## Tasks

### [ ] TASK 15-01: Workflow Foundation
**Goal:** Set up Cloudflare Workflows as the orchestration backbone.

**Files to create:**
1. `platform-api/src/workflows/AppBuildWorkflow.ts` - Main workflow definition
2. `platform-api/src/workflows/WorkflowStep.ts` - Step abstraction
3. `platform-api/wrangler.toml` - Workflows configuration

**Key Concepts:**
- Workflow instance per app build
- Step-based execution with automatic retries
- State persistence across steps

**Deliverables:**
- Workflow definition deployed
- Test workflow runs successfully
- State persists across restarts

### [ ] TASK 15-02: Agent Integration with Workflows
**Goal:** Integrate Agents SDK with Workflow steps.

**Files to create:**
1. `platform-api/src/workflows/AgentStep.ts` - Agent execution in workflow
2. `platform-api/src/agents/AgentClient.ts` - Client to invoke agents from workflows

**Pattern:**
```typescript
const agentStep = new AgentStep('builder', {
  agentClass: BuilderAgent,
  input: { appId, prompt }
});

const result = await workflow.step(agentStep);
```

**Deliverables:**
- Agent steps execute within workflows
- Retries work automatically
- Agent results stored in workflow state

### [ ] TASK 15-03: Parallel Execution (Fan-out)
**Goal:** Implement parallel agent execution using Workflow fan-out.

**Files to create:**
1. `platform-api/src/workflows/ParallelStep.ts` - Parallel step execution

**Pattern:**
```typescript
const [review, test] = await workflow.fanOut([
  { step: reviewerStep },
  { step: testerStep }
], {
  maxConcurrency: 2,
  timeout: 60000
});
```

**Deliverables:**
- Review and Test run in parallel
- Results aggregated after both complete
- Timeout handling

### [ ] TASK 15-04: Approval Gates (Durable Waits)
**Goal:** Implement human-in-the-loop using workflow.sleepUntil.

**Files to create:**
1. `platform-api/src/workflows/ApprovalStep.ts` - Approval step implementation

**Pattern:**
```typescript
const approved = await workflow.sleepUntil(
  async () => checkApprovalStatus(approvalId),
  { maxWait: '1 hour', pollInterval: '30 seconds' }
);

if (!approved) {
  await workflow.emit('approval_rejected');
}
```

**Deliverables:**
- Workflow pauses for approval
- Notifications sent to Slack/Email
- Workflow resumes on approval/rejection
- Timeout handling

### [ ] TASK 15-05: Error Handling & Retries
**Goal:** Implement comprehensive error handling using Workflow built-in features.

**Files to create:**
1. `platform-api/src/workflows/ErrorHandler.ts` - Error classification and retry logic

**Strategy:**
```typescript
const result = await workflow.step(task, {
  retries: {
    maxAttempts: 3,
    delay: 'exponential',
    maxDelay: '30 seconds'
  },
  timeout: '2 minutes',
  catch: (error) => {
    if (error instanceof RateLimitError) {
      return { retry: true, delay: '1 minute' };
    }
    if (error instanceof AuthError) {
      return { fail: true };
    }
    return { retry: true };
  }
});
```

**Deliverables:**
- Automatic retries with backoff
- Graceful degradation
- Circuit breaker integration

### [ ] TASK 15-06: Monitoring Integration
**Goal:** Add monitoring and observability using Workflow built-in metrics.

**Files to create:**
1. `platform-api/src/workflows/Monitoring.ts` - Workflow metrics
2. `cloudflare/platform-api/docs/AGENT_OPERATIONS.md` - Runbook

**Metrics:**
- Workflow duration (total and per-step)
- Agent success/failure rates
- Approval lead time
- Queue depth

**Deliverables:**
- Dashboard widgets for workflow metrics
- Alerts on workflow failures
- Operations runbook

## File Changes Summary

| File | Action |
|------|--------|
| `platform-api/src/workflows/AppBuildWorkflow.ts` | **CREATE** - Main workflow |
| `platform-api/src/workflows/WorkflowStep.ts` | **CREATE** - Step abstraction |
| `platform-api/src/workflows/AgentStep.ts` | **CREATE** - Agent integration |
| `platform-api/src/workflows/ParallelStep.ts` | **CREATE** - Fan-out |
| `platform-api/src/workflows/ApprovalStep.ts` | **CREATE** - Approval gates |
| `platform-api/src/workflows/ErrorHandler.ts` | **CREATE** - Error handling |
| `platform-api/src/workflows/Monitoring.ts` | **CREATE** - Observability |
| `platform-api/src/agents/AgentClient.ts` | **CREATE** - Agent client |
| `platform-api/wrangler.toml` | **UPDATE** - Add workflows binding |
| `platform-api/package.json` | **UPDATE** - Add @cloudflare/workflows |

## Dependencies
- Cloudflare Workflows (GA)
- Cloudflare Agents SDK
- Durable Objects (for agent state)
- D1, R2, Queue

## References
- [Cloudflare Workflows Docs](https://developers.cloudflare.com/workflows/)
- [Cloudflare Agents SDK](https://developers.cloudflare.com/agents/)
- `docs/Architecture/CLOUDFLARE_FIRST_ECOSYSTEM.md` - Section on Workflows

## Acceptance Criteria
- [ ] Workflow executes complete build → review → test → deploy lifecycle
- [ ] Parallel steps (review + test) run concurrently
- [ ] Approval gate pauses workflow for up to 1 hour
- [ ] Failed steps retry with exponential backoff
- [ ] Workflow state persists across Worker restarts
- [ ] Metrics exported to Cloudflare Analytics