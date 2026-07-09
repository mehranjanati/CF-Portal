<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { workspace } from '$lib/stores/workspace.svelte';
    import { agentConnection } from '$lib/services/agent-connection';
    import { portal } from '$lib/api';
    import AppShell from '$lib/components/layout/AppShell.svelte';
    import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';

    let { children } = $props();

    async function initWorkspace() {
        console.log('[Layout] initWorkspace called. activeTenantId:', workspace.state.activeTenantId);
        if (!workspace.state.activeTenantId) {
            console.log('[Layout] No active tenant. Redirecting to /workspace');
            if ($page.url.pathname !== ('/workspace' as string)) {
                goto('/workspace');
            }
            return;
        }
        
        workspace.setLoading(true);
        try {
            console.log('[Layout] Bootstrapping workspace for tenant:', workspace.state.activeTenantId);
            const data = await portal.bootstrap(workspace.state.activeTenantId);
            console.log('[Layout] Bootstrap successful:', data);
            workspace.setBootstrapData(data);
        } catch (e) {
            console.error('[Layout] Failed to bootstrap workspace:', e);
            workspace.setTenantId(null);
            goto('/workspace');
        } finally {
            workspace.setLoading(false);
        }
    }

    onMount(async () => {
        console.log('[Layout] onMount: initializing workspace');
        await initWorkspace();
    });

    onDestroy(() => {
        console.log('[Layout] onDestroy: disconnecting agent');
        agentConnection.disconnect();
    });

    // Watch for tenant ID changes or route changes
    $effect(() => {
        console.log('[Layout] $effect running. tenantId:', workspace.state.activeTenantId, 'initialized:', workspace.state.initialized, 'loading:', workspace.state.loading, 'path:', $page.url.pathname);
        
        if (workspace.state.activeTenantId && !workspace.state.initialized && !workspace.state.loading) {
            console.log('[Layout] $effect: tenant detected but not initialized. Calling initWorkspace');
            initWorkspace();
        }
        
        const isWorkspaceRoute = $page.url.pathname === ('/workspace' as string) || $page.url.pathname === ('/workspace/' as string);
        if (!workspace.state.activeTenantId && !isWorkspaceRoute) {
            console.log('[Layout] $effect: no tenant and not in workspace route. Redirecting to /workspace');
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
        {@render children()}
    {/if}
</AppShell>

<ToastContainer />
