<script lang="ts">
    import { onMount } from 'svelte';
    import { tenants } from '$lib/api';
    import { workspace } from '$lib/stores/workspace.svelte';
    import { toast } from '$lib/stores/toast';
    import { generateId } from '$lib/utils';
    import { Button } from '$lib/components/ui/button';
    import { Card } from '$lib/components/ui/card';
    import { Input } from '$lib/components/ui/input';
    import EmptyState from '$lib/components/ui/EmptyState.svelte';
    import { Plus, LayoutGrid, Check, ArrowRight } from 'lucide-svelte';
    import { goto } from '$app/navigation';

    let list: any[] = $state([]);
    let loading = $state(true);
    let showCreate = $state(false);
    let creating = $state(false);
    let createError = $state('');
    let slugTouched = $state(false);
    let newTenant = $state({ name: '', slug: '' });

    function normalizeSlug(value: string) {
        return value
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 48);
    }

    function resetCreateForm() {
        newTenant = { name: '', slug: '' };
        slugTouched = false;
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

    function handleNameInput(event: Event) {
        const target = event.currentTarget as HTMLInputElement;
        newTenant.name = target.value;

        if (!slugTouched) {
            newTenant.slug = normalizeSlug(target.value);
        }
    }

    function handleSlugInput(event: Event) {
        const target = event.currentTarget as HTMLInputElement;
        slugTouched = target.value.length > 0;
        newTenant.slug = normalizeSlug(target.value);
    }

    async function loadTenants() {
        loading = true;
        try {
            list = await tenants.list();
            showCreate = list.length === 0;
        } catch (e: any) {
            toast.error(e.message || 'Failed to load workspaces');
        } finally {
            loading = false;
        }
    }

    onMount(loadTenants);

    async function handleCreate() {
        console.log('[Workspace] Attempting to create workspace:', newTenant);
        if (!newTenant.name || !newTenant.slug) {
            createError = 'Name and slug are required.';
            toast.error('Name and slug are required.');
            return;
        }

        creating = true;
        createError = '';

        try {
            const id = generateId('tenant_');
            const payload = { ...newTenant, id };
            console.log('[Workspace] Sending payload:', payload);
            const created = await tenants.create(payload);
            console.log('[Workspace] Successfully created:', created);
            list = [created, ...list];
            closeCreateForm();
            toast.success('Workspace created successfully!');
            selectWorkspace(created.id);
        } catch (e: any) {
            console.error('[Workspace] Creation failed:', e);
            createError = e.message || 'Failed to create workspace';
            toast.error(createError);
        } finally {
            creating = false;
        }
    }

    function selectWorkspace(id: string) {
        workspace.setTenantId(id);
        workspace.reset(); // Force re-bootstrap in layout
        goto('/projects');
    }
</script>

<div class="p-8 max-w-4xl mx-auto space-y-8">
    <header class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
            <h1 class="text-3xl font-bold text-text-primary">Workspaces</h1>
            <p class="text-text-muted mt-2">Select a workspace to manage your projects or create a new one.</p>
        </div>

        {#if !loading && list.length > 0 && !showCreate}
            <Button class="bg-accent-primary text-bg-primary hover:bg-accent-primary/90 font-bold" onclick={openCreateForm}>
                <Plus class="h-4 w-4 mr-2" /> New Workspace
            </Button>
        {/if}
    </header>

    {#if !loading && (showCreate || list.length === 0)}
        <Card class="p-8 bg-bg-secondary border-white/10 shadow-xl space-y-6">
            <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 class="text-2xl font-bold text-text-primary">New Workspace</h2>
                    <p class="text-sm text-text-muted mt-1">
                        Workspace name and slug are created right here on the page.
                    </p>
                </div>

                {#if list.length > 0}
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
                        <label for="ws-name" class="text-xs font-bold uppercase tracking-wider text-text-muted">Workspace Name</label>
                        <Input
                            id="ws-name"
                            placeholder="e.g. My Team"
                            bind:value={newTenant.name}
                            oninput={handleNameInput}
                        />
                    </div>

                    <div class="space-y-2">
                        <label for="ws-slug" class="text-xs font-bold uppercase tracking-wider text-text-muted">Slug</label>
                        <Input
                            id="ws-slug"
                            placeholder="e.g. my-team"
                            bind:value={newTenant.slug}
                            oninput={handleSlugInput}
                        />
                    </div>
                </div>

                <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <p class="text-xs text-text-muted">
                        Slug is auto-generated from the name, and you can edit it before creation.
                    </p>

                    <div class="flex gap-3">
                        {#if list.length > 0}
                            <Button type="button" variant="ghost" onclick={closeCreateForm}>Cancel</Button>
                        {/if}
                        <Button
                            type="submit"
                            class="bg-accent-primary text-bg-primary hover:bg-accent-primary/90 font-bold"
                            loading={creating}
                            disabled={creating}
                        >
                            Create Workspace
                        </Button>
                    </div>
                </div>
            </form>
        </Card>
    {/if}

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        {#if loading}
            <div class="col-span-full py-20 flex justify-center">
                <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-accent-primary"></div>
            </div>
        {:else if list.length === 0}
            <EmptyState
                icon={LayoutGrid}
                title="No workspaces found"
                description="Create your first workspace using the form above to continue."
            />
        {:else}
            {#each list as item}
                <Card 
                    class="p-6 cursor-pointer border-white/5 hover:border-accent-primary/50 transition-all group"
                    onclick={() => selectWorkspace(item.id)}
                >
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-4">
                            <div class="p-3 bg-white/5 rounded-xl">
                                <LayoutGrid class="h-6 w-6 text-text-primary" />
                            </div>
                            <div>
                                <h3 class="font-bold text-text-primary group-hover:text-accent-primary transition-colors">{item.name}</h3>
                                <p class="text-xs text-text-muted">slug: {item.slug}</p>
                            </div>
                        </div>
                        {#if workspace.state.activeTenantId === item.id}
                            <Check class="h-5 w-5 text-accent-primary" />
                        {:else}
                            <ArrowRight class="h-5 w-5 text-text-muted opacity-0 group-hover:opacity-100 transition-all" />
                        {/if}
                    </div>
                </Card>
            {/each}

            <Card 
                class="p-6 border-dashed border-white/10 bg-transparent hover:border-white/20 transition-all cursor-pointer flex items-center justify-center space-x-2"
                onclick={openCreateForm}
            >
                <Plus class="h-5 w-5 text-text-muted" />
                <span class="text-text-muted font-medium">Create New Workspace</span>
            </Card>
        {/if}
    </div>
</div>
