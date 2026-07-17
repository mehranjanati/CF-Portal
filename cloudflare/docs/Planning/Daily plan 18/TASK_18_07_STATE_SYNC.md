# TASK 18_07: State Synchronization

## هدف
هماهنگی state بین فرانت‌اند و بک‌اند با پشتیبانی از persistence و recovery.

## فایل‌های مورد نیاز
- `cloudflare/portal/src/lib/stores/builder.svelte.ts` (UPDATE)
- `cloudflare/portal/src/lib/api.ts` (UPDATE)
- `cloudflare/portal/src/lib/utils/state-sync.ts` (NEW)

## پیاده‌سازی

### Step 1: Create state-sync.ts utility

```typescript
// cloudflare/portal/src/lib/utils/state-sync.ts

const STORAGE_KEY = 'builder_state_';

export interface PersistedState {
  sessionId?: string;
  messages: any[];
  applicationState: any;
  phase: string;
  iteration: number;
  lastUpdated: number;
}

export class StateSyncManager {
  private sessionId: string;
  
  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }
  
  // Save state to localStorage
  save(state: Partial<PersistedState>): void {
    try {
      const persisted: PersistedState = {
        sessionId: this.sessionId,
        messages: state.messages || [],
        applicationState: state.applicationState || {},
        phase: state.phase || 'idle',
        iteration: state.iteration || 0,
        lastUpdated: Date.now()
      };
      
      localStorage.setItem(
        `${STORAGE_KEY}${this.sessionId}`,
        JSON.stringify(persisted)
      );
    } catch (err) {
      console.error('[StateSync] Failed to save:', err);
    }
  }
  
  // Load state from localStorage
  load(sessionId: string): PersistedState | null {
    try {
      const data = localStorage.getItem(`${STORAGE_KEY}${sessionId}`);
      if (!data) return null;
      
      const persisted: PersistedState = JSON.parse(data);
      
      // Check if state is stale (older than 24 hours)
      const dayInMs = 24 * 60 * 60 * 1000;
      if (Date.now() - persisted.lastUpdated > dayInMs) {
        this.clear(sessionId);
        return null;
      }
      
      return persisted;
    } catch (err) {
      console.error('[StateSync] Failed to load:', err);
      return null;
    }
  }
  
  // Clear state from localStorage
  clear(sessionId: string): void {
    try {
      localStorage.removeItem(`${STORAGE_KEY}${sessionId}`);
    } catch (err) {
      console.error('[StateSync] Failed to clear:', err);
    }
  }
  
  // Sync state with backend
  async syncWithBackend(): Promise<any> {
    try {
      const response = await fetch(
        `/api/builder/sessions/${this.sessionId}/state`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      if (!response.ok) {
        throw new Error(`State sync failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (err) {
      console.error('[StateSync] Backend sync failed:', err);
      return null;
    }
  }
  
  // Resolve conflict between local and remote state
  resolveConflict(
    local: PersistedState,
    remote: any
  ): PersistedState {
    // Strategy: Last-write-wins based on timestamp
    if (!remote.lastUpdated || local.lastUpdated > remote.lastUpdated) {
      return local;
    }
    return remote;
  }
}
```

### Step 2: Update BuilderStore

```typescript
// In builder.svelte.ts

import { StateSyncManager } from '$lib/utils/state-sync';

export class BuilderStore {
  private stateSync?: StateSyncManager;
  
  async createSession(tenantId: string, appId: string, template: string, name: string) {
    // ... existing code ...
    
    // Initialize state sync
    this.stateSync = new StateSyncManager(session.id);
    
    // Try to restore from localStorage
    const persisted = this.stateSync.load(session.id);
    if (persisted) {
      // Restore state
      this.messages = persisted.messages;
      this.applicationState = persisted.applicationState;
      this.phase = persisted.phase;
      this.iteration = persisted.iteration;
    }
    
    return session;
  }
  
  // Save state on changes
  private persistState() {
    if (this.stateSync && this.session) {
      this.stateSync.save({
        messages: this.messages,
        applicationState: this.applicationState,
        phase: this.phase,
        iteration: this.iteration
      });
    }
  }
  
  // Call this after state changes
  private updateState(updates: Partial<BuilderStoreState>) {
    Object.assign(this, updates);
    this.persistState();
  }
  
  // Sync with backend on reconnect
  async syncWithBackend() {
    if (!this.stateSync || !this.session) return;
    
    const remoteState = await this.stateSync.syncWithBackend();
    if (remoteState) {
      const local = this.stateSync.load(this.session.id);
      const resolved = this.stateSync.resolveConflict(local, remoteState);
      
      // Apply resolved state
      this.messages = resolved.messages;
      this.applicationState = resolved.applicationState;
      this.phase = resolved.phase;
      this.iteration = resolved.iteration;
    }
  }
  
  // Clear state on session end
  clearSession() {
    if (this.stateSync && this.session) {
      this.stateSync.clear(this.session.id);
    }
  }
}
```

### Step 3: Update API client

```typescript
// In api.ts

export const builder = {
  // ... existing methods
  
  // Sync state with backend
  syncState: async (sessionId: string) => {
    return apiFetch<any>(`/api/builder/sessions/${sessionId}/state`, {
      method: 'GET'
    });
  },
  
  // Restore session from backend
  restoreSession: async (sessionId: string) => {
    return apiFetch<any>(`/api/builder/sessions/${sessionId}/restore`, {
      method: 'POST'
    });
  }
};
```

### Step 4: Handle state_sync packets

```typescript
// In builder.svelte.ts, update generateStream() method

case 'state_sync':
  // Update application state
  if (packet.payload.state) {
    this.applicationState = {
      ...this.applicationState,
      ...packet.payload.state
    };
  }
  
  // Update phase
  if (packet.payload.status) {
    this.phase = packet.payload.status;
  }
  
  // Update iteration
  if (packet.payload.iteration) {
    this.iteration = packet.payload.iteration;
  }
  
  // Persist to localStorage
  this.persistState();
  
  break;
```

## خروجی قابل مشاهده
- State به localStorage persist می‌شود
- State بعد از refresh صفحه بازیابی می‌شود
- State با backend sync می‌شود
- Conflict resolution پیاده می‌شود
- State corruption prevention

## معیارهای موفقیت
- [ ] State بعد از refresh حفظ می‌شود
- [ ] State با backend sync است
- [ ] Conflict resolution کار می‌کند
- [ ] Stale state cleanup (24h TTL)
- [ ] No data loss on connection drop