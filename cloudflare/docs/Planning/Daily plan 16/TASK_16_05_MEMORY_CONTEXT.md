# TASK 16-05: Memory & Context Management

## Objective
Implement a multi-layered memory system for agents that provides short-term session storage, long-term semantic memory, and episodic memory for learning and audit trails.

## Prerequisites
- TASK 16-01 completed (Agent Coder Foundation)
- TASK 16-02 completed (Sub-Agent Specialization)
- Vectorize enabled
- KV namespace available
- D1 database available

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Agent Memory & Context System                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────┐                │
│  │  Working Memory                         │                │
│  │  - KV (TTL: 24h)                        │                │
│  │  - Current conversation                 │                │
│  │  - Active task context                  │                │
│  │  - Temporary state                      │                │
│  └─────────────────────────────────────────┘                │
│                                                             │
│  ┌─────────────────────────────────────────┐                │
│  │  Long-Term Memory                       │                │
│  │  - Vectorize (semantic search)          │                │
│  │  - Past conversations                   │                │
│  │  - Learned patterns                     │                │
│  │  - User preferences                     │                │
│  └─────────────────────────────────────────┘                │
│                                                             │
│  ┌─────────────────────────────────────────┐                │
│  │  Episodic Memory                        │                │
│  │  - D1 (structured)                      │                │
│  │  - Agent runs                           │                │
│  │  - Tool calls                           │                │
│  │  - Outcomes & metrics                   │                │
│  └─────────────────────────────────────────┘                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Memory Layers

### 5.1 Working Memory (KV)

**Storage:** Cloudflare KV
**TTL:** 24 hours (renewed on activity)
**Size Limit:** 1MB per session

**Data Stored:**
- Conversation history (last 20 messages)
- Current task state
- Active file references
- Intermediate results

**Schema:**
```typescript
interface WorkingMemory {
  sessionId: string;
  messages: Message[];
  currentTask?: {
    id: string;
    type: string;
    status: 'planning' | 'executing' | 'waiting' | 'completed';
    artifacts: string[];
  };
  context: Record<string, any>; // Arbitrary state
  lastAccessed: number;
}
```

---

### 5.2 Long-Term Memory (Vectorize)

**Storage:** Cloudflare Vectorize
**Embedding Model:** `text-embedding-3-small` (1536 dimensions)
**Retention:** Permanent (until explicitly deleted)

**Data Stored:**
- Conversation embeddings (last 100 turns)
- Semantic summaries of past sessions
- Learned user preferences
- Successful patterns

**Schema:**
```typescript
interface LongTermMemory {
  id: string;
  sessionId: string;
  userId: number;
  type: 'message' | 'summary' | 'pattern';
  text: string;
  embedding: number[];
  metadata: {
    timestamp: number;
    agentType?: string;
    importance: number;
    tags: string[];
  };
}
```

---

### 5.3 Episodic Memory (D1)

**Storage:** Cloudflare D1
**Retention:** 90 days (configurable)
**Purpose:** Audit trail, analytics, learning

**Schema:**
```sql
CREATE TABLE agent_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  task_type TEXT NOT NULL,
  input_snapshot TEXT NOT NULL,
  output_snapshot TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  duration_ms INTEGER,
  tokens_used INTEGER,
  error TEXT
);

CREATE TABLE tool_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL,
  tool_name TEXT NOT NULL,
  input_json TEXT NOT NULL,
  output_json TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  duration_ms INTEGER,
  FOREIGN KEY (run_id) REFERENCES agent_runs(id)
);

CREATE TABLE agent_learnings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  pattern TEXT NOT NULL,
  context TEXT NOT NULL,
  outcome TEXT NOT NULL,
  confidence REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Implementation

### Step 1: Memory Abstraction Layer

Create `platform-api/src/agents/memory/memory-manager.ts`:
```typescript
export interface MemoryQuery {
  type?: 'message' | 'summary' | 'pattern';
  sessionId?: string;
  userId?: number;
  query?: string; // Semantic search query
  topK?: number;
  timeRange?: {
    start: number;
    end: number;
  };
}

