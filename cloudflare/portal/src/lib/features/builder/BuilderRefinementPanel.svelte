<script lang="ts">
  import { builderStore } from '$lib/stores/builder.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Send, Loader2 } from 'lucide-svelte';

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
    <div class="textarea-wrapper">
      <Textarea
        bind:value={prompt}
        placeholder="Describe changes to refine the result..."
        disabled={isGenerating}
        class="refine-textarea"
      ></Textarea>
    </div>
     <Button 
       type="submit" 
       disabled={isGenerating || !prompt.trim()} 
       variant="default" 
       class="send-button"
     >



      {#if isGenerating}
        <Loader2 class="w-4 h-4 animate-spin" />
      {:else}
        <Send class="w-4 h-4 mr-2" />
        <span>Refine</span>
      {/if}
    </Button>
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
    gap: 0.75rem;
    align-items: flex-end;
    max-width: 100%;
  }

  .textarea-wrapper {
    flex: 1;
    position: relative;
  }

  .refine-textarea {
    min-height: 3rem;
    max-height: 12rem;
    resize: none;
    background-color: rgba(255, 255, 255, 0.05) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    color: white !important;
    font-size: 0.875rem !important;
    transition: all 0.2s ease;
  }

  .refine-textarea:focus {
    border-color: var(--accent-primary) !important;
    box-shadow: 0 0 0 2px rgba(var(--accent-primary-rgb), 0.2) !important;
  }

  .send-button {
    height: auto !important;
    padding: 0.5rem 1rem !important;
    font-weight: 600 !important;
    white-space: nowrap !important;
  }
</style>
