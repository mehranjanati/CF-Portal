# TASK 17_02: CopilotKit Backend Runtime Implementation

## هدف
پیاده‌سازی CopilotKit Runtime روی Cloudflare Worker برای مدیریت agent loop، tool execution و AG-UI Protocol streaming.

## Frontend-Backend Coordination

### Backend Provides:
1. **SSE Endpoint**: `/api/builder/sessions/{id}/stream` - Streaming AG-UI packets
2. **Agent State API**: `/api/builder/sessions/{id}/agent-state` - State synchronization
3. **Tool Registry API**: `/api/agent/tools` - Dynamic tool discovery
4. **Tool Execution API**: `/api/agent/tools/{name}/execute` - Remote tool execution

### Frontend Expects:
- SSE with `data: ` prefix
- Heartbeat packets every 15 seconds
- Proper error packets with structured error info
- State sync packets with full application state

---

## فایل‌های مورد نیاز

### Backend Files
- `cloudflare/platform-api/src/agents/CopilotKitAgent.ts` - Main agent class
- `cloudflare/platform-api/src/agents/tools/copilotkit-tools.ts` - Tool wrappers
- `cloudflare/platform-api/src/modules/agent/routes.ts` - Agent routes
- `cloudflare/platform-api/src/modules/builder/streamer.ts` - SSE streaming

### Frontend Files (to be updated by TASK_17_04)
- `cloudflare/portal/src/lib/types/builder.ts` - AG-UI types
- `cloudflare/portal/src/lib/utils/agui-stream.ts` - Streaming client
- `cloudflare/portal/src/lib/stores/builder.svelte.ts` - Store updates

---

## پیاده‌سازی Backend

### Step 1: Create CopilotKitAgent Class

**File:** `cloudflare/platform-api/src/agents/CopilotKitAgent.ts`

```typescript
import { AgentRuntime, AgentState, ToolCall } from '@copilotkit/runtime';
import { AGUIPacketGenerator } from '../modules/builder/agui-packet-generator';
import { AGUIPacketType } from '../types/agui';

export interface CopilotKitAgentConfig {
  sessionId: string;
  tenantId: string;
  appId?: string;
  tools: ToolDefinition[];
  memory?: KVNamespace;
  db?: D1Database;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: any;
  execute: (args: any) => Promise<any>;
}

export class CopilotKitAgent {
  private config: CopilotKitAgentConfig;
  private state: AgentState;
  private packetGenerator: AGUIPacketGenerator;
  private iteration = 0;
  private maxIterations = 10;

  constructor(config: CopilotKitAgentConfig) {
    this.config = config;
    this.state = {
      sessionId: config.sessionId,
      status: 'idle',
      messages: [],
      toolCalls: [],
      context: {},
    };
    this.packetGenerator = new AGUIPacketGenerator();
  }

  // Main entry point for agentic loop
  async execute(prompt: string): AsyncGenerator<AGUIPacket> {
    this.state.status = 'planning';
    this.state.messages.push({ role: 'user', content: prompt });
    
    // Send initial state sync
    yield this.packetGenerator.createStateSyncPacket({
      sessionId: this.config.sessionId,
      status: 'planning',
      iteration: this.iteration,
    });

    // Agentic Loop: Plan → Execute → Observe
    while (this.iteration < this.maxIterations) {
      this.iteration++;
      
      // PLAN
      const plan = await this.plan(prompt);
      yield this.packetGenerator.createStateSyncPacket({
        sessionId: this.config.sessionId,
        status: 'planning',
        plan,
        iteration: this.iteration,
      });

      // EXECUTE
      this.state.status = 'executing';
      const result = await this.executePlan(plan);
      
      // OBSERVE
      const observation = await this.observe(result);
      
      // Check if goal achieved
      if (observation.goalAchieved) {
        this.state.status = 'completed';
        yield this.packetGenerator.createStateSyncPacket({
          sessionId: this.config.sessionId,
          status: 'completed',
          result: observation.summary,
          iteration: this.iteration,
        });
        break;
      }
      
      // Update prompt for next iteration
      prompt = observation.nextPrompt || prompt;
    }

    if (this.iteration >= this.maxIterations) {
      this.state.status = 'failed';
      yield this.packetGenerator.createErrorPacket(
        this.config.sessionId,
        'Max iterations reached'
      );
    }
  }

  private async plan(prompt: string): Promise<ExecutionPlan> {
    // Use AI to create execution plan
    const plan = await this.callAI({
      prompt: `Create a plan for: ${prompt}`,
      responseFormat: 'structured',
    });
    
    return plan;
  }

  private async executePlan(plan: ExecutionPlan): Promise<ExecutionResult> {
    const results: any[] = [];
    
    for (const step of plan.steps) {
      // Send tool_use packet
      yield this.packetGenerator.createToolUsePacket(
        this.config.sessionId,
        step.tool,
        step.args,
        this.iteration
      );
      
      try {
        // Execute tool
        const result = await this.executeTool(step.tool, step.args);
        results.push(result);
        
        // Send tool_result packet
        yield this.packetGenerator.createToolResultPacket(
          this.config.sessionId,
          step.tool,
          result,
          this.iteration
        );
      } catch (error) {
        // Send error packet
        yield this.packetGenerator.createErrorPacket(
          this.config.sessionId,
          `Tool ${step.tool} failed: ${error.message}`
        );
        throw error;
      }
    }
    
    return { results };
  }

  private async observe(result: ExecutionResult): Promise<Observation> {
    // Use AI to observe results and determine next steps
    const observation = await this.callAI({
      prompt: `Observe these results and determine if goal is achieved: ${JSON.stringify(result)}`,
      responseFormat: 'structured',
    });
    
    return observation;
  }

  private async executeTool(toolName: string, args: any): Promise<any> {
    const tool = this.config.tools.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }
    
    return tool.execute(args);
  }

  private async callAI(params: any): Promise<any> {
    // Use existing cfai.ts provider
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

  getState(): AgentState {
    return this.state;
  }
}
```

