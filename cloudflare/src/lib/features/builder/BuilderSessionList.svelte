<script lang="ts">
  import { builderStore } from '$lib/stores/builder.svelte';
  import { Clock, ChevronRight, CheckCircle2, XCircle, Loader2 } from 'lucide-svelte';

  function getStatusIcon(status: string) {
    switch (status) {
      case 'completed': return { icon: CheckCircle2, color: 'text-green-500' };
      case 'failed': return { icon: XCircle, color: 'text-red-500' };
      case 'generating': return { icon: Loader2, color: 'text-blue-500 animate-spin' };
      default: return { icon: Clock, color: 'text-gray-400' };
    }
  }

  function handleSelectSession(sessionId: string) {
    builderStore.loadSession(sessionId);
  }
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between px-1">
    <h3 class="text-sm font-bold uppercase tracking-wider text-text-muted">History</h3>
    <span class="text-[10px] font-medium bg-white/5 px-2 py-0.5 rounded-full text-text-muted border border-white/5">
      {builderStore.history.length} sessions
    </span>
  </div>

  <div class="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
    {#each builderStore.history as session}
      {@const status = getStatusIcon(session.status)}
      <button 
        onclick={() => handleSelectSession(session.id)}
        class={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group ${
          builderStore.session?.id === session.id 
            ? 'bg-accent-primary/10 border-accent-primary/50 ring-1 ring-accent-primary/20' 
            : 'bg-white/[0.02] border-white/5 hover:border-white/20 hover:shadow-sm'
        }`}
      >
        <div class="flex items-center space-x-3 min-w-0">
          <status.icon class={`w-4 h-4 shrink-0 ${status.color}`} />
          <div class="min-w-0">
            <p class={`text-xs font-bold truncate ${builderStore.session?.id === session.id ? 'text-accent-primary' : 'text-text-primary'}`}>
              {session.intent}
            </p>
            <p class="text-[10px] text-text-muted font-medium">
              {new Date(session.createdAt).toLocaleDateString()} · {session.template}
            </p>
          </div>
        </div>
        <ChevronRight class={`w-3 h-3 transition-transform ${builderStore.session?.id === session.id ? 'text-accent-primary translate-x-0.5' : 'text-text-muted group-hover:text-text-primary group-hover:translate-x-0.5'}`} />
      </button>
    {:else}
      <div class="py-10 text-center border-2 border-dashed border-white/5 rounded-2xl">
        <Clock class="w-8 h-8 text-white/10 mx-auto mb-2" />
        <p class="text-xs text-text-muted font-medium">No history yet</p>
      </div>
    {/each}
  </div>
</div>

<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.2);
  }
</style>