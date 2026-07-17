# TASK 16-01: Agent Coder Foundation

## Objective
Build the main Coder Agent that understands user intent, decomposes tasks, and orchestrates specialized sub-agents.

## Prerequisites
- Plan 15 completed (Multi-Agent Orchestration)
- Cloudflare Agents SDK installed
- AI Gateway configured
- Vectorize enabled

## Implementation

### Step 1: Intent Parser

Create `platform-api/src/agents/coder/intent-parser.ts`:
```typescript
export enum IntentType {
  BUILD_APP = 'build_app',
  ADD_FEATURE = 'add_feature',
  FIX_BUG = 'fix_bug',
  DEPLOY = 'deploy',
  EXPLAIN = 'explain',
  OPTIMIZE = 'optimize',
  REVIEW = 'review',
  TEST = 'test'
}

export interface Intent {
  type: IntentType;
  confidence: number;
  entities: {
    appId?: number;
    framework?: string;
    features?: string[];
    error?: string;
    target?: string;
  };
  context: Record<string, any>;
}

export class IntentParser {
  constructor(private aiGateway: AIGateway) {}

  async parse(userMessage: string, conversationHistory: Message[]): Promise<Intent> {
    const prompt = this.buildPrompt(userMessage, conversationHistory);
    
    const response = await this.aiGateway.complete({
      model: 'claude-3-sonnet',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1000
    });

    return this.parseResponse(response.content);
  }

  private buildPrompt(message: string, history: Message[]): string {
    return `You are an intent parser for a code generation platform.

Analyze the user's message and classify their intent.

User message: "${message}"

Conversation history:
${history.map(m => `${m.role}: ${m.content}`).join('\n')}

Classify the intent into one of these types:
- BUILD_APP: User wants to create a new app/project
- ADD_FEATURE: User wants to add functionality to existing app
- FIX_BUG: User reported an error or issue
- DEPLOY: User wants to deploy or publish
- EXPLAIN: User wants explanation or documentation
- OPTIMIZE: User wants performance improvements
- REVIEW: User wants code review
- TEST: User wants to run tests

Respond in JSON format:
{
  "type": "intent_type",
  "confidence": 0.95,
  "entities": {
    "appId": 123,
    "framework": "sveltekit",
    "features": ["counter", "authentication"],
    "error": "error message if fixing bug",
    "target": "production"
  },
  "context": {}
}`;
  }

  private parseResponse(content: string): Intent {
    try {
      const parsed = JSON.parse(content);
      return {
        type: parsed.type,
        confidence: parsed.confidence || 0.8,
        entities: parsed.entities || {},
        context: parsed.context || {}
      };
    } catch {
      return {
        type: IntentType.EXPLAIN,
        confidence: 0.5,
        entities: {},
        context: {}
      };
    }
  }
}
```

### Step 2: Coder Agent Core

