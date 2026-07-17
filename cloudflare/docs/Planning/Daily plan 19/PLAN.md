# Daily Plan 19: Agent Tool Wrappers

**Status:** PENDING
**Prerequisite:** Plan 18 complete (Frontend Streaming & State Sync)
**Goal:** Wrap all existing platform tools (AI, GitHub, Cloudflare, Browser) for CopilotKit compatibility with schema validation, timeout logic, and retry mechanisms

---

## 🎯 Objectives

1. Wrap existing tools with CopilotKit-compatible schemas
2. Add Zod validation for all tool parameters
3. Implement timeout and retry logic
4. Create tool registry with discovery
5. Add comprehensive error handling
6. Write integration tests

---

## 📋 Task Breakdown

### TASK_19_01: Tool Registry & Base Classes
**Goal:** Create base infrastructure for tool management

**Files:**
- `cloudflare/platform-api/src/agents/tools/ToolRegistry.ts` (CREATE)
- `cloudflare/platform-api/src/agents/tools/BaseTool.ts` (CREATE)
- `cloudflare/platform-api/src/agents/tools/types.ts` (CREATE)

**Implementation:**
- [ ] Define Tool interface with Zod schemas
- [ ] Create BaseTool abstract class
- [ ] Implement ToolRegistry for discovery
- [ ] Add tool metadata (name, description, parameters)
- [ ] Implement tool permission system

**Acceptance Criteria:**
- Tools can be registered and discovered
- All tools have consistent interface
- Schema validation works

---

### TASK_19_02: AI Tool Wrapper
**Goal:** Wrap AI Gateway tool for CopilotKit

**Files:**
- `cloudflare/platform-api/src/agents/tools/AITool.ts` (CREATE)

**Implementation:**
- [ ] Define input schema (prompt, model, temperature, maxTokens)
- [ ] Wrap existing AI Gateway provider
- [ ] Add streaming support
- [ ] Implement timeout (30s default)
- [ ] Add retry logic (3 attempts with backoff)
- [ ] Format output for CopilotKit

**Acceptance Criteria:**
- AI tool generates code from prompts
- Timeout enforced
- Retries on transient failures
- Output properly formatted

---

### TASK_19_03: GitHub Tool Wrapper
**Goal:** Wrap GitHub integration tool

**Files:**
- `cloudflare/platform-api/src/agents/tools/GitHubTool.ts` (CREATE)

**Implementation:**
- [ ] Define input schema (operation, repo, branch, message)
- [ ] Wrap GitHub API client
- [ ] Support operations: create_branch, commit, create_pr
- [ ] Add authentication handling
- [ ] Implement rate limiting awareness
- [ ] Error handling for API failures

**Acceptance Criteria:**
- Can create branches
- Can commit files
- Can create PRs
- Auth errors handled gracefully

---

### TASK_19_04: Cloudflare Tool Wrapper
**Goal:** Wrap Cloudflare deployment tool

**Files:**
- `cloudflare/platform-api/src/agents/tools/CloudflareTool.ts` (CREATE)

**Implementation:**
- [ ] Define input schema (action, workerName, config)
- [ ] Wrap Cloudflare API client
- [ ] Support operations: deploy, get_worker, list_workers
- [ ] Add deployment status tracking
- [ ] Implement rollback capability
- [ ] Handle API rate limits

**Acceptance Criteria:**
- Can deploy workers
- Can check deployment status
- Can rollback deployments
- API errors handled

---

### TASK_19_05: Browser Tool Wrapper
**Goal:** Wrap Browser automation tool

**Files:**
- `cloudflare/platform-api/src/agents/tools/BrowserTool.ts` (CREATE)

**Implementation:**
- [ ] Define input schema (action, url, selector, screenshot)
- [ ] Wrap Browser automation client
- [ ] Support operations: navigate, screenshot, click, fill
- [ ] Add timeout for page loads (10s)
- [ ] Implement screenshot capture
- [ ] Error handling for timeouts

