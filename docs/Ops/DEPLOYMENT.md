# Deployment Guide

## Prerequisites
- Cloudflare account with Workers access
- Wrangler CLI installed
- Access to GitHub repository

## Environment Setup

### 1. Secrets Configuration
```bash
wrangler secret put JWT_SECRET
wrangler secret put API_KEY
wrangler secret put DATABASE_URL
```

### 2. Database Migration
```bash
cd cloudflare/platform-api
wrangler d1 migrations apply nexus-db
```

### 3. KV Namespace Setup
KV namespaces are pre-configured in wrangler.toml.

### 4. Deployment Steps

#### Platform API
```bash
cd cloudflare/platform-api
npm run deploy
```

#### Portal
```bash
cd cloudflare
npm run pages:deploy
```

## Verification
- Verify health check endpoints
- Confirm environment variables
- Test authentication flow
- Validate multi-tenant isolation

## Rollback
```bash
wrangler rollback platform-api --steps 1
```

## Monitoring
- Check Cloudflare dashboard for errors
- Review logs in Logpush
- Monitor D1 query performance
- Track KV operation latency