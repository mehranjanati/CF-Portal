# TASK 17_04: Frontend CopilotKit Integration (Svelte SPA)

## هدف
یکپارچه‌سازی CopilotKit Headless SDK با فرانت‌اند Svelte SPA برای ایجاد رابط کاربری agentic با streaming real-time و پشتیبانی از AG-UI Protocol.

## Frontend-Backend Gaps to Fix

### Gap 1: Missing AG-UI Packet Types (HIGH)
**Current State:** Frontend missing 4 packet types
**Required:** Update types to match backend spec

### Gap 2: No Streaming Support (HIGH)
**Current State:** Frontend expects JSON response
**Required:** Implement async generator for SSE streaming

### Gap 3: BuilderStore Not Streaming-Aware (HIGH)
**Current State:** `generate()` returns Promise<JSON>
**Required:** Convert to `generateStream()` returning AsyncGenerator<AGUIPacket>

### Gap 4: CopilotKit Not Installed (MEDIUM)
**Current State:** No CopilotKit package in portal
**Required:** Install `@copilotkit/sdk`

### Gap 5: Manual Tool Registry (LOW)
**Current State:** Tools registered manually in code
**Required:** Dynamic tool discovery via `/api/agent/tools`

---

## فایل‌های مورد نیاز

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/types/builder.ts` | Update | Add missing AG-UI packet types |
| `src/lib/utils/agui-stream.ts` | Create | SSE streaming utility |
| `src/lib/stores/builder.svelte.ts` | Update | Convert to async generator |
| `src/lib/api.ts` | Update | Add streaming methods |
| `src/lib/components/builder/BuilderChat.svelte` | Create | Chat UI component |
| `src/lib/components/agents/AgentToolPanel.svelte` | Create | Tool execution panel |
| `package.json` | Update | Add `@copilotkit/sdk` |

---

## پیاده‌سازی

### Step 1: Fix Gap #1 - Update AG-UI Types

**File:** `cloudflare/portal/src/lib/types/builder.ts`

```typescript
// Add missing packet types
export type AGUIPacketType = 
  | 'text'          // Message from agent/user
  | 'tool_use'      // Agent wants to use a tool
  | 'tool_result'   // Tool execution result
  | 'error'         // Error occurred
  | 'state_sync'    // State synchronization
  | 'stream_end'    // Stream ended
  | 'heartbeat';    // Keep-alive

// Updated AGUIPacket interface
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
    callId?: string;
  };
}

// Keep old types for backward compatibility
export type AGUIMessage = { type: 'message'; role: 'user' | 'assistant'; content: string };
export type AGUIToolCall = { type: 'tool_call'; tool_name: string; args: Record<string, any>; call_id: string };
export type AGUIStateUpdate = { type: 'state_update'; payload: Record<string, any> };
export type AGUIPacketV1 = AGUIMessage | AGUIToolCall | AGUIStateUpdate;
```

**Acceptance Criteria:**
- [ ] All 7 packet types defined
- [ ] Types match backend exactly
- [ ] No TypeScript compilation errors

---

### Step 2: Fix Gap #2 - Create Streaming Utility

**File:** `cloudflare/portal/src/lib/utils/agui-stream.ts` (NEW)

```typescript
import { AGUIPacket, parseAGUIPacket } from './agui-parser';

