# TASK 15-02: Workflow Definition & Step orchestration (Workflows-Native)

## Objective
Define the main Cloudflare Workflow for app building, replacing custom Durable Object orchestration with Workflows-native step execution, state management, and retries.

## Prerequisites
- TASK 15-01 completed (Agent Runtime Foundation)
- Durable Objects configured in wrangler.toml
- Understanding of state machine patterns

## Implementation

### Step 1: Define State Machine

Create `platform-api/src/orchestration/state-machine.ts`:
```typescript
export enum OrchestrationState {
  IDLE = 'idle',
  GENERATING = 'generating',
  REVIEWING = 'reviewing',
  TESTING = 'testing',
  FIXING = 'fixing',
  DEPLOYING = 'deploying',
  APPROVAL_REQUIRED = 'approval_required',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum OrchestrationEvent {
  START_GENERATION = 'start_generation',
  GENERATION_COMPLETE = 'generation_complete',
  START_REVIEW = 'start_review',
  REVIEW_COMPLETE = 'review_complete',
  START_TESTING = 'start_testing',
  TEST_COMPLETE = 'test_complete',
  START_FIXING = 'start_fixing',
  FIXING_COMPLETE = 'fixing_complete',
  START_DEPLOY = 'start_deploy',
  DEPLOY_COMPLETE = 'deploy_complete',
  REQUEST_APPROVAL = 'request_approval',
  APPROVAL_RECEIVED = 'approval_received',
  ERROR = 'error',
  RETRY = 'retry'
}

export interface StateTransition {
  from: OrchestrationState;
  to: OrchestrationState;
  event: OrchestrationEvent;
  guard?: (context: OrchestrationContext) => boolean;
  action?: (context: OrchestrationContext) => Promise<void>;
}

export interface OrchestrationContext {
  appId: number;
  sessionId: string;
  currentState: OrchestrationState;
  previousState?: OrchestrationState;
  data: Map<string, any>;
  errors: string[];
  startedAt: number;
  updatedAt: number;
}

export class StateMachine {
  private transitions: StateTransition[] = [];
  private context: OrchestrationContext;

  constructor(initialState: OrchestrationState, appId: number, sessionId: string) {
    this.context = {
      appId,
      sessionId,
      currentState: initialState,
      data: new Map(),
      errors: [],
      startedAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  addTransition(transition: StateTransition): void {
    this.transitions.push(transition);
  }

  async transition(event: OrchestrationEvent, payload?: any): Promise<OrchestrationContext> {
    const transition = this.transitions.find(
      t => t.from === this.context.currentState && t.event === event
    );

    if (!transition) {
      throw new Error(`Invalid transition: ${this.context.currentState} + ${event}`);
    }

    // Check guard condition
    if (transition.guard && !transition.guard(this.context)) {
      throw new Error(`Guard condition failed for transition: ${event}`);
    }

    // Execute action
    if (transition.action) {
      await transition.action(this.context);
    }

    // Update context
    this.context.previousState = this.context.currentState;
    this.context.currentState = transition.to;
    this.context.updatedAt = Date.now();

    if (payload) {
      this.context.data.set(event, payload);
    }

    // Persist state
    await this.persist();

    console.log(`[StateMachine] Transitioned: ${transition.from} → ${transition.to} (${event})`);

    return this.context;
  }

  getContext(): OrchestrationContext {
    return { ...this.context, data: new Map(this.context.data) };
  }

  getCurrentState(): OrchestrationState {
    return this.context.currentState;
  }

  private async persist(): Promise<void> {
    // Will be implemented by OrchestratorDO
  }
}
```

### Step 2: Define State Transitions

