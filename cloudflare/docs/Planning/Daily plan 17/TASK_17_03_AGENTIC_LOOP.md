# TASK 17_03: Agentic Loop Implementation (Plan → Execute → Observe)

## هدف
پیاده‌سازی حلقه اجرای Agent با الگوی Plan → Execute → Observe که بین backend و frontend sync کامل دارد.

## Frontend-Backend Coordination

### Backend Responsibilities:
1. Execute agentic loop iterations
2. Send state_sync packets for each phase
3. Manage iteration count and max limits
4. Persist state to KV/D1

### Frontend Responsibilities:
1. Display current phase (planning/executing/observing)
2. Show iteration progress
3. Render tool calls as they happen
4. Allow user intervention if needed

---

## فایل‌های مورد نیاز

### Backend Files
- `cloudflare/platform-api/src/agents/CopilotKitAgent.ts` - Main agent class (from TASK_17_02)
- `cloudflare/platform-api/src/agents/orchestrator.ts` - NEW: Orchestrate multiple agents
- `cloudflare/platform-api/src/agents/memory.ts` - Enhanced memory context

### Frontend Files (to be updated by TASK_17_04)
- `cloudflare/portal/src/lib/types/builder.ts` - Agent state types
- `cloudflare/portal/src/lib/stores/builder.svelte.ts` - Phase tracking
- `cloudflare/portal/src/routes/(app)/builder/+page.svelte` - Phase UI

---

## پیاده‌سازی Backend

### Step 1: Define Agentic Loop Interfaces

**File:** `cloudflare/platform-api/src/agents/orchestrator.ts` (NEW)

```typescript
export interface ExecutionPlan {
  steps: PlanStep[];
  reasoning: string;
}

export interface PlanStep {
  tool: string;
  args: Record<string, any>;
  description: string;
  dependsOn?: string[];
}

export interface ExecutionResult {
  results: any[];
  success: boolean;
  errors: string[];
}

export interface Observation {
  goalAchieved: boolean;
  summary: string;
  nextPrompt?: string;
  suggestedActions: string[];
}

export type AgentPhase = 'planning' | 'executing' | 'observing' | 'completed' | 'failed';

export interface AgentLoopState {
  sessionId: string;
  phase: AgentPhase;
  iteration: number;
  maxIterations: number;
  currentPlan?: ExecutionPlan;
  lastResult?: ExecutionResult;
  lastObservation?: Observation;
  messages: Array<{ role: string; content: string }>;
  startedAt: number;
  completedAt?: number;
}
```

---

### Step 2: Implement Agentic Loop

**File:** `cloudflare/platform-api/src/agents/CopilotKitAgent.ts` (update)

