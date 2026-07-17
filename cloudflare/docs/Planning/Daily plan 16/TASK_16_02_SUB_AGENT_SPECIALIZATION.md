# TASK 16-02: Sub-Agent Specialization

## Objective
Create 6 specialized sub-agents (Builder, Tester, Reviewer, Deployer, Docs, Support) that form the execution layer of the Agent Coder Ecosystem.

## Prerequisites
- TASK 16-01 completed (Agent Coder Foundation)
- Tool ecosystem from Plan 15 available
- AI Gateway configured

## Agent Specifications

### 2.1 BuilderAgent

**Purpose:** Generate code, scaffold projects, and manage file creation

**Location:** `platform-api/src/agents/builder/builder.agent.ts`

**Responsibilities:**
- Parse app requirements from prompts
- Generate file structures and code
- Create/update files via FileSystemTool
- Commit changes via GitHubTool
- Manage templates and scaffolding

**Input Schema:**
```typescript
interface BuilderInput {
  appId?: number;
  prompt: string;
  framework?: 'sveltekit' | 'nextjs' | 'astro';
  features?: string[];
  template?: string;
  context?: Message[];
}
```

**Output Schema:**
```typescript
interface BuilderOutput {
  files: Array<{ path: string; content: string }>;
  artifactPath: string;
  tokenUsage: number;
  summary: string;
}
```

**Tools Used:**
- `FileSystemTool` - write generated files
- `GitHubTool` - commit and push
- `AITool` - code generation via AI Gateway
- `TemplatesTool` - template discovery

**Implementation:**
```typescript
export class BuilderAgent extends BaseAgent {
  async execute(input: BuilderInput): Promise<AgentResult> {
    const validated = BuilderInputSchema.parse(input);
    
    // Generate code using AI
    const generated = await this.generateCode(validated);
    
    // Write files to R2
    const artifactPath = await this.writeArtifacts(validated.appId, generated.files);
    
    // Commit to GitHub if connected
    if (this.hasGitHubConnection(validated.appId)) {
      await this.commitToGitHub(validated.appId, generated.files);
    }
    
    return {
      success: true,
      output: {
        ...generated,
        artifactPath
      }
    };
  }

  private async generateCode(input: BuilderInput): Promise<GeneratedCode> {
    const prompt = this.buildGenerationPrompt(input);
    
    const response = await this.useTool('ai_gateway', {
      operation: 'complete',
      model: 'claude-3-sonnet',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4096
    });

    return this.parseGeneratedCode(response.output);
  }

  private async writeArtifacts(appId: number, files: any[]): Promise<string> {
    const basePath = `artifacts/${appId}/${Date.now()}`;
    
    for (const file of files) {
      await this.useTool('file_system', {
        operation: 'write',
        path: `${basePath}/${file.path}`,
        content: file.content
      });
    }
    
    return basePath;
  }
}
```

**Acceptance Criteria:**
- Generates valid code for simple apps (counter, todo)
- Handles multi-file projects
- Commits to GitHub when connected
- Returns artifact paths for downstream agents

---

### 2.2 TesterAgent

**Purpose:** Execute tests and validate code quality

**Location:** `platform-api/src/agents/tester/tester.agent.ts`

**Responsibilities:**
- Run unit/integration tests
- Validate code against best practices
- Generate coverage reports
- Identify bugs and issues

**Input Schema:**
```typescript
interface TesterInput {
  appId: number;
  artifactPath: string;
  framework: string;
  testType?: 'unit' | 'integration' | 'e2e';
}
```

**Output Schema:**
```typescript
interface TesterOutput {
  passed: boolean;
  total: number;
  passed_count: number;
  failed: Array<{ test: string; error: string }>;
  coverage: number;
  duration: number;
}
```

**Tools Used:**
- `TerminalTool` - run test commands
- `BrowserTool` - E2E testing
- `FileSystemTool` - read test files