export interface MemoryResult {
  id: string;
  type: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
}

export abstract class BaseMemory {
  abstract store(key: string, value: any, ttl?: number): Promise<void>;
  abstract retrieve(key: string): Promise<any>;
  abstract delete(key: string): Promise<void>;
  abstract search(query: MemoryQuery): Promise<MemoryResult[]>;
}

export class MemoryManager {
  private working: WorkingMemoryStore;
  private longTerm: LongTermMemoryStore;
  private episodic: EpisodicMemoryStore;

  constructor(private env: Env) {
    this.working = new WorkingMemoryStore(env.KV);
    this.longTerm = new LongTermMemoryStore(env.VECTORIZE, env.AI_GATEWAY);
    this.episodic = new EpisodicMemoryStore(env.DB);
  }

  // Working memory operations
  async storeMessage(sessionId: string, message: Message): Promise<void> {
    const memory = await this.working.get(sessionId) || {
      sessionId,
      messages: [],
      lastAccessed: Date.now()
    };

    memory.messages.push(message);
    memory.lastAccessed = Date.now();

    // Keep only last 20 messages
    if (memory.messages.length > 20) {
      memory.messages = memory.messages.slice(-20);
    }

    await this.working.set(sessionId, memory, 86400); // 24h TTL
  }

  async getMessages(sessionId: string, limit: number = 20): Promise<Message[]> {
    const memory = await this.working.get(sessionId);
    return memory?.messages.slice(-limit) || [];
  }

  // Long-term memory operations
  async storeConversation(sessionId: string, userId: number, messages: Message[]): Promise<void> {
    for (const msg of messages) {
      // Generate embedding
      const embedding = await this.longTerm.embed(msg.content);

      // Store in Vectorize
      await this.env.VECTORIZE.insert([{
        id: `msg:${sessionId}:${msg.timestamp}`,
        values: embedding,
        metadata: {
          sessionId,
          userId,
          role: msg.role,
          timestamp: msg.timestamp,
          type: 'message',
          text: msg.content.slice(0, 500)
        }
      }]);
    }
  }

  async searchConversations(
    userId: number,
    query: string,
    topK: number = 5
  ): Promise<MemoryResult[]> {
    return this.longTerm.search({
      userId,
      query,
      topK,
      type: 'message'
    });
  }

  // Episodic memory operations
  async recordRun(run: AgentRun): Promise<void> {
    await this.episodic.recordRun(run);
  }

  async recordToolCall(runId: number, call: ToolCall): Promise<void> {
    await this.episodic.recordToolCall(runId, call);
  }

  async getRunHistory(sessionId: string, limit: number = 10): Promise<AgentRun[]> {
    return this.episodic.getRuns(sessionId, limit);
  }

  // Context windowing
  async getContextWindow(
    sessionId: string,
    maxTokens: number = 4000
  ): Promise<Message[]> {
    const messages = await this.getMessages(sessionId, 50);
    
    // Simple sliding window (in production, use token counting)
    const window: Message[] = [];
    let tokenCount = 0;

    for (const msg of messages.reverse()) {
      const tokens = msg.content.length / 4; // Rough estimate
      if (tokenCount + tokens > maxTokens) break;
      
      window.unshift(msg);
      tokenCount += tokens;
    }

    return window;
  }

  // Semantic retrieval
  async getRelevantContext(
    sessionId: string,
    query: string,
    topK: number = 3
  ): Promise<Message[]> {
    const memory = await this.working.get(sessionId);
    if (!memory) return [];

    const relevant = await this.longTerm.search({
      sessionId,
      query,
      topK
    });

    return relevant
      .sort((a, b) => a.metadata.timestamp - b.metadata.timestamp)
      .map(r => ({
        role: r.metadata.role as 'user' | 'assistant',
        content: r.content,
        timestamp: r.metadata.timestamp
      }));
  }

