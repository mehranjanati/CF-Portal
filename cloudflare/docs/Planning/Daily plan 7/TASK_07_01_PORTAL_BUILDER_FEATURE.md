# Task 07.1: Portal Builder Feature Implementation

## Goal
Implement the Builder feature in the portal based on the route map and feature structure defined in Daily Plan 6.

## Implementation Files

### 1. Route File
**File**: `portal/src/routes/(app)/builder/+page.svelte`
```svelte
<script lang="ts">
  import { BuilderPage } from '$lib/features/builder/BuilderPage.svelte';
  import { onMount } from 'svelte';
  import { appStore } from '$lib/stores/app';
  
  // Ensure app context exists
  onMount(() => {
    if (!appStore.activeAppId) {
      // Redirect to project selection if no context
      // This would use your router library
    }
  });
</script>

<BuilderPage />
```

### 2. Main Builder Page Component
**File**: `portal/src/lib/features/builder/BuilderPage.svelte`
```svelte
<script lang="ts">
  import { BuilderPromptPanel } from './BuilderPromptPanel.svelte';
  import { BuilderResultPanel } from './BuilderResultPanel.svelte';
  import { BuilderSessionList } from './BuilderSessionList.svelte';
  import { builderStore } from './builder.svelte.ts';
  
  let isTwoPane = true;
  
  // Responsive layout
  function handleResize() {
    isTwoPane = window.innerWidth >= 768;
  }
</script>

<style>
  .builder-layout {
    display: flex;
    height: 100vh;
    gap: 1rem;
  }
  
  @media (max-width: 767px) {
    .builder-layout {
      flex-direction: column;
    }
  }
  
  .pane {
    padding: 1rem;
    overflow-y: auto;
    flex: 1;
    min-width: 0;
  }
  
  .pane-left {
    border-right: 1px solid var(--gray-200);
  }
  
  .pane-right {
    border-left: 1px solid var(--gray-200);
  }
</style>

<div class="builder-layout" on:resize={handleResize}>
  <div class="pane pane-left">
    <BuilderPromptPanel />
  </div>
  <div class="pane pane-right">
    {#if $builderStore.activeSession}
      <BuilderResultPanel sessionId={$builderStore.activeSession.id} />
    {:else}
      <BuilderSessionList />
    {/if}
  </div>
</div>
```

### 3. Builder Prompt Panel
**File**: `portal/src/lib/features/builder/BuilderPromptPanel.svelte`
```svelte
<script lang="ts">
  import { builderStore } from './builder.svelte.ts';
  import { onMount } from 'svelte';
  
  let prompt = '';
  let template = '';
  let intent = '';
  let isGenerating = false;
  
  // Templates would come from API
  const templates = [
    { id: 'landing-page', name: 'Landing Page' },
    { id: 'dashboard', name: 'Dashboard' },
    { id: 'blog', name: 'Blog' }
  ];
  
  async function startSession() {
    if (!template || !intent) return;
    
    isGenerating = true;
    try {
      const session = await builderStore.createSession(template, intent);
      // Set as active session
      builderStore.setActiveSession(session);
    } finally {
      isGenerating = false;
    }
  }
  
  async function generate() {
    if (!prompt.trim()) return;
    
    isGenerating = true;
    try {
      await builderStore.generate(prompt);
      prompt = ''; // Clear prompt after generation
    } finally {
      isGenerating = false;
    }
  }
</script>

<div class="prompt-panel">
  <h2>Builder</h2>
  
  <div class="form-group">
    <label>Template</label>
    <select bind:value={template} disabled={isGenerating}>
      <option value="">Select template...</option>
      {#each templates as t}
        <option value={t.id}>{t.name}</option>
      {/each}
    </select>
  </div>
  
  <div class="form-group">
    <label>Intent / Description</label>
    <textarea 
      bind:value={intent} 
      placeholder="Describe what you want to build..."
      rows="3"
      disabled={isGenerating}
    ></textarea>
  </div>
  
  <div class="form-group">
    <label>Prompt (Optional)</label>
    <textarea 
      bind:value={prompt} 
      placeholder="Additional instructions..."
      rows="3"
      disabled={isGenerating}
    ></textarea>
  </div>
  
  <div class="actions">
    <button 
      on:click={startSession}
      disabled={isGenerating || !template || !intent}
      class:loading={isGenerating}
    >
      {#if isGenerating}
        Starting...
      {:else}
        Start Session
      {/if}
    </button>
    
    <button 
      on:click={generate}
      disabled={isGenerating || !$builderStore.activeSession}
      class:loading={isGenerating}
      ml="2"
    >
      {#if isGenerating}
        Generating...
      {:else}
        Generate
      {/if}
    </button>
  </div>
</div>

<style>
  .prompt-panel {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
  }
  
  .form-group label {
    margin-bottom: 0.25rem;
    font-weight: 500;
  }
  
  .form-group select,
  .form-group textarea {
    padding: 0.5rem;
    border: 1px solid var(--gray-300);
    border-radius: 4px;
    font-family: inherit;
  }
  
  .form-group textarea {
    resize: vertical;
    min-height: 80px;
  }
  
  .actions {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }
  
  button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    background: var(--primary-500);
    color: white;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: opacity 0.2s;
  }
  
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  button:hover:not(:disabled) {
    opacity: 0.9;
  }
  
  .loading::after {
    content: '';
    animation: spin 1s linear infinite;
    display: inline-block;
    width: 1em;
    height: 1em;
    border: 2px solid currentColor;
    border-radius: 50%;
    border-top-color: transparent;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
```

