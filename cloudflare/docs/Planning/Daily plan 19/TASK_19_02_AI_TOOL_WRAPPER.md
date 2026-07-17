# TASK 19_02: AI Tool Wrapper

## هدف
Wrap کردن AI Gateway tool برای استفاده در CopilotKit agents.

## فایل‌های مورد نیاز
- `cloudflare/platform-api/src/agents/tools/AITool.ts` (CREATE)
- `cloudflare/platform-api/src/agents/tools/AIProvider.ts` (UPDATE - exists)

## پیاده‌سازی

### Step 1: Create AITool.ts

```typescript
// cloudflare/platform-api/src/agents/tools/AITool.ts

import { BaseTool } from './BaseTool';
import { ToolContext, ToolResult } from './types';
import { z } from 'zod';

export class AITool extends BaseTool {
  name = 'ai_generate';
  description = 'Generate code, text, or analysis using AI models';
  
  parameters = z.object({
    prompt: z.string().min(1).max(10000).describe('The prompt for AI generation'),
    model: z.enum(['gpt-4', 'gpt-3.5-turbo', 'claude-3', 'llama-2']).optional()
      .describe('AI model to use'),
    temperature: z.number().min(0).max(1).optional()
      .describe('Randomness of output (0-1)'),
    maxTokens: z.number().min(1).max(8000).optional()
      .describe('Maximum tokens to generate'),
    stream: z.boolean().optional().default(false)
      .describe('Enable streaming response')
  });
  
  returns = z.object({
    content: z.string().describe('Generated content'),
    model: z.string().describe('Model used'),
    usage: z.object({
      promptTokens: z.number(),
      completionTokens: z.number(),
      totalTokens: z.number()
    }),
    finishReason: z.enum(['stop', 'length', 'content_filter']).optional()
  });
  
  constructor(private aiProvider: any) {
    super();
    this.timeout = 30000; // 30s for AI generation
    this.retries = 3;
  }
  
  protected async doExecute(params: any, context: ToolContext): Promise<any> {
    try {
      const result = await this.aiProvider.generate({
        prompt: params.prompt,
        model: params.model || 'gpt-4',
        temperature: params.temperature || 0.7,
        maxTokens: params.maxTokens || 2000,
        stream: params.stream || false
      });
      
      return {
        content: result.text,
        model: result.model,
        usage: {
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens
        },
        finishReason: result.finishReason
      };
      
    } catch (error: any) {
      // Handle specific AI provider errors
      if (error.message?.includes('rate limit')) {
        throw this.retryable('AI rate limit exceeded', 60000);
      }
      
      if (error.message?.includes('context length')) {
        // Don't retry - prompt too long
        throw new Error('Prompt too long for model context');
      }
      
      if (error.message?.includes('content filter')) {
        // Don't retry - content policy violation
        throw new Error('Content filtered by AI safety policies');
      }
      
      // Retry on other errors
      throw this.retryable(error.message);
    }
  }
  
  // Helper to check if tool can handle prompt length
  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}
```

### Step 2: Update AIProvider (if exists)

```typescript
// Ensure AIGatewayProvider or mock provider has generate() method

interface AIProvider {
  generate(params: {
    prompt: string;
    model: string;
    temperature: number;
    maxTokens: number;
    stream?: boolean;
  }): Promise<{
    text: string;
    model: string;
    usage: { promptTokens: number; completionTokens: number; totalTokens: number };
    finishReason?: string;
  }>;
}
```

### Step 3: Registration Example

```typescript
// In platform-api initialization

import { ToolRegistry } from './agents/tools/ToolRegistry';
import { AITool } from './agents/tools/AITool';
import { AIGatewayProvider } from './modules/builder/providers/ai-gateway';

// Initialize AI provider
const aiProvider = new AIGatewayProvider(env);

// Create and register AI tool
const aiTool = new AITool(aiProvider);
ToolRegistry.getInstance().register(aiTool);

// Now agents can use 'ai_generate' tool
```

### Step 4: Usage in Agent

```typescript
// In agent execution code

const registry = ToolRegistry.getInstance();
const aiTool = registry.get('ai_generate');

// Execute tool
const result = await aiTool?.execute(
  {
    prompt: 'Create a React counter component',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 1000
  },
  {
    tenantId: '123',
    userId: '456',
    requestId: '789'
  }
);

if (result?.success) {
  console.log('Generated code:', result.data.content);
}
```

## خروجی قابل مشاهده
- AITool کلاس ایجاد می‌شود
- Wrap around AI Gateway provider
- Parameter validation با Zod
- Timeout/retry logic پیاده شده
- Error handling for specific AI errors

## معیارهای موفقیت
- [ ] AITool compile می‌شود
- [ ] AI generation works via tool
- [ ] Timeout enforced (30s)
- [ ] Retries on rate limit
- [ ] Token usage tracked
- [ ] Errors handled gracefully