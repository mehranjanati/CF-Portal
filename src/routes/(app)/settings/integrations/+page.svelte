<script lang="ts">
    import { onMount } from 'svelte';
    import { integrations } from '$lib/api';
    import { workspace } from '$lib/stores/workspace.svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import Card from '$lib/components/ui/Card.svelte';
    import Input from '$lib/components/ui/Input.svelte';
    import Toast from '$lib/components/ui/Toast.svelte';
    import { Code, Cloud, Trash2, Plus, CheckCircle2, ShieldCheck, Key, User as UserIcon, ExternalLink } from 'lucide-svelte';

    // Feedback
    let toasts: { id: string; message: string; type: 'success' | 'error' | 'info' }[] = $state([]);

    function addToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
        const id = crypto.randomUUID();
        toasts = [...toasts, { id, message, type }];
    }

    function removeToast(id: string) {
        toasts = toasts.filter(t => t.id !== id);
    }

    // Form states
    let showGithubForm = $state(false);
    let showCloudflareForm = $state(false);

    let githubForm = $state({
        id: '',
        tenantId: '',
        providerAccountId: '',
        providerAccountName: '',
        accessTokenEncrypted: ''
    });

    let cloudflareForm = $state({
        id: '',
        tenantId: '',
        cfAccountId: '',
        cfAccountName: '',
        apiTokenEncrypted: ''
    });

    async function handleAddGithub() {
        if (!workspace.state.activeTenantId) return;
        if (!githubForm.providerAccountName || !githubForm.providerAccountId || !githubForm.accessTokenEncrypted) {
            addToast('Please fill all required fields', 'error');
            return;
        }
        try {
            githubForm.id = crypto.randomUUID();
            githubForm.tenantId = workspace.state.activeTenantId;
            const created = await integrations.createGitHub(githubForm);
            workspace.state.integrations.github = [created, ...workspace.state.integrations.github];
            showGithubForm = false;
            githubForm = { id: '', tenantId: '', providerAccountId: '', providerAccountName: '', accessTokenEncrypted: '' };
            addToast('GitHub connection added successfully', 'success');
        } catch (e: any) {
            addToast(e.message, 'error');
        }
    }

    async function handleAddCloudflare() {
        if (!workspace.state.activeTenantId) return;
        if (!cloudflareForm.cfAccountId || !cloudflareForm.apiTokenEncrypted) {
            addToast('Please fill all required fields', 'error');
            return;
        }
        try {
            cloudflareForm.id = crypto.randomUUID();
            cloudflareForm.tenantId = workspace.state.activeTenantId;
            const created = await integrations.createCloudflare(cloudflareForm);
            workspace.state.integrations.cloudflare = [created, ...workspace.state.integrations.cloudflare];
            showCloudflareForm = false;
            cloudflareForm = { id: '', tenantId: '', cfAccountId: '', cfAccountName: '', apiTokenEncrypted: '' };
            addToast('Cloudflare account added successfully', 'success');
        } catch (e: any) {
            addToast(e.message, 'error');
        }
    }

    async function handleDeleteGithub(id: string) {
        try {
            await integrations.deleteGitHub(id);
            workspace.state.integrations.github = workspace.state.integrations.github.filter(i => i.id !== id);
            addToast('GitHub connection removed', 'success');
        } catch (e: any) {
            addToast(e.message, 'error');
        }
    }

    async function handleDeleteCloudflare(id: string) {
        try {
            await integrations.deleteCloudflare(id);
            workspace.state.integrations.cloudflare = workspace.state.integrations.cloudflare.filter(i => i.id !== id);
            addToast('Cloudflare account removed', 'success');
        } catch (e: any) {
            addToast(e.message, 'error');
        }
    }
</script>

