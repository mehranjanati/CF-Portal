# TASK 18_02: BuilderStore Streaming Support

## هدف
به‌روزرسانی BuilderStore برای مصرف streaming packets از backend.

## فایل‌های مورد نیاز
- `cloudflare/portal/src/lib/stores/builder.svelte.ts` (UPDATE)

## پیاده‌سازی

### Step 1: Add generateStream() method

```typescript
// In builder.svelte.ts store

import { streamAGUIPackets } from '$lib/utils/agui-stream';

async *generateStream(prompt: string): AsyncGenerator<AGUIPacket> {
  if (!this.session) {
    throw new Error('No active session');
  }

  this.isLoading = true;
  this.error = null;

  try {
    const packets = streamAGUIPackets(this.session.id, prompt);

    for await (const packet of packets) {
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
            status: 'running',
          });
          break;

        case 'tool_result':
          // Move from active to completed
          const toolCall = this.activeToolCalls.find(
            c => c.call_id === packet.id
          );
          if (toolCall) {
            toolCall.status = 'completed';
            toolCall.result = packet.payload.toolOutput;
            this.completedToolCalls.push(toolCall);
            this.activeToolCalls = this.activeToolCalls.filter(
              c => c.call_id !== packet.id
            );
          }
          
          // Add result as message
          this.messages.push({
            type: 'message',
            role: 'assistant',
            content: `Tool result: ${JSON.stringify(packet.payload.toolOutput)}`,
          });
          break;

        case 'state_sync':
          // Update application state
          if (packet.payload.state) {
            this.applicationState = {
              ...this.applicationState,
              ...packet.payload.state
            };
          }
          
          // Update phase if provided
          if (packet.payload.status) {
            this.phase = packet.payload.status;
          }
          
          // Update iteration if provided
          if (packet.payload.iteration) {
            this.iteration = packet.payload.iteration;
          }
          break;

        case 'error':
          this.error = packet.payload.error || 'Unknown error';
          this.session.status = 'failed';
          break;

        case 'stream_end':
          this.session.status = 'completed';
          this.isLoading = false;
          break;

        case 'heartbeat':
          // Ignore heartbeat
          break;
      }

      yield packet;
    }
  } catch (err: any) {
    this.error = err.message || 'Stream failed';
    this.session.status = 'failed';
    console.error('[BuilderStore] Stream error:', err);
  } finally {
    this.isLoading = false;
  }
}
```

### Step 2: Keep old generate() for backward compatibility

```typescript
// Keep existing generate() method for non-streaming API
async generate(prompt: string): Promise<any> {
  // Existing implementation
}
```

## خروجی قابل مشاهده
- متد `generateStream()` اضافه می‌شود
- Store به صورت reactive برای هر packet update می‌شود
- Tool calls خودکار مدیریت می‌شوند
- State sync پیاده می‌شود

## معیارهای موفقیت
- [ ] متد بدون خطا compile می‌شود
- [ ] تمام packet types مدیریت می‌شوند
- [ ] State به صورت reactive update می‌شود
- [ ] Error handling کامل است