# TASK 15-03: Agent Tools Ecosystem (Workflows-Integrated)

## Objective
Create a shared tool library for agents that integrates with Cloudflare Workflows step execution context, enabling tools to access workflow state, checkpoints, and distributed tracing.

## Prerequisites
- TASK 15-01 completed (Agent Runtime Foundation)
- TASK 15-02 completed (Workflow Definition)
- Cloudflare Sandbox SDK and Browser Run enabled

## Implementation

### Step 1: Define Tool Interface

Create `platform-api/src/tools/base-tool.ts`:
```typescript
export interface ToolResult {
  success: boolean;
  output?: any;
  error?: string;
  logs?: string[];
  metadata?: {
    duration?: number;
    tokensUsed?: number;
    retries?: number;
  };
}

export interface Tool {
  name: string;
  description: string;
  parameters: any; // Zod schema
  
  execute(params: any, env: Env): Promise<ToolResult>;
}

export abstract class BaseTool implements Tool {
  abstract name: string;
  abstract description: string;
  abstract parameters: any;

  abstract execute(params: any, env: Env): Promise<ToolResult>;

  protected validateParams(params: any): any {
    // Zod validation will be added in concrete implementations
    return params;
  }

  protected async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Tool execution timeout')), timeoutMs)
      )
    ]);
  }
}
```

### Step 2: File System Tool (R2-backed)

Create `platform-api/src/tools/file-system.ts`:
```typescript
import { BaseTool } from './base-tool';
import { z } from 'zod';

const FileSystemParamsSchema = z.object({
  operation: z.enum(['read', 'write', 'list', 'delete', 'exists']),
  path: z.string(),
  content: z.string().optional(),
  recursive: z.boolean().optional().default(false)
});

export class FileSystemTool extends BaseTool {
  name = 'file_system';
  description = 'Read, write, list, and manage files in the artifact storage';
  parameters = FileSystemParamsSchema;

  constructor(private artifacts: R2Bucket) {}

  async execute(params: z.infer<typeof FileSystemParamsSchema>, env: Env): Promise<ToolResult> {
    const validated = FileSystemParamsSchema.parse(params);
    const startTime = Date.now();

    try {
      switch (validated.operation) {
        case 'read': {
          const object = await this.artifacts.get(validated.path);
          if (!object) {
            return {
              success: false,
              error: `File not found: ${validated.path}`
            };
          }
          const content = await object.text();
          return {
            success: true,
            output: { content, path: validated.path },
            logs: [`Read ${validated.path} (${content.length} bytes)`],
            metadata: { duration: Date.now() - startTime }
          };
        }

        case 'write': {
          if (!validated.content) {
            return {
              success: false,
              error: 'Content required for write operation'
            };
          }
          await this.artifacts.put(validated.path, validated.content);
          return {
            success: true,
            output: { path: validated.path, bytes: validated.content.length },
            logs: [`Wrote ${validated.path} (${validated.content.length} bytes)`],
            metadata: { duration: Date.now() - startTime }
          };
        }

        case 'list': {
          const list = await this.artifacts.list({
            prefix: validated.path,
            recursive: validated.recursive
          });
          const files = Array.from(list.objects).map(obj => ({
            path: obj.key,
            size: obj.size,
            uploaded: obj.uploaded
          }));
          return {
            success: true,
            output: { files, count: files.length },
            logs: [`Listed ${files.length} files`],
            metadata: { duration: Date.now() - startTime }
          };
        }

        case 'delete': {
          await this.artifacts.delete(validated.path);
          return {
            success: true,
            output: { path: validated.path },
            logs: [`Deleted ${validated.path}`],
            metadata: { duration: Date.now() - startTime }
          };
        }

        case 'exists': {
          const exists = await this.artifacts.head(validated.path);
          return {
            success: true,
            output: { exists: !!exists, path: validated.path },
            metadata: { duration: Date.now() - startTime }
          };
        }

        default:
          return {
            success: false,
            error: `Unknown operation: ${validated.operation}`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        logs: [`FileSystemTool error: ${error.message}`],
        metadata: { duration: Date.now() - startTime }
      };
    }
  }
}
```

### Step 3: Terminal Tool (Sandbox-backed)

