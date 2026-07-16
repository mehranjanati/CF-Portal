# TASK 13-02: AIGatewayProvider Implementation

## Objective
Create a new `AIGatewayProvider` class that makes real HTTP calls to Cloudflare AI Gateway, replacing the hardcoded mock in `CFAIProvider`. This provider will handle real LLM interactions with proper streaming, tool calling, and error handling.

## File to Create
`platform-api/src/modules/builder/providers/ai-gateway.ts`

## Design

### Class Structure
```typescript
export class AIGatewayProvider implements ProviderAdapter {
  name = 'ai-gateway';
  
  constructor(
    private gatewayUrl: string,
    private gatewayToken: string,
    private primaryModel: string,
    private fallbackModel: string
  ) {}

  async generate(
    prompt: string,
    context?: any,
    onEvent?: (event: ProviderEvent) => Promise<void>
  ): Promise<ProviderGenerateResult> {
    // 1. Build system prompt with code generation context
    // 2. Call AI Gateway with streaming
    // 3. Parse SSE stream for thoughts, tool calls, and final response
    // 4. Handle tool execution loop
    // 5. Return structured result
  }
}
```

### System Prompt Design
The system prompt must guide the LLM to produce structured JSON output for SvelteKit code generation:

```typescript
const SYSTEM_PROMPT = `You are an expert SvelteKit web developer and UI architect.

Your task is to generate high-quality, production-ready SvelteKit code based on the user's intent.

RULES:
1. Generate complete, working code files
2. Use Svelte 5 runes syntax ($state, $derived, $effect)
3. Use Tailwind CSS for styling
4. Follow SvelteKit file-based routing conventions
5. All components must be self-contained

You have access to tools. Use them when you need information.
When you have enough information, provide your final response as a valid JSON object.

OUTPUT FORMAT (must be valid JSON):
{
  "summary": "Brief description of what was generated",
  "files": [
    {
      "path": "src/routes/+page.svelte",
      "action": "create" | "update" | "delete",
      "content": "Complete file content here"
    }
  ],
  "nextActions": ["Deploy to Cloudflare Pages"]
}`;
```

### Tool Definitions for Function Calling
Define tools that the model can call:

```typescript
const TOOLS = [
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List files in the current project directory",
      parameters: {
        type: "object",
        properties: {
          directory: { type: "string", description: "Directory path to list" }
        },
        required: ["directory"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the contents of a file",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path to read" }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Write content to a file",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path to write" },
          content: { type: "string", description: "File content" }
        },
        required: ["path", "content"]
      }
    }
  }
];
```

### Streaming Implementation

```typescript
private async streamChatCompletion(
  messages: Array<{role: string, content: string}>,
  onEvent?: (event: ProviderEvent) => Promise<void>
): Promise<any> {
  const url = `${this.gatewayUrl}/openai/chat/completions`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${this.gatewayToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: this.primaryModel,
      messages,
      tools: TOOLS,
      temperature: 0.2,
      max_tokens: 4096,
      stream: true,
    }),
  });

  if (!response.ok) {
    // Fallback to Workers AI
    return this.fallbackToWorkersAI(messages, onEvent);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');
  
  return this.parseSSEStream(reader, onEvent);
}
```

### SSE Stream Parser
Parse the streaming response to extract thoughts, tool calls, and final content:

```typescript
private async parseSSEStream(
  reader: ReadableStreamDefaultReader,
  onEvent?: (event: ProviderEvent) => Promise<void>
): Promise<ProviderGenerateResult> {
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulatedContent = '';
  let toolCalls: ToolCall[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;
      
      try {
        const chunk = JSON.parse(data);
        const delta = chunk.choices?.[0]?.delta;
        
        if (delta?.content) {
          accumulatedContent += delta.content;
          // Emit thought for streaming UI
          if (onEvent) {
            await onEvent({ type: 'thought', data: delta.content });
          }
        }
        
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            toolCalls.push({
              id: tc.id,
              name: tc.function?.name || '',
              arguments: tc.function?.arguments || '',
            });
          }
        }
      } catch (e) {
        // Skip malformed chunks
      }
    }
  }

  // Parse accumulated content as JSON if it's a final response
  try {
    const finalJson = JSON.parse(accumulatedContent);
    return {
      type: 'final',
      summary: finalJson.summary,
      files: finalJson.files,
      nextActions: finalJson.nextActions,
    };
  } catch {
    // If not JSON, return as tool calls
    return {
      type: 'tool_calls',
      tool_calls: toolCalls,
    };
  }
}
```

### Fallback Logic
When the primary model fails, fall back to Workers AI:

```typescript
private async fallbackToWorkersAI(
  messages: Array<{role: string, content: string}>,
  onEvent?: (event: ProviderEvent) => Promise<void>
): Promise<ProviderGenerateResult> {
  console.log('[AIGatewayProvider] Falling back to Workers AI');
  
  if (onEvent) {
    await onEvent({ type: 'thought', data: 'Primary model unavailable. Falling back to Workers AI...' });
  }
  
  // Call Workers AI directly as fallback
  const fallbackUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${this.fallbackModel}`;
  const response = await fetch(fallbackUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${this.gatewayToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      stream: true,
    }),
  });

  // ... parse response similarly
}
```

## Acceptance Criteria
- [ ] Provider makes real HTTP calls to AI Gateway
- [ ] SSE streaming works for real-time updates
- [ ] Tool calling works (model can list/read/write files)
- [ ] Fallback to Workers AI works when primary fails
- [ ] Returns structured JSON with summary, files, nextActions
- [ ] Errors are caught and reported through onEvent
- [ ] All ProviderAdapter interface methods implemented

## Testing
- Unit test with mocked fetch responses
- Integration test with real Gateway (if credentials available)
- Verify that non-hardcoded, unique responses are returned for different prompts