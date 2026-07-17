# Daily Plan 16: Agent Coder Ecosystem

## Status: PENDING

## Goal
Create a comprehensive multi-agent system where a central **Coder Agent** understands user intent and orchestrates specialized sub-agents (Builder, Tester, Reviewer, Deployer, Docs, Support) to handle the complete app lifecycle with dynamic workflow compilation.

## Core Innovation
Transform the entire platform into an **agent-native architecture** where:
- **Coder Agent** = Main brain that understands intent and delegates
- **Sub-Agents** = Specialized workers for each domain
- **Dynamic Workflow Compiler** = Converts visual graphs to executable Cloudflare Workflows at runtime
- **Unified Tool Surface** = All Cloudflare tools accessible via typed, permission-controlled interface

---

## Sub-Tasks

### TASK 16-01: Agent Coder Foundation
**Objective:** Build the main Coder Agent that understands user intent and orchestrates sub-agents.

**Key Components:**
- Intent parser for natural language prompts
- Agent invocation protocol
- Reasoning loop with tool use
- Memory system (Vectorize + KV)

**Deliverables:**
- `CoderAgent` class with reasoning capabilities
- Intent classification system
- Agent selection and delegation logic
- Context management

**Acceptance Criteria:**
- Coder Agent can parse "Build me a counter app" → BuilderAgent invocation
- Context persists across conversation turns
- Agent can explain its reasoning to users

---

### TASK 16-02: Sub-Agent Specialization
**Objective:** Create specialized agents for each domain task.

**Agents to Build:**

#### 2.1 BuilderAgent
- **Responsibility:** Code generation, scaffolding, file creation
- **Tools:** FileSystem, GitHub, AI Gateway
- **Input:** App specification, templates
- **Output:** Generated code, artifact paths

#### 2.2 TesterAgent
- **Responsibility:** Test execution, validation, quality checks
- **Tools:** Terminal, Browser, FileSystem
- **Input:** Generated code, test suites
- **Output:** Test results, coverage reports

#### 2.3 ReviewerAgent
- **Responsibility:** Code review, security checks, best practices
- **Tools:** FileSystem, Browser
- **Input:** Generated code, review criteria
- **Output:** Review report, issues list

#### 2.4 DeployerAgent
- **Responsibility:** Deployment orchestration, GitHub integration
- **Tools:** GitHub, Cloudflare, FileSystem
- **Input:** Build artifacts, deployment config
- **Output:** Deployment URLs, status

#### 2.5 DocsAgent
- **Responsibility:** Cloudflare documentation retrieval, guidance
- **Tools:** DocsTool (MCP), Vectorize
- **Input:** User questions, context
- **Output:** Relevant docs, recommendations

#### 2.6 SupportAgent
- **Responsibility:** Troubleshooting, error explanation, user guidance
- **Tools:** All tools (read-only)
- **Input:** Error logs, user confusion
- **Output:** Explanations, fix suggestions

**Deliverables:**
- 6 specialized agent implementations
- Agent registry with capability discovery
- Tool permission matrix per agent

**Acceptance Criteria:**
- Each agent has typed input/output contracts
- Agents can be invoked independently or via Coder Agent
- Failed agents trigger retry with fallback strategies

---

### TASK 16-03: Dynamic Workflow Compiler
**Objective:** Convert visual builder graphs to executable Cloudflare Workflows at runtime.

**Architecture:**
```
Visual Graph (Portal SPA)
       ↓
  Graph IR (Intermediate Representation)
       ↓
  Workflow Compiler
       ↓
  Cloudflare Workflow Definition
       ↓
  Executable Workflow Steps
```

**Key Features:**
1. **Graph IR Generation**
   - Serialize graph nodes/edges to typed IR
   - Preserve execution order, parallel zones, approval boundaries
   - Validate graph before compilation

2. **Workflow Step Mapping**
   - AgentNode → Agent execution step
   - ToolNode → Tool invocation step
   - ApprovalNode → SleepUntil step
   - Parallel branches → Fan-out/fan-in

3. **Dynamic Orchestration**
   - Generate workflow steps at runtime
   - Inject retries and timeouts
   - Add approval gates where needed
   - Connect agents to workflow steps

**Deliverables:**
- Graph IR schema and serializer
- Workflow definition generator
- Step mapping engine
- Runtime workflow deployment

**Acceptance Criteria:**
- Visual graph compiles to valid Workflow JSON
- Parallel branches execute concurrently
- Approval gates pause workflow correctly
- Failed steps retry with backoff

---

### TASK 16-04: Tool Orchestrator Unified Surface
**Objective:** Expose all Cloudflare tools through a unified, typed interface.

**Tool Families:**

#### 4.1 Core Tools
- **AppsTool** - App CRUD operations
- **TemplatesTool** - Template discovery and selection
- **GraphTool** - Graph validation and compilation
- **ArtifactsTool** - File read/write in R2

