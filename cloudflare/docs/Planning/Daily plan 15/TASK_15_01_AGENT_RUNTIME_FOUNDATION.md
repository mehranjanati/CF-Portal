# TASK 15-01: Agent Runtime Foundation (Workflows-Native)

## Objective
Set up the base agent runtime using Cloudflare Agents SDK that integrates seamlessly with Cloudflare Workflows for orchestration.

## Prerequisites
- Plan 14 completed (testing & error handling)
- Cloudflare Agents SDK installed
- Cloudflare Workflows enabled

## Implementation

### Step 1: Install Dependencies

```bash
cd cloudflare/platform-api
bun add @cloudflare/agents @cloudflare/workflows
bun add -D @cloudflare/vitest-pool-workers
```

### Step 2: Configure wrangler.toml

Add to `platform-api/wrangler.toml`:
```toml
# Agents SDK for agent runtime
[[durable_objects.bindings]]
name = "AGENT_SESSIONS"
class_name = "AgentSession"
script_name = "platform-api"

# Workflows for orchestration
[[workflows]]
name = "app-build-workflow"
binding = "APP_BUILD_WORKFLOW"
script_name = "platform-api"
class_name = "AppBuildWorkflow"

[[migrations]]
tag = "v1"
new_classes = ["AgentSession", "AppBuildWorkflow"]
```

### Step 3: Base Agent Class

Create `platform-api/src/agents/base.agent.ts`:
```typescript
import { Agent } from '@cloudflare/agents';

export interface AgentConfig {
  id: string;
  type: 'builder' | 'reviewer' | 'tester' | 'deployer';
imana}

export abstract class BaseAgent {
  protected config: AgentConfig;
  protected env: Env;
  protected state: AgentState;

  constructor(config: AgentConfig, env: Env) {
    this.config = config;
    this.env = env;
    this.state = {
      id: config.id,
      type: config.type,
      status: 'idle',
      createdAt: Date.now(),
      lastActive: Date.now()
    };
  }

  abstract execute(input: any): Promise<AgentResult>;

  async initialize(): Promise<void> {
    console.log(`[Agent ${this.config.id}] Initializing ${this.config.type} agent`);
    await this.persistState();
  }

  async executeWithRetry(input: any, maxRetries = 3): Promise<AgentResult> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.updateStatus('running');
        const startTime = Date.now();
        
        const result = await this.execute(input);
        
        const duration = Date.now() - startTime;
        await this.recordMetric('execution_time', duration);
        
        this.updateStatus('completed');
        return result;
      } catch (error) {
        console.error(`[Agent ${this.config.id}] Attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          this.updateStatus('failed');
          throw error;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    
    throw new Error('Max retries exceeded');
  }

  protected updateStatus(status: AgentState['status']): void {
    this.state.status = status;
    this.state.lastActive = Date.now();
    this.persistState();
  }

  private async persistState(): Promise<void> {
    await this.env.AGENT_STATE.put(`agent:${this.config.id}`, JSON.stringify(this.state));
  }

  private async recordMetric(name: string, value: number): Promise<void> {
    await this.env.METRICS.put(
      `metric:${this.config.type}:${name}:${Date.now()}`,
      JSON.stringify({ value, agentId: this.config.id })
    );
  }

  getState(): AgentState {
    return { ...this.state };
  }
}

interface AgentState {
  id: string;
  type: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  createdAt: number;
  lastActive: number;
}

interface AgentResult {
  success: boolean;
  output?: any;
  error?: string;
  logs?: string[];
}
```

### Step 4: Concrete Agent Implementations

Create `platform-api/src/agents/builder.agent.ts`:
```typescript
import { BaseAgent } from './base.agent';
import { z } from 'zod';

const BuilderInputSchema = z.object({
  appId: z.number(),
  prompt: z.string(),
  context: z.object({
    framework: z.enum(['sveltekit', 'nextjs', 'astro']).optional(),
    existingFiles: z.array(z.string()).optional()
  }).optional()
});

export class BuilderAgent extends BaseAgent {
  constructor(env: Env, id: string) {
    super({ id, type: 'builder' }, env);
  }

