import { BuilderService } from './service';

async function runTest() {
  console.log('🚀 Starting test: BuilderService.persistence');

  const sessionId = 'persistence-test-id';
  const tenantId = 'tenant-1';
  const appId = 'app-1';
  const template = 'template-1';
  const intent = 'intent-1';

  // 1. Mock DB
  const mockDb = {
    prepare: (sql: string) => ({
      bind: (...args: any[]) => ({
        all: async () => ({ results: [] }),
        first: async () => null,
        run: async () => ({ success: true }),
      }),
      all: async () => ({ results: [] }),
      first: async () => null,
      run: async () => ({ success: true }),
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


  // 2. Mock SessionManager
  let dbContent: Record<string, any> = {};
  const mockSessions = {
    create: async (data: any) => {
      dbContent[data.id] = { ...data, status: 'idle', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    },
    get: async (id: string) => dbContent[id] || null,
    updateStatus: async (id: string, status: string) => {
      if (dbContent[id]) {
        dbContent[id].status = status;
        dbContent[id].updated_at = new Date().toISOString();
      }
    },
    update: async (id: string, data: any) => {
      if (dbContent[id]) {
        dbContent[id] = { ...dbContent[id], ...data, updated_at: new Date().toISOString() };
      }
    },
    updateResult: async (id: string, result: any) => {
      if (dbContent[id]) {
        dbContent[id].status = 'completed';
        dbContent[id].result_summary = result.summary;
        dbContent[id].result_files_json = JSON.stringify(result.files);
        dbContent[id].result_next_actions_json = JSON.stringify(result.nextActions);
        dbContent[id].updated_at = new Date().toISOString();
      }
    },
    prepareCreate: (data: any) => ({
      bind: () => ({
        run: async () => {
          dbContent[data.id] = { ...data, status: 'idle', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
          return { changes: 1 };
        }
      })
    }),
    prepareUpdate: (id: string, data: any, expectedVersion: number) => ({
      bind: () => ({
        run: async () => {
          if (dbContent[id]) {
            dbContent[id] = { ...dbContent[id], ...data, updated_at: new Date().toISOString() };
          }
          return { changes: 1 };
        }
      })
    }),
  } as any;


  // 3. Mock DurableObject (Streamer)
  const mockStreamer = {
    idFromName: (id: string) => id,
    get: (id: string) => ({
      fetch: async () => new Response('ok'),
    }),
  } as any;

  // 4. Mock Provider
  const mockProvider = {
    generate: async () => ({ type: 'final', summary: '', files: [], nextActions: [] }),
  } as any;

  // 5. Instantiate BuilderService
  const service = new BuilderService(
    mockDb,
    mockProvider,
    mockStreamer
  );

  // Inject mocks
  (service as any).sessions = mockSessions;
  (service as any).notifyStream = async () => {};
  (service as any).prompts = {
    listBySession: async () => [],
  } as any;
  (service as any).generations = {
    create: async () => {},
  } as any;
  (service as any).history = {
    create: async () => {},
  } as any;


  // 5. Test Flow
  console.log('   Step 1: Creating session...');
  const createdSession = await service.createSession(tenantId, appId, template, intent);
  const actualSessionId = createdSession.id;

  console.log(`   Step 2: Updating session state for ${actualSessionId}...`);
  const newState = {
    files: [{ path: 'test.ts', content: 'console.log("test")' }],
    summary: 'Test summary',
    nextActions: ['Next action']
  };
  await service.updateSessionState(actualSessionId, newState);

  console.log('   Step 3: Verifying session data via getSession...');
  const sessionData = await service.getSession(actualSessionId);


  // 6. Assertions
  console.log('🔍 Verifying assertions...');

  if (!sessionData || !sessionData.session) {
    console.error('❌ Assertion failed: sessionData.session is missing');
    process.exit(1);
  }

  if (sessionData.session.status !== 'idle') {
    console.error(`❌ Assertion failed: session status expected 'idle', got '${sessionData.session.status}'`);
    process.exit(1);
  }

  if (sessionData.result?.summary !== newState.summary) {
    console.error(`❌ Assertion failed: result summary mismatch. Expected '${newState.summary}', got '${sessionData.result?.summary}'`);
    process.exit(1);
  }

  if (JSON.stringify(sessionData.result?.files) !== JSON.stringify(newState.files)) {
    console.error(`❌ Assertion failed: result files mismatch. Expected ${JSON.stringify(newState.files)}, got ${JSON.stringify(sessionData.result?.files)}`);
    process.exit(1);
  }

  if (JSON.stringify(sessionData.result?.nextActions) !== JSON.stringify(newState.nextActions)) {
    console.error(`❌ Assertion failed: result nextActions mismatch. Expected ${JSON.stringify(newState.nextActions)}, got ${JSON.stringify(sessionData.result?.nextActions)}`);
    process.exit(1);
  }

  console.log('✅ Test passed successfully!');
  process.exit(0);
}

runTest();
