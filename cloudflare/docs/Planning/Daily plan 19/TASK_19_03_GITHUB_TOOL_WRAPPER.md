# TASK 19_03: GitHub Tool Wrapper

## هدف
Wrap کردن GitHub integration tool برای استفاده در CopilotKit agents.

## فایل‌های مورد نیاز
- `cloudflare/platform-api/src/agents/tools/GitHubTool.ts` (CREATE)
- `cloudflare/platform-api/src/agents/tools/GitHubClient.ts` (CREATE - wrapper)

## پیاده‌سازی

### Step 1: Create GitHubClient.ts

```typescript
// cloudflare/platform-api/src/agents/tools/GitHubClient.ts

export interface GitHubClientOptions {
  token: string;
  apiUrl?: string;
}

export interface GitHubBranch {
  name: string;
  sha: string;
  url: string;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  url: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  state: 'open' | 'closed';
  htmlUrl: string;
  body?: string;
}

export class GitHubClient {
  private token: string;
  private apiUrl: string;
  
  constructor(options: GitHubClientOptions) {
    this.token = options.token;
    this.apiUrl = options.apiUrl || 'https://api.github.com';
  }
  
  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new GitHubAPIError(response.status, error);
    }
    
    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }
    
    return response.json();
  }
  
  // Create a new branch
  async createBranch(owner: string, repo: string, branchName: string, fromSha: string): Promise<GitHubBranch> {
    return this.request(`/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: fromSha
      })
    });
  }
  
  // Get default branch SHA
  async getDefaultBranchSha(owner: string, repo: string): Promise<string> {
    const repoInfo = await this.request(`/repos/${owner}/${repo}`);
    return repoInfo.default_branch;
  }
  
  // Get branch info
  async getBranch(owner: string, repo: string, branchName: string): Promise<GitHubBranch> {
    return this.request(`/repos/${owner}/${repo}/branches/${branchName}`);
  }
  
  // Create or update file (commit)
  async createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch: string,
    sha?: string // Required for updates
  ): Promise<GitHubCommit> {
    const encodedContent = Buffer.from(content).toString('base64');
    
    return this.request(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
      method: 'PUT',
      body: JSON.stringify({
        message,
        content: encodedContent,
        branch,
        sha // Include for updates
      })
    });
  }
  
  // Get file content
  async getFile(owner: string, repo: string, path: string, branch: string): Promise<any> {
    return this.request(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`);
  }
  
  // Create pull request
  async createPullRequest(
    owner: string,
    repo: string,
    title: string,
    head: string,
    base: string,
    body?: string
  ): Promise<GitHubPullRequest> {
    return this.request(`/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      body: JSON.stringify({
        title,
        head,
        base,
        body
      })
    });
  }
  
  // List pull requests
  async listPullRequests(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open'): Promise<GitHubPullRequest[]> {
    return this.request(`/repos/${owner}/${repo}/pulls?state=${state}`);
  }
  
  // Merge pull request
  async mergePullRequest(
    owner: string,
    repo: string,
    pullNumber: number,
    commitTitle?: string
  ): Promise<any> {
    return this.request(`/repos/${owner}/${repo}/pulls/${pullNumber}/merge`, {
      method: 'PUT',
      body: JSON.stringify({
        commit_title: commitTitle,
        merge_method: 'squash'
      })
    });
  }
}

export class GitHubAPIError extends Error {
  constructor(public status: number, message: string) {
    super(`GitHub API Error ${status}: ${message}`);
    this.name = 'GitHubAPIError';
  }
}
```

### Step 2: Create GitHubTool.ts

```typescript
// cloudflare/platform-api/src/agents/tools/GitHubTool.ts

import { BaseTool } from './BaseTool';
import { ToolContext, ToolResult } from './types';
import { z } from 'zod';
import { GitHubClient, GitHubAPIError } from './GitHubClient';

export class GitHubTool extends BaseTool {
  name = 'github_operations';
  description = 'Perform GitHub operations: create branches, commit files, create pull requests';
  
  parameters = z.object({
    operation: z.enum(['create_branch', 'commit_file', 'create_pr', 'get_file', 'list_prs'])
      .describe('GitHub operation to perform'),
    
    // Repository info
    owner: z.string().describe('Repository owner (username or org)'),
    repo: z.string().describe('Repository name'),
    
    // Operation-specific parameters
    branchName: z.string().optional().describe('Branch name (for create_branch)'),
    path: z.string().optional().describe('File path (for commit_file, get_file)'),
    content: z.string().optional().describe('File content (for commit_file)'),
    message: z.string().optional().describe('Commit message (for commit_file)'),
    baseBranch: z.string().optional().describe('Base branch for PR'),
    prTitle: z.string().optional().describe('Pull request title'),
    prBody: z.string().optional().describe('Pull request body')
  });
  
  returns = z.object({
    success: z.boolean(),
    data: z.any(),
    url: z.string().optional(),
    message: z.string().optional()
  });
  
  private githubClient: GitHubClient;
  
  constructor(githubToken: string) {
    super();
    this.githubClient = new GitHubClient({ token: githubToken });
    this.timeout = 15000; // 15s for GitHub API
    this.retries = 3;
  }
  