  async execute(input: z.infer<typeof BuilderInputSchema>): Promise<AgentResult> {
    const validated = BuilderInputSchema.parse(input);
    
    console.log(`[BuilderAgent] Generating code for app ${validated.appId}`);
    
    // Call AI Gateway or fallback provider
    const generatedCode = await this.generateCode(validated.prompt);
    
    // Save artifacts to R2
    const artifactPath = await this.saveArtifacts(validated.appId, generatedCode);
    
    return {
      success: true,
      output: {
        files: generatedCode.files,
        artifactPath,
        tokenUsage: generatedCode.tokenUsage
      },
      logs: [`Generated ${generatedCode.files.length} files`]
    };
  }

  private async generateCode(prompt: string): Promise<any> {
    // Implementation from Plan 13 (AI Gateway integration)
    const response = await fetch(this.env.AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.AI_GATEWAY_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.env.AI_GATEWAY_PRIMARY_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      throw new Error(`AI Gateway error: ${response.statusText}`);
    }

    return await response.json();
  }

  private async saveArtifacts(appId: number, code: any): Promise<string> {
    const path = `artifacts/${appId}/${Date.now()}.json`;
    await this.env.ARTIFACTS.put(path, JSON.stringify(code));
    return path;
  }
}
```

Create `platform-api/src/agents/reviewer.agent.ts`:
```typescript
import { BaseAgent } from './base.agent';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

const ReviewInputSchema = z.object({
  files: z.array(z.object({
    path: z.string(),
    content: z.string()
  }))
});

export class ReviewerAgent extends BaseAgent {
  constructor(env: Env, id: string) {
    super({ id, type: 'reviewer' }, env);
  }

  async execute(input: z.infer<typeof ReviewInputSchema>): Promise<AgentResult> {
    const validated = ReviewInputSchema.parse(input);
    
    console.log(`[ReviewerAgent] Reviewing ${validated.files.length} files`);
    
    const issues: string[] = [];
    
    for (const file of validated.files) {
      const fileIssues = await this.reviewFile(file);
      issues.push(...fileIssues);
    }

    const passed = issues.length === 0;
    
    return {
      success: passed,
      output: {
        passed,
        issues,
        score: this.calculateScore(issues)
      },
      logs: [`Found ${issues.length} issues`]
    };
  }

  private async reviewFile(file: { path: string; content: string }): Promise<string[]> {
    const issues: string[] = [];

    // Security checks
    if (file.content.includes('<script>') && !file.path.endsWith('.svelte')) {
      issues.push(`Unsafe script tag in ${file.path}`);
    }

    // XSS prevention
    if (file.path.endsWith('.svelte')) {
      const sanitized = DOMPurify.sanitize(file.content);
      if (sanitized !== file.content) {
        issues.push(`Potential XSS in ${file.path}`);
      }
    }

    // Code quality checks
    if (file.content.length > 10000) {
      issues.push(`File ${file.path} too large (>10KB)`);
    }

    return issues;
  }

  private calculateScore(issues: string[]): number {
    if (issues.length === 0) return 100;
    if (issues.length <= 2) return 80;
    if (issues.length <= 5) return 60;
    return 40;
  }
}
```

Create `platform-api/src/agents/tester.agent.ts`:
```typescript
import { BaseAgent } from './base.agent';
import { z } from 'zod';

const TestInputSchema = z.object({
  files: z.array(z.object({
    path: z.string(),
    content: z.string()
  })),
  framework: z.enum(['sveltekit', 'nextjs', 'astro'])
});

export class TesterAgent extends BaseAgent {
  constructor(env: Env, id: string) {
    super({ id, type: 'tester' }, env);
  }

  async execute(input: z.infer<typeof TestInputSchema>): Promise<AgentResult> {
    const validated = TestInputSchema.parse(input);
    
    console.log(`[TesterAgent] Running tests for ${validated.framework}`);
    
    const testResults = await this.runTests(validated);
    
    return {
      success: testResults.passed,
      output: testResults,
      logs: [
        `Tests: ${testResults.total}`,
        `Passed: ${testResults.passed}`,
        `Failed: ${testResults.failed}`
      ]
    };
  }

