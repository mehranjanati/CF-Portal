import { BuilderService } from './service';
import { SessionManager } from './sessions';
import { ConflictResolutionStrategy } from '../../types/conflict-resolution';

async function runTest() {
  console.log('🚀 Starting test: BuilderService.updateSessionState with Conflict Resolution');

  const sessionId = 'test-session-id';
  const clientId = 'client-1';

  let initialSession: any;
  let updatedData: any;
  let notifiedData: any;

  const getFreshSession = () => ({
    id: sessionId,
    tenant_id: 'tenant-1',
    app_id: 'app-1',
    template: 'template-1',
    intent: 'intent-1',
    status: 'idle',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
    version_vector: { 'other-client': 1 }
  });

  // 1. Mock SessionManager
  const mockSessions = {
    get: async (id: string) => {
      if (id === sessionId) return initialSession;
      return null;
    },
    update: async (id: string, data: any, expectedVersion: number) => {
      console.log('   [Mock SessionManager.update] Called with data:', JSON.stringify(data));
      updatedData = data;
      
      // Update initialSession to simulate persistence
      Object.assign(initialSession, data);
      // Handle version_vector which is stored as string in DB but object in session
      if (data.version_vector) {
        initialSession.version_vector = typeof data.version_vector === 'string' 
          ? JSON.parse(data.version_vector) 
          : data.version_vector;
      }
      initialSession.version = expectedVersion + 1;
    },
    prepareUpdate: (id: string, data: any, expectedVersion: number) => ({
      bind: () => ({
        run: async () => {
          console.log('   [Mock SessionManager.prepareUpdate] Called');
          updatedData = data;
          // Update initialSession to simulate persistence
          Object.assign(initialSession, data);
          // Handle version_vector which is stored as string in DB but object in session
          if (data.version_vector) {
            initialSession.version_vector = typeof data.version_vector === 'string' 
              ? JSON.parse(data.version_vector) 
              : data.version_vector;
          }
          initialSession.version = expectedVersion + 1;
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
        const body = await req.json();
        notifiedData = body.payload.data;
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

  const newState = {
    files: [{ path: 'src/index.ts', content: 'console.log("hello")' }],
    summary: 'Updated summary',
  };

  const clientVersionVector = { 'other-client': 1, [clientId]: 5 };

  // 5. Test CASE 1: Successful update with Version Vectors
  console.log('🧪 Test CASE 1: Successful update with Version Vectors...');
  initialSession = getFreshSession();
  updatedData = null;
  notifiedData = null;
  try {
    await service.updateSessionState(sessionId, newState, clientVersionVector, clientId);
  } catch (err) {
    console.error('❌ Test CASE 1 failed with error:', err);
    process.exit(1);
  }

  if (!updatedData) {
    console.error('❌ Assertion failed: updatedData was not set');
    process.exit(1);
  }

  // Check if version vector was updated correctly
  const updatedVector = typeof updatedData.version_vector === 'string' 
    ? JSON.parse(updatedData.version_vector) 
    : updatedData.version_vector;

  if (updatedVector['other-client'] !== 1 || updatedVector[clientId] !== 6) {
    console.error(`❌ Assertion failed: updated version_vector mismatch. Expected {other-client: 1, ${clientId}: 6}, got ${JSON.stringify(updatedVector)}`);
    process.exit(1);
  }

  if (notifiedData.version_vector['other-client'] !== 1 || notifiedData.version_vector[clientId] !== 6) {
     console.error(`❌ Assertion failed: notified version_vector mismatch. Expected {other-client: 1, ${clientId}: 6}, got ${JSON.stringify(notifiedData.version_vector)}`);
     process.exit(1);
  }

  // 6. Test CASE 2: Conflict detection
  console.log('🧪 Test CASE 2: Conflict detection (client version is old)...');
  initialSession = getFreshSession();
  // Manually advance the session to simulate CASE 1's effect
  initialSession.version = 2;
  initialSession.version_vector = { 'other-client': 1, [clientId]: 6 };
  updatedData = null;
  notifiedData = null;
  const oldVersionVector = { 'other-client': 1, [clientId]: 2 }; // 2 < 6

  try {
    await service.updateSessionState(sessionId, newState, oldVersionVector, clientId);
    console.error('❌ Test CASE 2 failed: expected error but call succeeded');
    process.exit(1);
  } catch (err: any) {
    if (err.message !== 'Conflict detected: state is out of sync') {
      console.error(`❌ Test CASE 2 failed: unexpected error message. Expected "Conflict detected: state is out of sync", got "${err.message}"`);
      process.exit(1);
    }
  }

  // 7. Test CASE 3: Last Write Wins (ignores conflict)
  console.log('🧪 Test CASE 3: Last Write Wins (ignores conflict)...');
  initialSession = getFreshSession();
  // Manually advance the session to simulate CASE 1's effect
  initialSession.version = 2;
  initialSession.version_vector = { 'other-client': 1, [clientId]: 6 };
  updatedData = null;
  notifiedData = null;
  try {
    await service.updateSessionState(
      sessionId, 
      newState, 
      oldVersionVector, 
      clientId, 
      ConflictResolutionStrategy.LAST_WRITE_WINS
    );
  } catch (err) {
    console.error('❌ Test CASE 3 failed with error:', err);
    process.exit(1);
  }

  if (!updatedData) {
    console.error('❌ Assertion failed: updatedData was not set');
    process.exit(1);
  }
  // For LWW, the version vector should still be updated by the implementation (incrementing client's counter)
  // but it won't trigger conflict check.
  const lwwVector = typeof updatedData.version_vector === 'string'
    ? JSON.parse(updatedData.version_vector)
    : updatedData.version_vector;
  if (lwwVector[clientId] !== 7) { // 6 + 1 = 7
     console.error(`❌ Assertion failed: LWW version_vector mismatch. Expected ${clientId}: 7, got ${JSON.stringify(lwwVector)}`);
     process.exit(1);
  }


  console.log('✅ All BuilderService.updateSessionState tests passed!');
  process.exit(0);
}

runTest();
