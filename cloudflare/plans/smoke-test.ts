// Smoke test for Builder MVP
const smokeTest = async () => {
  console.log('🧪 Running Builder MVP Smoke Test...');

  const API_BASE_URL = 'http://127.0.0.1:8787';

  // 1. Smoke test: Create workspace → project → builder session → generate → history
  console.log('\n=== Test 1: API Endpoints ===');

  // Test session creation
  const sessionResponse = await fetch(`${API_BASE_URL}/api/builder/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenantId: 't_test',
      appId: 'app_test',
      template: 'landing-page',
      intent: 'Test landing page generation'
    })
  });

  if (!sessionResponse.ok) {
    console.error('❌ Session creation failed:', await sessionResponse.text());
    return false;
  }

  const session = await sessionResponse.json();
  console.log('✅ Session created:', session.id);

  // Test generation
  const generateResponse = await fetch(`${API_BASE_URL}/api/builder/sessions/${session.id}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Add a hero section' })
  });

  if (!generateResponse.ok) {
    console.error('❌ Generation failed:', await generateResponse.text());
    return false;
  }

  const generateResult = await generateResponse.json();
  console.log('✅ Generation complete:', generateResult.result?.summary);

  // Test history
  const historyResponse = await fetch(`${API_BASE_URL}/api/builder/apps/app_test/history`);
  const history = await historyResponse.json();
  console.log('✅ History loaded:', history.items?.length || 0, 'items');

  console.log('\n✅ All smoke tests passed!');
  return true;
};

smokeTest();