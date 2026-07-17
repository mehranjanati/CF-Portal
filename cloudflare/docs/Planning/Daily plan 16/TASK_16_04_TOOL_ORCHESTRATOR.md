# TASK 16-04: Tool Orchestrator Unified Surface

## Objective
Expose all Cloudflare tools through a unified, typed interface that agents can use with permission-based access control.

## Prerequisites
- TASK 16-01 completed (Agent Coder Foundation)
- TASK 16-02 completed (Sub-Agent Specialization)
- Tool implementations from Plan 15
- Permission system defined

## Tool Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Tool Orchestrator                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────┐                   │
│  │  Tool Registry                       │                   │
│  │  - Registration                      │                   │
│  │  - Discovery                         │                   │
│  │  - Permission mapping                │                   │
│  └──────────────────────────────────────┘                   │
│                                                             │
│  ┌──────────────────────────────────────┐                   │
│  │  Permission Manager                  │                   │
│  │  - Agent → Tool mapping              │                   │
│  │  - Read-only vs write                │                   │
│  │  - Rate limits                       │                   │
│  └──────────────────────────────────────┘                   │
│                                                             │
│  ┌──────────────────────────────────────┐                   │
│  │  Tool Composer                       │                   │
│  │  - Multi-step composition            │                   │
│  │  - Codemode execution                 │                   │
│  │  - Result aggregation                 │                   │
│  └──────────────────────────────────────┘                   │
│                                                             │
│  ┌──────────────────────────────────────┐                   │
│  │  Tool Implementations (15+)          │                   │
│  │  - Core Tools                        │                   │
│  │  - Integration Tools                 │                   │
│  │  - Execution Tools                   │                   │
│  │  - Intelligence Tools                │                   │
│  └──────────────────────────────────────┘                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Tool Specifications

### 4.1 Core Tools

#### AppsTool
**Purpose:** CRUD operations for apps/projects

```typescript
interface AppsTool extends Tool {
  name: 'apps';
  
  operations: {
    get_app: { appId: number } => Promise<App>;
    create_app: { name: string; framework: string } => Promise<App>;
    update_app: { appId: number; updates: Partial<App> } => Promise<App>;
    list_apps: { userId: number } => Promise<App[]>;
  }
}
```

#### TemplatesTool
**Purpose:** Discover and select templates

```typescript
interface TemplatesTool extends Tool {
  name: 'templates';
  
  operations: {
    list: { category?: string } => Promise<Template[]>;
    get: { templateId: string } => Promise<Template>;
    resolve_best_fit: { requirements: string } => Promise<Template>;
  }
}
```

#### GraphTool
**Purpose:** Graph validation and compilation

```typescript
interface GraphTool extends Tool {
  name: 'graph';
  
  operations: {
    validate: { graph: GraphIR } => Promise<ValidationResult>;
    compile: { graph: GraphIR } => Promise<CompiledWorkflow>;
    summarize: { graph: GraphIR } => Promise<GraphSummary>;
  }
}
```

#### ArtifactsTool
**Purpose:** File read/write in R2

```typescript
interface ArtifactsTool extends Tool {
  name: 'artifacts';
  
  operations: {
    read: { path: string } => Promise<{ content: string }>;
    write: { path: string; content: string } => Promise<void>;
    list: { prefix?: string } => Promise<{ files: string[] }>;
    delete: { path: string } => Promise<void>;
  }
}
```

---

### 4.2 Integration Tools

#### GitHubTool
**Purpose:** GitHub operations

```typescript
interface GitHubTool extends Tool {
  name: 'github';
  
  operations: {
    create_branch: {
      owner: string;
      repo: string;
      branch: string;
      baseBranch: string;
    } => Promise<Branch>;
    
    commit_file: {
      owner: string;
      repo: string;
      branch: string;
      filePath: string;
      content: string;
      message: string;
    } => Promise<Commit>;
    
    create_pr: {
      owner: string;
      repo: string;
      branch: string;
      message: string;
    } => Promise<PullRequest>;
    
    get_status: {
      owner: string;
      repo: string;
      branch: string;
    } => Promise<RepoStatus>;
  }
}
```

#### CloudflareTool
**Purpose:** Cloudflare API operations

```typescript
interface CloudflareTool extends Tool {
  name: 'cloudflare';
  
  operations: {
    deploy_worker: {
      name: string;
      script: string;
    } => Promise<Deployment>;
    
    create_bucket: { name: string } => Promise<R2Bucket>;
    update_dns: { zoneId: string; record: DNSRecord } => Promise<DNSRecord>;
    get_analytics: { since: string } => Promise<Analytics>;
  }
}
```

#### DeploymentsTool
**Purpose:** Deployment management

```typescript
interface DeploymentsTool extends Tool {
  name: 'deployments';
  
  operations: {
    list: { appId: number } => Promise<Deployment[]>;
    get: { deploymentId: string } => Promise<Deployment>;
    get_status: { deploymentId: string } => Promise<DeploymentStatus>;
    summarize_failures: { appId: number } => Promise<FailureSummary>;
  }
}
```

---

### 4.3 Execution Tools