  // Cleanup
  async clearSession(sessionId: string): Promise<void> {
    await this.working.delete(sessionId);
    await this.longTerm.deleteBySession(sessionId);
    await this.episodic.deleteBySession(sessionId);
  }
}

// Interfaces
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface AgentRun {
  sessionId: string;
  agentType: string;
  taskType: string;
  input: any;
  output: any;
  status: string;
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
  tokensUsed?: number;
  error?: string;
}

interface ToolCall {
  runId: number;
  toolName: string;
  input: any;
  output: any;
  status: string;
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
}
```

### Step 2: Working Memory Store (KV)

Create `platform-api/src/agents/memory/working-memory.ts`:
```typescript
export class WorkingMemoryStore {
  constructor(private kv: KVNamespace) {}

  async get(key: string): Promise<WorkingMemory | null> {
    const data = await this.kv.get(key, 'json');
    return data as WorkingMemory | null;
  }

  async set(key: string, value: WorkingMemory, ttl: number): Promise<void> {
    await this.kv.put(key, JSON.stringify(value), {
      expirationTtl: ttl
    });
  }

  async delete(key: string): Promise<void> {
    await this.kv.delete(key);
  }

  async updateLastAccessed(key: string): Promise<void> {
    const memory = await this.get(key);
    if (memory) {
      memory.lastAccessed = Date.now();
      await this.set(key, memory, 86400);
    }
  }
}

interface WorkingMemory {
  sessionId: string;
  messages: Message[];
  currentTask?: {
    id: string;
    type: string;
    status: string;
    artifacts: string[];
  };
  context: Record<string, any>;
  lastAccessed: number;
}
```

### Step 3: Long-Term Memory Store (Vectorize)

Create `platform-api/src/agents/memory/long-term-memory.ts`:
```typescript
export class LongTermMemoryStore {
  constructor(
    private vectorize: Vectorize,
    private aiGateway: AIGateway
  ) {}

  async embed(text: string): Promise<number[]> {
    const response = await this.aiGateway.embed({
      model: 'text-embedding-3-small',
      input: text
    });

    return response.data[0].embedding;
  }

  async search(query: MemoryQuery): Promise<MemoryResult[]> {
    // Generate query embedding
    const queryEmbedding = await this.embed(query.query || '');

    // Build filter
    const filter: Record<string, any> = {};
    if (query.type) filter.type = query.type;
    if (query.sessionId) filter.sessionId = query.sessionId;
    if (query.userId) filter.userId = query.userId;

    // Search
    const results = await this.vectorize.query(queryEmbedding, {
      topK: query.topK || 5,
      filter: Object.keys(filter).length > 0 ? filter : undefined
    });

    return results.matches.map(match => ({
      id: match.id,
      type: match.metadata.type,
      content: match.metadata.text,
      score: match.score,
      metadata: match.metadata
    }));
  }

  async deleteBySession(sessionId: string): Promise<void> {
    // Vectorize doesn't support batch delete by filter
    // In production, use a namespace or separate index per session
    // For now, mark as soft-deleted
    // TODO: Implement proper deletion strategy
  }

  async storePattern(
    sessionId: string,
    userId: number,
    pattern: string,
    context: string,
    outcome: string,
    confidence: number
  ): Promise<void> {
    const embedding = await this.embed(pattern);

    await this.vectorize.insert([{
      id: `pattern:${sessionId}:${Date.now()}`,
      values: embedding,
      metadata: {
        sessionId,
        userId,
        type: 'pattern',
        text: pattern,
        context,
        outcome,
        confidence
      }
    }]);
  }
}
```

### Step 4: Episodic Memory Store (D1)

Create `platform-api/src/agents/memory/episodic-memory.ts`:
```typescript
export class EpisodicMemoryStore {
  constructor(private db: D1Database) {}

