<script lang="ts">
  import { builderStore } from '$lib/stores/builder.svelte';
  import { onMount } from 'svelte';
  import BuilderFileExplorer from './BuilderFileExplorer.svelte';
  import BuilderCodeViewer from './BuilderCodeViewer.svelte';

  let { sessionId } = $props<{ sessionId: string }>();
  
  let session: any = $state(null);
  let result: any = $state(null);
  let prompts: any[] = $state([]);
  let isLoading = $state(true);
  let selectedFile: any = $state(null);
  
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

  function handleFileSelect(event: CustomEvent<{ path: string; action: string; content?: string }>) {
    selectedFile = event.detail;
  }
</script>

{#if isLoading}
  <div class="loading">Loading...</div>
{:else if !session}
  <div class="error">Session not found</div>
{:else}
  <div class="result-panel flex flex-col h-full">
    <div class="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
      <div>
        <h2 class="text-sm font-bold text-text-primary">Session: {session.template}</h2>
        <p class="text-[10px] text-text-muted uppercase tracking-wider">{session.intent}</p>
      </div>
      <div class="flex items-center gap-2">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-secondary/20 text-accent-secondary uppercase tracking-tight">
          {session.status}
        </span>
      </div>
    </div>

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
          <div class="p-2 text-[10px] font-mono text-text-muted bg-white/5 border-b border-white/5">
            {selectedFile.path} ({selectedFile.action})
          </div>
          <div class="flex-1 overflow-auto">
            <BuilderCodeViewer code={selectedFile.content || ''} />
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
</style>

