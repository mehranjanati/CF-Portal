<script lang="ts">
  import { builderStore } from '$lib/stores/builder.svelte';
  import { onMount } from 'svelte';
  import BuilderFileExplorer from './BuilderFileExplorer.svelte';
  import BuilderCodeViewer from './BuilderCodeViewer.svelte';
  import BuilderDiffView from './BuilderDiffView.svelte';
  import BuilderHTMLPreview from './BuilderHTMLPreview.svelte';
  import BuilderPRStatus from './BuilderPRStatus.svelte';
  import BuilderRefinementPanel from './BuilderRefinementPanel.svelte';
  import VersionSelector from './VersionSelector.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';

  let { sessionId } = $props<{ sessionId: string }>();
  
  let session: any = $state(null);
  let result: any = $state(null);
  let prompts: any[] = $state([]);
  let isLoading = $state(true);
  let selectedFile: any = $state(null);
  let activeTab = $state<'code' | 'diff' | 'preview'>('code');
  let applySuccessMessage: string | null = $state(null);
  let currentPRNumber: number | null = $state(null);
  let currentVersion = $state(1);

  async function handleApply() {
    try {
      const result = await builderStore.apply();
      applySuccessMessage = `Successfully applied! PR: ${result.prUrl}`;
      currentPRNumber = result.prNumber;
      setTimeout(() => applySuccessMessage = null, 5000);
    } catch (err) {
      // Error is already handled by builderStore.error
    }
  }

  function handleVersionChange(v: number) {
    currentVersion = v;
    // In a real app, we would fetch the state for this version
  }

  async function loadData(id: string) {
    isLoading = true;
    try {
      const data = await builderStore.getSession(id);
      session = data.session;
      result = data.result;
      prompts = data.prompts;
      
      if (result?.files?.length > 0) {
        selectedFile = result.files[0];
      }
    } catch (err: any) {
      console.error('Failed to load session data:', err);
      session = null;
    } finally {
      isLoading = false;
    }
  }

  $effect(() => {
    const effectiveId = sessionId || builderStore.session?.id;
    if (effectiveId) {
      loadData(effectiveId);
    } else {
      isLoading = false;
    }
  });

  $effect(() => {
    const path = builderStore.applicationState.selectedFilePath;
    if (path && result?.files) {
      const file = result.files.find((f: any) => f.path === path);
      if (file) {
        selectedFile = file;
      }
    }
  });

  function handleFileSelect(file: { path: string; action: string; content?: string }) {
    selectedFile = file;
    builderStore.applicationState.selectedFilePath = file.path;
    activeTab = 'code';
  }

  function getLanguage(path: string) {
    const ext = path.split('.').pop();
    switch (ext) {
      case 'ts': return 'typescript';
      case 'js': return 'javascript';
      case 'css': return 'css';
      case 'html': return 'markup';
      case 'json': return 'json';
      default: return 'text';
    }
  }
</script>

