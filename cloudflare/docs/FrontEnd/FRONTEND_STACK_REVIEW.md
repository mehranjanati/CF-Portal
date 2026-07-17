# Frontend Stack Deep Review

**وضعیت:** Active  
**هدف:** بررسی کامل استک فرانت‌اند، شناسایی inconsistencies با بک‌اند، و تعریف آپدیت‌های مورد نیاز برای Daily Plan 17 (CopilotKit Integration).

---

## 1. خلاصه استک فعلی

### 1.1 Core Technologies

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Framework | Svelte (SPA) | ^5.56.1 | Client-side rendering |
| Runtime | Vite | ^8.0.16 | Build tool and dev server |
| UI Library | shadcn-svelte | ^1.3.0 | Component primitives |
| Styling | Tailwind CSS | ^4.3.0 | Utility-first CSS |
| Icons | lucide-svelte | ^1.0.1 | Icon library |
| Code Editor | CodeMirror 6 | ^6.0.2 | Syntax highlighting |
| Feature Flags | @cloudflare/flagship | ^0.4.2 | Feature flagging |
| State Management | Svelte Runes | Built-in | Reactive state |
| Deployment | Cloudflare Pages | - | Static hosting |

### 1.2 Architecture

```
cloudflare/portal/
├── src/
│   ├── routes/              # Svelte file-based routing
│   │   ├── (app)/           # Authenticated app routes
│   │   │   ├── builder/     # AI builder feature
│   │   │   ├── projects/    # Project management
│   │   │   ├── settings/    # Integration settings
│   │   │   └── workspace/   # Main workspace
│   │   └── +layout.svelte   # Root SPA layout
│   ├── lib/
│   │   ├── api.ts           # HTTP client with fetch wrapper
│   │   ├── stores/          # Svelte stores (builder.svelte.ts)
│   │   ├── features/        # Feature modules (builder)
│   │   ├── components/      # Reusable UI components
│   │   ├── types/           # TypeScript definitions
│   │   └── utils/           # Utilities (AG-UI parser)
│   └── app.html             # SPA entry point
├── static/                  # Static assets
└── package.json
```

---

## 2. ملاحظات بک‌اند و一致ی

### 2.1 AG-UI Protocol Implementation

**بک‌اند expects** (from `cloudflare/platform-api/src/types/agui.ts`):
```typescript
type AGUIPacketType = 'text' | 'tool_use' | 'tool_result' | 'error' | 'state_sync' | 'stream_end' | 'heartbeat';
```

**فرانت‌اند has** (from `cloudflare/portal/src/lib/types/builder.ts`):
```typescript
type AGUIPacket = AGUIMessage | AGUIToolCall | AGUIStateUpdate;
// Missing: stream_end, heartbeat, error packets
```

**نتیجه:** غیری‌مونی (Inconsistency) - فرانت‌اند باید async generator برای streaming پیcsupport کند.

### 2.2 Backend Planned Changes (Daily Plan 17)

| Feature | Backend Status | Frontend Status | Gap |
|---------|----------------|----------------|-----|
| SSE endpoint `/api/builder/sessions/{id}/stream` | ✅ Planned | ❌ Missing | Need streaming fetch |
| AG-UI packet types (stream_end, heartbeat) | ✅ Defined | ❌ Missing | Need type updates |
| CopilotKit integration | 🔄 In Progress | ❌ Not installed | Need npm packages |
| Tool discovery | ✅ Planned | ⚠️ Manual registry | Need dynamic registration |
| State sync | ✅ Implemented | ✅ Partial | Needs enhancement |

---

## 3. تکنولوژی‌های نیازمند اضافه شدن

### 3.1 CopilotKit Dependencies

**Decision: Option B - CopilotKit Headless SDK**

```json
// cloudflare/portal/package.json additions:
{
  "dependencies": {
    "@copilotkit/sdk": "^latest"
  }
}
```

