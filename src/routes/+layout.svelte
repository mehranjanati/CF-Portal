<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { workspace } from '$lib/stores/workspace.svelte';
    import { agentConnection } from '$lib/services/agent-connection';
    import { portal } from '$lib/api';
    import AppShell from '$lib/components/layout/AppShell.svelte';
    import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    // import { featureClient, isFeatureEnabled } from '$lib/featureFlags';

    let { children } = $props();

    // Reactive variable to hold feature flag state
    // let newDashboardLayoutEnabled = $state(false);

    async function initWorkspace() {
        if (!workspace.state.activeTenantId) {
            if ($page.url.pathname !== ('/workspace' as string)) {
                goto('/workspace');
            }
            return;
        }
        
        workspace.setLoading(true);
        try {
            const data = await portal.bootstrap(workspace.state.activeTenantId);
            workspace.setBootstrapData(data);
        } catch (e) {
            console.error('Failed to bootstrap workspace:', e);
            workspace.setTenantId(null);
            goto('/workspace');
        } finally {
            workspace.setLoading(false);
        }
    }

    onMount(async () => {
        // Initialize workspace
        initWorkspace();

        // Start the agent connection
        agentConnection.connect();

        // Wait for OpenFeature client to be ready
        // await featureClient.init();
        // newDashboardLayoutEnabled = isFeatureEnabled('new-dashboard-layout', false);
    });

    // Cleanup connection on unmount
    onDestroy(() => {
        agentConnection.disconnect();
    });

    // Watch for tenant ID changes or route changes
    $effect(() => {
        if (workspace.state.activeTenantId && !workspace.state.initialized && !workspace.state.loading) {
            initWorkspace();
        }
        
        const isWorkspaceRoute = $page.url.pathname === ('/workspace' as string) || $page.url.pathname === ('/workspace/' as string);
        if (!workspace.state.activeTenantId && !isWorkspaceRoute) {
            goto('/workspace');
        }
    });
</script>

<AppShell>
    {#if workspace.state.loading && !workspace.state.initialized}
        <div class="flex items-center justify-center h-full">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary"></div>
        </div>
    {:else}
        <!-- {#if newDashboardLayoutEnabled}
            <div class="p-4 bg-green-500 text-white">New Dashboard Layout is ENABLED!</div>
        {/if} -->
        {@render children()}
    {/if}
</AppShell>

<ToastContainer />