#### 4.2 Integration Tools
- **GitHubTool** - Branch creation, commits, PRs
- **CloudflareTool** - Worker deployment, DNS, analytics
- **DeploymentsTool** - Deployment status, history

#### 4.3 Execution Tools
- **TerminalTool** - Shell command execution (Sandbox)
- **BrowserTool** - Browser automation, screenshots
- **SandboxTool** - Code execution, preview

#### 4.4 Intelligence Tools
- **DocsTool** - Cloudflare documentation retrieval
- **SearchTool** - Semantic search (Vectorize)
- **AITool** - LLM invocation via AI Gateway

**Architecture:**
```typescript
interface Tool {
  name: string;
  description: string;
  parameters: ZodSchema;
  permissions: string[];
  
  execute(params: any, context: ToolContext): Promise<ToolResult>;
}

class ToolOrchestrator {
  private registry: Map<string, Tool>;
  
  register(tool: Tool): void;
  getToolsForAgent(agentType: string): Tool[];
  compose(tools: string[]): ComposedTool;
}
```

**Deliverables:**
- 15+ tool implementations
- Tool registry with discovery
- Permission-based access control
- Tool composition for complex operations

**Acceptance Criteria:**
- All tools accept Zod-validated parameters
- Agents can only access permitted tools
- Tools can be composed for multi-step operations
- Tool execution is logged and traceable

---

### TASK 16-05: Memory & Context Management
**Objective:** Implement persistent memory and context for agents.

**Memory Layers:**

#### 5.1 Short-Term Memory (Session)
- **Storage:** KV (fast, cheap)
- **TTL:** 24 hours
- **Content:** Conversation history, current task state
- **Size Limit:** 1MB per session

#### 5.2 Long-Term Memory (Vectorize)
- **Storage:** Vectorize (semantic search)
- **Content:** Past conversations, learned patterns, user preferences
- **Retrieval:** Semantic similarity search

#### 5.3 Episodic Memory (D1)
- **Storage:** D1 (structured)
- **Content:** Agent runs, tool calls, approvals, outcomes
- **Purpose:** Audit trail, analytics, learning

**Context Management:**
- Sliding window for conversation history
- Automatic summarization when context grows large
- Semantic retrieval of relevant past interactions

**Deliverables:**
- Memory abstraction layer
- KV session store
- Vectorize long-term store
- Context windowing algorithm

**Acceptance Criteria:**
- Agents can recall context from 10+ turns ago
- Semantic search returns relevant past interactions
- Memory persists across Worker restarts
- Context window stays within model limits

---

### TASK 16-06: Agent Communication Protocol
**Objective:** Enable reliable communication between agents and workflow orchestration.

**Communication Patterns:**

#### 6.1 Request-Response (Agent Invocation)
```typescript
const result = await AgentRegistry.invoke('builder', {
  input: { appId, prompt },
  timeout: 60000,
  retries: 3
});
```

#### 6.2 Event-Driven (Workflow Steps)
```typescript
await EventBus.publish('agent.step.complete', {
  agentId: 'builder-123',
  result: buildResult,
  nextStep: 'review'
});
```

#### 6.3 Streaming (Real-Time Updates)
```typescript
const stream = await AgentRegistry.stream('coder', {
  input: userPrompt
});

for await (const chunk of stream) {
  await sendToClient(chunk);
}
```

**Protocol Stack:**
1. **Transport:** Durable Objects (WebSocket) + HTTP
2. **Message Format:** JSON with envelope
3. **Serialization:** Type-safe with Zod
4. **Error Handling:** Structured error codes
5. **Observability:** Distributed tracing

**Deliverables:**
- Agent client/server protocol
- Message envelope format
- Error propagation system
- Distributed tracing integration

