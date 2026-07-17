# Visual Agent Builder - Detailed Implementation Plan

**Status:** PENDING
**Prerequisite:** Plans 14-17 complete (Testing, Multi-Agent, CopilotKit)
**Estimated Timeline:** 5-6 weeks
**Complexity:** High

---

## 🎯 Executive Summary

Build a **no-code visual workflow builder** that allows users to:
1. Drag-and-drop agent nodes (Builder, Tester, Reviewer, Deployer)
2. Connect nodes with edges to define execution flow
3. Configure tools, approvals, and conditions visually
4. Compile graphs to Cloudflare Workflows
5. Execute and monitor workflows in real-time

---

## 🏗️ System Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Visual Agent Builder                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐         ┌──────────────────────────┐       │
│  │ Frontend (SPA) │         │ Backend (Worker API)      │       │
│  │                │         │                          │       │
│  │ ┌────────────┐ │         │ ┌──────────────────────┐ │       │
│  │ │ Graph      │ │         │ │ Graph Compiler       │ │       │
│  │ │ Editor     │ │  GRAPH  │ │ (IR → Workflow)      │ │       │
│  │ │ (Canvas)   │ │──────▶  │ │                      │ │       │
│  │ └────────────┘ │         │ └──────────────────────┘ │       │
│  │                │         │                          │       │
│  │ ┌────────────┐ │         │ ┌──────────────────────┐ │       │
│  │ │ Node       │ │         │ │ Workflow Runtime     │ │       │
│  │ │ Palette    │ │         │ │ (Cloudflare WF)      │ │       │
│  │ └────────────┘ │         │ └──────────────────────┘ │       │
│  │                │         │                          │       │
│  │ ┌────────────┐ │         │ ┌──────────────────────┐ │       │
│  │ │ Properties │ │         │ │ Agent Registry       │ │       │
│  │ │ Panel      │ │         │ │ & Tool Discovery     │ │       │
│  │ └────────────┘ │         │ └──────────────────────┘ │       │
│  │                │         │                          │       │
│  │ ┌────────────┐ │         │ ┌──────────────────────┐ │       │
│  │ │ Execution  │ │  SSE    │ │ Execution Monitor    │ │       │
│  │ │ Monitor    │ │◀───────│ │ & Metrics            │ │       │
│  │ └────────────┘ │         │ └──────────────────────┘ │       │
│  └────────────────┘         └──────────────────────────┘       │
│         ▲                              │                        │
│         │                              ▼                        │
│  ┌────────────────┐         ┌──────────────────────────┐       │
│  │   Browser      │         │ Cloudflare Platform       │       │
│  │   (User)       │         │ ├─ Workflows              │       │
│  └────────────────┘         │ ├─ Durable Objects        │       │
│                              │ ├─ D1 (metadata)          │       │
│                              │ ├─ KV (cache)             │       │
│                              │ └─ R2 (artifacts)         │       │
│                              └──────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📐 Graph IR Schema (Intermediate Representation)

### Core Types