Create `platform-api/src/orchestration/transitions.ts`:
```typescript
import { StateMachine, OrchestrationState, OrchestrationEvent, StateTransition } from './state-machine';

export function createBuilderStateMachine(context: any): StateMachine {
  const sm = new StateMachine(OrchestrationState.IDLE, context.appId, context.sessionId);

  // IDLE → GENERATING
  sm.addTransition({
    from: OrchestrationState.IDLE,
    to: OrchestrationState.GENERATING,
    event: OrchestrationEvent.START_GENERATION,
    action: async (ctx) => {
      console.log(`[Transition] Starting generation for app ${ctx.appId}`);
    }
  });

  // GENERATING → REVIEWING
  sm.addTransition({
    from: OrchestrationState.GENERATING,
    to: OrchestrationState.REVIEWING,
    event: OrchestrationEvent.GENERATION_COMPLETE,
    guard: (ctx) => {
      const result = ctx.data.get(OrchestrationEvent.GENERATION_COMPLETE);
      return result?.success === true;
    }
  });

  // GENERATING → FAILED
  sm.addTransition({
    from: OrchestrationState.GENERATING,
    to: OrchestrationState.FAILED,
    event: OrchestrationEvent.ERROR
  });

  // REVIEWING → TESTING
  sm.addTransition({
    from: OrchestrationState.REVIEWING,
    to: OrchestrationState.TESTING,
    event: OrchestrationEvent.REVIEW_COMPLETE,
    guard: (ctx) => {
      const review = ctx.data.get(OrchestrationEvent.REVIEW_COMPLETE);
      return review?.passed === true;
    }
  });

  // REVIEWING → FIXING
  sm.addTransition({
    from: OrchestrationState.REVIEWING,
    to: OrchestrationState.FIXING,
    event: OrchestrationEvent.REVIEW_COMPLETE,
    guard: (ctx) => {
      const review = ctx.data.get(OrchestrationEvent.REVIEW_COMPLETE);
      return review?.passed === false && review?.canAutoFix === true;
    }
  });

  // TESTING → DEPLOYING
  sm.addTransition({
    from: OrchestrationState.TESTING,
    to: OrchestrationState.DEPLOYING,
    event: OrchestrationEvent.TEST_COMPLETE,
    guard: (ctx) => {
      const test = ctx.data.get(OrchestrationEvent.TEST_COMPLETE);
      return test?.passed === true;
    }
  });

  // TESTING → FIXING
  sm.addTransition({
    from: OrchestrationState.TESTING,
    to: OrchestrationState.FIXING,
    event: OrchestrationEvent.TEST_COMPLETE,
    guard: (ctx) => {
      const test = ctx.data.get(OrchestrationEvent.TEST_COMPLETE);
      return test?.passed === false && test?.canAutoFix === true;
    }
  });

  // FIXING → REVIEWING (retry loop)
  sm.addTransition({
    from: OrchestrationState.FIXING,
    to: OrchestrationState.REVIEWING,
    event: OrchestrationEvent.FIXING_COMPLETE
  });

  // DEPLOYING → APPROVAL_REQUIRED
  sm.addTransition({
    from: OrchestrationState.DEPLOYING,
    to: OrchestrationState.APPROVAL_REQUIRED,
    event: OrchestrationEvent.REQUEST_APPROVAL,
    guard: (ctx) => {
      const deploy = ctx.data.get(OrchestrationEvent.REQUEST_APPROVAL);
      return deploy?.requiresApproval === true;
    }
  });

  // DEPLOYING → COMPLETED
  sm.addTransition({
    from: OrchestrationState.DEPLOYING,
    to: OrchestrationState.COMPLETED,
    event: OrchestrationEvent.DEPLOY_COMPLETE
  });

  // APPROVAL_REQUIRED → DEPLOYING
  sm.addTransition({
    from: OrchestrationState.APPROVAL_REQUIRED,
    to: OrchestrationState.DEPLOYING,
    event: OrchestrationEvent.APPROVAL_RECEIVED,
    guard: (ctx) => {
      const approval = ctx.data.get(OrchestrationEvent.APPROVAL_RECEIVED);
      return approval?.approved === true;
    }
  });

  // APPROVAL_REQUIRED → FAILED
  sm.addTransition({
    from: OrchestrationState.APPROVAL_REQUIRED,
    to: OrchestrationState.FAILED,
    event: OrchestrationEvent.APPROVAL_RECEIVED,
    guard: (ctx) => {
      const approval = ctx.data.get(OrchestrationEvent.APPROVAL_RECEIVED);
      return approval?.approved === false;
    }
  });

  // Any state → FAILED on error
  [
    OrchestrationState.REVIEWING,
    OrchestrationState.TESTING,
    OrchestrationState.FIXING,
    OrchestrationState.DEPLOYING
  ].forEach(state => {
    sm.addTransition({
      from: state,
      to: OrchestrationState.FAILED,
      event: OrchestrationEvent.ERROR
    });
  });

  return sm;
}
```

### Step 3: Create Event Bus

Create `platform-api/src/orchestration/event-bus.ts`:
```typescript
interface EventSubscription {
  eventType: string;
  handler: (event: any) => Promise<void>;
}

export class EventBus {
  private subscriptions: Map<string, EventSubscription[]> = new Map();
  private eventLog: any[] = [];

  subscribe(eventType: string, handler: (event: any) => Promise<void>): () => void {
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }

    const subscription: EventSubscription = { eventType, handler };
    this.subscriptions.get(eventType)!.push(subscription);

    // Return unsubscribe function
    return () => {
      const subs = this.subscriptions.get(eventType)!;
      const index = subs.indexOf(subscription);
      if (index > -1) {
        subs.splice(index, 1);
      }
    };
  }

  async publish(eventType: string, payload: any): Promise<void> {
    const event = {
      type: eventType,
      payload,
      timestamp: Date.now()
    };

    // Log event
    this.eventLog.push(event);

    // Notify subscribers
    const subs = this.subscriptions.get(eventType) || [];
    await Promise.allSettled(
      subs.map(sub => sub.handler(event))
    );

    console.log(`[EventBus] Published: ${eventType}`);
  }

  getEventLog(): any[] {
    return [...this.eventLog];
  }

  async replay(fromTimestamp: number): Promise<void> {
    const events = this.eventLog.filter(e => e.timestamp >= fromTimestamp);
    
    for (const event of events) {
      await this.publish(event.type, event.payload);
    }
  }
}
```