```typescript
import { AgentLoopState, ExecutionPlan, ExecutionResult, Observation, AgentPhase } from './orchestrator';

export class CopilotKitAgent {
  private loopState: AgentLoopState;
  private packetGenerator: AGUIPacketGenerator;

  async execute(prompt: string): AsyncGenerator<AGUIPacket> {
    this.loopState = {
      sessionId: this.config.sessionId,
      phase: 'planning',
      iteration: 0,
      maxIterations: 10,
      messages: [{ role: 'user', content: prompt }],
      startedAt: Date.now(),
    };

    // Send initial state
    yield this.packetGenerator.createStateSyncPacket({
      sessionId: this.config.sessionId,
      status: 'planning',
      iteration: 0,
      state: this.getStateSnapshot(),
    });

    // Main agentic loop
    while (this.loopState.iteration < this.loopState.maxIterations) {
      this.loopState.iteration++;

      // PHASE 1: PLAN
      yield* this.transitionToPhase('planning');
      const plan = await this.plan(prompt);
      this.loopState.currentPlan = plan;

      // Send plan to frontend
      yield this.packetGenerator.createStateSyncPacket({
        sessionId: this.config.sessionId,
        status: 'planning',
        iteration: this.loopState.iteration,
        state: {
          ...this.getStateSnapshot(),
          plan: plan,
        },
      });

      // PHASE 2: EXECUTE
      yield* this.transitionToPhase('executing');
      let result: ExecutionResult;
      try {
        result = await this.executePlan(plan);
        this.loopState.lastResult = result;
      } catch (error: any) {
        yield this.packetGenerator.createErrorPacket(
          this.config.sessionId,
          `Execution failed: ${error.message}`,
          this.loopState.iteration
        );
        yield* this.transitionToPhase('failed');
        break;
      }

      // Send execution results
      yield this.packetGenerator.createStateSyncPacket({
        sessionId: this.config.sessionId,
        status: 'executing',
        iteration: this.loopState.iteration,
        state: {
          ...this.getStateSnapshot(),
          lastResult: result,
        },
      });

      // PHASE 3: OBSERVE
      yield* this.transitionToPhase('observing');
      const observation = await this.observe(result);
      this.loopState.lastObservation = observation;

      // Send observation
      yield this.packetGenerator.createStateSyncPacket({
        sessionId: this.config.sessionId,
        status: 'observing',
        iteration: this.loopState.iteration,
        state: {
          ...this.getStateSnapshot(),
          observation: observation,
        },
      });

      // Check if goal achieved
      if (observation.goalAchieved) {
        yield* this.transitionToPhase('completed');
        yield this.packetGenerator.createTextPacket(
          this.config.sessionId,
          observation.summary,
          this.loopState.iteration
        );
        break;
      }

      // Update prompt for next iteration
      prompt = observation.nextPrompt || prompt;
    }

    // Check if max iterations reached
    if (this.loopState.iteration >= this.loopState.maxIterations) {
      yield* this.transitionToPhase('failed');
      yield this.packetGenerator.createErrorPacket(
        this.config.sessionId,
        'Max iterations reached without completing goal',
        this.loopState.iteration
      );
    }

    // Send stream end
    yield this.packetGenerator.createStreamEndPacket(this.config.sessionId);
  }

  private async *transitionToPhase(phase: AgentPhase): AsyncGenerator<AGUIPacket> {
    this.loopState.phase = phase;
    
    // Small delay to allow frontend to update UI
    yield this.packetGenerator.createStateSyncPacket({
      sessionId: this.config.sessionId,
      status: phase,
      iteration: this.loopState.iteration,
      state: this.getStateSnapshot(),
    });
  }

  private async plan(prompt: string): Promise<ExecutionPlan> {
    // Use AI to create execution plan
    const plan = await this.callAI({
      prompt: `As an expert developer, create a step-by-step plan for: ${prompt}\n\n` +
        `Return JSON format:\n` +
        `{\n  \"steps\": [\n    {\n      \"tool\": \"tool_name\",\n      \"args\": {},\n      \"description\": \"...\"\n    }\n  ],\n      \"reasoning\": \"...\"\n    }`,
      responseFormat: 'json',
    });

    return plan as ExecutionPlan;
  }

  private async executePlan(plan: ExecutionPlan): Promise<ExecutionResult> {
    const results: any[] = [];
    const errors: string[] = [];

    for (const step of plan.steps) {
      // Send tool_use packet
      yield this.packetGenerator.createToolUsePacket(
        this.config.sessionId,
        step.tool,
        step.args,
        this.loopState.iteration
      );

      try {
        // Execute tool with timeout
        const result = await Promise.race([
          this.executeTool(step.tool, step.args),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Tool timeout')), 30000)
          ),
        ]);

        results.push(result);

        // Send tool_result packet
        yield this.packetGenerator.createToolResultPacket(
          this.config.sessionId,
          step.tool,
          result,
          this.loopState.iteration
        );
      } catch (error: any) {
        errors.push(`${step.tool}: ${error.message}`);
        
        // Send error but continue execution
        yield this.packetGenerator.createErrorPacket(
          this.config.sessionId,
          `Tool ${step.tool} failed: ${error.message}`,
          this.loopState.iteration
        );
      }
    }

    return {
      results,
      success: errors.length === 0,
      errors,
    };
  }

  private async observe(result: ExecutionResult): Promise<Observation> {
    // Use AI to observe results and determine next steps
    const observation = await this.callAI({
      prompt: `Analyze these execution results and determine if the goal is achieved:\n\n` +
        `Results: ${JSON.stringify(result, null, 2)}\n\n` +
        `Return JSON format:\n` +
        `{\n  \"goalAchieved\": boolean,\n  \"summary\": \"...\",\n  \"nextPrompt\": \"...\" (optional),\n  \"suggestedActions\": []\n    }`,
      responseFormat: 'json',
    });

    return observation as Observation;
  }

  private async executeTool(toolName: string, args: any): Promise<any> {
    const tool = this.config.tools.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }

    // Log tool execution
    console.log(`[Agent] Executing tool: ${toolName}`, args);

    // Execute with timeout
    return tool.execute(args);
  }

  private async callAI(params: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/ai/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`AI call failed: ${response.statusText}`);
    }

    return response.json();
  }

  private getStateSnapshot(): any {
    return {
      sessionId: this.loopState.sessionId,
      phase: this.loopState.phase,
      iteration: this.loopState.iteration,
      maxIterations: this.loopState.maxIterations,
      messages: this.loopState.messages,
      startedAt: this.loopState.startedAt,
      completedAt: this.loopState.completedAt,
    };
  }

  getLoopState(): AgentLoopState {
    return this.loopState;
  }
}
```

**Acceptance Criteria:**
- [ ] Agentic loop implemented with 3 phases
- [ ] Each phase transitions with state_sync packet
- [ ] Plan generation works with AI
- [ ] Tool execution integrated
- [ ] Observation phase determines completion
- [ ] Max iterations enforced
- [ ] Error handling complete

---

### Step 3: Implement Memory Context

**File:** `cloudflare/platform-api/src/agents/memory.ts`

```typescript
export interface MemoryContext {
  sessionId: string;
  tenantId: string;
  conversationHistory: Array<{ role: string; content: string; timestamp: number }>;
  toolHistory: Array<{ tool: string; args: any; result: any; timestamp: number }>;
  userPreferences: Record<string, any>;
  projectContext?: {
    appId?: string;
    files?: string[];
    dependencies?: string[];
  };
}