**Acceptance Criteria:**
- Can navigate to URLs
- Can take screenshots
- Can interact with elements
- Timeouts enforced

---

### TASK_19_06: Timeout & Retry Logic
**Goal:** Implement unified timeout and retry mechanism

**Files:**
- `cloudflare/platform-api/src/agents/tools/TimeoutManager.ts` (CREATE)
- `cloudflare/platform-api/src/agents/tools/RetryPolicy.ts` (CREATE)

**Implementation:**
- [ ] Create TimeoutManager class
- [ ] Implement per-tool timeout configuration
- [ ] Create RetryPolicy with exponential backoff
- [ ] Add circuit breaker pattern
- [ ] Implement retry budget (max 3 retries)
- [ ] Log retry attempts

**Acceptance Criteria:**
- All tools respect timeouts
- Retries work with backoff
- Circuit breaker prevents cascade failures
- Retries logged for debugging

---

### TASK_19_07: Tool Testing & Documentation
**Goal:** Test all wrapped tools and document usage

**Files:**
- `cloudflare/platform-api/tests/tools/ai-tool.test.ts` (CREATE)
- `cloudflare/platform-api/tests/tools/github-tool.test.ts` (CREATE)
- `cloudflare/platform-api/tests/tools/cloudflare-tool.test.ts` (CREATE)
- `cloudflare/platform-api/tests/tools/browser-tool.test.ts` (CREATE)
- `cloudflare/platform-api/tests/tools/tool-registry.test.ts` (CREATE)
- `cloudflare/platform-api/docs/TOOLS.md` (CREATE)

**Implementation:**
- [ ] Write unit tests for each tool
- [ ] Test timeout scenarios
- [ ] Test retry logic
- [ ] Test error handling
- [ ] Create tool usage documentation
- [ ] Document tool schemas

**Acceptance Criteria:**
- All tools have passing tests
- Timeout tests pass
- Retry tests pass
- Documentation complete

---

## 🏗️ Architecture

```
Tool System Architecture
├── BaseTool (Abstract Base)
│   ├── execute() - Abstract method
│   ├── validate() - Zod schema validation
│   ├── timeout handling
│   └── retry logic
│
├── ToolRegistry (Singleton)
│   ├── register() - Register tool
│   ├── get() - Get tool by name
│   ├── list() - List all tools
│   └── discover() - Dynamic discovery
│
├── Concrete Tools
│   ├── AITool (AI Gateway)
│   ├── GitHubTool (GitHub API)
│   ├── CloudflareTool (CF API)
│   └── BrowserTool (Browser automation)
│
├── TimeoutManager
│   ├── setTimeout()
│   ├── getRemaining()
│   └── clearTimeout()
│
├── RetryPolicy
│   ├── exponential backoff
│   ├── max attempts
│   └── retry budget
│
└── CircuitBreaker
    ├── track failures
    ├── open circuit
    └── half-open probe
```

---

## 📊 Tool Schema Design

```typescript
// Base tool interface
interface Tool {
  name: string;
  description: string;
  parameters: z.ZodSchema;
  returns: z.ZodSchema;
  
  execute(params: any, context: ToolContext): Promise<ToolResult>;
  timeout?: number;
  retries?: number;
}

// Tool result
interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata: {
    duration: number;
    attempts: number;
    cached: boolean;
  };
}

// Tool context
interface ToolContext {
  tenantId: string;
  userId: string;
  sessionId?: string;
  agentId?: string;
}
```

---

## 🔄 Data Flow

```
1. Agent requests tool execution
   ↓
2. ToolRegistry looks up tool by name
   ↓
3. Validate parameters against Zod schema
   ↓
4. Check circuit breaker (skip if open)
   ↓
5. Execute with timeout
   ↓
6. On failure → Retry with backoff
   ↓
7. Return result to agent
   ↓
8. Log execution for observability
```

---

## 🎨 Tool Wrapper Pattern