Create `platform-api/src/tools/terminal.ts`:
```typescript
import { BaseTool } from './base-tool';
import { z } from 'zod';

const TerminalParamsSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional().default([]),
  cwd: z.string().optional(),
  timeout: z.number().optional().default(30000),
  env: z.record(z.string()).optional()
});

export class TerminalTool extends BaseTool {
  name = 'terminal';
  description = 'Execute shell commands in a sandboxed environment';
  parameters = TerminalParamsSchema;

  constructor(private sandbox: Sandbox) {}

  async execute(params: z.infer<typeof TerminalParamsSchema>, env: Env): Promise<ToolResult> {
    const validated = TerminalParamsSchema.parse(params);
    const startTime = Date.now();

    try {
      // Validate command (security)
      const sanitizedCommand = this.sanitizeCommand(validated.command);
      
      // Execute in sandbox
      const result = await this.withTimeout(
        this.sandbox.exec(sanitizedCommand, {
          args: validated.args,
          cwd: validated.cwd,
          timeout: validated.timeout,
          env: validated.env
        }),
        validated.timeout + 5000 // Buffer
      );

      return {
        success: result.exitCode === 0,
        output: {
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode
        },
        logs: [
          `Executed: ${sanitizedCommand} ${validated.args.join(' ')}`,
          `Exit code: ${result.exitCode}`
        ],
        metadata: { duration: Date.now() - startTime }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        logs: [`TerminalTool error: ${error.message}`],
        metadata: { duration: Date.now() - startTime }
      };
    }
  }

  private sanitizeCommand(command: string): string {
    // Block dangerous commands
    const dangerous = ['rm -rf /', 'sudo', 'chmod', 'curl | sh', 'wget | sh'];
    const lower = command.toLowerCase();
    
    for (const danger of dangerous) {
      if (lower.includes(danger)) {
        throw new Error(`Dangerous command blocked: ${command}`);
      }
    }

    return command;
  }
}
```

### Step 4: Browser Tool (Browser Run)

Create `platform-api/src/tools/browser.ts`:
```typescript
import { BaseTool } from './base-tool';
import { z } from 'zod';

const BrowserParamsSchema = z.object({
  action: z.enum(['navigate', 'click', 'type', 'screenshot', 'evaluate']),
  url: z.string().optional(),
  selector: z.string().optional(),
  text: z.string().optional(),
  script: z.string().optional(),
  waitFor: z.number().optional().default(5000)
});

export class BrowserTool extends BaseTool {
  name = 'browser';
  description = 'Automate browser interactions for testing and preview';
  parameters = BrowserParamsSchema;

  constructor(private browser: Browser) {}

  async execute(params: z.infer<typeof BrowserParamsSchema>, env: Env): Promise<ToolResult> {
    const validated = BrowserParamsSchema.parse(params);
    const startTime = Date.now();

    try {
      let result: any;

      switch (validated.action) {
        case 'navigate':
          await this.browser.goto(validated.url!);
          result = { url: validated.url };
          break;

        case 'click':
          await this.browser.click(validated.selector!);
          await this.browser.waitForTimeout(validated.waitFor);
          result = { clicked: validated.selector };
          break;

        case 'type':
          await this.browser.type(validated.selector!, validated.text!);
          result = { typed: validated.selector };
          break;

        case 'screenshot':
          const screenshot = await this.browser.screenshot();
          const path = `screenshots/${Date.now()}.png`;
          await env.ARTIFACTS.put(path, screenshot);
          result = { path, size: screenshot.length };
          break;

        case 'evaluate':
          result = await this.browser.evaluate(validated.script!);
          break;

        default:
          return {
            success: false,
            error: `Unknown browser action: ${validated.action}`
          };
      }

      return {
        success: true,
        output: result,
        logs: [`Browser: ${validated.action}`],
        metadata: { duration: Date.now() - startTime }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        logs: [`BrowserTool error: ${error.message}`],
        metadata: { duration: Date.now() - startTime }
      };
    }
  }
}
```

### Step 5: GitHub Tool