#### TerminalTool
**Purpose:** Shell command execution

```typescript
interface TerminalTool extends Tool {
  name: 'terminal';
  
  operations: {
    exec: {
      command: string;
      args?: string[];
      cwd?: string;
      timeout?: number;
    } => Promise<CommandResult>;
  }
  
  permissions: ['tester', 'builder'];
}
```

#### BrowserTool
**Purpose:** Browser automation

```typescript
interface BrowserTool extends Tool {
  name: 'browser';
  
  operations: {
    navigate: { url: string } => Promise<void>;
    click: { selector: string } => Promise<void>;
    type: { selector: string; text: string } => Promise<void>;
    screenshot: { fullPage?: boolean } => Promise<{ path: string }>;
    evaluate: { script: string } => Promise<any>;
  }
  
  permissions: ['tester', 'reviewer'];
}
```

#### SandboxTool
**Purpose:** Code execution in sandbox

```typescript
interface SandboxTool extends Tool {
  name: 'sandbox';
  
  operations: {
    execute: {
      code: string;
      language: 'typescript' | 'javascript';
      timeout?: number;
    } => Promise<ExecutionResult>;
    
    preview: {
      appId: number;
      artifactPath: string;
    } => Promise<{ url: string }>;
  }
  
  permissions: ['builder', 'tester'];
}
```

---

### 4.4 Intelligence Tools

#### DocsTool
**Purpose:** Cloudflare documentation retrieval

```typescript
interface DocsTool extends Tool {
  name: 'docs';
  
  operations: {
    search: { query: string; topK?: number } => Promise<DocResult[]>;
    explain: { topic: string } => Promise<Explanation>;
    recommend: { context: string } => Promise<Recommendation[]>;
  }
  
  permissions: ['docs', 'coder'];
}
```

#### SearchTool
**Purpose:** Semantic search

```typescript
interface SearchTool extends Tool {
  name: 'search';
  
  operations: {
    semantic: {
      query: string;
      index: string;
      topK?: number;
      filter?: Record<string, any>;
    } => Promise<SearchResult[]>;
    
    similar: {
      itemId: string;
      index: string;
    } => Promise<SearchResult[]>;
  }
  
  permissions: ['docs', 'support', 'coder'];
}
```

#### AITool
**Purpose:** LLM invocation

```typescript
interface AITool extends Tool {
  name: 'ai';
  
  operations: {
    complete: {
      model: string;
      messages: Message[];
      temperature?: number;
      max_tokens?: number;
    } => Promise<Completion>;
    
    embed: {
      model: string;
      input: string | string[];
    } => Promise<EmbeddingResult>;
  }
  
  permissions: ['coder', 'builder', 'reviewer', 'tester', 'docs', 'support'];
}
```

---

## Implementation

### Step 1: Base Tool Interface

Create `platform-api/src/tools/base.ts`:
```typescript
export interface ToolContext {
  env: Env;
  agentId: string;
  sessionId: string;
  requestId: string;
}

export interface ToolResult<T = any> {
  success: boolean;
  output?: T;
  error?: string;
  logs?: string[];
  metadata: {
    duration: number;
    tokensUsed?: number;
    retries?: number;
  };
}

export interface Tool {
  name: string;
  description: string;
  version: string;
  
  parameters: {
    input: ZodSchema;
    output: ZodSchema;
  };
  
  permissions: string[];
  
  execute(params: any, context: ToolContext): Promise<ToolResult>;
}

export abstract class BaseTool implements Tool {
  abstract name: string;
  abstract description: string;
  abstract version: string;
  abstract permissions: string[];
  
  abstract parameters: {
    input: ZodSchema;
    output: ZodSchema;
  };
  
  abstract execute(params: any, context: ToolContext): Promise<ToolResult>;
  
  protected validateInput(params: any): any {
    return this.parameters.input.parse(params);
  }
  
  protected validateOutput(output: any): any {
    return this.parameters.output.parse(output);
  }
  
  protected async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Tool timeout')), timeoutMs)
      )
    ]);
  }
}
```

### Step 2: Tool Registry

Create `platform-api/src/tools/registry.ts`:
```typescript
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private permissions: Map<string, Set<string>> = new Map();

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
    
    for (const perm of tool.permissions) {
      if (!this.permissions.has(perm)) {
        this.permissions.set(perm, new Set());
      }
      this.permissions.get(perm)!.add(tool.name);
    }
    
    console.log(`[ToolRegistry] Registered: ${tool.name}`);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getToolsForAgent(agentType: string): Tool[] {
    const allowedTools = this.permissions.get(agentType);
    if (!allowedTools) return [];
    
    return Array.from(allowedTools)
      .map(name => this.tools.get(name))
      .filter((tool): tool is Tool => tool !== undefined);
  }

  hasPermission(agentType: string, toolName: string): boolean {
    const allowedTools = this.permissions.get(agentType);
    return allowedTools?.has(toolName) || false;
  }

  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  async initialize(env: Env): Promise<void> {
    // Register all 15 tools
    this.register(new AppsTool(env));
    this.register(new TemplatesTool(env));
    this.register(new GraphTool(env));
    this.register(new ArtifactsTool(env));
    this.register(new GitHubTool(env));
    this.register(new CloudflareTool(env));
    this.register(new DeploymentsTool(env));
    this.register(new TerminalTool(env));
    this.register(new BrowserTool(env));
    this.register(new SandboxTool(env));
    this.register(new DocsTool(env));
    this.register(new SearchTool(env));
    this.register(new AITool(env));
    
    console.log(`[ToolRegistry] Initialized ${this.tools.size} tools`);
  }
}

export const toolRegistry = new ToolRegistry();
```