```typescript
// Example: AITool wrapper
export class AITool extends BaseTool {
  name = 'ai_generate';
  description = 'Generate code using AI';
  
  parameters = z.object({
    prompt: z.string().min(1).max(10000),
    model: z.string().optional(),
    temperature: z.number().min(0).max(1).optional(),
    maxTokens: z.number().min(1).max(8000).optional()
  });
  
  returns = z.object({
    content: z.string(),
    model: z.string(),
    usage: z.object({
      promptTokens: z.number(),
      completionTokens: z.number()
    })
  });
  
  timeout = 30000; // 30s
  retries = 3;
  
  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    try {
      const result = await this.aiProvider.generate({
        prompt: params.prompt,
        model: params.model,
        temperature: params.temperature,
        maxTokens: params.maxTokens
      });
      
      return {
        success: true,
        data: result,
        metadata: { duration: 0, attempts: 1, cached: false }
      };
    } catch (error: any) {
      if (this.shouldRetry(error)) {
        throw new RetryableError(error.message);
      }
      
      return {
        success: false,
        error: error.message,
        metadata: { duration: 0, attempts: 1, cached: false }
      };
    }
  }
}
```

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
// tests/tools/ai-tool.test.ts
describe('AITool', () => {
  it('should generate code from prompt', async () => {});
  it('should timeout after 30s', async () => {});
  it('should retry on transient errors', async () => {});
  it('should validate parameters', async () => {});
  it('should handle API errors gracefully', async () => {});
});
```

### Integration Tests

```typescript
// tests/tools/integration.test.ts
describe('Tool System Integration', () => {
  it('should register and discover tools', async () => {});
  it('should execute tool via registry', async () => {});
  it('should respect timeout across all tools', async () => {});
  it('should retry with backoff', async () => {});
  it('should open circuit breaker after failures', async () => {});
});
```

---

## 📊 Timeline

| Day | Tasks | Hours |
|-----|-------|-------|
| 1 | TASK_19_01: Tool Registry & Base Classes | 4h |
| 2 | TASK_19_02: AI Tool Wrapper | 3h |
| 3 | TASK_19_03: GitHub Tool Wrapper | 3h |
| 4 | TASK_19_04: Cloudflare Tool Wrapper | 3h |
| 5 | TASK_19_05: Browser Tool Wrapper | 2h |
| 6 | TASK_19_06: Timeout & Retry Logic | 4h |
| 7 | TASK_19_07: Testing & Documentation | 4h |

**Total: ~23 hours**

---

## ✅ Acceptance Criteria

- [ ] All 4 tools wrapped (AI, GitHub, Cloudflare, Browser)
- [ ] Tool registry functional
- [ ] Zod validation working
- [ ] Timeouts enforced
- [ ] Retry logic with exponential backoff
- [ ] Circuit breaker prevents cascade failures
- [ ] All tests passing
- [ ] Documentation complete

---

## 🚧 Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Tool API changes | Medium | Version API clients, monitor changelogs |
| Timeout tuning | Low | Start conservative, adjust based on metrics |
| Retry storms | High | Circuit breaker, retry budget |
| Schema drift | Medium | Version schemas, backwards compatibility |

---

## 📝 Notes

- Tools should be stateless (state in agent context)
- All errors should be structured and logged
- Timeout defaults: AI=30s, GitHub=15s, Cloudflare=20s, Browser=10s
- Retry policy: max 3 attempts, exponential backoff (1s, 2s, 4s)

---

## 🔗 Related Documentation

- `Daily plan 17/TASK_17_06_TOOLS_TESTING.md` - Tool testing requirements
- `Daily plan 16/PLAN.md` - Agent ecosystem
- `docs/Agent/AGENTS_INTEGRATION_PLAN.md` - Agent architecture

---

## 🎯 Next Steps

After Plan 19:
- **Plan 20:** Integration Testing & Polish
- **Plan 21+:** Advanced features (Agent Builder, Memory)