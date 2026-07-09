<script lang="ts">
  import { builderStore } from '$lib/stores/builder.svelte';
  import { workspace } from '$lib/stores/workspace.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import type { BuilderTemplate } from '$lib/types/builder';
  import { RefreshCw, Plus, Sparkles, Send } from 'lucide-svelte';
  import BuilderSessionList from './BuilderSessionList.svelte';
  import { onMount } from 'svelte';

  let { tenantId = '', appId = '' } = $props<{ tenantId?: string; appId?: string }>();

  let template = $state<BuilderTemplate>('landing-page');
  let intent = $state('');
  let prompt = $state('');

  // Find active app name
  let activeApp = $derived(workspace.state.apps.find(a => a.id === appId));

  onMount(() => {
    if (appId) {
      builderStore.loadHistory(appId);
    }
  });

  const templates = [
    { value: 'landing-page', label: 'Landing Page' },
    { value: 'dashboard', label: 'Dashboard' },
    { value: 'blog', label: 'Blog' },
    { value: 'api', label: 'API Worker' },
    { value: 'empty', label: 'Empty Project' }
  ];

  async function handleStartSession() {
    if (!tenantId || !appId || !intent) return;
    await builderStore.createSession(tenantId, appId, template, intent);
  }

  async function handleGenerate() {
    if (!prompt || !builderStore.session) return;
    await builderStore.generate(prompt);
    prompt = '';
  }

  function handleReset() {
    builderStore.reset();
  }
</script>

<div class="flex flex-col h-full p-4 space-y-6 overflow-y-auto">
  <div class="flex justify-between items-start">
    <div class="space-y-1">
      <h2 class="text-xl font-bold text-text-primary flex items-center gap-2">
        <Sparkles class="w-5 h-5 text-accent-primary" />
        AI Builder
      </h2>
      {#if activeApp}
        <p class="text-xs text-accent-primary font-medium px-2 py-0.5 bg-accent-primary/10 rounded-md inline-block">
          Project: {activeApp.name}
        </p>
      {/if}
    </div>
    
    {#if builderStore.session}
      <Button variant="ghost" size="sm" onclick={handleReset} title="New Session">
        <Plus class="w-4 h-4" />
      </Button>
    {/if}
  </div>

  {#if !builderStore.session}
    <div class="space-y-4 bg-white/5 p-5 rounded-xl border border-white/10 shadow-sm">
      <h3 class="text-sm font-bold uppercase tracking-wider text-text-muted">1. Initialize Builder</h3>
      
      <div class="space-y-4">
        {#if !tenantId || !appId}
          <div class="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-200">
            Please select a project from the Projects page to start building.
          </div>
          <Input label="Tenant ID" bind:value={tenantId} placeholder="t_..." disabled />
          <Input label="App ID" bind:value={appId} placeholder="app_..." disabled />
        {:else}
          <Select 
            label="Template" 
            options={templates} 
            bind:value={template} 
          />
          
          <div class="space-y-1">
            <label class="block text-xs font-bold text-text-muted uppercase">Initial Intent</label>
            <textarea 
              class="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-transparent text-sm transition-all text-text-primary"
              rows="4"
              bind:value={intent}
              placeholder="E.g., Build a modern ecommerce landing page with a product grid and shopping cart..."
            ></textarea>
          </div>

          <Button 
            variant="primary" 
            class="w-full py-6 font-bold text-md bg-accent-primary text-bg-primary hover:bg-accent-primary/90" 
            onclick={handleStartSession}
            disabled={!tenantId || !appId || !intent || builderStore.isLoading}
          >
            {#if builderStore.isLoading}
              <RefreshCw class="w-4 h-4 mr-2 animate-spin" />
              Starting...
            {:else}
              Start Building
            {/if}
          </Button>
        {/if}

        {#if builderStore.error}
          <div class="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-200">
            {builderStore.error}
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <div class="space-y-4 bg-white/5 p-5 rounded-xl border border-white/10 shadow-sm flex-1 flex flex-col">
      <div class="flex justify-between items-center">
        <h3 class="text-sm font-bold uppercase tracking-wider text-text-muted">2. Prompt</h3>
        <span class="text-[10px] font-bold px-2 py-1 bg-accent-secondary/20 text-accent-secondary rounded-full uppercase tracking-tight">
          Session Active
        </span>
      </div>

      <div class="flex-1 flex flex-col space-y-4">
        <div class="bg-white/5 rounded-lg p-3 text-xs text-text-muted space-y-2 border border-white/5">
          <p><span class="font-bold text-text-primary">Intent:</span> {builderStore.session.intent}</p>
          <div class="flex gap-4">
            <p><span class="font-bold text-text-primary">Template:</span> {builderStore.session.template}</p>
            <p><span class="font-bold text-text-primary">Status:</span> {builderStore.session.status}</p>
          </div>
        </div>

        <div class="space-y-3 mt-auto">
          <div class="space-y-1">
            <label class="block text-xs font-bold text-text-muted uppercase">Describe Changes</label>
            <textarea 
              class="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-transparent text-sm transition-all text-text-primary"
              rows="5"
              bind:value={prompt}
              placeholder="E.g., Add a pricing section with three tiers: Basic, Pro, and Enterprise..."
              disabled={builderStore.isLoading || builderStore.session.status === 'generating'}
            ></textarea>
          </div>
          
          <Button 
            variant="primary" 
            class="w-full py-6 font-bold text-md bg-accent-primary text-bg-primary hover:bg-accent-primary/90" 
            onclick={handleGenerate}
            disabled={!prompt || builderStore.isLoading || builderStore.session.status === 'generating'}
          >
            {#if builderStore.isLoading || builderStore.session.status === 'generating'}
              <RefreshCw class="w-4 h-4 mr-2 animate-spin" />
              Generating...
            {:else}
              <Send class="w-4 h-4 mr-2" />
              Generate
            {/if}
          </Button>

          {#if builderStore.error}
            <div class="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-200">
              {builderStore.error}
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  {#if appId}
    <div class="mt-auto pt-6 border-t border-white/5">
      <BuilderSessionList />
    </div>
  {/if}
</div>
