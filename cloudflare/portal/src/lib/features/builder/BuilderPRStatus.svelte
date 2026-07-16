<script lang="ts">
  import { onMount } from 'svelte';
  import { Badge } from '$lib/components/ui/badge';

  let { prNumber }: { prNumber: number } = $props();
  let status = $state<'pending' | 'merging' | 'success' | 'failed'>('pending');

  onMount(() => {
    const interval = setInterval(async () => {
      try {
        // In a real app, this would call an API endpoint that polls GitHub
        // For now, we simulate it.
        const statuses: ('pending' | 'merging' | 'success' | 'failed')[] = ['pending', 'merging', 'success'];
        const randomIndex = Math.floor(Math.random() * statuses.length);
        status = statuses[randomIndex];

        if (status === 'success' || status === 'failed') {
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Failed to poll PR status:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  });

  const mappedVariant = (s: typeof status) => {
    if (s === 'success') return 'secondary';
    if (s === 'failed') return 'destructive';
    if (s === 'merging') return 'outline';
    return 'default';
  };
</script>

<div class="pr-status">
  <span class="status-label">PR Status:</span>
  <Badge variant={mappedVariant(status)}>{status}</Badge>
</div>

<style>
  .pr-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
  }

  .status-label {
    color: var(--text-muted);
  }
</style>