  async recordRun(run: AgentRun): Promise<void> {
    await this.db.prepare(`
      INSERT INTO agent_runs (session_id, agent_type, task_type, input_snapshot, output_snapshot, status, started_at, completed_at, duration_ms, tokens_used, error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      run.sessionId,
      run.agentType,
      run.taskType,
      JSON.stringify(run.input),
      JSON.stringify(run.output),
      run.status,
      run.startedAt,
      run.completedAt || null,
      run.durationMs || null,
      run.tokensUsed || null,
      run.error || null
    ).run();
  }

  async recordToolCall(runId: number, call: ToolCall): Promise<void> {
    await this.db.prepare(`
      INSERT INTO tool_calls (run_id, tool_name, input_json, output_json, status, started_at, completed_at, duration_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      runId,
      call.toolName,
      JSON.stringify(call.input),
      JSON.stringify(call.output),
      call.status,
      call.startedAt,
      call.completedAt || null,
      call.durationMs || null
    ).run();
  }

  async getRuns(sessionId: string, limit: number = 10): Promise<AgentRun[]> {
    const result = await this.db.prepare(`
      SELECT * FROM agent_runs
      WHERE session_id = ?
      ORDER BY started_at DESC
      LIMIT ?
    `).bind(sessionId, limit).all();

    return result.results.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      agentType: row.agent_type,
      taskType: row.task_type,
      input: JSON.parse(row.input_snapshot),
      output: JSON.parse(row.output_snapshot),
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      durationMs: row.duration_ms,
      tokensUsed: row.tokens_used,
      error: row.error
    }));
  }

  async getToolCalls(runId: number): Promise<ToolCall[]> {
    const result = await this.db.prepare(`
      SELECT * FROM tool_calls WHERE run_id = ? ORDER BY started_at
    `).bind(runId).all();

    return result.results.map(row => ({
      id: row.id,
      runId: row.run_id,
      toolName: row.tool_name,
      input: JSON.parse(row.input_json),
      output: JSON.parse(row.output_json),
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      durationMs: row.duration_ms
    }));
  }

  async deleteBySession(sessionId: string): Promise<void> {
    // Delete runs
    await this.db.prepare(`
      DELETE FROM agent_runs WHERE session_id = ?
    `).bind(sessionId).run();

    // Delete tool calls
    await this.db.prepare(`
      DELETE FROM tool_calls WHERE run_id IN (
        SELECT id FROM agent_runs WHERE session_id = ?
      )
    `).bind(sessionId).run();
  }

  async getAgentMetrics(agentType: string, days: number = 7): Promise<any> {
    const result = await this.db.prepare(`
      SELECT 
        COUNT(*) as total_runs,
        AVG(duration_ms) as avg_duration,
        SUM(tokens_used) as total_tokens,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM agent_runs
      WHERE agent_type = ?
        AND started_at >= datetime('now', '-' || ? || ' days')
    `).bind(agentType, days).first();

    return result;
  }
}
```

### Step 5: Context Window Manager

Create `platform-api/src/agents/memory/context-window.ts`:
```typescript
export class ContextWindowManager {
  private memory: MemoryManager;
  private maxTokens: number;

  constructor(memory: MemoryManager, maxTokens: number = 4000) {
    this.memory = memory;
    this.maxTokens = maxTokens;
  }

  async buildContext(
    sessionId: string,
    userMessage: string,
    includeHistory: boolean = true
  ): Promise<Message[]> {
    const context: Message[] = [];

    // 1. Get system prompt (always first)
    context.push({
      role: 'system',
      content: this.getSystemPrompt(),
      timestamp: Date.now()
    });

    if (includeHistory) {
      // 2. Get recent conversation
      const recent = await this.memory.getMessages(sessionId, 10);
      context.push(...recent);

      // 3. Get semantically relevant past context
      const relevant = await this.memory.getRelevantContext(
        sessionId,
        userMessage,
        3
      );
      
      // Add as context if not already in recent messages
      const recentIds = new Set(recent.map(m => m.timestamp));
      for (const msg of relevant) {
        if (!recentIds.has(msg.timestamp)) {
          context.push({
            role: 'assistant',
            content: `[Previous context] ${msg.content}`,
            timestamp: msg.timestamp
          });
        }
      }
    }

    // 4. Add current user message
    context.push({
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    });

    // 5. Trim to fit context window
    return this.trimToFit(context);
  }