**Acceptance Criteria:**
- [ ] Agent class implements agentic loop
- [ ] Generates AG-UI packets correctly
- [ ] Tool execution integrated
- [ ] State management working
- [ ] Error handling complete

---

### Step 2: Create Tool Wrappers

**File:** `cloudflare/platform-api/src/agents/tools/copilotkit-tools.ts`

```typescript
import { ToolDefinition } from './CopilotKitAgent';
import { AITool } from './ai-tool';
import { GitHubTool } from './github-tool';
import { CloudflareTool } from './cloudflare-tool';
import { BrowserTool } from './browser-tool';

export function createCopilotKitTools(env: Env): ToolDefinition[] {
  return [
    createAITool(env),
    createGitHubTool(env),
    createCloudflareTool(env),
    createBrowserTool(env),
  ];
}

function createAITool(env: Env): ToolDefinition {
  const tool = new AITool(env);
  
  return {
    name: 'ai_generate',
    description: 'Generate code or text using AI models',
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'The prompt for generation' },
        language: { type: 'string', description: 'Target language' },
        model: { type: 'string', description: 'AI model to use' },
      },
      required: ['prompt'],
    },
    execute: async (args) => {
      return await tool.execute(args);
    },
  };
}

function createGitHubTool(env: Env): ToolDefinition {
  const tool = new GitHubTool(env);
  
  return {
    name: 'github_commit',
    description: 'Commit and push code to GitHub',
    parameters: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'Repository name' },
        branch: { type: 'string', description: 'Branch name' },
        message: { type: 'string', description: 'Commit message' },
        files: { type: 'object', description: 'Files to commit' },
      },
      required: ['repo', 'message', 'files'],
    },
    execute: async (args) => {
      return await tool.execute(args);
    },
  };
}

function createCloudflareTool(env: Env): ToolDefinition {
  const tool = new CloudflareTool(env);
  
  return {
    name: 'cloudflare_deploy',
    description: 'Deploy application to Cloudflare Workers',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Worker name' },
        code: { type: 'string', description: 'Worker code' },
        routes: { type: 'array', description: 'Route configurations' },
      },
      required: ['name', 'code'],
    },
    execute: async (args) => {
      return await tool.execute(args);
    },
  };
}

function createBrowserTool(env: Env): ToolDefinition {
  const tool = new BrowserTool(env);
  
  return {
    name: 'browser_preview',
    description: 'Preview application in browser',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to preview' },
        screenshot: { type: 'boolean', description: 'Take screenshot' },
      },
      required: ['url'],
    },
    execute: async (args) => {
      return await tool.execute(args);
    },
  };
}
```