{#if isLoading}
  <div class="loading-skeleton flex flex-col h-full">
    <div class="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
      <div class="space-y-2">
        <Skeleton class="h-4 w-32" />
        <Skeleton class="h-3 w-20" />
      </div>
      <Skeleton class="h-8 w-20" />
    </div>
    <div class="flex-1 flex">
      <div class="w-1/3 border-r border-white/5">
        <Skeleton class="h-full w-full" />
      </div>
      <div class="flex-1">
        <Skeleton class="h-full w-full" />
      </div>
    </div>
  </div>
{:else if !session}
  <div class="error">Session not found</div>
{:else}
  <div class="result-panel flex flex-col h-full">
    <div class="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
      <div class="flex items-center gap-4">
        <div>
          <h2 class="text-sm font-bold text-text-primary">Session: {session.template}</h2>
          <p class="text-[10px] text-text-muted uppercase tracking-wider">{session.intent}</p>
        </div>
        <VersionSelector currentVersion={currentVersion} onversionchange={handleVersionChange} />
      </div>
      <div class="flex items-center gap-2">
        <button class="apply-btn" onclick={handleApply} disabled={builderStore.isLoading}>Apply to GitHub</button>
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-secondary/20 text-accent-secondary uppercase tracking-tight">
          {session.status}
        </span>
      </div>
    </div>

    {#if applySuccessMessage}
      <div class="success-toast">
        {applySuccessMessage}
      </div>
    {/if}

    <div class="flex-1 flex overflow-hidden">
      <div class="w-1/3 border-r border-white/5 overflow-y-auto bg-bg-secondary/30">
        <div class="p-2 text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-white/5">
          Files
        </div>
        <BuilderFileExplorer 
          files={result?.files || []} 
          onselectfile={handleFileSelect} 
        />
      </div>

      <div class="flex-1 flex flex-col overflow-hidden bg-black/20">
        {#if selectedFile}
          <div class="p-2 text-[10px] font-mono text-text-muted bg-white/5 border-b border-white/5 flex justify-between items-center">
            <span>{selectedFile.path} ({selectedFile.action})</span>
            <div class="flex gap-2">
              <button class="tab-btn" class:active={activeTab === 'code'} onclick={() => activeTab = 'code'}>Code</button>
              <button class="tab-btn" class:active={activeTab === 'diff'} onclick={() => activeTab = 'diff'}>Diff</button>
              <button class="tab-btn" class:active={activeTab === 'preview'} onclick={() => activeTab = 'preview'}>Preview</button>
            </div>
          </div>

          <div class="flex-1 overflow-auto">
            {#if activeTab === 'code'}
              <BuilderCodeViewer code={builderStore.applicationState.editorContent || selectedFile?.content || ''} language={getLanguage(selectedFile.path)} />
            {:else if activeTab === 'diff'}
              <BuilderDiffView 
                oldCode={builderStore.applicationState.editorContent || ''} 
                newCode={selectedFile?.content || ''} 
                language={getLanguage(selectedFile.path)} 
              />
            {:else if activeTab === 'preview'}
              <BuilderHTMLPreview files={result?.files || []} />
            {/if}
          </div>

        {:else}
          <div class="flex-1 flex items-center justify-center text-text-muted italic text-sm">
            Select a file to view code
          </div>
        {/if}
      </div>
    </div>

    {#if prompts.length > 0}
      <div class="h-1/3 border-t border-white/5 overflow-y-auto bg-bg-secondary/10">
        <div class="p-2 text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-white/5">
          Prompt History
        </div>
        <div class="divide-y divide-white/5">
          {#each prompts as p}
            <div class={`p-3 text-xs ${p.status === 'generating' ? 'bg-accent-primary/5' : ''}`}>
              <div class="flex justify-between items-start mb-1">
                <span class="font-medium text-text-primary truncate max-w-[80%]">{p.prompt}</span>
                <span class={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${
                  p.status === 'completed' ? 'bg-green-500/20 text-green-400' : 
                  p.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {p.status}
                </span>
              </div>
              {#if p.responseSummary}
                <p class="text-text-muted line-clamp-2">{p.responseSummary}</p>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <BuilderRefinementPanel />
  </div>
{/if}

<style>
  .result-panel {
    height: 100%;
  }

  .loading {
    text-align: center;
    padding: 2rem;
    color: var(--text-muted);
  }

  .error {
    text-align: center;
    padding: 2rem;
    color: var(--error-color);
  }

  .apply-btn {
    background-color: var(--accent-primary);
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 0.25rem;
    font-size: 0.625rem;
    font-weight: bold;
    text-transform: uppercase;
    cursor: pointer;
    border: none;
  }

  .apply-btn:hover {
    background-color: var(--accent-primary-hover, #0070f3);
  }

  .apply-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .loading-skeleton {
    gap: 1rem;
  }

  .success-toast {
    position: absolute;
    top: 1rem;
    left: 50%;
    transform: translateX(-50%);
    background-color: var(--accent-primary);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    z-index: 100;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
</style>