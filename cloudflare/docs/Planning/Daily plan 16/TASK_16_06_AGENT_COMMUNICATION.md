# TASK 16-06: Agent Communication Protocol

## Objective
Implement a reliable, type-safe communication protocol for agent-to-agent messaging, workflow orchestration, and real-time streaming to the Portal UI.

## Prerequisites
- TASK 16-01 completed (Agent Coder Foundation)
- TASK 16-02 completed (Sub-Agent Specialization)
- TASK 16-03 completed (Dynamic Workflow Compiler)
- TASK 16-04 completed (Tool Orchestrator)
- TASK 16-05 completed (Memory & Context)
- WebSocket support via Agents SDK
- Durable Objects for stateful coordination

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│           Agent Communication Protocol                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Communication Patterns:                                    │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ Request-Response │  │ Event-Driven     │                │
│  │ (Agent Invoke)   │  │ (Workflow Steps) │                │
│  └────────┬─────────┘  └────────┬─────────┘                │
│           │                     │                            │
│  ┌────────┴─────────┐  ┌───────┴──────────┐               │
│  │ Streaming        │  │ Broadcast        │               │
│  │ (Real-time UI)   │  │ (Agent Events)   │               │
│  └──────────────────┘  └──────────────────┘                │
│                                                             │
│  Transport Layer:                                           │
│  - Durable Objects (WebSocket)                              │
│  - HTTP (REST fallback)                                     │
│  - EventBus (pub/sub)                                       │
│                                                             │
│  Message Format:                                            │
│  - JSON envelope                                            │
│  - Type-safe with Zod                                       │
│  - Distributed tracing headers                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Communication Patterns

### Pattern 1: Request-Response (Agent Invocation)

**Use Case:** Coder Agent invokes Builder Agent

```typescript
// Client
const result = await AgentRegistry.invoke('builder', {
  input: { appId: 123, prompt: 'Build a counter' },
  timeout: 60000,
  retries: 3
});

// Response
{
  success: boolean,
  data?: any,
  error?: string,
  metadata: {
    duration: number,
    agentId: string,
    traceId: string
  }
}
```

### Pattern 2: Event-Driven (Workflow Steps)

**Use Case:** Workflow step completion triggers next step

```typescript
// Publisher
await EventBus.publish('agent.step.complete', {
  stepId: 'step-123',
  agentId: 'builder-456',
  result: buildResult,
  nextStep: 'review'
});

// Subscriber
EventBus.subscribe('agent.step.complete', async (event) => {
  if (event.nextStep) {
    await executeStep(event.nextStep);
  }
});
```

### Pattern 3: Streaming (Real-Time Updates)

**Use Case:** Stream agent reasoning to Portal UI

```typescript
// Server
const stream = new AgentStream();
stream.write({ type: 'thinking', content: 'Analyzing requirements...' });
stream.write({ type: 'tool_call', tool: 'github', params: {...} });
stream.write({ type: 'result', data: {...} });
stream.close();

// Client
for await (const chunk of stream) {
  updateUI(chunk);
}
```

---

## Implementation

### Step 1: Message Envelope

Create `platform-api/src/agents/protocol/message-envelope.ts`:
```typescript
export enum MessageType {
  // Control messages
  HANDSHAKE = 'handshake',
  PING = 'ping',
  PONG = 'pong',
  ACK = 'ack',
  ERROR = 'error',
  
  // Agent messages
  AGENT_INVOKE = 'agent.invoke',
  AGENT_RESPONSE = 'agent.response',
  AGENT_STREAM = 'agent.stream',
  
  // Workflow messages
  WORKFLOW_START = 'workflow.start',
  WORKFLOW_STEP = 'workflow.step',
  WORKFLOW_COMPLETE = 'workflow.complete',
  
  // Tool messages
  TOOL_CALL = 'tool.call',
  TOOL_RESULT = 'tool.result',
  
  // Event messages
  EVENT_PUBLISH = 'event.publish',
  EVENT_SUBSCRIBE = 'event.subscribe',
  
  // System messages
  HEARTBEAT = 'heartbeat',
  SHUTDOWN = 'shutdown'
}

export interface MessageEnvelope<T = any> {
  id: string;
  type: MessageType;
  timestamp: number;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  
  // Routing
  from: string;
  to: string;
  replyTo?: string;
  
  // Payload
  payload: T;
  
  // Metadata
  priority: 'low' | 'normal' | 'high';
  ttl?: number;
  retryCount: number;
}

export class MessageEnvelopeBuilder {
  static create<T>(
    type: MessageType,
    from: string,
    to: string,
    payload: T,
    options: {
      replyTo?: string;
      priority?: 'low' | 'normal' | 'high';
      ttl?: number;
      traceId?: string;
    } = {}
  ): MessageEnvelope<T> {
    return {
      id: crypto.randomUUID(),
      type,
      timestamp: Date.now(),
      traceId: options.traceId || crypto.randomUUID(),
      spanId: crypto.randomUUID(),
      from,
      to,
      replyTo: options.replyTo,
      payload,
      priority: options.priority || 'normal',
      ttl: options.ttl || 30000,
      retryCount: 0
    };
  }
}
```

