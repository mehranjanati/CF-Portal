# Monitoring Guide

## Metrics to Track

### Application Metrics
- Request rate
- Error rate
- Response time (p50, p95, p99)
- Active connections

### Resource Metrics
- Durable Object CPU time
- KV read/write latency
- D1 query duration
- R2 bandwidth

### Business Metrics
- Active tenants
- Active agent sessions
- Workflow execution count
- GitHub integration health

## Alerting Thresholds

### Critical
- Error rate > 5%
- p95 latency > 500ms
- Durable Object CPU > 90%
- Failed deployments

### Warning
- Error rate > 1%
- p95 latency > 300ms
- KV latency > 100ms
- D1 slow queries

## Logging

### Structured Logging
```json
{
  "timestamp": "2026-07-17T12:00:00Z",
  "level": "info",
  "tenant_id": "tenant_123",
  "trace_id": "abc123",
  "message": "Request processed"
}
```

### Key Events to Log
- Authentication attempts
- Tenant data access
- Workflow state changes
- External API calls
- Error occurrences

## Dashboards

### Cloudflare Dashboard
- Workers Analytics
- D1 Analytics
- KV Analytics

### Custom Metrics
- Grafana + Prometheus
- Datadog integration
- Custom health checks

## Health Checks

### Liveness
```bash
GET /health
```

### Readiness
```bash
GET /ready
```

### Startup
```bash
GET /startup
```

## Incident Response

### On-Call
1. Check Cloudflare dashboard
2. Review error logs
3. Run health checks
4. Escalate if needed

### Runbooks
See RUNBOOK.md for specific scenarios.