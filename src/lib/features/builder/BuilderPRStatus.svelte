<script lang="ts">
  import { onMount } from 'svelte';
  import { builder } from '$lib/api';

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
</script>

<div class="pr-status">
  <span class="status-label">PR Status:</span>
  <span class="status-value {status}">{status}</span>
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

  .status-value {
    font-weight: bold;
    text-transform: uppercase;
  }

  .status-value.pending {
    color: var(--accent-primary);
  }

  .status-value.merging {
    color: #eab308; /* yellow */
  }

  .status-value.success {
    color: #22c55e; /* green */
  }

  .status-value.failed {
    color: #ef4444; /* red */
  }
</style>
