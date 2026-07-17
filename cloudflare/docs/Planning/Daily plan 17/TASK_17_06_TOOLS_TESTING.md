# TASK 17_06: Tool Integration & Testing

## هدف
یکپارچه‌سازی ابزارهای موجود (AI, GitHub, Cloudflare, Browser) با CopilotKit agent و نوشتن تست‌های جامع برای کل سیستم.

## فایل‌های مورد نیاز
- `cloudflare/platform-api/src/agents/tools/ai-tool.ts` - به‌روزرسانی AI tool
- `cloudflare/platform-api/src/agents/tools/github-tool.ts` - به‌روزرسانی GitHub tool
- `cloudflare/platform-api/src/agents/tools/cloudflare-tool.ts` - به‌روزرسانی Cloudflare tool
- `cloudflare/platform-api/src/agents/tools/browser-tool.ts` - به‌روزرسانی Browser tool
- `cloudflare/platform-api/src/agents/tools/copilotkit-tools.ts` - wrapper برای CopilotKit
- تست‌ها برای هر tool و agent loop

## معماری Tool Wrapper

```
CopilotKit Tool Interface
        │
        ├── AIToolWrapper
        │     └── AITool (existing) → AI Gateway / Workers AI
        │
        ├── GitHubToolWrapper
        │     └── GitHubTool (existing) → GitHub API
        │
        ├── CloudflareToolWrapper
        │     └── CloudflareTool (existing) → Cloudflare API
        │
        └── BrowserToolWrapper
              └── BrowserTool (existing) → Browser Automation
```

## پیاده‌سازی ابزارها

### copilotkit-tools.ts - Tool Definitions
```typescript
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
  execute: (params: any) => Promise<any>;
}

export const aiTool: CopilotKitTool = {
  name: 'ai_generate',
  description: 'Generate code or text using AI models',
  parameters: {
    type: 'object',
    properties: {
      prompt: { type: 'string', description: 'The prompt for code/text generation' },
      language: { type: 'string', description: 'Target programming language' },
      model: { type: 'string', description: 'AI model to use (optional)' },
    },
    required: ['prompt'],
  },
  execute: async (params) => {
    // Call existing AITool
    const tool = new AITool();
    return tool.execute(params);
  },
};

export const gitHubTool: CopilotKitTool = {
  name: 'github_commit',
  description: 'Commit and push code to GitHub repository',
  parameters: {
    type: 'object',
    properties: {
      repo: { type: 'string', description: 'Repository name' },
      branch: { type: 'string', description: 'Branch name' },
      message: { type: 'string', description: 'Commit message' },
      files: { type: 'object', description: 'Files to commit {path: content}' },
    },
    required: ['repo', 'message', 'files'],
  },
  execute: async (params) => {
    const tool = new GitHubTool();
    return tool.execute(params);
  },
};

export const cloudflareTool: CopilotKitTool = {
  name: 'cloudflare_deploy',
  description: 'Deploy application to Cloudflare Workers',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Worker name' },
      code: { type: 'string', description: 'Worker code/content' },
      routes: { type: 'array', description: 'Route configurations' },
    },
    required: ['name', 'code'],
  },
  execute: async (params) => {
    const tool = new CloudflareTool();
    return tool.execute(params);
  },
};

export const browserTool: CopilotKitTool = {
  name: 'browser_preview',
  description: 'Preview generated application in browser',
  parameters: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'URL to preview' },
      screenshot: { type: 'boolean', description: 'Take screenshot?' },
    },
    required: ['url'],
  },
  execute: async (params) => {
    const tool = new BrowserTool();
    return tool.execute(params);
  },
};

export const allTools: CopilotKitTool[] = [
  aiTool,
  gitHubTool,
  cloudflareTool,
  browserTool,
];
```

### به‌روزرسانی ابزارهای موجود
هر ابزار باید:
1. ورودی را validate کند
2. عملیات را با timeout اجرا کند
3. خطاها را به صورت结构化 برگرداند
4. لاگ مناسب داشته باشد

## تست‌ها

### Unit Tests
```typescript
// tests/agents/copilotkit-agent.test.ts
describe('CopilotKitAgent', () => {
  it('should create execution plan for simple request', async () => {});
  it('should execute AI tool successfully', async () => {});
  it('should handle tool errors gracefully', async () => {});
  it('should stop after max iterations', async () => {});
  it('should store execution history in memory', async () => {});
});

// tests/agents/tools/ai-tool.test.ts
describe('AITool', () => {
  it('should generate code from prompt', async () => {});
  it('should handle empty prompt error', async () => {});
  it('should respect language parameter', async () => {});
});

// tests/agents/tools/github-tool.test.ts
describe('GitHubTool', () => {
  it('should commit files to repo', async () => {});
  it('should handle authentication errors', async () => {});
});

// tests/agents/agui-protocol.test.ts
describe('AGUIProtocol', () => {
  it('should generate valid packets', () => {});
  it('should parse SSE stream correctly', async () => {});
  it('should maintain packet order', () => {});
});
```

### Integration Tests
```typescript
// tests/agents/agentic-loop.test.ts
describe('Agentic Loop Integration', () => {
  it('full flow: generate code → commit → deploy', async () => {
    // 1. User sends request
    // 2. Agent plans execution
    // 3. AI generates code
    // 4. GitHub commits code
    // 5. Cloudflare deploys
    // 6. Browser previews
    // 7. Returns success
  }, 60000); // 60s timeout
});
```

## خروجی قابل مشاهده
- همه ۴ ابزار با CopilotKit interface کار می‌کنند
- تست‌های unit برای هر tool
- تست‌های integration برای agent loop
- پشتیبانی از timeout و error handling

## سناریوهای تست

### سناریوی ۱: تولید کد ساده
```
Input: "Create a React counter component"
→ AI tool generates code
→ Returns generated code to user
→ 1 iteration
```

### سناریوی ۲: دیپلوی کامل
```
Input: "Create a hello world worker and deploy to Cloudflare"
→ AI tool generates worker code
→ Cloudflare tool deploys
→ Browser tool shows preview
→ 3 iterations
```

### سناریوی ۳: خطا و بازیابی
```
Input: "Create app and commit to invalid-repo"
→ AI tool generates code
→ GitHub tool fails (invalid repo)
→ Agent tries alternative approach
→ Reports error to user
```

### سناریوی ۴: درخواست پیچیده
```
Input: "Build a full-stack todo app with API, UI, and deploy"
→ Multiple AI calls
→ GitHub commits
→ Cloudflare deploy
→ Browser preview
→ 5+ iterations
```

## معیارهای موفقیت
- ✅ همه تست‌ها پاس می‌شوند
- ✅ هر tool timeout 30 ثانیه دارد
- ✅ خطاها به درستی به کاربر گزارش می‌شوند
- ✅ Agent loop حداکثر ۱۰ iteration
- ✅全て ابزارها با CopilotKit interface سازگار هستند