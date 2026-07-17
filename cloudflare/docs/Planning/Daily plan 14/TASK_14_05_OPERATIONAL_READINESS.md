# TASK 14-05: Operational Readiness & Monitoring

## Objective
Prepare the platform for production deployment with comprehensive observability, alerting, and operational runbooks.

## Prerequisites
- TASK 14-04 completed (performance optimization)
- Cloudflare account with Analytics Engine access

## Implementation

### Step 1: Structured Logging

Create `platform-api/src/lib/telemetry.ts`:
```typescript
interface LogContext {
  requestId: string;
  tenantId?: number;
  userId?: number;
  operation: string;
  duration?: number;
  error?: Error;
}

export class Telemetry {
  static log(context: LogContext): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: context.error ? 'error' : 'info',
      requestId: context.requestId,
      tenantId: context.tenantId,
      userId: context.userId,
      operation: context.operation,
      duration: context.duration,
      error: context.error ? {
        message: context.error.message,
        stack: context.error.stack,
        code: (context.error as any)?.code
      } : undefined
    };

    // Send to Cloudflare Analytics Engine
    env.ANALYTICS.writeDataPoint({
      blobs: [
        logEntry.level,
        logEntry.operation,
        logEntry.error?.code ?? 'success'
      ],
      doubles: [
        logEntry.duration ?? 0,
        logEntry.error ? 1 : 0
      ],
      indexes: [
        logEntry.tenantId ?? 0,
        logEntry.userId ?? 0
      ]
    });

    // Also log to console for debugging
    console.log(JSON.stringify(logEntry));
  }

  static info(operation: string, context: Partial<LogContext> = {}): void {
    this.log({ operation, ...context, level: 'info' });
  }

  static error(operation: string, error: Error, context: Partial<LogContext> = {}): void {
    this.log({ operation, error, ...context, level: 'error' });
  }

  static measure<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.log({ operation, duration });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.log({ operation, duration, error: error as Error });
      throw error;
    }
  }
}
```

### Step 2: Custom Metrics

Create `platform-api/src/lib/metrics.ts`:
```typescript
export class Metrics {
  // Counter metrics
  static async incrementRequest(endpoint: string, status: number): Promise<void> {
    await env.METRICS.put(
      `request:${endpoint}:${status}`,
      JSON.stringify({ timestamp: Date.now() }),
      { expirationTtl: 86400 } // Keep for 24 hours
    );
  }

  // Token usage tracking
  static async recordTokenUsage(tenantId: number, tokens: {
    prompt: number;
    completion: number;
    total: number;
  }): Promise<void> {
    await env.METRICS.put(
      `tokens:${tenantId}:${Date.now()}`,
      JSON.stringify(tokens),
      { metadata: { tenantId: String(tenantId) } }
    );
  }

  // Latency histogram
  static async recordLatency(operation: string, duration: number): Promise<void> {
    await env.METRICS.put(
      `latency:${operation}:${Date.now()}`,
      JSON.stringify({ duration }),
      { expirationTtl: 604800 } // Keep for 7 days
    );
  }

  // Gauge metrics (current state)
  static async setActiveSessions(count: number): Promise<void> {
    await env.METRICS.put('active_sessions', String(count));
  }
}
```

### Step 3: Middleware Integration

Modify `platform-api/src/index.ts`:
```typescript
import { Telemetry } from './lib/telemetry';
import { Metrics } from './lib/metrics';

const app = new App<Env>({ ... });

// Request logging middleware
app.use('*', async (c, next) => {
  const requestId = crypto.randomUUID();
  const start = Date.now();
  
  c.set('requestId', requestId);
  
  try {
    await next();
    const duration = Date.now() - start;
    
    Telemetry.log({
      requestId,
      operation: `${c.req.method} ${c.req.path}`,
      duration
    });

    Metrics.recordLatency(c.req.path, duration);
    await Metrics.incrementRequest(c.req.path, c.res.status);
  } catch (error) {
    const duration = Date.now() - start;
    
    Telemetry.error(
      `${c.req.method} ${c.req.path}`,
      error as Error,
      { requestId, duration }
    );

    await Metrics.incrementRequest(c.req.path, 500);
    throw error;
  }
});
```

### Step 4: Alert Rules Configuration

Create `platform-api/monitoring/alerts.yml`:
```yaml
alerts:
  - name: HighErrorRate
    condition: |
      rollup(last_5m, sum(error_count) / sum(request_count) * 100 > 5)
    message: "Error rate exceeded 5% in the last 5 minutes"
    severity: warning
    channels: [slack, email]

  - name: HighLatency
    condition: |
      rollup(last_10m, percentile(latency, 99) > 1000)
    message: "p99 latency exceeded 1s in the last 10 minutes"
    severity: critical
    channels: [slack, pagerduty]

  - name: AIProviderDown
    condition: |
      rollup(last_5m, sum(ai_gateway_errors) > 10)
    message: "AI Gateway is experiencing errors"
    severity: warning
    channels: [slack]

  - name: DatabaseSlowQueries
    condition: |
      rollup(last_10m, percentile(d1_query_duration, 95) > 200)
    message: "D1 query p95 exceeded 200ms"
    severity: info
    channels: [slack]

channels:
  slack:
    webhook: ${SLACK_WEBHOOK_URL}
  email:
    to: [oncall@company.com]
  pagerduty:
    serviceKey: ${PAGERDUTY_SERVICE_KEY}
```