**Acceptance Criteria:**
- Agents can invoke other agents
- Workflow steps communicate via events
- Real-time streaming works end-to-end
- Errors propagate correctly across agents
- Complete audit trail exists

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Coder Ecosystem                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User Input (Chat / Visual Graph)                           │
│       │                                                     │
│       ▼                                                     │
│  ┌──────────────────────────────────────┐                   │
│  │  CoderAgent (Agents SDK)             │                   │
│  │  - Intent parsing                    │                   │
│  │  - Task decomposition                │                   │
│  │  - Agent orchestration               │                   │
│  │  - Reasoning & planning              │                   │
│  └───────────┬──────────────────────────┘                   │
│              │                                              │
│     ┌────────┴────────┐                                     │
│     │                 │                                      │
│     ▼                 ▼                                      │
│  ┌─────────┐   ┌─────────────┐                              │
│  │ Plan    │   │ Execute     │                              │
│  │ Agent   │   │ Agent       │                              │
│  └────┬────┘   └──────┬──────┘                              │
│       │                │                                      │
│       │    ┌───────────┼────────────┐                        │
│       │    │           │            │                        │
│       ▼    ▼           ▼            ▼                        │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Builder │ │ Tester   │ │ Reviewer │ │ Deployer │ ...     │
│  │ Agent   │ │ Agent    │ │ Agent    │ │ Agent    │          │
│  └────┬────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘        │
│       │           │            │            │                │
│       └───────────┼────────────┼────────────┘                │
│                   │            │                             │
│                   ▼            ▼                             │
│            ┌──────────────┐                                 │
│            │ Tool         │                                 │
│            │ Orchestrator │                                 │
│            │              │                                 │
│            └──────┬───────┘                                 │
│                   │                                         │
│  ┌────────────────┼────────────────┐                        │
│  │                │                │                        │
│  ▼                ▼                ▼                        │
│ ┌──────┐      ┌──────┐      ┌──────────┐                    │
│ │GitHub│      │Cloudflare│  │ Sandbox  │ ...                 │
│ │Tool  │      │Tool    │   │ Tool     │                    │
│ └──────┘      └──────┘      └──────────┘                    │
│                                                             │
│  ┌──────────────────────────────────────┐                   │
│  │  Memory & Context                    │                   │
│  │  ├─ KV (Session)                     │                   │
│  │  ├─ Vectorize (Long-term)            │                   │
│  │  └─ D1 (Episodic)                    │                   │
│  └──────────────────────────────────────┘                   │
│                                                             │
│  ┌──────────────────────────────────────┐                   │
│  │  Dynamic Workflow Compiler           │                   │
│  │  ├─ Graph IR → Workflow              │                   │
│  │  ├─ Step Generator                   │                   │
│  │  └─ Approval Gate Injector           │                   │
│  └──────────────────────────────────────┘                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Agent Runtime** | Agents SDK | Session, state, reasoning, tools |
| **Workflow Engine** | Cloudflare Workflows | Durable execution, retries, approvals |
| **Orchestration** | Durable Objects | Agent coordination, event bus |
| **Tools** | Custom TypeScript | Unified tool surface |
| **Memory** | KV + Vectorize + D1 | Short/long/episodic memory |
| **Communication** | WebSocket + HTTP | Agent-to-agent messaging |
| **AI** | AI Gateway + Workers AI | LLM reasoning, embeddings |
| **Storage** | R2 + D1 | Artifacts, metadata, history |

---

## Dependencies

- Cloudflare Agents SDK (GA)
- Cloudflare Workflows (GA)
- Durable Objects
- D1, R2, KV, Vectorize
- AI Gateway
- Workers AI (embeddings)
- Sandbox SDK (optional, advanced features)

---

## References

- `docs/Agent/AGENTS_INTEGRATION_PLAN.md` - Agent integration strategy
- `docs/Agent/AGENTS_WORKFLOWS_AND_VISUAL_BUILDER_ON_CLOUDFLARE.md` - Workflows + Agents
- `docs/Architecture/VISUAL_GRAPH_BUILDER_ARCHITECTURE.md` - Builder architecture
- [Cloudflare Agents SDK](https://developers.cloudflare.com/agents/)
- [Cloudflare Workflows](https://developers.cloudflare.com/workflows/)

---

## Acceptance Criteria (Overall)

- [ ] Coder Agent successfully delegates to sub-agents
- [ ] All 6 sub-agents functional and tested
- [ ] Dynamic workflow compiler converts graphs to Workflows
- [ ] Unified tool surface accessible to all agents
- [ ] Memory system persists and retrieves context
- [ ] Agent communication protocol reliable and traceable
- [ ] End-to-end: User prompt → Agent swarm → Deployment

---

## Rollout Strategy

### Phase 1: Foundation (Week 1-2)
- Coder Agent basic reasoning
- 2-3 core sub-agents (Builder, Tester, Deployer)
- Basic tool surface

### Phase 2: Intelligence (Week 3-4)
- All 6 sub-agents
- Memory system
- Advanced tool composition

### Phase 3: Dynamic Compilation (Week 5-6)
- Graph IR compiler
- Workflow generation
- Approval gates

### Phase 4: Production Hardening (Week 7-8)
- Observability
- Error handling
- Performance optimization

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Agent reasoning drift | Strict tool contracts, validation gates |
| Workflow complexity | Start simple, iterate |
| Tool permission security | Whitelist-based, least privilege |
| Memory bloat | Aggressive TTLs, summarization |
| Cost (AI Gateway) | Caching, fallback models, budget limits |

---

## Success Metrics

- **Agent Accuracy:** 90%+ correct agent selection
- **Workflow Compilation:** <5s for typical graphs
- **End-to-End Time:** <2min for simple apps
- **User Satisfaction:** Intuitive agent explanations
- **System Reliability:** 99.5%+ workflow success rate