Create `platform-api/src/agents/coder/coder.agent.ts`:
```typescript
import { Agent } from '@cloudflare/agents';
import { IntentParser, Intent, IntentType } from './intent-parser';
import { AgentRegistry } from '../registry';
import { MemoryStore } from '../memory/memory-store';

interface CoderAgentConfig {
  id: string;
  userId: number;
  tenantId: number;
  env: Env;
}

export class CoderAgent extends Agent<CoderAgentConfig> {
  private intentParser: IntentParser;
  private agentRegistry: AgentRegistry;
  private memory: MemoryStore;
  private conversationHistory: Message[] = [];

  constructor(config: CoderAgentConfig) {
    super(config);
    this.intentParser = new IntentParser(config.env.AI_GATEWAY);
    this.agentRegistry = AgentRegistry.getInstance();
    this.memory = new MemoryStore(config.env);
  }

  async onMessage(message: string): Promise<AgentResponse> {
    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: Date.now()
    });

    // Parse intent
    const intent = await this.intentParser.parse(message, this.conversationHistory);
    
    // Store intent in memory
    await this.memory.storeIntent(this.config.id, intent);

    // Log reasoning
    console.log(`[CoderAgent] Intent: ${intent.type} (confidence: ${intent.confidence})`);

    // Delegate to appropriate agent
    const response = await this.delegateToAgent(intent, message);

    // Add response to history
    this.conversationHistory.push({
      role: 'assistant',
      content: response.message,
      timestamp: Date.now()
    });

    // Store conversation
    await this.memory.storeConversation(this.config.id, this.conversationHistory);

    return response;
  }

  private async delegateToAgent(intent: Intent, originalMessage: string): Promise<AgentResponse> {
    switch (intent.type) {
      case IntentType.BUILD_APP:
      case IntentType.ADD_FEATURE:
        return await this.invokeBuilderAgent(intent, originalMessage);

      case IntentType.FIX_BUG:
        return await this.invokeSupportAgent(intent, originalMessage);

      case IntentType.DEPLOY:
        return await this.invokeDeployerAgent(intent);

      case IntentType.EXPLAIN:
        return await this.invokeDocsAgent(intent, originalMessage);

      case IntentType.OPTIMIZE:
      case IntentType.REVIEW:
        return await this.invokeReviewerAgent(intent);

      case IntentType.TEST:
        return await this.invokeTesterAgent(intent);

      default:
        return {
          message: "I understand you want help with your app. Could you provide more details?",
          reasoning: 'Unclear intent',
          confidence: 0.5
        };
    }
  }

  private async invokeBuilderAgent(intent: Intent, message: string): Promise<AgentResponse> {
    const builder = this.agentRegistry.get('builder');
    if (!builder) {
      return {
        message: 'Builder agent is not available. Please try again later.',
        error: 'Agent not found',
        reasoning: 'BuilderAgent not registered'
      };
    }

    // Prepare builder input
    const builderInput = {
      appId: intent.entities.appId,
      prompt: message,
      framework: intent.entities.framework,
      features: intent.entities.features,
      context: await this.memory.getContext(this.config.id)
    };

    // Invoke builder
    const result = await builder.executeWithRetry(builderInput);

    // Generate explanation
    const explanation = await this.generateExplanation(
      'builder',
      result,
      'I generated your app. Here are the files that were created:'
    );

    return {
      message: explanation,
      result: result.output,
      reasoning: `Invoked BuilderAgent with: ${JSON.stringify(builderInput)}`,
      confidence: result.success ? 0.9 : 0.3,
      nextSteps: result.success ? ['review', 'test', 'deploy'] : []
    };
  }

  private async invokeSupportAgent(intent: Intent, message: string): Promise<AgentResponse> {
    const support = this.agentRegistry.get('support');
    if (!support) {
      return {
        message: 'Support agent is not available.',
        error: 'Agent not found',
        reasoning: 'SupportAgent not registered'
      };
    }

    const result = await support.executeWithRetry({
      error: intent.entities.error,
      context: message,
      conversationHistory: this.conversationHistory
    });

    return {
      message: result.output?.explanation || 'I analyzed the issue but could not find a solution.',
      result: result.output,
      reasoning: `Invoked SupportAgent for error: ${intent.entities.error}`,
      confidence: result.success ? 0.85 : 0.4,
      suggestions: result.output?.suggestions
    };
  }

  private async invokeDeployerAgent(intent: Intent): Promise<AgentResponse> {
    const deployer = this.agentRegistry.get('deployer');
    if (!deployer) {
      return {
        message: 'Deployer agent is not available.',
        error: 'Agent not found',
        reasoning: 'DeployerAgent not registered'
      };
    }

    const result = await deployer.executeWithRetry({
      appId: intent.entities.appId,
      environment: intent.entities.target || 'preview'
    });

    return {
      message: result.success
        ? `Deployed successfully! Preview URL: ${result.output.url}`
        : `Deployment failed: ${result.error}`,
      result: result.output,
      reasoning: `Invoked DeployerAgent for ${intent.entities.target} deploy`,
      confidence: result.success ? 0.9 : 0.3
    };
  }

  private async invokeDocsAgent(intent: Intent, message: string): Promise<AgentResponse> {
    const docs = this.agentRegistry.get('docs');
    if (!docs) {
      return {
        message: 'Docs agent is not available.',
        error: 'Agent not found',
        reasoning: 'DocsAgent not registered'
      };
    }

    const result = await docs.executeWithRetry({
      query: message,
      context: intent.context
    });

    return {
      message: result.output?.answer || 'I could not find relevant documentation.',
      result: result.output,
      reasoning: `Invoked DocsAgent for: ${message}`,
      confidence: result.success ? 0.8 : 0.4,
      sources: result.output?.sources
    };
  }

  private async invokeReviewerAgent(intent: Intent): Promise<AgentResponse> {
    const reviewer = this.agentRegistry.get('reviewer');
    if (!reviewer) {
      return {
        message: 'Reviewer agent is not available.',
        error: 'Agent not found',
        reasoning: 'ReviewerAgent not registered'
      };
    }

    const result = await reviewer.executeWithRetry({
      appId: intent.entities.appId,
      type: intent.type
    });

    return {
      message: this.formatReviewResult(result.output),
      result: result.output,
      reasoning: `Invoked ReviewerAgent for ${intent.type}`,
      confidence: result.success ? 0.85 : 0.4
    };
  }

  private async invokeTesterAgent(intent: Intent): Promise<AgentResponse> {
    const tester = this.agentRegistry.get('tester');
    if (!tester) {
      return {
        message: 'Tester agent is not available.',
        error: 'Agent not found',
        reasoning: 'TesterAgent not registered'
      };
    }

    const result = await tester.executeWithRetry({
      appId: intent.entities.appId
    });

    return {
      message: this.formatTestResult(result.output),
      result: result.output,
      reasoning: `Invoked TesterAgent`,
      confidence: result.success ? 0.85 : 0.4
    };
  }

  private async generateExplanation(agent: string, result: any, prefix: string): Promise<string> {
    // Use AI to generate human-readable explanation
    const prompt = `${prefix}

