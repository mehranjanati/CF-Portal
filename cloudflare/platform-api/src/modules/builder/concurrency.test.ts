import { BuilderService } from './service';
import { SessionManager } from './sessions';
import { PromptManager } from './prompts';
import { GenerationManager } from './generations';
import { HistoryManager } from './history';
import { CFAIProvider } from './providers/cfai';

async function runTest() {
  console.log('🚀 Starting test: BuilderService.updateSessionState concurrency');

  const sessionId = 'test-session-id';
  const tenantId = 'tenant-1';
  const appId = 'app-1';

  const getFreshSession = () => ({
    id: sessionId,
    tenant_id: tenantId,
    app_id: appId,
    template: 'template-1',
    intent: 'intent-1',
    status: 'idle',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
    version_vector: {}
  });

  let initialSession = getFreshSession();

   // 1. Mock D1
  const mockDb = {
    prepare: () => ({
      bind: () => ({
        run: async () => ({ changes: 1 }),
        all: async () => ({ results: [] }),
        first: async () => initialSession,
      }),
    }),
    batch: async (statements: any[]) => {
      for (const stmt of statements) {
        if (stmt.bind) {
          await stmt.bind().run();
        }
      }
      return statements.map(s => ({ changes: 1 }));
    }
  } as any;


    // 2. Mock SessionManager (to simulate conflict)
    let sessionVersion = 1;
    const mockSessions = {
      get: async (id: string) => {
        if (id === sessionId) {
          return {
            ...initialSession,
            version: sessionVersion,
            version_vector: {}
          };
        }
        return null;
      },
       update: async (id: string, data: any, expectedVersion: number) => {
         console.log(`   [Mock SessionManager.update] Called with version ${expectedVersion}, data: ${JSON.stringify(data)}`);
         if (expectedVersion !== sessionVersion) {
           throw new Error('Conflict detected: session update failed');
         }
         Object.assign(initialSession, data);
         sessionVersion++;
         return { changes: 1 };
       },

       prepareUpdate: (id: string, data: any, expectedVersion: number) => ({
         bind: () => ({
           run: async () => {
             console.log(`   [Mock SessionManager.prepareUpdate] Called with version ${expectedVersion}`);
             if (expectedVersion !== sessionVersion) {
               throw new Error('Conflict detected: session update failed');
             }
             Object.assign(initialSession, data);
             sessionVersion++;
             return { changes: 1 };
           }
         })
       }),

      prepareUpdateResult: (id: string, result: any, expectedVersion: number) => ({
        bind: () => ({
          run: async () => {
            if (expectedVersion !== undefined && expectedVersion !== sessionVersion) {
              throw new Error('Conflict detected: session result update failed');
            }
            sessionVersion++;
            return { changes: 1 };
          }
        })
      }),
      prepareUpdateStatus: (id: string, status: string, expectedVersion?: number) => ({
        bind: () => ({
          run: async () => {
            if (expectedVersion !== undefined && expectedVersion !== sessionVersion) {
              throw new Error('Conflict detected: session status update failed');
            }
            sessionVersion++;
            return { changes: 1 };
          }
        })
      }),
      prepareCreate: (data: any) => ({
        bind: () => ({
          run: async () => {
            sessionVersion++;
            return { changes: 1 };
          }
        })
      }),
      create: async () => ({ changes: 1 })
    } as any;


  // 3. Mock DurableObject (Streamer)
  const mockStreamer = {
    idFromName: (id: string) => id,
    get: (id: string) => ({
      fetch: async (req: Request) => {
        return new Response('ok');
      },
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

  // 6. Define the state update
  const newState = {
    files: [{ path: 'src/index.ts', content: 'console.log("hello")' }],
    nextActions: ['Review changes'],
    summary: 'Generated a hello world component',
  };

  // 7. Execute the method with concurrent calls
  console.log('   Executing concurrent updateSessionState calls...');
  
  try {
    // Run two updates concurrently. One should succeed and the other should retry and succeed (due to our implementation)
    // or fail if we don't have enough retries.
    await Promise.all([
      service.updateSessionState(sessionId, newState, { 'client-1': 1 }, 'client-1'),
      service.updateSessionState(sessionId, newState, { 'client-2': 1 }, 'client-2')
    ]);
    console.log('✅ Test passed: Concurrent updates handled!');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  }

  // 8. Test CASE 4: Concurrent updates to different fields (Automatic Merge)
  console.log('🧪 Test CASE 4: Concurrent updates to different fields (Automatic Merge)...');
  initialSession = getFreshSession();
  initialSession.version = 1;
  initialSession.version_vector = { 'other-client': 1 };
  // Reset mock state for this test
  sessionVersion = 1;

  const client1State = { summary: 'Client 1 Summary' };
  const client2State = { files: [{ path: 'src/new.ts', content: 'console.log("new")' }] };

  try {
    await Promise.all([
      service.updateSessionState(sessionId, client1State, { 'client-1': 1 }, 'client-1'),
      service.updateSessionState(sessionId, client2State, { 'client-2': 1 }, 'client-2')
    ]);
  } catch (err) {
    console.error('❌ Test CASE 4 failed with error:', err);
    process.exit(1);
  }

  const finalSession = await mockSessions.get(sessionId);
  
  if (finalSession.result_summary !== 'Client 1 Summary') {
    console.error(`❌ Assertion failed: summary mismatch. Expected "Client 1 Summary", got "${finalSession.result_summary}"`);
    process.exit(1);
  }
  
  const finalFiles = JSON.parse(finalSession.result_files_json || '[]');
  if (finalFiles.length !== 1 || finalFiles[0].path !== 'src/new.ts') {
    console.error(`❌ Assertion failed: files mismatch. Expected 1 file with path "src/new.ts", got ${JSON.stringify(finalFiles)}`);
    process.exit(1);
  }

  console.log('✅ Test CASE 4 passed!');

  process.exit(0);
}

runTest();