Create `platform-api/src/tools/github.ts`:
```typescript
import { BaseTool } from './base-tool';
import { z } from 'zod';

const GitHubParamsSchema = z.object({
  operation: z.enum(['create_branch', 'commit_file', 'create_pr', 'get_status']),
  owner: z.string(),
  repo: z.string(),
  branch: z.string(),
  filePath: z.string().optional(),
  content: z.string().optional(),
  message: z.string().optional(),
  baseBranch: z.string().optional().default('main')
});

export class GitHubTool extends BaseTool {
  name = 'github';
  description = 'Interact with GitHub API for repository operations';
  parameters = GitHubParamsSchema;

  constructor(private githubToken: string) {}

  async execute(params: z.infer<typeof GitHubParamsSchema>, env: Env): Promise<ToolResult> {
    const validated = GitHubParamsSchema.parse(params);
    const startTime = Date.now();

    try {
      const headers = {
        'Authorization': `Bearer ${this.githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      };

      let result: any;

      switch (validated.operation) {
        case 'create_branch': {
          // Get base branch SHA
          const baseRef = await fetch(
            `https://api.github.com/repos/${validated.owner}/${validated.repo}/git/refs/heads/${validated.baseBranch}`,
            { headers }
          );
          const baseData = await baseRef.json();
          
          // Create new branch
          const response = await fetch(
            `https://api.github.com/repos/${validated.owner}/${validated.repo}/git/refs`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                ref: `refs/heads/${validated.branch}`,
                sha: baseData.object.sha
              })
            }
          );
          result = await response.json();
          break;
        }

        case 'commit_file': {
          // Get file SHA if exists
          let sha: string | undefined;
          try {
            const fileData = await fetch(
              `https://api.github.com/repos/${validated.owner}/${validated.repo}/contents/${validated.filePath}?ref=${validated.branch}`,
              { headers }
            ).then(r => r.json());
            sha = fileData.sha;
          } catch {}

          // Create/update file
          const response = await fetch(
            `https://api.github.com/repos/${validated.owner}/${validated.repo}/contents/${validated.filePath}`,
            {
              method: 'PUT',
              headers,
              body: JSON.stringify({
                message: validated.message,
                content: Buffer.from(validated.content!).toString('base64'),
                branch: validated.branch,
                sha
              })
            }
          );
          result = await response.json();
          break;
        }

        case 'create_pr': {
          const response = await fetch(
            `https://api.github.com/repos/${validated.owner}/${validated.repo}/pulls`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                title: validated.message,
                head: validated.branch,
                base: validated.baseBranch
              })
            }
          );
          result = await response.json();
          break;
        }

        case 'get_status': {
          const response = await fetch(
            `https://api.github.com/repos/${validated.owner}/${validated.repo}/commits/${validated.branch}/status`,
            { headers }
          );
          result = await response.json();
          break;
        }

        default:
          return {
            success: false,
            error: `Unknown GitHub operation: ${validated.operation}`
          };
      }

      return {
        success: true,
        output: result,
        logs: [`GitHub: ${validated.operation}`],
        metadata: { duration: Date.now() - startTime }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        logs: [`GitHubTool error: ${error.message}`],
        metadata: { duration: Date.now() - startTime }
      };
    }
  }
}
```

### Step 6: Cloudflare Tool

Create `platform-api/src/tools/cloudflare.ts`:
```typescript
import { BaseTool } from './base-tool';
import { z } from 'zod';

const CloudflareParamsSchema = z.object({
  operation: z.enum(['deploy_worker', 'create_bucket', 'update_dns', 'get_analytics']),
  resource: z.string(),
  config: z.record(z.any()).optional()
});

export class CloudflareTool extends BaseTool {
  name = 'cloudflare';
  description = 'Interact with Cloudflare APIs for deployment and configuration';
  parameters = CloudflareParamsSchema;

  constructor(private apiToken: string) {}