### 4. Builder Result Panel
**File**: `portal/src/lib/features/builder/BuilderResultPanel.svelte`
```svelte
<script lang="ts">
  import { builderStore } from './builder.svelte.ts';
  import { onMount } from 'svelte';
  
  export let sessionId: string;
  
  let session = null;
  let result = null;
  let prompts = [];
  let isLoading = true;
  
  async function loadData() {
    isLoading = true;
    try {
      const data = await builderStore.getSession(sessionId);
      session = data.session;
      result = data.result;
      prompts = data.prompts;
    } finally {
      isLoading = false;
    }
  }
  
  onMount(loadData);
</script>

{#if isLoading}
  <div class="loading">Loading...</div>
{:else if !session}
  <div class="error">Session not found</div>
{:else}
  <div class="result-panel">
    <h2>Session: {session.template} - {session.intent}</h2>
    <p><strong>Status:</strong> 
      <span class:status={session.status}>
        {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
      </span>
    </p>
    
    {#if result}
      <div class="result-section">
        <h3>Generated Result</h3>
        <p><strong>Summary:</strong> {result.summary}</p>
        
        <div class="files-preview">
          <h4>Files ({result.files.length}):</h4>
          <ul>
            {#each result.files as file}
              <li>{file.path} ({file.action})</li>
            {/each}
          </ul>
        </div>
        
        <div class="next-actions">
          <h4>Next Actions:</h4>
          <ul>
            {#each result.nextActions as action}
              <li>{action}</li>
            {/each}
          </ul>
        </div>
      </div>
    {/if}
    
    {#if prompts.length > 0}
      <div class="history-section">
        <h3>Prompt History</h3>
        <ul>
          {#each prompts as p}
            <li class:selected={p.status === 'generating'}>
              <strong>{p.prompt.substring(0, 50)}...</strong>
              <span class="status">{p.status}</span>
              {#if p.responseSummary}
                <br><small>{p.responseSummary}</small>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
{/if}

<style>
  .result-panel {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .result-section, .history-section {
    border: 1px solid var(--gray-200);
    border-radius: 4px;
    padding: 1rem;
  }
  
  .status {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    border-radius: 3px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
  }
  
  .status.idle { background: var(--gray-100); color: var(--gray-800); }
  .status.generating { background: var(--blue-100); color: var(--blue-800); }
  .status.success { background: var(--green-100); color: var(--green-800); }
  .status.error { background: var(--red-100); color: var(--red-800); }
  
  .files-preview h4,
  .next-actions h4 {
    margin-top: 0;
    margin-bottom: 0.5rem;
  }
  
  .files-preview ul,
  .next-actions ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  
  .files-preview li,
  .next-actions li {
    padding: 0.25rem 0;
    border-bottom: 1px solid var(--gray-100);
  }
  
  .history-section ul {
    max-height: 200px;
    overflow-y: auto;
  }
  
  .history-section li {
    padding: 0.5rem;
    border-bottom: 1px solid var(--gray-100);
  }
  
  .history-section li.selected {
    background: var(--blue-50);
    border-left: 3px solid var(--blue-500);
  }
  
  .loading {
    text-align: center;
    padding: 2rem;
    color: var(--gray-500);
  }
  
  .error {
    text-align: center;
    padding: 2rem;
    color: var(--red-500);
  }
</style>
```

