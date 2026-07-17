# Daily Plan 18: Frontend Streaming & State Sync

**Status:** PENDING
**Prerequisite:** Plan 17 complete (CopilotKit Integration)
**Goal:** Connect Svelte frontend to backend with real-time streaming, display agent phases, and visualize tool execution

---

## 🎯 Objectives

1. Implement real-time SSE streaming from backend to frontend
2. Display agentic loop phases (Planning → Executing → Observing) in UI
3. Show tool calls and results in real-time
4. Handle errors gracefully with user-friendly messages
5. Sync state between frontend and backend

---

## 📋 Task Breakdown

### TASK_18_01: Streaming Infrastructure
**Goal:** Establish SSE connection and parse AG-UI packets

**Files:**
- `cloudflare/portal/src/lib/utils/agui-stream.ts` - SSE streaming utility
- `cloudflare/portal/src/lib/utils/agui-parser.ts` - Packet parser (if needed)

**Implementation:**
- [ ] Create `streamAGUIPackets()` async generator
- [ ] Handle SSE format (`data: ` prefix)
- [ ] Parse JSON packets
- [ ] Handle heartbeat packets
- [ ] Handle stream end (`[DONE]`)
- [ ] Error handling for network failures
- [ ] Timeout configuration (2 minutes)

**Acceptance Criteria:**
- Successfully connects to `/api/builder/sessions/{id}/stream`
- Parses all AG-UI packet types
- Gracefully handles connection drops
- Emits packets in real-time as they arrive

---

### TASK_18_02: BuilderStore Streaming Support
**Goal:** Update BuilderStore to consume streaming packets

**Files:**
- `cloudflare/portal/src/lib/stores/builder.svelte.ts`

**Implementation:**
- [ ] Add `generateStream()` async generator method
- [ ] Update state for each packet type:
  - `text` → Add to messages array
  - `tool_use` → Add to activeToolCalls
  - `tool_result` → Move from active to completed
  - `state_sync` → Update applicationState
  - `error` → Set error state
  - `stream_end` → Set loading to false
- [ ] Handle loading states
- [ ] Error propagation to UI
- [ ] Auto-scroll messages

**Acceptance Criteria:**
- Messages appear in real-time as agent generates them
- Tool calls show immediately when initiated
- Tool results appear when completed
- State updates reflect in UI immediately
- Errors display to user

---

### TASK_18_03: Agent Phase Indicator Component
**Goal:** Visualize current phase of agentic loop

**Files:**
- `cloudflare/portal/src/lib/components/builder/AgentPhaseIndicator.svelte` (NEW)

**Implementation:**
- [ ] Create phase indicator UI
- [ ] Show current phase with icon:
  - 📋 Planning
  - ⚙️ Executing
  - 👁️ Observing
  - ✅ Completed
  - ❌ Failed
- [ ] Show iteration count (e.g., "Iteration 2/10")
- [ ] Animate phase transitions
- [ ] Show current plan steps during Planning phase
- [ ] Show execution progress during Executing phase

**Acceptance Criteria:**
- Phase updates in real-time via state_sync packets
- Clear visual distinction between phases
- Users understand what agent is doing
- Progress indicators accurate

---

### TASK_18_04: Tool Call Visualization
**Goal:** Display running and completed tool executions

**Files:**
- `cloudflare/portal/src/lib/components/agents/AgentToolPanel.svelte` (NEW)
- `cloudflare/portal/src/lib/components/builder/ToolCallItem.svelte` (NEW)

**Implementation:**
- [ ] Create AgentToolPanel component
- [ ] Show list of active tool calls (running)
- [ ] Show list of completed tool calls
- [ ] Display tool name, parameters, status
- [ ] Show tool output/results
- [ ] Color coding:
  - 🟡 Running (spinner animation)
  - ✅ Success (green)
  - ❌ Failed (red)
- [ ] Auto-scroll to latest tool call

**Acceptance Criteria:**
- Tool calls appear when `tool_use` packet received
- Status updates in real-time
- Results display when `tool_result` packet received
- Failed tools show error messages

---

### TASK_18_05: Error Handling UI
**Goal:** Display errors gracefully to users

**Files:**
- `cloudflare/portal/src/lib/components/ErrorBoundary.svelte` (NEW)
- `cloudflare/portal/src/lib/components/ErrorMessage.svelte` (NEW)

**Implementation:**
- [ ] Create ErrorBoundary component
- [ ] Catch errors in agent execution
- [ ] Display user-friendly error messages
- [ ] Provide retry button for transient errors
- [ ] Log detailed errors for debugging
- [ ] Show error type:
  - Network error
  - Tool execution error
  - Agent reasoning error
  - Timeout error

**Acceptance Criteria:**
- Errors display without crashing UI
- Users understand what went wrong
- Retry option available for recoverable errors
- Error details logged for debugging