**توضیح:**
- حجم کم (~15KB)
- Framework-agnostic (با Svelte سازگار)
- مستقیم روی AG-UI Protocol کار می‌کند
- نیازمند wrapper سفاری برای Svelte Runes است

**Rationale:** Portal is Svelte SPA, not React. React-based packages would add ~70KB and require react dependency. Headless SDK provides protocol abstractions without framework lock-in.

### 3.2 Streaming Support

```typescript
// New utility: cloudflare/portal/src/lib/utils/agui-stream.ts
export async function* streamAGUIPackets(
  sessionId: string,
  prompt: string
): AsyncGenerator<AGUIPacket> {
  const response = await fetch(`${API_BASE_URL}/api/builder/sessions/${sessionId}/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  
  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;
        yield parseAGUIPacket(data);
      }
    }
  }
}
```

### 3.3 CopilotKit-Compatible Tool Interface

```typescript
// Frontend tool schema for CopilotKit
export interface CopilotKitTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
    }>;
    required: string[];
  };
}

export const availableTools: CopilotKitTool[] = [
  {
    name: 'generate_code',
    description: 'Generate code from natural language description',
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Description of code to generate' },
        language: { type: 'string', description: 'Target programming language' }
      },
      required: ['prompt']
    }
  },
  {
    name: 'preview_app',
    description: 'Preview the generated application',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to preview' }
      },
      required: ['url']
    }
  }
];
```

---

## 4. تغییرات لازم در فایل‌های موجود

### 4.1 `cloudflare/portal/src/lib/stores/builder.svelte.ts`

**مشکل:** `generate()` منتظر JSON response است، نه streaming.

**نیازمند:** Replace with async generator support.

```typescript
async *generateStream(prompt: string): AsyncGenerator<AGUIPacket> {
  this.isLoading = true;
  this.error = null;
  
  try {
    const packets = streamAGUIPackets(this.session!.id, prompt);
    
    for await (const packet of packets) {
      switch (packet.type) {
        case 'message':
          this.messages.push(packet);
          break;
        case 'tool_use':
          this.activeToolCalls.push(packet);
          // Auto-execute tool if needed
          await handleToolCalls();
          break;
        case 'tool_result':
          // Move completed tool from active to messages
          this.activeToolCalls = this.activeToolCalls.filter(
            c => c.call_id !== packet.payload.toolOutput.call_id
          );
          // Add result as message
          this.messages.push({
            type: 'message',
            role: 'assistant',
            content: `Tool result: ${JSON.stringify(packet.payload.toolOutput)}`
          });
          break;
        case 'state_sync':
          Object.assign(this.applicationState, packet.payload.state);
          break;
        case 'error':
          this.error = packet.payload.error;
          this.session!.status = 'failed';
          break;
        case 'stream_end':
          this.session!.status = 'completed';
          break;
      }
      
      yield packet;
    }
  } catch (err: any) {
    this.error = err.message || 'Stream failed';
    this.session!.status = 'failed';
  } finally {
    this.isLoading = false;
  }
}
```

### 4.2 `cloudflare/portal/src/lib/types/builder.ts`

**نیازمند:** Add missing packet types and metadata.

```typescript
export type AGUIPacketType = 
  | 'text'          // Rename from 'message' for clarity
  | 'tool_use'
  | 'tool_result'
  | 'error'
  | 'state_sync'
  | 'stream_end'
  | 'heartbeat';

export interface AGUIPacket {
  type: AGUIPacketType;
  id: string;
  timestamp: number;
  payload: {
    content?: string;
    toolName?: string;
    toolInput?: Record<string, any>;
    toolOutput?: any;
    error?: string;
    state?: Record<string, any>;
    progress?: number;
  };
  metadata: {
    sessionId: string;
    agentId?: string;
    iteration: number;
    callId?: string; // For tool call correlation
  };
}

