<script lang="ts">
    import { workspace } from '$lib/stores/workspace.svelte';
    import { Card } from '$lib/components/ui/card';
    import { Globe, Rocket, ShieldCheck, Cpu, ArrowUpRight, Clock, Plus, Lock } from 'lucide-svelte';
    import { Button } from '$lib/components/ui/button';
    // import { isFeatureEnabled } from '$lib/featureFlags';

    // const isOverviewEnabled = $derived(isFeatureEnabled('enable-workspace-overview'));
    const isOverviewEnabled = true; // Temporarily enabled

    const stats = $derived([
        { label: 'Projects', value: workspace.state.apps.length, icon: Globe, color: 'text-accent-secondary' },
        { label: 'Deployments', value: workspace.state.deployments.length, icon: Rocket, color: 'text-accent-primary' },
        { label: 'GitHub Integrations', value: workspace.state.integrations.github.length, icon: ShieldCheck, color: 'text-text-primary' },
        { label: 'Cloudflare Accounts', value: workspace.state.integrations.cloudflare.length, icon: Cpu, color: 'text-accent-secondary' },
    ]);

    const recentDeployments = $derived(workspace.state.deployments.slice(0, 5));
</script>

{#if !isOverviewEnabled}
    <div class="flex flex-col items-center justify-center h-full space-y-4 p-8">
        <div class="p-4 bg-white/5 rounded-full">
            <Lock class="h-12 w-12 text-text-muted" />
        </div>
        <h2 class="text-2xl font-bold text-text-primary">Feature Not Available</h2>
        <p class="text-text-muted text-center max-w-md">
            The Workspace Overview feature is currently behind a feature flag and is not enabled for your account.
        </p>
        <Button href="/projects" class="mt-4">Go to Projects</Button>
    </div>
{:else}
<div class="p-8 max-w-6xl mx-auto space-y-10">
    <header class="flex items-end justify-between border-b border-white/5 pb-8">
        <div>
            <h1 class="text-3xl font-bold tracking-tight text-text-primary">Workspace Overview</h1>
            <p class="text-text-muted mt-2 text-lg">Manage {workspace.state.tenant?.name}'s resources and deployments.</p>
        </div>
        <div class="flex items-center space-x-3">
            <Button variant="outline" class="border-white/10" href="/projects">View Projects</Button>
            <Button class="bg-accent-primary text-bg-primary hover:bg-accent-primary/90 font-bold" href="/projects">
                <Plus class="h-4 w-4 mr-2" /> New Project
            </Button>
        </div>
    </header>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {#each stats as stat}
            <Card class="p-6 bg-bg-secondary border-white/5">
                <div class="flex items-center justify-between">
                    <div class="p-2 bg-white/5 rounded-lg border border-white/10">
                        <stat.icon class="h-5 w-5 {stat.color}" />
                    </div>
                </div>
                <div class="mt-4">
                    <p class="text-3xl font-bold text-text-primary">{stat.value}</p>
                    <p class="text-xs font-medium text-text-muted uppercase tracking-wider mt-1">{stat.label}</p>
                </div>
            </Card>
        {/each}
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Recent Deployments -->
        <Card class="lg:col-span-2 bg-bg-secondary border-white/5 overflow-hidden">
            <div class="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 class="font-bold text-text-primary flex items-center">
                    <Rocket class="h-4 w-4 mr-2 text-accent-primary" />
                    Recent Deployments
                </h3>
                <a href="/deployments" class="text-[10px] font-bold uppercase text-text-muted hover:text-text-primary transition-colors flex items-center">
                    View All <ArrowUpRight class="h-3 w-3 ml-1" />
                </a>
            </div>
            <div class="divide-y divide-white/5">
                {#if recentDeployments.length === 0}
                    <div class="p-12 text-center text-text-muted text-sm italic">
                        No deployment history found.
                    </div>
                {:else}
                    {#each recentDeployments as dep}
                        <div class="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors group">
                            <div class="flex items-center space-x-4">
                                <div class="h-2 w-2 rounded-full bg-accent-primary animate-pulse"></div>
                                <div>
                                    <p class="text-sm font-semibold text-text-primary">{dep.app_name}</p>
                                    <p class="text-[10px] text-text-muted uppercase font-mono">{dep.environment}</p>
                                </div>
                            </div>
                            <div class="flex items-center space-x-6">
                                <div class="text-right">
                                    <p class="text-xs text-text-primary font-mono">{dep.current_run_status || 'IDLE'}</p>
                                    <p class="text-[10px] text-text-muted flex items-center justify-end">
                                        <Clock class="h-3 w-3 mr-1" />
                                        {new Date(dep.updated_at).toLocaleTimeString()}
                                    </p>
                                </div>
                                <ArrowUpRight class="h-4 w-4 text-text-muted group-hover:text-text-primary transition-all" />
                            </div>
                        </div>
                    {/each}
                {/if}
            </div>
        </Card>

        <!-- Quick Integration Status -->
        <Card class="bg-bg-secondary border-white/5 overflow-hidden">
            <div class="p-6 border-b border-white/5">
                <h3 class="font-bold text-text-primary flex items-center">
                    <ShieldCheck class="h-4 w-4 mr-2 text-accent-secondary" />
                    Integration Health
                </h3>
            </div>
            <div class="p-6 space-y-6">
                <div class="space-y-4">
                    <div class="flex items-center justify-between">
                        <span class="text-sm text-text-muted">GitHub Status</span>
                        {#if workspace.state.integrations.github.length > 0}
                            <span class="text-xs font-bold text-accent-primary">ACTIVE</span>
                        {:else}
                            <span class="text-xs font-bold text-red-400">MISSING</span>
                        {/if}
                    </div>
                    <div class="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                        <div class="h-full bg-accent-primary transition-all duration-1000" style="width: {workspace.state.integrations.github.length > 0 ? '100%' : '0%'}"></div>
                    </div>
                </div>

                <div class="space-y-4">
                    <div class="flex items-center justify-between">
                        <span class="text-sm text-text-muted">Cloudflare Status</span>
                        {#if workspace.state.integrations.cloudflare.length > 0}
                            <span class="text-xs font-bold text-accent-secondary">ACTIVE</span>
                        {:else}
                            <span class="text-xs font-bold text-red-400">MISSING</span>
                        {/if}
                    </div>
                    <div class="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                        <div class="h-full bg-accent-secondary transition-all duration-1000" style="width: {workspace.state.integrations.cloudflare.length > 0 ? '100%' : '0%'}"></div>
                    </div>
                </div>

                <Button variant="outline" class="w-full border-white/10 text-xs" href="/settings/integrations">
                    Manage Connections
                </Button>
            </div>
        </Card>
    </div>
</div>
{/if}