Agent: ${agent}
Result: ${JSON.stringify(result, null, 2)}

Generate a concise, user-friendly explanation (max 3 sentences).
Focus on what was accomplished and what the user can do next.`;

    const explanation = await this.config.env.AI_GATEWAY.complete({
      model: 'claude-3-haiku',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 200
    });

    return explanation.content;
  }

  private formatReviewResult(review: any): string {
    const score = review.score || 0;
    const emoji = score >= 80 ? '✅' : score >= 60 ? '⚠️' : '❌';
    
    return `${emoji} Review completed with score: ${score}/100\n\n` +
           `Issues found: ${review.issues?.length || 0}\n` +
           (review.issues?.length > 0
            ? `Main issues:\n${review.issues.slice(0, 3).map(i => `- ${i}`).join('\n')}`
            : 'No critical issues found.');
  }

  private formatTestResult(test: any): string {
    return `🧪 Test Results:\n\n` +
           `Total: ${test.total}\n` +
           `Passed: ${test.passed} ✅\n` +
           `Failed: ${test.failed} ❌\n` +
           `Duration: ${test.duration}ms`;
  }

  async getConversationHistory(): Promise<Message[]> {
    return this.conversationHistory;
  }

  async clearHistory(): Promise<void> {
    this.conversationHistory = [];
    await this.memory.clearSession(this.config.id);
  }
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface AgentResponse {
  message: string;
  result?: any;
  reasoning: string;
  confidence: number;
  error?: string;
  nextSteps?: string[];
  suggestions?: string[];
  sources?: any[];
}
```

### Step 3: Memory Store

