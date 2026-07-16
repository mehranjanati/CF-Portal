import { BuilderService } from './service';
import { SessionManager } from './sessions';
import { PromptManager } from './prompts';

async function runTest() {
  console.log('🚀 Starting test: BuilderService.getSession (with sync app/deployments)');

  const sessionId = 'test-session-id';
  const appId = 'test-app-id';
  const tenantId = 'test-tenant-id';

  const session = {
    id: sessionId,
    tenant_id: tenantId,
    app_id: appId,
    template: 'template-1',
    intent: 'intent-1',
    status: 'idle',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const app = {
    id: appId,
    tenant_id: tenantId,
    name: 'Test App',
    description: 'Test Description',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const deployments = [
    {
      id: 'dep-1',
      app_id: appId,
      app_name: 'Test App',
      tenant_id: tenantId,
      environment: 'production',
      url: 'https://test.app',
      current_run_id: null,
      current_run_status: null,
      current_run_commit_sha: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ];

  const prompts = [
    {
      id: 'p-1',
      prompt: 'test prompt',
      status: 'completed',
      response_summary: 'summary',
      created_at: new Date().toISOString()
    }
  ];

  // 1. Mock DB
  const mockDb = {
    prepare: (sql: string) => {
      const statement = {
        bind: (...args: any[]) => statement,
        run: async () => ({}),
        first: async () => {
          if (sql.includes('builder_sessions')) return session;
          if (sql.includes('prompts')) return prompts[0];
          if (sql.includes('FROM apps')) return app;
          return null;
        },
        all: async () => {
          if (sql.includes('builder_sessions')) return { results: [session] };
          if (sql.includes('prompts')) return { results: prompts };
          if (sql.includes('FROM deployments')) return { results: deployments };
          return { results: [] };
        }
      };
      return statement;
    }
  } as any;

  // 2. Mock DurableObject (Streamer)
  const mockStreamer = {
    idFromName: (id: string) => id,
    get: (id: string) => ({
      fetch: async (req: Request) => {
        return new Response('ok');
      },
    }),
  } as any;

  // 3. Mock Provider
  const mockProvider = {
    generate: async () => ({ type: 'final', summary: '', files: [], nextActions: [] }),
  } as any;

  // 4. Instantiate BuilderService
  const service = new BuilderService(
    mockDb,
    mockProvider,
    mockStreamer
  );

  // 5. Execute the method
  try {
    const data = await service.getSession(sessionId);

    // 6. Assertions
    console.log('🔍 Verifying assertions...');

    if (!data.session || data.session.id !== sessionId) {
      console.error(`❌ Assertion failed: session id mismatch. Expected ${sessionId}, got ${data.session?.id}`);
      process.exit(1);
    }

    if (data.prompts.length !== prompts.length) {
      console.error(`❌ Assertion failed: prompts length mismatch. Expected ${prompts.length}, got ${data.prompts.length}`);
      process.exit(1);
    }

    if (!data.app || data.app.id !== appId) {
      console.error(`❌ Assertion failed: app id mismatch. Expected ${appId}, got ${data.app?.id}`);
      process.exit(1);
    }

    if (!data.deployments || data.deployments.length !== deployments.length) {
      console.error(`❌ Assertion failed: deployments length mismatch. Expected ${deployments.length}, got ${data.deployments?.length}`);
      process.exit(1);
    }

    if (data.deployments[0].id !== deployments[0].id) {
      console.error(`❌ Assertion failed: deployment id mismatch. Expected ${deployments[0].id}, got ${data.deployments[0].id}`);
      process.exit(1);
    }

    console.log('✅ Test passed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  }
}

runTest();