---

### TASK_18_06: BuilderChat Component
**Goal:** Main chat interface for user-agent interaction

**Files:**
- `cloudflare/portal/src/lib/components/builder/BuilderChat.svelte` (NEW)

**Implementation:**
- [ ] Create chat UI with message list
- [ ] Input field for user prompts
- [ ] Send button with loading state
- [ ] Display user messages (right-aligned, blue)
- [ ] Display agent messages (left-aligned, gray)
- [ ] Show tool calls inline within agent messages
- [ ] Auto-scroll to bottom on new messages
- [ ] Disable input during agent execution
- [ ] Show typing indicator while waiting

**Acceptance Criteria:**
- Users can type and send prompts
- Responses appear in real-time
- Chat scrolls automatically
- UI clearly distinguishes user vs agent messages

---

### TASK_18_07: State Synchronization
**Goal:** Keep frontend state in sync with backend agent state

**Files:**
- `cloudflare/portal/src/lib/stores/builder.svelte.ts`
- `cloudflare/portal/src/lib/api.ts`

**Implementation:**
- [ ] Handle `state_sync` packets
- [ ] Update `applicationState` in store
- [ ] Persist state to localStorage
- [ ] Restore state on page reload
- [ ] Sync session state with backend
- [ ] Handle state conflicts

**Acceptance Criteria:**
- State persists across page refreshes
- State matches backend agent state
- No data loss on connection drop
- State recovery on reconnect

---

## 🏗️ Architecture

```
Frontend (Svelte SPA)
├── BuilderChat.svelte
│   ├── User input
│   ├── Message list
│   └── Tool call display
│
├── AgentPhaseIndicator.svelte
│   ├── Current phase
│   ├── Iteration count
│   └── Plan steps
│
├── AgentToolPanel.svelte
│   ├── Active tool calls
│   └── Completed tool calls
│
├── BuilderStore (Svelte Runes)
│   ├── Messages[]
│   ├── ActiveToolCalls[]
│   ├── ApplicationState{}
│   ├── Loading state
│   └── Error state
│
└── AG-UI Streaming Client
    └── streamAGUIPackets()
        ├── SSE connection
        ├── Packet parsing
        └── Async generator

Backend (Cloudflare Worker)
├── SSE Endpoint: /api/builder/sessions/{id}/stream
├── CopilotKitAgent
│   ├── Agentic loop
│   ├── Tool execution
│   └── State management
│
└── AG-UI Packet Generator
    ├── text packets
    ├── tool_use packets
    ├── tool_result packets
    ├── state_sync packets
    ├── error packets
    └── stream_end packets
```

---

## 📊 Data Flow

```
1. User types prompt in BuilderChat
   ↓
2. Frontend calls POST /api/builder/sessions/{id}/stream
   ↓
3. Backend creates CopilotKitAgent and starts execution
   ↓
4. Agent generates AG-UI packets:
   - state_sync: { status: 'planning', iteration: 1 }
   - text: "I'll build a counter app for you"
   - tool_use: { toolName: 'ai_generate', toolInput: {...} }
   - state_sync: { status: 'executing' }
   - tool_result: { toolOutput: {...} }
   - state_sync: { status: 'observing' }
   - text: "Counter app created successfully"
   - stream_end: {}
   ↓
5. Frontend receives packets via SSE
   ↓
6. BuilderStore updates state for each packet
   ↓
7. UI components reactively update:
   - AgentPhaseIndicator shows "Executing"
   - AgentToolPanel shows running tool
   - BuilderChat shows agent message
   ↓
8. User sees real-time progress
```

---

## 🎨 UI Mockup

```
┌──────────────────────────────────────────────────────────┐
│  Builder - Counter App                     Phase: ⚙️ Executing │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Agent Chat                            [+][−] [▶] [⏸]│ │
│  ├────────────────────────────────────────────────────┤ │
│  │                                                    │ │
│  │  User: Create a counter app with increment button  │ │
│  │                                                    │ │
│  │  Agent: I'll build a counter app for you. Let me  │ │
│  │  start by planning the implementation...           │ │
│  │                                                    │ │
│  │  ┌── Tool Call ──────────────────────────────┐   │ │
│  │  │ 🔨 ai_generate (Running...)                │   │ │
│  │  │ Prompt: "Create React counter..."           │   │ │
│  │  └────────────────────────────────────────────┘   │ │
│  │                                                    │ │
│  │  Agent: I've created the counter component...      │ │
│  │                                                    │ │
│  │  Iteration: 2/10                                   │ │
│  │                                                    │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  Tools Panel  │  Properties Panel  │  Preview Panel      │
│  ─────────────────────────────────────────────────────  │
│  🟡 ai_generate (Running)                               │
│  ✅ github_commit (Done)                                 │
│  ✅ cloudflare_deploy (Done)                             │
└──────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing

### Unit Tests

```typescript
// tests/streaming/agui-stream.test.ts
describe('AG-UI Streaming', () => {
  it('should parse text packets', async () => {});
  it('should parse tool_use packets', async () => {});
  it('should handle heartbeat', async () => {});
  it('should handle stream end', async () => {});
  it('should timeout after 2 minutes', async () => {});
});