### Step 5: Operations Runbook

Create `cloudflare/platform-api/docs/OPERATIONS.md`:
```markdown
# Operations Runbook

## Deployment Procedure

### Staging Deployment
1. Merge PR to `develop` branch
2. GitHub Actions runs tests automatically
3. On success, auto-deploys to staging: `npx wrangler deploy -e staging`
4. Verify health: `curl https://staging-api.example.com/health`
5. Run smoke tests: `bun run test:smoke`

### Production Deployment
1. Create PR from `develop` to `main`
2. Require 2 approvals + all checks green
3. Merge triggers production deploy
4. Monitor dashboard for 15 minutes
5. If errors >5%, rollback: `wrangler rollback --e production`

## Rollback Procedure

1. Identify bad deployment version
2. Run: `wrangler rollback --version <previous_version> --e production`
3. Verify rollback success
4. Investigate issue in staging

## Incident Response

### API Down
1. Check Cloudflare status page
2. Check worker logs: `wrangler tail`
3. Rollback if needed
4. Post incident to #incidents Slack channel

### AI Gateway Failure
1. Verify Gateway status in Cloudflare Dashboard
2. System auto-falls back to Workers AI
3. If fallback also fails, disable AI features: set `AI_GATEWAY_ENABLED=false`
4. Notify users via status page

### Database Issues
1. Check D1 dashboard for errors
2. Run migrations manually if stuck: `wrangler d1 migrations apply DB --local`
3. Restore from backup if data loss: `wrangler d1 restore DB --remote --from backup-2024-01-01`

## Database Backup

```bash
# Create backup
wrangler d1 export DB --remote --output backup-$(date +%Y-%m-%d).sql

# Restore backup
wrangler d1 import DB --remote --file backup-2024-01-01.sql
```

## Cost Monitoring

- AI token usage: ${AI_GATEWAY_TOKEN_LIMIT}/month
- D1 storage: ${D1_STORAGE_LIMIT}/month
- Worker requests: ${WORKER_REQUEST_LIMIT}/month

Alerts trigger at 80% of each limit.

## Emergency Contacts

- Platform Lead: @platform-lead
- On-call Engineer: PagerDuty schedule
- Cloudflare Support: support.cloudflare.com
```

### Step 6: Deployment Pipeline

Create `cloudflare/.github/workflows/deploy.yml`:
```yaml
name: Production Deployment

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: oven-sh/setup-bun@v1
      
      - run: cd cloudflare/platform-api && bun install
      
      - run: cd cloudflare/platform-api && bun run check
      
      - name: Deploy to Production
        run: cd cloudflare/platform-api && wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
      
      - name: Health Check
        run: |
          sleep 30
          curl -f https://api.example.com/health
      
      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          slack-message: |
            Deployment ${{ job.status }}:
            ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Step 7: Monitoring Dashboards

Create `cloudflare/platform-api/monitoring/dashboard.json`:
```json
{
  "dashboard": {
    "title": "Platform API Metrics",
    "widgets": [
      {
        "type": "timeseries",
        "title": "Request Rate",
        "query": "sum(rate(request_count[5m]))"
      },
      {
        "type": "timeseries",
        "title": "Error Rate",
        "query": "sum(rate(error_count[5m])) / sum(rate(request_count[5m])) * 100"
      },
      {
        "type": "heatmap",
        "title": "API Latency",
        "query": "histogram_quantile(0.95, rate(latency_bucket[5m]))"
      },
      {
        "type": "gauge",
        "title": "Active Sessions",
        "query": "active_sessions"
      },
      {
        "type": "timeseries",
        "title": "AI Token Usage",
        "query": "sum(rate(ai_tokens_used[1h]))"
      }
    ]
  }
}
```

### Step 8: Cost Management

Create `platform-api/src/lib/cost-control.ts`:
```typescript
interface BudgetConfig {
  dailyTokenLimit: number;
  monthlyDollarLimit: number;
  alertThreshold: number;
}

export class CostControl {
  constructor(private config: BudgetConfig) {}

  async checkBudget(tenantId: number): Promise<boolean> {
    const usage = await this.getTodayTokenUsage(tenantId);
    const cost = this.estimateCost(usage);
    
    if (cost > this.config.monthlyDollarLimit * this.config.alertThreshold) {
      await this.sendBudgetAlert(tenantId, cost);
      return false; // Block further usage
    }
    
    return true;
  }

  private estimateCost(tokens: number): number {
    // GPT-4o-mini: $0.00015 / 1K tokens
    return (tokens / 1000) * 0.00015;
  }
}
```

## Deliverables
- [ ] Structured logging with request tracing
- [ ] Custom metrics exported to Analytics Engine
- [ ] Alert rules configured in Cloudflare Dashboard
- [ ] Operations runbook published
- [ ] Deployment pipeline with health checks
- [ ] Monitoring dashboards live
- [ ] Cost control mechanisms in place

## Acceptance Criteria
- [ ] All requests logged with trace IDs
- [ ] Metrics dashboard shows real-time data
- [ ] Alerts fire within 5 minutes of threshold breach
- [ ] Deployment pipeline completes in <10 minutes
- [ ] Cost alerts prevent budget overruns