**Implementation:**
```typescript
export class TesterAgent extends BaseAgent {
  async execute(input: TesterInput): Promise<AgentResult> {
    const validated = TesterInputSchema.parse(input);
    
    // Execute tests based on framework
    const results = await this.runTests(validated);
    
    // Analyze results
    const analysis = this.analyzeResults(results);
    
    return {
      success: analysis.passed,
      output: analysis
    };
  }

  private async runTests(input: TesterInput): Promise<TestResults> {
    // Get test files from artifact
    const files = await this.useTool('file_system', {
      operation: 'list',
      path: `${input.artifactPath}/tests`
    });

    // Run tests in sandbox
    const result = await this.useTool('terminal', {
      command: 'npm test',
      args: ['--coverage'],
      timeout: 60000
    });

    return this.parseTestOutput(result.output);
  }

  private analyzeResults(results: TestResults): TesterOutput {
    return {
      passed: results.failed === 0,
      total: results.total,
      passed_count: results.passed,
      failed: results.failures,
      coverage: results.coverage,
      duration: results.duration
    };
  }
}
```

**Acceptance Criteria:**
- Runs tests correctly for SvelteKit/Next.js apps
- Returns structured pass/fail results
- Identifies failing tests with error messages
- Generates coverage percentage

---

### 2.3 ReviewerAgent

**Purpose:** Review code for quality, security, and best practices

**Location:** `platform-api/src/agents/reviewer/reviewer.agent.ts`

**Responsibilities:**
- Static code analysis
- Security vulnerability detection
- Best practices validation
- Performance suggestions

**Input Schema:**
```typescript
interface ReviewerInput {
  appId: number;
  artifactPath: string;
  criteria?: ReviewCriteria;
}

interface ReviewCriteria {
  checkSecurity?: boolean;
  checkPerformance?: boolean;
  checkBestPractices?: boolean;
  framework?: string;
}
```

**Output Schema:**
```typescript
interface ReviewOutput {
  passed: boolean;
  score: number;
  issues: Array<{
    severity: 'critical' | 'warning' | 'info';
    file: string;
    line?: number;
    message: string;
    suggestion?: string;
  }>;
  summary: string;
}
```

**Tools Used:**
- `FileSystemTool` - read code files
- `BrowserTool` - snapshot for comparison
- `AITool` - AI-powered code analysis

**Implementation:**
```typescript
export class ReviewerAgent extends BaseAgent {
  async execute(input: ReviewerInput): Promise<AgentResult> {
    const validated = ReviewerInputSchema.parse(input);
    
    // Get all code files
    const files = await this.getCodeFiles(validated.artifactPath);
    
    // Analyze files
    const issues = await this.analyzeFiles(files, validated.criteria);
    
    // Calculate score
    const score = this.calculateScore(issues);
    
    return {
      success: issues.filter(i => i.severity === 'critical').length === 0,
      output: {
        passed: score >= 70,
        score,
        issues,
        summary: this.generateSummary(issues, score)
      }
    };
  }

  private async analyzeFiles(files: any[], criteria: ReviewCriteria): Promise<Issue[]> {
    const issues: Issue[] = [];
    
    for (const file of files) {
      // Security checks
      if (criteria.checkSecurity) {
        const securityIssues = await this.checkSecurity(file);
        issues.push(...securityIssues);
      }
      
      // Best practices
      if (criteria.checkBestPractices) {
        const practiceIssues = await this.checkBestPractices(file);
        issues.push(...practiceIssues);
      }
    }
    
    return issues;
  }

  private async checkSecurity(file: any): Promise<Issue[]> {
    const issues: Issue[] = [];
    
    // Check for XSS vulnerabilities
    if (file.content.includes('innerHTML') && !file.content.includes('DOMPurify')) {
      issues.push({
        severity: 'critical',
        file: file.path,
        message: 'Potential XSS vulnerability: innerHTML used without sanitization',
        suggestion: 'Use DOMPurify or textContent instead'
      });
    }
    
    // Check for hardcoded secrets
    if (/\b(api_key|secret|password|token)\b/i.test(file.content)) {
      issues.push({
        severity: 'critical',
        file: file.path,
        message: 'Possible hardcoded secret detected',
        suggestion: 'Use environment variables'
      });
    }
    
    return issues;
  }
}
```

**Acceptance Criteria:**
- Detects XSS vulnerabilities
- Identifies hardcoded secrets
- Scores code quality (0-100)
- Provides actionable suggestions

---

### 2.4 DeployerAgent

**Purpose:** Orchestrate deployment to GitHub and Cloudflare

