import { BuilderService } from './service';

async function runTest() {
  console.log('🚀 Starting comprehensive test: BuilderService.generate');

  const sessionId = 'test-session-id';
  const appId = 'test-app-id';
  const tenantId = 'test-tenant-id';
  const template = 'test-template';
  const intent = 'test-intent';

  const initialSession = {
    id: sessionId,
    tenant_id: tenantId,
    app_id: appId,
    template,
    intent,
    status: 'idle',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Track calls
  const calls = {
    promptsCreate: 0,
    sessionsUpdateStatus: 0,
    sessionsUpdateResult: 0,
    generationsCreate: 0,
    historyCreate: 0,
  };

  // 1. Mock Managers
  const mockDb = {
    prepare: (sql: string) => ({
      bind: () => ({
        run: async () => ({ success: true }),
      }),
    }),
    batch: async (statements: any[]) => {
      for (const stmt of statements) {
        if (stmt.bind) {
          await stmt.bind().run();
        }
      }
      return statements.map(s => ({ success: true }));
    }
  } as any;

  const mockSessions = {
    get: async (id: string) => (id === sessionId ? initialSession : null),
    create: async () => {},
    updateStatus: async () => { calls.sessionsUpdateStatus++; },
    updateResult: async () => { calls.sessionsUpdateResult++; },
    update: async () => {},
    prepareUpdateResult: (id: string, result: any, version: number) => ({
      bind: () => ({
        run: async () => {
          calls.sessionsUpdateResult++;
          return { changes: 1 }
        }
      })
    }),
  } as any;

  const mockPrompts = {
    create: async () => { calls.promptsCreate++; },
    listBySession: async () => [],
    updateStatus: async () => {},
    prepareUpdateStatus: (id: string, status: string, summary: string) => ({
      bind: () => ({
        run: async () => ({ changes: 1 })
      })
    }),
  } as any;

  const mockGenerations = {
    create: async () => { calls.generationsCreate++; },
    prepareCreate: (data: any) => ({
      bind: () => ({
        run: async () => {
          calls.generationsCreate++;
          return { changes: 1 }
        }
      })
    }),
  } as any;

  const mockHistory = {
    create: async () => { calls.historyCreate++; },
    listByApp: async () => [],
    prepareCreate: (data: any) => ({
      bind: () => ({
        run: async () => {
          calls.historyCreate++;
          return { changes: 1 }
        }
      })
    }),
  } as any;


  // 2. Mock DurableObject (Streamer)
  const mockStreamer = {
    idFromName: (id: string) => id,
    get: (id: string) => ({
      fetch: async () => new Response('ok'),
    }),
  } as any;

  // 3. Mock Provider
  const mockProvider = {
    generate: async () => ({
      type: 'final',
      summary: 'Final summary',
      files: [{ path: 'file.ts', content: '...' }],
      nextActions: ['action'],
    }),
  } as any;

  // 4. Instantiate BuilderService
  const service = new BuilderService(
    mockDb,
    mockProvider,
    mockStreamer
  );

  // Inject mocks
  (service as any).sessions = mockSessions;
  (service as any).prompts = mockPrompts;
  (service as any).generations = mockGenerations;
  (service as any).history = mockHistory;

  // 5. Execute
  try {
    await service.generate(sessionId, 'Hello world');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  }

  // 6. Assertions
  console.log('🔍 Verifying assertions...');

  if (calls.promptsCreate !== 1) {
    console.error(`❌ Assertion failed: prompts.create called ${calls.promptsCreate} times, expected 1`);
    process.exit(1);
  }

  if (calls.sessionsUpdateStatus !== 1) {
    console.error(`❌ Assertion failed: sessions.updateStatus called ${calls.sessionsUpdateStatus} times, expected 1`);
    process.exit(1);
  }

  if (calls.sessionsUpdateResult !== 1) {
    console.error(`❌ Assertion failed: sessions.updateResult called ${calls.sessionsUpdateResult} times, expected 1`);
    process.exit(1);
  }

  if (calls.generationsCreate !== 1) {
    console.error(`❌ Assertion failed: generations.create called ${calls.generationsCreate} times, expected 1`);
    process.exit(1);
  }

  if (calls.historyCreate !== 1) {
    console.error(`❌ Assertion failed: history.create called ${calls.historyCreate} times, expected 1`);
    process.exit(1);
  }

  console.log('✅ Test passed successfully!');
  process.exit(0);
}

runTest();
