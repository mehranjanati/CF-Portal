<script lang="ts">
    import { page } from '$app/stores';
    import { workspace } from '$lib/stores/workspace.svelte';
    import { builderStore } from '$lib/stores/builder.svelte';
    // import { isFeatureEnabled } from '$lib/featureFlags';
    import Card from '$lib/components/ui/Card.svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import { Lock, Rocket, Clock, Globe, ArrowLeft, Plus, Sparkles, ChevronRight } from 'lucide-svelte';
    import { onMount } from 'svelte';

    const projectId = $derived($page.params.projectId);
    // const isProjectDetailEnabled = $derived(isFeatureEnabled('enable-project-detail'));
    const isProjectDetailEnabled = true; // Temporarily enabled

    const project = $derived(workspace.state.apps.find(a => a.id === projectId));
    const projectDeployments = $derived(workspace.state.deployments.filter(d => d.app_id === projectId));

    onMount(() => {
        if (projectId) {
            workspace.setAppId(projectId);
            builderStore.loadHistory(projectId);
        }
    });

</script>

{#if !isProjectDetailEnabled}
    <div class="flex flex-col items-center justify-center h-full space-y-4 p-8">
        <div class="p-4 bg-white/5 rounded-full">
            <Lock class="h-12 w-12 text-text-muted" />
        </div>
        <h2 class="text-2xl font-bold text-text-primary">Feature Not Available</h2>
        <p class="text-text-muted text-center max-w-md">
            The Project Detail feature is currently behind a feature flag and is not enabled for your account.
        </p>
        <Button href="/projects" class="mt-4">Back to Projects</Button>
    </div>
{:else if !project}
    <div class="flex flex-col items-center justify-center h-full space-y-4 p-8">
        <h2 class="text-2xl font-bold text-text-primary">Project Not Found</h2>
        <p class="text-text-muted text-center max-w-md">
            The project you are looking for does not exist or you don't have access to it.
        </p>
        <Button href="/projects" class="mt-4">Back to Projects</Button>
    </div>
{:else}
    <div class="p-8 max-w-6xl mx-auto space-y-8">
        <header class="space-y-4">
            <a href="/projects" class="inline-flex items-center text-sm text-text-muted hover:text-text-primary transition-colors">
                <ArrowLeft class="h-4 w-4 mr-1" /> Back to Projects
            </a>
            <div class="flex items-end justify-between border-b border-white/5 pb-8">
                <div>
                    <div class="flex items-center space-x-3">
                        <h1 class="text-3xl font-bold tracking-tight text-text-primary">{project.name}</h1>
                        <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/5 text-text-muted border border-white/10 uppercase tracking-wider">
                            {project.status}
                        </span>
                    </div>
                    <p class="text-text-muted mt-2 text-lg">{project.description || 'No description provided.'}</p>
                </div>
                <div class="flex items-center space-x-3">
                    <Button href={`/builder?tenantId=${project.tenant_id}&appId=${project.id}`} class="bg-blue-600 text-white hover:bg-blue-700 font-bold">
                        Open Builder
                    </Button>
                    <Button class="bg-accent-primary text-bg-primary hover:bg-accent-primary/90 font-bold">
                        <Plus class="h-4 w-4 mr-2" /> Create Deployment Record
                    </Button>
                </div>
            </div>
        </header>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Project Info -->
            <Card class="bg-bg-secondary border-white/5 p-6 space-y-6">
                <h3 class="font-bold text-text-primary flex items-center border-b border-white/5 pb-4">
                    <Globe class="h-4 w-4 mr-2 text-accent-secondary" />
                    Project Details
                </h3>
                <div class="space-y-4">
                    <div>
                        <p class="text-xs text-text-muted uppercase tracking-wider font-bold">Project ID</p>
                        <p class="text-sm text-text-primary font-mono mt-1">{project.id}</p>
                    </div>
                    <div>
                        <p class="text-xs text-text-muted uppercase tracking-wider font-bold">Created At</p>
                        <p class="text-sm text-text-primary mt-1 flex items-center">
                            <Clock class="h-3 w-3 mr-1 text-text-muted" />
                            {new Date(project.created_at).toLocaleString()}
                        </p>
                    </div>
                </div>
            </Card>

            <!-- Deployments List -->
            <Card class="lg:col-span-2 bg-bg-secondary border-white/5 overflow-hidden">
                <div class="p-6 border-b border-white/5 flex items-center justify-between">
                    <h3 class="font-bold text-text-primary flex items-center">
                        <Rocket class="h-4 w-4 mr-2 text-accent-primary" />
                        Deployment Records
                    </h3>
                </div>
                <div class="divide-y divide-white/5">
                    {#if projectDeployments.length === 0}
                        <div class="p-12 text-center text-text-muted text-sm italic">
                            No deployment records found for this project.
                        </div>
                    {:else}
                        {#each projectDeployments as dep}
                            <div class="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                                <div class="flex items-center space-x-4">
                                    <div class="h-2 w-2 rounded-full bg-accent-primary animate-pulse"></div>
                                    <div>
                                        <p class="text-sm font-semibold text-text-primary">{dep.environment}</p>
                                        <p class="text-[10px] text-text-muted font-mono">{dep.id}</p>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <p class="text-xs text-text-primary font-mono">{dep.current_run_status || 'IDLE'}</p>
                                    <p class="text-[10px] text-text-muted flex items-center justify-end">
                                        <Clock class="h-3 w-3 mr-1" />
                                        {new Date(dep.updated_at).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        {/each}
                    {/if}
                </div>
            </Card>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Builder History -->
            <Card class="bg-bg-secondary border-white/5 overflow-hidden">
                <div class="p-6 border-b border-white/5 flex items-center justify-between">
                    <h3 class="font-bold text-text-primary flex items-center">
                        <Sparkles class="h-4 w-4 mr-2 text-blue-400" />
                        Latest Builder Sessions
                    </h3>
                    <Button href={`/builder?tenantId=${project.tenant_id}&appId=${project.id}`} variant="ghost" size="sm" class="text-xs font-bold text-blue-400 hover:text-blue-300">
                        View All
                    </Button>
                </div>
                <div class="divide-y divide-white/5">
                    {#if builderStore.history.length === 0}
                        <div class="p-12 text-center text-text-muted text-sm italic">
                            No builder sessions found. Start generating code with AI!
                        </div>
                    {:else}
                        {#each builderStore.history.slice(0, 5) as session}
                            <a 
                                href={`/builder?tenantId=${project.tenant_id}&appId=${project.id}&sessionId=${session.id}`}
                                class="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors group"
                            >
                                 <div class="flex items-center space-x-4 min-w-0">
                                     <div class={`h-2 w-2 rounded-full ${session.status === 'completed' ? 'bg-green-400' : session.status === 'failed' ? 'bg-red-400' : 'bg-blue-400 animate-pulse'}`}></div>
                                     <div class="min-w-0">
                                         <p class="text-sm font-semibold text-text-primary truncate">{session.intent}</p>
                                         <p class="text-[10px] text-text-muted font-mono">{session.template} · {new Date(session.createdAt).toLocaleDateString()}</p>
                                     </div>
                                 </div>
                                 <ChevronRight class="h-4 w-4 text-text-muted group-hover:text-text-primary group-hover:translate-x-1 transition-all" />
                             </a>
                         {/each}
                     {/if}
                 </div>
             </Card>



            <!-- Deployment Summary or Other Info -->
            <Card class="bg-bg-secondary border-white/5 p-6 flex flex-col items-center justify-center text-center space-y-4">
                <div class="h-12 w-12 bg-white/5 rounded-full flex items-center justify-center">
                    <Rocket class="h-6 w-6 text-text-muted" />
                </div>
                <div class="space-y-1">
                    <h4 class="text-sm font-bold text-text-primary">Ready to Publish?</h4>
                    <p class="text-xs text-text-muted">Generated code can be pushed to GitHub and deployed to Cloudflare Pages.</p>
                </div>
                <Button variant="outline" size="sm" class="opacity-50 cursor-not-allowed">
                    Configure CI/CD
                </Button>
            </Card>
        </div>
    </div>
{/if}