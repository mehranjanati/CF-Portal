import { BuilderService } from './service';
import { SessionManager } from './sessions';
import { ConflictResolutionStrategy } from '../../types/conflict-resolution';

async function runTest() {
  console.log('🚀 Starting tests: BuilderService.updateSessionState');

  const sessionId = 'test-session-id';
  const initialSession = {
    id: sessionId,
    tenant_id: 'tenant-1',
    app_id: 'app-1',
    template: 'template-1',
    intent: 'intent-1',
    status: 'idle',
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  let updatedData: any = null;

  // 1. Mock SessionManager
  const mockSessions = {
    get: async (id: string) => {
      if (id === sessionId) return { ...initialSession };
      return null;
    },
    update: async (id: string, data: any, expectedVersion: number) => {
      console.log('   [Mock SessionManager.update] Called with data:', JSON.stringify(data));
      updatedData = data;
      return { changes: 1 };
    },
    prepareUpdate: (id: string, data: any, expectedVersion: number) => ({
      bind: () => ({
        run: async () => {
          console.log('   [Mock SessionManager.prepareUpdate] Called');
          updatedData = data;
          return { changes: 1 };
        }
      })
    }),
  } as any;

  // 2. Mock DB
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

  // 3. Mock DurableObject (Streamer)
  const mockStreamer = {
    idFromName: (id: string) => id,
    get: (id: string) => ({
      fetch: async (req: Request) => {
        console.log(`   [Mock Streamer.fetch] Method: ${req.method}, URL: ${req.url}`);
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

  // 6. Execute the method
  console.log('--- Test Case 1: Standard update (no strategy specified, defaults to VERSION_VECTORS) ---');
  try {
    await service.updateSessionState(sessionId, newState);
  } catch (err) {
    console.error('❌ Test CASE 1 failed with error:', err);
    process.exit(1);
  }

  if (!updatedData) {
    console.error('❌ Assertion failed: updatedData was not set');
    process.exit(1);
  }
  console.log('✅ Test CASE 1 passed!');

  // Reset updatedData for next test
  updatedData = null;

  console.log('--- Test Case 2: Optimistic Concurrency - Success ---');
  try {
    await service.updateSessionState(sessionId, newState, undefined, undefined, ConflictResolutionStrategy.OPTIMISTIC_CONCURRENCY, 1);
  } catch (err) {
    console.error('❌ Test CASE 2 failed with error:', err);
    process.exit(1);
  }
  console.log('✅ Test CASE 2 passed!');

  // Reset updatedData for next test
  updatedData = null;

  console.log('--- Test Case 3: Optimistic Concurrency - Conflict ---');
  try {
    await service.updateSessionState(sessionId, newState, undefined, undefined, ConflictResolutionStrategy.OPTIMISTIC_CONCURRENCY, 2);
    console.error('❌ Test CASE 3 failed: expected error was not thrown');
    process.exit(1);
  } catch (err: any) {
    if (err.message === 'Conflict detected: state is out of sync') {
      console.log('✅ Test CASE 3 passed (conflict detected as expected)!');
    } else {
      console.error(`❌ Test CASE 3 failed: unexpected error message. Expected "Conflict detected: state is out of sync", got "${err.message}"`);
      process.exit(1);
    }
  }

  console.log('\n🎉 All tests passed successfully!');
  process.exit(0);
}

runTest();

