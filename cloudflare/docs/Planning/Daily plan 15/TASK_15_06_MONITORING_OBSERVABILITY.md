# TASK 15-06: Workflow Observability & Monitoring

## Objective
Implement comprehensive monitoring for Cloudflare Workflows and agents using built-in Workflow observability features, including step-level metrics, execution traces, and alerting.

## Prerequisites
- TASK 15-01 completed (Agent Runtime Foundation)
- TASK 15-02 completed (Workflow Definition)
- TASK 15-03 completed (Tool Ecosystem)
- TASK 15-04 completed (Parallel Execution)
- TASK 15-05 completed (Approval Gates)
- Cloudflare Analytics Engine enabled

## Implementation

### Step 1: Distributed Tracing

Create `platform-api/src/orchestration/tracing.ts`:
```typescript
export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  agentId: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'ok' | 'error';
  error?: string;
  metadata?: Record<string, any>;
}

export interface Trace {
  traceId: string;
  rootSpanId: string;
  spans: TraceSpan[];
  startTime: number;
  endTime: number;
  duration: number;
  status: 'ok' | 'error';
}

export class DistributedTracer {
  private traces: Map<string, TraceSpan[]> = new Map();
  private activeSpans: Map<string, TraceSpan> = new Map();

  startTrace(traceId: string, rootSpanId: string, agentId: string, operation: string): TraceSpan {
    const span: TraceSpan = {
      traceId,
      spanId: rootSpanId,
      agentId,
      operation,
      startTime: Date.now(),
      status: 'ok'
    };

    if (!this.traces.has(traceId)) {
      this.traces.set(traceId, []);
    }
    this.traces.get(traceId)!.push(span);
    this.activeSpans.set(rootSpanId, span);

    return span;
  }

  startSpan(
    parentSpanId: string,
    agentId: string,
    operation: string
  ): TraceSpan | null {
    const parent = this.activeSpans.get(parentSpanId);
    if (!parent) {
      console.warn(`[Tracer] Parent span ${parentSpanId} not found`);
      return null;
    }

    const spanId = `span-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const span: TraceSpan = {
      traceId: parent.traceId,
      spanId,
      parentSpanId,
      agentId,
      operation,
      startTime: Date.now(),
      status: 'ok'
    };

    this.traces.get(parent.traceId)!.push(span);
    this.activeSpans.set(spanId, span);

    return span;
  }

  endSpan(spanId: string, error?: Error): void {
    const span = this.activeSpans.get(spanId);
    if (!span) {
      console.warn(`[Tracer] Span ${spanId} not found`);
      return;
    }

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = error ? 'error' : 'ok';
    span.error = error?.message;

    this.activeSpans.delete(spanId);

    // Export to Analytics Engine
    this.exportSpan(span);
  }

  getTrace(traceId: string): Trace | null {
    const spans = this.traces.get(traceId);
    if (!spans || spans.length === 0) return null;

    const rootSpan = spans.find(s => !s.parentSpanId);
    if (!rootSpan) return null;

    return {
      traceId,
      rootSpanId: rootSpan.spanId,
      spans,
      startTime: rootSpan.startTime,
      endTime: rootSpan.endTime || Date.now(),
      duration: rootSpan.duration || 0,
      status: rootSpan.status
    };
  }

  getAllTraces(): Trace[] {
    const traces: Trace[] = [];

    for (const [traceId, spans] of this.traces.entries()) {
      const trace = this.getTrace(traceId);
      if (trace) traces.push(trace);
    }

    return traces;
  }

  private async exportSpan(span: TraceSpan): Promise<void> {
    // Export to Cloudflare Analytics Engine
    if (globalThis.env?.ANALYTICS) {
      await globalThis.env.ANALYTICS.writeDataPoint({
        blobs: [
          span.traceId,
          span.spanId,
          span.parentSpanId || '',
          span.agentId,
          span.operation,
          span.status
        ],
        doubles: [
          span.duration || 0,
          span.metadata?.tokenCount || 0,
          span.metadata?.retryCount || 0
        ],
        indexes: [
          span.startTime
        ]
      });
    }
  }
}