### Step 3: Tool Composer

Create `platform-api/src/tools/composer.ts`:
```typescript
export interface ComposedTool extends Tool {
  name: string;
  steps: Array<{
    tool: string;
    operation: string;
    input: any;
  }>;
}

export class ToolComposer {
  private registry: ToolRegistry;

  constructor(registry: ToolRegistry) {
    this.registry = registry;
  }

  compose(name: string, steps: ComposedTool['steps']): ComposedTool {
    return {
      name,
      description: `Composed tool: ${steps.map(s => s.tool).join(' → ')}`,
      version: '1.0.0',
      permissions: [], // Inherit from component tools
      parameters: {
        input: z.object({}),
        output: z.object({})
      },
      
      async execute(params: any, context: ToolContext): Promise<ToolResult> {
        const results: any[] = [];
        
        for (const step of steps) {
          const tool = this.registry.get(step.tool);
          if (!tool) {
            return {
              success: false,
              error: `Tool not found: ${step.tool}`,
              metadata: { duration: 0 }
            };
          }
          
          // Merge params
          const stepParams = { ...step.input, ...params };
          
          // Execute
          const result = await tool.execute(stepParams, context);
          results.push(result);
          
          if (!result.success) {
            return {
              success: false,
              error: `Step failed: ${step.tool}: ${result.error}`,
              metadata: { duration: 0 }
            };
          }
        }
        
        return {
          success: true,
          output: results[results.length - 1]?.output,
          logs: results.flatMap(r => r.logs || []),
          metadata: {
            duration: results.reduce((sum, r) => sum + r.metadata.duration, 0)
          }
        };
      }
    };
  }
  
  // Predefined compositions
  createBuildPipeline(registry: ToolRegistry): ComposedTool {
    return this.compose('build_pipeline', [
      { tool: 'graph', operation: 'compile', input: {} },
      { tool: 'artifacts', operation: 'write', input: {} },
      { tool: 'github', operation: 'commit_file', input: {} },
      { tool: 'deployments', operation: 'list', input: {} }
    ]);
  }
}
```

### Step 4: Permission Matrix

Create `platform-api/src/tools/permissions.ts`:
```typescript
export const PERMISSION_MATRIX: Record<string, string[]> = {
  coder: [
    'apps', 'templates', 'graph', 'artifacts', 'github',
    'cloudflare', 'deployments', 'docs', 'search', 'ai'
  ],
  
  builder: [
    'apps', 'templates', 'graph', 'artifacts', 'github',
    'ai', 'terminal', 'sandbox'
  ],
  
  tester: [
    'apps', 'artifacts', 'terminal', 'browser', 'sandbox'
  ],
  
  reviewer: [
    'apps', 'artifacts', 'browser', 'search'
  ],
  
  deployer: [
    'apps', 'artifacts', 'github', 'cloudflare', 'deployments'
  ],
  
  docs: [
    'docs', 'search', 'ai'
  ],
  
  support: [
    'apps', 'deployments', 'search', 'ai', 'artifacts'
  ]
};

export class PermissionManager {
  check(agentType: string, toolName: string): boolean {
    const allowedTools = PERMISSION_MATRIX[agentType] || [];
    return allowedTools.includes(toolName);
  }
  
  getReadOnlyTools(): string[] {
    return ['docs', 'search', 'apps', 'deployments', 'graph'];
  }
  
  getWriteTools(): string[] {
    return ['artifacts', 'github', 'cloudflare', 'terminal', 'sandbox'];
  }
}
```

### Step 5: Tool Implementations

Create individual tool files in `platform-api/src/tools/implementations/`:
- `apps.ts`
- `templates.ts`
- `graph.ts`
- `artifacts.ts`
- `github.ts`
- `cloudflare.ts`
- `deployments.ts`
- `terminal.ts`
- `browser.ts`
- `sandbox.ts`
- `docs.ts`
- `search.ts`
- `ai.ts`

Each tool follows the `BaseTool` pattern with typed input/output schemas.

---

## Deliverables
- [ ] Base tool interface and abstract class
- [ ] Tool registry with permission mapping
- [ ] Tool composer for multi-step operations
- [ ] Permission matrix for all agents
- [ ] 15 tool implementations
- [ ] Tool discovery API
- [ ] Tool execution logging

## Acceptance Criteria
- [ ] All 15 tools registered and functional
- [ ] Agents can only access permitted tools
- [ ] Tool compositions work end-to-end
- [ ] Permission checks prevent unauthorized access
- [ ] Tool execution is logged with distributed tracing
- [ ] Failed tools return structured errors