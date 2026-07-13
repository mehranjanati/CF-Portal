<script lang="ts">
  import BuilderPage from '$lib/features/builder/BuilderPage.svelte';
  import { builderStore } from '$lib/stores/builder.svelte';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { workspace } from '$lib/stores/workspace.svelte';
  
  let { children } = $props();

  let tenantId = $state($page.url.searchParams.get('tenantId') || workspace.state.activeTenantId || '');
  let appId = $state($page.url.searchParams.get('appId') || workspace.state.activeAppId || '');
  let sessionId = $state($page.url.searchParams.get('sessionId') || '');
  
  onMount(() => {
    if (sessionId) {
      builderStore.loadSession(sessionId);
    }
  });
</script>

<BuilderPage {tenantId} {appId} {sessionId}>
  {@render children?.()}
</BuilderPage>
