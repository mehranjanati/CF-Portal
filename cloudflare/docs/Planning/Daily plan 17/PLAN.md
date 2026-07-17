# Daily Plan 17: CopilotKit Headless SDK Integration

## Overview
Integrate **CopilotKit Headless SDK** into the platform to enable a proper agentic loop with:
- Real-time state synchronization between frontend (SvelteKit) and backend (Cloudflare Workers)
- AG-UI Protocol for agent-client communication
- Tool calling with streaming responses
- Memory and context management

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (SvelteKit)                  │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  CopilotKit Headless SDK                            │ │
│  │  - useAgent() / useAgentChat()                      │ │
│  │  - State Synchronization                            │ │
│  │  - AG-UI Protocol Client                            │ │
│  └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│                    Cloudflare Worker (Hono)              │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  CopilotKit Runtime Proxy                           │ │
│  │  - WebSocket/SSE Handler                            │ │
│  │  - AG-UI Protocol Parser                            │ │
│  │  - Tool Registry & Execution                        │ │
│  │  - Agent Loop (Plan → Execute → Observe)             │ │
│  └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│                    Services                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Cloudflare│  │  GitHub  │  │ Browser  │  │  Memory  │ │
│  │ AI/Gateway│  │   API    │  │  Tools   │  │   (KV)   │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Tasks

### TASK 17_01: Install & Configure CopilotKit Dependencies
**Files:**
- `cloudflare/platform-api/package.json` - Add CopilotKit runtime packages
- `cloudflare/portal/package.json` - Add CopilotKit headless SDK (frontend)
- `cloudflare/platform-api/wrangler.toml` - Verify bindings

**Details:**
- Backend: `npm install @copilotkit/runtime`
- Frontend: `npm install @copilotkit/react-core @copilotkit/react-ui`
- Verify compatibility with existing `hono` and `@cloudflare/agents`

### TASK 17_02: Implement CopilotKit Runtime on Backend
**Files:**
- `cloudflare/platform-api/src/agents/CopilotKitAgent.ts` - Main agent class extending CopilotKit runtime
- `cloudflare/platform-api/src/agents/tools/copilotkit-tools.ts` - Tool definitions for CopilotKit
- `cloudflare/platform-api/src/modules/agent/routes.ts` - Updated routes with CopilotKit endpoints

**Details:**
- Create `CopilotKitAgent` class that handles:
  - AG-UI Protocol message parsing/generation
  - Tool call routing to existing tools (AI, GitHub, Cloudflare, Browser)
  - Streaming responses via Server-Sent Events (SSE) or WebSocket
  - State persistence via KV/Memory system
- Wire up existing `cfai.ts` provider for AI model access
- Implement proper error handling and timeout management

### TASK 17_03: Implement Agentic Loop (Plan → Execute → Observe)
**Files:**
- `cloudflare/platform-api/src/agents/CopilotKitAgent.ts` (update)
- `cloudflare/platform-api/src/agents/orchestrator.ts` - Agent orchestrator
- `cloudflare/platform-api/src/agents/memory.ts` - Enhanced memory context

**Details:**
Agentic Loop implementation:
1. **Plan**: Receive user request → Analyze → Create execution plan
2. **Execute**: Call appropriate tools (AI generation, file system, GitHub, etc.)
3. **Observe**: Collect results, check for errors, determine next steps
4. **Iterate**: Continue loop until goal reached or max iterations hit

Integration points:
- `cfai.ts` for AI model calls (Workers AI / AI Gateway)
- Tool system for code generation, file operations, GitHub deployments
- Memory context for conversation history and state

### TASK 17_04: Frontend CopilotKit Integration (SvelteKit)
**Files:**
- `cloudflare/portal/src/lib/stores/builder.svelte.ts` - Update to support streaming
- `cloudflare/portal/src/lib/types/builder.ts` - Add missing AG-UI packet types
- `cloudflare/portal/src/lib/utils/agui-stream.ts` - New streaming utility
- `cloudflare/portal/src/lib/api.ts` - Add streaming API methods
- `cloudflare/portal/src/routes/(app)/builder/+page.svelte` - Update builder page
- `cloudflare/portal/src/lib/components/builder/BuilderChat.svelte` - New chat component