```typescript
// cloudflare/portal/src/lib/types/workflow-graph.ts

export interface WorkflowGraph {
  id: string;
  name: string;
  description?: string;
  version: string;
  tenantId: string;
  userId: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  metadata: {
    createdAt: number;
    updatedAt: number;
    tags: string[];
    template?: string;
  };
}

export type WorkflowNodeType = 
  | 'agent'           // AI agent execution
  | 'tool'            // Direct tool invocation
  | 'approval'        // Human approval gate
  | 'condition'       // Conditional branching
  | 'parallel'        // Fan-out execution
  | 'merge'           // Fan-in aggregation
  | 'transform'       // Data transformation
  | 'input'           // User input
  | 'output';         // Final output

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  label: string;
  position: { x: number; y: number };
  config: NodeConfig;
  validation?: ValidationResult;
}

export type NodeConfig = 
  | AgentNodeConfig
  | ToolNodeConfig
  | ApprovalNodeConfig
  | ConditionNodeConfig
  | ParallelNodeConfig
  | TransformNodeConfig
  | InputNodeConfig
  | OutputNodeConfig;

export interface AgentNodeConfig {
  agentType: 'builder' | 'tester' | 'reviewer' | 'deployer' | 'docs' | 'support';
  prompt?: string;
  tools: string[];  // Tool names this agent can use
  model?: string;   // AI model to use
  temperature?: number;
  maxTokens?: number;
}

export interface ToolNodeConfig {
  toolName: string;
  parameters: Record<string, any>;
  timeout?: number;
  retries?: number;
}

export interface ApprovalNodeConfig {
  approvers: string[];  // User IDs or roles
  timeout: number;       // ms
  escalation?: {
    after: number;       // ms
    action: 'approve' | 'reject' | 'escalate';
  };
  channels: ('email' | 'slack' | 'portal')[];
}

export interface ConditionNodeConfig {
  expression: string;    // JavaScript expression
  branches: {
    true: string;        // Node ID for true branch
    false: string;       // Node ID for false branch
  };
}

export interface ParallelNodeConfig {
  branches: string[];    // Node IDs to execute in parallel
  maxConcurrency?: number;
  continueOnError: boolean;
}

export interface TransformNodeConfig {
  mapping: Record<string, string>;  // Input field → Output field
  script?: string;                  // Optional transformation script
}

export interface WorkflowEdge {
  id: string;
  source: string;      // Source node ID
  target: string;      // Target node ID
  condition?: string;  // Optional condition for conditional edges
  transform?: TransformNodeConfig;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  nodeId?: string;
  edgeId?: string;
  code: string;
  message: string;
  severity: 'error' | 'warning';
}
```

---

## 🎨 Frontend Implementation

### Directory Structure

```
cloudflare/portal/src/lib/
├── components/
│   └── agent-builder/
│       ├── AgentBuilder.svelte              # Main container
│       ├── canvas/
│       │   ├── GraphCanvas.svelte           # SVG canvas
│       │   ├── GraphBackground.svelte       # Grid pattern
│       │   ├── MiniMap.svelte               # Navigation preview
│       │   └── ZoomControls.svelte          # Zoom in/out/reset
│       ├── nodes/
│       │   ├── AgentNode.svelte             # Agent node component
│       │   ├── ToolNode.svelte              # Tool node component
│       │   ├── ApprovalNode.svelte          # Approval gate node
│       │   ├── ConditionNode.svelte         # Branching node
│       │   ├── ParallelNode.svelte          # Parallel execution node
│       │   └── NodeWrapper.svelte           # Common node wrapper
│       ├── edges/
│       │   ├── ConnectionEdge.svelte        # SVG edge
│       │   ├── EdgeLabel.svelte             # Condition labels
│       │   └── AnimatedEdge.svelte          # Execution animation
│       ├── toolbar/
│       │   ├── NodePalette.svelte           # Draggable node types
│       │   ├── TemplateLibrary.svelte       # Pre-built templates
│       │   └── ToolbarActions.svelte        # Save, run, export
│       ├── properties/
│       │   ├── PropertiesPanel.svelte       # Configuration panel
│       │   ├── AgentConfig.svelte           # Agent settings
│       │   ├── ToolConfig.svelte            # Tool settings
│       │   └── ApprovalConfig.svelte        # Approval settings
│       └── monitor/
│           ├── ExecutionMonitor.svelte      # Real-time status
│           ├── NodeStatus.svelte            # Per-node status
│           └── ExecutionLog.svelte          # Detailed logs
├── stores/
│   ├── workflow-graph.svelte.ts            # Graph state
│   ├── workflow-execution.svelte.ts        # Execution state
│   └── workflow-templates.svelte.ts        # Template library
├── utils/
│   ├── graph-validator.ts                  # Validate graph before compile
│   ├── graph-serializer.ts                 # Graph ↔ JSON
│   └── graph-compiler-client.ts            # Call compile API
└── api/
    └── workflow.ts                          # API methods
```

### Key Components Implementation

#### 1. GraphCanvas.svelte (SVG-based)