export async function* streamAGUIPackets(
  sessionId: string,
  prompt: string
): AsyncGenerator<AGUIPacket> {
  const response = await fetch(`${API_BASE_URL}/api/builder/sessions/${sessionId}/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
    signal: AbortSignal.timeout(120000) // 2 minute timeout
  });

  if (!response.ok) {
    throw new Error(`Stream failed: ${response.status} ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6).trim();
        if (data === '[DONE]') return;
        if (data === '[HEARTBEAT]') continue;

        try {
          yield parseAGUIPacket(data);
        } catch (err) {
          console.error('[agui-stream] Failed to parse packet:', err);
          // Continue streaming despite parse errors
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
```

**Acceptance Criteria:**
- [ ] Parses SSE stream correctly
- [ ] Handles heartbeat packets
- [ ] Handles parse errors gracefully
- [ ] Timeout after 2 minutes
- [ ] Properly releases reader lock

---

### Step 3: Fix Gap #3 - Update BuilderStore

**File:** `cloudflare/portal/src/lib/stores/builder.svelte.ts`

```typescript
import { streamAGUIPackets } from '../utils/agui-stream';
import { handleToolCalls } from '../features/builder/tool-handler';

export class BuilderStore {
  // ... existing state properties ...

  // NEW: Async generator for streaming
  async *generateStream(prompt: string): AsyncGenerator<AGUIPacket> {
    if (!this.session) {
      throw new Error('No active session');
    }

    this.isLoading = true;
    this.error = null;

    try {
      const packets = streamAGUIPackets(this.session.id, prompt);

      for await (const packet of packets) {
        // Update state based on packet type
        switch (packet.type) {
          case 'text':
            this.messages.push({
              type: 'message',
              role: 'assistant',
              content: packet.payload.content || '',
            });
            break;

          case 'tool_use':
            this.activeToolCalls.push({
              type: 'tool_call',
              tool_name: packet.payload.toolName || '',
              args: packet.payload.toolInput || {},
              call_id: packet.id,
            });
            // Auto-execute tool
            await handleToolCalls();
            break;

          case 'tool_result':
            // Remove from active, add to messages
            this.activeToolCalls = this.activeToolCalls.filter(
              c => c.call_id !== packet.id
            );
            this.messages.push({
              type: 'message',
              role: 'assistant',
              content: `Tool result: ${JSON.stringify(packet.payload.toolOutput)}`,
            });
            break;

          case 'state_sync':
            Object.assign(this.applicationState, packet.payload.state || {});
            break;

          case 'error':
            this.error = packet.payload.error || 'Unknown error';
            this.session!.status = 'failed';
            break;

          case 'stream_end':
            this.session!.status = 'completed';
            break;

          case 'heartbeat':
            // Ignore heartbeat
            break;
        }

        yield packet;
      }
    } catch (err: any) {
      this.error = err.message || 'Stream failed';
      this.session!.status = 'failed';
      console.error('[BuilderStore] Stream error:', err);
    } finally {
      this.isLoading = false;
    }
  }

  // Keep old method for backward compatibility
  async generate(prompt: string): Promise<BuilderResult> {
    // Fallback to non-streaming API
    const data = await builder.generate(this.session!.id, prompt);
    this.result = data.result;
    return data.result;
  }
}
```

**Acceptance Criteria:**
- [ ] `generateStream()` returns AsyncGenerator<AGUIPacket>
- [ ] Handles all packet types
- [ ] Old `generate()` method preserved
- [ ] Error handling complete
- [ ] Loading state managed correctly

---

### Step 4: Fix Gap #4 - Install CopilotKit

**File:** `cloudflare/portal/package.json`

```json
{
  "dependencies": {
    "@copilotkit/sdk": "^latest"
  }
}
```

**Install Command:**
```bash
cd cloudflare/portal
npm install @copilotkit/sdk
```

**Usage in Svelte:**
```typescript
// src/lib/utils/copilotkit.ts
import { CopilotKit } from '@copilotkit/sdk';

export const copilotKit = new CopilotKit({
  endpoint: `${API_BASE_URL}/api/agent/chat`,
});
```

**Acceptance Criteria:**
- [ ] Package installed without errors
- [ ] TypeScript types available
- [ ] No React dependency added
- [ ] Bundle size increase < 20KB

---

### Step 5: Fix Gap #5 - Dynamic Tool Registration

**File:** `cloudflare/portal/src/lib/features/builder/tool-handler.ts`

```typescript
// Add dynamic tool loading
export async function loadToolsFromBackend(): Promise<void> {
  try {
    const tools = await builder.listTools();
    
    for (const tool of tools) {
      registerTool(tool.name, async (args) => {
        // Execute tool via backend
        const result = await executeRemoteTool(tool.name, args);
        return result;
      });
    }
    
    console.log(`[ToolHandler] Loaded ${tools.length} tools from backend`);
  } catch (err) {
    console.error('[ToolHandler] Failed to load tools:', err);
  }
}

async function executeRemoteTool(toolName: string, args: any): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/agent/tools/${toolName}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  
  if (!response.ok) {
    throw new Error(`Tool execution failed: ${response.statusText}`);
  }
  
  return response.json();
}
```

**Acceptance Criteria:**
- [ ] Tools loaded from `/api/agent/tools`
- [ ] Remote execution via backend
- [ ] Error handling complete
- [ ] Tools cached for session

---

### Step 6: Update API Client

**File:** `cloudflare/portal/src/lib/api.ts`

```typescript
import { streamAGUIPackets } from '../utils/agui-stream';

export const builder = {
  // Existing methods...
  createSession: (payload: any) => 
    apiFetch<any>('/api/builder/sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  
  loadSession: (sessionId: string) => 
    apiFetch<any>(`/api/builder/sessions/${sessionId}`),
  
  // NEW: Streaming method
  streamGenerate: (sessionId: string, prompt: string) => {
    return streamAGUIPackets(sessionId, prompt);
  },
  
  // NEW: Tool discovery
  listTools: () => 
    apiFetch<any[]>('/api/agent/tools'),
  
  // NEW: Tool execution
  executeTool: (toolName: string, args: any) =>
    apiFetch<any>(`/api/agent/tools/${toolName}/execute`, {
      method: 'POST',
      body: JSON.stringify(args),
    }),
};
```

---

### Step 7: Create Chat UI Component

**File:** `cloudflare/portal/src/lib/components/builder/BuilderChat.svelte`

```svelte
<script lang="ts">
  import { builderStore } from '$lib/stores/builder.svelte';
  import { onMount } from 'svelte';

  let input = '';
  let chatContainer: HTMLElement;

  // Auto-scroll to bottom
  $: if ($builderStore.messages.length && chatContainer) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  async function handleSubmit() {
    if (!input.trim() || $builderStore.isLoading) return;

    const prompt = input.trim();
    input = '';

    // Consume streaming packets
    try {
      for await (const packet of $builderStore.generateStream(prompt)) {
        console.log('[BuilderChat] Packet:', packet.type);
        // State updates handled by BuilderStore reactivity
      }
    } catch (err: any) {
      console.error('[BuilderChat] Error:', err);
    }
  }

  onMount(() => {
    // Load tools from backend on mount
    // loadToolsFromBackend();
  });
</script>

<div class="chat-container">
  <div class="messages" bind:this={chatContainer}>
    {#each $builderStore.messages as msg}
      <div class="message {msg.role}">
        <div class="content">{msg.content}</div>
      </div>
    {/each}

    {#if $builderStore.isLoading}
      <div class="typing-indicator">Agent is thinking...</div>
    {/if}
  </div>

  <form on:submit|preventDefault={handleSubmit} class="input-area">
    <input 
      bind:value={input} 
      placeholder="Describe the app you want to build..." 
      disabled={$builderStore.isLoading}
      class="chat-input"
    />
    <button 
      type="submit" 
      disabled={$builderStore.isLoading || !input.trim()}
      class="send-button"
    >
      Send
    </button>
  </form>
</div>

<style>
  .chat-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
  }

  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  .message {
    margin-bottom: 1rem;
    padding: 0.75rem;
    border-radius: 0.5rem;
  }

  .message.user {
    background: #3b82f6;
    color: white;
    margin-left: 2rem;
  }

  .message.assistant {
    background: #f1f5f9;
    color: #1e293b;
    margin-right: 2rem;
  }

  .content {
    white-space: pre-wrap;
    word-break: break-word;
  }

  .typing-indicator {
    text-align: center;
    color: #64748b;
    font-style: italic;
    padding: 0.5rem;
  }

  .input-area {
    display: flex;
    gap: 0.5rem;
    padding: 1rem;
    border-top: 1px solid #e2e8f0;
  }

  .chat-input {
    flex: 1;
    padding: 0.5rem 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }

  .send-button {
    padding: 0.5rem 1.5rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-weight: 500;
    cursor: pointer;
  }

  .send-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
```

---

### Step 8: Create Tool Panel Component

**File:** `cloudflare/portal/src/lib/components/agents/AgentToolPanel.svelte`

```svelte
<script lang="ts">
  import { builderStore } from '$lib/stores/builder.svelte';

  $: activeToolCalls = $builderStore.activeToolCalls;
  $: completedToolCalls = $builderStore.messages.filter(m => 
    m.content.startsWith('Tool result:')
  );
</script>

<div class="tool-panel">
  <h3>Agent Tools</h3>

  {#if activeToolCalls.length === 0 && completedToolCalls.length === 0}
    <p class="empty-state">No tools executed yet</p>
  {/if}

  <div class="tool-list">
    {#each activeToolCalls as toolCall (toolCall.call_id)}
      <div class="tool-item running">
        <span class="tool-icon">🔄</span>
        <span class="tool-name">{toolCall.tool_name}</span>
        <span class="tool-status">Running...</span>
      </div>
    {/each}

    {#each completedToolCalls as msg}
      {@const toolName = extractToolName(msg.content)}
      <div class="tool-item completed">
        <span class="tool-icon">✅</span>
        <span class="tool-name">{toolName}</span>
        <span class="tool-status">Done</span>
      </div>
    {/each}
  </div>
</div>

{#if activeToolCalls.length > 0}
  <div class="active-tools">
    <h4>Currently Running</h4>
    {#each activeToolCalls as toolCall}
      <div class="active-tool">
        <span class="spinner"></span>
        <span>{toolCall.tool_name}</span>
      </div>
    {/each}
  </div>
{/if}

<style>
  .tool-panel {
    padding: 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    background: #f8fafc;
  }

  .tool-panel h3 {
    margin: 0 0 1rem 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #475569;
  }

  .empty-state {
    color: #94a3b8;
    font-size: 0.875rem;
    text-align: center;
    padding: 2rem;
  }

  .tool-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .tool-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background: white;
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }

  .tool-item.running {
    border-left: 3px solid #f59e0b;
  }

  .tool-item.completed {
    border-left: 3px solid #10b981;
  }

  .tool-icon {
    font-size: 1rem;
  }

  .tool-name {
    flex: 1;
    font-weight: 500;
  }

  .tool-status {
    font-size: 0.75rem;
    color: #64748b;
  }
</style>

{#if activeToolCalls.length > 0}
  <div class="active-tools">
    <h4>Currently Running</h4>
    {#each activeToolCalls as toolCall}
      <div class="active-tool">
        <span class="spinner"></span>
        <span>{toolCall.tool_name}</span>
      </div>
    {/each}
  </div>
{/if}

<script lang="ts">
  // ... (same as above)
</script>
```

---

## خروجی قابل مشاهده

پس از تکمیل این تسک:
1. همگی ۵ gap بین فرانت‌اند و بک‌اند بسته شوند
2. Streaming از backend به frontend کار می‌کند
3. Chat UI با agent تعامل real-time دارد
4. Tool calls و results نمایش داده می‌شوند
5. AG-UI Protocol کاملاً sync است

---

## معیارهای موفقیت

| Metric | Target |
|--------|--------|
| AG-UI type coverage | 100% (7/7 types) |
| Streaming latency | < 100ms per packet |
| Bundle size increase | < 20KB |
| TypeScript errors | 0 |
| Test coverage | > 80% |

---

## Testing

### Unit Tests
```typescript
// src/lib/utils/agui-stream.test.ts
describe('agui-stream', () => {
  it('should parse SSE stream correctly', async () => {});
  it('should handle heartbeat packets', async () => {});
  it('should handle parse errors gracefully', async () => {});
});

// src/lib/stores/builder.svelte.test.ts
describe('BuilderStore', () => {
  it('should stream packets via generateStream()', async () => {});
  it('should handle tool_use packets', async () => {});
  it('should handle error packets', async () => {});
});
```

### Integration Tests
```typescript
// tests/e2e/copilotkit-flow.spec.ts
describe('CopilotKit Integration', () => {
  it('should complete full agentic loop', async () => {
    // 1. Create session
    // 2. Send prompt
    // 3. Receive streaming packets
    // 4. Execute tools
    // 5. Display results
  });
});
```

---

## مراحل بعدی

پس از تکمیل TASK 17_04:
1. TASK 17_05: Ensure AG-UI Protocol fully aligned
2. TASK 17_06: Integration testing
3. TASK 17_03: Agentic loop polish
4. Staging deployment