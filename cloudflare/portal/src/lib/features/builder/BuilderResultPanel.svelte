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
  import { Button } from '$lib/components/ui/button';
  import { Tabs, TabsList, TabsTrigger, TabsContent } from '$lib/components/ui/tabs';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import { Separator } from '$lib/components/ui/separator';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import { toast } from '$lib/stores/toast';
  import type { BuilderSession } from '$lib/types/builder';

  let { sessionId } = $props<{ sessionId: string }>();
  
  let session: BuilderSession | null = $state(null);
  let result: any = $state(null);
  let prompts: any[] = $state([]);
  let isLoading = $state(true);
  let selectedFile: any = $state(null);
  let activeTab = $state<'code' | 'diff' | 'preview'>('code');
  let currentPRNumber: number | null = $state(null);
  let currentVersion = $state(1);

  async function handleApply() {
    try {
      const res = await builderStore.apply();
      currentPRNumber = res.prNumber;
      toast.success(`Pull request #${res.prNumber} created successfully.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to apply changes");
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
    // React to selectedFilePath change in applicationState
    const path = builderStore.applicationState.selectedFilePath;
    if (path && result?.files) {
      const file = result.files.find((f: any) => f.path === path);
      if (file) {
        selectedFile = file;
        activeTab = 'code';
      }
    }
  });

  function handleFileSelect(file: { path: string; action: string; content?: string }) {
    selectedFile = file;
    builderStore.applicationState.selectedFilePath = file.path;
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
  <div class="flex flex-col h-full space-y-4 p-4">
    <div class="flex justify-between items-center">
      <div class="space-y-2">
        <Skeleton class="h-4 w-32" />
        <Skeleton class="h-3 w-20" />
      </div>
      <Skeleton class="h-8 w-20" />
    </div>
    <div class="flex-1 flex gap-4">
      <Skeleton class="w-1/3 h-full" />
      <Skeleton class="flex-1 h-full" />
    </div>
  </div>
{:else if !session}
  <div class="flex items-center justify-center h-full text-text-muted italic">
    Session not found
  </div>
{:else}
  <div class="flex flex-col h-full bg-bg-primary">
    <!-- Header -->
    <header class="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
      <div class="flex items-center gap-4">
        <div>
          <h2 class="text-sm font-bold text-text-primary">Session: {session.template}</h2>
          <p class="text-[10px] text-text-muted uppercase tracking-wider">{session.intent}</p>
        </div>
        <VersionSelector {currentVersion} onversionchange={handleVersionChange} />
      </div>
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" onclick={handleApply} disabled={builderStore.isLoading}>
          Apply to GitHub
        </Button>
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-secondary/20 text-accent-secondary uppercase tracking-tight">
          {session.status}
        </span>
      </div>
    </header>

    <div class="flex-1 flex overflow-hidden">
      <!-- Left: File Explorer -->
      <aside class="w-1/3 border-r border-white/5 bg-bg-secondary/30">
        <div class="px-4 py-2 text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-white/5">
          Files
        </div>
        <ScrollArea class="flex-1">
          <BuilderFileExplorer 
            files={result?.files || []} 
            onselectfile={handleFileSelect} 
          />
        </ScrollArea>
      </aside>

      <!-- Right: Main Content -->
      <main class="flex-1 flex flex-col overflow-hidden bg-black/20">
        {#if selectedFile}
          <div class="px-4 py-2 text-[10px] font-mono text-text-muted bg-white/5 border-b border-white/5 flex justify-between items-center">
            <span>{selectedFile.path} ({selectedFile.action})</span>
            <Tabs value={activeTab} onValueChange={(v) => activeTab = v as any} class="w-auto">
              <TabsList class="h-7 bg-white/5">
                <TabsTrigger value="code" class="text-[10px] h-7">Code</TabsTrigger>
                <TabsTrigger value="diff" class="text-[10px] h-7">Diff</TabsTrigger>
                <TabsTrigger value="preview" class="text-[10px] h-7">Preview</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div class="flex-1 overflow-hidden">
            <Tabs value={activeTab} class="h-full w-full">
              <TabsContent value="code" class="h-full m-0">
                <BuilderCodeViewer code={builderStore.applicationState.editorContent || selectedFile?.content || ''} language={getLanguage(selectedFile.path)} />
              </TabsContent>
              <TabsContent value="diff" class="h-full m-0">
                <BuilderDiffView 
                  oldCode={builderStore.applicationState.editorContent || ''} 
                  newCode={selectedFile?.content || ''} 
                  language={getLanguage(selectedFile.path)} 
                />
              </TabsContent>
              <TabsContent value="preview" class="h-full m-0">
                <BuilderHTMLPreview files={result?.files || []} />
              </TabsContent>
            </Tabs>
          </div>
        {:else}
          <div class="flex-1 flex items-center justify-center text-text-muted italic text-sm">
            Select a file to view code
          </div>
        {/if}
      </main>
    </div>

    <!-- Bottom: Prompt History & Refinement -->
    <footer class="flex flex-col border-t border-white/5 bg-bg-secondary/10">
      {#if prompts.length > 0}
        <div class="h-1/3 border-b border-white/5 overflow-y-auto">
          <div class="px-4 py-2 text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-white/5">
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
    </footer>
  </div>
{/if}
