# TASK 13-04: Verification & End-to-End Test

## Objective
Verify that the AI Gateway integration works end-to-end with actual, non-hardcoded AI responses, and that all existing functionality continues to work.

## Prerequisites
- AI Gateway configured and credentials set in environment
- Platform-api server running locally
- Smoke test script ready

## Test Scenarios

### Scenario 1: Provider Selection Verification
Verify the correct provider is selected based on environment:

```bash
# Test 1: With AI_GATEWAY_TOKEN set → AIGatewayProvider
export AI_GATEWAY_TOKEN="test-token"
export AI_GATEWAY_URL="https://gateway.ai.cloudflare.com/v1/test/nexus-ai-gateway"
# Expected log: [BuilderService] Using AIGatewayProvider

# Test 2: Without AI_GATEWAY_TOKEN, with AI binding → CFAIProvider
unset AI_GATEWAY_TOKEN
# Expected log: [BuilderService] Using CFAIProvider (Workers AI)

# Test 3: Without either → MockProvider
# Expected log: [BuilderService] Using MockProvider
```

### Scenario 2: Real LLM Code Generation
Verify that the LLM returns unique, non-hardcoded responses:

```bash
# Create session
SESSION=$(curl -s -X POST http://localhost:8787/api/builder/sessions \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"t_test","appId":"app_test","template":"landing-page","intent":"Build a landing page"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")

# Generate with specific prompt
curl -s -X POST "http://localhost:8787/api/builder/sessions/$SESSION/generate" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Add a blog section with 3 cards"}' \
  | python3 -m json.tool
```

**Expected:** The response should contain actual generated Svelte code, not the hardcoded mock content.

### Scenario 3: SSE Streaming with Real Data
Verify that SSE events are emitted during real LLM generation:

```bash
# Open SSE stream in background
curl -s -N "http://localhost:8787/api/builder/sessions/$SESSION/stream" &
SSE_PID=$!

# Trigger generation
curl -s -X POST "http://localhost:8787/api/builder/sessions/$SESSION/generate" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Add a hero section"}'

# Wait and check events
sleep 5
kill $SSE_PID 2>/dev/null
```

**Expected events streamed:**
```
data: {"type":"message","role":"assistant","content":"..."}  ← Real thoughts
data: {"type":"tool_call","tool_name":"...","args":{...}}     ← Real tool calls
data: {"type":"state_update","payload":{"event":"generation_result",...}}  ← Final result
```

### Scenario 4: Different Prompts → Different Output
Verify that the AI is actually generating (not caching identical responses):

```bash
# Generate with prompt 1
curl -s -X POST "http://localhost:8787/api/builder/sessions/$SESSION/generate" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Build a dark theme dashboard"}'

# Generate with prompt 2
curl -s -X POST "http://localhost:8787/api/builder/sessions/$SESSION/generate" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Build a light theme landing page"}'

# Verify: summaries and file contents should be DIFFERENT
```

### Scenario 5: Fallback Behavior
Verify that when AI Gateway is unreachable, the system falls back to Workers AI:

```bash
# Set invalid Gateway URL
export AI_GATEWAY_URL="https://invalid-url"

# Generate - should trigger fallback log:
# [AIGatewayProvider] Falling back to Workers AI
```

### Scenario 6: Existing Tests Still Pass
Verify that all existing unit tests continue to work:

```bash
cd /Users/elbaan/Desktop/final\ code/cloudflare/portal
npx vitest run
```

**Expected:** 11/11 tests pass (agui-parser: 6, tool-handler: 5)

## Smoke Test Script

Create an enhanced smoke test at `cloudflare/plans/smoke-test-ai.ts`:

```typescript
const smokeTest = async () => {
  const API_BASE_URL = 'http://127.0.0.1:8787';
  const TENANT_ID = 't_smoke_ai';
  const APP_ID = 'app_smoke_ai';
  
  // 1. Health check
  const health = await fetch(`${API_BASE_URL}/api/health`);
  console.assert(health.ok, 'Health check failed');
  
  // 2. Create session
  const sessionRes = await fetch(`${API_BASE_URL}/api/builder/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenantId: TENANT_ID,
      appId: APP_ID,
      template: 'landing-page',
      intent: 'Smoke test landing page'
    })
  });
  const session = await sessionRes.json();
  console.assert(sessionRes.ok, 'Session creation failed');
  console.log('✅ Session created:', session.data.id);
  
  // 3. Generate with real AI
  const genRes = await fetch(`${API_BASE_URL}/api/builder/sessions/${session.data.id}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Create a simple hero section with a title and button' })
  });
  const genData = await genRes.json();
  console.assert(genRes.ok, 'Generation failed');
  console.assert(genData.data.result?.files?.length > 0, 'No files generated');
  console.log('✅ Real AI generation complete:', genData.data.result?.summary);
  
  // 4. Verify the response is NOT the hardcoded mock
  const isMockResponse = genData.data.result?.summary === 'Mock generated response (no real AI connected)';
  console.assert(!isMockResponse, 'Response is still mock - AI Gateway not connected');
  
  // 5. Check history
  const historyRes = await fetch(`${API_BASE_URL}/api/builder/apps/${APP_ID}/history`);
  const history = await historyRes.json();
  console.assert(history.data?.items?.length > 0, 'History empty');
  console.log('✅ History:', history.data.items.length, 'items');
  
  console.log('\n🎉 AI smoke test passed!');
};

smokeTest().catch(console.error);
```

## Final Verification Checklist

- [ ] AIGatewayProvider makes real HTTP calls to Gateway
- [ ] Generated code is unique per prompt (not hardcoded)
- [ ] SSE streams real-time LLM thoughts and tool calls
- [ ] Tool calling works (model uses list_files, read_file, write_file)
- [ ] Fallback to Workers AI works when Gateway is down
- [ ] Generated files are valid Svelte/HTML
- [ ] All 11 existing unit tests pass
- [ ] Provider selection works based on env vars
- [ ] Generation results persist to D1
- [ ] History endpoint returns correct data

## Rollback Plan
If real LLM integration causes issues:
1. Remove `AI_GATEWAY_TOKEN` env var → system falls back to CFAIProvider/MockProvider
2. Existing functionality is unaffected
3. No data migration needed