# TASK 19_07: Tool Testing & Documentation

## هدف
نوشتن تست‌های جامع برای تمام toolهای wrapped و مستندسازی کامل.

## فایل‌های مورد نیاز
- `cloudflare/platform-api/tests/tools/ai-tool.test.ts` (CREATE)
- `cloudflare/platform-api/tests/tools/github-tool.test.ts` (CREATE)
- `cloudflare/platform-api/tests/tools/cloudflare-tool.test.ts` (CREATE)
- `cloudflare/platform-api/tests/tools/browser-tool.test.ts` (CREATE)
- `cloudflare/platform-api/tests/tools/tool-registry.test.ts` (CREATE)
- `cloudflare/platform-api/docs/TOOLS.md` (CREATE)

## پیاده‌سازی

### Step 1: Create ai-tool.test.ts

```typescript
// cloudflare/platform-api/tests/tools/ai-tool.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AITool } from '../../src/agents/tools/AITool';
import { ToolContext } from '../../src/agents/tools/types';

describe('AITool', () => {
  let aiTool: AITool;
  let mockProvider: any;
  let context: ToolContext;
  
  beforeEach(() => {
    mockProvider = {
      generate: vi.fn()
    };
    
    aiTool = new AITool(mockProvider);
    context = {
      tenantId: '1',
      userId: '1',
      requestId: '123'
    };
  });
  
  it('should generate code from prompt', async () => {
    mockProvider.generate.mockResolvedValue({
      text: 'Generated code',
      model: 'gpt-4',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      finishReason: 'stop'
    });
    
    const result = await aiTool.execute({
      prompt: 'Create a counter',
      model: 'gpt-4'
    }, context);
    
    expect(result.success).toBe(true);
    expect(result.data.content).toBe('Generated code');
    expect(result.data.usage.totalTokens).toBe(30);
  });
  
  it('should timeout after 30s', async () => {
    mockProvider.generate.mockImplementation(() => 
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 30001))
    );
    
    const result = await aiTool.execute({
      prompt: 'Create a counter'
    }, context);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('timeout');
  });
  
  it('should retry on transient errors', async () => {
    mockProvider.generate
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Rate limit'))
      .mockResolvedValue({
        text: 'Generated code',
        model: 'gpt-4',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
      });
    
    const result = await aiTool.execute({
      prompt: 'Create a counter'
    }, context);
    
    expect(result.success).toBe(true);
    expect(result.metadata.attempts).toBe(3);
  });
  
  it('should validate parameters', async () => {
    const result = await aiTool.execute({
      prompt: '' // Invalid: empty string
    }, context);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('validation');
  });
  
  it('should handle API errors gracefully', async () => {
    mockProvider.generate.mockRejectedValue(new Error('API error'));
    
    const result = await aiTool.execute({
      prompt: 'Create a counter'
    }, context);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('API error');
  });
});
```

### Step 2: Create github-tool.test.ts

```typescript
// cloudflare/platform-api/tests/tools/github-tool.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitHubTool } from '../../src/agents/tools/GitHubTool';
import { ToolContext } from '../../src/agents/tools/types';

describe('GitHubTool', () => {
  let githubTool: GitHubTool;
  let context: ToolContext;
  
  beforeEach(() => {
    githubTool = new GitHubTool('mock-token');
    context = {
      tenantId: '1',
      userId: '1',
      requestId: '123'
    };
  });
  
  it('should create branch', async () => {
    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        ref: 'refs/heads/feature/test',
        object: { sha: 'abc123' }
      })
    }) as any;
    
    const result = await githubTool.execute({
      operation: 'create_branch',
      owner: 'test',
      repo: 'repo',
      branchName: 'feature/test'
    }, context);
    
    expect(result.success).toBe(true);
    expect(result.data.ref).toContain('feature/test');
  });
  
  it('should commit file', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        sha: 'def456',
        html_url: 'https://github.com/test/repo/blob/main/file.ts'
      })
    }) as any;
    
    const result = await githubTool.execute({
      operation: 'commit_file',
      owner: 'test',
      repo: 'repo',
      path: 'file.ts',
      content: 'console.log("test")',
      message: 'Add file',
      branchName: 'main'
    }, context);
    
    expect(result.success).toBe(true);
    expect(result.url).toContain('file.ts');
  });
  
  it('should handle auth errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Bad credentials')
    }) as any;
    
    const result = await githubTool.execute({
      operation: 'create_branch',
      owner: 'test',
      repo: 'repo',
      branchName: 'feature/test'
    }, context);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('authentication');
  });
});
```

### Step 3: Create tool-registry.test.ts

