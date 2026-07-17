# TASK 16-03: Dynamic Workflow Compiler

## Objective
Convert visual builder graphs into executable Cloudflare Workflows at runtime, enabling dynamic orchestration of agent execution with approval gates, parallel branches, and error handling.

## Prerequisites
- TASK 16-01 completed (Agent Coder Foundation)
- TASK 16-02 completed (Sub-Agent Specialization)
- Cloudflare Workflows API available
- Visual Builder graph schema defined

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Dynamic Workflow Compiler                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Input: Visual Graph (JSON/IR)                              │
│       │                                                     │
│       ▼                                                     │
│  ┌────────────────────┐                                     │
│  │  Graph Validator   │                                     │
│  │  - Schema check    │                                     │
│  │  - Cycle detect    │                                     │
│  │  - Type verify     │                                     │
│  └────────┬───────────┘                                     │
│           │                                                 │
│           ▼                                                 │
│  ┌────────────────────┐                                     │
│  │  IR Generator      │                                     │
│  │  - Node mapping    │                                     │
│  │  - Edge resolution │                                     │
│  │  - Step ordering   │                                     │
│  └────────┬───────────┘                                     │
│           │                                                 │
│           ▼                                                 │
│  ┌────────────────────┐                                     │
│  │  Workflow Step     │                                     │
│  │  Generator         │                                     │
│  │  - Agent steps     │                                     │
│  │  - Tool steps      │                                     │
│  │  - Approval steps  │                                     │
│  └────────┬───────────┘                                     │
│           │                                                 │
│           ▼                                                 │
│  ┌────────────────────┐                                     │
│  │  Workflow Deployer │                                     │
│  │  - Create workflow │                                     │
│  │  - Bind triggers   │                                     │
│  │  - Set timeouts    │                                     │
│  └────────────────────┘                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Implementation

### Step 1: Graph IR Schema

Create `platform-api/src/workflow/ir/schema.ts`:
```typescript
export interface GraphIR {
  id: string;
  version: string;
  name: string;
  nodes: IRNode[];
  edges: IREdge[];
  metadata: {
    createdAt: number;
    createdBy: number;
    framework?: string;
  };
}

export interface IRNode {
  id: string;
  kind: NodeKind;
  label: string;
  config: Record<string, any>;
  ports: {
    inputs: Port[];
    outputs: Port[];
  };
  position: { x: number; y: number };
}

export enum NodeKind {
  AGENT = 'agent',
  TOOL = 'tool',
  APPROVAL = 'approval',
  PARALLEL = 'parallel',
  CONDITION = 'condition',
  INPUT = 'input',
  OUTPUT = 'output'
}

export interface Port {
  id: string;
  type: 'data' | 'control' | 'error';
  dataType?: string;
}

export interface IREdge {
  id: string;
  source: { nodeId: string; portId: string };
  target: { nodeId: string; portId: string };
  condition?: string;
}

export interface WorkflowStep {
  id: string;
  type: 'agent' | 'tool' | 'approval' | 'parallel';
  config: Record<string, any>;
  retries?: RetryConfig;
  timeout?: number;
  onError?: 'fail' | 'retry' | 'skip';
}

export interface RetryConfig {
  maxAttempts: number;
  delay: string;
  backoff: 'exponential' | 'linear' | 'fixed';
}

export interface CompiledWorkflow {
  workflowId: string;
  definition: any;
  steps: WorkflowStep[];
  bindings: Record<string, any>;
}
```

### Step 2: Graph Validator

