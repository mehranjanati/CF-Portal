# TASK 13-01: Cloudflare AI Gateway Configuration

## Objective
Configure Cloudflare AI Gateway as the single entry point for all AI requests, enabling real LLM calls with caching, fallback, and monitoring.

## Prerequisites
- Cloudflare account with access to AI Gateway
- OpenAI API key (or Claude/Gemini API key)
- wrangler CLI installed and authenticated

## Step-by-Step Setup

### Step 1: Create AI Gateway in Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **AI** → **AI Gateway**
3. Click **Create Gateway**
4. Set gateway name: `nexus-ai-gateway` (or similar)
5. Choose region: closest to your users

### Step 2: Add Providers to Gateway

#### Provider A: OpenAI (Primary)
1. In the gateway, click **Add Provider**
2. Select **OpenAI**
3. Add your OpenAI API Key (with access to GPT-4o-mini)
4. Enable models: `gpt-4o-mini`, `gpt-4o` (optional)
5. Set rate limit: 100 requests/minute initially

#### Provider B: Workers AI (Fallback)
1. Click **Add Provider**
2. Select **Workers AI**
3. No API key needed (uses Cloudflare account)
4. Enable model: `@cf/meta/llama-3.1-70b-instruct`
5. Set as fallback provider

### Step 3: Configure Gateway Settings

```yaml
Gateway Configuration:
  name: nexus-ai-gateway
  caching:
    enabled: true
    ttl: 3600  # Cache identical requests for 1 hour
  rate_limiting:
    enabled: true
    limit: 100
    period: minute
  fallback:
    enabled: true
    providers:
      - primary: openai
      - fallback: workers-ai
  logging:
    enabled: true
    log_payloads: false  # Don't log full prompts for privacy
```

### Step 4: Generate Gateway Credentials

1. In AI Gateway, go to **Settings** → **API Keys**
2. Create a new API key with scope limited to this gateway
3. Save the key securely

### Step 5: Configure Environment Variables

Add to `wrangler.toml`:
```toml
[vars]
AI_GATEWAY_URL = "https://gateway.ai.cloudflare.com/v1/{account_id}/nexus-ai-gateway"
AI_GATEWAY_FALLBACK_MODEL = "@cf/meta/llama-3.1-70b-instruct"
AI_GATEWAY_PRIMARY_MODEL = "gpt-4o-mini"
```

Add secrets via wrangler:
```bash
echo "<gateway-api-key>" | wrangler secret put AI_GATEWAY_TOKEN
```

For local dev, create `.dev.vars`:
```env
AI_GATEWAY_URL=https://gateway.ai.cloudflare.com/v1/{account_id}/nexus-ai-gateway
AI_GATEWAY_TOKEN=your_gateway_api_key_here
AI_GATEWAY_PRIMARY_MODEL=gpt-4o-mini
AI_GATEWAY_FALLBACK_MODEL=@cf/meta/llama-3.1-70b-instruct
```

### Step 6: Verify Gateway Connectivity

Test the gateway with curl:
```bash
curl -X POST "${AI_GATEWAY_URL}/openai/chat/completions" \
  -H "Authorization: Bearer ${AI_GATEWAY_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Say hello"}],
    "max_tokens": 10
  }'
```

Expected response: `{"choices":[{"message":{"content":"Hello!"}}]}`

## Deliverables
- [ ] AI Gateway created in Cloudflare Dashboard
- [ ] OpenAI provider configured
- [ ] Workers AI fallback configured
- [ ] Gateway API key generated
- [ ] Environment variables documented
- [ ] Gateway connectivity verified with curl

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check AI_GATEWAY_TOKEN is correct |
| 403 Forbidden | Check Gateway API key permissions |
| 429 Too Many Requests | Increase rate limit in Gateway settings |
| Model not found | Verify model name matches provider capabilities |