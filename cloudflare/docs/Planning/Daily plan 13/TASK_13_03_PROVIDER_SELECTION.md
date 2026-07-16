# TASK 13-03: Provider Selection & Environment Configuration

## Objective
Implement dynamic provider selection so the system can switch between AIGatewayProvider (production), CFAIProvider (local dev), and MockProvider (testing) based on environment configuration.

## Files to Modify

### 1. `platform-api/src/modules/builder/providers/index.ts` — Add Factory

**Current state:** Only exports `ToolCall` interface.

**Target state:** Export a factory function that creates the appropriate provider.

```typescript
export interface ToolCall {
  id: string;
  name: string;
  arguments: any;
}

export interface ProviderGenerateResult {
  type: 'final' | 'tool_calls';
  summary?: string;
  files?: {
    path: string;
    action: 'create' | 'update' | 'delete';
    content?: string;
  }[];
  nextActions?: string[];
  tool_calls?: ToolCall[];
}

export interface ProviderEvent {
  type: 'tool_call' | 'tool_result' | 'thought' | 'status_change' | 'generation_result' | 'error';
  data: any;
}

export interface ProviderAdapter {
  name: string;
  generate(
    prompt: string,
    context?: any,
    onEvent?: (event: ProviderEvent) => Promise<void>
  ): Promise<ProviderGenerateResult>;
}

// --- NEW: Provider Factory ---

export type ProviderType = 'ai-gateway' | 'cloudflare-ai' | 'mock';

export interface ProviderConfig {
  type: ProviderType;
  gatewayUrl?: string;
  gatewayToken?: string;
  primaryModel?: string;
  fallbackModel?: string;
  aiBinding?: any;
}

export function createProvider(config: ProviderConfig): ProviderAdapter {
  switch (config.type) {
    case 'ai-gateway':
      if (!config.gatewayUrl || !config.gatewayToken) {
        console.warn('[ProviderFactory] AI Gateway configured but missing credentials. Falling back to Cloudflare AI.');
        return createCFAIProvider(config.aiBinding);
      }
      return new AIGatewayProvider(
        config.gatewayUrl,
        config.gatewayToken,
        config.primaryModel || 'gpt-4o-mini',
        config.fallbackModel || '@cf/meta/llama-3.1-70b-instruct'
      );
    
    case 'cloudflare-ai':
      return createCFAIProvider(config.aiBinding);
    
    case 'mock':
    default:
      return new MockProvider();
  }
}

function createCFAIProvider(aiBinding?: any): ProviderAdapter {
  if (aiBinding) {
    return new CFAIProvider(aiBinding);
  }
  // Fallback mock if no AI binding
  return new MockProvider();
}

// --- NEW: Mock Provider for Testing ---
export class MockProvider implements ProviderAdapter {
  name = 'mock';
  
  async generate(prompt: string, context?: any, onEvent?: (event: ProviderEvent) => Promise<void>): Promise<ProviderGenerateResult> {
    console.log('[MockProvider] Generating mock response');
    
    if (onEvent) {
      await onEvent({ type: 'thought', data: 'Mock provider simulating response...' });
    }
    
    return {
      type: 'final',
      summary: 'Mock generated response (no real AI connected)',
      files: [
        {
          path: 'src/routes/+page.svelte',
          action: 'create',
          content: '<script>\n  let name = "world";\n</script>\n\n<h1>Hello {name}!</h1>'
        }
      ],
      nextActions: ['Configure AI Gateway for real LLM responses']
    };
  }
}
```

### 2. `platform-api/src/modules/builder/service.ts` — Use Factory

**Change the constructor** to accept a `ProviderAdapter` directly instead of creating `CFAIProvider` internally:

```typescript
export class BuilderService {
  private db: D1Database;
  private provider: ProviderAdapter;
  private sessions: SessionManager;
  private prompts: PromptManager;
  private generations: GenerationManager;
  private history: HistoryManager;
  private streamer: DurableObjectNamespace;
  private fileSystem: FileSystemTools;
  private terminal: TerminalTools;
  private github: GitHubIntegrationService;

  constructor(
    db: D1Database,
    ai?: any,
    streamer?: DurableObjectNamespace,
    env?: any  // NEW: environment variables for provider selection
  ) {
    this.db = db;
    this.sessions = new SessionManager(db);
    this.prompts = new PromptManager(db);
    this.generations = new GenerationManager(db);
    this.history = new HistoryManager(db);
    this.streamer = streamer!;
    this.fileSystem = new FileSystemTools(process.cwd());
    this.terminal = new TerminalTools(process.cwd());
    this.github = new GitHubIntegrationService();

    // Determine provider based on environment
    if (env?.AI_GATEWAY_TOKEN && env?.AI_GATEWAY_URL) {
      console.log('[BuilderService] Using AIGatewayProvider');
      this.provider = new AIGatewayProvider(
        env.AI_GATEWAY_URL,
        env.AI_GATEWAY_TOKEN,
        env.AI_GATEWAY_PRIMARY_MODEL || 'gpt-4o-mini',
        env.AI_GATEWAY_FALLBACK_MODEL || '@cf/meta/llama-3.1-70b-instruct'
      );
    } else if (ai) {
      console.log('[BuilderService] Using CFAIProvider (Workers AI)');
      this.provider = new CFAIProvider(ai);
    } else {
      console.log('[BuilderService] Using MockProvider');
      this.provider = new MockProvider();
    }
  }
  // ... rest of the class remains unchanged
}
```

### 3. `platform-api/src/modules/builder/routes.ts` — Pass env

**Update route handlers** to pass environment variables (env) to the BuilderService constructor.

```typescript
// Before:
const service = new BuilderService(db, c.env.AI, c.env.STREAMER);

// After:
const service = new BuilderService(db, c.env.AI, c.env.STREAMER, c.env);
```

### 4. `platform-api/wrangler.toml` — Add Gateway Secrets

```toml
name = "platform-api"
main = "src/index.ts"
compatibility_date = "2024-09-23"
compatibility_flags = [ "nodejs_compat" ]

[[d1_databases]]
binding = "DB"
database_name = "nexus-db"
database_id = "f15e09e0-564f-48f1-a64f-1a7fe81d3286"

[ai]
binding = "AI"

[[durable_objects.bindings]]
name = "STREAMER"
class_name = "SessionStreamer"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["SessionStreamer"]

# --- NEW: AI Gateway Configuration ---
[vars]
AI_GATEWAY_URL = "https://gateway.ai.cloudflare.com/v1/{account_id}/nexus-ai-gateway"
AI_GATEWAY_PRIMARY_MODEL = "gpt-4o-mini"
AI_GATEWAY_FALLBACK_MODEL = "@cf/meta/llama-3.1-70b-instruct"
```

Then add the secret:
```bash
echo "<your-gateway-api-key>" | wrangler secret put AI_GATEWAY_TOKEN
```

### 5. `platform-api/.dev.vars` — Local Development

Create new file:
```env
# AI Gateway Configuration
AI_GATEWAY_URL=https://gateway.ai.cloudflare.com/v1/{account_id}/nexus-ai-gateway
AI_GATEWAY_TOKEN=your_gateway_api_key_here
AI_GATEWAY_PRIMARY_MODEL=gpt-4o-mini
AI_GATEWAY_FALLBACK_MODEL=@cf/meta/llama-3.1-70b-instruct
```

## Environment Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `AI_GATEWAY_URL` | For Gateway | Full URL to Cloudflare AI Gateway |
| `AI_GATEWAY_TOKEN` | For Gateway | API key for Gateway authentication |
| `AI_GATEWAY_PRIMARY_MODEL` | No (default: gpt-4o-mini) | Primary LLM model to use |
| `AI_GATEWAY_FALLBACK_MODEL` | No (default: Llama 3.1 70B) | Fallback model via Workers AI |
| `AI` (binding) | For Workers AI | Cloudflare Workers AI binding |

## Provider Selection Priority

```
1. AI_GATEWAY_TOKEN + AI_GATEWAY_URL present  → AIGatewayProvider (Production)
2. AI binding present                           → CFAIProvider (Local/Wrangler dev)
3. Neither present                              → MockProvider (Testing)
```

## Acceptance Criteria
- [ ] Factory function creates correct provider based on env
- [ ] Routes pass env to BuilderService
- [ ] wrangler.toml has Gateway vars documented
- [ ] .dev.vars created for local development
- [ ] All existing functionality continues to work with MockProvider/CFAIProvider
- [ ] When AI_GATEWAY_TOKEN is set, real LLM calls are made