### Step 2: Agent Client Protocol

Create `platform-api/src/agents/protocol/agent-client.ts`:
```typescript
export interface AgentInvokeOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  metadata?: Record<string, any>;
}

export interface AgentInvokeResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata: {
    duration: number;
    agentId: string;
    traceId: string;
    retries: number;
  };
}

export class AgentClient {
  constructor(private env: Env) {}

  async invoke<T = any>(
    agentId: string,
    payload: any,
    options: AgentInvokeOptions = {}
  ): Promise<AgentInvokeResponse<T>> {
    const {
      timeout = 60000,
      retries = 3,
      retryDelay = 1000
    } = options;

    const envelope = MessageEnvelopeBuilder.create(
      MessageType.AGENT_INVOKE,
      'system',
      agentId,
      payload,
      { timeout }
    );

    // Get agent DO stub
    const agentStub = this.getAgentStub(agentId);

    // Invoke with retries
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await Promise.race([
          agentStub.fetch(this.createRequest(envelope)),
          this.createTimeout(timeout)
        ]);

        const result = await this.parseResponse<T>(response);
        
        return {
          success: result.success,
          data: result.data,
          error: result.error,
          metadata: {
            duration: Date.now() - envelope.timestamp,
            agentId,
            traceId: envelope.traceId,
            retries: attempt
          }
        };
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Agent invocation failed',
      metadata: {
        duration: 0,
        agentId,
        traceId: envelope.traceId,
        retries
      }
    };
  }

  private getAgentStub(agentId: string): DurableObjectStub {
    const id = this.env.AGENT_SESSIONS.idFromName(agentId);
    return this.env.AGENT_SESSIONS.get(id);
  }

  private createRequest(envelope: MessageEnvelope): Request {
    return new Request('http://agent/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope)
    });
  }

  private createTimeout(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Agent invocation timeout')), timeout);
    });
  }

  private async parseResponse<T>(response: Response): Promise<AgentInvokeResponse<T>> {
    const data = await response.json();
    return data as AgentInvokeResponse<T>;
  }
}
```

### Step 3: Event Bus

Create `platform-api/src/agents/protocol/event-bus.ts`:
```typescript
type EventHandler<T = any> = (event: MessageEnvelope<T>) => Promise<void>;

export class EventBus {
  private subscribers: Map<string, Set<EventHandler>> = new Map();
  private eventLog: MessageEnvelope[] = [];

  subscribe<T>(eventType: MessageType | string, handler: EventHandler<T>): () => void {
    const key = eventType.toString();
    
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }

    this.subscribers.get(key)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.subscribers.get(key)?.delete(handler);
    };
  }

  async publish<T>(envelope: MessageEnvelope<T>): Promise<void> {
    // Log event
    this.eventLog.push(envelope);

    // Notify subscribers
    const handlers = this.subscribers.get(envelope.type.toString()) || new Set();
    const wildcardHandlers = this.subscribers.get('*') || new Set();

    await Promise.allSettled([
      ...handlers,
      ...wildcardHandlers
    ].map(handler => handler(envelope).catch(err => 
      console.error(`Event handler error: ${err.message}`)
    )));
  }

  getEventLog(filter?: { type?: MessageType; since?: number }): MessageEnvelope[] {
    return this.eventLog.filter(event => {
      if (filter?.type && event.type !== filter.type) return false;
      if (filter?.since && event.timestamp < filter.since) return false;
      return true;
    });
  }

  clear(): void {
    this.eventLog = [];
  }
}

export const eventBus = new EventBus();
```

### Step 4: Streaming Protocol

Create `platform-api/src/agents/protocol/streaming.ts`:
```typescript
export interface StreamChunk {
  type: 'thinking' | 'tool_call' | 'tool_result' | 'result' | 'error' | 'complete';
  content?: string;
  data?: any;
  metadata?: Record<string, any>;
}

export class AgentStream {
  private encoder = new TextEncoder();
  private controller: ReadableController | null = null;
  private writer: WritableStreamDefaultWriter | null = null;

  constructor(private env: Env) {}

  createReadableStream(): ReadableStream<Uint8Array> {
    return new ReadableStream({
      start: (controller) => {
        this.controller = controller;
      }
    });
  }

  async write(chunk: StreamChunk): Promise<void> {
    const data = JSON.stringify(chunk) + '\n';
    const encoded = this.encoder.encode(data);
    
    this.controller?.enqueue(encoded);
  }

  async close(): Promise<void> {
    this.controller?.close();
  }

  async error(error: Error): Promise<void> {
    await this.write({
      type: 'error',
      content: error.message
    });
    this.controller?.error(error);
  }
}

export class StreamHandler {
  constructor(private agent: BaseAgent, private stream: AgentStream) {}

  async execute(input: any): Promise<void> {
    try {
      // Stream thinking
      await this.stream.write({
        type: 'thinking',
        content: 'Starting execution...'
      });

      // Execute with streaming
      const result = await this.agent.execute(input);

      // Stream result
      await this.stream.write({
        type: 'result',
        data: result
      });

      // Complete
      await this.stream.write({
        type: 'complete'
      });

      await this.stream.close();
    } catch (error) {
      await this.stream.error(error as Error);
    }
  }
}
```