**Acceptance Criteria:**
- [ ] All 4 tools wrapped
- [ ] Tool schemas match frontend expectations
- [ ] Error handling consistent
- [ ] Timeout configured (30s per tool)

---

### Step 3: Create Agent Routes

**File:** `cloudflare/platform-api/src/modules/agent/routes.ts` (NEW)

```typescript
import { Hono } from 'hono';
import { CopilotKitAgent } from '../../agents/CopilotKitAgent';
import { createCopilotKitTools } from '../../agents/tools/copilotkit-tools';

export const agentRoutes = new Hono();

// POST /api/agent/chat - Chat with agent (non-streaming)
agentRoutes.post('/chat', async (c) => {
  const { message, sessionId, tenantId } = await c.req.json();
  
  if (!sessionId || !tenantId) {
    return c.json({ error: 'sessionId and tenantId required' }, 400);
  }
  
  const agent = new CopilotKitAgent({
    sessionId,
    tenantId,
    tools: createCopilotKitTools(c.env),
    memory: c.env.MEMORY,
    db: c.env.DB,
  });
  
  try {
    // Collect all packets
    const packets: any[] = [];
    for await (const packet of agent.execute(message)) {
      packets.push(packet);
    }
    
    return c.json({
      sessionId,
      packets,
      status: agent.getState().status,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/agent/tools/{name}/execute - Execute specific tool
agentRoutes.post('/tools/:toolName/execute', async (c) => {
  const toolName = c.req.param('toolName');
  const args = await c.req.json();
  
  const tools = createCopilotKitTools(c.env);
  const tool = tools.find(t => t.name === toolName);
  
  if (!tool) {
    return c.json({ error: `Tool ${toolName} not found` }, 404);
  }
  
  try {
    const result = await tool.execute(args);
    return c.json({ result });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/agent/tools - List available tools
agentRoutes.get('/tools', async (c) => {
  const tools = createCopilotKitTools(c.env);
  
  return c.json({
    tools: tools.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    })),
  });
});

// GET /api/agent/sessions/{id}/state - Get agent state
agentRoutes.get('/sessions/:sessionId/state', async (c) => {
  const sessionId = c.req.param('sessionId');
  
  // TODO: Load state from KV/D1
  return c.json({
    sessionId,
    status: 'idle',
    messages: [],
    toolCalls: [],
  });
});
```

**Acceptance Criteria:**
- [ ] All 4 endpoints implemented
- [ ] Request validation working
- [ ] Error responses properly formatted
- [ ] CORS headers set for frontend

---

### Step 4: Update Streamer for AG-UI

**File:** `cloudflare/platform-api/src/modules/builder/streamer.ts`

```typescript
import { AGUIPacket, AGUIPacketGenerator } from './agui-packet-generator';

export class AGUIStreamer {
  private encoder = new TextEncoder();
  
  async streamPackets(
    packets: AsyncGenerator<AGUIPacket>,
    writable: WritableStream
  ): Promise<void> {
    const writer = writable.getWriter();
    
    try {
      for await (const packet of packets) {
        const sseData = `data: ${JSON.stringify(packet)}\n\n`;
        await writer.write(this.encoder.encode(sseData));
      }
      
      // Send stream end
      await writer.write(this.encoder.encode('data: [DONE]\n\n'));
    } finally {
      await writer.close();
    }
  }
  
  parseSSEStream(readable: ReadableStream): AsyncGenerator<AGUIPacket> {
    // Implementation from TASK_17_05
    // ...
  }
}
```