Create `platform-api/src/workflow/compiler/graph-validator.ts`:
```typescript
import { GraphIR, NodeKind } from '../ir/schema';

export class GraphValidator {
  validate(graph: GraphIR): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 1. Check for cycles
    const cycle = this.detectCycle(graph);
    if (cycle) {
      errors.push({
        type: 'cycle',
        message: `Cycle detected: ${cycle.join(' -> ')}`,
        severity: 'critical'
      });
    }

    // 2. Check node types
    for (const node of graph.nodes) {
      if (!Object.values(NodeKind).includes(node.kind)) {
        errors.push({
          type: 'invalid_node',
          message: `Invalid node type: ${node.kind} in node ${node.id}`,
          nodeId: node.id,
          severity: 'critical'
        });
      }

      // 3. Check required config
      const configErrors = this.validateNodeConfig(node);
      errors.push(...configErrors);
    }

    // 4. Check edges
    for (const edge of graph.edges) {
      const sourceNode = graph.nodes.find(n => n.id === edge.source.nodeId);
      const targetNode = graph.nodes.find(n => n.id === edge.target.nodeId);

      if (!sourceNode || !targetNode) {
        errors.push({
          type: 'dangling_edge',
          message: `Edge references non-existent node`,
          edgeId: edge.id,
          severity: 'critical'
        });
      }

      // 5. Validate port types
      const portError = this.validatePortTypes(edge, sourceNode!, targetNode!);
      if (portError) errors.push(portError);
    }

    return {
      valid: errors.filter(e => e.severity === 'critical').length === 0,
      errors,
      warnings
    };
  }

  private detectCycle(graph: GraphIR): string[] | null {
    const adjacency = new Map<string, string[]>();

    for (const node of graph.nodes) {
      adjacency.set(node.id, []);
    }

    for (const edge of graph.edges) {
      adjacency.get(edge.source.nodeId)!.push(edge.target.nodeId);
    }

    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      for (const neighbor of adjacency.get(nodeId) || []) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          const cycleStart = path.indexOf(neighbor);
          return path.slice(cycleStart).concat(neighbor);
        }
      }

      recursionStack.delete(nodeId);
      path.pop();
      return false;
    };

    for (const node of graph.nodes) {
      if (!visited.has(node.id)) {
        const cycle = dfs(node.id);
        if (cycle) return cycle;
      }
    }

    return null;
  }

  private validateNodeConfig(node: IRNode): ValidationError[] {
    const errors: ValidationError[] = [];

    switch (node.kind) {
      case NodeKind.AGENT:
        if (!node.config.agentType) {
          errors.push({
            type: 'missing_config',
            message: 'Agent node must specify agentType',
            nodeId: node.id,
            severity: 'critical'
          });
        }
        break;

      case NodeKind.APPROVAL:
        if (!node.config.timeout) {
          warnings.push({
            type: 'missing_config',
            message: 'Approval node should have timeout',
            nodeId: node.id
          });
        }
        break;

      case NodeKind.TOOL:
        if (!node.config.toolName) {
          errors.push({
            type: 'missing_config',
            message: 'Tool node must specify toolName',
            nodeId: node.id,
            severity: 'critical'
          });
        }
        break;
    }

    return errors;
  }

  private validatePortTypes(
    edge: IREdge,
    source: IRNode,
    target: IRNode
  ): ValidationError | null {
    const sourcePort = source.ports.outputs.find(p => p.id === edge.source.portId);
    const targetPort = target.ports.inputs.find(p => p.id === edge.target.portId);

    if (!sourcePort || !targetPort) {
      return {
        type: 'invalid_port',
        message: 'Edge references non-existent port',
        edgeId: edge.id,
        severity: 'critical'
      };
    }

    if (sourcePort.type !== targetPort.type && sourcePort.type !== 'data') {
      return {
        type: 'port_mismatch',
        message: `Port type mismatch: ${sourcePort.type} != ${targetPort.type}`,
        edgeId: edge.id,
        severity: 'warning'
      };
    }

    return null;
  }
}
```

### Step 3: Workflow Step Generator