```svelte
<script lang="ts">
  import { workflowGraphStore } from '$lib/stores/workflow-graph.svelte';
  import NodeWrapper from './nodes/NodeWrapper.svelte';
  import ConnectionEdge from './edges/ConnectionEdge.svelte';
  import { onMount } from 'svelte';
  
  let canvas: SVGSVGElement;
  let zoom = $state(1);
  let pan = $state({ x: 0, y: 0 });
  let selectedNode = $state<string | null>(null);
  
-values
  // Pan handling
  function handleMouseDown(e: MouseEvent) {
    if (e.target === canvas) {
      panning = true;
      startPan = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  }
  
  function handleMouseMove(e: MouseEvent) {
    if (panning) {
      pan = { x: e.clientX - startPan.x, y: e.clientY - startPan.y };
    }
  }
  
  function handleMouseUp() {
    panning = false;
  }
  
  // Zoom handling
  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    zoom = Math.min(Math.max(zoom * delta, 0.1), 2);
  }
  
  // Node selection
  function selectNode(nodeId: string) {
    selectedNode = nodeId;
    workflowGraphStore.selectNode(nodeId);
  }
</script>

<svg 
  bind:this={canvas}
  onmousedown={handleMouseDown}
  onmousemove={handleMouseMove}
  onmouseup={handleMouseUp}
  onmouseleave={handleMouseUp}
  onwheel={handleWheel}
  class="graph-canvas"
>
  <!-- Grid background -->
  <GraphBackground {zoom} {pan} />
  
  <!-- Transform group -->
  <g transform="translate({pan.x}, {pan.y}) scale({zoom})">
    <!-- Edges (render first, behind nodes) -->
    {#each $workflowGraphStore.edges as edge}
      <ConnectionEdge {edge} />
    {/each}
    
    <!-- Nodes -->
    {#each $workflowGraphStore.nodes as node}
      <NodeWrapper 
        {node} 
        selected={selectedNode === node.id}
        onclick={() => selectNode(node.id)}
      />
    {/each}
  </g>
</svg>

<!-- Zoom controls -->
<ZoomControls bind:zoom />

<!-- Minimap -->
<MiniMap nodes={$workflowGraphStore.nodes} edges={$workflowGraphStore.edges} />

<style>
  .graph-canvas {
    width: 100%;
    height: 100%;
    background: #f8fafc;
    cursor: grab;
  }
  
  .graph-canvas:active {
    cursor: grabbing;
  }
</style>
```

#### 2. AgentNode.svelte

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { WorkflowNode, AgentNodeConfig } from '$lib/types/workflow-graph';
  
  export let node: WorkflowNode;
  export let selected: boolean;
  
  const dispatch = createEventDispatcher();
  const config = node.config as AgentNodeConfig;
  
  // Agent type icons
  const agentIcons: Record<string, string> = {
    builder: '🔨',
    tester: '🧪',
    reviewer: '👁️',
    deployer: '🚀',
    docs: '📚',
    support: '💬'
  };
  
  // Agent type colors
  const agentColors: Record<string, string> = {
    builder: '#3b82f6',
    tester: '#eab308',
    reviewer: '#f97316',
    deployer: '#ef4444',
    docs: '#8b5cf6',
    support: '#06b6d4'
  };
  
  function handleDragStart(e: DragEvent) {
    e.dataTransfer.setData('nodeType', 'agent');
    e.dataTransfer.setData('agentType', config.agentType);
  }
</script>

<div 
  class="agent-node"
  class:selected
  style="border-color: {agentColors[config.agentType]}"
  draggable="true"
  ondragstart={handleDragStart}
  on:click
  on:delete