**Acceptance Criteria:**
- [ ] Streams packets as SSE
- [ ] Sends [DONE] at end
- [ ] Handles backpressure
- [ ] Properly closes stream

---

### Step 5: Create SSE Streaming Endpoint

**File:** `cloudflare/platform-api/src/modules/builder/routes.ts` (update)

```typescript
// Add to existing routes
builderRoutes.post('/sessions/:sessionId/stream', async (c) => {
  const sessionId = c.req.param('sessionId');
  const { prompt, tenantId } = await c.req.json();
  
  if (!tenantId) {
    return c.json({ error: 'tenantId required' }, 400);
  }
  
  const agent = new CopilotKitAgent({
    sessionId,
    tenantId,
    tools: createCopilotKitTools(c.env),
    memory: c.env.MEMORY,
    db: c.env.DB,
  });
  
  const stream = new ReadableStream({
    async start(controller) {
      const streamer = new AGUIStreamer();
      const packets = agent.execute(prompt);
      
      try {
        await streamer.streamPackets(packets, writable);
      } catch (error) {
        console.error('[Stream] Error:', error);
        controller.error(error);
      }
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
});
```

**Acceptance Criteria:**
- [ ] SSE endpoint returns stream
- [ ] Headers correct for SSE
- [ ] Agent loop executed
- [ ] Packets streamed in real-time

---

## Frontend Integration Points

### What Backend Provides for Frontend:

1. **SSE Endpoint Contract**
   - URL: `/api/builder/sessions/{id}/stream`
   - Method: POST
   - Body: `{ prompt: string }`
   - Response: SSE with AG-UI packets
   - Heartbeat: Every 15s (`data: [HEARTBEAT]`)

2. **AG-UI Packet Format**
```json
{
  "type": "text" | "tool_use" | "tool_result" | "error" | "state_sync" | "stream_end" | "heartbeat",
  "id": "agui-1234567890-1",
  "timestamp": 1234567890,
  "payload": {
    "content": "...",
    "toolName": "...",
    "toolInput": {},
    "toolOutput": {},
    "error": "...",
    "state": {},
    "progress": 50
  },
  "metadata": {
    "sessionId": "session-123",
    "agentId": "agent-123",
    "iteration": 1
  }
}
```

3. **Tool Definition Format**
```json
{
  "name": "ai_generate",
  "description": "Generate code using AI",
  "parameters": {
    "type": "object",
    "properties": {
      "prompt": { "type": "string", "description": "..." }
    },
    "required": ["prompt"]
  }
}
```

---

## Testing

### Backend Tests
```typescript
// src/agents/CopilotKitAgent.test.ts
describe('CopilotKitAgent', () => {
  it('should execute agentic loop', async () => {
    const agent = new CopilotKitAgent({
      sessionId: 'test-session',
      tenantId: 'test-tenant',
      tools: [mockTool],
    });
    
    const packets: AGUIPacket[] = [];
    for await (const packet of agent.execute('Create a counter')) {
      packets.push(packet);
    }
    
    expect(packets.some(p => p.type === 'stream_end')).toBe(true);
  });
});

// src/modules/agent/routes.test.ts
describe('Agent Routes', () => {
  it('should stream agent responses', async () => {
    const response = await app.request('/api/agent/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'test', sessionId: '123', tenantId: '456' }),
    });
    
    expect(response.status).toBe(200);
  });
});
```

---

## خروجی قابل مشاهده

پس از تکمیل این تسک:
1. Agent loop کاملاً کار می‌کند
2. SSE streaming از backend فعال است
3. Tool execution کار می‌کند
4. AG-UI packets format درست است
5. Frontend می‌تواند streams را consume کند

---

## معیارهای موفقیت

| Metric | Target |
|--------|--------|
| Agent loop iterations | Max 10 |
| Tool execution timeout | 30s |
| SSE packet latency | < 100ms |
| Error rate | < 1% |
| Test coverage | > 80% |

---

## مراحل بعدی

پس از تکمیل TASK 17_02:
1. TASK 17_04: Frontend streaming client
2. TASK 17_05: AG-UI Protocol standardization
3. TASK 17_06: Integration testing