// Deprecate old union type
export type { AGUIPacket as AGUIPacketV2 };
```

### 4.3 `cloudflare/portal/src/lib/api.ts`

**نیازمند:** Add streaming builder API methods.

```typescript
export const builder = {
  // Existing methods...
  
  // New streaming method for CopilotKit
  streamGenerate: (sessionId: string, prompt: string) => {
    return streamAGUIPackets(sessionId, prompt);
  },
  
  // Agent chat endpoint
  agentChat: (payload: { message: string; sessionId: string }) => 
    apiFetch<any>('/api/agent/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  
  // Get available tools
  listTools: () => 
    apiFetch<any[]>('/api/agent/tools'),
};
```

---

## 5. Future Architecture Changes

### 5.1 CopilotKit Integration Design

**Frontend Architecture with CopilotKit:**

```
┌─────────────────────────────────────────┐
│  Svelte SPA (cloudflare/portal)          │
│  ┌───────────────────────────────────┐  │
│  │  AgentChat.svelte                  │  │
│  │  - Custom agent hooks (Svelte)     │  │
│  │  - Streaming message display       │  │
│  │  - Tool call visualization         │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  BuilderStore (Svelte Runes)       │  │
│  │  - State sync with CopilotKit      │  │
│  │  - Tool registry                   │  │
│  └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│  Cloudflare Worker                       │
│  ┌───────────────────────────────────┐  │
│  │  CopilotKitRuntime                 │  │
│  │  - Agent execution                 │  │
│  │  - Tool orchestration              │  │
│  │  - State management (KV/D1)        │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 5.2 State Synchronization

```typescript
// New store method for CopilotKit state sync
syncWithCopilotKit() {
  if (!this.session) return;
  
  // Subscribe to CopilotKit state changes
  copilotKit.onStateChange((state) => {
    this.applicationState = {
      ...this.applicationState,
      ...state
    };
  });
  
  // Subscribe to tool calls
  copilotKit.onToolCall((toolCall) => {
    this.activeToolCalls.push({
      type: 'tool_call',
      tool_name: toolCall.name,
      args: toolCall.arguments,
      call_id: toolCall.id
    });
  });
}
```

---

## 6. Testing Implications

### 6.1 New Test Files Needed

```
cloudflare/portal/src/lib/
├── utils/
│   ├── agui-parser.test.ts          ✅ EXISTS
│   ├── agui-stream.test.ts          ❌ NEEDED
│   └── copilotkit-tools.test.ts     ❌ NEEDED
├── stores/
│   └── builder.svelte.test.ts        ❌ NEEDED
└── features/
    └── builder/
        └── tool-handler.test.ts      ✅ EXISTS
```

### 6.2 Integration Test Strategy

```typescript
// tests/integration/copilotkit-flow.test.ts
describe('CopilotKit Integration Flow', () => {
  it('should stream AG-UI packets from backend', async () => {
    const store = new BuilderStore();
    await store.createSession('tenant-1', 'app-1', 'empty', 'test');
    
    const packets: AGUIPacket[] = [];
    for await (const packet of store.generateStream('Create a counter')) {
      packets.push(packet);
    }
    
    expect(packets.some(p => p.type === 'stream_end')).toBe(true);
    expect(store.session?.status).toBe('completed');
  });
});
```

---

## 7. Backend-Frontend Contract

### 7.1 API Contract Changes

| Endpoint | Method | Current | After CopilotKit |
|----------|--------|---------|------------------|
| `/api/builder/sessions/{id}/generate` | POST | Returns JSON | Returns SSE stream |
| `/api/builder/sessions/{id}` | GET | Returns session | Adds `agent_state` |
| `/api/agent/tools` | GET | ❌ Missing | ✅ Returns tool definitions |
| `/api/agent/chat` | POST | ❌ Missing | ✅ Chat endpoint |

### 7.2 Type Synchronization

**بک‌اند types** (`cloudflare/platform-api/src/types/agui.ts`):
```typescript
export interface AGUIPacket {
  type: AGUIPacketType;
  id: string;
  timestamp: number;
  payload: AGUIPayload;
  metadata: AGUIMetadata;
}
```

**فرانت‌اند types** (needs synchronization):
```typescript
// Should match backend exactly
export interface AGUIPacket {
  type: AGUIPacketType;
  id: string;
  timestamp: number;
  payload: Record<string, any>;
  metadata: {
    sessionId: string;
    agentId?: string;
    iteration: number;
  };
}
```

---

## 8. Bundle Size & Performance

### 8.1 Bundle Size Impact

| Package | Approx Size | Impact |
|---------|-------------|--------|
| @copilotkit/sdk | ~15KB | Small |
| **Total Additional** | **~15KB** | **Acceptable** |

**Optimization strategies:**
- Lazy load CopilotKit only in builder routes
- Use dynamic imports
- Tree-shake unused utilities

### 8.2 Runtime Performance

- Streaming: No additional overhead (SSE already used)
- Re-renders: Svelte's fine-grained reactivity minimizes impact
- Tool execution: Async/non-blocking

---

## 9. Progressive Migration Plan

### Phase 1: Foundation (TASK 17_01 - 17_02)
- [ ] Install CopilotKit packages
- [ ] Update AG-UI types to match backend
- [ ] Create streaming utilities
- [ ] Update BuilderStore to support streaming

### Phase 2: Integration (TASK 17_03 - 17_04)
- [ ] Implement agentic loop in frontend
- [ ] Add tool registration/execution UI
- [ ] Create AgentChat component
- [ ] Add state sync with backend

### Phase 3: Testing (TASK 17_06)
- [ ] Write streaming tests
- [ ] Write integration tests
- [ ] Write tool handler tests
- [ ] Performance testing

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| React dependencies in Svelte app | High | Use headless SDK (no React) |
| Bundle size increase | Low | Headless SDK is only ~15KB |
| Streaming complexity | Medium | Reuse existing AG-UI parser |
| Type mismatches | High | Generate types from shared schema |
| State sync bugs | Medium | Comprehensive integration tests |

---

## 11. Definition of Done

Frontend stack review is complete when:
- [ ] All AG-UI packet types match backend
- [ ] Streaming utilities implemented and tested
- [ ] BuilderStore supports async generator pattern
- [ ] CopilotKit packages installed and configured
- [ ] Tool registration UI created
- [ ] Integration tests passing
- [ ] Bundle size impact measured and optimized
- [ ] Documentation updated

---

## 12. Decision Log

| Decision | Options Considered | Selected | Rationale |
|----------|-------------------|----------|-----------|
| CopilotKit Package | A: React Core+UI, B: Headless SDK, C: Custom | **B** | Svelte SPA compatibility, bundle size, AG-UI native |
| Streaming Approach | SSE, WebSocket | **SSE** | Simpler, matches existing infrastructure |
| State Management | Svelte Stores, CopilotKit State | **Hybrid** | Svelte Runes for UI, CopilotKit for agent state |
| Type Synchronization | Manual, Generated | **Generated** | Prevent drift between frontend/backend |

---

## 13. Related Documents

- `TASK_17_04_FRONTEND_COPILOTKIT.md` - Frontend implementation plan
- `TASK_17_05_AGUI_PROTOCOL.md` - AG-UI protocol specification
- `TASK_17_06_TOOLS_TESTING.md` - Tool integration and testing
- Backend: `cloudflare/platform-api/src/types/agui.ts`
- Deployment: `cloudflare/portal/wrangler.toml` (Cloudflare Pages config)

---

## 14. SPA Architecture Notes

**Framework:** Pure Svelte (not SvelteKit SSR)
**Build:** Vite with Svelte plugin
**Routing:** Svelte file-based routing (SPA mode)
**Deployment:** Cloudflare Pages (static assets + SSR Functions)
**State:** Client-side only (no server-side rendering)

### Key Implications for CopilotKit Integration:
1. No SSR concerns for streaming (client-side only)
2. SSE streaming works natively in browser
3. Svelte Runes provide reactive state without stores
4. Can lazy-load CopilotKit without SSR penalties
5. Service Worker could cache AG-UI packets for offline support