export class AgentMemory {
  private kv: KVNamespace;
  private sessionId: string;
  private context: MemoryContext;

  constructor(kv: KVNamespace, sessionId: string, tenantId: string) {
    this.kv = kv;
    this.sessionId = sessionId;
    this.context = {
      sessionId,
      tenantId,
      conversationHistory: [],
      toolHistory: [],
      userPreferences: {},
    };
  }

  async load(): Promise<void> {
    try {
      const data = await this.kv.get(`agent:memory:${this.sessionId}`, 'json');
      if (data) {
        this.context = { ...this.context, ...data };
      }
    } catch (error) {
      console.error('[Memory] Failed to load:', error);
    }
  }

  async save(): Promise<void> {
    try {
      await this.kv.put(
        `agent:memory:${this.sessionId}`,
        JSON.stringify(this.context),
        { expirationTtl: 86400 * 7 } // 7 days
      );
    } catch (error) {
      console.error('[Memory] Failed to save:', error);
    }
  }

  addMessage(role: string, content: string): void {
    this.context.conversationHistory.push({
      role,
      content,
      timestamp: Date.now(),
    });

    // Keep only last 50 messages
    if (this.context.conversationHistory.length > 50) {
      this.context.conversationHistory = this.context.conversationHistory.slice(-50);
    }
  }

  addToolExecution(tool: string, args: any, result: any): void {
    this.context.toolHistory.push({
      tool,
      args,
      result,
      timestamp: Date.now(),
    });

    // Keep only last 20 tool executions
    if (this.context.toolHistory.length > 20) {
      this.context.toolHistory = this.context.toolHistory.slice(-20);
    }
  }

  getConversationHistory(): Array<{ role: string; content: string }> {
    return this.context.conversationHistory.map(m => ({
      role: m.role,
      content: m.content,
    }));
  }

  getRelevantContext(query: string): any {
    // Simple context retrieval (can be enhanced with Vectorize)
    return {
      recentMessages: this.context.conversationHistory.slice(-10),
      recentTools: this.context.toolHistory.slice(-5),
      preferences: this.context.userPreferences,
    };
  }

  setUserPreference(key: string, value: any): void {
    this.context.userPreferences[key] = value;
  }
}
```

**Acceptance Criteria:**
- [ ] Memory loads/saves to KV
- [ ] Conversation history maintained
- [ ] Tool history tracked
- [ ] TTL set for auto-cleanup
- [ ] Context retrieval working

---

### Step 4: Update CopilotKitAgent with Memory

**File:** `cloudflare/platform-api/src/agents/CopilotKitAgent.ts` (update)

```typescript
import { AgentMemory } from './memory';

export class CopilotKitAgent {
  private memory: AgentMemory;

  constructor(config: CopilotKitAgentConfig) {
    // ... existing code ...
    
    if (config.memory) {
      this.memory = new AgentMemory(
        config.memory,
        config.sessionId,
        config.tenantId
      );
    }
  }

  async execute(prompt: string): AsyncGenerator<AGUIPacket> {
    // Load memory
    if (this.memory) {
      await this.memory.load();
      this.memory.addMessage('user', prompt);
    }

    // ... existing agentic loop code ...

    // Save memory after each iteration
    if (this.memory) {
      await this.memory.save();
    }

    // ... rest of code ...
  }