  private async runTests(input: z.infer<typeof TestInputSchema>): Promise<any> {
    // Mock test execution - in real scenario, use Sandbox SDK
    const totalTests = input.files.length * 3; // 3 tests per file
    const passed = Math.floor(totalTests * 0.9); // 90% pass rate
    
    return {
      total: totalTests,
      passed,
      failed: totalTests - passed,
      duration: 5000
    };
  }
}
```

Create `platform-api/src/agents/deployer.agent.ts`:
```typescript
import { BaseAgent } from './base.agent';
import { z } from 'zod';

const DeployInputSchema = z.object({
  appId: z.number(),
  artifactPath: z.string(),
  environment: z.enum(['preview', 'staging', 'production'])
});

export class DeployerAgent extends BaseAgent {
  constructor(env: Env, id: string) {
    super({ id, type: 'deployer' }, env);
  }

  async execute(input: z.infer<typeof DeployInputSchema>): Promise<AgentResult> {
    const validated = DeployInputSchema.parse(input);
    
    console.log(`[DeployerAgent] Deploying app ${validated.appId} to ${validated.environment}`);

    // Check for approval gate
    const requiresApproval = validated.environment === 'production';
    
    if (requiresApproval) {
      return {
        success: false,
        output: {
          requiresApproval: true,
          appId: validated.appId,
          artifactPath: validated.artifactPath
        },
        logs: ['Approval required for production deploy']
      };
    }

    // Proceed with deployment
    const deploymentUrl = await this.deploy(validated);
    
    return {
      success: true,
      output: {
        url: deploymentUrl,
        environment: validated.environment
      },
      logs: [`Deployed to ${deploymentUrl}`]
    };
  }

  private async deploy(input: z.infer<typeof DeployInputSchema>): Promise<string> {
    // Mock deployment - integrate with GitHub Actions + Cloudflare
    const previewUrl = `https://${input.appId}-preview.nexus.dev`;
    
    // Record deployment in D1
    await this.env.DB.prepare(
      'INSERT INTO deployments (app_id, environment, url, status) VALUES (?, ?, ?, ?)'
    ).bind(input.appId, input.environment, previewUrl, 'deployed').run();
    
    return previewUrl;
  }
}
```

### Step 5: Agent Registry

Create `platform-api/src/agents/registry.ts`:
```typescript
import { BaseAgent } from './base.agent';
import { BuilderAgent } from './builder.agent';
import { ReviewerAgent } from './reviewer.agent';
import { TesterAgent } from './tester.agent';
import { DeployerAgent } from './deployer.agent';

export class AgentRegistry {
  private agents: Map<string, BaseAgent> = new Map();

  register(agent: BaseAgent): void {
    this.agents.set(agent.getState().id, agent);
    console.log(`[Registry] Registered agent: ${agent.getState().id}`);
  }

  get(id: string): BaseAgent | undefined {
    return this.agents.get(id);
  }

  getAllByType(type: string): BaseAgent[] {
    return Array.from(this.agents.values()).filter(
      agent => agent.getState().type === type
    );
  }

  async initializeAll(env: Env): Promise<void> {
    const agents = [
      new BuilderAgent(env, `builder-${Date.now()}`),
      new ReviewerAgent(env, `reviewer-${Date.now()}`),
      new TesterAgent(env, `tester-${Date.now()}`),
      new DeployerAgent(env, `deployer-${Date.now()}`)
    ];

    for (const agent of agents) {
      await agent.initialize();
      this.register(agent);
    }
  }
}

export const agentRegistry = new AgentRegistry();
```

## Deliverables
- [ ] Base Agent class with lifecycle management
- [ ] 4 concrete agents (Builder, Reviewer, Tester, Deployer)
- [ ] Agent registry for discovery
- [ ] Durable Objects configuration in wrangler.toml
- [ ] State persistence in KV

## Acceptance Criteria
- [ ] All agents can be instantiated with unique IDs
- [ ] Agent state persists across Worker invocations
- [ ] Retry logic works (3 attempts with exponential backoff)
- [ ] Metrics recorded for each agent execution
- [ ] Agents can be registered and retrieved from registry