// tests/stores/builder-streaming.test.ts
describe('BuilderStore Streaming', () => {
  it('should update messages on text packet', async () => {});
  it('should add tool calls on tool_use packet', async () => {});
  it('should complete tool calls on tool_result packet', async () => {});
  it('should update state on state_sync packet', async () => {});
  it('should handle errors gracefully', async () => {});
});
```

### Integration Tests

```typescript
// tests/e2e/streaming-flow.spec.ts
describe('Streaming Flow', () => {
  it('should stream agent execution to UI', async () => {
    // 1. Create session
    // 2. Send prompt
    // 3. Verify messages appear in real-time
    // 4. Verify tool calls display
    // 5. Verify phase indicator updates
    // 6. Verify completion
  });
});
```

---

## 📦 Dependencies

```json
{
  "dependencies": {
    // Already installed
    "@copilotkit/sdk": "^latest"
  },
  "devDependencies": {
    // Testing
    "@playwright/test": "^1.40.0"
  }
}
```

---

## 🚧 Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| SSE connection drops | High | Auto-reconnect with exponential backoff |
| Memory leaks from streaming | Medium | Properly close readers, use AbortController |
| UI freezing on rapid updates | Medium | Batch updates, use requestAnimationFrame |
| Complex state management | Medium | Use Svelte Runes for fine-grained reactivity |
| Error handling complexity | Medium | Centralized error boundary, user-friendly messages |

---

## ✅ Acceptance Criteria (Overall)

- [ ] `streamAGUIPackets()` works reliably
- [ ] All AG-UI packet types handled
- [ ] BuilderStore updates reactively
- [ ] AgentPhaseIndicator shows current phase
- [ ] AgentToolPanel shows tool execution
- [ ] BuilderChat displays messages in real-time
- [ ] Errors display gracefully
- [ ] State syncs with backend
- [ ] All tests pass
- [ ] Performance: <100ms packet latency

---

## 📝 Implementation Notes

### SSE Connection Management

```typescript
// Auto-reconnect logic
let reconnectAttempts = 0;
const MAX_RECONNECT = 3;

async function connectWithRetry(sessionId: string, prompt: string) {
  while (reconnectAttempts < MAX_RECONNECT) {
    try {
      await streamAGUIPackets(sessionId, prompt);
      break; // Success
    } catch (error) {
      reconnectAttempts++;
      if (reconnectAttempts >= MAX_RECONNECT) throw error;
      await sleep(1000 * reconnectAttempts); // Exponential backoff
    }
  }
}
```

### Packet Processing

```typescript
// Batch updates for performance
let pendingPackets: AGUIPacket[] = [];
let flushScheduled = false;

function scheduleFlush() {
  if (flushScheduled) return;
  flushScheduled = true;
  
  requestAnimationFrame(() => {
    updateStore(pendingPackets);
    pendingPackets = [];
    flushScheduled = false;
  });
}
```

---

## 📅 Estimated Timeline

| Day | Tasks | Hours |
|-----|-------|-------|
| 1 | TASK_18_01: Streaming Infrastructure | 4h |
| 2 | TASK_18_01 (continued) + TASK_18_02: BuilderStore | 6h |
| 3 | TASK_18_03: Agent Phase Indicator | 4h |
| 4 | TASK_18_04: Tool Call Visualization | 4h |
| 5 | TASK_18_05: Error Handling UI + TASK_18_06: BuilderChat | 6h |
| 6 | TASK_18_07: State Synchronization + Testing | 4h |

**Total: ~28 hours**

---

## 🔗 Related Documentation

- `Daily plan 17/TASK_17_04_FRONTEND_COPILOTKIT.md` - Frontend CopilotKit integration
- `Daily plan 17/TASK_17_03_AGENTIC_LOOP.md` - Agentic loop phases
- `Daily plan 2/DAILY_TASK_02_PLATFORM_API.md` - API routes
- `docs/FrontEnd/FRONTEND_STACK_REVIEW.md` - Frontend architecture

---

## 🎯 Next Steps

After completing Plan 18:
1. **Plan 19:** Agent Tool Wrappers - Wrap existing tools for CopilotKit
2. **Plan 20:** Integration Testing & Polish - End-to-end tests
3. **Plan 21+:** Advanced features (Agent Builder, Memory, etc.)