### 5. Builder Session List / History
**File**: `portal/src/lib/features/builder/BuilderSessionList.svelte`
```svelte
<script lang="ts">
  import { builderStore } from './builder.svelte.ts';
  import { onMount } from 'svelte';
  
  let sessions = [];
  let isLoading = true;
  
  async function loadSessions() {
    isLoading = true;
    try {
      // In a real app, this would get sessions for the current app
      // For now, we'll get all sessions or use a mock
      sessions = await builderStore.getRecentSessions(10);
    } finally {
      isLoading = false;
    }
  }
  
  onMount(loadSessions);
</script>

{#if isLoading}
  <div class="loading">Loading sessions...</div>
{:else if sessions.length === 0}
  <div class="empty-state">
    <p>No sessions yet. Start your first builder session!</p>
  </div>
{:else}
  <div class="session-list">
    <h2>Recent Sessions</h2>
    <ul>
      {#each sessions as session}
        <li class="session-item" on:click={() => selectSession(session)}>
          <div class="session-info">
            <div class="session-header">
              <span class="session-title">{session.template}</span>
              <span class="session-date">{new Date(session.created_at).toLocaleString()}</span>
            </div>
            <p class="session-intent">{session.intent}</p>
            <div class="session-status">
              <span class:status={session.status}>
                {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
              </span>
            </div>
          </div>
        </li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .session-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .session-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    border: 1px solid var(--gray-200);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .session-item:hover {
    border-color: var(--primary-500);
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .session-info {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  
  .session-title {
    font-weight: 600;
    font-size: 1rem;
  }
  
  .session-date {
    font-size: 0.75rem;
    color: var(--gray-500);
  }
  
  .session-intent {
    color: var(--gray-600);
    font-size: 0.875rem;
    line-height: 1.4;
  }
  
  .session-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }
  
  .status {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    border-radius: 3px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
  }
  
  .status.idle { background: var(--gray-100); color: var(--gray-800); }
  .status.generating { background: var(--blue-100); color: var(--blue-800); }
  .status.success { background: var(--green-100); color: var(--green-800); }
  .status.error { background: var(--red-100); color: var(--red-800); }
  
  .empty-state {
    text-align: center;
    padding: 3rem;
    color: var(--gray-500);
  }
  
  .loading {
    text-align: center;
    padding: 2rem;
    color: var(--gray-500);
  }
</style>
```

### 6. Builder Store (Svelte)
**File**: `portal/src/lib/features/builder/builder.svelte.ts`
```svelte
<script context="module" lang="ts">
  import { writable, type Writable } from 'svelte/store';
  import type { BuilderSession, BuilderResult, BuilderPrompt } from '$lib/types/builder';
  
  // Mock API client - in reality this would call your platform-api
  class BuilderApiClient {
    async createSession(tenantId: string, appId: string, template: string, intent: string): Promise<BuilderSession> {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const sessionId = `bs_${Math.random().toString(36).substr(2, 9)}`;
      return {
        id: sessionId,
        tenant_id: tenantId,
        app_id: appId,
        template,
        intent,
        status: 'idle',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
    
    async getSession(sessionId: string): Promise<{ session: BuilderSession; result: BuilderResult | null; prompts: BuilderPrompt[] }> {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock data
      return {
        session: {
          id: sessionId,
          tenant_id: 'tenant_1',
          app_id: 'app_1',
          template: 'landing-page',
          intent: 'Create a landing page',
          status: 'completed',
          result_summary: 'Generated landing page with hero section and features',
          result_files_json: JSON.stringify([
            { path: 'src/routes/+page.svelte', action: 'create' },
            { path: 'src/styles.css', action: 'create' }
          ]),
          result_next_actions_json: JSON.stringify(['review-files', 'apply-to-repo']),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        result: {
          summary: 'Generated landing page with hero section and features',
          files: [
            { path: 'src/routes/+page.svelte', action: 'create' },
            { path: 'src/styles.css', action: 'create' }
          ],
          nextActions: ['review-files', 'apply-to-repo']
        },
        prompts: [
          {
            id: 'bp_1',
            sessionId,
            prompt: 'Make it modern and clean',
            status: 'completed',
            response_summary: 'Updated design with modern styling',
            created_at: new Date(Date.now() - 60000).toISOString()
          }
        ]
      };
    }
    
    async generate(sessionId: string, prompt: string): Promise<void> {
      await new Promise(resolve => setTimeout(resolve, 2000));
      // In reality, this would call your platform-api
    }
    
    async getRecentSessions(limit: number): Promise<BuilderSession[]> {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock data
      return Array.from({ length: Math.min(3, limit) }, (_, i) => ({
        id: `bs_${i + 1}`,
        tenant_id: 'tenant_1',
        app_id: 'app_1',
        template: ['landing-page', 'dashboard', 'blog'][i],
        intent: ['Create landing page', 'Build dashboard', 'Write blog'][i],
        status: ['completed', 'generating', 'idle'][i],
        created_at: new Date(Date.now() - i * 3600000).toISOString(),
        updated_at: new Date(Date.now() - i * 3600000).toISOString()
      }));
    }
    
    async setActiveSession(session: BuilderSession): Promise<void> {
      // Update store with active session
    }
  }
  
  const api = new BuilderApiClient();
  
  // Store structure
  function createBuilderStore() {
    const { subscribe, set, update } = writable({
      activeSession: null as BuilderSession | null,
      sessions: [] as BuilderSession[],
      isLoading: false,
      error: null as string | null
    });
    
    return {
      subscribe,
      setActiveSession: async (session: BuilderSession) => {
        update(state => ({ ...state, activeSession: session }));
        await api.setActiveSession(session);
      },
      createSession: async (template: string, intent: string) => {
        update(state => ({ ...state, isLoading: true, error: null }));
        try {
          // In a real app, you'd get tenantId/appId from context/store
          const session = await api.createSession('tenant_1', 'app_1', template, intent);
          update(state => ({ 
            ...state, 
            isLoading: false,
            activeSession: session
          }));
          return session;
        } catch (error) {
          update(state => ({ 
            ...state, 
            isLoading: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }));
          throw error;
        }
      },
      generate: async (prompt: string) => {
        update(state => ({ ...state, isLoading: true, error: null }));
        try {
          const session = await api.getActiveSession(); // Would need to implement
          if (!session) throw new Error('No active session');
          await api.generate(session.id, prompt);
          // Refresh session data
          const updated = await api.getSession(session.id);
          update(state => ({ 
            ...state, 
            isLoading: false,
            activeSession: updated.session
          }));
        } catch (error) {
          update(state => ({ 
            ...state, 
            isLoading: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }));
          throw error;
        }
      },
      getSession: async (sessionId: string) => {
        update(state => ({ ...state, isLoading: true, error: null }));
        try {
          const data = await api.getSession(sessionId);
          update(state => ({ 
            ...state, 
            isLoading: false,
            activeSession: data.session
          }));
          return data;
        } catch (error) {
          update(state => ({ 
            ...state, 
            isLoading: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }));
          throw error;
        }
      },
      getRecentSessions: async (limit: number = 10) => {
        update(state => ({ ...state, isLoading: true, error: null }));
        try {
          const sessions = await api.getRecentSessions(limit);
          update(state => ({ 
            ...state, 
            isLoading: false,
            sessions
          }));
          return sessions;
        } catch (error) {
          update(state => ({ 
            ...state, 
            isLoading: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }));
          throw error;
        }
      },
      reset: () => {
        set({
          activeSession: null,
          sessions: [],
          isLoading: false,
          error: null
        });
      }
    };
  }
  
  export const builderStore = createBuilderStore();
</script>
```