Create `platform-api/src/agents/coder/memory-store.ts`:
```typescript
import { AIClassifier } from '@cloudflare/ai-classifier';

export class MemoryStore {
  constructor(private env: Env) {}

  async storeIntent(sessionId: string, intent: Intent): Promise<void> {
    await this.env.KV.put(
      `intent:${sessionId}:${Date.now()}`,
      JSON.stringify(intent),
      { expirationTtl: 86400 } // 24 hours
    );
  }

  async storeConversation(sessionId: string, messages: Message[]): Promise<void> {
    // Store in KV for short-term
    await this.env.KV.put(
      `conversation:${sessionId}`,
      JSON.stringify(messages),
      { expirationTtl: 86400 }
    );

    // Store in Vectorize for long-term semantic search
    for (const msg of messages) {
      const embedding = await this.generateEmbedding(msg.content);
      await this.env.VECTORIZE.insert([{
        id: `msg:${sessionId}:${msg.timestamp}`,
        values: embedding,
        metadata: {
          sessionId,
          role: msg.role,
          timestamp: msg.timestamp,
          text: msg.content.slice(0, 500) // Store first 500 chars for retrieval
        }
      }]);
    }
  }

  async getContext(sessionId: string, limit: number = 20): Promise<Message[]> {
    // Get recent messages from KV
    const conversationJson = await this.env.KV.get(`conversation:${sessionId}`);
    if (!conversationJson) return [];

    const messages: Message[] = JSON.parse(conversationJson);
    return messages.slice(-limit);
  }

  async searchSimilar(sessionId: string, query: string, topK: number = 5): Promise<Message[]> {
    // Generate embedding for query
    const queryEmbedding = await this.generateEmbedding(query);

    // Search Vectorize
    const results = await this.env.VECTORIZE.query(queryEmbedding, {
      topK,
      filter: { sessionId }
    });

    // Retrieve full messages
    const messages: Message[] = [];
    for (const match of results.matches) {
      const msgJson = await this.env.KV.get(`message:${match.id}`);
      if (msgJson) {
        messages.push(JSON.parse(msgJson));
      }
    }

    return messages;
  }

  async clearSession(sessionId: string): Promise<void> {
    // Delete from KV
    await this.env.KV.delete(`conversation:${sessionId}`);

    // Delete from Vectorize (mark as deleted)
    await this.env.VECTORIZE.deleteByIds([`msg:${sessionId}:*`]);
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.env.AI_GATEWAY.embed({
      model: 'text-embedding-3-small',
      input: text
    });

    return response.data[0].embedding;
  }
}
```

### Step 4: Register Coder Agent

Update `platform-api/src/agents/registry.ts`:
```typescript
import { CoderAgent } from './coder/coder.agent';

export class AgentRegistry {
  private agents: Map<string, BaseAgent> = new Map();
  private coderAgents: Map<string, CoderAgent> = new Map();

  registerCoder(userId: number, tenantId: number): CoderAgent {
    const coder = new CoderAgent({
      id: `coder-${userId}-${Date.now()}`,
      userId,
      tenantId,
      env: this.env
    });

    this.coderAgents.set(coder.id, coder);
    return coder;
  }

  getCoder(id: string): CoderAgent | undefined {
    return this.coderAgents.get(id);
  }
}
```

### Step 5: API Endpoint

Create `platform-api/src/routes/coder.ts`:
```typescript
import { Hono } from 'hono';
import { AgentRegistry } from '../../src/agents/registry';

export const coderRoutes = new Hono();

coderRoutes.post('/chat', async (c) => {
  const userId = c.get('userId');
  const { message, sessionId } = await c.req.json();

  const registry = AgentRegistry.getInstance();
  let coderAgent = registry.getCoder(sessionId);

  if (!coderAgent) {
    coderAgent = registry.registerCoder(userId, c.get('tenantId'));
  }

  const response = await coderAgent.onMessage(message);

  return c.json({
    message: response.message,
    reasoning: response.reasoning,
    confidence: response.confidence,
    result: response.result,
    nextSteps: response.nextSteps,
    suggestions: response.suggestions
  });
});

coderRoutes.get('/chat/history', async (c) => {
  const sessionId = c.req.query('sessionId');

  if (!sessionId) {
    return c.json({ error: 'sessionId required' }, 400);
  }

  const registry = AgentRegistry.getInstance();
  const coderAgent = registry.getCoder(sessionId);

  if (!coderAgent) {
    return c.json({ history: [] });
  }

  const history = await coderAgent.getConversationHistory();
  return c.json({ history });
});

coderRoutes.delete('/chat/history', async (c) => {
  const sessionId = c.req.query('sessionId');

  if (!sessionId) {
    return c.json({ error: 'sessionId required' }, 400);
  }

  const registry = AgentRegistry.getInstance();
  const coderAgent = registry.getCoder(sessionId);

  if (coderAgent) {
    await coderAgent.clearHistory();
  }

  return c.json({ success: true });
});
```

## Deliverables
- [ ] IntentParser for NL understanding
- [ ] CoderAgent with reasoning loop
- [ ] MemoryStore (KV + Vectorize)
- [ ] Agent registry updates
- [ ] Chat API endpoints
- [ ] Conversation persistence

## Acceptance Criteria
- [ ] Coder Agent parses intents with 90%+ accuracy
- [ ] Agent delegates to correct sub-agent
- [ ] Conversation history persists across sessions
- [ ] Context retrieved from past conversations
- [ ] Reasoning explained to user
- [ ] API endpoints functional