<div class="p-8 max-w-6xl mx-auto space-y-10">
    <header class="flex items-end justify-between border-b border-white/5 pb-8">
        <div>
            <h1 class="text-3xl font-bold tracking-tight text-text-primary">Integrations</h1>
            <p class="text-text-muted mt-2 text-lg">Connect Nexus to your cloud ecosystem and CI/CD pipelines.</p>
        </div>
        <div class="flex items-center space-x-2 text-sm text-text-muted bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
            <ShieldCheck class="h-4 w-4 text-accent-primary" />
            <span>End-to-end encrypted storage</span>
        </div>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- GitHub Provider Card -->
        <Card class="flex flex-col bg-bg-secondary border-white/5 overflow-hidden shadow-2xl">
            <div class="p-8 space-y-6 flex-1">
                <div class="flex items-start justify-between">
                    <div class="flex items-center space-x-4">
                        <div class="p-3 bg-white/5 rounded-xl border border-white/10">
                            <Code class="h-8 w-8 text-text-primary" />
                        </div>
                        <div>
                            <h2 class="text-xl font-bold text-text-primary">GitHub</h2>
                            <p class="text-sm text-text-muted">Repository & Code Management</p>
                        </div>
                    </div>
                    {#if workspace.state.integrations.github.length > 0}
                        <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
                            CONNECTED
                        </span>
                    {:else}
                        <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/5 text-text-muted border border-white/10">
                            NOT CONNECTED
                        </span>
                    {/if}
                </div>

                <p class="text-sm leading-relaxed text-text-muted">
                    Enable Nexus to read your repositories, inject CI/CD configurations, and manage deployment workflows directly on your GitHub account.
                </p>

                {#if showGithubForm}
                    <div class="p-5 bg-bg-tertiary rounded-xl space-y-4 border border-white/10 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div class="space-y-3">
                            <label for="gh-name" class="block text-xs font-bold uppercase tracking-wider text-text-muted">Account Details</label>
                            <Input id="gh-name" placeholder="Username / Org Name" bind:value={githubForm.providerAccountName} />
                            <Input id="gh-id" placeholder="Account ID" bind:value={githubForm.providerAccountId} />
                        </div>
                        <div class="space-y-3">
                            <label for="gh-token" class="block text-xs font-bold uppercase tracking-wider text-text-muted">Security</label>
                            <Input id="gh-token" type="password" placeholder="Personal Access Token" bind:value={githubForm.accessTokenEncrypted} />
                            <p class="text-[10px] text-text-muted italic flex items-center">
                                <Key class="h-3 w-3 mr-1" /> Tokens are encrypted before storage.
                            </p>
                        </div>
                        <div class="flex space-x-3 pt-2">
                            <Button class="flex-1 bg-text-primary text-bg-primary hover:bg-text-primary/90" onclick={handleAddGithub}>Connect GitHub</Button>
                            <Button variant="ghost" onclick={() => showGithubForm = false}>Cancel</Button>
                        </div>
                    </div>
                {:else}
                    <div class="space-y-3">
                        {#if workspace.state.loading}
                            <div class="flex items-center justify-center py-6">
                                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-primary"></div>
                            </div>
                        {:else if workspace.state.integrations.github.length === 0}
                            <div class="flex flex-col items-center justify-center py-8 px-4 border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
                                <Plus class="h-8 w-8 text-white/10 mb-2" />
                                <p class="text-sm text-text-muted text-center">No active connections. Add your first GitHub account to get started.</p>
                            </div>
                        {:else}
                            {#each workspace.state.integrations.github as item}
                                <div class="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all group">
                                    <div class="flex items-center space-x-3">
                                        <div class="p-2 bg-accent-primary/10 rounded-lg">
                                            <UserIcon class="h-4 w-4 text-accent-primary" />
                                        </div>
                                        <div>
                                            <span class="text-sm font-semibold text-text-primary block">{item.provider_account_name}</span>
                                            <span class="text-[10px] text-text-muted font-mono">{item.id.split('-')[0]}...</span>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" class="h-9 w-9 text-red-400/70 hover:text-red-400 hover:bg-red-400/10 rounded-lg" onclick={() => handleDeleteGithub(item.id)}>
                                        <Trash2 class="h-4 w-4" />
                                    </Button>
                                </div>
                            {/each}
                        {/if}
                    </div>
                {/if}
            </div>
            <div class="px-8 py-4 bg-white/5 border-t border-white/5 flex items-center justify-between">
                <a href="https://github.com/settings/tokens" target="_blank" class="text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-text-primary flex items-center transition-colors">
                    Manage Tokens <ExternalLink class="h-3 w-3 ml-1.5" />
                </a>
                {#if !showGithubForm}
                    <Button variant="ghost" size="sm" class="text-xs h-8 px-3" onclick={() => showGithubForm = true}>
                        <Plus class="h-3.5 w-3.5 mr-1.5" /> Add Connection
                    </Button>
                {/if}
            </div>
        </Card>

        <!-- Cloudflare Provider Card -->
        <Card class="flex flex-col bg-bg-secondary border-white/5 overflow-hidden shadow-2xl">
            <div class="p-8 space-y-6 flex-1">
                <div class="flex items-start justify-between">
                    <div class="flex items-center space-x-4">
                        <div class="p-3 bg-accent-secondary/10 rounded-xl border border-accent-secondary/20">
                            <Cloud class="h-8 w-8 text-accent-secondary" />
                        </div>
                        <div>
                            <h2 class="text-xl font-bold text-text-primary">Cloudflare</h2>
                            <p class="text-sm text-text-muted">Edge & Serverless Deployment</p>
                        </div>
                    </div>
                    {#if workspace.state.integrations.cloudflare.length > 0}
                        <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent-secondary/10 text-accent-secondary border border-accent-secondary/20">
                            CONNECTED
                        </span>
                    {:else}
                        <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/5 text-text-muted border border-white/10">
                            NOT CONNECTED
                        </span>
                    {/if}
                </div>

                <p class="text-sm leading-relaxed text-text-muted">
                    Connect your Cloudflare account to enable one-click deployments to Workers, Pages, and R2 storage across the global network.
                </p>

                {#if showCloudflareForm}
                    <div class="p-5 bg-bg-tertiary rounded-xl space-y-4 border border-white/10 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div class="space-y-3">
                            <label for="cf-name" class="block text-xs font-bold uppercase tracking-wider text-text-muted">Account Details</label>
                            <Input id="cf-name" placeholder="Account Name (e.g. Production)" bind:value={cloudflareForm.cfAccountName} />
                            <Input id="cf-id" placeholder="Cloudflare Account ID" bind:value={cloudflareForm.cfAccountId} />
                        </div>
                        <div class="space-y-3">
                            <label for="cf-token" class="block text-xs font-bold uppercase tracking-wider text-text-muted">Security</label>
                            <Input id="cf-token" type="password" placeholder="API Token (Workers:Edit)" bind:value={cloudflareForm.apiTokenEncrypted} />
                            <p class="text-[10px] text-text-muted italic flex items-center">
                                <Key class="h-3 w-3 mr-1" /> Tokens are encrypted before storage.
                            </p>
                        </div>
                        <div class="flex space-x-3 pt-2">
                            <Button class="flex-1 bg-accent-secondary text-white hover:bg-accent-secondary/90 border-none" onclick={handleAddCloudflare}>Connect Cloudflare</Button>
                            <Button variant="ghost" onclick={() => showCloudflareForm = false}>Cancel</Button>
                        </div>
                    </div>
                {:else}
                    <div class="space-y-3">
                        {#if workspace.state.loading}
                            <div class="flex items-center justify-center py-6">
                                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-secondary"></div>
                            </div>
                        {:else if workspace.state.integrations.cloudflare.length === 0}
                            <div class="flex flex-col items-center justify-center py-8 px-4 border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
                                <Plus class="h-8 w-8 text-white/10 mb-2" />
                                <p class="text-sm text-text-muted text-center">No active accounts. Connect your Cloudflare account to enable deployments.</p>
                            </div>
                        {:else}
                            {#each workspace.state.integrations.cloudflare as item}
                                <div class="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all group">
                                    <div class="flex items-center space-x-3">
                                        <div class="p-2 bg-accent-secondary/10 rounded-lg">
                                            <Cloud class="h-4 w-4 text-accent-secondary" />
                                        </div>
                                        <div>
                                            <span class="text-sm font-semibold text-text-primary block">{item.cf_account_name || 'Production Account'}</span>
                                            <span class="text-[10px] text-text-muted font-mono">{item.cf_account_id.slice(0, 8)}...</span>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" class="h-9 w-9 text-red-400/70 hover:text-red-400 hover:bg-red-400/10 rounded-lg" onclick={() => handleDeleteCloudflare(item.id)}>
                                        <Trash2 class="h-4 w-4" />
                                    </Button>
                                </div>
                            {/each}
                        {/if}
                    </div>
                {/if}
            </div>
            <div class="px-8 py-4 bg-white/5 border-t border-white/5 flex items-center justify-between">
                <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" class="text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-text-primary flex items-center transition-colors">
                    Manage Tokens <ExternalLink class="h-3 w-3 ml-1.5" />
                </a>
                {#if !showCloudflareForm}
                    <Button variant="ghost" size="sm" class="text-xs h-8 px-3" onclick={() => showCloudflareForm = true}>
                        <Plus class="h-3.5 w-3.5 mr-1.5" /> Add Account
                    </Button>
                {/if}
            </div>
        </Card>
    </div>
</div>

<!-- Toast Notifications -->
<div class="fixed bottom-0 right-0 p-6 space-y-4 pointer-events-none z-50">
    {#each toasts as toast (toast.id)}
        <div class="pointer-events-auto">
            <Toast 
                message={toast.message} 
                type={toast.type} 
                onClose={() => removeToast(toast.id)} 
            />
        </div>
    {/each}
</div>