### Step 5: Error Propagation

Create `platform-api/src/agents/protocol/errors.ts`:
```typescript
export enum AgentErrorCode {
  // Agent errors
  AGENT_NOT_FOUND = 'agent_not_found',
  AGENT_TIMEOUT = 'agent_timeout',
  AGENT_FAILED = 'agent_failed',
  
  // Tool errors
  TOOL_NOT_FOUND = 'tool_not_found',
  TOOL_TIMEOUT = 'tool_timeout',
  TOOL_FAILED = 'tool_failed',
  TOOL_PERMISSION_DENIED = 'tool_permission_denied',
  
  // Workflow errors
  WORKFLOW_NOT_FOUND = 'workflow_not_found',
  WORKFLOW_FAILED = 'workflow_failed',
  WORKFLOW_TIMEOUT = 'workflow_timeout',
  
  // System errors
  MEMORY_ERROR = 'memory_error',
  NETWORK_ERROR = 'network_error',
  VALIDATION_ERROR = 'validation_error'
}

export class AgentError extends Error {
  constructor(
    public code: AgentErrorCode,
    message: string,
    public details?: any,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'AgentError';
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      retryable: this.retryable
    };
  }
}

export class ErrorHandler {
  handle(error: AgentError): MessageEnvelope {
    return MessageEnvelopeBuilder.create(
      MessageType.ERROR,
      'system',
      error.details?.agentId || 'unknown',
      error.toJSON(),
      { priority: 'high' }
    );
  }

  classify(error: any): AgentError {
    if (error instanceof AgentError) {
      return error;
    }

    // Classify common errors
    if (error.message?.includes('timeout')) {
      return new AgentError(AgentErrorCode.AGENT_TIMEOUT, error.message, {}, true);
    }
    
    if (error.message?.includes('not found')) {
      return new AgentError(AgentErrorCode.AGENT_NOT_FOUND, error.message, {}, false);
    }

    return new AgentError(AgentErrorCode.AGENT_FAILED, error.message, {}, true);
  }
}
```

### Step 6: Protocol Documentation

Create `platform-api/docs/AGENT_COMMUNICATION_PROTOCOL.md`:
```markdown
# Agent Communication Protocol

## Message Flow

### 1. Agent Invocation

```
Client                    System                    Agent
  │                         │                         │
  │───invoke(builder)──────▶│                         │
  │                         │───AGENT_INVOKE─────────▶│
  │                         │                         │
  │                         │◀──AGENT_RESPONSE────────│
  │◀──Response──────────────│                         │
```

### 2. Workflow Step Execution

```
Workflow                  Agent Bus                 Agents
  │                         │                         │
  │───step.start()─────────▶│                         │
  │                         │───WORKFLOW_STEP────────▶│
  │                         │                         │
  │◀──step.complete()──────│◀──AGENT_RESPONSE────────│
```

### 3. Streaming Updates

```
Agent                     Portal UI
  │                         │
  │───thinking─────────────▶│
  │───tool_call────────────▶│
  │───tool_result──────────▶│
  │───complete─────────────▶│
```

## Message Formats

### Agent Invoke

```json
{
  "type": "agent.invoke",
  "from": "coder-123",
  "to": "builder-456",
  "payload": {
    "input": {
      "appId": 123,
      "prompt": "Build a counter"
    }
  }
}
```

### Agent Response

```json
{
  "type": "agent.response",
  "from": "builder-456",
  "to": "coder-123",
  "payload": {
    "success": true,
    "data": {
      "files": [...],
      "artifactPath": "artifacts/123/456"
    }
  }
}
```

## Error Handling

Errors are propagated as structured messages:

```json
{
  "type": "error",
  "from": "system",
  "to": "coder-123",
  "payload": {
    "code": "agent_timeout",
    "message": "Builder agent timed out",
    "retryable": true
  }
}
```
```

---

## Deliverables
- [ ] Message envelope format
- [ ] Agent client (invoke with retries)
- [ ] Event bus (pub/sub)
- [ ] Streaming protocol (SSE/WebSocket)
- [ ] Error propagation system
- [ ] Protocol documentation

## Acceptance Criteria
- [ ] Agents can invoke other agents reliably
- [ ] Events reach all subscribers
- [ ] Streaming works end-to-end (agent → Portal)
- [ ] Errors propagate with correct codes
- [ ] All messages have trace IDs
- [ ] Retries work for transient failures
- [ ] Protocol is documented