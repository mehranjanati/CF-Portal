<script lang="ts">
  import { ChevronDown } from 'lucide-svelte';

  let { currentVersion = 1, onversionchange }: { currentVersion: number; onversionchange: (v: number) => void } = $props();
  let isOpen = $state(false);
  const versions = [1, 2, 3]; // Placeholder versions
</script>

<div class="version-selector">
  <button class="selector-btn" onclick={() => (isOpen = !isOpen)}>
    Version {currentVersion}
    <ChevronDown class="w-4 h-4 ml-1" />
  </button>

  {#if isOpen}
    <div class="dropdown">
      {#each versions as v}
        <button class="dropdown-item" class:active={v === currentVersion} onclick={() => { onversionchange(v); isOpen = false; }}>
          Version {v}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .version-selector {
    position: relative;
  }

  .selector-btn {
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--text-primary);
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    background: #1e1e1e;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.25rem;
    z-index: 100;
    min-width: 120px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  }

  .dropdown-item {
    width: 100%;
    text-align: left;
    padding: 0.5rem 1rem;
    font-size: 0.75rem;
    background: none;
    border: none;
    color: var(--text-primary);
    cursor: pointer;
  }

  .dropdown-item:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .dropdown-item.active {
    background-color: var(--accent-primary);
    color: white;
  }
</style>
