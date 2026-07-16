<script lang="ts">
  import { builderStore } from '$lib/stores/builder.svelte';
  import { workspace } from '$lib/stores/workspace.svelte';
import BuilderPromptPanel from './BuilderPromptPanel.svelte';
import BuilderResultPanel from './BuilderResultPanel.svelte';
import { initializeBuilderTools } from './tools';
import { onMount } from 'svelte';
  import { page } from '$app/stores';
  
  let { tenantId, appId, sessionId } = $props<{ tenantId: string; appId: string; sessionId: string }>();
  
  onMount(() => {
    initializeBuilderTools();
    if (sessionId) {
      builderStore.loadSession(sessionId);
    }
  });
</script>

<div class="flex flex-col lg:flex-row h-full w-full overflow-hidden bg-bg-primary">
  <!-- Left Pane: Prompt and Configuration -->
  <div class="w-full lg:w-1/3 lg:min-w-[350px] lg:max-w-[500px] border-b lg:border-b-0 lg:border-r border-white/5 flex flex-col h-1/2 lg:h-full bg-bg-secondary">
    <BuilderPromptPanel {tenantId} {appId} />
  </div>

  <!-- Right Pane: Results and Preview -->
  <div class="flex-1 flex flex-col h-1/2 lg:h-full overflow-hidden bg-bg-primary">
    <BuilderResultPanel {sessionId} />
  </div>
</div>
