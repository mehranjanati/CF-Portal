# TASK 17_05: AG-UI Protocol Implementation

## هدف
پیاده‌سازی کامل AG-UI Protocol برای ارتباط استاندارد بین agent و client با پشتیبانی از streaming، state sync و tool calls.

## فایل‌های مورد نیاز
- `cloudflare/platform-api/src/lib/features/builder/agui-packet-generator.ts` - به‌روزرسانی packet generator
- `cloudflare/platform-api/src/modules/builder/streamer.ts` - به‌روزرسانی streamer با AG-UI
- `cloudflare/platform-api/src/types/agui.ts` - به‌روزرسانی types

## ساختار AG-UI Protocol

### Packet Structure
```typescript
// types/agui.ts
export interface AGUIPacket {
  type: AGUIPacketType;
  id: string;
  timestamp: number;
  payload: AGUIPayload;
  metadata: AGUIMetadata;
}

export type AGUIPacketType = 
  | 'text'        // Plain text message
  | 'tool_use'    // Agent wants to use a tool
  | 'tool_result' // Tool execution result
  | 'error'       // Error occurred
  | 'state_sync'  // State synchronization
  | 'stream_end'  // Stream ended
  | 'heartbeat';  // Keep-alive

export interface AGUIPayload {
  content?: string;
  toolName?: string;
  toolInput?: Record<string, any>;
  toolOutput?: any;
  error?: string;
  state?: Record<string, any>;
  progress?: number; // 0-100
}

export interface AGUIMetadata {
  sessionId: string;
  agentId: string;
  iteration: number;
  parentId?: string; // For nested operations
}

export interface AGUIState {
  sessionId: string;
  messages: ChatMessage[];
  activeTools: string[];
  currentIteration: number;
  status: 'idle' | 'planning' | 'executing' | 'observing' | 'done' | 'error';
}
```

### Packet Generator
```typescript
// agui-packet-generator.ts
export class AGUIPacketGenerator {
  private counter = 0;
  
  generateId(): string {
    return `agui-${Date.now()}-${++this.counter}`;
  }
  
  createTextPacket(content: string, metadata: AGUIMetadata): AGUIPacket {
    return {
      type: 'text',
      id: this.generateId(),
      timestamp: Date.now(),
      payload: { content },
      metadata,
    };
  }
  
  createToolUsePacket(toolName: string, input: any, metadata: AGUIMetadata): AGUIPacket {
    return {
      type: 'tool_use',
      id: this.generateId(),
      timestamp: Date.now(),
      payload: { toolName, toolInput: input },
      metadata,
    };
  }
  
  createToolResultPacket(toolName: string, output: any, metadata: AGUIMetadata): AGUIPacket {
    return {
      type: 'tool_result',
      id: this.generateId(),
      timestamp: Date.now(),
      payload: { toolName, toolOutput: output },
      metadata,
    };
  }
  
  createErrorPacket(error: string, metadata: AGUIMetadata): AGUIPacket {
    return {
      type: 'error',
      id: this.generateId(),
      timestamp: Date.now(),
      payload: { error },
      metadata,
    };
  }
  
  createStateSyncPacket(state: Partial<AGUIState>, metadata: AGUIMetadata): AGUIPacket {
    return {
      type: 'state_sync',
      id: this.generateId(),
      timestamp: Date.now(),
      payload: { state },
      metadata,
    };
  }
}
```

### Streamer با AG-UI
```typescript
// streamer.ts - به‌روزرسانی
export class AGUIStreamer {
  private encoder = new TextEncoder();
  
  async streamPackets(
    packets: AsyncGenerator<AGUIPacket>,
    writable: WritableStream
  ): Promise<void> {
    const writer = writable.getWriter();
    
    try {
      for await (const packet of packets) {
        // Send as SSE event
        const sseData = `data: ${JSON.stringify(packet)}\n\n`;
        await writer.write(this.encoder.encode(sseData));
      }
    } finally {
      await writer.close();
    }
  }
  
  parseSSEStream(readable: ReadableStream): AsyncGenerator<AGUIPacket> {
    const reader = readable.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    return {
      [Symbol.asyncIterator]() {
        return this;
      },
      async next(): Promise<IteratorResult<AGUIPacket>> {
        while (true) {
          const { done, value } = await reader.read();
          if (done) return { done: true, value: undefined as any };
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              try {
                const packet = JSON.parse(data) as AGUIPacket;
                return { done: false, value: packet };
              } catch {}
            }
          }
        }
      },
    };
  }
}
```

## SSE Endpoint در routes.ts
```typescript
// POST /api/agent/stream - Chat with streaming response
app.post('/stream', async (c) => {
  const { message, sessionId } = await c.req.json();
  
  return new Response(
    new ReadableStream({
      async start(controller) {
        const agent = new CopilotKitAgent(c.env);
        const generator = agent.executeWithLoop(message, sessionId);
        
        for await (const packet of generator) {
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify(packet)}\n\n`)
          );
        }
        
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    }
  );
});
```

## خروجی قابل مشاهده
- AG-UI Protocol کاملاً type-safe پیاده‌سازی شده
- SSE streaming از backend به frontend کار می‌کند
- State sync خودکار در هر iteration
- Heartbeat برای keep-alive اتصال

## نکات فنی
- هر packet باید `id` یکتا داشته باشد (UUID یا timestamp+counter)
- حداکثر اندازه هر packet: 1MB
- Heartbeat هر ۱۵ ثانیه
- Timeout اتصال: ۵ دقیقه
- State sync در هر iteration ارسال شود
- خطاها با `error` packet به کلاینت اعلام شوند