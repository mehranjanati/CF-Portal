<script lang="ts">
    import { onMount } from 'svelte';
    import { apps } from '$lib/api';
    import { workspace } from '$lib/stores/workspace.svelte';
    import { toast } from '$lib/stores/toast';
    import { generateId } from '$lib/utils';
    // import { isFeatureEnabled } from '$lib/featureFlags';
    import { Card } from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { FolderPlus, Plus, Search, Filter, Rocket, Clock, Globe } from 'lucide-svelte';

    let showCreate = $state(false);
    let creating = $state(false);
    let createError = $state('');
    let newApp = $state({ name: '', description: '' });
    let searchQuery = $state('');

    // const isProjectDetailEnabled = $derived(isFeatureEnabled('enable-project-detail'));
    const isProjectDetailEnabled = true; // Temporarily enabled

    const filteredApps = $derived(
        workspace.state.apps.filter(app => 
            app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (app.description && app.description.toLowerCase().includes(searchQuery.toLowerCase()))
        )
    );

    function resetCreateForm() {
        newApp = { name: '', description: '' };
        createError = '';
    }

    function openCreateForm() {
        showCreate = true;
        createError = '';
    }

    function closeCreateForm() {
        showCreate = false;
        resetCreateForm();
    }

    async function handleCreate() {
        if (!newApp.name) {
            createError = 'Project name is required.';
            toast.error('Project name is required.');
            return;
        }

        if (!workspace.state.activeTenantId) {
            createError = 'No active workspace selected. Please select a workspace first.';
            toast.error(createError);
            return;
        }

        creating = true;
        createError = '';

        try {
            const id = generateId('app_');
            const created = await apps.create({
                ...newApp,
                id,
                tenantId: workspace.state.activeTenantId
            });
            workspace.state.apps = [created, ...workspace.state.apps];
            closeCreateForm();
            toast.success('Project created successfully!');
        } catch (e: any) {
            createError = e.message || 'Failed to create project';
            toast.error(createError);
        } finally {
            creating = false;
        }
    }
</script>

<div class="p-8 max-w-6xl mx-auto space-y-8">
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 class="text-3xl font-bold text-text-primary tracking-tight">Projects</h1>
            <p class="text-text-muted mt-1">Manage and deploy your edge applications.</p>
        </div>
        {#if workspace.state.apps.length > 0 && !showCreate}
            <Button onclick={openCreateForm} class="bg-accent-primary text-bg-primary hover:bg-accent-primary/90 font-bold">
                <Plus class="h-4 w-4 mr-2" /> New Project
            </Button>
        {/if}
    </header>

    {#if showCreate || workspace.state.apps.length === 0}
        <Card class="p-8 bg-bg-secondary border-white/10 shadow-xl space-y-6">
            <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 class="text-2xl font-bold text-text-primary">Create New Project</h2>
                    <p class="text-sm text-text-muted mt-1">
                        Deploy your next big idea to the edge.
                    </p>
                </div>

                {#if workspace.state.apps.length > 0}
                    <Button variant="ghost" onclick={closeCreateForm}>Cancel</Button>
                {/if}
            </div>

            {#if createError}
                <div class="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {createError}
                </div>
            {/if}

            <form
                class="space-y-5"
                onsubmit={(event) => {
                    event.preventDefault();
                    handleCreate();
                }}
            >
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <label for="project-name" class="text-xs font-bold uppercase tracking-wider text-text-muted">Project Name</label>
                        <Input id="project-name" placeholder="e.g. my-awesome-app" bind:value={newApp.name} />
                    </div>
                    <div class="space-y-2">
                        <label for="project-desc" class="text-xs font-bold uppercase tracking-wider text-text-muted">Description</label>
                        <Input id="project-desc" placeholder="What does this app do?" bind:value={newApp.description} />
                    </div>
                </div>

                <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-end pt-2">
                    <div class="flex gap-3 w-full md:w-auto">
                        {#if workspace.state.apps.length > 0}
                            <Button type="button" variant="ghost" class="flex-1 md:flex-none" onclick={closeCreateForm}>Cancel</Button>
                        {/if}
                        <Button
                            type="submit"
                            class="bg-accent-primary text-bg-primary hover:bg-accent-primary/90 font-bold flex-1 md:flex-none"
                            loading={creating}
                            disabled={creating}
                        >
                            Create Project
                        </Button>
                    </div>
                </div>
            </form>
        </Card>
    {/if}

    {#if workspace.state.apps.length > 0}
        <div class="flex items-center space-x-4 bg-bg-secondary p-4 rounded-xl border border-white/5">
            <div class="relative flex-1">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <Input 
                    placeholder="Search projects..." 
                    class="pl-10 bg-bg-primary border-white/5" 
                    bind:value={searchQuery}
                />
            </div>
            <Button variant="outline" size="icon" class="border-white/5">
                <Filter class="h-4 w-4" />
            </Button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each filteredApps as app}
                <Card class="flex flex-col bg-bg-secondary border-white/5 hover:border-white/10 transition-all group overflow-hidden">
                    <div class="p-6 space-y-4 flex-1">
                        <div class="flex items-start justify-between">
                            <div class="p-2 bg-accent-secondary/10 rounded-lg">
                                <Globe class="h-5 w-5 text-accent-secondary" />
                            </div>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-text-muted border border-white/10 uppercase tracking-wider">
                                {app.status}
                            </span>
                        </div>
                        
                        <div>
                            <h3 class="font-bold text-text-primary group-hover:text-accent-secondary transition-colors truncate">
                                {app.name}
                            </h3>
                            <p class="text-sm text-text-muted mt-1 line-clamp-2 h-10">
                                {app.description || 'No description provided.'}
                            </p>
                        </div>

                        <div class="flex items-center space-x-4 pt-2">
                            <div class="flex items-center text-[10px] text-text-muted">
                                <Clock class="h-3 w-3 mr-1" />
                                {new Date(app.created_at).toLocaleDateString()}
                            </div>
                            <div class="flex items-center text-[10px] text-text-muted">
                                <Rocket class="h-3 w-3 mr-1" />
                                0 Deploys
                            </div>
                        </div>
                    </div>
                    
                    {#if isProjectDetailEnabled}
                        <a 
                            href="/projects/{app.id}" 
                            class="px-6 py-3 bg-white/5 border-t border-white/5 text-xs font-bold text-text-muted group-hover:text-text-primary group-hover:bg-white/10 transition-all flex items-center justify-between"
                        >
                            View Project
                            <Plus class="h-3 w-3" />
                        </a>
                    {:else}
                        <div class="px-6 py-3 bg-white/5 border-t border-white/5 text-xs font-bold text-text-muted/50 flex items-center justify-between cursor-not-allowed" title="Project details are currently disabled">
                            View Project (Coming Soon)
                            <Plus class="h-3 w-3 opacity-50" />
                        </div>
                    {/if}
                </Card>
            {/each}
        </div>
    {/if}
</div>


