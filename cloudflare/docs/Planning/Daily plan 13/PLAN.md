# Daily Plan 13: AI Gateway Integration & Real LLM Provider

## Status: PENDING

## Goal
Replace the hardcoded mock in `CFAIProvider` with a real LLM integration via **Cloudflare AI Gateway**, enabling actual code generation using real AI models. The AI Gateway acts as the single entry point for all AI requests, providing caching, fallback, rate limiting, and monitoring.

## Why AI Gateway?
Per the architecture contract (`AI_LAYER_CONTRACT.md`):
> "ما به هیچ‌وجه به صورت مستقیم از طریق SDKهای پراکنده به OpenAI, Anthropic یا Gemini متصل نمی‌شویم. تمام درخواست‌های AI باید از Cloudflare AI Gateway عبور کنند."

**مزایا نسبت به CFAIProvider مستقیم:**
- Fallback بین مدل‌ها (اگر OpenAI قطع باشد → Workers AI)
- Caching پاسخ‌های تکراری (صرفه‌جویی در هزینه)
- Rate Limiting و Budget Control برای هر Tenant
- داشبورد مانیتورینگ مصرف Token
- امکان تغییر مدل بدون تغییر کد (فقط تغییر provider در Gateway)

## Architecture

```
Portal SPA → Platform API Worker → AI Gateway → [OpenAI / Claude / Workers AI]
                                          ↓
                                     (Fallback on error)
                                          ↓
                                     [Workers AI (Llama 3.1)]
```

### Provider Strategy (Hybrid)

| Provider | Environment | Model | Cost |
|----------|------------|-------|------|
| **AIGatewayProvider** (جدید) | Production | از طریق AI Gateway → هر مدلی | PAYG |
| **CFAIProvider** (موجود) | Local Dev / Fallback | Workers AI (Llama 3.1 70B) | **رایگان** |
| **MockProvider** (موجود) | Testing | Hardcoded response | رایگان |

## Tasks

### [ ] TASK 13-01: Cloudflare AI Gateway Configuration
**Goal:** Set up AI Gateway in Cloudflare Dashboard and configure providers.

**Steps:**
1. Create AI Gateway in Cloudflare Dashboard
2. Add OpenAI provider (GPT-4o-mini برای production)
3. Add Workers AI provider (Llama 3.1 70B برای fallback)
4. Configure caching, rate limiting, and budget alerts
5. Generate Gateway API token for the Worker
6. Document Gateway URL and authentication

**Deliverables:**
- Gateway URL: `https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_name}`
- Gateway API Token in Cloudflare secrets
- Provider configuration documented

### [ ] TASK 13-02: AIGatewayProvider Implementation
**Goal:** Create a new provider that communicates with real LLMs through the AI Gateway, replacing the hardcoded mock.

**Files to create:**
1. `platform-api/src/modules/builder/providers/ai-gateway.ts` - New Provider class

**Key Features:**
- Real HTTP calls to AI Gateway `/chat/completions` endpoint
- Proper system prompt with SvelteKit code generation context
- Tool calling support (function calling) via the Gateway
- JSON mode for structured output parsing
- SSE event streaming for real-time updates (thoughts, tool calls)
- Error handling with fallback to CFAIProvider
- Token usage tracking and logging

**API Contract with AI Gateway:**
```typescript
POST https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_name}/openai/chat/completions
Headers:
  Authorization: Bearer {gateway_token}
  Content-Type: application/json

Body:
{
  model: "gpt-4o-mini",
  messages: [/* system prompt + conversation history */],
  tools: [/* function definitions for tool calling */],
  temperature: 0.2,
  max_tokens: 4096,
  stream: true
}
```

### [ ] TASK 13-03: Provider Selection & Environment Configuration
**Goal:** Implement dynamic provider selection and configure environment variables.

**Files to modify:**
1. `platform-api/src/modules/builder/providers/index.ts` - Add factory/selector
2. `platform-api/src/modules/builder/service.ts` - Use selected provider
3. `platform-api/wrangler.toml` - Add AI Gateway secrets
4. `platform-api/.dev.vars` - Local dev environment variables

**Provider Selection Logic:**
```
if (env.AI_GATEWAY_TOKEN && env.AI_GATEWAY_URL) {
  use AIGatewayProvider  // Production: calls real LLMs via Gateway
} else if (env.AI) {
  use CFAIProvider        // Local dev / fallback: Workers AI
} else {
  use MockProvider        // Testing: hardcoded responses
}
```

### [ ] TASK 13-04: Verification & End-to-End Test
**Goal:** Verify the real LLM integration works end-to-end with actual AI responses.

**Test Scenarios:**
1. ✅ Health check
2. ✅ Create tenant + app
3. ✅ Create builder session
4. ✅ Generate with real AI (verify: non-hardcoded response)
5. ✅ SSE streaming of thoughts and tool calls
6. ✅ Generation result stored in D1
7. ✅ History retrieval
8. ✅ Error handling (simulate API failure → fallback)

**Success Criteria:**
- [ ] Generation returns **unique, non-hardcoded** code based on prompt
- [ ] SSE streams real-time thoughts and tool calls
- [ ] Generated files are syntactically valid Svelte/HTML
- [ ] Fallback to Workers AI works when Gateway is unreachable
- [ ] All existing unit tests still pass

## File Changes Summary

| File | Action |
|------|--------|
| `platform-api/src/modules/builder/providers/ai-gateway.ts` | **CREATE** - New Gateway provider |
| `platform-api/src/modules/builder/providers/index.ts` | **UPDATE** - Add factory function |
| `platform-api/src/modules/builder/service.ts` | **UPDATE** - Use dynamic provider |
| `platform-api/wrangler.toml` | **UPDATE** - Add Gateway secrets |
| `platform-api/.dev.vars` | **CREATE** - Local environment |
| `plans/smoke-test-8788.ts` | **UPDATE** - Real AI verification |

## Dependencies
- Cloudflare account with AI Gateway enabled
- OpenAI API key (یا هر provider دیگر)
- wrangler CLI for secret management

## References
- `docs/AI/AI_LAYER_CONTRACT.md` - AI Gateway architecture contract
- `docs/Planning/Daily plan 7/TASK_07_01_PORTAL_BUILDER_FEATURE.md` - Existing builder flow
- `cloudflare/platform-api/src/modules/builder/providers/cfai.ts` - Existing provider (reference)
- [Cloudflare AI Gateway Docs](https://developers.cloudflare.com/ai-gateway/)