  private async executeTool(toolName: string, args: any): Promise<any> {
    const result = await super.executeTool(toolName, args);
    
    // Log to memory
    if (this.memory) {
      this.memory.addToolExecution(toolName, args, result);
    }
    
    return result;
  }
}
```

---

## Frontend Integration Points

### Agent State Display

```typescript
// builder.svelte.ts additions
interface AgentLoopUIState {
  phase: 'planning' | 'executing' | 'observing' | 'completed' | 'failed';
  iteration: number;
  maxIterations: number;
  currentPlan?: ExecutionPlan;
  lastResult?: ExecutionResult;
  observation?: Observation;
}

// Add to BuilderStore
agentLoopState = $state<AgentLoopUIState>({
  phase: 'idle',
  iteration: 0,
  maxIterations: 10,
});

updateAgentLoopState(state: any) {
  this.agentLoopState = {
    phase: state.phase,
    iteration: state.iteration,
    maxIterations: state.maxIterations,
    currentPlan: state.plan,
    lastResult: state.lastResult,
    observation: state.observation,
  };
}
```

### Phase Display Component

```svelte
<!-- AgentPhaseIndicator.svelte -->
<script lang="ts">
  import { builderStore } from '$lib/stores/builder.svelte';
  
  $: phase = $builderStore.agentLoopState?.phase || 'idle';
  $: iteration = $builderStore.agentLoopState?.iteration || 0;
  $: maxIterations = $builderStore.agentLoopState?.maxIterations || 10;
</script>

<div class="phase-indicator">
  <div class="phase {phase}">
    <span class="icon">
      {#if phase === 'planning'}📋
      {:else if phase === 'executing'}⚙️
      {:else if phase === 'observing'}👁️
      {:else if phase === 'completed'}✅
      {:else if phase === 'failed'}❌
      {/if}
    </span>
    <span class="label">{phase}</span>
  </div>
  
  <div class="iteration">
    Iteration {iteration} / {maxIterations}
  </div>
  
  {#if $builderStore.agentLoopState?.currentPlan}
    <div class="plan">
      <h4>Plan:</h4>
      <ul>
        {#each $builderStore.agentLoopState.currentPlan.steps as step}
          <li>{step.description}</li>
        {/each}
      </ul>
    </div>
  {/if}
</div>
```

---

## Testing

### Backend Tests
```typescript
describe('CopilotKitAgent - Agentic Loop', () => {
  it('should complete full loop with successful result', async () => {
    const agent = new CopilotKitAgent({
      sessionId: 'test',
      tenantId: 'test',
      tools: [mockTool],
      memory: mockKV,
    });

    const packets: AGUIPacket[] = [];
    for await (const packet of agent.execute('Create a counter')) {
      packets.push(packet);
    }

    // Should have planning, executing, observing, completed phases
    const phases = packets
      .filter(p => p.type === 'state_sync')
      .map(p => (p.payload as any).status);
    
    expect(phases).toContain('planning');
    expect(phases).toContain('executing');
    expect(phases).toContain('observing');
    expect(phases).toContain('completed');
  });

  it('should handle tool failures gracefully', async () => {
    const failingTool = {
      name: 'failing_tool',
      execute: async () => { throw new Error('Tool failed'); }
    };

    const agent = new CopilotKitAgent({
      sessionId: 'test',
      tenantId: 'test',
      tools: [failingTool],
    });

    const packets: AGUIPacket[] = [];
    for await (const packet of agent.execute('test')) {
      packets.push(packet);
    }

    expect(packets.some(p => p.type === 'error')).toBe(true);
  });

  it('should respect max iterations', async () => {
    const agent = new CopilotKitAgent({
      sessionId: 'test',
      tenantId: 'test',
      tools: [],
      maxIterations: 2,
    });

    const packets: AGUIPacket[] = [];
    for await (const packet of agent.execute('test')) {
      packets.push(packet);
    }

    const iterations = packets
      .filter(p => p.type === 'state_sync')
      .map(p => (p.metadata as any).iteration);
    
    expect(iterations.max()).toBeLessThanOrEqual(2);
  });
});
```

---

## خروجی قابل مشاهده

پس از تکمیل این تسک:
1. Agentic loop کامل کار می‌کند (Plan → Execute → Observe)
2. هر phase به frontend stream می‌شود
3. Tool calls و results نمایش داده می‌شوند
4. State sync در هر iteration ارسال می‌شود
5. Memory context حفظ می‌شود

---

## معیارهای موفقیت

| Metric | Target |
|--------|--------|
| Loop completion rate | > 95% |
| Avg iterations to complete | < 5 |
| Tool execution success | > 90% |
| State sync latency | < 50ms |
| Memory persistence | 100% |

---

## مراحل بعدی

پس از تکمیل TASK 17_03:
1. TASK 17_04: Frontend phase display
2. TASK 17_05: AG-UI Protocol standardization
3. TASK 17_06: End-to-end testing