```typescript
// cloudflare/platform-api/tests/tools/tool-registry.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { ToolRegistry } from '../../src/agents/tools/ToolRegistry';
import { BaseTool } from '../../src/agents/tools/BaseTool';
import { z } from 'zod';

describe('ToolRegistry', () => {
  beforeEach(() => {
    ToolRegistry.getInstance().clear();
  });
  
  it('should register and retrieve tools', () => {
    const tool = new MockTool();
    ToolRegistry.getInstance().register(tool);
    
    const retrieved = ToolRegistry.getInstance().get('mock');
    expect(retrieved).toBe(tool);
  });
  
  it('should list all tools', () => {
    const tool1 = new MockTool('tool1');
    const tool2 = new MockTool('tool2');
    
    ToolRegistry.getInstance().register(tool1);
    ToolRegistry.getInstance().register(tool2);
    
    const tools = ToolRegistry.getInstance().list();
    expect(tools).toHaveLength(2);
  });
  
  it('should check if tool exists', () => {
    const tool = new MockTool();
    ToolRegistry.getInstance().register(tool);
    
    expect(ToolRegistry.getInstance().has('mock')).toBe(true);
    expect(ToolRegistry.getInstance().has('nonexistent')).toBe(false);
  });
});

class MockTool extends BaseTool {
  name = 'mock';
  description = 'Mock tool for testing';
  parameters = z.object({});
  returns = z.object({});
  
  protected doExecute(params: any, context: any): Promise<any> {
    return Promise.resolve({});
  }
}
```

### Step 4: Create TOOLS.md documentation

```markdown
# Agent Tools Documentation

## Overview

The platform provides 4 main tools for AI agents:

1. **ai_generate** - Generate code/text using AI
2. **github_operations** - GitHub API operations
3. **cloudflare_operations** - Cloudflare deployment operations
4. **browser_automation** - Browser control and automation

---

## Tool: ai_generate

Generate code, text, or analysis using AI models.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| prompt | string | Yes | The prompt for AI generation (max 10000 chars) |
| model | enum | No | AI model: gpt-4, gpt-3.5-turbo, claude-3, llama-2 |
| temperature | number | No | Randomness (0-1), default 0.7 |
| maxTokens | number | No | Max tokens to generate (1-8000), default 2000 |
| stream | boolean | No | Enable streaming, default false |

### Returns

| Field | Type | Description |
|-------|------|-------------|
| content | string | Generated content |
| model | string | Model used |
| usage.promptTokens | number | Input tokens used |
| usage.completionTokens | number | Output tokens used |
| usage.totalTokens | number | Total tokens |
| finishReason | string | stop, length, or content_filter |

### Example

```typescript
const result = await registry.get('ai_generate')?.execute(
  {
    prompt: 'Create a React counter component',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 1000
  },
  { tenantId: '1', userId: '1', requestId: '123' }
);
```

---

## Tool: github_operations

Perform GitHub operations.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| operation | enum | Yes | create_branch, commit_file, create_pr, get_file, list_prs |
| owner | string | Yes | Repository owner |
| repo | string | Yes | Repository name |
| branchName | string | No | Branch name (for create_branch) |
| path | string | No | File path (for commit_file, get_file) |
| content | string | No | File content (for commit_file) |
| message | string | No | Commit message (for commit_file) |
| baseBranch | string | No | Base branch for PR |
| prTitle | string | No | Pull request title |
| prBody | string | No | Pull request body |

### Returns

| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Operation success status |
| data | any | Operation result |
| url | string | URL of created resource |
| message | string | Human-readable message |

---

## Tool: cloudflare_operations

Perform Cloudflare operations.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| operation | enum | Yes | deploy, get_worker, list_workers, delete_worker, get_logs |
| scriptName | string | Yes | Worker script name |
| wasmModule | string | No | Worker code (base64 encoded) |
| metadata | object | No | Worker metadata |
| hours | number | No | Hours of logs to fetch (default 1) |

---

## Tool: browser_automation

Control browser.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| operation | enum | Yes | navigate, screenshot, click, fill, get_content, evaluate |
| url | string | Yes | Target URL |
| selector | string | No | CSS selector (for click, fill) |
| value | string | No | Value to fill |
| script | string | No | JavaScript to execute |
| fullPage | boolean | No | Full page screenshot |
| selectorForScreenshot | string | No | Screenshot specific element |

---

## Error Handling

All tools return structured errors:

```typescript
{
  success: false,
  error: "Error message",
  metadata: {
    duration: 1500,
    attempts: 3,
    cached: false,
    timestamp: 1234567890
  }
}
```

### Retry Behavior

- Transient errors (network, rate limit, timeout) → Retry with exponential backoff
- Permanent errors (auth, validation, not found) → No retry
- Max attempts: 3 for most tools, 2 for browser

### Circuit Breaker

Tools automatically open circuit breaker after 5 consecutive failures.
Breaker resets after 1 minute.

---

## Timeouts

| Tool | Timeout | Retries |
|------|---------|---------|
| ai_generate | 30s | 3 |
| github_operations | 15s | 3 |
| cloudflare_operations | 20s | 3 |
| browser_automation | 10s | 2 |

---

## Best Practices

1. Always check `success` field in result
2. Handle errors gracefully
3. Use appropriate timeouts for operations
4. Don't retry on validation errors
5. Monitor tool usage via metadata
```

## خروجی قابل مشاهده
- تست‌های جامع برای تمام toolها
- Coverage حداقل 80%
- مستندات کامل TOOLS.md
- مثال‌های استفاده

## معیارهای موفقیت
- [ ] تمام تست‌ها پاس می‌شوند
- [ ] Test coverage > 80%
- [ ] TOOLS.md کامل است
- [ ] مثال‌های کد قابل اجرا
- [ ] Error handling documented