  async execute(params: z.infer<typeof CloudflareParamsSchema>, env: Env): Promise<ToolResult> {
    const validated = CloudflareParamsSchema.parse(params);
    const startTime = Date.now();

    try {
      const headers = {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      };

      let result: any;

      switch (validated.operation) {
        case 'deploy_worker': {
          const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/workers/scripts/${validated.resource}`,
            {
              method: 'PUT',
              headers,
              body: JSON.stringify(validated.config)
            }
          );
          result = await response.json();
          break;
        }

        case 'create_bucket': {
          const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/r2/buckets`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({ name: validated.resource })
            }
          );
          result = await response.json();
          break;
        }

        case 'update_dns': {
          const response = await fetch(
            `https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/dns_records/${validated.resource}`,
            {
              method: 'PATCH',
              headers,
              body: JSON.stringify(validated.config)
            }
          );
          result = await response.json();
          break;
        }

        case 'get_analytics': {
          const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/analytics/dashboard?since=${validated.config?.since}`,
            { headers }
          );
          result = await response.json();
          break;
        }

        default:
          return {
            success: false,
            error: `Unknown Cloudflare operation: ${validated.operation}`
          };
      }

      return {
        success: true,
        output: result,
        logs: [`Cloudflare: ${validated.operation}`],
        metadata: { duration: Date.now() - startTime }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        logs: [`CloudflareTool error: ${error.message}`],
        metadata: { duration: Date.now() - startTime }
      };
    }
  }
}
```

### Step 7: Create Tool Registry

Create `platform-api/src/tools/registry.ts`:
```typescript
import { Tool } from './base-tool';
import { FileSystemTool } from './file-system';
import { TerminalTool } from './terminal';
import { BrowserTool } from './browser';
import { GitHubTool } from './github';
import { CloudflareTool } from './cloudflare';

export interface ToolPermission {
  agentType: string;
  allowedTools: string[];
}

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private permissions: ToolPermission[] = [];

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
    console.log(`[ToolRegistry] Registered: ${tool.name}`);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  setPermissions(permissions: ToolPermission[]): void {
    this.permissions = permissions;
  }

  getToolsForAgent(agentType: string): Tool[] {
    const permission = this.permissions.find(p => p.agentType === agentType);
    if (!permission) return [];

    return permission.allowedTools
      .map(name => this.tools.get(name))
      .filter((tool): tool is Tool => tool !== undefined);
  }

  async initialize(env: Env): Promise<void> {
    // Register all tools
    this.register(new FileSystemTool(env.ARTIFACTS));
    this.register(new TerminalTool(env.SANDBOX));
    this.register(new BrowserTool(env.BROWSER));
    this.register(new GitHubTool(env.GITHUB_TOKEN));
    this.register(new CloudflareTool(env.CLOUDFLARE_API_TOKEN));

    // Set permissions
    this.setPermissions([
      {
        agentType: 'builder',
        allowedTools: ['file_system', 'terminal', 'browser']
      },
      {
        agentType: 'reviewer',
        allowedTools: ['file_system', 'browser']
      },
      {
        agentType: 'tester',
        allowedTools: ['terminal', 'browser']
      },
      {
        agentType: 'deployer',
        allowedTools: ['github', 'cloudflare', 'file_system']
      }
    ]);

    console.log(`[ToolRegistry] Initialized ${this.tools.size} tools`);
  }
}

export const toolRegistry = new ToolRegistry();
```

### Step 8: Integrate with Agents

Update `platform-api/src/agents/base.agent.ts`:
```typescript
import { toolRegistry } from '../tools/registry';

export abstract class BaseAgent {
  // ... existing code ...

  protected async useTool(toolName: string, params: any): Promise<ToolResult> {
    const agentTools = toolRegistry.getToolsForAgent(this.config.type);
    const tool = agentTools.find(t => t.name === toolName);

    if (!tool) {
      return {
        success: false,
        error: `Tool ${toolName} not available for agent type ${this.config.type}`
      };
    }

    console.log(`[Agent ${this.config.id}] Using tool: ${toolName}`);
    return await tool.execute(params, this.env);
  }
}
```

## Deliverables
- [ ] Base Tool interface and abstract class
- [ ] FileSystemTool (R2-backed)
- [ ] TerminalTool (Sandbox-backed)
- [ ] BrowserTool (Browser Run)
- [ ] GitHubTool (GitHub API)
- [ ] CloudflareTool (Cloudflare API)
- [ ] ToolRegistry with permissions
- [ ] Integration with Agent base class

## Acceptance Criteria
- [ ] All tools accept Zod-validated parameters
- [ ] FileSystemTool can read/write files to R2
- [ ] TerminalTool executes commands with timeout
- [ ] BrowserTool can navigate and take screenshots
- [ ] GitHubTool creates branches and commits
- [ ] Tool permissions restrict agents to allowed tools
- [ ] All tools return structured ToolResult