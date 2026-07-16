<script lang="ts">
  import { builderStore } from '$lib/stores/builder.svelte';

  let prompt = $state('');
  let isGenerating = $derived(builderStore.isGenerating);

  $effect(() => {
    if (builderStore.messages.length > 0) {
      const lastMessage = builderStore.messages[builderStore.messages.length - 1];
      if (lastMessage.role === 'user') {
        prompt = lastMessage.content;
      } else {
        prompt = '';
      }
    }
  });

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    
    const currentPrompt = prompt;
    prompt = '';
    await builderStore.generate(currentPrompt);
  }
</script>

<div class="refinement-panel">
  <form onsubmit={handleSubmit} class="input-container">
    <textarea
      bind:value={prompt}
      placeholder="Describe changes..."
      disabled={isGenerating}
    ></textarea>
    <button type="submit" disabled={isGenerating || !prompt.trim()}>
      {#if isGenerating}
        <span class="loading-dots">...</span>
      {:else}
        <span>Send</span>
      {/if}
    </button>
  </form>
</div>

<style>
  .refinement-panel {
    padding: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    background-color: rgba(255, 255, 255, 0.02);
  }

  .input-container {
    display: flex;
    gap: 0.5rem;
    align-items: flex-end;
  }

  textarea {
    flex: 1;
    background-color: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.5rem;
    padding: 0.5rem;
    color: white;
    font-size: 0.875rem;
    resize: none;
    min-height: 2.5rem;
    max-height: 10rem;
  }

  textarea:focus {
    outline: none;
    border-color: var(--accent-primary);
  }

  textarea:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  button {
    background-color: var(--accent-primary);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-weight: bold;
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .loading-dots {
    display: inline-block;
    animation: blink 1s infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 0; }
    50% { opacity: 1; }
  }
</style>
