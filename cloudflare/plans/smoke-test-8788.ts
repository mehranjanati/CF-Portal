// Smoke test for Builder MVP on port 8788
const smokeTest = async () => {
  console.log('🧪 Running Builder MVP Smoke Test on port 8788...');

  const API_BASE_URL = 'http://localhost:8788';

  try {
    console.log('\n=== Test 1: Health Check ===');
    const healthResponse = await fetch(`${API_BASE_URL}/api/health`);
    if (!healthResponse.ok) {
      console.error('❌ Health check failed:', await healthResponse.text());
      return false;
    }
    console.log('✅ Health check passed');

    console.log('\n=== Test 2: Session Creation ===');
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

    console.log('\n=== Test 3: Generation ===');
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

    console.log('\n✅ All smoke tests passed!');
    return true;
  } catch (err: any) {
    console.error('\n❌ Smoke test error:', err.message);
    return false;
  }
};

smokeTest();
