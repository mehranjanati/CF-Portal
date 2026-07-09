<script lang="ts">
  import type { BuilderFilePlanAction } from '$lib/types/builder';
  import { File, FilePlus, FileEdit, FileX } from 'lucide-svelte';

  let { files = [] } = $props<{ files: BuilderFilePlanAction[] }>();

  function getActionInfo(action: string) {
    switch (action) {
      case 'create': 
        return { 
          color: 'text-green-400 bg-green-500/10 border-green-500/20', 
          icon: FilePlus,
          label: 'Create'
        };
      case 'update': 
        return { 
          color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', 
          icon: FileEdit,
          label: 'Update'
        };
      case 'delete': 
        return { 
          color: 'text-red-400 bg-red-500/10 border-red-500/20', 
          icon: FileX,
          label: 'Delete'
        };
      default: 
        return { 
          color: 'text-gray-400 bg-white/5 border-white/10', 
          icon: File,
          label: 'Unknown'
        };
    }
  }
</script>

<div class="bg-bg-secondary rounded-xl border border-white/5 overflow-hidden shadow-sm">
  <div class="px-4 py-3 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
    <h3 class="text-sm font-bold text-text-muted uppercase tracking-wider">File Changes</h3>
    <span class="text-xs font-medium text-text-muted">{files.length} files</span>
  </div>
  
  <ul class="divide-y divide-white/5">
    {#each files as file}
      {@const info = getActionInfo(file.action)}
      <li class="px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors group">
        <div class="flex items-center space-x-3 min-w-0">
          <div class={`p-1.5 rounded-md border ${info.color}`}>
            <info.icon class="w-4 h-4" />
          </div>
          <div class="flex flex-col min-w-0">
            <span class="text-sm font-mono text-text-primary truncate">{file.path}</span>
            <span class="text-[10px] font-bold uppercase tracking-tighter text-text-muted">{info.label}</span>
          </div>
        </div>
        
        <button class="opacity-0 group-hover:opacity-100 text-xs text-accent-primary font-medium hover:underline transition-opacity">
          View Diff
        </button>
      </li>
    {:else}
      <li class="px-4 py-8 text-center text-text-muted text-sm italic">
        No file changes proposed.
      </li>
    {/each}
  </ul>
</div>