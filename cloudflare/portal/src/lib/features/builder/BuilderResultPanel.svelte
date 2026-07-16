<script lang="ts">
  import { builderStore } from '$lib/stores/builder.svelte';
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
  import type { BuilderSession, BuilderResult, BuilderFilePlanAction } from '$lib/types/builder';

  let { sessionId } = $props<{ sessionId: string }>();
  
  // --- Reactive state derived directly from builderStore ---
  let session = $derived(builderStore.session);
  let result = $derived(builderStore.result);
  let isLoading = $derived(builderStore.isLoading);
  let error = $derived(builderStore.error);
  let isGenerating = $derived(builderStore.isGenerating);

  // --- Local UI state ---
  let selectedFile = $state<BuilderFilePlanAction | null>(null);
  let activeTab = $state<'code' | 'diff' | 'preview'>('code');
  let currentPRNumber = $state<number | null>(null);
  let currentVersion = $state(1);

  // Auto-select first file when result changes
  $effect(() => {
    if (result?.files?.length > 0 && !selectedFile) {
      selectedFile = result.files[0];
    }
    // Reset selected file if result changes completely
    if (result && selectedFile) {
      const stillExists = result.files.some(f => f.path === selectedFile.path);
      if (!stillExists) {
        selectedFile = result.files[0] || null;
      }
    }
  });

  // React to selectedFilePath from AG-UI state updates
  $effect(() => {
    const path = builderStore.applicationState.selectedFilePath as string | undefined;
    if (path && result?.files) {
      const file = result.files.find((f: any) => f.path === path);
      if (file) {
        selectedFile = file;
        activeTab = 'code';
      }
    }
  });

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

  function handleFileSelect(file: BuilderFilePlanAction) {
    selectedFile = file;
    builderStore.applicationState.selectedFilePath = file.path;
  }

  function getLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    switch (ext) {
      case 'ts': return 'typescript';
      case 'js': return 'javascript';
      case 'mjs': return 'javascript';
      case 'cjs': return 'javascript';
      case 'jsx': return 'javascript';
      case 'tsx': return 'typescript';
      case 'css': return 'css';
      case 'scss': return 'css';
      case 'less': return 'css';
      case 'html': return 'html';
      case 'svelte': return 'html';
      case 'json': return 'json';
      case 'md': return 'markdown';
      case 'mdx': return 'markdown';
      case 'yaml': return 'yaml';
      case 'yml': return 'yaml';
      case 'toml': return 'toml';
      case 'sql': return 'sql';
      case 'sh': return 'shell';
      case 'bash': return 'shell';
      case 'zsh': return 'shell';
      case 'env': return 'shell';
      case 'gitignore': return 'text';
      case 'lock': return 'json';
      default: return 'typescript';
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-400';
      case 'failed': return 'bg-red-500/20 text-red-400';
      case 'generating': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-white/10 text-text-muted';
    }
  }
</script>

{#if isLoading && !session}
  <!-- Full loading state when no session loaded yet -->
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
  <!-- No session state -->
  <div class="flex items-center justify-center h-full text-text-muted italic">
    <div class="text-center space-y-2">
      <p class="text-lg">No active session</p>
      <p class="text-sm">Start a new session from the AI Builder panel</p>
    </div>
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
        {#if result}
          <Button 
            variant="outline" 
            size="sm" 
            onclick={handleApply} 
            disabled={isLoading || isGenerating}
          >
            {#if isLoading}
              <span class="animate-spin mr-1">⟳</span>
            {/if}
            Apply to GitHub
          </Button>
        {/if}
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight {getStatusColor(session.status)}">
          {session.status}
        </span>
      </div>
    </header>

    <div class="flex-1 flex overflow-hidden">
      <!-- Left: File Explorer -->
      <aside class="w-1/3 border-r border-white/5 bg-bg-secondary/30 flex flex-col">
        <div class="px-4 py-2 text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-white/5 flex justify-between items-center">
          <span>Files</span>
          {#if result?.files}
            <span class="text-[10px] text-text-muted">({result.files.length})</span>
          {/if}
        </div>
        <ScrollArea class="flex-1">
          {#if result?.files}
            <BuilderFileExplorer 
              files={result.files} 
              onselectfile={handleFileSelect} 
            />
          {:else if isGenerating}
            <div class="p-4 space-y-2">
              <Skeleton class="h-4 w-3/4" />
              <Skeleton class="h-4 w-1/2" />
              <Skeleton class="h-4 w-2/3" />
            </div>
          {:else}
            <div class="flex items-center justify-center h-full text-text-muted italic text-xs p-4">
              No files generated yet. Use the prompt panel to generate code.
            </div>
          {/if}
        </ScrollArea>
      </aside>

      <!-- Right: Main Content -->
      <main class="flex-1 flex flex-col overflow-hidden bg-black/20">
        {#if selectedFile}
          <div class="px-4 py-2 text-[10px] font-mono text-text-muted bg-white/5 border-b border-white/5 flex justify-between items-center">
            <span class="flex items-center gap-2">
              <span class="text-text-primary">{selectedFile.path}</span>
              <span class={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                selectedFile.action === 'create' ? 'bg-green-500/20 text-green-400' :
                selectedFile.action === 'update' ? 'bg-blue-500/20 text-blue-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {selectedFile.action}
              </span>
            </span>
            <Tabs bind:value={activeTab} class="w-auto">
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
                <BuilderCodeViewer 
                  code={selectedFile?.content || ''} 
                  language={getLanguage(selectedFile.path)} 
                />
              </TabsContent>
              <TabsContent value="diff" class="h-full m-0">
                <BuilderDiffView 
                  oldCode={builderStore.originalCode[selectedFile.path] || ''} 
                  newCode={selectedFile?.content || ''} 
                  language={getLanguage(selectedFile.path)} 
                />
              </TabsContent>
              <TabsContent value="preview" class="h-full m-0">
                <BuilderHTMLPreview files={result?.files || []} />
              </TabsContent>
            </Tabs>
          </div>
        {:else if isGenerating}
          <div class="flex-1 flex items-center justify-center">
            <div class="text-center space-y-4">
              <div class="animate-spin w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full mx-auto"></div>
              <p class="text-text-muted text-sm">Generating code...</p>
            </div>
          </div>
        {:else}
          <div class="flex-1 flex items-center justify-center text-text-muted italic text-sm">
            <div class="text-center space-y-2">
              <p>Select a file to view code</p>
              <p class="text-xs">Or generate code using the prompt panel</p>
            </div>
          </div>
        {/if}
      </main>
    </div>

    <!-- Bottom: Prompt History & Refinement -->
    <footer class="flex flex-col border-t border-white/5 bg-bg-secondary/10">
      {#if builderStore.messages.length > 0}
        <div class="max-h-48 border-b border-white/5 overflow-y-auto">
          <div class="px-4 py-2 text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-white/5">
            Conversation History
          </div>
          <div class="divide-y divide-white/5">
            {#each builderStore.messages as msg}
              <div class="p-3 text-xs">
                <div class="flex items-start gap-2">
                  <span class={`font-bold shrink-0 ${
                    msg.role === 'assistant' ? 'text-accent-primary' : 'text-accent-secondary'
                  }`}>
                    {msg.role === 'assistant' ? 'AI' : 'You'}:
                  </span>
                  <span class="text-text-primary">{msg.content}</span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
      <BuilderRefinementPanel />
    </footer>
  </div>
{/if}