### 7. Builder Types
**File**: `portal/src/lib/types/builder.ts`
```ts
export interface BuilderSession {
  id: string;
  tenant_id: string;
  app_id: string;
  template: string;
  intent: string;
  status: 'idle' | 'generating' | 'success' | 'error';
  result_summary?: string;
  result_files_json?: string;
  result_next_actions_json?: string;
  created_at: string;
  updated_at: string;
}

export interface BuilderResult {
  summary: string;
  files: Array<{
    path: string;
    action: 'create' | 'update' | 'delete';
    content?: string;
  }>;
  nextActions: string[];
}

export interface BuilderPrompt {
  id: string;
  session_id: string;
  prompt: string;
  response_summary?: string;
  status: 'generating' | 'completed' | 'failed';
  created_at: string;
}

export interface BuilderHistoryEntry {
  id: string;
  app_id: string;
  session_id?: string;
  generation_id?: string;
  status?: string;
  created_at: string;
}
```

## Integration with App Context
The builder feature assumes the existence of an app context store that provides:
- `activeAppId`: Currently selected app/project
- `activeTenantId`: Currently selected tenant/workspace

This would typically be implemented in a central app store that gets set when navigating to a project.

## API Endpoints Used
The portal builder feature communicates with the platform-api through these endpoints:
1. POST `/api/builder/sessions` - Create session
2. GET `/api/builder/sessions/:sessionId` - Get session details
3. POST `/api/builder/sessions/:sessionId/generate` - Generate code
4. GET `/api/builder/apps/:appId/history` - Get session history

Note: For the MVP implementation above, we're using a mock API client. In production, this would be replaced with actual API calls to your platform-api endpoints.

## Styling Notes
The implementation uses CSS variables for theming (e.g., `var(--primary-500)`, `var(--gray-300)`). These should be defined in your global CSS or Tailwind configuration.

## Accessibility Features
- Proper label associations for form elements
- Keyboard navigable interfaces
- ARIA live regions for status updates (could be added)
- Focus management for modal dialogs (not implemented in this basic version)

## Next Steps
1. Replace mock API client with actual API calls to platform-api
2. Integrate with real app/context state management
3. Add error handling and retry mechanisms
4. Implement actual file preview functionality
5. Add loading skeletons for better UX