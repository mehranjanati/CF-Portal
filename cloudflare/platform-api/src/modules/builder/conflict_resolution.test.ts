import { test, expect } from 'vitest';
import { BuilderService } from './service';
import { SessionManager } from './sessions';
import { ConflictResolutionStrategy } from '../../types/conflict-resolution';

declare const process: any;

test('BuilderService.updateSessionState with Conflict Resolution', async () => {
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
        const body = await req.json() as any;
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

  // Test CASE 1: Successful update with Version Vectors
  const testSession1 = getFreshSession();
  initialSession = testSession1;
  updatedData = null;
  notifiedData = null;
  await service.updateSessionState(sessionId, newState, clientVersionVector, clientId);
  expect(updatedData).toBeTruthy();

  // Test CASE 2: Conflict detection
  const testSession2 = getFreshSession();
  initialSession = testSession2;
  initialSession.version = 2;
  initialSession.version_vector = { 'other-client': 1, [clientId]: 6 };
  updatedData = null;
  notifiedData = null;
  const oldVersionVector = { 'other-client': 1, [clientId]: 2 }; // 2 < 6

  await expect(
    service.updateSessionState(sessionId, newState, oldVersionVector, clientId)
  ).rejects.toThrow('Conflict detected: state is out of sync');

  // Test CASE 3: Last Write Wins (ignores conflict)
  const testSession3 = getFreshSession();
  initialSession = testSession3;
  initialSession.version = 2;
  initialSession.version_vector = { 'other-client': 1, [clientId]: 6 };
  updatedData = null;
  notifiedData = null;
  const oldVersionVector3 = { 'other-client': 1, [clientId]: 2 }; // 2 < 6
  await service.updateSessionState(
    sessionId, 
    newState, 
    oldVersionVector3, 
    clientId, 
    ConflictResolutionStrategy.LAST_WRITE_WINS
  );
  expect(updatedData).toBeTruthy();
});