**Location:** `platform-api/src/agents/deployer/deployer.agent.ts`

**Responsibilities:**
- Create GitHub branches
- Commit and push code
- Trigger GitHub Actions
- Monitor deployment status
- Return preview URLs

**Input Schema:**
```typescript
interface DeployerInput {
  appId: number;
  artifactPath: string;
  environment: 'preview' | 'staging' | 'production';
  requiresApproval?: boolean;
}
```

**Output Schema:**
```typescript
interface DeployerOutput {
  success: boolean;
  url?: string;
  deploymentId?: string;
  status: 'deployed' | 'pending' | 'failed';
  logs?: string[];
}
```

**Tools Used:**
- `GitHubTool` - branch, commit, PR creation
- `CloudflareTool` - worker deployment
- `FileSystemTool` - read artifacts

**Implementation:**
```typescript
export class DeployerAgent extends BaseAgent {
  async execute(input: DeployerInput): Promise<AgentResult> {
    const validated = DeployerInputSchema.parse(input);
    
    // Check if approval required
    if (validated.requiresApproval && validated.environment === 'production') {
      return {
        success: false,
        output: {
          requiresApproval: true,
          appId: validated.appId
        }
      };
    }
    
    // Deploy based on environment
    switch (validated.environment) {
      case 'preview':
        return await this.deployPreview(validated);
      case 'staging':
        return await this.deployStaging(validated);
      case 'production':
        return await this.deployProduction(validated);
    }
  }

  private async deployPreview(input: DeployerInput): Promise<AgentResult> {
    // Create preview branch
    const branchName = `preview/${input.appId}-${Date.now()}`;
    await this.useTool('github', {
      operation: 'create_branch',
      owner: this.getOwner(input.appId),
      repo: this.getRepo(input.appId),
      branch: branchName,
      baseBranch: 'main'
    });
    
    // Commit files
    const files = await this.getArtifactFiles(input.artifactPath);
    for (const file of files) {
      await this.useTool('github', {
        operation: 'commit_file',
        owner: this.getOwner(input.appId),
        repo: this.getRepo(input.appId),
        branch: branchName,
        filePath: file.path,
        content: file.content,
        message: `chore: generate ${file.path}`
      });
    }
    
    // Create PR
    const pr = await this.useTool('github', {
      operation: 'create_pr',
      owner: this.getOwner(input.appId),
      repo: this.getRepo(input.appId),
      branch: branchName,
      message: `Preview ${input.appId}`
    });
    
    return {
      success: true,
      output: {
        url: pr.data.html_url,
        status: 'pending'
      }
    };
  }
}
```

**Acceptance Criteria:**
- Creates preview branches successfully
- Commits generated code to GitHub
- Returns valid preview URLs
- Handles approval-required production deploys

---

### 2.5 DocsAgent

**Purpose:** Retrieve and explain Cloudflare documentation

**Location:** `platform-api/src/agents/docs/docs.agent.ts`

**Responsibilities:**
- Search Cloudflare docs
- Explain product features
- Recommend integration patterns
- Provide code examples

**Input Schema:**
```typescript
interface DocsInput {
  query: string;
  context?: {
    appId?: number;
    currentStack?: string[];
  };
}
```

**Output Schema:**
```typescript
interface DocsOutput {
  answer: string;
  sources: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  recommendations: string[];
}
```

**Tools Used:**
- `DocsTool` (MCP) - Cloudflare documentation
- `SearchTool` - Vectorize semantic search
- `AITool` - answer generation

**Implementation:**
```typescript
export class DocsAgent extends BaseAgent {
  async execute(input: DocsInput): Promise<AgentResult> {
    const validated = DocsInputSchema.parse(input);
    
    // Search documentation
    const docs = await this.searchDocs(validated.query);
    
    // Generate answer using AI
    const answer = await this.generateAnswer(validated.query, docs);
    
    return {
      success: true,
      output: {
        answer,
        sources: docs,
        recommendations: this.extractRecommendations(answer)
      }
    };
  }

  private async searchDocs(query: string): Promise<DocSource[]> {
    // Search Vectorize index
    const embedding = await this.generateEmbedding(query);
    const results = await this.env.VECTORIZE.query(embedding, {
      topK: 5,
      filter: { type: 'cloudflare-doc' }
    });
    
    return results.matches.map(m => ({
      title: m.metadata.title,
      url: m.metadata.url,
      snippet: m.metadata.text
    }));
  }
}
```

