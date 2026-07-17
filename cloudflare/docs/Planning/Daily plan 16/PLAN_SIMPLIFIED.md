# Daily Plan 16: Agent Coder Ecosystem (Simplified)

## Status: PENDING

## Goal
Build a **simple, production-ready AI agent** that understands user intent and generates code using 4 core tools.

## Core Principle: Keep It Simple

❌ **Don't:**
- 6 specialized agents
- 15 tools
- 3-layer memory
- Workflow compiler
- Complex orchestration

✅ **Do:**
- 1 Coder Agent (simple, all-in-one)
- 4 core tools
- KV memory only
- Direct AI execution
- Minimal state

---

## Architecture

```
┌─────────────────────────────────────────────┐
│         NEXUS SIMPLE AGENT ARCHITECTURE      │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  Coder Agent (Single)              │    │
│  │  - Receives user prompt            │    │
│  │  - AI decides what to do           │    │
│  │  - Calls tools sequentially        │    │
│  └──────────┬──────────────────────────┘    │
│             │                               │
│             ▼                               │
│  ┌─────────────────────────────────────┐    │
│  │  4 Core Tools                       │    │
│  │  1. AI Tool (generate code)        │    │
│  │  2. GitHub Tool (commit)           │    │
│  │  3. Cloudflare Tool (deploy)       │    │
│  │  4. Browser Tool (preview)         │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  Memory (KV only)                   │    │
│  │  - Last 20 messages                 │    │
│  │  - TTL: 24h                        │    │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Sub-Tasks (Simplified)

### TASK 16-01: Simple Coder Agent
**Objective:** Build one agent that does everything

**What it does:**
1. Receives user prompt
2. Uses AI to generate code
3. Commits to GitHub
4. Deploys to Cloudflare

**What it does NOT have:**
- ❌ No sub-agents
- ❌ No orchestration
- ❌ No complex state machine
- ❌ No workflow compiler

**Deliverables:**
- `SimpleCoderAgent` class
- `execute(prompt)` method
- Tool calling logic
- Error handling

---

### TASK 16-02: 4 Core Tools
**Objective:** Minimal tool surface

#### Tool 1: AI Tool
```typescript
interface AITool {
  generateCode(prompt: string): Promise<string>;
}
```

#### Tool 2: GitHub Tool
```typescript
interface GitHubTool {
  commitFile(repo: string, path: string, content: string): Promise<void>;
}
```

#### Tool 3: Cloudflare Tool
```typescript
interface CloudflareTool {
  deploy(script: string): Promise<string>;
}
```

#### Tool 4: Browser Tool
```typescript
interface BrowserTool {
  screenshot(url: string): Promise<string>;
}
```

**Deliverables:**
- 4 tool implementations
- Tool registry (simple Map)
- Permission checks (basic)

---

### TASK 16-03: Simple Memory
**Objective:** Remember last 20 messages

**Implementation:**
```typescript
class SimpleMemory {
  async getMessages(): Promise<Message[]>
  async addMessage(msg: Message): Promise<void>
}
```

**Storage:** KV only, 24h TTL

**Deliverables:**
- Memory class
- KV integration
- Message history

---

### TASK 16-04: Basic API
**Objective:** HTTP endpoints

**Endpoints:**
```
POST /api/chat - Send message
GET  /api/history - Get conversation
DELETE /api/history - Clear history
```

**Deliverables:**
- Hono routes
- Request validation
- Error responses

---

## Implementation (10 Days)

### Phase 1: Core (Days 1-4)

**Day 1-2: Agent Core**
```typescript
// platform-api/src/agents/simple-coder.ts
export class SimpleCoderAgent {
  async execute(prompt: string) {
    // 1. Generate code with AI
    const code = await this.ai.generate(prompt);
    
    // 2. Commit to GitHub
    await this.github.commit(code);
    
    // 3. Deploy to Cloudflare
    const url = await this.cloudflare.deploy();
    
    return { success: true, url };
  }
}
```

**Day 3-4: Tools**
- AI Tool (AI Gateway)
- GitHub Tool (GitHub API)
- Cloudflare Tool (wrangler)
- Browser Tool (puppeteer/screenshot)

### Phase 2: Memory & API (Days 5-7)

**Day 5-6: Memory**
- KV integration
- Message storage
- History retrieval

**Day 7: API**
- Chat endpoint
- History endpoint
- Error handling

### Phase 3: Polish (Days 8-10)

**Day 8-9: Testing**
- Unit tests
- Integration tests
- Error scenarios

**Day 10: Beta**
- Deploy to Cloudflare
- Test with 10 users
- Gather feedback

---

## Code Structure (Simplified)

```
platform-api/src/agents/
├── simple-coder.ts          # One agent, does everything
├── tools/
│   ├── ai-tool.ts           # Code generation
│   ├── github-tool.ts       # Git operations
│   ├── cloudflare-tool.ts   # Deployment
│   └── browser-tool.ts      # Preview
├── memory.ts                # Simple KV memory
└── index.ts                 # Export

platform-api/src/routes/
└── agent.ts                 # API endpoints
```

---

## Acceptance Criteria

- [ ] User sends prompt → agent generates code
- [ ] Code committed to GitHub
- [ ] Deployed to Cloudflare
- [ ] Preview URL returned
- [ ] Memory works (last 20 messages)
- [ ] Error handling basic
- [ ] API functional
- [ ] Tests pass

---

## What's Removed (from Plan 16):

| Component | Reason |
|-----------|--------|
| 6 sub-agents | Overkill for MVP |
| 15 tools | Too many, 4 is enough |
| Vectorize | Not needed for MVP |
| D1 episodic | Over-engineering |
| Workflow compiler | No visual builder yet |
| Event bus | Too complex |
| Streaming | Nice-to-have, not MVP |
| Circuit breaker | Over-engineering |
| Approval gates | v2 feature |

---

## What's Next (Post-MVP):

1. **Add more agents** if needed (based on user feedback)
2. **Add Vectorize** for long-term memory
3. **Add workflow compiler** when visual builder is ready
4. **Add approval gates** for enterprise
5. **Add MCP support** for extensibility

---

## Success Metrics

- **Time to first deploy:** <5 minutes
- **Code accuracy:** 80%+
- **User satisfaction:** 7/10+
- **System reliability:** 95%+ success rate

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Single agent vs multi-agent | Simpler, faster to market |
| 4 tools vs 15 tools | MVP needs only core features |
| KV only vs Vectorize | Reduce complexity, add later |
| No workflow compiler | No visual builder yet |
| No approval gates | MVP doesn't need enterprise features |

---

**پایان Plan ساده‌شده**