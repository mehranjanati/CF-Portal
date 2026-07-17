# TASK 18_01: Streaming Infrastructure

## هدف
ایجاد زیرساخت SSE streaming برای ارتباط real-time بین backend و frontend.

## فایل‌های مورد نیاز
- `cloudflare/portal/src/lib/utils/agui-stream.ts` (CREATE)
- `cloudflare/portal/src/lib/utils/agui-parser.ts` (UPDATE if exists)

## پیاده‌سازی

### Step 1: Create agui-stream.ts

```typescript
// cloudflare/portal/src/lib/utils/agui-stream.ts

export interface AGUIPacket {
  type: string;
  id: string;
  timestamp: number;
  payload: any;
  metadata: {
    sessionId: string;
    iteration: number;
  };
}

export async function* streamAGUIPackets(
  sessionId: string,
  prompt: string
): AsyncGenerator<AGUIPacket> {
  const response = await fetch(
    `${API_BASE_URL}/api/builder/sessions/${sessionId}/stream`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: AbortSignal.timeout(120000), // 2 minute timeout
    }
  );

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
        
        if (data === '[DONE]') {
          return;
        }
        
        if (data === '[HEARTBEAT]') {
          continue;
        }

        try {
          const packet: AGUIPacket = JSON.parse(data);
          yield packet;
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

## خروجی قابل مشاهده
- تابع `streamAGUIPackets()` ایجاد می‌شود
- می‌تواند AG-UI packets را از SSE stream取得 کند
- Heartbeat و stream end مدیریت می‌شوند
- خطاهای parse نادیده گرفته می‌شوند

## معیارهای موفقیت
- [ ] تابع بدون خطا compile می‌شود
- [ ] SSE packets به درستی parse می‌شوند
- [ ] Timeout بعد از 2 دقیقه اجرا می‌شود
- [ ] Reader lock به درستی آزاد می‌شود