Create `platform-api/src/workflow/compiler/step-generator.ts`:
```typescript
import { GraphIR, NodeKind, IREdge, WorkflowStep } from './schema';

export class WorkflowStepGenerator {
  generate(graph: GraphIR): WorkflowStep[] {
    const steps: WorkflowStep[] = [];

    // Topologically sort nodes
    const sorted = this.topologicalSort(graph);

    for (const node of sorted) {
      switch (node.kind) {
        case NodeKind.AGENT:
          steps.push(this.createAgentStep(node));
          break;
        case NodeKind.TOOL:
          steps.push(this.createToolStep(node));
          break;
        case NodeKind.APPROVAL:
          steps.push(this.createApprovalStep(node));
          break;
        case NodeKind.PARALLEL:
          steps.push(...this.createParallelSteps(node));
          break;
        case NodeKind.CONDITION:
          steps.push(this.createConditionStep(node));
          break;
      }
    }

    return steps;
  }

  private topologicalSort(graph: GraphIR): IRNode[] {
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    for (const node of graph.nodes) {
      inDegree.set(node.id, 0);
      adjacency.set(node.id, []);
    }

    for (const edge of graph.edges) {
      adjacency.get(edge.source.nodeId)!.push(edge.target.nodeId);
      inDegree.set(edge.target.nodeId, (inDegree.get(edge.target.nodeId) || 0) + 1);
    }

    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) queue.push(nodeId);
    }

    const sorted: IRNode[] = [];
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const node = graph.nodes.find(n => n.id === nodeId)!;
      sorted.push(node);

      for (const neighbor of adjacency.get(nodeId)!) {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    return sorted;
  }

  private createAgentStep(node: IRNode): WorkflowStep {
    return {
      id: node.id,
      type: 'agent',
      config: {
        agentType: node.config.agentType,
        input: node.config.input || {}
      },
      retries: node.config.retries || {
        maxAttempts: 3,
        delay: 'exponential',
        backoff: 'exponential'
      },
      timeout: node.config.timeout || 60000,
      onError: node.config.onError || 'fail'
    };
  }

  private createToolStep(node: IRNode): WorkflowStep {
    return {
      id: node.id,
      type: 'tool',
      config: {
        toolName: node.config.toolName,
        params: node.config.params || {}
      },
      retries: {
        maxAttempts: 2,
        delay: 'fixed',
        backoff: 'fixed'
      },
      timeout: node.config.timeout || 30000,
      onError: node.config.onError || 'fail'
    };
  }

  private createApprovalStep(node: IRNode): WorkflowStep {
    return {
      id: node.id,
      type: 'approval',
      config: {
        approvalType: node.config.approvalType,
        message: node.config.message,
        timeout: node.config.timeout || 3600000 // 1 hour
      },
      timeout: node.config.timeout || 3600000,
      onError: 'fail'
    };
  }

  private createParallelSteps(node: IRNode): WorkflowStep[] {
    // Return a marker step that will be expanded later
    return [{
      id: node.id,
      type: 'parallel',
      config: {
        branches: node.config.branches || []
      },
      onError: 'continue'
    }];
  }

  private createConditionStep(node: IRNode): WorkflowStep {
    return {
      id: node.id,
      type: 'condition',
      config: {
        condition: node.config.condition,
        trueBranch: node.config.trueBranch,
        falseBranch: node.config.falseBranch
      },
      onError: 'fail'
    };
  }
}
```

### Step 4: Workflow Definition Generator

Create `platform-api/src/workflow/compiler/workflow-generator.ts`:
```typescript
import { WorkflowStep, CompiledWorkflow } from './schema';

export class WorkflowDefinitionGenerator {
  generate(steps: WorkflowStep[], graphId: string): CompiledWorkflow {
    const workflowSteps = this.mapStepsToWorkflow(steps);

    return {
      workflowId: graphId,
      definition: {
        name: `workflow-${graphId}`,
        binding: 'APP_BUILD_WORKFLOW',
        class_name: 'AppBuildWorkflow',
        steps: workflowSteps
      },
      steps,
      bindings: this.extractBindings(steps)
    };
  }

  private mapStepsToWorkflow(steps: WorkflowStep[]): any[] {
    const mapped: any[] = [];

    for (const step of steps) {
      switch (step.type) {
        case 'agent':
          mapped.push({
            id: step.id,
            agent_execute: {
              agent: step.config.agentType,
              input: step.config.input,
              retries: step.retries,
              timeout: step.timeout
            }
          });
          break;

        case 'tool':
          mapped.push({
            id: step.id,
            tool_invoke: {
              tool: step.config.toolName,
              params: step.config.params,
              retries: step.retries,
              timeout: step.timeout
            }
          });
          break;

        case 'approval':
          mapped.push({
            id: step.id,
            sleep_until: {
              condition: `approval_status === 'approved'`,
              max_wait: step.config.timeout,
              poll_interval: '30 seconds'
            }
          });
          break;

        case 'parallel':
          mapped.push({
            id: step.id,
            fan_out: {
              branches: step.config.branches.map((branch: any) => ({
                steps: branch.map((s: any) => this.mapStep(s))
              })),
              strategy: 'all_complete'
            }
          });
          break;
      }
    }

    return mapped;
  }

  private extractBindings(steps: WorkflowStep[]): Record<string, any> {
    const bindings: Record<string, any> = {
      AGENT_RUNTIME: { type: 'durable_object', class_name: 'AgentSession' },
      METRICS: { type: 'kv_namespace' },
      ARTIFACTS: { type: 'r2_bucket' }
    };

    // Add tool-specific bindings
    for (const step of steps) {
      if (step.type === 'tool') {
        bindings[step.config.toolName.toUpperCase()] = { type: 'binding' };
      }
    }

    return bindings;
  }
}
```