### Step 4: Create Orchestrator Durable Object

Create `platform-api/src/orchestration/OrchestratorDO.ts`:
```typescript
import { DurableObject } from 'cloudflare:workers';
import { StateMachine, OrchestrationState, OrchestrationEvent, OrchestrationContext } from './state-machine';
import { createBuilderStateMachine } from './transitions';
import { EventBus } from './event-bus';
import { AgentRegistry } from '../agents/registry';
import { z } from 'zod';

export interface Env {
  ORCHESTRATOR: DurableObjectNamespace;
  DB: D1Database;
  ARTIFACTS: R2Bucket;
  AGENT_STATE: KVNamespace;
  METRICS: KVNamespace;
}

export class OrchestratorDO extends DurableObject<Env> {
  private stateMachine: StateMachine | null = null;
  private eventBus: EventBus;
  private agentRegistry: AgentRegistry;
  private ctx: OrchestrationContext | null = null;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.eventBus = new EventBus();
    this.agentRegistry = new AgentRegistry();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    try {
      switch (url.pathname) {
        case '/start':
          return this.handleStart(request);
        case '/event':
          return this.handleEvent(request);
        case '/status':
          return this.handleStatus(request);
        case '/approve':
          return this.handleApproval(request);
        default:
          return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      console.error('[OrchestratorDO] Error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  private async handleStart(request: Request): Promise<Response> {
    const { appId, sessionId, prompt } = await request.json();

    console.log(`[OrchestratorDO] Starting orchestration for app ${appId}`);

    // Initialize state machine
    this.stateMachine = createBuilderStateMachine({ appId, sessionId });
    this.ctx = this.stateMachine.getContext();

    // Subscribe to events
    this.setupEventHandlers();

    // Start generation
    await this.stateMachine.transition(OrchestrationEvent.START_GENERATION);

    // Trigger builder agent
    await this.eventBus.publish('agent.execute', {
      agentType: 'builder',
      input: { appId, prompt }
    });

    return new Response(JSON.stringify({
      success: true,
      state: this.ctx.currentState,
      sessionId
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async handleEvent(request: Request): Promise<Response> {
    const { event, payload } = await request.json();

    if (!this.stateMachine || !this.ctx) {
      return new Response('Orchestrator not initialized', { status: 400 });
    }

    console.log(`[OrchestratorDO] Handling event: ${event}`);

    // Transition state
    await this.stateMachine.transition(event, payload);

    // Publish event for agents
    await this.eventBus.publish(event, payload);

    // Trigger next agent based on state
    await this.triggerNextAgent();

    return new Response(JSON.stringify({
      success: true,
      state: this.ctx.currentState
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async handleApproval(request: Request): Promise<Response> {
    const { approved, comment } = await request.json();

    console.log(`[OrchestratorDO] Approval received: ${approved}`);

    await this.stateMachine!.transition(OrchestrationEvent.APPROVAL_RECEIVED, {
      approved,
      comment,
      approvedAt: Date.now()
    });

    return new Response(JSON.stringify({
      success: true,
      state: this.ctx!.currentState
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async handleStatus(request: Request): Promise<Response> {
    if (!this.ctx) {
      return new Response('Not initialized', { status: 400 });
    }

    return new Response(JSON.stringify({
      state: this.ctx.currentState,
      previousState: this.ctx.previousState,
      startedAt: this.ctx.startedAt,
      updatedAt: this.ctx.updatedAt,
      eventLog: this.eventBus.getEventLog()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async triggerNextAgent(): Promise<void> {
    const state = this.ctx!.currentState;

    switch (state) {
      case OrchestrationState.GENERATING:
        // Already triggered in handleStart
        break;

      case OrchestrationState.REVIEWING:
        const generationResult = this.ctx!.data.get(OrchestrationEvent.GENERATION_COMPLETE);
        await this.eventBus.publish('agent.execute', {
          agentType: 'reviewer',
          input: { files: generationResult?.output?.files }
        });
        break;

      case OrchestrationState.TESTING:
        await this.eventBus.publish('agent.execute', {
          agentType: 'tester',
          input: { files: generationResult?.output?.files }
        });
        break;

      case OrchestrationState.DEPLOYING:
        await this.eventBus.publish('agent.execute', {
          agentType: 'deployer',
          input: { appId: this.ctx!.appId }
        });
        break;

      case OrchestrationState.APPROVAL_REQUIRED:
        await this.eventBus.publish('approval.requested', {
          appId: this.ctx!.appId,
          sessionId: this.ctx!.sessionId
        });
        break;

      case OrchestrationState.COMPLETED:
        await this.eventBus.publish('orchestration.completed', {
          appId: this.ctx!.appId,
          duration: Date.now() - this.ctx!.startedAt
        });
        break;

      case OrchestrationState.FAILED:
        await this.eventBus.publish('orchestration.failed', {
          appId: this.ctx!.appId,
          errors: this.ctx!.errors
        });
        break;
    }
  }

  private setupEventHandlers(): void {
    // Agent execution handler
    this.eventBus.subscribe('agent.execute', async (event) => {
      const { agentType, input } = event.payload;
      const agent = this.agentRegistry.getAllByType(agentType)[0];

      if (agent) {
        try {
          const result = await agent.executeWithRetry(input);
          
          // Map agent result to orchestration event
          const orchestrationEvent = this.mapAgentResultToEvent(agentType, result);
          await this.stateMachine!.transition(orchestrationEvent, result);
        } catch (error) {
          await this.stateMachine!.transition(OrchestrationEvent.ERROR, {
            error: error.message,
            agentType
          });
        }
      }
    });

    // Approval handler
    this.eventBus.subscribe('approval.requested', async (event) => {
      const { appId, sessionId } = event.payload;
      
      // Send notification (Slack/Email)
      await this.sendApprovalNotification(appId, sessionId);
    });
  }

  private mapAgentResultToEvent(agentType: string, result: any): OrchestrationEvent {
    switch (agentType) {
      case 'builder':
        return OrchestrationEvent.GENERATION_COMPLETE;
      case 'reviewer':
        return OrchestrationEvent.REVIEW_COMPLETE;
      case 'tester':
        return OrchestrationEvent.TEST_COMPLETE;
      case 'deployer':
        return OrchestrationEvent.DEPLOY_COMPLETE;
      default:
        return OrchestrationEvent.ERROR;
    }
  }

  private async sendApprovalNotification(appId: number, sessionId: string): Promise<void> {
    // Implementation in TASK 15-05
    console.log(`[OrchestratorDO] Approval required for app ${appId}`);
  }
}
```