**Acceptance Criteria:**
- Returns relevant documentation for queries
- Cites sources with URLs
- Provides actionable recommendations
- Answers within 3 seconds

---

### 2.6 SupportAgent

**Purpose:** Troubleshoot errors and guide users

**Location:** `platform-api/src/agents/support/support.agent.ts`

**Responsibilities:**
- Analyze error logs
- Explain failure reasons
- Suggest fixes
- Guide users through recovery

**Input Schema:**
```typescript
interface SupportInput {
  error?: string;
  errorLogs?: string[];
  context: string;
  conversationHistory?: Message[];
  appId?: number;
}
```

**Output Schema:**
```typescript
interface SupportOutput {
  explanation: string;
  rootCause: string;
  suggestions: string[];
  severity: 'low' | 'medium' | 'high';
  canAutoFix: boolean;
}
```

**Tools Used:**
- All tools (read-only access)
- `AITool` - error analysis
- `SearchTool` - find similar issues

**Implementation:**
```typescript
export class SupportAgent extends BaseAgent {
  async execute(input: SupportInput): Promise<AgentResult> {
    const validated = SupportInputSchema.parse(input);
    
    // Analyze error
    const analysis = await this.analyzeError(validated);
    
    // Search for similar issues
    const similar = await this.searchSimilarIssues(analysis.error);
    
    // Generate solution
    const solution = await this.generateSolution(analysis, similar);
    
    return {
      success: true,
      output: solution
    };
  }

  private async analyzeError(input: SupportInput): Promise<ErrorAnalysis> {
    const prompt = `Analyze this error and determine the root cause.

Error: ${input.error}

Context: ${input.context}

Logs:
${input.errorLogs?.join('\n') || 'No logs provided'}

Provide:
1. Root cause (1-2 sentences)
2. Severity (low/medium/high)
3. Whether this can be auto-fixed (yes/no)
4. Suggested fixes (list)`;

    const response = await this.useTool('ai_gateway', {
      operation: 'complete',
      model: 'claude-3-haiku',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    });

    return this.parseAnalysis(response.output);
  }
}
```

**Acceptance Criteria:**
- Correctly identifies common error patterns
- Provides actionable fix suggestions
- Determines severity accurately
- Identifies auto-fixable issues

---

## Agent Registry Update

**File:** `platform-api/src/agents/registry.ts`

```typescript
export class AgentRegistry {
  private agents: Map<string, BaseAgent> = new Map();
  private coderAgents: Map<string, CoderAgent> = new Map();

  constructor(private env: Env) {
    // Register sub-agents
    this.register(new BuilderAgent(this.env, `builder-${Date.now()}`));
    this.register(new TesterAgent(this.env, `tester-${Date.now()}`));
    this.register(new ReviewerAgent(this.env, `reviewer-${Date.now()}`));
    this.register(new DeployerAgent(this.env, `deployer-${Date.now()}`));
    this.register(new DocsAgent(this.env, `docs-${Date.now()}`));
    this.register(new SupportAgent(this.env, `support-${Date.now()}`));
  }

  register(agent: BaseAgent): void {
    this.agents.set(agent.getState().id, agent);
  }

  get(type: string): BaseAgent | undefined {
    return Array.from(this.agents.values()).find(
      a => a.getState().type === type
    );
  }

  getAll(): BaseAgent[] {
    return Array.from(this.agents.values());
  }
}
```

## Deliverables
- [ ] BuilderAgent implementation
- [ ] TesterAgent implementation
- [ ] ReviewerAgent implementation
- [ ] DeployerAgent implementation
- [ ] DocsAgent implementation
- [ ] SupportAgent implementation
- [ ] Agent registry update
- [ ] Tool permissions configured per agent
- [ ] Unit tests for each agent

## Acceptance Criteria
- [ ] All 6 agents instantiate and execute correctly
- [ ] Each agent has typed input/output contracts
- [ ] Tool permissions restrict agents appropriately
- [ ] Agents can be invoked by CoderAgent
- [ ] Failed agents trigger retry logic
- [ ] All agents log execution metrics