### Step 5: Runtime Workflow Deployment

Create `platform-api/src/workflow/compiler/deployer.ts`:
```typescript
import { CompiledWorkflow } from './workflow-generator';

export class WorkflowDeployer {
  async deploy(workflow: CompiledWorkflow): Promise<DeploymentResult> {
    // 1. Generate workflow code
    const workflowCode = this.generateWorkflowCode(workflow);

    // 2. Write to R2 for versioning
    await this.env.ARTIFACTS.put(
      `workflows/${workflow.workflowId}/definition.ts`,
      workflowCode
    );

    // 3. Deploy via Wrangler API
    const deployment = await this.deployWorkflow(workflowCode);

    // 4. Register in D1
    await this.env.DB.prepare(`
      INSERT INTO compiled_workflows (id, graph_id, definition, deployed_at)
      VALUES (?, ?, ?, ?)
    `).bind(
      workflow.workflowId,
      workflow.workflowId,
      JSON.stringify(workflow.definition),
      Date.now()
    ).run();

    return {
      success: true,
      workflowId: workflow.workflowId,
      endpoint: deployment.endpoint
    };
  }

  private generateWorkflowCode(workflow: CompiledWorkflow): string {
    return `
import { Workflow } from '@cloudflare/workflows';

export interface Env {
  AGENT_RUNTIME: DurableObjectNamespace;
  METRICS: KVNamespace;
  ARTIFACTS: R2Bucket;
}

export class CompiledWorkflow extends Workflow<Env> {
  async run() {
    ${workflow.definition.steps.map(step => this.translateStep(step)).join('\n    ')}
  }
}
`;
  }

  private translateStep(step: any): string {
    switch (Object.keys(step)[0]) {
      case 'id':
        return `/* Step: ${step.id} */`;
      case 'agent_execute':
        return `await this.invokeAgent('${step.id}', ${JSON.stringify(step.agent_execute)})`;
      case 'tool_invoke':
        return `await this.invokeTool('${step.id}', ${JSON.stringify(step.tool_invoke)})`;
      case 'sleep_until':
        return `await this.sleepUntil(${JSON.stringify(step.sleep_until)})`;
      default:
        return '';
    }
  }
}
```

### Step 6: Integration with Portal

Create `platform-api/src/routes/workflows.ts`:
```typescript
import { Hono } from 'hono';
import { GraphValidator } from '../workflow/compiler/graph-validator';
import { WorkflowStepGenerator } from '../workflow/compiler/step-generator';
import { WorkflowDefinitionGenerator } from '../workflow/compiler/workflow-generator';
import { WorkflowDeployer } from '../workflow/compiler/deployer';

export const workflowRoutes = new Hono();

workflowRoutes.post('/compile', async (c) => {
  const graph: GraphIR = await c.req.json();
  const userId = c.get('userId');

  // Validate graph
  const validator = new GraphValidator();
  const validation = validator.validate(graph);

  if (!validation.valid) {
    return c.json({ error: 'Invalid graph', details: validation.errors }, 400);
  }

  // Generate steps
  const stepGenerator = new WorkflowStepGenerator();
  const steps = stepGenerator.generate(graph);

  // Generate workflow definition
  const definitionGen = new WorkflowDefinitionGenerator();
  const compiled = definitionGen.generate(steps, graph.id);

  // Deploy workflow
  const deployer = new WorkflowDeployer();
  const result = await deployer.deploy(compiled);

  return c.json({
    workflowId: result.workflowId,
    endpoint: result.endpoint,
    graph: compiled
  });
});
```

## Deliverables
- [ ] Graph IR schema
- [ ] Graph validator (cycle detection, type checking)
- [ ] Workflow step generator
- [ ] Workflow definition generator
- [ ] Runtime deployer
- [ ] API endpoint for compilation

## Acceptance Criteria
- [ ] Valid graphs compile successfully
- [ ] Invalid graphs rejected with clear errors
- [ ] Parallel branches generate fan-out steps
- [ ] Approval nodes generate sleep_until
- [ ] Deployed workflows execute on Cloudflare
- [ ] Compilation completes in <5s