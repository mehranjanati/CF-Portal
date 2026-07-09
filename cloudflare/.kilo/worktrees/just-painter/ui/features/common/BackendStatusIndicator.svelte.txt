<script lang="ts">
  export let name: string;
  export let status: 'connected' | 'connecting' | 'disconnected' | 'error' = 'connecting';
  
  const colors = {
    connected: 'bg-green-500',
    connecting: 'bg-yellow-500 animate-pulse',
    disconnected: 'bg-gray-500',
    error: 'bg-red-500'
  };
</script>

<div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
  <div class="w-2 h-2 rounded-full {colors[status]}"></div>
  <span class="text-xs font-medium uppercase tracking-wider text-white/70">{name}</span>
</div>