  private getSystemPrompt(): string {
    return `You are a helpful AI assistant for a code generation platform.
You help users build, test, and deploy applications.
You have access to various tools and can delegate to specialized agents.
Always be clear, concise, and helpful in your responses.`;
  }

  private async trimToFit(messages: Message[]): Promise<Message[]> {
    // Rough token estimation: 1 token ≈ 4 characters
    let totalTokens = messages.reduce((sum, m) => sum + m.content.length / 4, 0);

    if (totalTokens <= this.maxTokens) {
      return messages;
    }

    // Remove from the middle, keep system prompt and recent messages
    const system = messages[0];
    const recent = messages.slice(-5);
    const toRemove = messages.length - 6;

    // Remove older messages
    const trimmed = [system, ...messages.slice(1, -toRemove + 2), ...recent];
    
    return this.trimToFit(trimmed); // Recursively trim
  }

  async summarizeSession(sessionId: string): Promise<string> {
    const messages = await this.memory.getMessages(sessionId, 50);
    
    const prompt = `Summarize this conversation in 2-3 sentences, focusing on:
1. What the user wanted to accomplish
2. Key decisions made
3. Current state

Conversation:
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

Summary:`;

    // Use AI to generate summary
    // This would call AI Gateway
    return "Summary placeholder";
  }
}
```

### Step 6: Integration with Coder Agent

Update `platform-api/src/agents/coder/coder.agent.ts`:
```typescript
export class CoderAgent extends Agent<CoderAgentConfig> {
  private memory: MemoryManager;
  private contextWindow: ContextWindowManager;

  constructor(config: CoderAgentConfig) {
    super(config);
    this.memory = new MemoryManager(config.env);
    this.contextWindow = new ContextWindowManager(this.memory);
  }

  async onMessage(message: string): Promise<AgentResponse> {
    // Build context from memory
    const context = await this.contextWindow.buildContext(
      this.config.id,
      message
    );

    // Store user message
    await this.memory.storeMessage(this.config.id, {
      role: 'user',
      content: message,
      timestamp: Date.now()
    });

    // Parse intent with context
    const intent = await this.intentParser.parse(message, context);

    // Delegate and get response
    const response = await this.delegateToAgent(intent, message);

    // Store assistant response
    await this.memory.storeMessage(this.config.id, {
      role: 'assistant',
      content: response.message,
      timestamp: Date.now()
    });

    // Store in long-term memory (async, don't block)
    this.memory.storeConversation(
      this.config.id,
      this.config.userId,
      [{
        role: 'user',
        content: message,
        timestamp: Date.now()
      }, {
        role: 'assistant',
        content: response.message,
        timestamp: Date.now()
      }]
    ).catch(err => console.error('Failed to store conversation:', err));

    return response;
  }
}
```

## Deliverables
- [ ] Memory abstraction layer
- [ ] Working memory (KV) implementation
- [ ] Long-term memory (Vectorize) implementation
- [ ] Episodic memory (D1) schema and implementation
- [ ] Context window manager
- [ ] Integration with Coder Agent
- [ ] Auto-summarization
- [ ] Semantic search

## Acceptance Criteria
- [ ] Conversations persist across sessions
- [ ] Agents can recall context from 10+ turns ago
- [ ] Semantic search returns relevant past interactions
- [ ] Context window stays within model limits
- [ ] Memory cleanup works correctly
- [ ] All memory operations are traceable