### Step 5: Register Orchestrator in platform-api

Update `platform-api/src/index.ts`:
```typescript
import { OrchestratorDO } from './orchestration/OrchestratorDO';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Route to OrchestratorDO
    if (url.pathname.startsWith('/orchestrator/')) {
      const id = env.ORCHESTRATOR.idFromName(url.pathname.split('/')[2]);
      const stub = env.ORCHESTRATOR.get(id);
      return stub.fetch(request);
    }

    // ... other routes
  }
};
```

### Step 6: API Endpoints for Orchestration

Add to `platform-api/src/routes/orchestration.ts`:
```typescript
import { Hono } from 'hono';

export const orchestrationRoutes = new Hono();

orchestrationRoutes.post('/apps/:appId/orchestrate', async (c) => {
  const appId = parseInt(c.req.param('appId'));
  const { prompt } = await c.req.json();

  // Get or create orchestrator instance
  const orchestratorId = c.env.ORCHESTRATOR.idFromName(`app-${appId}`);
  const orchestrator = c.env.ORCHESTRATOR.get(orchestratorId);

  // Start orchestration
  const response = await orchestrator.fetch(
    new Request('http://internal/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId, sessionId: crypto.randomUUID(), prompt })
    })
  );

  return c.json(await response.json());
});

orchestrationRoutes.get('/apps/:appId/status', async (c) => {
  const appId = parseInt(c.req.param('appId'));
  const orchestratorId = c.env.ORCHESTRATOR.idFromName(`app-${appId}`);
  const orchestrator = c.env.ORCHESTRATOR.get(orchestratorId);

  const response = await orchestrator.fetch(
    new Request('http://internal/status', { method: 'GET' })
  );

  return c.json(await response.json());
});
```

## Deliverables
- [ ] State machine with all transitions defined
- [ ] Event bus for pub/sub messaging
- [ ] Orchestrator Durable Object implementation
- [ ] API endpoints for orchestration control
- [ ] Event handlers for agent coordination

## Acceptance Criteria
- [ ] State machine transitions correctly through all states
- [ ] Events are published and received by subscribers
- [ ] Orchestrator persists state across Worker invocations
- [ ] Failed states can be recovered
- [ ] Event log shows complete orchestration history