// Global tracer instance
export const tracer = new DistributedTracer();
```

### Step 2: Agent Performance Metrics

Create `platform-api/src/orchestration/metrics.ts`:
```typescript
export interface AgentMetrics {
  // Counter metrics
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  
  // Timer metrics (in milliseconds)
  avgExecutionTime: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;
  
  // Tool usage
  toolUsageCount: Map<string, number>;
  
  // Error breakdown
  errorsByType: Map<string, number>;
}

export interface OrchestrationMetrics {
  // Overall
  totalOrchestrations: number;
  completedOrchestrations: number;
  failedOrchestrations: number;
  
  // State distribution
  stateCounts: Map<string, number>;
  
  // Timing
  avgTotalDuration: number;
  avgPhaseDurations: Map<string, number>;
  
  // Agent performance
  agentMetrics: Map<string, AgentMetrics>;
}

export class MetricsCollector {
  private metrics: Map<string, number[]> = new Map();
  private agentMetrics: Map<string, AgentMetrics> = new Map();

  recordExecution(agentId: string, duration: number, success: boolean): void {
    const key = `execution_time:${agentId}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    this.metrics.get(key)!.push(duration);

    // Update agent metrics
    const agentMetric = this.getAgentMetrics(agentId);
    agentMetric.totalExecutions++;
    if (success) {
      agentMetric.successfulExecutions++;
    } else {
      agentMetric.failedExecutions++;
    }
  }

  recordToolUsage(agentId: string, toolName: string): void {
    const agentMetric = this.getAgentMetrics(agentId);
    const current = agentMetric.toolUsageCount.get(toolName) || 0;
    agentMetric.toolUsageCount.set(toolName, current + 1);
  }

  recordError(agentId: string, errorType: string): void {
    const agentMetric = this.getAgentMetrics(agentId);
    const current = agentMetric.errorsByType.get(errorType) || 0;
    agentMetric.errorsByType.set(errorType, current + 1);
  }

  getAgentMetrics(agentId: string): AgentMetrics {
    if (!this.agentMetrics.has(agentId)) {
      this.agentMetrics.set(agentId, {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        avgExecutionTime: 0,
        p95ExecutionTime: 0,
        p99ExecutionTime: 0,
        toolUsageCount: new Map(),
        errorsByType: new Map()
      });
    }
    return this.agentMetrics.get(agentId)!;
  }

  calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile / 100) - 1;
    return sorted[index];
  }

  getOrchestrationMetrics(): OrchestrationMetrics {
    const agentMetricsMap = new Map<string, AgentMetrics>();
    
    for (const [agentId] of this.agentMetrics.entries()) {
      agentMetricsMap.set(agentId, this.getAgentMetrics(agentId));
    }

    return {
      totalOrchestrations: 0, // Will be populated from D1
      completedOrchestrations: 0,
      failedOrchestrations: 0,
      stateCounts: new Map(),
      avgTotalDuration: 0,
      avgPhaseDurations: new Map(),
      agentMetrics: agentMetricsMap
    };
  }

  async exportToAnalytics(env: Env): Promise<void> {
    for (const [agentId, metrics] of this.agentMetrics.entries()) {
      // Export agent metrics
      await env.ANALYTICS.writeDataPoint({
        blobs: ['agent_metrics', agentId],
        doubles: [
          metrics.totalExecutions,
          metrics.successfulExecutions / Math.max(metrics.totalExecutions, 1), // success rate
          metrics.avgExecutionTime
        ],
        indexes: [Date.now()]
      });

      // Export tool usage
      for (const [tool, count] of metrics.toolUsageCount.entries()) {
        await env.ANALYTICS.writeDataPoint({
          blobs: ['tool_usage', agentId, tool],
          doubles: [count],
          indexes: [Date.now()]
        });
      }
    }
  }
}

export const metricsCollector = new MetricsCollector();
```

### Step 3: Alerting System

Create `platform-api/src/orchestration/alerting.ts`:
```typescript
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical'
}

export interface AlertRule {
  name: string;
  condition: (metrics: OrchestrationMetrics) => boolean;
  severity: AlertSeverity;
  message: string;
  cooldown: number; // milliseconds
}

export interface Alert {
  ruleName: string;
  severity: AlertSeverity;
  message: string;
  timestamp: number;
  metadata: Record<string, any>;
}

export class AlertingSystem {
  private rules: AlertRule[] = [];
  private alerts: Alert[] = [];
  private lastAlertTimes: Map<string, number> = new Map();

  addRule(rule: AlertRule): void {
    this.rules.push(rule);
    console.log(`[Alerting] Added rule: ${rule.name}`);
  }

  check(metrics: OrchestrationMetrics): void {
    for (const rule of this.rules) {
      const lastAlertTime = this.lastAlertTimes.get(rule.name) || 0;
      
      // Check cooldown
      if (Date.now() - lastAlertTime < rule.cooldown) {
        continue;
      }

      // Evaluate condition
      if (rule.condition(metrics)) {
        this.triggerAlert(rule, metrics);
      }
    }
  }

  private triggerAlert(rule: AlertRule, metrics: OrchestrationMetrics): void {
    const alert: Alert = {
      ruleName: rule.name,
      severity: rule.severity,
      message: rule.message,
      timestamp: Date.now(),
      metadata: {
        metrics: this.sanitizeMetrics(metrics)
      }
    };

    this.alerts.push(alert);
    this.lastAlertTimes.set(rule.name, Date.now());

    console.error(`[ALERT] ${rule.severity.toUpperCase()}: ${rule.message}`);

    // Send notifications based on severity
    if (rule.severity === AlertSeverity.CRITICAL) {
      this.sendCriticalAlert(alert);
    } else if (rule.severity === AlertSeverity.WARNING) {
      this.sendWarningAlert(alert);
    }
  }

  private async sendCriticalAlert(alert: Alert): Promise<void> {
    // Send to PagerDuty, Slack, Email
    console.error('[ALERT] CRITICAL:', alert.message);
  }

  private async sendWarningAlert(alert: Alert): Promise<void> {
    // Send to Slack
    console.warn('[ALERT] WARNING:', alert.message);
  }

  private sanitizeMetrics(metrics: OrchestrationMetrics): any {
    // Remove sensitive data
    return {
      totalOrchestrations: metrics.totalOrchestrations,
      completedOrchestrations: metrics.completedOrchestrations,
      failedOrchestrations: metrics.failedOrchestrations
    };
  }

  getAlerts(since?: number): Alert[] {
    if (!since) return [...this.alerts];
    return this.alerts.filter(a => a.timestamp >= since);
  }
}

// Define alert rules
export const alertRules: AlertRule[] = [
  {
    name: 'high_error_rate',
    condition: (m) => {
      const total = m.completedOrchestrations + m.failedOrchestrations;
      return total > 0 && (m.failedOrchestrations / total) > 0.05;
    },
    severity: AlertSeverity.WARNING,
    message: 'Error rate exceeded 5%',
    cooldown: 300000 // 5 minutes
  },
  {
    name: 'agent_down',
    condition: (m) => {
      for (const [agentId, metrics] of m.agentMetrics.entries()) {
        if (metrics.failedExecutions > 5 && metrics.totalExecutions > 10) {
          return true;
        }
      }
      return false;
    },
    severity: AlertSeverity.CRITICAL,
    message: 'Agent failure rate exceeded 50%',
    cooldown: 600000 // 10 minutes
  },
  {
    name: 'slow_orchestration',
    condition: (m) => {
      return m.avgTotalDuration > 120000; // >2 minutes
    },
    severity: AlertSeverity.WARNING,
    message: 'Average orchestration time exceeded 2 minutes',
    cooldown: 300000
  }
];

export const alertingSystem = new AlertingSystem();
```

### Step 4: Dashboard Data Export

Create `platform-api/src/orchestration/dashboard.ts`:
```typescript
export interface DashboardWidget {
  id: string;
  type: 'timeseries' | 'gauge' | 'heatmap' | 'table';
  title: string;
  query: string;
  timeframe: string;
}

export class DashboardExporter {
  async getOrchestrationDashboard(): Promise<DashboardWidget[]> {
    return [
      {
        id: 'orchestration-rate',
        type: 'timeseries',
        title: 'Orchestration Rate',
        query: 'sum(rate(total_orchestrations[5m]))',
        timeframe: '1h'
      },
      {
        id: 'error-rate',
        type: 'timeseries',
        title: 'Error Rate',
        query: 'sum(rate(failed_orchestrations[5m])) / sum(rate(total_orchestrations[5m])) * 100',
        timeframe: '1h'
      },
      {
        id: 'agent-performance',
        type: 'heatmap',
        title: 'Agent Execution Time (p95)',
        query: 'histogram_quantile(0.95, rate(agent_execution_time[5m]))',
        timeframe: '24h'
      },
      {
        id: 'active-orchestrations',
        type: 'gauge',
        title: 'Active Orchestrations',
        query: 'count(orchestration_state=generating) + count(orchestration_state=testing)',
        timeframe: 'now'
      }
    ];
  }

  async getAgentLeaderboard(): Promise<any[]> {
    // Return top performing agents
    return [];
  }

  async getFailureAnalysis(): Promise<any> {
    // Return recent failures with root cause
    return {
      totalFailures: 0,
      byAgent: {},
      byPhase: {},
      recentErrors: []
    };
  }
}
```

### Step 5: Agent Operations Runbook

Create `cloudflare/platform-api/docs/AGENT_OPERATIONS.md`:
```markdown
# Agent Operations Runbook

## Monitoring Dashboard

Access the agent orchestration dashboard at:
`https://dash.cloudflare.com/analytics/agents`

### Key Metrics to Watch

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error Rate | >5% | Check recent failures in dashboard |
| Agent p95 Latency | >30s | Check agent logs in wrangler tail |
| Active Orchestrations | >100 | Scale up Durable Objects |
| Circuit Breaker Open | Any | Investigate failing agent |

## Troubleshooting

### Agent Stuck in State

1. Check orchestrator logs:
   ```bash
   wrangler tail --format pretty | grep "OrchestratorDO"
   ```

2. Check agent state:
   ```bash
   wrangler kv:key get --binding=AGENT_STATE "agent:builder-123"
   ```

3. Force state transition (if needed):
   ```bash
   curl -X POST https://api.nexus.dev/orchestrator/apps/123/event \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"event": "error"}'
   ```

### Circuit Breaker Open

1. Identify which agent is failing:
   ```bash
   wrangler tail | grep "CircuitBreaker"
   ```

2. Check agent logs:
   ```bash
   wrangler tail --search "builder-agent"
   ```

3. Fix underlying issue (API timeout, config error, etc.)

4. Reset circuit breaker:
   ```bash
   curl -X POST https://api.nexus.dev/admin/circuit-breaker/reset \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -d '{"agentType": "builder"}'
   ```

### High Latency

1. Check AI Gateway latency:
   ```bash
   wrangler tail | grep "AI Gateway"
   ```

2. Check Sandbox cold starts:
   ```bash
   wrangler tail | grep "Sandbox"
   ```

3. Enable caching:
   ```bash
   curl -X POST https://api.nexus.dev/admin/cache/warm \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   ```

## Alerts

### Critical Alerts (PagerDuty)

- Agent failure rate >50%
- Orchestrator DO down
- Database connection pool exhausted

### Warning Alerts (Slack)

- Error rate >5%
- Avg orchestration time >2min
- Circuit breaker opened

### Info Alerts (Slack)

- New agent deployed
- Configuration changed
- Peak usage reached

## Scaling

### Vertical Scaling (Durable Objects)

```bash
# Increase DO memory
wrangler deploy --var MEMORY_LIMIT=512MB
```

### Horizontal Scaling (Agents)

```bash
# Deploy additional agent instances
wrangler deploy --min-instances 5 --max-instances 50
```

## Incident Response

1. **Check Dashboard:** dash.cloudflare.com → Analytics → Agents
2. **Check Logs:** `wrangler tail --format pretty`
3. **Identify Root Cause:** Use distributed traces
4. **Apply Fix:** Deploy hotfix or scale resources
5. **Verify:** Monitor metrics for 15 minutes
6. **Postmortem:** Document incident and action items
```

### Step 6: Integration Tests for Monitoring

Create `platform-api/tests/integration/monitoring.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { DistributedTracer } from '../../src/orchestration/tracing';
import { MetricsCollector } from '../../src/orchestration/metrics';
import { alertingSystem, alertRules } from '../../src/orchestration/alerting';

describe('Monitoring & Observability', () => {
  describe('DistributedTracer', () => {
    it('should create traces and spans', () => {
      const tracer = new DistributedTracer();
      
      const rootSpan = tracer.startTrace('trace-1', 'span-1', 'builder', 'generate');
      expect(rootSpan.traceId).toBe('trace-1');
      expect(rootSpan.operation).toBe('generate');

      const childSpan = tracer.startSpan('span-1', 'reviewer', 'review');
      expect(childSpan?.parentSpanId).toBe('span-1');

      tracer.endSpan('span-1');
      tracer.endSpan(childSpan!.spanId);

      const trace = tracer.getTrace('trace-1');
      expect(trace).toBeDefined();
      expect(trace!.spans).toHaveLength(2);
    });
  });

  describe('MetricsCollector', () => {
    it('should record and calculate metrics', () => {
      const collector = new MetricsCollector();
      
      collector.recordExecution('builder', 1000, true);
      collector.recordExecution('builder', 2000, true);
      collector.recordExecution('builder', 3000, false);

      const metrics = collector.getAgentMetrics('builder');
      expect(metrics.totalExecutions).toBe(3);
      expect(metrics.successfulExecutions).toBe(2);
      expect(metrics.failedExecutions).toBe(1);
    });

    it('should track tool usage', () => {
      const collector = new MetricsCollector();
      
      collector.recordToolUsage('builder', 'file_system');
      collector.recordToolUsage('builder', 'file_system');
      collector.recordToolUsage('builder', 'terminal');

      const metrics = collector.getAgentMetrics('builder');
      expect(metrics.toolUsageCount.get('file_system')).toBe(2);
      expect(metrics.toolUsageCount.get('terminal')).toBe(1);
    });
  });

  describe('AlertingSystem', () => {
    it('should trigger alerts when conditions are met', () => {
      const system = new AlertingSystem();
      system.addRule(alertRules[0]); // high_error_rate

      const metrics = {
        completedOrchestrations: 10,
        failedOrchestrations: 1,
        agentMetrics: new Map()
      } as any;

      // Should not trigger (<5%)
      system.check(metrics);

      metrics.failedOrchestrations = 6;
      // Should trigger (>5%)
      system.check(metrics);

      const alerts = system.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
    });
  });
});
```

## Deliverables
- [ ] DistributedTracer for trace management
- [ ] MetricsCollector for agent performance
- [ ] AlertingSystem with predefined rules
- [ ] DashboardExporter for visualization
- [ ] Agent Operations Runbook
- [ ] Integration tests

## Acceptance Criteria
- [ ] Distributed traces capture complete agent chain
- [ ] Metrics exported to Cloudflare Analytics Engine
- [ ] Alerts trigger within 5 minutes of threshold breach
- [ ] Dashboard widgets show real-time data
- [ ] Runbook covers common failure scenarios
- [ ] All monitoring tests pass