  protected async doExecute(params: any, context: ToolContext): Promise<any> {
    const { operation } = params;
    
    try {
      switch (operation) {
        case 'create_branch':
          return await this.createBranch(params, context);
        
        case 'commit_file':
          return await this.commitFile(params, context);
        
        case 'create_pr':
          return await this.createPullRequest(params, context);
        
        case 'get_file':
          return await this.getFile(params, context);
        
        case 'list_prs':
          return await this.listPullRequests(params, context);
        
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
      
    } catch (error: any) {
      if (error instanceof GitHubAPIError) {
        // Handle specific GitHub errors
        if (error.status === 403 && error.message.includes('rate limit')) {
          throw this.retryable('GitHub rate limit exceeded', 60000);
        }
        
        if (error.status === 401) {
          // Don't retry auth errors
          throw new Error('GitHub authentication failed');
        }
        
        if (error.status === 404) {
          // Don't retry not found
          throw new Error('GitHub resource not found');
        }
        
        if (error.status === 422) {
          // Validation error - don't retry
          throw new Error(`GitHub validation error: ${error.message}`);
        }
      }
      
      // Retry on other errors
      throw this.retryable(error.message);
    }
  }
  
  private async createBranch(params: any, context: ToolContext): Promise<any> {
    const { owner, repo, branchName } = params;
    
    if (!branchName) {
      throw new Error('branchName is required for create_branch operation');
    }
    
    // Get default branch SHA
    const defaultBranch = await this.githubClient.getDefaultBranchSha(owner, repo);
    
    // Create new branch
    const branch = await this.githubClient.createBranch(owner, repo, branchName, `refs/heads/${defaultBranch}`);
    
    return {
      success: true,
      data: branch,
      url: branch.url,
      message: `Branch ${branchName} created successfully`
    };
  }
  
  private async commitFile(params: any, context: ToolContext): Promise<any> {
    const { owner, repo, path, content, message, branchName } = params;
    
    if (!path || content === undefined || !message) {
      throw new Error('path, content, and message are required for commit_file operation');
    }
    
    // Use branch from context or parameter
    const branch = branchName || context.sessionId || 'main';
    
    const commit = await this.githubClient.createOrUpdateFile(
      owner, repo, path, content, message, branch
    );
    
    return {
      success: true,
      data: commit,
      url: commit.html_url,
      message: `File ${path} committed successfully`
    };
  }
  
  private async createPullRequest(params: any, context: ToolContext): Promise<any> {
    const { owner, repo, prTitle, head, base, prBody } = params;
    
    if (!prTitle || !head || !base) {
      throw new Error('prTitle, head, and base are required for create_pr operation');
    }
    
    const pr = await this.githubClient.createPullRequest(
      owner, repo, prTitle, head, base, prBody
    );
    
    return {
      success: true,
      data: pr,
      url: pr.html_url,
      message: `Pull request #${pr.number} created successfully`
    };
  }
  
  private async getFile(params: any, context: ToolContext): Promise<any> {
    const { owner, repo, path, branchName } = params;
    
    if (!path) {
      throw new Error('path is required for get_file operation');
    }
    
    const branch = branchName || 'main';
    const file = await this.githubClient.getFile(owner, repo, path, branch);
    
    // Decode base64 content
    const content = Buffer.from(file.content, 'base64').toString('utf-8');
    
    return {
      success: true,
      data: {
        ...file,
        decodedContent: content
      },
      message: `File ${path} retrieved successfully`
    };
  }
  
  private async listPullRequests(params: any, context: ToolContext): Promise<any> {
    const { owner, repo } = params;
    
    const prs = await this.githubClient.listPullRequests(owner, repo, 'open');
    
    return {
      success: true,
      data: prs,
      message: `Found ${prs.length} open pull requests`
    };
  }
}
```

### Step 3: Registration

```typescript
// In platform-api initialization

const githubToken = env.GITHUB_TOKEN;
if (githubToken) {
  const githubTool = new GitHubTool(githubToken);
  ToolRegistry.getInstance().register(githubTool);
}
```

### Step 4: Usage Example

```typescript
// Create a branch
const result = await registry.get('github_operations')?.execute(
  {
    operation: 'create_branch',
    owner: 'mehranjanati',
    repo: 'CF-BackEnd',
    branchName: 'feature/counter-component'
  },
  { tenantId: '1', userId: '1', requestId: '123' }
);

// Commit a file
const result = await registry.get('github_operations')?.execute(
  {
    operation: 'commit_file',
    owner: 'mehranjanati',
    repo: 'CF-BackEnd',
    path: 'src/components/Counter.tsx',
    content: 'export const Counter = () => { ... }',
    message: 'Add counter component',
    branchName: 'feature/counter-component'
  },
  { tenantId: '1', userId: '1', requestId: '123' }
);

// Create PR
const result = await registry.get('github_operations')?.execute(
  {
    operation: 'create_pr',
    owner: 'mehranjanati',
    repo: 'CF-BackEnd',
    prTitle: 'Add counter component',
    head: 'feature/counter-component',
    base: 'main',
    prBody: 'This PR adds a new counter component'
  },
  { tenantId: '1', userId: '1', requestId: '123' }
);
```

## خروجی قابل مشاهده
- GitHubTool کلاس ایجاد می‌شود
- 5 عملیات GitHub پشتیبانی می‌شود
- Token-based authentication
- Rate limit handling
- Error classification

## معیارهای موفقیت
- [ ] GitHubTool compile می‌شود
- [ ] create_branch کار می‌کند
- [ ] commit_file کار می‌کند
- [ ] create_pr کار می‌کند
- [ ] get_file کار می‌کند
- [ ] list_prs کار می‌کند
- [ ] Auth errors handled
- [ ] Rate limits handled