**Details:**
- Update AG-UI types to match backend spec (add stream_end, heartbeat, error packets)
- Create streaming utility for reading Server-Sent Events
- Convert BuilderStore.generate() to async generator pattern
- Add CopilotKit to portal package.json (or use headless SDK with wrapper)
- Implement real-time message display with streaming responses
- Display tool calls and results in the UI
- Handle session management and history
- Add state synchronization with backend


### TASK 17_05: AG-UI Protocol Implementation
**Files:**
- `cloudflare/platform-api/src/lib/features/builder/agui-packet-generator.ts` (update)
- `cloudflare/platform-api/src/modules/builder/streamer.ts` (update)
- `cloudflare/platform-api/src/types/agui.ts` (update)

**Details:**
AG-UI Protocol packet structure:
```typescript
interface AGUIPacket {
  type: 'text' | 'tool_use' | 'tool_result' | 'error' | 'state_sync';
  id: string;
  timestamp: number;
  payload: {
    content?: string;
    toolName?: string;
    toolInput?: Record<string, any>;
    toolOutput?: any;
    error?: string;
    state?: Record<string, any>;
  };
  metadata: {
    sessionId: string;
    agentId: string;
    iteration: number;
  };
}
```

### TASK 17_06: Tool Integration & Testing
**Files:**
- `cloudflare/platform-api/src/agents/tools/ai-tool.ts` (update)
- `cloudflare/platform-api/src/agents/tools/github-tool.ts` (update)
- `cloudflare/platform-api/src/agents/tools/cloudflare-tool.ts` (update)
- `cloudflare/platform-api/src/agents/tools/browser-tool.ts` (update)
- Tests for each tool and the agent loop

**Details:**
- Convert existing stub tools to real CopilotKit-compatible tools
- Tool schema definitions for automatic tool discovery
- Integration tests for the full agent loop
- Error handling and retry logic

## Implementation Order

1. **TASK 17_01** → Install CopilotKit dependencies in platform-api and portal
2. **TASK 17_02** → Backend runtime implementation (CopilotKitAgent class, tools, routes)
3. **TASK 17_05** → AG-UI Protocol standardization (align frontend types with backend)
4. **TASK 17_03** → Agentic Loop implementation (Plan → Execute → Observe cycle)
5. **TASK 17_04** → Frontend streaming support (BuilderStore, AG-UI streaming, Chat UI)
6. **TASK 17_06** → Tool wrappers & integration tests


## Key Design Decisions

1. **Backend-first approach**: Build the CopilotKit runtime on the Worker first, then frontend
2. **Leverage existing tools**: Don't rebuild tools from scratch - wrap existing ones with CopilotKit interface
3. **Streaming via SSE**: Use Server-Sent Events instead of WebSocket for simplicity (or WebSocket for real-time bi-directional)
4. **KV for memory persistence**: Use existing `MEMORY` KV binding for conversation history
5. **AI Gateway integration**: Use existing `cfai.ts` provider for AI model access

## Dependencies

### platform-api (backend)
- `@copilotkit/runtime` - Backend runtime for agent orchestration
- `hono` - Already installed, for HTTP/SSE routes
- `@cloudflare/agents` - Already installed, for Durable Object state sync

### portal (frontend)
- Option A: `@copilotkit/react-core` + `@copilotkit/react-ui` with Svelte wrapper
- Option B: CopilotKit Headless SDK only (`@copilotkit/sdk`)
- Option C: Custom Svelte implementation using AG-UI protocol directly (lighter)
- `codemirror` - Already installed for code viewing
- Svelte Runes - Already installed for reactive state

### Decision Needed:
Given the portal is Svelte, consider Option B or C to avoid React dependency.

