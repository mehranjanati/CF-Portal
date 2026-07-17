# Operations Runbook

## Common Issues and Solutions

### High Error Rate

#### Symptoms
- Error rate > 5%
- 5xx responses increasing
- Timeout errors

#### Investigation
1. Check Cloudflare dashboard for errors
2. Review logs for stack traces
3. Examine database connection pool
4. Verify KV/DO availability

#### Resolution
1. Identify failed dependency
2. Restart affected Worker
3. Roll back recent deployment if needed
4. Notify team

### Performance Degradation

#### Symptoms
- p95 latency > 500ms
- Slow database queries
- High CPU usage

#### Investigation
1. Check D1 query logs
2. Review KV hit/miss ratio
3. Examine Durable Object usage
4. Monitor memory consumption

#### Resolution
1. Identify slow queries
2. Add indexes if needed
3. Increase cache TTL
4. Scale horizontally if needed

### Database Issues

#### Symptoms
- D1 query failures
- Migration errors
- Connection timeouts

#### Investigation
1. Check D1 dashboard
2. Review migration status
3. Examine query patterns
4. Verify database size

#### Resolution
1. Restart database (if supported)
2. Run migrations manually
3. Optimize queries
4. Contact support if persistent

### Authentication Failures

#### Symptoms
- 401 errors increasing
- Token validation failures
- JWT secret issues

#### Investigation
1. Check JWT configuration
2. Verify secret rotation
3. Review token expiration
4. Examine rate limits

#### Resolution
1. Re-secret JWT_SECRET
2. Clear cached tokens
3. Restart Workers
4. Notify users if needed

### Deployment Failures

#### Symptoms
- `wrangler deploy` fails
- Preview errors
- Build failures

#### Investigation
1. Check build logs
2. Verify TypeScript compilation
3. Review migration status
4. Examine environment variables

#### Resolution
1. Fix build errors
2. Roll back to previous version
3. Verify dependencies
4. Re-run deployment

## Emergency Procedures

### Service Outage

1. **Assess Impact**
   - Check affected tenants
   - Verify service dependencies
   - Estimate time to recovery

2. **Communicate**
   - Post status update
   - Notify stakeholders
   - Update incident timeline

3. **Mitigate**
   - Roll back deployment
   - Enable maintenance mode
   - Route to backup service

4. **Recover**
   - Deploy fix
   - Verify functionality
   - Monitor for recurrence

### Data Issues

1. **Assess**
   - Identify corrupted data
   - Verify backup integrity
   - Check replication status

2. **Fix**
   - Restore from backup
   - Re-run migrations
   - Validate data integrity

3. **Post-Mortem**
   - Document incident
   - Identify root cause
   - Update runbooks

## On-Call Checklist

### Daily
- [ ] Review error rates
- [ ] Check deployment status
- [ ] Verify backups
- [ ] Review logs for anomalies

### Weekly
- [ ] Update dependencies
- [ ] Review performance metrics
- [ ] Check capacity planning
- [ ] Update documentation

### Monthly
- [ ] Security audit
- [ ] Performance review
- [ ] Disaster recovery test
- [ ] Team training