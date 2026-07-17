import { test, expect } from 'vitest';
import { BuilderService } from './service';
import { SessionManager } from './sessions';
import { ConflictResolutionStrategy } from '../../types/conflict-resolution';

declare const process: any;

test('BuilderService.updateSessionState - Version Vectors success', async () => {
  const sessionId = 'test-session-id';
  const initialSession = {
    id: sessionId, tenant_id: 'tenant-1', app_id: 'app-1', template: 'template-1', intent: 'intent-1',
    status: 'idle', version: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  };

  let updatedData: any = null;

  const mockSessions = {
    get: async (id: string) => id === sessionId ? { ...initialSession } : null,
    update: async (id: string, data: any, expectedVersion: number) => {
      updatedData = data;
      return { changes: 1 };
    },
    prepareUpdate: (id: string, data: any, expectedVersion: number) => ({
      bind: () => ({
        run: async () => {
          updatedData = data;
          return { changes: 1 };
        }
      })
    }),
  } as any;

  const mockDb = {
    prepare: () => ({
      bind: () => ({
        run: async () => ({ changes: 1 }),
        all: async () => ({ results: [] }),
        first: async () => initialSession,
      }),
    }),
    batch: async (statements: any[]) => {
      const results = [];
      for (const stmt of statements) {
        if (stmt.bind) {
          results.push(await stmt.bind().run());
        }
      }
      return results;
    }
  } as any;

  const mockStreamer = {
    idFromName: (id: string) => id,
    get: (id: string) => ({
      fetch: async (req: Request) => new Response('ok'),
    }),
  } as any;

  const mockProvider = {
    generate: async () => ({ type: 'final', summary: '', files: [], nextActions: [] }),
  } as any;

  const service = new BuilderService(mockDb, mockProvider, mockStreamer);
  (service as any).sessions = mockSessions;

  const newState = {
    files: [{ path: 'src/index.ts', content: 'console.log("hello")' }],
    nextActions: ['Review changes'],
    summary: 'Generated a hello world component',
  };

  await service.updateSessionState(sessionId, newState);
  expect(updatedData).toBeTruthy();
  expect(updatedData.result_summary).toBe('Generated a hello world component');
});

test('BuilderService.updateSessionState - Optimistic Concurrency success', async () => {
  const sessionId = 'test-session-id';
  const initialSession = {
    id: sessionId, tenant_id: 'tenant-1', app_id: 'app-1', template: 'template-1', intent: 'intent-1',
    status: 'idle', version: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  };

  const mockSessions = {
    get: async (id: string) => id === sessionId ? { ...initialSession } : null,
    update: async (id: string, data: any, expectedVersion: number) => ({ changes: 1 }),
    prepareUpdate: (id: string, data: any, expectedVersion: number) => ({
      bind: () => ({
        run: async () => ({ changes: 1 })
      })
    }),
  } as any;

  const mockDb = {
    prepare: () => ({
      bind: () => ({
        run: async () => ({ changes: 1 }),
        all: async () => ({ results: [] }),
        first: async () => initialSession,
      }),
    }),
    batch: async () => []
  } as any;

  const mockStreamer = {
    idFromName: (id: string) => id,
    get: (id: string) => ({
      fetch: async (req: Request) => new Response('ok'),
    }),
  } as any;

  const mockProvider = {
    generate: async () => ({ type: 'final', summary: '', files: [], nextActions: [] }),
  } as any;

  const service = new BuilderService(mockDb, mockProvider, mockStreamer);
  (service as any).sessions = mockSessions;

  const newState = {
    files: [{ path: 'src/index.ts', content: 'console.log("hello")' }],
    summary: 'Updated',
  };

  await service.updateSessionState(sessionId, newState, undefined, undefined, ConflictResolutionStrategy.OPTIMISTIC_CONCURRENCY, 1);
});

test('BuilderService.updateSessionState - Optimistic Concurrency conflict', async () => {
  const sessionId = 'test-session-id';
  const initialSession = {
    id: sessionId, tenant_id: 'tenant-1', app_id: 'app-1', template: 'template-1', intent: 'intent-1',
    status: 'idle', version: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  };

  const mockSessions = {
    get: async (id: string) => id === sessionId ? { ...initialSession } : null,
    update: async (id: string, data: any, expectedVersion: number) => ({ changes: 1 }),
    prepareUpdate: (id: string, data: any, expectedVersion: number) => ({
      bind: () => ({
        run: async () => ({ changes: 1 })
      })
    }),
  } as any;

  const mockDb = {
    prepare: () => ({
      bind: () => ({
        run: async () => ({ changes: 1 }),
        all: async () => ({ results: [] }),
        first: async () => initialSession,
      }),
    }),
    batch: async () => []
  } as any;

  const mockStreamer = {
    idFromName: (id: string) => id,
    get: (id: string) => ({
      fetch: async (req: Request) => new Response('ok'),
    }),
  } as any;

  const mockProvider = {
    generate: async () => ({ type: 'final', summary: '', files: [], nextActions: [] }),
  } as any;

  const service = new BuilderService(mockDb, mockProvider, mockStreamer);
  (service as any).sessions = mockSessions;

  const newState = {
    files: [{ path: 'src/index.ts', content: 'console.log("hello")' }],
    summary: 'Updated',
  };

  await expect(
    service.updateSessionState(sessionId, newState, undefined, undefined, ConflictResolutionStrategy.OPTIMISTIC_CONCURRENCY, 2)
  ).rejects.toThrow('Conflict detected: state is out of sync');
});

test('BuilderService.updateSessionState - conflict detection', async () => {
  // Additional test for conflict detection
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

  const mockSessions = {
    get: async (id: string) => id === sessionId ? { ...initialSession } : null,
    update: async (id: string, data: any, expectedVersion: number) => ({ changes: 1 }),
    prepareUpdate: (id: string, data: any, expectedVersion: number) => ({
      bind: () => ({
        run: async () => {
          const session = await mockSessions.get(id);
          if (session) Object.assign(session, data);
          return { changes: 1 };
        }
      })
    }),
  } as any;

  const mockDb = {
    prepare: () => ({
      bind: () => ({
        run: async () => ({ changes: 1 }),
        all: async () => ({ results: [] }),
        first: async () => initialSession,
      }),
    }),
    batch: async () => {}
  } as any;

  const mockStreamer = {
    idFromName: (id: string) => id,
    get: (id: string) => ({
      fetch: async (req: Request) => new Response('ok'),
    }),
  } as any;

  const mockProvider = {
    generate: async () => ({ type: 'final', summary: '', files: [], nextActions: [] }),
  } as any;

  const service = new BuilderService(mockDb, mockProvider, mockStreamer);
  (service as any).sessions = mockSessions;

  const newState = {
    files: [{ path: 'src/index.ts', content: 'console.log("hello")' }],
    summary: 'Updated',
  };

  // Should throw conflict error when version mismatches
  await expect(
    service.updateSessionState(sessionId, newState, undefined, undefined, ConflictResolutionStrategy.OPTIMISTIC_CONCURRENCY, 2)
  ).rejects.toThrow('Conflict detected: state is out of sync');
});