>
  <div class="node-header" style="background: {agentColors[config.agentType]}">
    <span class="icon">{agentIcons[config.agentType]}</span>
    <span class="label">{node.label}</span>
  </div>
  
  <div class="node-body">
    <div class="config">
      {#if config.tools.length > 0}
        <div class="tools">
          {#each config.tools as tool}
            <span class="tool-badge">{tool}</span>
          {/each}
        </div>
      {/if}
      
      {#if config.model}
        <div class="model">Model: {config.model}</div>
      {/if}
    </div>
    
    <!-- Execution status indicator -->
    <div class="status">
      <slot name="status" />
    </div>
  </div>
  
  <!-- Connection ports -->
  <div class="port input" />
  <div class="port output" />
</div>

<style>
  .agent-node {
    position: absolute;
    width: 200px;
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 0.5rem;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    cursor: move;
    user-select: none;
  }
  
  .agent-node.selected {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
  
  .node-header {
    padding: 0.5rem;
    border-radius: 0.375rem 0.375rem 0 0;
    color: white;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .node-body {
    padding: 0.75rem;
  }
  
  .tools {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    margin-top: 0.5rem;
  }
  
  .tool-badge {
    font-size: 0.75rem;
    background: #f1f5f9;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    color: #475569;
  }
  
  .port {
    position: absolute;
    width: 12px;
    height: 12px;
    background: #3b82f6;
    border: 2px solid white;
    border-radius: 50%;
    cursor: crosshair;
  }
  
  .port.input {
    top: 50%;
    left: -6px;
 transform: translateY(-50%);
  }
  
  .port.output {
    top: 50%;
    right: -6px;
    transform: translateY(-50%);
  }
</style>
```

#### 3. PropertiesPanel.svelte

```svelte
<script lang="ts">
  import { workflowGraphStore } from '$lib/stores/workflow-graph.svelte';
  import AgentConfig from './properties/AgentConfig.svelte';
  import ToolConfig from './properties/ToolConfig.svelte';
  import ApprovalConfig from './properties/ApprovalConfig.svelte';
  
  let selectedNode = $derived(
    $workflowGraphStore.nodes.find(n => n.id === $workflowGraphStore.selectedNodeId)
  );
  
  function handleConfigChange(config: any) {
    if (selectedNode) {
      workflowGraphStore.updateNode(selectedNode.id, { config });
    }
  }
  
  function handleDelete() {
    if (selectedNode) {
      workflowGraphStore.deleteNode(selectedNode.id);
    }
  }
</script>

{#if selectedNode}
  <div class="properties-panel">
    <div class="header">
      <h3>{selectedNode.label}</h3>
      <button onclick={handleDelete} class="delete-btn">🗑️</button>
    </div>
    
    <div class="config-section">
      <label>Node Type</label>
      <input 
        type="text" 
        value={selectedNode.type} 
        disabled 
      />
    </div>
    
    {#if selectedNode.type === 'agent'}
      <AgentConfig 
        config={selectedNode.config} 
        onChange={handleConfigChange}
      />
    {:else if selectedNode.type === 'tool'}
      <ToolConfig 
        config={selectedNode.config} 
        onChange={handleConfigChange}
      />
    {:else if selectedNode.type === 'approval'}
      <ApprovalConfig 
        config={selectedNode.config} 
        onChange={handleConfigChange}
      />
    {/if}
    
    <div class="actions">
      <button onclick={() => workflowGraphStore.selectNode(null)}>
        Close
      </button>
    </div>
  </div>
{:else}
  <div class="empty-state">
    <p>Select a node to configure</p>
  </div>
{/if}

<style>
  .properties-panel {
    width: 300px;
    background: white;
    border-left: 1px solid #e2e8f0;
    padding: 1rem;
    overflow-y: auto;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .delete-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.25rem;
  }
  
  .config-section {
    margin-bottom: 1rem;
  }
  
  label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 0.25rem;
  }
  
  input, select, textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #e2e8f0;
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }
  
  textarea {
    min-height: 100px;
    font-family: monospace;
  }
  
  .actions {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e2e8f0;
  }
  
  button {
    padding: 0.5rem 1rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
  }
  
  button:hover {
    background: #2563eb;
  }
  
  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #94a3b8;
  }
</style>
```

---

## ⚙️ Backend Implementation

### Directory Structure

```
cloudflare/platform-api/src/
├── workflows/
│   ├── Compiler.ts              # Graph IR → Cloudflare Workflow
│   ├── Validator.ts             # Validate graph structure
│   ├── Runtime.ts               # Execute workflows
│   ├── Persistence.ts           # Save/load graphs
│   ├── steps/
│   │   ├── AgentStep.ts         # Execute AI agent
│   │   ├── ToolStep.ts          # Execute tool
│   │   ├── ApprovalStep.ts      # Human approval gate
│   │   ├── ConditionStep.ts     # Branching logic
│   │   └── ParallelStep.ts      # Fan-out execution
│   └── types.ts                 # Workflow type definitions
├── agents/
│   └── registry/
│       └── Registry.ts          # Agent discovery & capabilities
├── tools/
│   └── ToolRegistry.ts          # Tool discovery & validation
└── routes/
    └── workflows/
        ├── routes.ts            # API endpoints
        ├── compile.ts           # Compile graph → workflow
        ├── execute.ts           # Start workflow execution
        └── status.ts            # Get execution status
```

### Key Services

#### 1. GraphValidator.ts

```typescript
export class GraphValidator {
  validate(graph: WorkflowGraph): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // 1. Check for cycles
    const cycle = this.detectCycle(graph);
    if (cycle) {
      errors.push({
        code: 'CYCLE_DETECTED',
        message: `Graph contains cycle: ${cycle.join(' → ')}`,
        severity: 'error'
      });
    }
    
    // 2. Check all nodes have required config
    for (const node of graph.nodes) {
      const nodeErrors = this.validateNode(node);
      errors.push(...nodeErrors);
    }
    
    // 3. Check all edges reference valid nodes
    const nodeIds = new Set(graph.nodes.map(n => n.id));
    for (const edge of graph.edges) {
      if (!nodeIds.has(edge.source)) {
        errors.push({
          edgeId: edge.id,
          code: 'INVALID_SOURCE',
          message: `Edge source node not found: ${edge.source}`,
          severity: 'error'
        });
      }
      if (!nodeIds.has(edge.target)) {
        errors.push({
          edgeId: edge.id,
          code: 'INVALID_TARGET',
          message: `Edge target node not found: ${edge.target}`,
          severity: 'error'
        });
      }
    }
    
    // 4. Check for disconnected nodes
    const connectedNodes = this.findConnectedNodes(graph);
    for (const node of graph.nodes) {
      if (!connectedNodes.has(node.id) && node.type !== 'input' && node.type !== 'output') {
        warnings.push({
          nodeId: node.id,
          code: 'DISCONNECTED_NODE',
          message: `Node ${node.label} is not connected`,
          severity: 'warning'
        });
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  private detectCycle(graph: WorkflowGraph): string[] | null {
    // Topological sort with cycle detection
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];
    
    function dfs(nodeId: string): string[] | null {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);
      
      const outgoingEdges = graph.edges.filter(e => e.source === nodeId);
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.target)) {
          const cycle = dfs(edge.target);
          if (cycle) return cycle;
        } else if (recursionStack.has(edge.target)) {
          // Found cycle
          const cycleStart = path.indexOf(edge.target);
          return [...path.slice(cycleStart), edge.target];
        }
      }
      
      recursionStack.delete(nodeId);
      path.pop();
      return null;
    }
    
    const inputNodes = graph.nodes.filter(n => n.type === 'input');
    for (const node of inputNodes) {
      if (!visited.has(node.id)) {
        const cycle = dfs(node.id);
        if (cycle) return cycle;
      }
    }
    
    return null;
  }
}
```

#### 2. Compiler.ts

```typescript
export class GraphToWorkflowCompiler {
  compile(graph: WorkflowGraph): CloudflareWorkflowDefinition {
    // Validate graph first
    const validator = new GraphValidator();
    const validation = validator.validate(graph);
    if (!validation.isValid) {
      throw new Error(`Invalid graph: ${validation.errors.map(e => e.message).join(', ')}`);
    }
    
    // Topological sort
    const sortedNodes = this.topologicalSort(graph);
    
    // Compile nodes to workflow steps
    const steps: WorkflowStep[] = [];
    for (const node of sortedNodes) {
      const step = this.compileNode(node, graph);
      steps.push(step);
    }
    
    return {
      name: graph.name,
      kind: 'agent-builder',
      tasks: steps,
      // Keep edges for runtime reference
      edges: graph.edges
    };
  }
  
  private compileNode(node: WorkflowNode, graph: WorkflowGraph): WorkflowStep {
    switch (node.type) {
      case 'agent':
        return this.compileAgentNode(node);
      case 'tool':
        return this.compileToolNode(node);
      case 'approval':
        return this.compileApprovalNode(node);
      case 'condition':
        return this.compileConditionNode(node, graph);
      case 'parallel':
        return this.compileParallelNode(node, graph);
      default:
        throw new Error(`Unsupported node type: ${node.type}`);
    }
  }
  
  private compileAgentNode(node: WorkflowNode): WorkflowStep {
    const config = node.config as AgentNodeConfig;
    
    return {
      name: node.id,
      job: async (ctx: Context) => {
        const agent = await AgentRegistry.get(config.agentType);
        const result = await agent.execute({
          prompt: config.prompt,
          tools: config.tools,
          model: config.model,
          temperature: config.temperature,
          maxTokens: config.maxTokens
        });
        
        // Store result in workflow state
        ctx.setState(node.id, result);
        return result;
      },
      retries: {
        maxAttempts: 3,
        delay: 'exponential',
        maxDelay: '30s'
      },
      timeout: '10 minutes'
    };
  }
  
  private compileApprovalNode(node: WorkflowNode): WorkflowStep {
    const config = node.config as ApprovalNodeConfig;
    
    return {
      name: node.id,
      job: async (ctx: Context) => {
        // Send notification to approvers
        const approvalId = await ApprovalService.create({
          workflowId: ctx.workflowId,
          nodeId: node.id,
          approvers: config.approvers,
          timeout: config.timeout,
          channels: config.channels
        });
        
        // Wait for approval (pauses workflow, no CPU billing)
        const approved = await ctx.sleepUntil(
          async () => {
            const status = await ApprovalService.getStatus(approvalId);
            return status === 'approved';
          },
          { 
            maxWait: `${Math.floor(config.timeout / 1000)}s`,
            pollInterval: '30s'
          }
        );
        
        if (!approved) {
          throw new Error('Approval timeout or rejected');
        }
        
        return { approvalId, status: 'approved' };
      },
      retries: 0,  // Don't retry approvals
      timeout: `${Math.floor(config.timeout / 1000)}s`
    };
  }
  
  private compileConditionNode(node: WorkflowNode, graph: WorkflowGraph): WorkflowStep {
    const config = node.config as ConditionNodeConfig;
    
    return {
      name: node.id,
      job: async (ctx: Context) => {
        const context = ctx.getState();
        
        // Evaluate condition
        const result = this.evaluateExpression(config.expression, context);
        
        // Return next node IDs based on condition
        const nextNodeId = result ? config.branches.true : config.branches.false;
        
        return {
          condition: config.expression,
          result,
          nextNodeId
        };
      },
      retries: 0
    };
  }
  
  private compileParallelNode(node: WorkflowNode, graph: WorkflowGraph): WorkflowStep {
    const config = node.config as ParallelNodeConfig;
    
    // Compile to fan-out pattern
    return {
      name: node.id,
      job: async (ctx: Context) => {
        // Execute all branches in parallel
        const results = await Promise.allSettled(
          config.branches.map(branchId => this.executeNode(branchId, ctx))
        );
        
        // Check if we should continue on error
        if (!config.continueOnError) {
          const failures = results.filter(r => r.status === 'rejected');
          if (failures.length > 0) {
            throw new Error(`${failures.length} branches failed`);
          }
        }
        
        return results.map(r => r.status === 'fulfilled' ? r.value : null);
      },
      retries: {
        maxAttempts: 2,
        delay: 'fixed',
        delayMs: 5000
      }
    };
  }
  
  private topologicalSort(graph: WorkflowGraph): WorkflowNode[] {
    // Standard topological sort with cycle detection
    const sorted: WorkflowNode[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    
    function visit(nodeId: string): void {
      if (visited.has(nodeId)) return;
      if (visiting.has(nodeId)) {
        throw new Error('Cycle detected in graph');
      }
      
      visiting.add(nodeId);
      
      const outgoingEdges = graph.edges.filter(e => e.source === nodeId);
      for (const edge of outgoingEdges) {
        visit(edge.target);
      }
      
      visiting.delete(nodeId);
      visited.add(nodeId);
      
      const node = graph.nodes.find(n => n.id === nodeId);
      if (node) {
        sorted.push(node);
      }
    }
    
    // Start from input nodes
    const inputNodes = graph.nodes.filter(n => n.type === 'input');
    for (const node of inputNodes) {
      visit(node.id);
    }
    
    return sorted.reverse();
  }
}
```

#### 3. API Routes

```typescript
// cloudflare/platform-api/src/routes/workflows/routes.ts

export const workflowRoutes = new Hono();

// POST /api/workflows/compile - Compile graph to workflow
workflowRoutes.post('/compile', async (c) => {
  const tenantId = c.get('tenantId');
  const userId = c.get('userId');
  
  try {
    const graph: WorkflowGraph = await c.req.json();
    
    // Validate
    const validator = new GraphValidator();
    const validation = validator.validate(graph);
    if (!validation.isValid) {
      return c.json({ error: 'Invalid graph', details: validation.errors }, 400);
    }
    
    // Compile to Cloudflare Workflow
    const compiler = new GraphToWorkflowCompiler();
    const workflowDef = compiler.compile(graph);
    
    // Save graph to D1
    const workflowId = await WorkflowPersistence.save(graph, tenantId, userId);
    
    // Deploy workflow to Cloudflare
    const deployedWorkflow = await WorkflowRuntime.deploy(workflowDef);
    
    // Update graph with workflow ID
    await WorkflowPersistence.updateWorkflowId(workflowId, deployedWorkflow.id);
    
    return c.json({
      workflowId,
      compiledWorkflowId: deployedWorkflow.id,
      validation
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/workflows/:id/execute - Execute workflow
workflowRoutes.post('/:id/execute', async (c) => {
  const workflowId = c.req.param('id');
  const tenantId = c.get('tenantId');
  
  const graph = await WorkflowPersistence.load(workflowId, tenantId);
  if (!graph) {
    return c.json({ error: 'Workflow not found' }, 404);
  }
  
  // Compile and execute
  const compiler = new GraphToWorkflowCompiler();
  const workflowDef = compiler.compile(graph);
  
  const execution = await WorkflowRuntime.execute(workflowDef, {
    workflowId,
    tenantId
  });
  
  return c.json({
    executionId: execution.id,
    status: execution.status
  });
});

// GET /api/workflows/:id/status - Get execution status
workflowRoutes.get('/:id/status', async (c) => {
  const workflowId = c.req.param('id');
  const tenantId = c.get('tenantId');
  
  const executions = await WorkflowPersistence.getExecutions(workflowId, tenantId);
  
  return c.json({ executions });
});

// GET /api/workflows - List user workflows
workflowRoutes.get('/', async (c) => {
  const tenantId = c.get('tenantId');
  const userId = c.get('userId');
  
  const workflows = await WorkflowPersistence.list(tenantId, userId);
  
  return c.json({ workflows });
});
```

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
// tests/workflow/compiler.test.ts
describe('GraphToWorkflowCompiler', () => {
  it('should compile simple linear workflow', () => {
    const graph = {
      nodes: [
        { id: '1', type: 'agent', label: 'Builder' },
        { id: '2', type: 'agent', label: 'Deployer' }
      ],
      edges: [
        { id: 'e1', source: '1', target: '2' }
      ]
    };
    
    const compiler = new GraphToWorkflowCompiler();
    const workflow = compiler.compile(graph);
    
    expect(workflow.tasks).toHaveLength(2);
    expect(workflow.tasks[0].name).toBe('1');
    expect(workflow.tasks[1].name).toBe('2');
  });
  
  it('should reject cyclic graphs', () => {
    const graph = {
      nodes: [
        { id: '1', type: 'agent', label: 'A' },
        { id: '2', type: 'agent', label: 'B' }
      ],
      edges: [
        { id: 'e1', source: '1', target: '2' },
        { id: 'e2', source: '2', target: '1' }
      ]
    };
    
    expect(() => compiler.compile(graph)).toThrow('Cycle detected');
  });
});
```

### Integration Tests

```typescript
// tests/workflow/integration.test.ts
describe('Workflow Integration', () => {
  it('should compile and execute workflow end-to-end', async () => {
    // 1. Create graph
    const graph = createTestGraph();
    
    // 2. Compile
    const compileResponse = await app.request('/api/workflows/compile', {
      method: 'POST',
      body: JSON.stringify(graph)
    });
    const { workflowId } = await compileResponse.json();
    
    // 3. Execute
    const execResponse = await app.request(`/api/workflows/${workflowId}/execute`, {
      method: 'POST'
    });
    const { executionId } = await execResponse.json();
    
    // 4. Poll status
    await waitForExecution(executionId, 'completed', 60000);
  });
});
```

---

## 📊 Timeline & Milestones

### Week 1: Foundation (15h)
- [ ] Define Graph IR schema (Day 1-2)
- [ ] Implement GraphValidator (Day 2-3)
- [ ] Setup backend workflow routes (Day 3-4)
- [ ] Create GraphCanvas component (Day 4-5)
- [ ] Implement basic AgentNode (Day 5)

**Milestone:** Can create and display simple graphs

### Week 2: Core Features (20h)
- [ ] Add ToolNode, ApprovalNode, ConditionNode (Day 1-2)
- [ ] Implement ConnectionEdge rendering (Day 2)
- [ ] Build NodePalette toolbar (Day 3)
- [ ] Create PropertiesPanel (Day 3-4)
- [ ] Implement graph serialization/deserialization (Day 4-5)

**Milestone:** Can create complete workflows with all node types

### Week 3: Compiler & Runtime (18h)
- [ ] Implement GraphToWorkflowCompiler (Day 1-2)
- [ ] Create WorkflowStep implementations (Day 2-4)
- [ ] Build WorkflowRuntime service (Day 4-5)
- [ ] Test compilation end-to-end (Day 5)

**Milestone:** Can compile graphs to Cloudflare Workflows

### Week 4: Execution & Monitoring (15h)
- [ ] Implement ExecutionMonitor component (Day 1-2)
- [ ] Add real-time SSE streaming (Day 2-3)
- [ ] Build ExecutionLog viewer (Day 3-4)
- [ ] Add node status highlighting (Day 4-5)

**Milestone:** Can execute workflows and monitor in real-time

### Week 5: Polish & Templates (12h)
- [ ] Build template library (Day 1-2)
- [ ] Add import/export (Day 2-3)
- [ ] Implement validation UI (Day 3-4)
- [ ] Add error handling & user feedback (Day 4-5)

**Milestone:** Production-ready visual builder

### Week 6: Advanced Features (10h)
- [ ] Parallel execution (fan-out/fan-in) (Day 1-2)
- [ ] Conditional branching (Day 2-3)
- [ ] Real-time collaboration (optional) (Day 3-4)
- [ ] Performance optimization (Day 4-5)

**Milestone:** Advanced features complete

---

## 🎯 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Graph creation time | <5 min for simple workflows | User testing |
| Compilation time | <2s | Automated test |
| Execution success rate | >95% | Monitoring |
| UI responsiveness | 60fps | Performance test |
| Error message clarity | Users understand errors | User feedback |

---

## 🚧 Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Graph editor complexity | High | Use proven libraries (svelte-dnd-action, SVG) |
| Cloudflare Workflows maturity | Medium | Start with simple workflows, test thoroughly |
| Performance with large graphs | Medium | Implement virtualization for 50+ nodes |
| Learning curve for users | Medium | Provide templates and guided tours |
| Debugging compiled workflows | High | Add detailed execution logs and visual debugging |

---

## 📝 Next Steps

1. **Get approval** on architecture and Graph IR schema
2. **Create detailed task breakdowns** for each component
3. **Set up development environment** with required dependencies
4. **Build proof-of-concept** (simple linear workflow)
5. **Iterate and polish** based on user feedback

---

## 🔗 Related Documentation

- `Daily plan 15/PLAN.md` - Multi-Agent Orchestration foundation
- `Daily plan 16/PLAN.md` - Agent ecosystem & tools
- `docs/Architecture/VISUAL_GRAPH_BUILDER_ARCHITECTURE.md` - Existing builder architecture
- `docs/FrontEnd/FEATURE_PATTERNS.md` - Svelte component patterns